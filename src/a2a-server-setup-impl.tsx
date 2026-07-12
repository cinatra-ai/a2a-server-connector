import "server-only";
import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  requireExtensionAction,
  requireA2AConnectionProvider,
} from "@cinatra-ai/sdk-extensions";
import { flashHref } from "@cinatra-ai/sdk-extensions/flash-href";
import type { ExtensionHostContext } from "@cinatra-ai/sdk-extensions";
import { ConnectorSetupPage } from "@cinatra-ai/sdk-ui/connector-setup-page";
import { StatusPill } from "@cinatra-ai/sdk-ui/marketplace";
import { SearchParamToast } from "@cinatra-ai/sdk-ui/search-param-toast";
import { Button } from "./components/ui/button";
import { LinkIcon } from "lucide-react";
import { Input } from "./components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./components/ui/input-group";
import { FieldGroup, Field, FieldLabel } from "./components/ui/field";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "./components/ui/dialog";
// Client-side controlled Tabs shell (see that file's header comment for why
// this needs its own "use client" module) — composes the shared
// `@cinatra-ai/sdk-ui/tabs` primitive, it does not reimplement it.
import { A2ASetupTabs, ViewAllConnectionsLink } from "./a2a-setup-tabs-client";
import {
  normalizeBaseUrl,
  connectionIdFromNormalized,
  fetchAgentCard,
  slugifyAgentName,
} from "./a2a-server-helpers";
import { A2A_FLASH_TOASTS } from "./a2a-flash";

export const metadata: Metadata = { title: "A2A Server | Connectors | Cinatra" };

// Codes-only flash protocol (toast-notifications epic, cinatra-ai/cinatra#1107
// S3): the actions below redirect back to this page carrying `?notice=<code>`
// / `?error=<code>`; the <SearchParamToast> island mounted in the page body
// maps each code to the static message in ./a2a-flash — never URL-derived
// text.
const SETUP_PATH = "/connectors/cinatra-ai/a2a-server-connector/setup";

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
    redirect(flashHref(SETUP_PATH, { error: "invalid-url" }));
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
  const card = await fetchAgentCard(normalized!, apiKey, connectionId);
  const name = card?.name ?? connectionId;
  const description = card?.description ?? null;
  const version = card?.version ?? null;

  const remoteAgentId = slugifyAgentName(name);

  await a2a.upsertExternalAgentTemplate({
    connectorSlug: connectionId,
    remoteAgentId,
    name,
    description,
    agentUrl: normalized!,
    version,
  });

  redirect(flashHref(SETUP_PATH, { notice: "added" }));
}

async function removeA2AConnectionAction(formData: FormData) {
  "use server";
  await requireExtensionAction("@cinatra-ai/a2a-server-connector", "manage");
  const a2a = requireA2AConnectionProvider();
  const connectionId = formData.get("connectionId") as string;
  if (!connectionId) redirect(SETUP_PATH);
  const providerConfigKey = a2a.providerConfigKeyFor("a2aServer");
  // Scrub the stored Nango bearer FIRST. `addA2AConnectionAction` imports an
  // API_KEY credential into the vault via `importConnection`; dropping only the
  // record row (below) would orphan that bearer. `deleteConnection` is
  // authoritative and fail-closed — it PROPAGATES a real failure (including when
  // Nango is unreachable, where the scrub can't be confirmed), so a failed scrub
  // ABORTS here and the record + templates are RETAINED for retry rather than
  // dropped while the bearer lingers. Idempotent on an already-absent connection.
  await a2a.deleteConnection({ connectorKey: "a2aServer", providerConfigKey, connectionId });
  await Promise.all([
    a2a.removeConnectionRecord("a2aServer", connectionId),
    a2a.deleteExternalAgentTemplatesByConnectorSlug(connectionId),
  ]);
  redirect(flashHref(SETUP_PATH, { notice: "removed" }));
}

type SearchParams = Record<string, string | string[] | undefined>;

export async function A2AServerConnectorPageImpl(props: {
  ctx: ExtensionHostContext;
  searchParams?: Promise<SearchParams>;
}) {
  const connections = (await props.ctx.nango.listConnectionRecords?.("a2aServer")) ?? [];
  // searchParams is still accepted (host dispatch passes it in), but the flash
  // outcomes are no longer read server-side for banner rendering — the
  // <SearchParamToast> island below owns them client-side (one-shot toast +
  // param strip). Awaited here only to preserve prop consumption for any
  // future non-flash search params.
  await props.searchParams;

  // This connector's data model has no "saved but broken" connection state —
  // a listed connection record is always live (see removeA2AConnectionAction,
  // which deletes rather than marks disconnected) — so every entry rolls up
  // as Connected. A future health-check surface would source a real per-row
  // status instead of this constant.
  const connectedCount = connections.length;

  const setupPanel = (
    // Two-column Setup tab (§II): left is the add-connection form — never
    // wrapped in its own card on a multi-connection connector, and it ADDS a
    // connection rather than editing one (no Disconnect here; that lives
    // per-row in the Connections tab). Right is the Connections-status
    // roll-up card, with a link into the Connections tab.
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_236px]">
      <form action={addA2AConnectionAction} className="grid min-w-0 gap-4">
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
          <Button type="submit">Connect</Button>
        </div>
      </form>

      <div className="soft-panel rounded-panel p-4">
        <div className="border-b border-line pb-2.5 text-sm font-semibold text-foreground">
          Connections status
        </div>
        <div className="mt-3.5 flex flex-col items-start gap-3.5">
          {connectedCount > 0 ? (
            <StatusPill status="approved">{connectedCount} Connected</StatusPill>
          ) : (
            <p className="text-xs text-muted-foreground">No connections yet.</p>
          )}
          <ViewAllConnectionsLink />
        </div>
      </div>
    </div>
  );

  const connectionsPanel =
    // Connections tab (§II): every connection stacks as its own card — name,
    // URL, status, and a per-row destructive Disconnect. Disconnecting is
    // destructive, so it opens an AlertDialog confirmation rather than
    // submitting on the first click.
    connections.length > 0 ? (
      <div className="flex flex-col gap-3">
        {connections.map((conn) => {
          const baseUrl =
            typeof conn.metadata?.baseUrl === "string" ? conn.metadata.baseUrl : null;
          return (
            <div
              key={conn.connectionId}
              className="soft-panel rounded-panel flex items-center justify-between gap-4 px-5 py-4"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{conn.connectionId}</p>
                {baseUrl ? (
                  <p className="mt-0.5 truncate font-mono text-sm text-muted-foreground">{baseUrl}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <StatusPill status="approved">Connected</StatusPill>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" size="sm">
                      Disconnect
                    </Button>
                  </AlertDialogTrigger>
                  {/* AlertDialogContent is PORTALLED (Radix mounts it near
                      document.body, outside this row's own DOM subtree) — the
                      <form> and its submit button must live INSIDE it (not
                      wrap the trigger above) or the portal move breaks the
                      submit button's native form association and confirming
                      silently does nothing. */}
                  <AlertDialogContent>
                    {/* The form is now the sole child of AlertDialogContent's
                        gap-4 grid, so it must re-apply that grid itself to
                        keep the header<->footer spacing the dialog chrome
                        otherwise provides. */}
                    <form action={removeA2AConnectionAction} className="grid gap-4">
                      <Input type="hidden" name="connectionId" value={conn.connectionId} />
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect connection?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Disconnect this connection? It will stop working until you connect it
                          again.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel asChild>
                          <Button type="button" variant="outline">
                            Cancel
                          </Button>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                          <Button type="submit" variant="destructive">
                            Disconnect
                          </Button>
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </form>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">
        No A2A servers connected yet. Add one in the <strong>Setup</strong> tab, or set{" "}
        <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs">CINATRA_A2A_DEV_PEER_URLS</code>{" "}
        in <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs">.env.local</code> for automatic connection on dev startup.
      </p>
    );

  // Help — reserved, always-last, read-only (no form, no Save). Narrows to
  // the Narrow width (max-w-xl · 576px, §II) under the Wide header + tablist,
  // flush-left (the A2ASetupTabs wrapper applies that width to every panel).
  const helpPanel = (
    <section className="flex flex-col gap-3">
      <ol className="ml-5 list-decimal text-sm text-muted-foreground [&>li+li]:mt-2">
        <li>
          In the <strong>Setup</strong> tab, enter the server&apos;s base URL — no path. Cinatra
          fetches its agent card from{" "}
          <code className="rounded bg-surface-muted px-1 font-mono text-xs">/.well-known/agent.json</code>{" "}
          (falling back to{" "}
          <code className="rounded bg-surface-muted px-1 font-mono text-xs">/.well-known/agent-card.json</code>).
        </li>
        <li>
          If the server requires authentication, paste its bearer token. Leave it blank for
          unauthenticated servers.
        </li>
        <li>
          Click <strong>Connect</strong>. Cinatra registers the server as an external agent using
          the name from its agent card, falling back to the connection id if the card can&apos;t
          be fetched.
        </li>
        <li>
          Manage or disconnect existing servers from the <strong>Connections</strong> tab.
        </li>
      </ol>
      <p className="text-sm text-muted-foreground">
        For automatic connection on dev startup, set{" "}
        <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs">CINATRA_A2A_DEV_PEER_URLS</code>{" "}
        in <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs">.env.local</code>.
      </p>
    </section>
  );

  return (
    <ConnectorSetupPage
      title="A2A Server"
      description="Connect external Agent-to-Agent servers. Each server exposes one agent reachable at its well-known card URL."
      divider={false}
      className="pb-8"
    >
      <Suspense fallback={null}>
        <SearchParamToast toasts={A2A_FLASH_TOASTS} />
      </Suspense>

      {/* app-connectors.html §II "Multiple connections" — the A2A Server
          connector is the design's own worked example: a Setup · Connections
          tablist (Setup adds a connection + rolls up status, Connections
          lists them), plus the reserved Help tab, always last. */}
      <A2ASetupTabs setup={setupPanel} connections={connectionsPanel} help={helpPanel} />
    </ConnectorSetupPage>
  );
}
