"""answers.json (from it_class.py) -> class-<lesson>-report-<DD-MM-YY>.html: one self-contained Hebrew page.

    "$FLOWPAD_PYTHON" build_report.py <answers.json> --lesson 4 [--out-dir .]

The class overview (counts, then one row per student, stuck first, never-opened and unanswered as muted rows);
clicking a student shows that student's report (summary, tasks, game files) and transcript timeline in the same
page. Times in Israel time with UTC on hover. No libraries, no network: the file can be shared as is.
"""

from __future__ import annotations

import argparse
import html
import json
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

HERE = Path(__file__).resolve().parent.parent
IL = ZoneInfo("Asia/Jerusalem")
PILL = {"done": ("בוצע", "done"), "in_progress": ("בתהליך", "prog"), "stuck": ("תקוע", "stuck"),
        "not_started": ("לא התחיל", "ns")}
TASKS = ["בניית משחק", "שיתוף", "היכל תהילה"]
NO_ANSWER = {"off": "IT כבוי במחשב", "signed_in": "מישהו מחובר למחשב", "unreachable": "המחשב לא זמין",
             "failed": "הבדיקה לא הסתיימה", "no_answer": "לא ענה בזמן"}
e = html.escape


def _dt(ts: str | None):
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts).astimezone(timezone.utc)
    except ValueError:
        return None


def t(ts: str | None, fmt: str = "%H:%M") -> str:
    d = _dt(ts)
    return f'<time title="{e(ts or "")} UTC">{d.astimezone(IL).strftime(fmt)}</time>' if d else "—"


def minutes(st: dict) -> str:
    m = st.get("minutes_to_first_game")
    return f"{m:g} דק׳" if m is not None else "—"


def pill(status: str) -> str:
    label, cls = PILL.get(status, ("—", "ns"))
    return f'<span class="pill {cls}">{label}</span>'


def tasks_of(v: dict) -> dict[str, dict]:
    """The three lesson tasks by name; a machine that named them differently is read by position."""
    listed = v.get("tasks") or []
    by = {x.get("name"): x for x in listed}
    return {n: by.get(n) or (listed[i] if i < len(listed) else None) or {} for i, n in enumerate(TASKS)}


def counts(ts: dict) -> tuple[bool, int]:
    """(any task stuck, how many done)."""
    return any(x.get("status") == "stuck" for x in ts.values()), sum(x.get("status") == "done" for x in ts.values())


def rank(s: dict) -> tuple:
    v = s.get("value")
    if not v:
        return (3 if s.get("asked") else 4, s.get("name") or "")
    ts = tasks_of(v)
    stuck, done = counts(ts)
    return (0 if stuck else 1, -done, s.get("name") or "")


def student_views(i: int, s: dict) -> str:
    v, name = s["value"], e(s.get("name") or f"••••{s['last4']}")
    st, m, ts = v.get("stats") or {}, v.get("machine") or {}, tasks_of(v)
    stuck = [n for n, x in ts.items() if x.get("status") == "stuck"]
    badge = (f'<span class="badge bad">צריך עזרה: {e(stuck[0])}</span>' if stuck
             else '<span class="badge ok">לא תקוע — אין צורך בעזרה</span>')
    rows = "".join(
        f'<div class="task card"><b>{e(n)}</b>{pill(x.get("status", ""))}<span>{e(x.get("evidence") or "")}'
        + (f'<br><span class="needs">{e(x["issue"])}</span>' if x.get("issue") else "") + "</span></div>"
        for n, x in ts.items())
    games = ""
    for g in v.get("games") or []:
        files = "".join(f'<tr><td><code>{e(f.get("path", ""))}</code></td><td>{t(f.get("modified"), "%H:%M:%S")}</td>'
                        f'<td class="num">{(f.get("bytes") or 0) / 1024:.1f} KB</td></tr>' for f in g.get("files") or [])
        share = f' · <a href="{e(g["share_url"])}">{e(g["share_url"])}</a>' if g.get("share_url") else ""
        games += f'<h2>קבצי המשחק — {e(g.get("name", ""))}{share}</h2><table><tr><th>קובץ</th><th>שונה לאחרונה</th><th class="num">גודל</th></tr>{files}</table>'
    summary = f'''<section class="view" id="s{i}" hidden><div class="rep">
<div class="crumb"><a onclick="go('class')">→ הכיתה</a></div>
<div class="hdr"><div><h1>{name} — מצב בשיעור</h1>
<div class="sub">מחשב ••••{e(s["last4"])} · נבדק {t(s.get("replied_at"), "%d.%m.%Y %H:%M")}</div></div>{badge}</div>
<p>{e(v.get("summary") or "")}</p>
<div class="grid">
<div class="card"><div class="k">התחיל</div><div class="v">{t(st.get("first_activity"), "%H:%M:%S")}</div></div>
<div class="card"><div class="k">משחק ראשון עובד</div><div class="v">{minutes(st)}</div></div>
<div class="card"><div class="k">הודעות של התלמיד</div><div class="v">{st.get("student_messages") if st.get("student_messages") is not None else "—"}</div><div class="ev-t">פעילות אחרונה {t(st.get("last_activity"), "%H:%M:%S")}</div></div>
<div class="card"><div class="k">מחשב</div><div class="v">{e(str(m.get("size") or "—"))} · {m.get("memory_gb") or "—"} GB</div><div class="ev-t">Flowpad {e(str(m.get("flowpad_version") or "—"))}</div></div>
</div>
<h2>משימות השיעור</h2><div class="tasks">{rows}</div>
{games}
<a class="btn" onclick="go('t{i}')">ציר הזמן של השיחה ←</a>
</div></section>'''
    prev, items = None, []
    for ev in v.get("timeline") or []:
        d = _dt(ev.get("ts"))
        gap = f"+{int((d - prev).total_seconds())}s" if d and prev else ""
        prev = d or prev
        who = "student" if ev.get("who") == "student" else "agent"
        warn = " warn" if ev.get("kind") in ("error", "waiting") else ""
        items.append(f'<li class="ev {who}{warn}"><span class="ts">{t(ev.get("ts"), "%H:%M:%S")}</span><span class="gap">{gap}</span>'
                     f'<span class="who">{"תלמיד" if who == "student" else "סוכן"}</span><span class="what">{e(ev.get("what") or "")}</span></li>')
    timeline = f'''<section class="view" id="t{i}" hidden><div class="rep">
<div class="crumb"><a onclick="go('class')">→ הכיתה</a> · <a onclick="go('s{i}')">→ סיכום</a></div>
<div class="hdr"><div><h1>{name} — ציר הזמן של השיחה</h1>
<div class="sub">שיחת בונה המשחקים במחשב ••••{e(s["last4"])} · שעון ישראל (UTC במעבר עכבר) · הפרש = הזמן מהאירוע הקודם</div></div>
<span class="badge ok">{len(items)} אירועים · {st.get("student_messages") or 0} מהתלמיד</span></div>
<ol class="tl">{"".join(items) or "<li class='ev'>אין שיחה במחשב</li>"}</ol>
<div class="idle">אין פעילות אחרי {t(st.get("last_activity"), "%H:%M:%S")}.</div>
</div></section>'''
    return summary + timeline


def build(answers: dict, lesson: str) -> tuple[str, str]:
    students = sorted(answers["students"], key=rank)
    answered = [s for s in students if s.get("value")]
    stuck = [s for s in answered if counts(tasks_of(s["value"]))[0]]
    all_done = [s for s in answered if counts(tasks_of(s["value"]))[1] == len(TASKS)]
    no_answer = [s for s in students if s.get("asked") and not s.get("value")]
    never = [s for s in students if not s.get("asked")]
    rows, views = [], []
    for i, s in enumerate(students):
        name = e(s.get("name") or "(ללא שם)")
        if s.get("value"):
            v, ts = s["value"], tasks_of(s["value"])
            need = next((x.get("issue") for x in ts.values() if x.get("status") == "stuck" and x.get("issue")), "")
            st = v.get("stats") or {}
            rows.append(f'<tr class="stu" onclick="go(\'s{i}\')"><td><b>{name}</b><div class="code">••••{e(s["last4"])}</div></td>'
                        + "".join(f"<td>{pill(ts[n].get('status', ''))}</td>" for n in TASKS)
                        + f'<td class="needs" title="{e(need or "")}">{e((need or "")[:60])}</td><td>{t(st.get("first_activity"))}</td>'
                        f'<td>{minutes(st)}</td><td>{t(st.get("last_activity"))}</td></tr>')
            views.append(student_views(i, s))
        else:
            why = NO_ANSWER.get(s.get("reply_state") or "", "לא ענה") if s.get("asked") else "לא פתח את המחשב"
            rows.append(f'<tr class="muted"><td>{name}<div class="code">••••{e(s["last4"])}</div></td><td colspan="7">{why}</td></tr>')
    sent = answers.get("sent_at")
    day = (_dt(sent) or datetime.now(timezone.utc)).astimezone(IL)
    help_badge = f'<span class="badge bad">{len(stuck)} צריכים עזרה</span>' if stuck else '<span class="badge ok">אף אחד לא תקוע</span>'
    overview = f'''<section class="view" id="class"><div class="rep">
<div class="hdr"><div><h1>מצב הכיתה — שיעור {e(lesson)} · בונה המשחקים עם היכל התהילה</h1>
<div class="sub">בדיקת IT נשלחה {t(sent, "%d.%m.%Y %H:%M")} (שעון ישראל) · {len(answered)} מתוך {len(students)} ענו</div></div>{help_badge}</div>
<div class="counts">
<div class="card"><div class="k">ענו</div><div class="v">{len(answered)} / {len(students)}</div></div>
<div class="card"><div class="k">סיימו את כל 3 המשימות</div><div class="v">{len(all_done)}</div></div>
<div class="card"><div class="k">תקועים</div><div class="v" style="color:#c5221f">{len(stuck)}</div></div>
<div class="card"><div class="k">לא ענו · לא פתחו</div><div class="v">{len(no_answer)} · {len(never)}</div></div>
</div>
<table class="cls"><tr><th>תלמיד</th>{"".join(f"<th>{n}</th>" for n in TASKS)}<th>צריך</th><th>התחיל</th><th>משחק ראשון</th><th>פעילות אחרונה</th></tr>{"".join(rows)}</table>
<p class="ev-t" style="margin-top:12px">לחצו על תלמיד כדי לראות את הדוח המלא שלו ואת ציר הזמן של השיחה.</p>
</div></section>'''
    css = (HERE / "templates" / "report.css").read_text()
    page = f'''<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>מצב הכיתה — שיעור {e(lesson)} — {day.strftime("%d.%m.%y")}</title>
<style>{css}</style></head><body>
{overview}
{"".join(views)}
<script>function go(id){{document.querySelectorAll('.view').forEach(v=>v.hidden=v.id!==id);scrollTo(0,0);history.replaceState(null,'','#'+id)}}
if(location.hash&&document.getElementById(location.hash.slice(1)))go(location.hash.slice(1));</script>
</body></html>'''
    return page, f"class-{lesson}-report-{day.strftime('%d-%m-%y')}.html"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("answers")
    ap.add_argument("--lesson", default="4")
    ap.add_argument("--out-dir", default=".")
    a = ap.parse_args()
    page, name = build(json.loads(Path(a.answers).read_text()), a.lesson)
    out = Path(a.out_dir) / name
    out.write_text(page, encoding="utf-8")
    print(json.dumps({"report": str(out.resolve())}))


if __name__ == "__main__":
    main()
