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

1. Define Request and Response **typed models** in the module's models file — every field has a declared type and sensible defaults for optional fields
2. Implement the route handler: parse input into the request model, resolve the service via dependency injection, call the service, and return the response model
3. Register the router in the app entrypoint with appropriate semantic tags
4. Run the spec generation script (OpenAPI, Swagger, or equivalent)
5. Verify generated docs match expectations

### Route Handler Structure

A route handler is a thin transport function. It declares the HTTP method and path, accepts a typed request model as input, resolves the service through the framework's dependency injection mechanism, delegates the business operation to the service, and returns a typed response model. The handler contains no business logic, conditionals, or data transformations beyond serialization.

---

## Error Envelope

All error responses must follow a consistent structure with three fields:

- **error**: a machine-readable error code (string)
- **message**: a human-readable description (string)
- **details**: optional context dictionary for debugging

At the route boundary, catch domain-specific exceptions (NotFoundError, ValidationError) and translate them to the appropriate HTTP status code plus an error envelope. Let unexpected exceptions propagate to a global handler that returns a generic 500-level response.

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
