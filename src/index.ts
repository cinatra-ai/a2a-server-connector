// A2A Servers are a first-class connector extension. The runtime storage shape
// stays exactly the same: `listSavedNangoConnections("a2aServer")` Nango
// records + external agent templates managed via `upsertExternalAgentTemplate`
// / `deleteExternalAgentTemplatesByConnectorSlug`. Multi-peer is preserved.
//
// This package wraps that existing storage via the setup-page only; other
// consumers of the A2A storage (the agents store, the runtime dispatcher)
// continue to use the canonical helpers directly.

import type { HostRequiredPackageDefinition } from "@cinatra-ai/sdk-extensions";

export const a2aServerConnectorPackage: HostRequiredPackageDefinition = {
  packageId: "@cinatra-ai/a2a-server-connector",
  name: "A2A Servers",
  slug: "connector-a2a-server",
  description:
    "Connect external Agent-to-Agent (A2A) servers as remote agents. Storage is the existing Nango a2aServer multi-peer record set.",
  settingsHref: "/connectors/cinatra-ai/a2a-server-connector/setup",
};
