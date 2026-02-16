---
name: "SyncLoop: Code Patterns"
description: "P1-P11 implementation patterns"
applyTo: "{src,app,lib}/**/*.{ts,py,js,jsx,tsx}"
---

# Code Patterns (P1–P11)

Reusable implementation patterns for layered application code.
Referenced from [../patterns.md](patterns.instructions.md).

---

## P1 · Port/Adapter

Abstracts infrastructure behind protocol interfaces. Decouples domain logic from external systems.

```python
# Port (interface/protocol)
class StoragePort(Protocol):
    def search(
        self,
        collection: str,
        query: str,
        *,
        filters: dict | None = None,
        limit: int = 10,
    ) -> list[Record]: ...

# Adapter (concrete implementation)
class DatabaseAdapter:
    def __init__(self, client: DBClient) -> None:
        self._client = client

    def search(
        self,
        collection: str,
        query: str,
        *,
        filters: dict | None = None,
        limit: int = 10,
    ) -> list[Record]:
        # Implementation against real infrastructure
        ...
```

**Key rules:**
- Port lives in `libs/{component}/port.*`
- Adapter lives in `libs/{component}/{impl}.*`
- Services depend on port interfaces, not adapters directly

---

## P2 · Domain Module

Each domain module follows a consistent multi-file layout:

| File | Purpose |
|------|---------|
| `models.*` | Domain entities and value objects |
| `services.*` | Business logic and orchestration |
| `routes.*` | Transport endpoints |
| `tasks.*` | Background tasks (if async processing needed) |

```python
# services.py — business logic only, no transport concerns
class OrderService:
    def __init__(self, repository: OrderRepository) -> None:
        self._repository = repository

    def process(self, *, order_id: str) -> ProcessResult:
        order = self._repository.get(order_id)
        # business logic here
        return ProcessResult(order_id=order.id, status="completed")
```

---

## P3 · Background Task Boundary

Task handlers stay thin. Business logic always lives in services.

```python
# tasks.py — thin wrapper, delegates to service
def process_order_task(runtime: TaskRuntime, order_id: str):
    """Background task that delegates to service."""
    service = runtime.order_service
    service.update_status(order_id, status="processing")

    try:
        service.process(order_id=order_id)
        service.update_status(order_id, status="completed")
    except Exception as exc:
        service.update_status(order_id, status="failed", error=str(exc))
        raise
```

**Key rules:**
- Tasks never contain business logic
- Dependencies injected via runtime, not imported directly
- Always update status on success and failure

---

## P4 · App Context / Composition Root

Centralized dependency wiring, initialized once at startup:

```python
@dataclass
class AppContext:
    config: Config
    session_factory: SessionFactory
    services: ServiceRegistry
    logger: Logger

_context: AppContext | None = None

def init_app_context(config: Config) -> AppContext:
    global _context
    if _context:
        return _context
    _context = AppContext(config=config, ...)
    return _context

def get_app_context() -> AppContext:
    if _context is None:
        return init_app_context(load_config())
    return _context
```

---

## P5 · Transport Route

Routes only handle transport concerns; all logic delegated to services:

```python
router = APIRouter()

def get_service() -> OrderService:
    ctx = get_app_context()
    return OrderService(ctx.repository)

@router.post("/orders")
def create_order(
    data: CreateOrderRequest,
    service: OrderService = Depends(get_service),
) -> OrderResponse:
    result = service.create(data)
    return OrderResponse(id=result.id, status=result.status)
```

---

## P6 · Typed Models

Domain entities with explicit types and serialization:

```python
@dataclass(slots=True)
class OrderItem:
    product_id: str
    quantity: int
    unit_price: float
    tags: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "product_id": self.product_id,
            "quantity": self.quantity,
            "unit_price": self.unit_price,
            "tags": self.tags,
        }
```

---

## P7 · Collection/Enum Safety

Replace magic strings with typed enums:

```python
class Collection(str, Enum):
    ORDERS = "orders"
    PRODUCTS = "products"
    USERS = "users"

# Usage: repository.query(Collection.ORDERS, ...)
# NOT: repository.query("orders", ...)
```

---

## P8 · Error Handling

Layered exception hierarchy with boundary translation:

```python
# Domain exceptions
class DomainError(Exception):
    """Base error for domain."""

class NotFoundError(DomainError):
    """Resource not found."""

class ValidationError(DomainError):
    """Invalid input or state."""

# Route-level translation
@router.get("/orders/{order_id}")
def get_order(order_id: str, service = Depends(get_service)):
    try:
        return service.get(order_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
```

---

## P9 · Type Hints Everywhere

All code must have complete type annotations:

```python
# ✅ Good — fully typed
def process(
    order_id: str,
    *,
    callback: Callable[..., Awaitable[Response]] | None = None,
) -> tuple[str, dict[str, Any]] | None:
    ...

# ❌ Bad — missing annotations
def process(order_id, callback=None):
    ...
```

**Common type aliases:**
```python
SessionFactory = Callable[[], Session]
Filters = Mapping[str, Any]
```

---

## P10 · Service Orchestration

Services accept all dependencies via constructor — no hidden state:

```python
# Production code
class AnalysisService:
    def __init__(
        self,
        repository: Repository,
        evaluator: EvaluationService,
    ):
        self._repository = repository
        self._evaluator = evaluator

# Test code — inject mocks
service = AnalysisService(
    repository=mock_repository,
    evaluator=mock_evaluator,
)
```

---

## P11 · Config Isolation

Centralized, environment-based configuration with startup validation:

```python
@dataclass
class Config:
    database_url: str
    debug: bool = False
    max_workers: int = 4

    @classmethod
    def from_env(cls) -> "Config":
        return cls(
            database_url=os.environ["DATABASE_URL"],
            debug=os.environ.get("DEBUG", "0") == "1",
            max_workers=int(os.environ.get("MAX_WORKERS", "4")),
        )
```

**Key rules:**
- All config read from environment at startup
- No scattered `os.environ` calls inside business logic
- Test config overrides controlled via fixtures

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [../patterns.md](patterns.instructions.md) | Pattern routing index |
| [refactoring-workflow.md](refactoring-workflow.instructions.md) | Safe structural changes |
| [testing-guide.md](testing-guide.instructions.md) | Verification strategy |
