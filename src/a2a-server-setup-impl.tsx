import "server-only";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  requireExtensionAction,
  requireA2AConnectionProvider,
} from "@cinatra-ai/sdk-extensions";
import type { ExtensionHostContext } from "@cinatra-ai/sdk-extensions";
import { Main, PageHeader, PageContent, StatusPill } from "@cinatra-ai/sdk-ui/marketplace";
import { Button } from "./components/ui/button";
import { LinkIcon } from "lucide-react";
import { Input } from "./components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./components/ui/input-group";
import { FieldGroup, Field, FieldLabel } from "./components/ui/field";
import { Alert, AlertDescription } from "./components/ui/alert";

export const metadata: Metadata = { title: "A2A Server | Connectors | Cinatra" };

function normalizeBaseUrl(raw: string): string | null {
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

function connectionIdFromNormalized(normalized: string): string {
  const slug = normalized
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]/gi, "-")
    .toLowerCase()
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return `a2a-dev-${slug}`;
}

async function addA2AConnectionAction(formData: FormData) {
  "use server";
  // A2A peer registration is a workspace-wide connector mutation
  // (importNangoConnection + upsertExternalAgentTemplate). Without this gate
  // any authenticated non-admin could register or point a workspace A2A peer.
  await requireExtensionAction("@cinatra-ai/a2a-server-connector", "manage");
  const a2a = requireA2AConnectionProvider();
  const rawUrl = (formData.get("baseUrl") as string | null) ?? "";
  const apiKey = (formData.get("apiKey") as string | null) ?? "";

  const normalized = normalizeBaseUrl(rawUrl);
  if (!normalized) {
    redirect("/connectors/cinatra-ai/a2a-server-connector/setup?error=invalid-url");
  }

  const connectionId = connectionIdFromNormalized(normalized!);
  const providerConfigKey = a2a.providerConfigKeyFor("a2aServer");

  if (apiKey) {
    // Store bearer token as a proper Nango API-key credential so dispatch can
    // read it via getNangoConnection(). Falls back to saveNangoConnectionRecord
    // when Nango is not configured (returns null — dev/test environments).
    const imported = await a2a.importConnection({
      connectorKey: "a2aServer",
      providerConfigKey,
      connectionId,
      credentials: { type: "API_KEY", apiKey },
      metadata: { baseUrl: normalized },
    });
    if (!imported) {
      // Nango not configured — fall back to local record without credentials.
      await a2a.saveConnectionRecord(
        "a2aServer",
        { connectionId, providerConfigKey, metadata: { baseUrl: normalized } },
        { multiple: true },
      );
    }
  } else {
    await a2a.saveConnectionRecord(
      "a2aServer",
      { connectionId, providerConfigKey, metadata: { baseUrl: normalized } },
      { multiple: true },
    );
  }

  // Attempt card fetch for real agent name; fall back to connectionId.
  let name = connectionId;
  let description: string | null = null;
  let version: string | null = null;
  try {
    const headers: Record<string, string> = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
    for (const path of ["/.well-known/agent.json", "/.well-known/agent-card.json"]) {
      try {
        const res = await fetch(`${normalized}${path}`, { headers });
        if (res.ok) {
          const card = (await res.json()) as { name?: unknown; description?: unknown; version?: unknown };
          name = typeof card.name === "string" && card.name ? card.name : connectionId;
          description = typeof card.description === "string" ? card.description : null;
          version = typeof card.version === "string" ? card.version : null;
          break;
        }
      } catch {
        // try next path
      }
    }
  } catch {
    // card fetch failed — use synthetic name
  }

  const remoteAgentId = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "agent";

  await a2a.upsertExternalAgentTemplate({
    connectorSlug: connectionId,
    remoteAgentId,
    name,
    description,
    agentUrl: normalized!,
    version,
  });

  redirect("/connectors/cinatra-ai/a2a-server-connector/setup?added=1");
}

async function removeA2AConnectionAction(formData: FormData) {
  "use server";
  await requireExtensionAction("@cinatra-ai/a2a-server-connector", "manage");
  const a2a = requireA2AConnectionProvider();
  const connectionId = formData.get("connectionId") as string;
  if (!connectionId) redirect("/connectors/cinatra-ai/a2a-server-connector/setup");
  await Promise.all([
    a2a.removeConnectionRecord("a2aServer", connectionId),
    a2a.deleteExternalAgentTemplatesByConnectorSlug(connectionId),
  ]);
  redirect("/connectors/cinatra-ai/a2a-server-connector/setup?removed=1");
}

type SearchParams = Record<string, string | string[] | undefined>;
function pickParam(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export async function A2AServerConnectorPageImpl(props: {
  ctx: ExtensionHostContext;
  searchParams?: Promise<SearchParams>;
}) {
  const connections = (await props.ctx.nango.listConnectionRecords?.("a2aServer")) ?? [];
  const sp = (await props.searchParams) ?? {};
  const added = pickParam(sp.added);
  const removed = pickParam(sp.removed);
  const error = pickParam(sp.error);

  return (
    <Main className="min-h-screen">
      <PageHeader
        title="A2A Server"
        description="Connect external Agent-to-Agent servers. Each server exposes one agent reachable at its well-known card URL."
      />
      <PageContent className="flex flex-col gap-6 pb-8">
        {added ? (
          <Alert variant="success" className="rounded-control">
            <AlertDescription>A2A server connected and agent template created.</AlertDescription>
          </Alert>
        ) : null}
        {removed ? (
          <Alert variant="warning" className="rounded-control">
            <AlertDescription>Connection removed.</AlertDescription>
          </Alert>
        ) : null}
        {error === "invalid-url" ? (
          <Alert variant="destructive" className="rounded-control">
            <AlertDescription>Invalid URL — must start with http:// or https://.</AlertDescription>
          </Alert>
        ) : null}

        <section className="soft-panel rounded-panel p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Add A2A server</h2>
          <form action={addA2AConnectionAction} className="grid gap-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Server base URL</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <LinkIcon aria-hidden="true" />
                  </InputGroupAddon>
                  <InputGroupInput
                    name="baseUrl"
                    type="url"
                    placeholder="http://localhost:10001"
                    required
                  />
                </InputGroup>
                <span className="text-xs text-muted-foreground">
                  The root URL of the A2A server — no path. The agent card is fetched from{" "}
                  <code className="rounded bg-surface-muted px-1 font-mono">{"/.well-known/agent.json"}</code>.
                </span>
              </Field>
              <Field>
                <FieldLabel>Bearer token <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel>
                <Input
                  name="apiKey"
                  type="password"
                  autoComplete="off"
                  placeholder="Leave blank for unauthenticated servers"
                />
              </Field>
            </FieldGroup>
            <div>
              <Button type="submit">Connect server</Button>
            </div>
          </form>
        </section>

        {connections.length > 0 ? (
          <section className="soft-panel rounded-panel overflow-hidden">
            <div className="divide-y divide-line">
              {connections.map((conn) => {
                const baseUrl =
                  typeof conn.metadata?.baseUrl === "string" ? conn.metadata.baseUrl : null;
                return (
                  <div key={conn.connectionId} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{conn.connectionId}</p>
                      {baseUrl ? (
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">{baseUrl}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <StatusPill status="approved">Connected</StatusPill>
                      <form action={removeA2AConnectionAction}>
                        <Input type="hidden" name="connectionId" value={conn.connectionId} />
                        <Button type="submit" variant="outline" size="sm">
                          Remove
                        </Button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <p className="text-sm text-muted-foreground">
            No A2A servers connected yet. Add one above, or set{" "}
            <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs">CINATRA_A2A_DEV_PEER_URLS</code>{" "}
            in <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs">.env.local</code> for automatic connection on dev startup.
          </p>
        )}
      </PageContent>
    </Main>
  );
}
