// Pure/dependency-light helpers extracted out of a2a-server-setup-impl.tsx so
// they're unit-testable standalone (no "server-only", "next", or
// "@cinatra-ai/sdk-*" imports here — this repo declares those as
// host-internal peers unresolvable outside the cinatra monorepo; see
// src/__tests__/a2a-server-helpers.test.ts).

export function normalizeBaseUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return `${u.protocol.toLowerCase()}//${u.host.toLowerCase()}`.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

export function connectionIdFromNormalized(normalized: string): string {
  const slug = normalized
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]/gi, "-")
    .toLowerCase()
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return `a2a-dev-${slug}`;
}

export type AgentCardInfo = {
  name: string;
  description: string | null;
  version: string | null;
};

/**
 * Pure parse of a well-known agent-card JSON payload. Mirrors the exact
 * type-guard logic previously inlined in addA2AConnectionAction: a
 * non-string / empty `name` falls back to `fallbackName`; `description` and
 * `version` fall back to `null` (no truthiness check — an empty string is
 * kept as-is, only non-strings are nulled). A `null`/`undefined` `card`
 * throws on property access (same as the original inline code accessing
 * `card.name` on a `null` JSON body) — callers relying on the well-known
 * per-path fallback (see fetchAgentCard) must catch this.
 */
export function parseAgentCard(card: unknown, fallbackName: string): AgentCardInfo {
  const c = card as { name?: unknown; description?: unknown; version?: unknown };
  return {
    name: typeof c.name === "string" && c.name ? c.name : fallbackName,
    description: typeof c.description === "string" ? c.description : null,
    version: typeof c.version === "string" ? c.version : null,
  };
}

const AGENT_CARD_PATHS = ["/.well-known/agent.json", "/.well-known/agent-card.json"] as const;

/**
 * Fetch the agent card from the first well-known path that responds OK,
 * parsing it with parseAgentCard. Never throws — a per-path network/parse
 * failure (including a malformed/`null` JSON body) tries the next path, and
 * exhausting every path returns `null` so the caller can fall back to
 * `fallbackName` (the connectionId).
 */
export async function fetchAgentCard(
  normalizedBaseUrl: string,
  apiKey: string,
  fallbackName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AgentCardInfo | null> {
  const headers: Record<string, string> = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
  for (const path of AGENT_CARD_PATHS) {
    try {
      const res = await fetchImpl(`${normalizedBaseUrl}${path}`, { headers });
      if (res.ok) {
        const card = await res.json();
        return parseAgentCard(card, fallbackName);
      }
    } catch {
      // try next path
    }
  }
  return null;
}

/** Slug a resolved agent name into a remoteAgentId; falls back to "agent" when nothing survives. */
export function slugifyAgentName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "agent"
  );
}
