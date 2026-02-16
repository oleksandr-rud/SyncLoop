# Testing Guide (R2)

Comprehensive testing patterns for safe iteration and regression prevention.
Referenced from [../patterns.md](../patterns.md).

---

## Test Organization

```
tests/
├── conftest.py          # Shared fixtures, global setup
├── factories.py         # Test data builders
├── mocks.py             # Mock implementations for external deps
├── api/                 # API/endpoint tests (HTTP client)
├── integration/         # Multi-component workflow tests
└── unit/                # Pure logic tests (no I/O)
```

---

## Pattern 1: Fixture-Based Setup

```python
# Environment isolation — reset global state each test
@pytest.fixture(autouse=True)
def reset_context():
    """Reset global state before each test."""
    import app.context
    app.context._context = None
    yield
    app.context._context = None

# Test app configuration
@pytest.fixture
def test_app(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    """Configure app with test-safe environment."""
    monkeypatch.setenv("APP_ENV", "testing")
    monkeypatch.setenv("ENABLE_BACKGROUND_TASKS", "0")
    yield create_app()

# API client for endpoint tests
@pytest.fixture
def client(test_app):
    return TestClient(test_app)
```

---

## Pattern 2: Factory Pattern for Test Data

```python
class EntityFactory:
    @staticmethod
    def create(
        id: str | None = None,
        name: str = "Test Entity",
        entity_type: str = "default",
        **extras: Any,
    ) -> dict[str, Any]:
        return {
            "id": id or str(uuid4()),
            "name": name,
            "metadata": {"type": entity_type, **extras},
        }

    @staticmethod
    def with_full_analysis() -> dict[str, Any]:
        """Semantic constructor for entity with all analysis fields populated."""
        return EntityFactory.create(
            name="Fully Analyzed Entity",
            entity_type="analyzed",
            score=85.0,
            grade="B",
        )
```

---

## Pattern 3: Mock External Dependencies

```python
class MockExternalService:
    """Mock for any external service boundary (LLM, API, storage)."""
    def __init__(self, response: dict | str | None = None):
        self.response = response or self._default_response()
        self.calls: list[dict] = []

    async def __call__(self, prompt: str, context: str, **kwargs):
        self.calls.append({"prompt": prompt, "context": context})
        return json.dumps(self.response), {}

    @property
    def call_count(self) -> int:
        return len(self.calls)
```

Usage:
```python
@pytest.fixture
def mock_service() -> MockExternalService:
    return MockExternalService(response={"score": 85})

def test_analysis_delegates_to_service(mock_service):
    service = AnalysisService(external=mock_service)
    result = service.analyze(...)
    assert mock_service.call_count == 1
```

---

## Pattern 4: Class-Based Test Organization

```python
class TestParseResponse:
    def test_valid_json_response(self):
        response = '{"entity_type": "analyzed", "score": 85}'
        result = parse_response(response)
        assert result.entity_type == EntityType.ANALYZED

    def test_invalid_json_fallback(self):
        result = parse_response("Not JSON")
        assert result.entity_type == EntityType.UNKNOWN

    def test_missing_fields_use_defaults(self):
        result = parse_response('{"entity_type": "analyzed"}')
        assert result.score == 0.0
```

---

## Pattern 5: Parametrized Tests

```python
@pytest.mark.parametrize("score,expected_grade", [
    (95, "A"), (90, "A"),
    (89.9, "B"), (85, "B"), (80, "B"),
    (79, "C"), (70, "C"),
    (69, "D"), (60, "D"),
    (59, "F"), (0, "F"),
])
def test_grade_thresholds(score: float, expected_grade: str):
    assert compute_grade(score) == expected_grade
```

---

## Pattern 6: Three-Layer Test Strategy

```python
# UNIT: Pure logic, no I/O
def test_parse_response():
    result = parse_response('{"entity_type": "analyzed"}')
    assert result.entity_type == EntityType.ANALYZED

# INTEGRATION: Multiple components, mocked external I/O
def test_analysis_pipeline(mock_service, mock_repository):
    service = AnalysisService(external=mock_service, repo=mock_repository)
    report = service.analyze(entities=[...])
    assert report.aggregate_score > 0

# API: HTTP endpoint, full stack with test client
def test_analyze_endpoint(client, mock_data):
    response = client.post("/api/v1/analyze", json=mock_data)
    assert response.status_code == 200
    assert "score" in response.json()
```

---

## Pattern 7: Assertion Patterns

```python
# ✅ Specific property checks
assert report.task_id == "task-1"
assert len(report.metrics) > 0
assert "total_items" in [m.name for m in report.metrics]

# ✅ Range/constraint checks
assert 0 <= result.score <= 100
assert result.entity_type in EntityType

# ✅ Collection checks
assert all(m.value >= 0 for m in report.metrics)
assert any(r.entity_type == "analyzed" for r in results)

# ❌ Vague — what is being verified?
assert report
assert result is not None
```

---

## Pattern 8: Naming Convention

Format: `test_<action>_<condition>_<outcome>`

```
test_returns_report                      # Basic happy path
test_metrics_computed_correctly          # Specific behavior
test_unknown_type_falls_back_to_default  # Edge case
test_invalid_json_fallback               # Error handling
test_missing_fields_use_defaults         # Default behavior
test_empty_input_returns_empty_report    # Boundary condition
```

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

```bash
# Targeted
pytest tests/unit/test_processor.py -x -v

# Adjacent
pytest tests/unit/ tests/integration/ -x -v -k "processor or analysis"

# Full suite
pytest tests/ -x -v
```

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [../validate-env.md](../validate-env.md) | Gate orchestration (test gate details) |
| [refactoring-workflow.md](refactoring-workflow.md) | Safe code movement (tests after each move) |
