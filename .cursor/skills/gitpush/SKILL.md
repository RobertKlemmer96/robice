---
name: gitpush
description: >-
  Pushes the current workspace state to origin/main when the user sends /gitpush
  or asks to push to main. Stages uncommitted changes, creates a commit if
  needed, then pushes to GitHub main without force.
disable-model-invocation: false
---

# /gitpush

Projektroot: Workspace-Root (`webapp`). Remote: `origin`. Zielbranch: **`main`** auf GitHub.

Lokaler Branch heißt oft **`master`** und trackt `origin/main` — Push immer explizit nach `main`:

```powershell
git push origin HEAD:main
```

## Wann anwenden

User schreibt **`/gitpush`**, „push to main“, „aktuellen Stand pushen“ o. Ä.

## Ablauf

1. **Parallel** ausführen:
   - `git status`
   - `git diff` (staged + unstaged)
   - `git log -5 --oneline`
   - `git status -sb` (Tracking zu `origin/main` prüfen)

2. **Uncommitted changes?**
   - Relevante Dateien stagen (keine Secrets: `.env`, Credentials, Keys).
   - Commit-Message aus Diff + letzten Commits ableiten (1–2 Sätze, Fokus auf *warum*).
   - Committen:
     ```powershell
     git add <relevante Dateien>
     git commit -m @"
     <Commit-Message>

     "@
     ```
   - Hook schlägt fehl → **nicht** `--amend`; Fehler beheben, **neuer** Commit.

3. **Vor dem Push** (optional, bei Ablehnung durch Remote):
   - `git fetch origin main`
   - Wenn hinter `origin/main`: `git pull --rebase origin main` (kein Merge-Commit, außer User will anders).

4. **Pushen**:
   ```powershell
   git push origin HEAD:main
   ```
   - **Niemals** `git push --force` / `--force-with-lease` auf `main`, außer der User verlangt es ausdrücklich — dann warnen.
   - **Niemals** `git config` ändern.

5. **Danach**: `git status` — bestätigen, dass alles synchron mit `origin/main` ist.

6. **User kurz informieren**:
   - Commit-Hash + Message (falls neu committed)
   - Push erfolgreich → Remote-URL / Branch `main`
   - Bei Fehler: Meldung + nächster Schritt

## Hinweise

- Nur committen, weil `/gitpush` das explizit verlangt (aktueller Stand soll auf `main`).
- Keine leeren Commits.
- Nichts pushen, wenn der User nur den Skill haben wollte, ohne Push auszuführen.
