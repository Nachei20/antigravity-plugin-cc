---
description: Transfer the current working context and git state to an interactive Antigravity CLI session
arguments:
  - name: notes
    description: Optional notes, questions, or instructions for the Antigravity session
---

Transfer working state to an interactive Antigravity session:

```bash
node "${CLAUDE_PLUGIN_ROOT:-.}/bin/agy-companion.mjs" transfer $ARGUMENTS
```

This launches the interactive Antigravity CLI (`agy -i`) preloaded with your repository's git status, branch details, and current modifications.
