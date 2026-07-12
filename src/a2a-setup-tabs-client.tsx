"use client";

// Client-side shell for the tabbed setup page (issue #40). Split out of
// a2a-server-setup-impl.tsx (a "server-only" async server component) because
// the Setup tab's "All connections →" affordance (app-connectors.html §II —
// the multi-connection Setup tab's status card links into the Connections
// tab) needs a CONTROLLED `Tabs` value it can programmatically switch, which
// requires client state. `Tabs`/`TabsListRow`/`TabsTrigger`/`TabsContent`
// still come straight from the shared `@cinatra-ai/sdk-ui/tabs` primitive —
// this file only adds the thin controlled-state wrapper around it, not a
// reimplementation.

import { createContext, useContext, useState, type ReactNode } from "react";
import { Tabs, TabsListRow, TabsTrigger, TabsContent } from "@cinatra-ai/sdk-ui/tabs";
import { Button } from "./components/ui/button";

export type A2ATabValue = "setup" | "connections" | "help";

const SwitchTabContext = createContext<(tab: A2ATabValue) => void>(() => {});

export function A2ASetupTabs({
  setup,
  connections,
  help,
}: {
  setup: ReactNode;
  connections: ReactNode;
  help: ReactNode;
}) {
  const [tab, setTab] = useState<A2ATabValue>("setup");
  return (
    <SwitchTabContext.Provider value={setTab}>
      <Tabs value={tab} onValueChange={(value) => setTab(value as A2ATabValue)}>
        <TabsListRow>
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          {/* Help is reserved and always sits last (app-connectors.html §II). */}
          <TabsTrigger value="help">Help</TabsTrigger>
        </TabsListRow>
        <TabsContent value="setup" className="mt-6">
          {setup}
        </TabsContent>
        <TabsContent value="connections" className="mt-6">
          {connections}
        </TabsContent>
        <TabsContent value="help" className="mt-6 max-w-xl">
          {help}
        </TabsContent>
      </Tabs>
    </SwitchTabContext.Provider>
  );
}

/** The Setup tab's status-card link that jumps to the Connections tab
 *  (app-connectors.html §II — the multi-connection Setup tab's status card
 *  carries a link-style "All connections" affordance into the Connections
 *  tab, in place of the single-connection card's Check action). */
export function ViewAllConnectionsLink() {
  const switchTab = useContext(SwitchTabContext);
  return (
    <Button
      type="button"
      variant="link"
      className="h-auto p-0"
      onClick={() => switchTab("connections")}
    >
      All connections &rarr;
    </Button>
  );
}
