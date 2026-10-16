---
description: Run a read-only code review of your git changes with Google Antigravity (background job)
argument-hint: '[--base <ref>] [--model <model>] [--effort <low|medium|high|max>]'
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/bin/agy-companion.mjs" review "$ARGUMENTS"`

Show the output above to the user as is. It runs as a background job: do not wait for it. Point the user to `/antigravity:status` and `/antigravity:result`. This command is review-only: do not fix anything.
