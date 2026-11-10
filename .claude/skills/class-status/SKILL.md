---
name: class-status
description: The teacher's class report for lesson 4. Checks every student machine
  of the Game Builder agent over an IT message (the student-status sub-skill runs
  on each machine, read only), collects the answers, and writes ONE shareable Hebrew
  page class-4-report-<DD-MM-YY>.html — the class overview, and each student's report
  and chat timeline one click away. Use for "class status", "how is the class doing",
  "class report", "who needs help".
allowed-tools:
- Read
- Write
- Bash
- Agent
---

# class-status

Runs on the TEACHER's desktop, signed in to the hub as the agent's owner or admin. Two parts:

| part | where it runs | what it does |
|---|---|---|
| `student-status/` (sub-skill) | on every student machine, sent in the IT message | reads that student's work and chat, answers in `answer.shape.json`, in Hebrew |
| this skill | the teacher's desktop | sends the check to every machine, collects the answers, builds the class report |

The lesson-4 agent is `Hall of Fame Game Builder` (`2a54ba7e-5b07-45d9-bc2d-520dfb9541d4`); another agent: its id
from its page.

## Steps

1. **Launch one subagent** to collect the class (it can take several minutes: every paused machine is woken and
   checked). Give it this task, word for word with the paths filled in:

   > Run `"$FLOWPAD_PYTHON" <this skill>/scripts/it_class.py --agent <agent id> --out <project>/.class-status/answers-<DD-MM-YY>.json`
   > and wait for it to finish. It sends the `student-status` skill to every student machine in one IT message,
   > collects each machine's answer, and switches IT back to what it was. Report the JSON line it prints
   > (`asked`, `answered`, `conversation_id`) and nothing else. Do not read or print the answers.

   `--targets 36RK,GX8V` checks only those codes (a test, or one student again).

2. **Translate to Hebrew.** The machines answer in short English (an IT answer is capped at 4096 bytes, and Hebrew
   letters count 6 bytes each, so a Hebrew answer does not fit). Read the answers file and write
   `answers-<DD-MM-YY>.he.json` beside it: the same JSON with every `summary`, `evidence`, `issue` and timeline `what`
   in natural Hebrew for a teacher. Keep the student's quoted words, file paths, URLs, names and every other field
   exactly as they are.

3. **Build the report** from the Hebrew answers file:

   ```bash
   "$FLOWPAD_PYTHON" <this skill>/scripts/build_report.py <project>/.class-status/answers-<DD-MM-YY>.he.json --lesson 4 --out-dir <project>
   ```

   It writes `class-4-report-<DD-MM-YY>.html`: one self-contained Hebrew page (right to left, no libraries, no
   network), safe to share as is.
   - the overview: when the check ran, how many answered, four counts (ענו / סיימו הכול / תקועים / לא ענו · לא
     פתחו), then one row per student: a pill per task, what they need, started, first game, last activity —
     stuck students first, then by progress; never-opened and unanswered machines as muted rows at the bottom;
   - a click on a student opens that student's report (summary, four cards, the three tasks with evidence, the game
     files) and their chat timeline (every student message and agent milestone, with the time and the gap).

4. **Show it** (`flow show file <report>`) and say in one line who needs help (the stuck students and their issue).

## Rules
- Read only on the students' machines; never change their work, never message them.
- Never put a secret in the report or the answers file (the sub-skill never reports one).
- The answers file stays in `<project>/.class-status/` (git-ignored); only the HTML report is shared.
