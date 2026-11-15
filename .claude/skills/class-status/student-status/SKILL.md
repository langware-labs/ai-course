---
id: 11d73889-15c0-4c1d-9125-331f9eb15354
name: student-status
description: One student's lesson-4 status, checked ON the student's own machine.
  The teacher sends this file in an IT message (the class-status skill does it for
  every machine); the machine answers how far the student got, what the machine is,
  which game files exist, whether the shared game and Hall of Fame are live, the prompts per day, and a timestamped timeline of the Game Builder chat — all
  in short English (the teacher's side translates), in the shape of answer.shape.json
  (sent as the IT message's answer shape). Read only.
allowed-tools:
- Read
- Bash
- Glob
- Grep
---

# student-status

You were sent here by the teacher as an IT message. You only READ: never change the student's files, never start the
game builder, never call the xhostd admin API or the publish server, never message anyone, never print a secret value
(a token, a key, the content of `.secrets/` beyond the names of its fields). Work from the project folder. To check a
deliverable actually works you MAY fetch a **public student URL** (the share page, the Hall of Fame address) with a
plain HTTP GET — that is reading a public page, not calling xhostd with the secret.

**Write short plain English** (`evidence`, `issue`, `summary`, `what`) — the teacher's side translates it to Hebrew.
Quote the student's own words as they wrote them (Hebrew stays Hebrew). File paths, URLs and names stay as they are.

**The whole answer must stay under 3500 bytes** (today an IT answer is capped at 4096 bytes counted as ASCII-escaped
JSON, so a Hebrew letter costs 6 bytes — remove these limits and the translation step once flow_sdk measures UTF-8):
`evidence` ≤ 120 characters, `issue` ≤ 80, `summary` ≤ 200, at most 12 `timeline` entries (the student's messages
and the milestones; merge a run of agent steps into one) with `what` ≤ 70 characters and student quotes ≤ 30,
at most 6 files per game, the newest game only, at most 14 `activity` days (the newest).

## The lesson's tasks (in order)

| task (`name`) | done when |
|---|---|
| `בניית משחק` | a folder `work/lesson-04/<name>/` has an `index.html` whose local `<script src>` / `<link href>` files all exist |
| `שיתוף` | `work/lesson-04/<name>/share-link.json` has a `url` AND that url is live (GET → 200) |
| `היכל תהילה` | `.secrets/hof_app.json` names an app and its `address` AND that address is live (GET → 200) |

Status per task: `done`, `in_progress`, `stuck` or `not_started`. Judge each task from the real deliverable — the
files on disk and whether the public page actually loads — NOT from what the chat says. Set each task's `live` to
whether its URL returned 200 (`null` when there is no URL to check).
- **בניית משחק**: folder present but a referenced `<script>` / `<link>` file is missing → `stuck` (judge from the
  files, not the chat).
- **שיתוף**: `share-link.json` has a `url` and it loads → `done` (cite the url); the file has a `url` but the page
  does not load → `stuck` (the share link is the final deliverable); no `share-link.json` → `not_started`.
- **היכל תהילה**: `hof_app.json` and its `address` loads → `done` (cite the `address`, never a key); score-table
  code in the game but no `hof_app.json`, or an `hof_app.json` whose `address` does not load → `in_progress`
  (a HoF address can 404 mid-setup, so it stays `in_progress`, not `stuck`); nothing of the sort → `not_started`.
- A task is `stuck` ONLY when the student's own output is actually broken (a referenced game file missing, a
  published page that 404s). A task the student simply did not finish — the agent
  offered a step and the student stopped replying, or never answered a question — is `in_progress` or `not_started`,
  NOT `stuck`; say so in `issue` ("student stopped replying" / "waiting on the student"). The xhostd token is
  plumbing the machine already has: it is never a task and never a reason to mark one `stuck`.
- No game at all → every task `not_started`.

## Steps

A fact you cannot read (a command fails, a file is missing) is `null` — note it and go on. Never end the run with
an error for a missing fact: always finish with status `done` and the full value.


1. Games: `ls work/lesson-04/*/index.html`. For each game folder: every file with its last-modified time (UTC ISO) and size.
   Decide the tasks from the newest game. Then check the deliverables are live: if `share-link.json` has a `url`, and
   if `.secrets/hof_app.json` has an `address`, fetch each with a plain GET
   (`curl -s -o /dev/null -w '%{http_code}' --max-time 15 <url>`) and set that task's `live` from the result
   (`200` = live). Send no token or secret in the request — these are public pages.
2. Machine: the machine status (`flow` API `compute_node/@local/get-machine-status`, else `nproc` / `free -g`) for size and memory, the Flowpad
   version (`flow --version`), and when the project folder was created (UTC ISO).
3. Transcript: the newest Claude Code session `.jsonl` under `~/.claude/projects/` for this project (the Game Builder
   chat; skip this IT session itself). Build `timeline`: one entry per student message and per notable agent event
   (plan shown, game built, game shown, published, a Hall of Fame step, an error or a refusal, waiting for the
   student), each with its UTC `ts`, `who` (`student` / `agent`) a one-line `what` (a student message is
   quoted, cut to 30 characters) and a `kind`: `error` (an error or a refusal), `waiting` (the agent waits for
   something the student or teacher never sent) or `event`. `stats`: the number of student messages, first and last activity (UTC ISO), and the
   minutes from the first student message to the first working game (null when there is none).
4. `activity`: the student's prompts per day, counted with a command (never by eye) over EVERY Claude Code session
   `.jsonl` of this project (all the Game Builder chats, not only the newest; skip this IT session and any other IT
   session). A prompt is a `type: "user"` line the student typed: not a tool result, not `isMeta`, not `isSidechain`.
   Group by the date in Israel time (`Asia/Jerusalem`): one `{"date": "YYYY-MM-DD", "prompts": N}` per day that has
   at least one prompt, oldest first, the newest 14 days. No chat → `[]`.
5. `needs_help` is true when any task is `stuck`. `summary`: two short sentences for the teacher.
6. Write the result file the way this IT session asks, with the whole answer under `data.value`, matching the
   request's JSON Schema (this skill's `answer.shape.json`).
