---
description: Run the Claudegravity cross-model plan hardening loop (shortcut to the claudegravity-loop plugin)
arguments:
  - name: task
    description: High-stakes architectural task, feature spec, or plan to harden
---

Invoke the `claudegravity-loop:claudegravity-loop` skill from the **claudegravity-loop** plugin and follow it for this task:

$ARGUMENTS

That plugin is the single source of the four-phase protocol (Recon → Interrogate → Review → Build); this command is only a shortcut to it and carries no copy of the protocol.

If the `claudegravity-loop:claudegravity-loop` skill is not available, stop and tell the user to install the plugin:

```text
/plugin marketplace add Nachei20/claudegravity-loop
/plugin install claudegravity-loop@claudegravity-loop
```
