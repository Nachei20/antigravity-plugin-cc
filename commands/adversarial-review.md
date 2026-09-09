---
description: Run a steerable, adversarial challenge review using Google Antigravity
arguments:
  - name: focus
    description: Flags (--base <ref>, --background) and challenge focus text
---

Execute the Antigravity adversarial review companion:

```bash
node "${CLAUDE_PLUGIN_ROOT:-.}/bin/agy-companion.mjs" adversarial-review $ARGUMENTS
```

Antigravity will pressure-test the architectural decisions, trade-offs, and failure modes according to the provided focus area.
