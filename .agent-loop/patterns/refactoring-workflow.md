# Refactoring Workflow (R1)

Checklist and approach for moving files, changing imports, or restructuring modules.
Referenced from [../patterns.md](../patterns.md).

---

## Refactoring Checklist

```
Phase 1: PLAN
  ☐ Identify all files to move/rename/extract
  ☐ Map old imports → new imports
  ☐ Check for documentation references (README, docstrings, agent-loop specs)
  ☐ Identify public interfaces that must remain stable

Phase 2: EXECUTE
  ☐ Move files
  ☐ Update imports in moved files (internal references)
  ☐ Update all caller imports (use grep to find every reference)
  ☐ Update documentation examples if they contain import paths
  ☐ Update .agent-loop/patterns.md structure section if layout changed

Phase 3: VALIDATE (NON-NEGOTIABLE)
  ☐ 1. Type check: run project type checker
  ☐ 2. Run tests: execute test suite with fail-fast
  ☐ 3. Check docs: grep for old import paths across all files
  ☐ 4. Verify no orphaned imports (unused or broken)

Phase 4: DOCUMENT
  ☐ Update README structure section
  ☐ Update architecture docs if needed
  ☐ Create report in docs/reports/ if the refactor is major
```

---

## Example: Moving a Module File

```bash
# 1. Move file
mv src/modules/old_location/processor.py src/modules/new_location/processor.py

# 2. Update imports inside the moved file (internal references)
# e.g., relative imports that changed due to new directory depth

# 3. Find ALL references to the old path
grep -r "from src.modules.old_location.processor" .
grep -r "import old_location.processor" .

# 4. Update each reference found:
#    - tests/unit/test_processor.py
#    - src/modules/new_location/tasks.py
#    - docs/architecture.md (if it mentions import paths)

# 5. MANDATORY: Run validation
# Type check → Tests → Grep for leftover old paths
```

**Why tests after docs?** Documentation often contains import examples. Tests verify imports actually work and catch typos in updated paths.

---

## Example: Extracting a Function to a New Module

```bash
# 1. Create the new module
touch src/libs/parsing/helpers.py

# 2. Move the function definition to the new file
# Update its internal imports

# 3. In the original file, replace the function body with an import:
#    from src.libs.parsing.helpers import parse_response

# 4. Find all OTHER callers of the original location
grep -r "from src.modules.analysis.utils import parse_response" .

# 5. Update all callers to use the new import path

# 6. VALIDATE: type check + tests + grep for old path
```

---

## Guardrails

- **Prefer reversible steps** — move one file at a time, validate, then move next
- **Never combine unrelated refactors** — one logical change per commit
- **Do not hide breaking API changes** — if a public interface moved, update all consumers
- **Never skip Phase 3** — validation is non-negotiable, even for "simple" moves
- **Grep is your friend** — always search for the old path after moving; IDEs miss things

---

## Common Pitfalls

| Pitfall | Prevention |
|---------|------------|
| Circular imports after move | Map dependency graph before moving |
| Tests pass but type checker fails | Always run type checker first |
| Docs reference old paths | Grep docs/ and *.md files explicitly |
| Forgot to update __init__.py re-exports | Check all `__init__.py` files in affected packages |
| Moved too many files at once | Move one file → validate → repeat |

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [../validate-env.md](../validate-env.md) | Stage 1 gates (type check, tests) |
| [../validate-n.md](../validate-n.md) | Stage 2 neighbor checks (boundary impact) |
| [testing-guide.md](testing-guide.md) | Regression test strategy |
