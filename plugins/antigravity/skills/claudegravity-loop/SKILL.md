---
name: claudegravity-loop
description: >-
  Four-phase cross-model plan hardening and collaborative engineering between Anthropic Claude and Google Antigravity (Gemini).
  Phase 0: Recon (scout code/docs, assumptions ledger).
  Phase 1: Interrogate (load-bearing decisions 1-by-1, batch cosmetic, lock PLAN.md).
  Phase 2: Review (adversarial cross-model attack by Antigravity via headless agy CLI, Claude arbitrates in PLAN-REVIEW-LOG.md).
  Phase 3: Build (cross-construction, independent diff inspection, and test proof).
  Use when designing high-stakes architectures, major refactors, schema/auth/concurrency changes, or complex integrations.
---

# Claudegravity Loop — Cross-Model Plan Hardening & Build

A dual-engine collaborative engineering protocol combining **Anthropic Claude** and **Google Antigravity (Gemini)** to eliminate cognitive blind spots and prevent self-auditing in AI-assisted software development.

---

## The Core Rule of the System

> **"Whoever designs or builds a piece of software must never grade or audit it."**
> - When **Claude** designs the plan $\rightarrow$ **Antigravity** attacks and audits it in cold blood.
> - When **Antigravity** designs the plan $\rightarrow$ **Claude** attacks and audits it.
> - When one model builds the code $\rightarrow$ the rival model inspects the full diff and verifies test execution independently.

---

## The Four Phases

```mermaid
flowchart TD
    subgraph Fase0 ["🔍 FASE 0 — RECON (Claude)"]
        R1["Reconocimiento: Brownfield (código/ADRs) o Greenfield (patrones)"]
        R2["Consulta de Reglas: agent-rules-books (Clean Arch, APoSD, etc.)"]
        R3["Skill & Tool Inventory Scan"]
        R4["📋 Assumptions Ledger (Lote único de supuestos con fuentes)"]
        R1 --> R2 --> R3 --> R4
    end

    subgraph Fase1 ["🎯 FASE 1 — INTERROGATE (Claude ↔ Usuario)"]
        I1["🗺️ Decision Map (Estructurales vs Cosméticas)"]
        I2["Decisiones Críticas (Load-bearing): 1 a 1 con plantilla de impacto"]
        I3["Decisiones Cosméticas: En lote con defaults y veto por excepción"]
        I4["Escape Hatch: 'Aceptar todas las recomendaciones restantes'"]
        I5["🔒 PLAN.md bloqueado + PLAN-REVIEW-LOG.md inicializado"]
        I1 --> I2 --> I3 --> I4 --> I5
    end

    subgraph Fase2 ["⚔️ FASE 2 — REVIEW (Claude ↔ Antigravity Adversario)"]
        V1["Envío de PLAN.md inlined a Antigravity en modo Read-Only Hostil (agy -p)"]
        V2{"Veredicto de Antigravity"}
        V3["VERDICT: REVISE (Objeciones, riesgos de concurrencia, edge cases)"]
        V4["Claude arbitra hallazgos, ajusta PLAN.md y justifica en PLAN-REVIEW-LOG.md"]
        V5["Re-evaluación con hilo determinista (hasta 5 rondas)"]
        V6["VERDICT: APPROVED"]
        V7["✍️ Human Sign-off (Aprobación humana del plan antes de escribir código)"]
        V1 --> V2
        V2 -->|REVISE| V3 --> V4 --> V5 --> V2
        V2 -->|APPROVED| V6 --> V7
    end

    subgraph Fase3 ["🔨 FASE 3 — BUILD (Construcción Cruzada & Diff Audit)"]
        direction TB
        B_Choice{"¿Quién construye el código?"}
        
        subgraph RutaClaude ["Ruta A: Claude Construye"]
            BC1["Claude implementa el spec congelado"]
            BC2["Antigravity lee diff completo contra PLAN.md"]
            BC3["Claude corre PROOF_CMD de forma independiente"]
            BC4["Fix loop si hay fallas"]
        end
        
        subgraph RutaAntigravity ["Ruta B: Antigravity Construye"]
            BA1["Antigravity implementa código paso a paso (agy rescue)"]
            BA2["Claude inspecciona diff en frío contra PLAN.md"]
            BA3["Claude arbitra observaciones y ejecuta test suite"]
        end
        
        B_Choice -->|Claude| BC1 --> BC2 --> BC3 --> BC4
        B_Choice -->|Antigravity| BA1 --> BA2 --> BA3
        BC4 --> H_Final["✅ Aprobación Humana del Commit Final"]
        BA3 --> H_Final
    end

    Fase0 --> Fase1 --> Fase2 --> Fase3
```

---

## Detailed Execution Protocol

### Phase 0 — RECON
1. **Explore the codebase**: Check architecture, database models, API contracts, migrations, test suite, `CONTEXT.md`, and `docs/adr/`.
2. **Apply doctrine**: Check `agent-rules-books` to establish governing principles (`clean-architecture` for layering, `release-it` for production stability, `working-effectively-with-legacy-code` for legacy seams).
3. **Identify PROOF_CMD**: The exact command proving correctness (`npm test`, `pytest`, `cargo test`, `dotnet test`).
4. **Draft the Assumptions Ledger**: Single batch with every fact or inference sourced:
   ```markdown
   ## Assumptions Ledger
   1. <assumption> — source: <file:line / doc / rule / inference>
   2. ...
   ```
   The user confirms or corrects in a single reply.

---

### Phase 1 — INTERROGATE
1. **Decision Map**:
   * **Load-Bearing (Structural)**: Schema migrations, public API changes, concurrency design, security models. Asked **strictly one at a time**:
     > **Q<n>: <Question>**  
     > **Why it matters:** <Dependency or constraint>  
     > **Recommendation:** <Firm recommendation, not an open buffet>  
     > **What breaks if we guess wrong:** <Concrete failure scenario>  
   * **Cosmetic**: Names, file layouts, internal helpers. Presented in a single batch with defaults.
   * **Escape Hatch**: Always provide an option to *"Aceptar todas las recomendaciones restantes"*.
2. **Freeze `PLAN.md`**: Freeze goal, approach, tradeoffs, boundaries, assumptions, PROOF_CMD, and non-goals. Initialize `PLAN-REVIEW-LOG.md`.

---

### Phase 2 — REVIEW (Adversarial Antigravity Review)
1. **Invocación a Antigravity (Headless CLI `agy -p`)**:
   Run Antigravity in headless read-only mode using the user's active Google Antigravity subscription:
   ```bash
   agy -p "<adversarial prompt with inlined PLAN.md>" --mode plan
   ```
   * *Note*: Inline `PLAN.md` directly into the prompt so Antigravity has full context without needing tool execution permissions.
2. **The Adversarial Prompt Template**:
   ```text
   You are an adversarial reviewer for an implementation plan. Your job is to find flaws, not to validate or flatter.
   Read the frozen PLAN.md below. Identify concrete flaws: security holes, race conditions, missing edge cases,
   schema conflicts, hidden assumptions, or overengineering. For each flaw, provide a specific technical fix.
   Do not restate the plan. Do not praise it.
   End your response with EXACTLY one of:
   VERDICT: APPROVED
   or
   VERDICT: REVISE
   ```
3. **Arbitration Loop**:
   * Claude logs every finding in `PLAN-REVIEW-LOG.md` as `ACCEPTED`, `REJECTED`, or `DEFERRED` with technical rationale.
   * For subsequent rounds, resume with `--conversation <ID>` or `-c` so Antigravity remembers previous concessions.
   * Loop until `VERDICT: APPROVED` or **MAX_ROUNDS (default 5)**.
4. **Human Sign-Off**: The human signs off on the converged plan before any code is written.

---

### Phase 3 — BUILD (Cross-Construction & Independent Proof)
* **Route A (Claude Builds)**: Claude implements. Antigravity inspects the diff against `PLAN.md`. Claude runs `PROOF_CMD` independently.
* **Route B (Antigravity Builds)**: Delegated via `/antigravity:rescue`. Antigravity writes the patch. Claude inspects the diff cold against `PLAN.md` and runs `PROOF_CMD`.
* Human gives final sign-off before committing.

---

## When NOT to use this
Do not use for trivial typos, minor bugfixes, copy changes, or simple dependency bumps. Use when reversing a mistake would be expensive: schema, auth, payments, public API surface, or concurrency.
