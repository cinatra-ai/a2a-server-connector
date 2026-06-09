# Coding Conventions

**Analysis Date:** 2026-06-09

## Naming Patterns

**Files:**
- React components use PascalCase: `setup-page.tsx`, `a2a-server-setup-impl.tsx`
- UI primitives use kebab-case filenames: `input-group.tsx`, `button.tsx`, `label.tsx`
- Utility modules use kebab-case: `lib/utils.ts`
- Entry point is `index.ts`

**Functions:**
- Named exports for React components use PascalCase: `Button`, `Input`, `A2AServerConnectorPageImpl`
- Default-exported page components use PascalCase: `A2AServerConnectorSetupPage`
- Server actions use camelCase with `Action` suffix: `addA2AConnectionAction`, `removeA2AConnectionAction`
- Utility functions use camelCase: `slugify`, `cn`, `normalizeBaseUrl`, `connectionIdFromNormalized`, `pickParam`

**Variables:**
- Local variables use camelCase: `connectionId`, `rawUrl`, `normalized`, `remoteAgentId`
- Constants use camelCase: `a2aServerConnectorPackage`, `buttonVariants`

**Types:**
- TypeScript `type` aliases use PascalCase: `ConnectorSetupPageProps`, `SearchParams`
- Props types are suffixed `Props`: `ConnectorSetupPageProps`
- Variant props use `VariantProps<typeof ...>` from CVA

## Code Style

**Formatting:**
- Indentation: 2 spaces (TypeScript/TSX files)
- Double quotes for JSX attribute strings, double quotes for TypeScript imports
- Trailing commas used in function arguments and object literals
- Arrow functions preferred for inline utility helpers

**Linting:**
- No `.eslintrc` or `biome.json` detected in repository root — linting delegated to the host monorepo

## Import Organization

**Order (observed in `src/a2a-server-setup-impl.tsx`):**
1. `"server-only"` directive (when applicable)
2. Framework/runtime imports (`next/navigation`, `next`)
3. First-party SDK imports (`@cinatra-ai/sdk-extensions`, `@cinatra-ai/sdk-ui/...`)
4. Local component imports (`./components/ui/...`)
5. Third-party icon libraries (`lucide-react`)

**Path Aliases:**
- No custom path aliases detected; imports use relative paths (`../../lib/utils`, `./components/ui/...`)

## Error Handling

**Patterns:**
- Validation failures use Next.js `redirect()` with query-param error codes: `redirect("...?error=invalid-url")`
- Server actions wrap risky operations (URL parsing, card fetch) in `try/catch` with silent fallback or synthetic defaults
- Nested try/catch blocks used for multi-path fallback fetching (agent card URL variants)
- Functions that return `null` on failure use explicit `return null` (e.g., `normalizeBaseUrl`)
- No thrown custom error classes; errors are surfaced to the user via URL search params rendered as `<Alert>` variants

## Logging

**Framework:** None — no logging utility imported or invoked in any source file

**Patterns:**
- Errors from network calls (agent card fetch) are silently caught and swallowed; no console output in production paths

## Comments

**When to Comment:**
- Module-level comments explain architectural intent and cross-cutting concerns (storage shape, fallback behaviour, security gates)
- Inline comments on server actions explain the rationale for authorization calls and credential storage fallbacks

**JSDoc/TSDoc:**
- Not used; type information is conveyed via TypeScript annotations only

## Function Design

**Size:** Functions are small and single-purpose; `A2AServerConnectorPageImpl` is the longest function (~120 lines) because it renders the full page including form and connection list

**Parameters:** Props passed as destructured objects; server actions receive `FormData` directly

**Return Values:** React async server components return JSX; utility helpers return `string | null` or `string`

## Module Design

**Exports:**
- `src/index.ts` exports only the `a2aServerConnectorPackage` constant (package manifest object)
- UI components use named exports with the component function and variant helpers: `export { Button, buttonVariants }`
- Setup page uses a default export for the dispatch route entry (`export default async function A2AServerConnectorSetupPage`)
- Implementation module uses a named export: `export async function A2AServerConnectorPageImpl`

**Barrel Files:**
- `src/index.ts` acts as the single public API surface; UI components are not re-exported from it (consumed internally only)

## React/Component Patterns

**Component Style:**
- Functional components only; no class components
- `React.ComponentProps<"element">` used to spread all native element props (see `Input`, `Button`)
- `data-slot` attributes on root elements for CSS selector targeting: `data-slot="button"`, `data-slot="input"`
- `asChild` pattern via `radix-ui`'s `Slot.Root` for composable wrapper components (Button)

**Styling:**
- Tailwind CSS utility classes throughout
- `cva` (class-variance-authority) for variant-based component styling (`Button`, see `src/components/ui/button.tsx`)
- `cn()` helper (`clsx` + `tailwind-merge`) used for conditional class merging (`src/lib/utils.ts`)

**Server Components:**
- `"use server"` directive inside inline server action functions
- `"server-only"` import guard in `src/a2a-server-setup-impl.tsx`
- Async server components pass `Promise<SearchParams>` through props

---

*Convention analysis: 2026-06-09*
