"""The course home's server: the page from this folder, the student's games from work/.

    uv run --no-project python serve.py <port>

Serves exactly three things, and nothing else in the project (no .secrets, no .env):
  /, /index.html, /lessons.json  — this folder, so a git pull is live at once;
  /my-work.json                  — {"<lesson>": ["<game>", ...]}, read from work/ on every request,
                                   so a new game shows up without a script;
  /lesson-NN/<game>/...          — the student's games under work/lesson-NN/;
and forwards /sdk/* and /api/* to this machine's Flowpad, so the page's SDK (opening an agent) works
the way it does on a page Flowpad serves itself.
A fresh clone has no work/ yet: the page still loads, with no games listed.
"""
import json
import mimetypes
import os
import re
import sys
import urllib.error
import urllib.request
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


def backend() -> str | None:
    """This machine's Flowpad backend — ``FLOWPAD_BACKEND``, else the running instance's server.json
    (``FLOW_INSTANCE``, default prod), read per request so a restarted backend is followed."""
    explicit = os.environ.get("FLOWPAD_BACKEND", "").strip().rstrip("/")
    if explicit:
        return explicit
    home = Path(os.environ.get("FLOW_HOME") or Path.home() / ".flow")
    info = home / "instances" / (os.environ.get("FLOW_INSTANCE") or "prod") / "server.json"
    try:
        return f"http://127.0.0.1:{int(json.loads(info.read_text())['port'])}"
    except (OSError, ValueError, KeyError):
        return None


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


FORWARDED = ("/sdk/", "/api/")
# What Flowpad writes into a page it serves itself (serve_static.API_ORIGIN_SNIPPET): the page's SDK
# talks to the origin it came from — here this server, which forwards /api.
API_ORIGIN = b"<script>globalThis.__FLOWPAD_API_URL__=globalThis.__FLOWPAD_API_URL__||window.location.origin;</script>"
HOP = {"host", "connection", "keep-alive", "transfer-encoding", "te", "trailer", "upgrade", "content-length"}


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _forward(self):
        origin = backend()
        if origin is None:
            return self._send(502, b"Flowpad is not running", "text/plain")
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length else None
        headers = {k: v for k, v in self.headers.items() if k.lower() not in HOP}
        request = urllib.request.Request(origin + self.path, data=body, headers=headers, method=self.command)
        try:
            with urllib.request.urlopen(request, timeout=60) as answer:
                status, got, data = answer.status, answer.headers, answer.read()
        except urllib.error.HTTPError as e:
            status, got, data = e.code, e.headers, e.read()
        except OSError:
            return self._send(502, b"Flowpad did not answer", "text/plain")
        self.send_response(status)
        for k, v in got.items():
            if k.lower() not in HOP:
                self.send_header(k, v)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        return self._forward() if self.path.startswith(FORWARDED) else self._send(405, b"", "text/plain")

    do_PUT = do_PATCH = do_DELETE = do_POST

    def do_GET(self):
        if self.path.startswith(FORWARDED):
            return self._forward()
        path = unquote(urlparse(self.path).path)
        if path == "/my-work.json":
            return self._send(200, json.dumps(my_work(), ensure_ascii=False).encode(), "application/json; charset=utf-8")
        target = resolve(path)
        if target is None or not target.is_file():
            return self._send(404, b"not found", "text/plain")
        kind = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        if kind.startswith("text/") or kind in ("application/javascript", "application/json"):
            kind += "; charset=utf-8"
        body = target.read_bytes()
        if target.suffix == ".html" and target.parent == HERE:
            head = body.lower().find(b"<head>")
            body = body[: head + 6] + API_ORIGIN + body[head + 6 :] if head >= 0 else API_ORIGIN + body
        self._send(200, body, kind)

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
