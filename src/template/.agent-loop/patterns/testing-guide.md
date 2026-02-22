# Testing Guide (R2)

Comprehensive testing patterns for safe iteration and regression prevention.
Referenced from [../patterns.md](../patterns.md).

---

## Test Organization

Organize tests into a top-level `tests/` directory with clear separation:

| Directory | Purpose |
|-----------|---------|
| `tests/conftest` or `tests/helpers` | Shared fixtures, global setup |
| `tests/factories` | Test data builders |
| `tests/mocks` | Mock implementations for external dependencies |
| `tests/api/` | API/endpoint tests (HTTP client) |
| `tests/integration/` | Multi-component workflow tests |
| `tests/unit/` | Pure logic tests (no I/O) |

---

## Pattern 1: Fixture-Based Setup

Define reusable **fixtures** (setup/teardown helpers) that isolate test state:

- **Environment isolation fixture**: resets any module-level singletons or global state before and after each test. Ensures one test cannot leak state into another.
- **Test app fixture**: configures the application with test-safe environment variables (e.g., test database URL, disabled background tasks) and yields a configured app instance.
- **Client fixture**: wraps the test app in an HTTP test client for endpoint-level tests.

Each fixture is scoped to the narrowest lifecycle needed — per-test for state resets, per-session for expensive resources like database connections.

---

## Pattern 2: Factory Pattern for Test Data

Create a **factory class** (or set of builder functions) that produces valid test entities with sensible defaults. Each factory method accepts optional overrides via keyword arguments so tests only specify the fields relevant to the scenario.

Provide **semantic constructors** — named factory methods like `with_full_analysis()` or `as_admin_user()` — that configure the entity for a specific test scenario. This makes test setup self-documenting and avoids duplicated setup logic across test files.

---

## Pattern 3: Mock External Dependencies

Define a **mock class** for each external boundary (LLM, HTTP API, storage backend, message queue). The mock:

- Accepts a configurable response via its constructor
- Records every call (arguments, timestamps) in an internal list
- Returns the configured response on each invocation
- Exposes a `call_count` property for verification

Tests inject the mock via fixture, replacing the real dependency. After the test action, assertions verify both the result and the mock's call history.

---

## Pattern 4: Class-Based Test Organization

Group related test cases into a **test class** named after the unit under test (e.g., `TestParseResponse`, `TestOrderService`). Each method within the class tests one behavior: happy path, error path, edge case, or default behavior. The class name provides namespace grouping in test runner output.

---

## Pattern 5: Parametrized Tests

Use the test framework's **parametrize** mechanism to run one test function across multiple input/output pairs. Define the parameter sets as a list of tuples — each tuple contains the input values and the expected outcome. This eliminates repetitive test methods for boundary-value or threshold logic.

---

## Pattern 6: Three-Layer Test Strategy

Structure tests into three layers with distinct characteristics:

- **Unit tests**: Pure logic, no I/O, no external dependencies. Test a single function or class method in isolation. Fast (< 10ms each).
- **Integration tests**: Multiple components wired together, external I/O mocked at the boundary. Test that services, repositories, and adapters compose correctly.
- **API tests**: Full HTTP request/response cycle through a test client. Verify status codes, response shapes, and error envelopes.

---

## Pattern 7: Assertion Patterns

Write assertions that verify **specific properties**, not just truthiness:

- Check exact field values on result objects
- Verify collection lengths and membership
- Use range/constraint assertions (value within expected bounds, enum membership)
- Assert on collection-wide properties (all items satisfy a predicate, at least one item matches)

Avoid vague assertions like "result is not None" or bare truthiness checks — they pass on wrong data.

---

## Pattern 8: Naming Convention

Format: `test_<action>_<condition>_<outcome>`

Examples:
- `test_returns_report` — basic happy path
- `test_metrics_computed_correctly` — specific behavior
- `test_unknown_type_falls_back_to_default` — edge case
- `test_invalid_json_fallback` — error handling
- `test_missing_fields_use_defaults` — default behavior
- `test_empty_input_returns_empty_report` — boundary condition

---

## Test Metrics (Target)

| Metric | Target |
|--------|--------|
| Pass Rate | 100% |
| Unit proportion | ≥ 70% |
| Integration proportion | ≤ 20% |
| API proportion | ≤ 10% |

---

## Test Heuristics

| Heuristic | Guideline |
|-----------|-----------|
| **Speed** | Unit < 10ms, Integration < 100ms, API < 1s |
| **Isolation** | Each test independent, no shared mutable state |
| **Coverage** | Critical paths and edge cases tested, not chasing 100% line coverage |
| **Clarity** | Test name explains what behavior is being verified |
| **Simplicity** | One logical assertion per test (multiple `assert` OK if testing one concept) |
| **Structure** | Arrange → Act → Assert (AAA pattern) |
| **Determinism** | No flaky tests — mock time, randomness, external systems |

---

## Validation Strategy

1. **Changed symbols first** — run tests for files you changed
2. **Adjacent modules second** — run tests for callers/consumers
3. **Full suite last** — once local confidence is high, run everything

Use the project's test runner with verbose and fail-fast flags. Filter by keyword or path to target specific modules during iterative development.

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [../validate-env.md](../validate-env.md) | Gate orchestration (test gate details) |
| [refactoring-workflow.md](refactoring-workflow.md) | Safe code movement (tests after each move) |
