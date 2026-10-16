---
description: Delegate a stuck task or bug fix to Google Antigravity, which edits this repository (background job)
argument-hint: '[--model <model>] [--effort <low|medium|high|max>] <task or error description>'
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/bin/agy-companion.mjs" rescue "$ARGUMENTS"`

Show the output above to the user as is. It runs as a background job: do not wait for it. Point the user to `/antigravity:status` and `/antigravity:result`. Antigravity is editing files in this repository: do not modify the working tree until `/antigravity:result` shows the job finished, then review `git diff` before trusting the changes.
