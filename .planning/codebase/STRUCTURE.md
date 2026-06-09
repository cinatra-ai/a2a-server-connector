# Codebase Structure

**Analysis Date:** 2026-06-09

## Directory Layout

```
a2a-server-connector/
├── src/
│   ├── index.ts                    # Package public API — connector descriptor export
│   ├── setup-page.tsx              # Default-exported RSC for host router mounting
│   ├── a2a-server-setup-impl.tsx   # Core implementation: form, server actions, connection list
│   ├── components/
│   │   └── ui/                     # Local Tailwind/CVA UI primitives
│   │       ├── alert.tsx
│   │       ├── button.tsx
│   │       ├── field.tsx
│   │       ├── input-group.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── separator.tsx
│   │       └── textarea.tsx
│   └── lib/
│       └── utils.ts                # cn(), slugify(), and other shared helpers
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── package.json                    # Package manifest + Cinatra connector metadata
├── tsconfig.json                   # Standalone (non-monorepo) TypeScript config
├── .npmrc                          # npm registry config
└── LICENSE                         # Apache-2.0
```

## Directory Purposes

**`src/`:**
- Purpose: All TypeScript/TSX source; the `rootDir` for TypeScript compilation
- Contains: Entry point, RSC pages, UI components, utilities
- Key files: `src/index.ts`, `src/setup-page.tsx`, `src/a2a-server-setup-impl.tsx`

**`src/components/ui/`:**
- Purpose: Self-contained Tailwind/CVA design-system primitives bundled with the package
- Contains: One file per component; no barrel/index file — import each directly
- Key files: `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/field.tsx`

**`src/lib/`:**
- Purpose: Pure utility functions shared across the package
- Contains: `utils.ts` only
- Key files: `src/lib/utils.ts`

**`.github/workflows/`:**
- Purpose: CI and release automation
- Contains: `ci.yml` (test/lint), `release.yml` (publish)

## Key File Locations

**Entry Points:**
- `src/index.ts`: Named export `a2aServerConnectorPackage` — the only public API consumed by the host app
- `src/setup-page.tsx`: Default export for Next.js file-system routing; mounted by host at `/connectors/cinatra-ai/a2a-server-connector/setup`

**Configuration:**
- `package.json`: Package identity, Cinatra connector manifest (`"cinatra"` key), peer dependencies
- `tsconfig.json`: Standalone TypeScript config targeting ES2023, `jsx: react-jsx`, output to `dist/`
- `.npmrc`: npm registry/auth settings (do not read — may contain tokens)

**Core Logic:**
- `src/a2a-server-setup-impl.tsx`: All real implementation — `addA2AConnectionAction`, `removeA2AConnectionAction`, `A2AServerConnectorPageImpl`, URL normalization helpers

**Utilities:**
- `src/lib/utils.ts`: `cn()` (className merging), `slugify()`, and miscellaneous helpers

## Naming Conventions

**Files:**
- Kebab-case for all source files: `a2a-server-setup-impl.tsx`, `input-group.tsx`, `setup-page.tsx`
- Suffix `-impl` for the concrete implementation separated from the thin routing wrapper

**Directories:**
- Lowercase, single-purpose: `components/`, `ui/`, `lib/`

**Exported symbols:**
- React components: PascalCase (`A2AServerConnectorPageImpl`, `Button`, `InputGroup`)
- Constants/objects: camelCase (`a2aServerConnectorPackage`, `buttonVariants`)
- Pure functions: camelCase (`normalizeBaseUrl`, `connectionIdFromNormalized`, `cn`, `slugify`)
- Server actions: camelCase, verb-first (`addA2AConnectionAction`, `removeA2AConnectionAction`)

## Where to Add New Code

**New connector server action:**
- Add inside `src/a2a-server-setup-impl.tsx` alongside existing server actions; declare `"use server"` at the top of the function; gate with `requireExtensionAction`

**New form section or UI section:**
- Extend `A2AServerConnectorPageImpl` in `src/a2a-server-setup-impl.tsx`; import additional UI primitives from `src/components/ui/`

**New UI primitive:**
- Create `src/components/ui/<component-name>.tsx` following the CVA + `cn()` pattern in `src/components/ui/button.tsx`; import directly where needed (no barrel file)

**New utility function:**
- Add to `src/lib/utils.ts` if genuinely shared; inline in the consuming file if used only once

**New public package export:**
- Add named export to `src/index.ts`; keep the file minimal (only connector descriptor and types meant for host-app consumption)

## Special Directories

**`dist/`:**
- Purpose: TypeScript compilation output (`outDir` in `tsconfig.json`)
- Generated: Yes
- Committed: No (assumed gitignored; not present in repo tree)

**`.planning/codebase/`:**
- Purpose: GSD codebase analysis documents
- Generated: Yes (by gsd-map-codebase)
- Committed: Per project convention

---

*Structure analysis: 2026-06-09*
