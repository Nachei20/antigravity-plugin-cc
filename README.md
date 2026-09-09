# Antigravity Plugin for Claude Code (`antigravity-plugin-cc`)

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Claude%20Code-purple.svg)](https://claude.ai/code)
[![Engine](https://img.shields.io/badge/engine-Google%20Antigravity-green.svg)](https://deepmind.google/)

Use **Google Antigravity (Gemini)** directly from inside **Claude Code** for independent cross-model code reviews, adversarial design stress-tests, and task rescue delegation.

This plugin bridges **Anthropic Claude Code** and **Google Antigravity**, eliminating the cognitive echo chamber in AI-driven software development by enforcing the core engineering principle:

> **"Whoever designs or builds a piece of software must never grade or audit it."**
> — Code written by Claude is audited in cold blood by Google Antigravity.

---

## What You Get

| Command | Type | Description |
| :--- | :--- | :--- |
| `/antigravity:review` | Read-only | Standard principal engineer code review on uncommitted changes or branches. |
| `/antigravity:adversarial-review` | Read-only | Steerable, skeptical audit challenging architecture, race conditions, and hidden failure modes. |
| `/antigravity:rescue` | Edit mode | Delegates a difficult bug, failing test, or stuck task to Antigravity (`agy --mode accept-edits`). |
| `/antigravity:status` | Utility | Checks the status of background review jobs. |
| `/antigravity:result` | Utility | Retrieves the output of completed background jobs. |
| `/antigravity:cancel` | Utility | Cancels an ongoing background job. |
| `/antigravity:setup` | Utility | Validates Antigravity CLI (`agy`) detection and readiness. |

---

## Requirements

1. **Claude Code CLI** (Anthropic)
2. **Google Antigravity CLI (`agy`)**:
   - Installed and authenticated on your machine (`agy` executable in PATH or `%LOCALAPPDATA%\agy\bin\agy.exe`).
   - Uses your active Google Antigravity account (no separate OpenAI API keys or meter costs).
3. **Node.js**: Version 18.18.0 or later.
4. **Git**: Installed and available in your environment.

---

## Installation

### Method A: Install via Claude Code Marketplace

Add this repository to your Claude Code marketplace:

```bash
/plugin marketplace add <github-username>/antigravity-plugin-cc
/plugin install antigravity@antigravity
/reload-plugins
/antigravity:setup
```

### Method B: Local Development / Direct Linking

From the root of your project or Claude Code configuration:

```bash
# Link local plugin folder
/plugin install ./path/to/IA_SKILLS

# Verify installation
/antigravity:setup
```

---

## Usage Guide

### 1. `/antigravity:review`
Runs a read-only code review on your current work. Antigravity analyzes the git diff against `HEAD` or a base branch and provides severity-ranked findings (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) along with a final verdict (`APPROVED` / `REVISE`).

```bash
# Review uncommitted changes
/antigravity:review

# Review current branch against main
/antigravity:review --base main

# Run in the background for large multi-file diffs
/antigravity:review --background
/antigravity:status
/antigravity:result
```

---

### 2. `/antigravity:adversarial-review`
Runs a **steerable, skeptical challenge review**. It actively questions assumptions, trade-offs, rollback feasibility, database transaction boundaries, race conditions, and asks hard architectural questions.

```bash
# General challenge review
/antigravity:adversarial-review

# Specific focus area
/antigravity:adversarial-review desafía si el diseño de caché y reintentos puede causar tormentas de consultas (thundering herd)

# Branch comparison with specific security focus
/antigravity:adversarial-review --base main audita minuciosamente la sanitización de inputs y validación de tokens JWT
```

---

### 3. `/antigravity:rescue`
When Claude Code encounters an elusive bug, recurring test failure, or requires a fresh perspective, `/antigravity:rescue` transfers the problem to Antigravity. Antigravity operates with active edits enabled (`--mode accept-edits`) to investigate and apply the fix.

```bash
/antigravity:rescue El test de integración en auth.test.ts falla intermitentemente por timeout al levantar el contenedor de Postgres
```

---

### 4. Background Job Management

For large reviews that take time:

```bash
# Start in background
/antigravity:review --background

# Check status
/antigravity:status

# View final review
/antigravity:result

# Cancel if needed
/antigravity:cancel
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                       Claude Code                       │
│             (Interactive Developer Session)             │
└────────────┬───────────────────────────────▲────────────┘
             │                               │
             │ Slash Command Execution       │ Returns Verdict / Diff
             ▼                               │
┌─────────────────────────┐     ┌────────────┴────────────┐
│   agy-companion.mjs     │────▶│    Antigravity CLI      │
│  (Runner & Job Engine)  │     │       (agy -p)          │
└─────────────────────────┘     └─────────────────────────┘
             │                               ▲
             ▼                               │
     [Git Diff / Status]                     │
     [Background PID & Logs] ────────────────┘
```

---

## License

Licensed under the [Apache License, Version 2.0](LICENSE).
