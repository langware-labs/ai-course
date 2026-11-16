"""The course home's server: the page from this folder, the student's games from work/.

    uv run --no-project python serve.py <port>

Serves exactly three things, and nothing else in the project (no .secrets, no .env):
  /, /index.html, /lessons.json  — this folder, so a git pull is live at once;
  /my-work.json                  — {"<lesson>": ["<game>", ...]}, read from work/ on every request,
                                   so a new game shows up without a script;
  /lesson-NN/<game>/...          — the student's games under work/lesson-NN/.
A fresh clone has no work/ yet: the page still loads, with no games listed.
"""
import json
import mimetypes
import re
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

HERE = Path(__file__).resolve().parent
WORK = (HERE / ".." / ".." / ".." / "work").resolve()
PAGE = {"/": "index.html", "/index.html": "index.html", "/lessons.json": "lessons.json"}
LESSON = re.compile(r"^/(lesson-\d\d)/(.+)$")


def my_work() -> dict:
    mine = {}
    if WORK.is_dir():
        for lesson in sorted(p for p in WORK.iterdir() if p.is_dir() and re.fullmatch(r"lesson-\d\d", p.name)):
            games = sorted(g.name for g in lesson.iterdir() if (g / "index.html").is_file())
            if games:
                mine[str(int(lesson.name.split("-")[1]))] = games
    return mine


def resolve(path: str) -> Path | None:
    """The file a request names, or None — never anything outside this folder's page or work/lesson-NN/."""
    if path in PAGE:
        return HERE / PAGE[path]
    m = LESSON.match(path)
    if not m:
        return None
    base = (WORK / m.group(1)).resolve()
    target = (base / m.group(2)).resolve()
    if not target.is_relative_to(base):
        return None
    return target / "index.html" if target.is_dir() else target


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = unquote(urlparse(self.path).path)
        if path == "/my-work.json":
            return self._send(200, json.dumps(my_work(), ensure_ascii=False).encode(), "application/json; charset=utf-8")
        target = resolve(path)
        if target is None or not target.is_file():
            return self._send(404, b"not found", "text/plain")
        kind = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        if kind.startswith("text/") or kind in ("application/javascript", "application/json"):
            kind += "; charset=utf-8"
        self._send(200, target.read_bytes(), kind)

    def _send(self, status: int, body: bytes, kind: str):
        self.send_response(status)
        self.send_header("Content-Type", kind)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_):  # quiet: one line per request is noise in the app's log
        pass


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1])), Handler).serve_forever()
