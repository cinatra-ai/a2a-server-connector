# A2A Servers

Bring agents from external Agent-to-Agent (A2A) servers into your Cinatra workspace and run them alongside your own. Point Cinatra at any A2A-compatible peer and its published agents become callable templates you can invoke, schedule, and chain into workflows the same way you would a native one.

Install by enabling the connector from the Cinatra marketplace and navigating to **Connectors → A2A Servers → Setup**. No build step is required — the extension is loaded by the Cinatra host at runtime.

To connect a peer, enter the server's root base URL (for example `http://my-agent-server:10001`) and an optional bearer token. Cinatra fetches the agent card from `/.well-known/agent.json` (or `/.well-known/agent-card.json` as a fallback) to read the agent's name, description, and version. Once connected, the remote agent appears as a template you can invoke immediately.

The connector stores each peer as a Nango `a2aServer` multi-peer record and creates an external agent template. Removing a peer from the setup page deletes both the Nango connection record and the associated template. Adding a peer without a bearer token works for unauthenticated A2A servers; adding one with a token stores it as an API-key credential so the runtime dispatcher can read it during execution. The setup UI also surfaces the `CINATRA_A2A_DEV_PEER_URLS` environment variable as a development shortcut — set it in `.env.local` to pre-register peers without going through the UI.

If the connection fails to appear after adding: confirm the URL is reachable from the Cinatra server, uses `http://` or `https://`, and that the A2A server exposes a valid agent card. The setup page shows an `invalid-url` error if the URL fails validation before any network call is made.

## Works with

- External A2A-compatible servers reachable over HTTP or HTTPS
- Remote agent catalogues published through A2A agent cards at `/.well-known/agent.json`
- Unauthenticated peers and bearer-token-protected peers

## Capabilities

- Register an external A2A server as a connected peer
- Discover the remote agents that peer publishes via its agent card
- Use a remote A2A agent as if it lived inside your workspace
- Manage the list of connected A2A peers and remove ones you no longer need
- Surface the `CINATRA_A2A_DEV_PEER_URLS` development shortcut for pre-registering peers without the UI
