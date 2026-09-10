---
description: Run a read-only code review using Google Antigravity
arguments:
  - name: flags
    description: Optional flags like --base <ref> or --background
---

Execute the Antigravity code review companion:

```bash
node "${CLAUDE_PLUGIN_ROOT:-.}/bin/agy-companion.mjs" review $ARGUMENTS
```

Review results and verdicts (APPROVED / REVISE) will be displayed directly from Antigravity.
