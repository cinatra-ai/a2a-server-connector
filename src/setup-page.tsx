// A2A Server connector setup page for the dispatch route.
// Thin default-exported wrapper over `A2AServerConnectorPageImpl` in
// ./a2a-server-setup-impl, which carries the form, action handlers, and
// connection-list rendering.

import type { ExtensionHostContext } from "@cinatra-ai/sdk-extensions";
import { A2AServerConnectorPageImpl } from "./a2a-server-setup-impl";

type ConnectorSetupPageProps = {
  packageId: string;
  slug: string;
  searchParams: Record<string, string | string[] | undefined>;
  ctx: ExtensionHostContext;
};

export default async function A2AServerConnectorSetupPage({
  searchParams,
  ctx,
}: ConnectorSetupPageProps) {
  return A2AServerConnectorPageImpl({
    ctx,
    searchParams: Promise.resolve(searchParams),
  });
}
