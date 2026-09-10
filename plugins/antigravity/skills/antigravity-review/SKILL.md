---
name: antigravity-review
description: "Guidelines and reasoning patterns for cross-model code reviews, adversarial stress-tests, and rescue operations using Google Antigravity."
---

# Antigravity Cross-Model Review Guidelines

This skill provides prompt formulations and analytical patterns for conducting cross-model engineering audits with Google Antigravity (DeepMind).

## Core Principles

1. **Independent Evaluation**: An AI assistant must never audit its own generated code without external friction. Antigravity acts as an independent second model with distinct training priors.
2. **Read-Only Enforcement**: Code audits must always execute in `--mode plan` to ensure that no unexpected file edits occur during evaluation.
3. **Structured Severities**:
   - `CRITICAL`: Security vulnerabilities, unhandled exceptions in primary paths, data corruption, or deadlock hazards.
   - `HIGH`: Race conditions, resource leaks, broken rollback strategies, or regression of core contract.
   - `MEDIUM`: Suboptimal performance, missing edge-case validation, inadequate telemetry or error logging.
   - `LOW`: Code smell, stylistic inconsistencies, or minor documentation omissions.

## Review Patterns

* **Standard Review (`/antigravity:review`)**: Evaluates implementation against clean code, domain design, and standard defensive programming.
* **Adversarial Review (`/antigravity:adversarial-review`)**: Specifically challenges load-bearing assumptions, trade-offs, and failure scenarios.
* **Rescue Delegation (`/antigravity:rescue`)**: Employs active reasoning to resolve stuck issues and failing integration tests.
