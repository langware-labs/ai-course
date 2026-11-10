---
id: 8f848422-8d04-4091-a3ec-30235b5c9c3e
---

# Exercise 01 — Git Basics

Companion to [Lecture 5: Git Basics](../slides/git-basics.html).
See [docs/git-basics.md](../docs/git-basics.md) for the command reference.

## Goal

Practice the core Git workflow you'll use for every lab in this course: init, commit,
branch, merge, and keep secrets out of history.

## Tasks

1. **Initialize**
   - Create a new directory `git-basics-exercise/` and run `git init`.
   - Create a file `notes.md` with a one-line description of a security tool you use.
   - Stage and commit it with a meaningful message.

2. **.gitignore first**
   - Before creating any credential files, add a `.gitignore` that excludes `.env`,
     `*.pem`, `*.key`, and `credentials.json`.
   - Create a dummy `.env` file with a fake `API_KEY=...` value and confirm
     `git status` does **not** show it as untracked.

3. **Branch**
   - Create and switch to a branch `feature/recon-script`.
   - Add a file `recon.sh` containing a short comment describing a recon step
     (e.g. a placeholder `nmap` command). Commit it.

4. **Merge**
   - Switch back to `main` and merge `feature/recon-script`.
   - Confirm with `git log --oneline --graph` whether it was a fast-forward or a
     merge commit, and explain why in `notes.md`.

5. **Conflict (bonus)**
   - Create two branches from `main` that both edit the same line in `notes.md`.
   - Merge the first cleanly, then merge the second and resolve the resulting conflict
     by hand.

## Submission

Push your local repo to the remote provided by the instructor (or zip the `.git`
history if working offline) and submit the link/archive per course instructions.

## Checklist

- [ ] Repo initialized with at least 3 commits
- [ ] `.gitignore` added before any secret file was created
- [ ] A feature branch created and merged into `main`
- [ ] `git log --oneline --graph` output pasted into `notes.md` with a short explanation
- [ ] (Bonus) A merge conflict resolved by hand
