# API Standards (R3)

Standards for consistent boundary contracts: HTTP routes, request/response models, error envelopes, and documentation.
Referenced from [../patterns.md](../patterns.md).

---

## Requirements

1. **Typed Models**: Every route must define explicit request and response models. No raw `dict` or untyped `JSONResponse` for success cases.

2. **Docstrings**: Every route handler must have a docstring with summary and description.

3. **Tags & Metadata**: Group routes with semantic tags. Provide `summary` / `description` in path operations.

4. **Spec Generation**: After modifying routes, regenerate API documentation (OpenAPI spec, Swagger, or equivalent).

---

## Workflow for New Routes

```
1. Define Request/Response models in the module's models file
2. Implement the route handler using those models
3. Register the router in the app entrypoint with appropriate tags
4. Run spec generation script
5. Verify generated docs match expectations
```

### Example Route

```python
# models.py — typed boundary contracts
@dataclass
class CreateEntityRequest:
    name: str
    entity_type: str
    metadata: dict[str, Any] = field(default_factory=dict)

@dataclass
class EntityResponse:
    id: str
    name: str
    entity_type: str
    status: str
    created_at: str

# routes.py — thin transport layer
@router.post("/entities", response_model=EntityResponse)
def create_entity(
    data: CreateEntityRequest,
    service: EntityService = Depends(get_service),
) -> EntityResponse:
    """Create a new entity for processing.

    Validates input, delegates to service, returns created entity.
    """
    result = service.create(data)
    return EntityResponse(
        id=result.id,
        name=result.name,
        entity_type=result.entity_type,
        status=result.status,
        created_at=result.created_at.isoformat(),
    )
```

---

## Error Envelope

All error responses must follow a consistent structure:

```python
# Standard error response
@dataclass
class ErrorResponse:
    error: str          # Machine-readable error code
    message: str        # Human-readable description
    details: dict = field(default_factory=dict)  # Optional context

# Usage at route boundary
@router.get("/entities/{entity_id}")
def get_entity(entity_id: str, service = Depends(get_service)):
    try:
        return service.get(entity_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
```

---

## Documentation Rules

| Rule | Detail |
|------|--------|
| Document each endpoint intent | What does it do, who calls it |
| Define validation constraints | Required fields, ranges, formats |
| Include success + error examples | Show typical 200, 400, 404, 500 |
| Keep schema docs in sync | Regenerate after every route change |

---

## Change Safety

| Change Type | Requirements |
|-------------|-------------|
| **Additive** (new field, new endpoint) | Must be backward-compatible; new fields optional with defaults |
| **Modification** (rename field, change type) | Requires migration notes + caller updates + NEIGHBOR validation |
| **Removal** (delete field, remove endpoint) | Requires deprecation period, caller audit, explicit approval |

---

## Versioning Strategy

- Prefer additive changes over breaking changes
- When breaking changes are unavoidable:
  1. Document the change in migration notes
  2. Update all known consumers
  3. Run NEIGHBOR validation to check boundary contracts
  4. Consider a version prefix if multiple consumers exist

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [../validate-n.md](../validate-n.md) | Contract compatibility checks (NEIGHBOR) |
| [code-patterns.md](code-patterns.md) | P5 (Transport Route), P6 (Typed Models) |
