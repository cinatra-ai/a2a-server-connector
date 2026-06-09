# External Integrations

**Analysis Date:** 2026-06-09

## APIs & External Services

**Agent-to-Agent (A2A) Protocol:**
- External A2A-compatible servers — registered as remote peers; agents are discovered via well-known card endpoints
  - Card discovery URLs: `/.well-known/agent.json` and `/.well-known/agent-card.json` (fetched in `src/a2a-server-setup-impl.tsx` lines 93–109)
  - Auth: optional Bearer token supplied by user at registration time; stored as Nango `API_KEY` credential
  - SDK/Client: native `fetch` (no dedicated SDK)

**Cinatra SDK Extensions (`@cinatra-ai/sdk-extensions`):**
- `requireA2AConnectionProvider()` — returns the A2A connection provider used for all Nango/storage operations (`src/a2a-server-setup-impl.tsx`)
- `requireExtensionAction()` — enforces permission gate (`"manage"`) before any mutation
- `ExtensionHostContext` — typed host context injected into the setup page; exposes `ctx.nango.listConnectionRecords`

**Cinatra SDK UI (`@cinatra-ai/sdk-ui`):**
- `@cinatra-ai/sdk-ui/marketplace` — provides layout primitives (`Main`, `PageHeader`, `PageContent`, `StatusPill`) rendered in the connector setup page

## Data Storage

**Databases:**
- Nango connection records — primary storage for A2A peer connections
  - Connection key: `"a2aServer"` (multi-peer record set)
  - Operations: `importConnection`, `saveConnectionRecord`, `removeConnectionRecord`, `listConnectionRecords` (all via `requireA2AConnectionProvider()` in `src/a2a-server-setup-impl.tsx`)
  - Metadata stored per connection: `{ baseUrl: string }`

**Agent Template Store (host-internal):**
- `upsertExternalAgentTemplate` / `deleteExternalAgentTemplatesByConnectorSlug` — called via the A2A provider to register/remove remote agent templates after a peer is connected or removed (`src/a2a-server-setup-impl.tsx` lines 117–124, 136–138)

**File Storage:**
- Not applicable

**Caching:**
- None

## Authentication & Identity

**Auth Provider:**
- Cinatra host RBAC via `requireExtensionAction("@cinatra-ai/a2a-server-connector", "manage")` — blocks non-admin mutations
  - Implementation: called at the top of both `addA2AConnectionAction` and `removeA2AConnectionAction` server actions (`src/a2a-server-setup-impl.tsx`)

**A2A Peer Auth:**
- Optional Bearer token per peer
  - Stored as Nango `API_KEY` credential via `importConnection` when Nango is configured
  - Falls back to a local record without credentials in dev/test environments (when `importConnection` returns `null`)

## Monitoring & Observability

**Error Tracking:**
- Not detected

**Logs:**
- No explicit logging; errors from card fetch are silently swallowed (`catch {}`) with fallback to synthetic name (`src/a2a-server-setup-impl.tsx` lines 103–108)

## CI/CD & Deployment

**Hosting:**
- Cinatra monorepo host application (Next.js); connector is not independently deployed

**CI Pipeline:**
- GitHub Actions — `.github/workflows/ci.yml` and `.github/workflows/release.yml`
  - Node.js 24, corepack enabled
  - Validates first-party dep shape (no `@cinatra-ai/*` in direct deps; all must be optional peers)
  - Skips install/typecheck/test for this repo (first-party peers not published); full pipeline runs inside the monorepo

## Environment Configuration

**Required env vars:**
- `CINATRA_A2A_DEV_PEER_URLS` — optional; enables automatic dev-startup peer connections (referenced in UI copy; set in `.env.local`)

**Secrets location:**
- `.env.local` — implied by UI copy; file not present in repo

## Webhooks & Callbacks

**Incoming:**
- Not applicable (connector uses Next.js server actions, not webhook endpoints)

**Outgoing:**
- A2A card fetch — outbound `fetch` to `{peerBaseUrl}/.well-known/agent.json` (and fallback `agent-card.json`) on peer registration (`src/a2a-server-setup-impl.tsx` lines 93–109)
- All subsequent A2A agent invocations are handled by the host runtime dispatcher (outside this package)

---

*Integration audit: 2026-06-09*
