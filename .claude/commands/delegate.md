Implement the following task end-to-end: make the change, ship a PR, watch CI, and iterate until all checks are green.

## Task

$ARGUMENTS

## Workflow

### 1. Understand before touching

Read every file relevant to the task before writing any code. Do not propose changes to code you haven't read.

### 2. Implement

Make the minimal changes needed. Follow existing patterns. Do not over-engineer, add unrequested features, or touch files unrelated to the task.

### 3. Unit tests

Run `npm test`. If tests fail or coverage drops below 80% on any axis (lines, branches, functions), fix the **code** (not the thresholds) and run again. Repeat until green.

### 4. UI verification (only if `public/` files changed)

If any file under `public/` was modified:
- Start the server: `npm run dev`
- Open the app: `agent-browser open --headed http://localhost:3000`
- Exercise the changed feature interactively and take a full-page screenshot as evidence
- Stop the dev server before continuing

### 5. Commit & push

Create a branch, stage only the files you changed, commit, and push:

```bash
git checkout -b <descriptive-kebab-case-branch>
git add <only changed files — never -A blindly>
git commit -m "<type>: <what and why, not just what>"
git push -u origin <branch>
```

### 6. Open PR

```bash
gh pr create --title "..." --body "..."
```

Body must include: what changed, why, and how it was tested.

### 7. Watch CI and respond

```bash
gh pr checks <PR-number> --watch
```

Wait for all checks to finish, then act on the outcome:

**All green** → report the PR URL and a one-line summary. Done.

**Any job fails** →
1. Get the failure logs: `gh run view <run-id> --log-failed` (find run-id with `gh run list --branch <branch> --limit 1`)
2. Diagnose the root cause — read the logs carefully, do not guess
3. Fix the code and re-run `npm test` locally to confirm the fix
4. Commit the fix and push to the same branch
5. Go back to step 7 and watch CI again

Keep iterating until CI is fully green. Only stop and ask the user for input if you have exhausted all reasonable fixes and cannot determine the root cause.
