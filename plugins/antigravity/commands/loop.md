---
description: Run the Claudegravity cross-model plan hardening and build loop with Google Antigravity
arguments:
  - name: task
    description: High-stakes architectural task, feature spec, or plan to harden
---

Activate the `claudegravity-loop` skill to execute the four-phase collaborative protocol:

1. **Phase 0 — Recon**: Scout existing code, ADRs, database models, and build the Assumptions Ledger.
2. **Phase 1 — Interrogate**: Map load-bearing decisions 1-by-1, batch cosmetic options, and freeze `PLAN.md`.
3. **Phase 2 — Review**: Send `PLAN.md` to Google Antigravity via headless `agy -p "<prompt>" --mode plan` in hostile read-only mode until `VERDICT: APPROVED` (max 5 rounds) and obtain human sign-off.
4. **Phase 3 — Build**: Cross-construct the code, ensuring the model that writes code never audits its own diff, accompanied by independent test proof.

Run directly in Claude Code by invoking the `claudegravity-loop` skill instructions.
