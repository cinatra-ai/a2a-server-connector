# Testing Patterns

**Analysis Date:** 2026-06-09

## Test Framework

**Runner:**
- Vitest (version not pinned in `package.json` — resolved by the host monorepo)
- Config: No `vitest.config.*` file detected in the repo root; configuration is inherited from the monorepo workspace when tests run inside it
- Script: `"test": "vitest"` declared in `package.json`

**Assertion Library:**
- Vitest built-in (`expect`) — no separate assertion library detected

**Run Commands:**
```bash
pnpm test          # Run all tests (via vitest)
```

## Test File Organization

**Location:**
- No test files (`.test.ts`, `.test.tsx`, `.spec.ts`, `.spec.tsx`) currently exist in this repository

**Naming:**
- Not applicable — no tests written yet

**Structure:**
- Not applicable

## Test Structure

**Suite Organization:**
- Not applicable — no tests present

**Patterns:**
- Not detected

## Mocking

**Framework:** Not detected — no tests present to establish mocking patterns

**Patterns:**
- Not detected

**What to Mock:**
- Server actions call `requireExtensionAction`, `requireA2AConnectionProvider`, and `fetch` — these would need mocking in any future integration tests

**What NOT to Mock:**
- Pure utility functions in `src/lib/utils.ts` (`cn`, `slugify`, `normalizeBaseUrl`, `connectionIdFromNormalized`) require no mocking and are suitable for direct unit testing

## Fixtures and Factories

**Test Data:**
- Not applicable — no tests present

**Location:**
- Not established

## Coverage

**Requirements:** Not enforced — no coverage configuration detected

**View Coverage:**
```bash
pnpm test --coverage    # Would require @vitest/coverage-v8 or similar
```

## Test Types

**Unit Tests:**
- None present; the pure utility functions in `src/lib/utils.ts` are the highest-priority candidates for unit testing:
  - `normalizeBaseUrl` — validates and normalises URL strings
  - `connectionIdFromNormalized` — derives a slug from a URL
  - `slugify` — general string slugification
  - `cn` — class merging utility

**Integration Tests:**
- None present; the server actions (`addA2AConnectionAction`, `removeA2AConnectionAction` in `src/a2a-server-setup-impl.tsx`) are the primary integration test targets but require the monorepo environment to resolve `@cinatra-ai/sdk-extensions`

**E2E Tests:**
- Not used in this repository

## CI Behaviour

The CI pipeline (`.github/workflows/ci.yml`) classifies this repo as a **source mirror** because it declares host-internal `@cinatra-ai/*` optional peers. As a result:

- Install, typecheck, and `pnpm test` steps are **skipped** in standalone CI
- Tests are run exclusively inside the cinatra monorepo, which provides the `@cinatra-ai/sdk-extensions` and `@cinatra-ai/sdk-ui` peer dependencies needed for imports to resolve
- The CI step reads: _"Skipping standalone tests (host-internal @cinatra-ai/* peers — the cinatra monorepo runs these)."_

This means the `vitest` configuration, coverage thresholds, and test execution environment are all owned by the monorepo, not this extracted repo.

## Common Patterns

**Async Testing:**
- Not established — would follow Vitest async/await patterns given the server action style

**Error Testing:**
- Not established — `normalizeBaseUrl` returning `null` for invalid input is the clearest existing unit-testable error path

---

*Testing analysis: 2026-06-09*
