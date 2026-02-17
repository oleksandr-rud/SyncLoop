# SyncLoop Agent Protocol

Self-correcting 7-stage reasoning loop for every task.

## Protocol

```
SENSE → GKP → DECIDE+ACT → CHALLENGE-TEST → UPDATE → LEARN → REPORT
```

### Stages

1. **SENSE** — Detect current state, issues, context gaps
2. **GKP** — Gather and compress relevant knowledge (patterns, constraints, risks)
3. **DECIDE+ACT** — Select mode, plan action, execute immediately
4. **CHALLENGE-TEST** — Run 2-stage validation (ENV gates + NEIGHBOR checks)
5. **UPDATE** — Commit state transitions
6. **LEARN** — Persist fixes and patterns
7. **REPORT** — Session summary (skip if trivial)

### Inner Loops

1. **SENSE ↔ GKP** — cycle until relevant context gathered and compressed
2. **CHALLENGE-TEST → FEEDBACK → patch → retry** — iterate until gates pass (max 5)

### Modes

| Mode | Trigger | Behavior |
|------|---------|----------|
| **INTACT-STABILIZE** | All gates pass | Harden quality, tests, docs |
| **BROKEN-EXPAND** | Issues detected | Fix root cause, minimal surface |
| **OVERDENSE-SPLIT** | Complexity high | Decompose before expanding |

### Validation (CHALLENGE-TEST)

- **Stage 1: ENV** — types, tests, layers, complexity, debug hygiene
- **Stage 2: NEIGHBOR** — shapes, boundaries, bridges
- Classify failures: **Micro** (fix in-place, no budget cost) vs **Macro** (→ feedback loop, -1 of 5 retries)
- Max 5 macro iterations; branch prune on 3× same error

### Context Management

- Compress after GKP — don't carry raw files forward
- State Collapse after LEARN — checkpoint summary + discard history
- Per-stage loading: only read files relevant to current stage

### Guardrails

- ❌ Never modify tests to force pass
- ❌ Never suppress types to fix errors
- ❌ Never change public API without approval
- ❌ Never bypass architecture layers

### MCP Configuration

```json
{
  "mcpServers": {
    "sync_loop": {
      "command": "npx",
      "args": ["-y", "-p", "@oleksandr.rudnychenko/sync_loop", "sync_loop"]
    }
  }
}
```

Full protocol details available via SyncLoop MCP resources or in `.github/instructions/` directory.
