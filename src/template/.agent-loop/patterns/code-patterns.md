# Code Patterns (P1–P11)

Reusable implementation patterns for layered application code.
Referenced from [../patterns.md](../patterns.md).

---

## P1 · Port/Adapter

Abstracts infrastructure behind protocol interfaces. Decouples domain logic from external systems.

Define a **Port** as an interface (or protocol/trait) that declares the operations a service needs — method names, parameter types, and return types — without any implementation details. The Port belongs to the domain layer and knows nothing about databases, HTTP, or file systems.

Create an **Adapter** as a concrete class that implements the Port interface. Each adapter encapsulates the specifics of one external system (a database client, an HTTP API, a message queue). Multiple adapters can satisfy the same port.

Services receive the port interface via constructor injection, never the adapter directly.

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

The **models** file defines data structures (classes, structs, or types) representing the core domain — entities with identity, value objects without identity, and any associated enums or constants.

The **services** file contains business logic: methods that operate on models, enforce invariants, and coordinate between ports. Services never reference transport or serialization concerns.

The **routes** file is the transport boundary — HTTP handlers, CLI entry points, or message consumers. Routes parse input, delegate to a service, and format the response. No business logic lives here.

---

## P3 · Background Task Boundary

Task handlers stay thin. Business logic always lives in services.

A task handler is a function or method invoked by a job queue or scheduler. It receives a runtime context (containing pre-wired service instances) and the task payload. The handler calls the appropriate service method, updates task status on success and failure, and re-raises exceptions for the queue's retry mechanism.

**Key rules:**
- Tasks never contain business logic
- Dependencies injected via runtime context, not imported directly
- Always update status on both success and failure paths

---

## P4 · App Context / Composition Root

Centralized dependency wiring, initialized once at startup.

Define an **AppContext** as a container (class or struct) holding all application-wide dependencies: configuration, database session factories, service registries, and loggers. A factory function creates the context once during startup, caching it as a module-level singleton. All subsequent access goes through a getter that returns the cached instance. This ensures consistent wiring and makes the full dependency graph visible in one place.

---

## P5 · Transport Route

Routes only handle transport concerns; all logic delegated to services.

A route handler performs three steps: (1) parse and validate the incoming request into a typed model, (2) resolve the appropriate service instance via dependency injection, and (3) call the service method and map the result to a typed response model. The handler never contains conditionals, loops, or data transformations beyond serialization.

---

## P6 · Typed Models

Domain entities with explicit types and serialization.

Every data structure that crosses a boundary (API request, API response, database row, message payload) must be a typed model — a class, struct, or schema with named fields and declared types. Each model provides a serialization method (to dictionary, JSON, or equivalent) for transport. Use slot-based or frozen classes where the language supports them to prevent accidental mutation.

---

## P7 · Collection/Enum Safety

Replace magic strings with typed enums.

Define an enum (or string enum / literal union) for any fixed set of values: collection names, status codes, category labels, entity types. All code references the enum member, never a raw string. This centralizes valid values in one declaration and makes invalid states unrepresentable.

---

## P8 · Error Handling

Layered exception hierarchy with boundary translation.

Define a base domain exception class. Derive specific exceptions from it: `NotFoundError`, `ValidationError`, `ConflictError`, etc. Business logic raises domain exceptions only. At the transport boundary (route handler), catch domain exceptions and translate them to the appropriate HTTP status codes or error responses. Internal implementation errors (unexpected crashes) propagate to a global handler that returns a generic 500-level response.

---

## P9 · Type Hints Everywhere

All code must have complete type annotations.

Every function signature declares parameter types and return type. Use union types for nullable values. Use generic types for collections. Define type aliases for complex or repeated signatures (e.g., a factory callable, a filter mapping). Avoid `any` / untyped containers. The type checker must pass with zero errors on every commit.

---

## P10 · Service Orchestration

Services accept all dependencies via constructor — no hidden state.

A service class receives every collaborator (repositories, other services, external clients) through its constructor. The constructor stores them as private fields. No service creates its own dependencies internally. This makes the dependency graph explicit and enables test doubles to be injected without patching or monkey-patching.

---

## P11 · Config Isolation

Centralized, environment-based configuration with startup validation.

Define a configuration class with typed fields and default values. A class method reads all values from environment variables at startup, parsing them into the correct types. If a required variable is missing, startup fails immediately with a clear error. No other code reads environment variables directly — all access goes through the configuration instance.

**Key rules:**
- All config read from environment at startup
- No scattered environment variable calls inside business logic
- Test config overrides controlled via fixtures

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [../patterns.md](../patterns.md) | Pattern routing index |
| [refactoring-workflow.md](refactoring-workflow.md) | Safe structural changes |
| [testing-guide.md](testing-guide.md) | Verification strategy |
