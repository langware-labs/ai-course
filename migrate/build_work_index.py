"""Make work/ the folder the course home is served from.

    python3 build_work_index.py <course project root>

Copies the course home page (agentic-assets/webapp/course-home/index.html, lessons.json) into work/
and writes work/my-work.json: {"<lesson number>": ["<game folder>", ...]} for every work/lesson-NN/<game>/
that has an index.html. Run it again whenever a game is added.
"""
import json
import shutil
import sys
from pathlib import Path

root = Path(sys.argv[1]).expanduser()
work = root / "work"
work.mkdir(exist_ok=True)
home = root / "agentic-assets" / "webapp" / "course-home"
for name in ("index.html", "lessons.json"):
    shutil.copyfile(home / name, work / name)
mine = {}
for lesson in sorted(p for p in work.iterdir() if p.is_dir() and p.name.startswith("lesson-")):
    games = sorted(g.name for g in lesson.iterdir() if (g / "index.html").is_file())
    if games:
        mine[str(int(lesson.name.split("-")[1]))] = games
(work / "my-work.json").write_text(json.dumps(mine, ensure_ascii=False, indent=1), encoding="utf-8")
print(json.dumps(mine, ensure_ascii=False))
