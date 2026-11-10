# ai-course-lesson-3 — build a game

Lesson 3 of the AI course. Open it in Flowpad with **Open from git** and you get
**Game Builder**, a vibe agent that builds a game with you — for a phone (portrait,
touch) or a computer (keyboard and mouse) — as plain HTML/CSS/JS with no server and
no database, so it opens on any device. Every game has a "copy link" button in a
corner: paste the link in WhatsApp and send it to friends and family.

Pick a starter on the screen — first-person shooter, fight simulator, farm sim,
board game, Tetris — or invent your own.

- `agentic-assets/agent/game-builder/` — the agent (its rules, language, starters)
- `.claude/skills/html-builder/` — builds static pages, with the share button (`assets/share.js`)
- `.claude/skills/game-design/` — how to make the game fun, smooth and playable on a phone
- `games/<name>/` — where the games you build are saved
