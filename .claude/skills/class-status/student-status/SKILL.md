---
name: student-status
description: One student's lesson-4 status, checked ON the student's own machine.
  The teacher sends this file in an IT message (the class-status skill does it for
  every machine); the machine answers how far the student got, what the machine is,
  which game files exist, and a timestamped timeline of the Game Builder chat — all
  in short English (the teacher's side translates), in the shape of answer.shape.json (sent as the IT message's answer shape). Read only.
allowed-tools:
- Read
- Bash
- Glob
- Grep
---

# student-status

You were sent here by the teacher as an IT message. You only READ: never change the student's files, never start the
game builder, never call xhostd or the publish server, never message anyone, never print a secret value (a token,
a key, the content of `.secrets/` beyond the names of its fields). Work from the project folder.

**Write short plain English** (`evidence`, `issue`, `summary`, `what`) — the teacher's side translates it to Hebrew.
Quote the student's own words as they wrote them (Hebrew stays Hebrew). File paths, URLs and names stay as they are.

**The whole answer must stay under 3500 bytes** (today an IT answer is capped at 4096 bytes counted as ASCII-escaped
JSON, so a Hebrew letter costs 6 bytes — remove these limits and the translation step once flow_sdk measures UTF-8):
`evidence` ≤ 120 characters, `issue` ≤ 80, `summary` ≤ 200, at most 12 `timeline` entries (the student's messages
and the milestones; merge a run of agent steps into one) with `what` ≤ 70 characters and student quotes ≤ 30,
at most 6 files per game, the newest game only.

## The lesson's tasks (in order)

| task (`name`) | done when |
|---|---|
| `בניית משחק` | a folder `work/lesson-04/<name>/` has an `index.html` whose local `<script src>` / `<link href>` files all exist |
| `שיתוף` | `work/lesson-04/<name>/share-link.json` exists with a `url` |
| `היכל תהילה` | `.secrets/hof_app.json` names an app and its `address` |

Status per task: `done`, `in_progress`, `stuck` or `not_started`.
- **בניית משחק**: folder but a missing file, or the chat shows the build failed and was not fixed → `stuck`.
- **שיתוף**: `share-link.json` with a `url` → `done` (cite the url); otherwise `not_started`.
- **היכל תהילה**: `hof_app.json` → `done` (cite the `address`, never a key); score-table code in the game but no
  `hof_app.json` → `in_progress`, or `stuck` when the chat shows the agent waiting for something (a class code, a
  token) that never came.
- The chat shows the student asked for help and did not get it, or pasted an error → that task is `stuck`, and
  `issue` says what blocks them in one short sentence.
- No game at all → every task `not_started`.

## Steps

A fact you cannot read (a command fails, a file is missing) is `null` — note it and go on. Never end the run with
an error for a missing fact: always finish with status `done` and the full value.


1. Games: `ls work/lesson-04/*/index.html`. For each game folder: every file with its last-modified time (UTC ISO) and size.
   Decide the tasks from the newest game.
2. Machine: the machine status (`flow` API `compute_node/@local/get-machine-status`, else `nproc` / `free -g`) for size and memory, the Flowpad
   version (`flow --version`), and when the project folder was created (UTC ISO).
3. Transcript: the newest Claude Code session `.jsonl` under `~/.claude/projects/` for this project (the Game Builder
   chat; skip this IT session itself). Build `timeline`: one entry per student message and per notable agent event
   (plan shown, game built, game shown, published, a Hall of Fame step, an error or a refusal, waiting for the
   student), each with its UTC `ts`, `who` (`student` / `agent`) a one-line `what` (a student message is
   quoted, cut to 30 characters) and a `kind`: `error` (an error or a refusal), `waiting` (the agent waits for
   something the student or teacher never sent) or `event`. `stats`: the number of student messages, first and last activity (UTC ISO), and the
   minutes from the first student message to the first working game (null when there is none).
4. `needs_help` is true when any task is `stuck`. `summary`: two short sentences for the teacher.
5. Write the result file the way this IT session asks, with the whole answer under `data.value`, matching the
   request's JSON Schema (this skill's `answer.shape.json`).
