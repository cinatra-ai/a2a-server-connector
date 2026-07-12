// Component tests for the spec-driven tabbed setup layout
// (cinatra-ai/a2a-server-connector#40 — app-connectors.html §II "Multiple
// connections", the A2A Server connector's own worked example). The page is
// composed from a2a-server-setup-impl.tsx (the server component + actions)
// and a2a-setup-tabs-client.tsx (the controlled-Tabs client shell + the "All
// connections" link) — this file drives the assembled result through
// `A2AServerConnectorPageImpl`, exactly what the host renders.
//
// `@cinatra-ai/sdk-ui/tabs` + `@cinatra-ai/sdk-ui/connector-setup-page` are
// host-provided at build time and unresolvable standalone (see
// vitest.config.ts), so both are mocked to static markup here, matching the
// pattern used by sibling connectors (e.g.
// wordpress-assistant-connector#36's settings-page-review.test.tsx). The
// mocked `TabsTrigger`/`TabsContent` preserve `value` as a `data-tab` /
// `data-panel` attribute so presence, order, and content mapping are all
// assertable from the rendered markup, and — since the mock renders every
// panel unconditionally — every panel is simultaneously queryable by an
// interactive (jsdom) test too. The REAL a11y tab semantics (roles,
// aria-selected, keyboard roving focus) come from the unmocked Radix `Tabs`
// primitive in production and are out of scope for a markup-level pin.
//
// `@cinatra-ai/sdk-ui/marketplace` (StatusPill) is likewise mocked. The
// Disconnect confirmation's `AlertDialog` (./components/ui/dialog.tsx) is a
// vendored, connector-owned component built on the real `radix-ui` package
// (a genuine dependency of this repo, unlike the host-provided `sdk-ui`
// subpaths) — left UNMOCKED so its tests below exercise real Radix dialog
// behavior (open/close state, a11y attributes, focus).

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock factories are hoisted above imports, so any function they
// reference must itself be created inside vi.hoisted — this is how the
// fake `a2a` connection-provider spies below get shared between the mock
// factory and the assertions in the tests that use them.
const { deleteConnection, removeConnectionRecord, deleteExternalAgentTemplatesByConnectorSlug, redirectMock } =
  vi.hoisted(() => ({
    deleteConnection: vi.fn().mockResolvedValue(undefined),
    removeConnectionRecord: vi.fn().mockResolvedValue(undefined),
    deleteExternalAgentTemplatesByConnectorSlug: vi.fn().mockResolvedValue(undefined),
    redirectMock: vi.fn(),
  }));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@cinatra-ai/sdk-extensions", () => ({
  requireExtensionAction: vi.fn().mockResolvedValue(undefined),
  requireA2AConnectionProvider: vi.fn(() => ({
    providerConfigKeyFor: vi.fn(() => "a2a-provider-config-key"),
    deleteConnection,
    removeConnectionRecord,
    deleteExternalAgentTemplatesByConnectorSlug,
  })),
}));
vi.mock("@cinatra-ai/sdk-ui/connector-setup-page", () => ({
  ConnectorSetupPage: ({
    title,
    description,
    children,
  }: {
    title: string;
    description?: string;
    children?: React.ReactNode;
  }) =>
    React.createElement(
      "div",
      { "data-slot": "setup-page" },
      React.createElement("h1", null, title),
      React.createElement("p", null, description),
      children,
    ),
}));
// TabsTrigger/TabsContent carry `value` through as `data-tab`/`data-panel` so
// tests can assert order + content mapping straight off the rendered markup.
// TabsListRow additionally exposes the LIVE controlled value it's given (via
// a hidden data attribute read off the first trigger's aria-selected — see
// below) so the "All connections" test can assert the actual tab switch, not
// just that the click didn't throw.
vi.mock("@cinatra-ai/sdk-ui/tabs", () => ({
  Tabs: ({
    value,
    children,
  }: {
    value?: string;
    children?: React.ReactNode;
  }) => React.createElement("div", { "data-active-tab": value }, children),
  TabsListRow: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-slot": "tabs-list", role: "tablist" }, children),
  TabsTrigger: ({ value, children }: { value: string; children?: React.ReactNode }) =>
    React.createElement("button", { "data-tab": value, role: "tab" }, children),
  TabsContent: ({ value, children }: { value: string; children?: React.ReactNode }) =>
    React.createElement("div", { "data-panel": value }, children),
}));
vi.mock("@cinatra-ai/sdk-ui/marketplace", () => ({
  StatusPill: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("span", { "data-slot": "status-pill" }, children),
}));
vi.mock("@cinatra-ai/sdk-ui/search-param-toast", () => ({
  SearchParamToast: () => null,
}));

import { A2AServerConnectorPageImpl } from "../a2a-server-setup-impl";

type FakeConnection = { connectionId: string; metadata?: Record<string, unknown> };

function makeCtx(connections: FakeConnection[]) {
  return {
    nango: {
      listConnectionRecords: async () => connections,
    },
  } as unknown as Parameters<typeof A2AServerConnectorPageImpl>[0]["ctx"];
}

function panel(html: string, name: "setup" | "connections" | "help"): string {
  const start = html.indexOf(`data-panel="${name}"`);
  if (start === -1) throw new Error(`panel "${name}" not found in rendered markup`);
  const rest = html.slice(start);
  const nextPanel = rest.slice(1).search(/data-panel="/);
  return nextPanel === -1 ? rest : rest.slice(0, nextPanel + 1);
}

describe("A2A setup page — tabbed layout (issue #40)", () => {
  beforeEach(() => {
    deleteConnection.mockClear();
    removeConnectionRecord.mockClear();
    deleteExternalAgentTemplatesByConnectorSlug.mockClear();
    redirectMock.mockClear();
  });

  it("renders exactly three tabs, in order Setup, Connections, Help — Help LAST", async () => {
    const el = await A2AServerConnectorPageImpl({ ctx: makeCtx([]) });
    const html = renderToStaticMarkup(el);
    const tabs = [...html.matchAll(/data-tab="([a-z]+)"/g)].map((m) => m[1]);
    expect(tabs).toEqual(["setup", "connections", "help"]);
  });

  it("the tablist and every content panel agree on the same three tab values", async () => {
    const el = await A2AServerConnectorPageImpl({ ctx: makeCtx([]) });
    const html = renderToStaticMarkup(el);
    const panels = [...html.matchAll(/data-panel="([a-z]+)"/g)].map((m) => m[1]);
    expect(panels).toEqual(["setup", "connections", "help"]);
  });

  it("Setup tab holds the add-connection form and the Connections-status roll-up, nothing from Connections or Help", async () => {
    const el = await A2AServerConnectorPageImpl({
      ctx: makeCtx([{ connectionId: "a2a-dev-x", metadata: { baseUrl: "http://localhost:10001" } }]),
    });
    const html = renderToStaticMarkup(el);
    const setup = panel(html, "setup");
    expect(setup).toContain("Server base URL");
    expect(setup).toContain("Bearer token");
    expect(setup).toContain("Connections status");
    expect(setup).toContain("1 Connected");
    expect(setup).not.toContain("a2a-dev-x");
    expect(setup).not.toContain("CINATRA_A2A_DEV_PEER_URLS");
    // The Setup tab adds a connection — it never carries a Disconnect action.
    expect(setup).not.toContain("Disconnect");
  });

  it("Connections tab lists each connection with its base URL and a per-row Disconnect trigger", async () => {
    const el = await A2AServerConnectorPageImpl({
      ctx: makeCtx([
        { connectionId: "a2a-dev-a", metadata: { baseUrl: "http://localhost:10001" } },
        { connectionId: "a2a-dev-b", metadata: { baseUrl: "http://localhost:10002" } },
      ]),
    });
    const html = renderToStaticMarkup(el);
    const connections = panel(html, "connections");
    expect(connections).toContain("a2a-dev-a");
    expect(connections).toContain("http://localhost:10001");
    expect(connections).toContain("a2a-dev-b");
    expect(connections).toContain("http://localhost:10002");
    expect((connections.match(/data-slot="alert-dialog-trigger"/g) ?? []).length).toBe(2);
  });

  it("Connections tab's Disconnect is a destructive confirmation, not a bare one-click submit", async () => {
    const el = await A2AServerConnectorPageImpl({
      ctx: makeCtx([{ connectionId: "a2a-dev-a", metadata: { baseUrl: "http://localhost:10001" } }]),
    });
    const html = renderToStaticMarkup(el);
    const connections = panel(html, "connections");
    // The row's Disconnect is a real (unmocked) Radix AlertDialogTrigger —
    // aria-haspopup="dialog" is Radix's own a11y wiring proving this opens a
    // confirmation dialog rather than directly submitting the form. The
    // AlertDialogContent itself is closed by default (data-state="closed")
    // and portal-rendered, so it does not appear in this static markup — its
    // title/description/actions are pinned via node inspection below instead.
    expect(connections).toContain('data-slot="alert-dialog-trigger"');
    expect(connections).toContain('aria-haspopup="dialog"');
    expect(connections).toContain('data-state="closed"');
    // A bare directly-submitting Disconnect button carries no such wiring —
    // guard against ever regressing back to one.
    expect(connections).not.toMatch(/<button[^>]*type="submit"[^>]*>\s*Disconnect/);
  });

  it("clicking the real Disconnect trigger opens the AlertDialog with the spec's exact confirmation copy + a Cancel action", async () => {
    // Interactive DOM test (jsdom, real Radix AlertDialog — unmocked) driving
    // the ACTUAL production Connections-tab markup, not a re-declared dialog.
    // Proves the trigger really opens the dialog and the dialog really
    // carries the spec copy, rather than trusting the two are wired together.
    const el = await A2AServerConnectorPageImpl({
      ctx: makeCtx([{ connectionId: "a2a-dev-a", metadata: { baseUrl: "http://localhost:10001" } }]),
    });
    render(el);
    try {
      expect(screen.queryByText("Disconnect connection?")).toBeNull();
      const trigger = screen.getByRole("button", { name: "Disconnect" });
      fireEvent.click(trigger);
      expect(await screen.findByText("Disconnect connection?")).toBeTruthy();
      expect(
        screen.getByText("Disconnect this connection? It will stop working until you connect it again."),
      ).toBeTruthy();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
    } finally {
      cleanup();
    }
  });

  it("Cancel does not submit the removal — no host mutation is called", async () => {
    const el = await A2AServerConnectorPageImpl({
      ctx: makeCtx([{ connectionId: "a2a-dev-a", metadata: { baseUrl: "http://localhost:10001" } }]),
    });
    render(el);
    try {
      fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
      const dialog = await screen.findByRole("alertdialog");
      fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
      // Cancel is type="button" — asserting no call at all (not just "not yet
      // redirected") rules out a silently-fired submit whose async body just
      // hasn't resolved when this assertion runs.
      expect(deleteConnection).not.toHaveBeenCalled();
    } finally {
      cleanup();
    }
  });

  it("confirming Disconnect DOES submit the removal form — regression pin for the portal/form-association bug (codex round-1)", async () => {
    // The AlertDialogContent is portal-rendered outside the row's own DOM
    // subtree; the <form>+hidden connectionId input must live INSIDE it (see
    // a2a-server-setup-impl.tsx) or the confirm button loses its native form
    // association and clicking it does nothing. This drives the REAL
    // production markup end to end: open -> confirm -> the real
    // removeA2AConnectionAction server action actually runs and calls the
    // real (mocked-at-the-boundary) host `a2a.deleteConnection` with this
    // row's exact connectionId.
    const el = await A2AServerConnectorPageImpl({
      ctx: makeCtx([{ connectionId: "a2a-dev-a", metadata: { baseUrl: "http://localhost:10001" } }]),
    });
    render(el);
    try {
      fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
      const dialog = await screen.findByRole("alertdialog");
      // Two "Disconnect"-labelled buttons exist at this point (the now-hidden
      // row trigger behind the dialog, and the dialog's own confirm action) —
      // scope the query to the open dialog to hit the confirm button only.
      fireEvent.click(within(dialog).getByRole("button", { name: "Disconnect" }));
      await vi.waitFor(() => {
        expect(deleteConnection).toHaveBeenCalledTimes(1);
      });
      expect(deleteConnection).toHaveBeenCalledWith(
        expect.objectContaining({ connectionId: "a2a-dev-a", connectorKey: "a2aServer" }),
      );
    } finally {
      cleanup();
    }
  });

  it("Connections tab shows the empty-state copy (incl. the dev auto-connect env var) when there are no connections", async () => {
    const el = await A2AServerConnectorPageImpl({ ctx: makeCtx([]) });
    const html = renderToStaticMarkup(el);
    const connections = panel(html, "connections");
    expect(connections).toContain("No A2A servers connected yet");
    expect(connections).toContain("CINATRA_A2A_DEV_PEER_URLS");
  });

  it("Help tab carries the read-only setup how-to and no form", async () => {
    const el = await A2AServerConnectorPageImpl({ ctx: makeCtx([]) });
    const html = renderToStaticMarkup(el);
    const help = panel(html, "help");
    expect(help).toContain("agent.json");
    expect(help).toContain("Connect");
    expect(help).not.toContain("<form");
    expect(help).not.toContain("Disconnect");
  });

  it("the Setup tab's status card reads 'No connections yet' when there are none", async () => {
    const el = await A2AServerConnectorPageImpl({ ctx: makeCtx([]) });
    const html = renderToStaticMarkup(el);
    const setup = panel(html, "setup");
    expect(setup).toContain("No connections yet");
  });

  it("the Setup tab's status card carries an 'All connections' link that switches the controlled Tabs value to Connections", async () => {
    const el = await A2AServerConnectorPageImpl({
      ctx: makeCtx([{ connectionId: "a2a-dev-a" }]),
    });
    const html = renderToStaticMarkup(el);
    const setup = panel(html, "setup");
    expect(setup).toContain("All connections");

    // The mocked `Tabs` (see the module mock above) forwards its live
    // controlled `value` onto a `data-active-tab` attribute, so this proves
    // the click actually flips ./a2a-setup-tabs-client's real React state
    // from "setup" to "connections" — not just that the handler ran.
    const { container } = render(el);
    try {
      const tabsRoot = () => container.querySelector("[data-active-tab]");
      expect(tabsRoot()?.getAttribute("data-active-tab")).toBe("setup");
      const link = screen.getByRole("button", { name: /All connections/ });
      fireEvent.click(link);
      expect(tabsRoot()?.getAttribute("data-active-tab")).toBe("connections");
    } finally {
      cleanup();
    }
  });
});
