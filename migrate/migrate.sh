#!/usr/bin/env bash
# Migrate one student machine to the one-course layout.
#
#   bash migrate.sh <course.bundle>
#
# 1. ~/Flowpad workspace/ai-course is created from the bundle, or fast-forwarded to it
#    (the student's own files under work/ are untracked and stay as they are);
# 2. games from the old per-lesson projects (ai-course-lesson-N/games/<game>) are copied to
#    ai-course/work/lesson-0N/<game>; an existing game of the same name is never overwritten;
#    the old projects are left in place;
# 3. nothing to build: the course home's serve.py lists work/ live, so each lesson card links the games.
# Prints one JSON line: what moved and where.
set -euo pipefail
BUNDLE="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
WS="$HOME/Flowpad workspace"
COURSE="$WS/ai-course"
REF="$(git bundle list-heads "$BUNDLE" | head -1 | cut -d" " -f2)"

git config --global --add safe.directory "$COURSE" 2>/dev/null || true
if [ -d "$COURSE/.git" ]; then
  git -C "$COURSE" fetch -q "$BUNDLE" "$REF"
  # Local edits to tracked files (e.g. a skill's script the agent patched) are kept aside, not lost.
  if ! git -C "$COURSE" diff --quiet; then git -C "$COURSE" stash push -q -m "before course migration"; fi
  git -C "$COURSE" merge -q --ff-only FETCH_HEAD || git -C "$COURSE" reset -q --hard FETCH_HEAD
else
  git init -q "$COURSE" && git -C "$COURSE" fetch -q "$BUNDLE" "$REF" && git -C "$COURSE" reset -q --hard FETCH_HEAD
fi

moved=()
shopt -s nullglob
for old in "$WS"/ai-course-lesson-*; do
  n="${old##*-lesson-}"; n="$(printf '%02d' "$((10#$n))")"
  for game in "$old"/games/*/; do
    name="$(basename "$game")"; dest="$COURSE/work/lesson-$n/$name"
    [ -e "$dest" ] && continue
    mkdir -p "$COURSE/work/lesson-$n"
    cp -a "$game" "$dest"
    moved+=("lesson-$n/$name")
  done
done

printf '{"course":"%s","head":"%s","moved":[%s],"work":[%s]}\n' \
  "$COURSE" "$(git -C "$COURSE" rev-parse --short HEAD)" \
  "$(printf '"%s",' "${moved[@]:-}" | sed 's/,$//; s/^""$//')" \
  "$(cd "$COURSE/work" && find . -mindepth 3 -maxdepth 3 -name index.html -path "./lesson-*" | sed 's|^\./||; s|/index.html$||' | sort | sed 's/.*/"&"/' | paste -sd, -)"
