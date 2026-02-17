# Agent Loop Prompts

Modular prompts for AI coding agents to run a reusable, self-correcting delivery loop.

Project bootstrap workflow and setup prompt are documented in [../README.md](../README.md).

## Overview

The framework uses a **7-stage protocol** with **2-stage validation**, **feedback integration**, and **session persistence**:

```
  ┌─────────┐     ┌─────────┐
  │ 1 SENSE │◄───►│ 2 GKP   │  ◄── inner loop: gather + compress
  └────┬────┘     └────┬────┘
       └───────┬───────┘
               ▼
       ┌──────────────┐
       │ 3 DECIDE+ACT │  ← select mode, plan, execute
       └──────┬───────┘
              ▼
  ┌───────────────────────┐
  │ 4 CHALLENGE-TEST      │  ◄── inner loop: validate + fix (max 5)
  │   ├ Stage 1: ENV      │  ← NFRs (types, tests, layers)
  │   └ Stage 2: NEIGHBOR │  ← Shapes, boundaries, bridges
  └──────────┬────────────┘
             │   On FAIL → FEEDBACK → patch → retry
             ▼
       ┌──────────┐
       │ 5 UPDATE  │  ← commit state transitions
       └─────┬────┘
             ▼
       ┌──────────┐
       │ 6 LEARN   │  ← persist to patterns.md / patterns/ specs
       └────┬─────┘
            ▼
       ┌──────────┐
       │ 7 REPORT  │  ← store session log to docs/reports/
       └──────────┘   (skip if trivial)
```

## Prompt Files

| File | Purpose | When to Use |
|------|---------|-------------|
| [reasoning-kernel.md](reasoning-kernel.md) | Core 7-stage loop with integrated validation | Every turn — master orchestrator |
| [patterns.md](patterns.md) | Pattern registry + learned fixes | GKP phase (read), LEARN phase (write) |
| [patterns/](patterns/) | Detailed implementation specs | GKP routes here for examples |
| [glossary.md](glossary.md) | Canonical domain terminology | Naming, resolving ambiguous terms |
| [validate-env.md](validate-env.md) | Stage 1: NFRs (types, tests, layers, complexity) | CHALLENGE-TEST Stage 1 |
| [validate-n.md](validate-n.md) | Stage 2: Neighbors (shapes, boundaries, bridges) | CHALLENGE-TEST Stage 2 |
| [feedback.md](feedback.md) | Behavioral patches, learning, spec persistence | On validation failure; LEARN phase routing |

## Pattern Specs (patterns/)

| Spec File | Pattern IDs | Content |
|-----------|-------------|---------|
| [code-patterns.md](patterns/code-patterns.md) | P1–P11 | Ports, modules, tasks, routes, DI, config, types, errors |
| [testing-guide.md](patterns/testing-guide.md) | R2 | Test patterns, fixtures, mocks, naming, 3-layer strategy |
| [refactoring-workflow.md](patterns/refactoring-workflow.md) | R1 | 4-phase refactoring checklist |
| [api-standards.md](patterns/api-standards.md) | R3 | Boundary contract standards, endpoint workflow |

## Validation Structure

Each gate follows: **CHECK → FEEDBACK (if failed) → RETRY**

| Stage | File | Scope |
|-------|------|-------|
| Stage 1: ENV | [validate-env.md](validate-env.md) | Non-functional requirements |
| Stage 2: NEIGHBOR | [validate-n.md](validate-n.md) | Compatibility and integration surfaces |
| Failure flow | [feedback.md](feedback.md) | Diagnosis, patching, escalation |

## Entrypoint

The root entrypoint is [AGENTS.md](../AGENTS.md).
It provides architecture rules, operational modes, and routing into this folder.
