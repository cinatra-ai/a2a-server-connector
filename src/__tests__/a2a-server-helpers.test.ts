import { describe, expect, it, vi } from "vitest";

import {
  connectionIdFromNormalized,
  fetchAgentCard,
  normalizeBaseUrl,
  parseAgentCard,
  slugifyAgentName,
} from "../a2a-server-helpers";

describe("normalizeBaseUrl", () => {
  it.each([
    ["http://localhost:10001", "http://localhost:10001"],
    ["https://Example.com", "https://example.com"],
    ["HTTPS://EXAMPLE.COM:8443", "https://example.com:8443"],
    ["https://example.com/", "https://example.com"],
    ["https://example.com/some/path?x=1#frag", "https://example.com"],
    ["  https://example.com  ", "https://example.com"],
    ["https://example.com:9999", "https://example.com:9999"],
  ])("normalizes %s to %s", (raw, expected) => {
    expect(normalizeBaseUrl(raw)).toBe(expected);
  });

  it.each(["", "   ", "ftp://example.com", "file:///etc/passwd", "javascript:alert(1)", "not a url", "data:text/plain,foo"])(
    "rejects %s",
    (raw) => {
      expect(normalizeBaseUrl(raw)).toBeNull();
    },
  );
});

describe("connectionIdFromNormalized", () => {
  it("slugs a plain host into a2a-dev-<slug>", () => {
    expect(connectionIdFromNormalized("http://localhost:10001")).toBe("a2a-dev-localhost-10001");
  });

  it("strips the protocol and lowercases", () => {
    expect(connectionIdFromNormalized("https://Example.com")).toBe("a2a-dev-example-com");
  });

  it("collapses runs of non-alphanumeric characters into a single dash", () => {
    expect(connectionIdFromNormalized("https://a...b---c.com")).toBe("a2a-dev-a-b-c-com");
  });

  it("strips leading/trailing dashes from the slug portion", () => {
    // A normalized value can't literally start/end with punctuation post-strip,
    // but the regex chain (replace protocol -> non-alnum-to-dash -> collapse ->
    // trim) is exercised directly against an already-dashy input.
    expect(connectionIdFromNormalized("http://-example.com-")).toBe("a2a-dev-example-com");
  });

  it("truncates the slug portion to 64 characters", () => {
    const longHost = "a".repeat(100) + ".com";
    const result = connectionIdFromNormalized(`https://${longHost}`);
    expect(result.startsWith("a2a-dev-")).toBe(true);
    expect(result.slice("a2a-dev-".length).length).toBe(64);
  });
});

describe("slugifyAgentName", () => {
  it("lowercases and dashes a normal name", () => {
    expect(slugifyAgentName("My Cool Agent")).toBe("my-cool-agent");
  });

  it("collapses special characters into single dashes and trims edges", () => {
    expect(slugifyAgentName("  Weather!! Bot  ")).toBe("weather-bot");
  });

  it("falls back to 'agent' when nothing survives", () => {
    expect(slugifyAgentName("!!!")).toBe("agent");
    expect(slugifyAgentName("")).toBe("agent");
  });

  it("truncates to 64 characters", () => {
    const longName = "a".repeat(100);
    expect(slugifyAgentName(longName).length).toBe(64);
  });
});

describe("parseAgentCard", () => {
  it("parses a full valid card", () => {
    expect(parseAgentCard({ name: "Weather Bot", description: "Gives forecasts", version: "1.2.3" }, "fallback")).toEqual({
      name: "Weather Bot",
      description: "Gives forecasts",
      version: "1.2.3",
    });
  });

  it("falls back name to fallbackName when missing or non-string", () => {
    expect(parseAgentCard({}, "fallback-id")).toEqual({
      name: "fallback-id",
      description: null,
      version: null,
    });
    expect(parseAgentCard({ name: 42 }, "fallback-id")).toEqual({
      name: "fallback-id",
      description: null,
      version: null,
    });
  });

  it("falls back name to fallbackName when the name is an empty string", () => {
    expect(parseAgentCard({ name: "" }, "fallback-id").name).toBe("fallback-id");
  });

  it("keeps an empty-string description/version as-is (no truthiness check)", () => {
    expect(parseAgentCard({ name: "Bot", description: "", version: "" }, "fallback-id")).toEqual({
      name: "Bot",
      description: "",
      version: "",
    });
  });

  it("nulls out non-string description/version", () => {
    expect(parseAgentCard({ name: "Bot", description: 1, version: false }, "fallback-id")).toEqual({
      name: "Bot",
      description: null,
      version: null,
    });
  });

  it("throws on a null card body, matching the original inline behavior of accessing a property on null", () => {
    expect(() => parseAgentCard(null, "fallback-id")).toThrow();
  });
});

describe("fetchAgentCard", () => {
  function jsonResponse(status: number, body: unknown): Response {
    return new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }

  it("returns the parsed card from the first well-known path that responds OK", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { name: "Bot One", description: "d", version: "1" }));
    const result = await fetchAgentCard("https://example.com", "", "fallback-id", fetchImpl);
    expect(result).toEqual({ name: "Bot One", description: "d", version: "1" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith("https://example.com/.well-known/agent.json", { headers: {} });
  });

  it("sends an Authorization bearer header only when apiKey is non-empty", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { name: "Bot" }));
    await fetchAgentCard("https://example.com", "secret-token", "fallback-id", fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith("https://example.com/.well-known/agent.json", {
      headers: { Authorization: "Bearer secret-token" },
    });
  });

  it("falls through to the second well-known path when the first is not ok", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(404, {}))
      .mockResolvedValueOnce(jsonResponse(200, { name: "Bot Two" }));
    const result = await fetchAgentCard("https://example.com", "", "fallback-id", fetchImpl);
    expect(result).toEqual({ name: "Bot Two", description: null, version: null });
    expect(fetchImpl).toHaveBeenNthCalledWith(1, "https://example.com/.well-known/agent.json", { headers: {} });
    expect(fetchImpl).toHaveBeenNthCalledWith(2, "https://example.com/.well-known/agent-card.json", { headers: {} });
  });

  it("falls through to the second well-known path when the first throws (network error)", async () => {
    const fetchImpl = vi.fn().mockRejectedValueOnce(new Error("ECONNREFUSED")).mockResolvedValueOnce(jsonResponse(200, { name: "Bot Two" }));
    const result = await fetchAgentCard("https://example.com", "", "fallback-id", fetchImpl);
    expect(result).toEqual({ name: "Bot Two", description: null, version: null });
  });

  it("falls through to the second path when the first returns an unparsable/null JSON body", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse(200, null)).mockResolvedValueOnce(jsonResponse(200, { name: "Bot Two" }));
    const result = await fetchAgentCard("https://example.com", "", "fallback-id", fetchImpl);
    expect(result).toEqual({ name: "Bot Two", description: null, version: null });
  });

  it("returns null when every path fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(500, {}));
    const result = await fetchAgentCard("https://example.com", "", "fallback-id", fetchImpl);
    expect(result).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("returns null (never rejects) when every path throws", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));
    await expect(fetchAgentCard("https://example.com", "", "fallback-id", fetchImpl)).resolves.toBeNull();
  });
});
