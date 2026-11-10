---
id: 80b68329-7f3b-4ce2-9dc9-9baad2bf4fdb
---

# Git Basics — Reference Material

Companion reading for [Lecture 5: Git Basics](../slides/git-basics.html).

## Core concepts

- **Working directory** — the files on disk you're editing.
- **Staging area (index)** — changes marked for the next commit (`git add`).
- **Repository (`.git/`)** — the committed history, stored as snapshots, not diffs.
- **Commit** — a snapshot of the staged tree, with a parent pointer, author, message, and hash.

## Command reference

| Command | Purpose |
|---|---|
| `git init` | Create a new repository in the current directory |
| `git clone <url>` | Copy an existing repository, history included |
| `git status` | Show staged / unstaged / untracked changes |
| `git add <file>` | Stage changes for the next commit |
| `git commit -m "msg"` | Record a snapshot of staged changes |
| `git log --oneline` | Show commit history |
| `git branch` | List / create branches |
| `git switch <name>` / `git switch -c <name>` | Move to / create+move to a branch |
| `git merge <branch>` | Merge another branch into the current one |
| `git remote -v` | List configured remotes |
| `git push origin <branch>` | Upload local commits to a remote |
| `git fetch origin` | Download remote history without merging |
| `git pull origin <branch>` | Fetch + merge in one step |

## Branching & merging

- Branch per exercise, feature, or exploit variant — never develop directly on `main`.
- **Fast-forward merge**: target branch hasn't moved since branching; Git just advances the pointer.
- **Merge commit**: both branches moved; Git creates a commit with two parents.
- **Conflict**: the same lines changed on both sides. Git marks the file with
  `<<<<<<<` / `=======` / `>>>>>>>` markers — resolve by hand, then `git add` + `git commit`.

## Secrets hygiene (security-specific)

- Add a `.gitignore` **before** your first commit. Once a secret is committed, ignoring the
  file afterward does nothing — it's already in history.
- Never commit `.env` files, private keys (`*.pem`, `*.key`, `id_rsa*`), credentials, or
  target/client data.
- If a secret is ever pushed, treat it as **compromised immediately**: rotate the credential,
  then rewrite history (`git filter-repo` or BFG Repo-Cleaner) to strip it — rotation, not
  history-rewriting, is what actually neutralizes the leak.
- Public repos expose their **full** commit history, including anything later "deleted."

## Further reading

- [Pro Git Book — Git Basics](https://git-scm.com/book/en/v2/Git-Basics-Getting-a-Git-Repository)
- [Pro Git Book — Basic Branching and Merging](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging)
- [git-scm.com gittutorial](https://git-scm.com/docs/gittutorial)
