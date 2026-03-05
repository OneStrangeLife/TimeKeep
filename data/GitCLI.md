# Git Commit & Push Cheatsheet

## Basic Workflow (most common)

```bash
# 1. See what files have changed
git status

# 2. Stage files for commit
git add filename.txt        # specific file
git add .                   # all changed files in current directory

# 3. Commit with a message
git commit -m "your message describing what changed"

# 4. Push to GitHub
git push
```

---

## Useful Variations

```bash
# Stage all changes and commit in one step
git add . && git commit -m "your message"

# See exactly what changed before staging
git diff

# See what is staged and ready to commit
git diff --staged

# Push to a specific branch
git push origin branch-name

# Push and set upstream tracking (first push of a new branch)
git push -u origin branch-name
```

---

## Checking History

```bash
# View recent commits
git log --oneline

# View last 10 commits
git log --oneline -10
```

---

## Undoing Things

```bash
# Unstage a file (before committing)
git restore --staged filename.txt

# Discard changes to a file (WARNING: permanent)
git restore filename.txt

# Undo last commit but keep changes
git reset --soft HEAD~1
```

---

## First Time Setup (one time only)

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

---

## Typical Session Example

```bash
git status                         # see what changed
git add .                          # stage everything
git commit -m "add login feature"  # commit
git push                           # push to GitHub
```
