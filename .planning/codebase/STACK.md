# Technology Stack

**Analysis Date:** 2026-06-09

## Languages

**Primary:**
- TypeScript — all source files under `src/` (`.ts` and `.tsx`)

**Secondary:**
- TSX (React JSX) — UI components and setup page (`src/setup-page.tsx`, `src/a2a-server-setup-impl.tsx`, `src/components/ui/`)

## Runtime

**Environment:**
- Node.js 24 (specified in `.github/workflows/ci.yml`)

**Package Manager:**
- npm (`.npmrc` present with `auto-install-peers=false`)
- Lockfile: Not detected in repo root (source mirror — lockfile lives in the consuming monorepo)

## Frameworks

**Core:**
- React 19 (`^19.2.3`) — declared as peer dependency; UI rendering for the connector setup page
- Next.js — implied by `import "server-only"`, `redirect` from `"next/navigation"`, and `Metadata` type from `"next"` in `src/a2a-server-setup-impl.tsx`

**Testing:**
- Vitest — test runner (`"test": "vitest"` in `package.json`); no test files detected in repo (tests may live in the consuming monorepo)

**Build/Dev:**
- TypeScript compiler — `tsconfig.json` configured for `ESNext` module output to `dist/`
- No standalone bundler detected; bundling handled by consuming monorepo

## Key Dependencies

**Critical:**
- `@cinatra-ai/sdk-extensions` (`*`) — provides `HostRequiredPackageDefinition`, `ExtensionHostContext`, `requireExtensionAction`, `requireA2AConnectionProvider`; optional peer dep
- `@cinatra-ai/sdk-ui` (`*`) — provides `Main`, `PageHeader`, `PageContent`, `StatusPill` from `@cinatra-ai/sdk-ui/marketplace`; optional peer dep

**Infrastructure:**
- `class-variance-authority` (`^0.7.1`) — variant-based component styling (`src/components/ui/`)
- `clsx` (`^2.1.1`) — conditional className utility (`src/lib/utils.ts`)
- `tailwind-merge` (`^3.5.0`) — merges Tailwind classes without conflicts (`src/lib/utils.ts`)
- `radix-ui` (`^1.4.3`) — headless UI primitives for component building
- `lucide-react` — icons (e.g. `LinkIcon` in `src/a2a-server-setup-impl.tsx`); not listed in package.json, consumed as peer

## Configuration

**TypeScript (`tsconfig.json`):**
- Target: `ES2023`
- Module: `ESNext`, resolution: `bundler`
- JSX: `react-jsx`
- Strict mode enabled; `noImplicitAny` relaxed to `false`
- `isolatedModules: true`, `verbatimModuleSyntax: true`
- Output: `dist/`, source maps and declaration maps enabled

**Package Shape (`package.json` `cinatra` field):**
- `apiVersion: "cinatra.ai/v1"`, `kind: "connector"`
- `requestedHostPorts: ["nango"]` — declares dependency on the Nango integration port
- Entry: `src/index.ts` (types and main point to source, not dist — consumed in-monorepo)

**npm (`·npmrc`):**
- `auto-install-peers=false`

**Environment:**
- `CINATRA_A2A_DEV_PEER_URLS` — env var referenced in UI copy for automatic dev-startup connection (set in `.env.local`)
- `.env.local` existence implied; never read

## Platform Requirements

**Development:**
- Node.js 24+
- Consumed as a workspace package inside the Cinatra monorepo; not independently installable (first-party `@cinatra-ai/*` peers are not published to any registry)

**Production:**
- Deployed as part of the Cinatra host application (Next.js server); connector setup page rendered server-side

---

*Stack analysis: 2026-06-09*
