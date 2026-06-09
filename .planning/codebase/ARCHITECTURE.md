<!-- refreshed: 2026-06-09 -->
# Architecture

**Analysis Date:** 2026-06-09

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                  Cinatra Host Application                    │
│         (Next.js app that mounts connector pages)            │
└──────────────────────────┬──────────────────────────────────┘
                           │ dispatches to
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              A2AServerConnectorSetupPage                     │
│              `src/setup-page.tsx`                            │
│  (thin async RSC wrapper — default export for host routing)  │
└──────────────────────────┬──────────────────────────────────┘
                           │ delegates to
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              A2AServerConnectorPageImpl                      │
│              `src/a2a-server-setup-impl.tsx`                 │
│  Form rendering + Server Actions (add / remove connections)  │
└──────────┬───────────────────────────┬───────────────────────┘
           │ reads/writes via          │ fetches agent card from
           ▼                           ▼
┌──────────────────────┐   ┌──────────────────────────────────┐
│  ExtensionHostContext │   │  External A2A server             │
│  (Nango + agent      │   │  `/.well-known/agent.json`       │
│   template storage)  │   │  `/.well-known/agent-card.json`  │
│  @cinatra-ai/sdk-ext │   └──────────────────────────────────┘
└──────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Package definition | Declares connector identity and settings href for the host app | `src/index.ts` |
| Setup page (wrapper) | Default-exported RSC; thin delegation to impl | `src/setup-page.tsx` |
| Setup page (impl) | Form UI, server actions, connection list rendering | `src/a2a-server-setup-impl.tsx` |
| UI primitives | Tailwind/CVA-based design-system components (Button, Input, Field, Alert, etc.) | `src/components/ui/` |
| Utilities | `cn()` class merging, `slugify`, pagination helpers | `src/lib/utils.ts` |

## Pattern Overview

**Overall:** Cinatra Connector Extension — a self-contained React Server Components package that is mounted by a host Next.js application at a well-known route (`/connectors/cinatra-ai/a2a-server-connector/setup`).

**Key Characteristics:**
- All data mutations are Next.js Server Actions (`"use server"`) inside `src/a2a-server-setup-impl.tsx`
- The package exports one named object (`a2aServerConnectorPackage`) that the host app uses for connector registration; actual page rendering is via a default-exported async component
- No client components — the entire setup page is server-rendered (RSC only; `import "server-only"` enforced)
- UI components delegate className composition to `class-variance-authority` + `tailwind-merge`

## Layers

**Package definition layer:**
- Purpose: Expose connector metadata to the Cinatra host application
- Location: `src/index.ts`
- Contains: `HostRequiredPackageDefinition` constant
- Depends on: `@cinatra-ai/sdk-extensions` types
- Used by: Host app connector registry

**Setup page layer:**
- Purpose: Provide the route-mounted RSC for the host's file-system router
- Location: `src/setup-page.tsx`
- Contains: Single async default export that resolves `searchParams` and delegates to the impl
- Depends on: `src/a2a-server-setup-impl.tsx`, `@cinatra-ai/sdk-extensions`
- Used by: Host Next.js routing

**Implementation layer:**
- Purpose: All real logic — form rendering, server action handlers, connection list
- Location: `src/a2a-server-setup-impl.tsx`
- Contains: `addA2AConnectionAction`, `removeA2AConnectionAction`, `A2AServerConnectorPageImpl`, URL normalization helpers
- Depends on: `@cinatra-ai/sdk-extensions` (`requireExtensionAction`, `requireA2AConnectionProvider`), `@cinatra-ai/sdk-ui/marketplace`, UI components in `src/components/ui/`
- Used by: `src/setup-page.tsx`

**UI component layer:**
- Purpose: Reusable design-system primitives scoped to this package
- Location: `src/components/ui/`
- Contains: `alert.tsx`, `button.tsx`, `field.tsx`, `input-group.tsx`, `input.tsx`, `label.tsx`, `separator.tsx`, `textarea.tsx`
- Depends on: `class-variance-authority`, `clsx`, `tailwind-merge`, `radix-ui`, `src/lib/utils.ts`
- Used by: `src/a2a-server-setup-impl.tsx`

**Utility layer:**
- Purpose: Shared pure helpers
- Location: `src/lib/utils.ts`
- Contains: `cn`, `slugify`, `formatCurrencyMillions`, `firstName`, `quarterLabel`, `asArray`, `compareValues`, `getPageNumbers`
- Depends on: `clsx`, `tailwind-merge`
- Used by: All UI components and implementation layer

## Data Flow

### Add A2A Connection

1. User submits form in `A2AServerConnectorPageImpl` (`src/a2a-server-setup-impl.tsx:182`)
2. `addA2AConnectionAction` (server action) validates permission via `requireExtensionAction` (`src/a2a-server-setup-impl.tsx:47`)
3. URL is normalized via `normalizeBaseUrl`; `connectionId` derived via `connectionIdFromNormalized`
4. If bearer token provided: `a2a.importConnection()` (Nango credential store); falls back to `a2a.saveConnectionRecord()` for dev environments
5. Agent card fetched from `{baseUrl}/.well-known/agent.json` or `/.well-known/agent-card.json`
6. `a2a.upsertExternalAgentTemplate()` creates/updates agent template in host storage
7. `redirect()` to setup page with `?added=1` query param

### Remove A2A Connection

1. User submits remove form; `removeA2AConnectionAction` fires (`src/a2a-server-setup-impl.tsx:129`)
2. Permission check via `requireExtensionAction`
3. Parallel calls: `a2a.removeConnectionRecord("a2aServer", connectionId)` + `a2a.deleteExternalAgentTemplatesByConnectorSlug(connectionId)`
4. `redirect()` to setup page with `?removed=1`

### Page Load

1. Host mounts `A2AServerConnectorSetupPage` (default export from `src/setup-page.tsx`)
2. Delegates to `A2AServerConnectorPageImpl` with resolved `searchParams`
3. `props.ctx.nango.listConnectionRecords("a2aServer")` fetches current connections
4. RSC renders form + optional alert (success/error) + connection list

**State Management:**
- No client-side state. All state is URL query params (`?added=1`, `?removed=1`, `?error=invalid-url`) read on next RSC render after `redirect()`. Connections list is fetched fresh on each render from `ExtensionHostContext.nango`.

## Key Abstractions

**`HostRequiredPackageDefinition`:**
- Purpose: Typed descriptor the Cinatra host uses to register this connector and construct the settings link
- Examples: `src/index.ts` (exports `a2aServerConnectorPackage`)
- Pattern: Plain object literal with known fields (`packageId`, `name`, `slug`, `description`, `settingsHref`)

**`ExtensionHostContext`:**
- Purpose: Injected host context providing Nango connection storage and agent template APIs; never constructed by this package
- Examples: Used in `src/setup-page.tsx` and `src/a2a-server-setup-impl.tsx`
- Pattern: Passed as `ctx` prop; methods accessed as `ctx.nango.*` and via `requireA2AConnectionProvider()`

**CVA component variants:**
- Purpose: Type-safe, composable Tailwind variant definitions for UI primitives
- Examples: `src/components/ui/button.tsx` (`buttonVariants`)
- Pattern: `cva(base, { variants, defaultVariants })` + `cn()` for merging additional classNames

## Entry Points

**Package API:**
- Location: `src/index.ts`
- Triggers: Imported by host app connector registry at build/load time
- Responsibilities: Exports `a2aServerConnectorPackage` descriptor

**Setup route:**
- Location: `src/setup-page.tsx` (default export)
- Triggers: Host Next.js router mounts at `/connectors/cinatra-ai/a2a-server-connector/setup`
- Responsibilities: Resolves props, delegates rendering and all mutations to `A2AServerConnectorPageImpl`

## Architectural Constraints

- **Threading:** Single-threaded Node.js async; server actions run sequentially within each request
- **Global state:** None — no module-level singletons; all runtime data flows through `ExtensionHostContext` injected per-request
- **Circular imports:** None detected
- **Server-only boundary:** `src/a2a-server-setup-impl.tsx` imports `"server-only"` to prevent accidental client bundle inclusion
- **Admin gate:** All mutations require `requireExtensionAction("@cinatra-ai/a2a-server-connector", "manage")` — workspace-admin only

## Anti-Patterns

### Utility sprawl in `src/lib/utils.ts`

**What happens:** `src/lib/utils.ts` exports generic helpers (`formatCurrencyMillions`, `firstName`, `quarterLabel`, `getPageNumbers`) that are not used anywhere in this package
**Why it's wrong:** Suggests the file was copied from a larger codebase; dead code increases bundle size and maintenance surface
**Do this instead:** Keep only `cn` and `slugify` which are actually referenced; remove or tree-shake the rest

## Error Handling

**Strategy:** Redirect-on-error — mutations redirect to the setup page with a query param (`?error=invalid-url`) instead of throwing or returning structured errors. Agent card fetch failures are silently caught and a synthetic name is used as fallback.

**Patterns:**
- URL validation fails → `redirect("...?error=invalid-url")`
- Nango not configured (`importConnection` returns null) → silent fallback to `saveConnectionRecord`
- Agent card HTTP/JSON errors → try/catch swallows error, `connectionId` used as `name`

## Cross-Cutting Concerns

**Logging:** None — errors are swallowed silently or surfaced via redirect query params; no structured logging
**Validation:** Inline in server action (`normalizeBaseUrl` helper); no schema library
**Authentication:** Delegated to host via `requireExtensionAction`; bearer tokens stored as Nango `API_KEY` credentials

---

*Architecture analysis: 2026-06-09*
