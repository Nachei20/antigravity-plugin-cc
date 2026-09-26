---
description: Hand off the current git state to an interactive Antigravity CLI session
argument-hint: '[--model <model>] [--effort <low|medium|high|max>] [notes for Antigravity]'
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/bin/agy-companion.mjs" transfer "$ARGUMENTS"`

Show the output above to the user as is, including the `agy -i` command: they must run it in their own terminal, because an interactive session cannot run inside Claude Code.
