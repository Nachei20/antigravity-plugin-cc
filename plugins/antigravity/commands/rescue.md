---
description: Delegate a stuck task or bug fix to Google Antigravity
arguments:
  - name: task
    description: Description of the bug, test failure, or task to delegate
---

Execute the Antigravity task rescue companion:

```bash
node "${CLAUDE_PLUGIN_ROOT:-.}/bin/agy-companion.mjs" rescue $ARGUMENTS
```

Antigravity will inspect the repository in active edit mode and resolve or fix the issue.
