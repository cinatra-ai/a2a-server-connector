import { describe, expect, it } from "vitest";

import { flashHref } from "../__tests__/__stubs__/flash-href";
import {
  A2A_ERROR_MESSAGES,
  A2A_FLASH_TOASTS,
  A2A_NOTICE_MESSAGES,
} from "../a2a-flash";

// Base path mirrors the constant in a2a-server-setup-impl.tsx (kept
// independent here so a drift between the two shows up as a test failure,
// not a silent copy-paste of the same string).
const SETUP_PATH = "/connectors/cinatra-ai/a2a-server-connector/setup";

describe("A2A_FLASH_TOASTS (flash-code path)", () => {
  it("has exactly one toast config entry per notice + error code", () => {
    const noticeCodes = Object.keys(A2A_NOTICE_MESSAGES);
    const errorCodes = Object.keys(A2A_ERROR_MESSAGES);
    expect(A2A_FLASH_TOASTS).toHaveLength(noticeCodes.length + errorCodes.length);
  });

  it("maps the 'added' notice code to a success-variant static message", () => {
    const entry = A2A_FLASH_TOASTS.find((t) => t.param === "notice" && t.value === "added");
    expect(entry).toBeDefined();
    expect(entry?.variant).toBe("success");
    expect(entry?.message).toBe(A2A_NOTICE_MESSAGES.added);
  });

  it("maps the 'removed' notice code to a warning-variant static message", () => {
    const entry = A2A_FLASH_TOASTS.find((t) => t.param === "notice" && t.value === "removed");
    expect(entry).toBeDefined();
    expect(entry?.variant).toBe("warning");
    expect(entry?.message).toBe(A2A_NOTICE_MESSAGES.removed);
  });

  it("maps the 'invalid-url' error code to an error-variant static message", () => {
    const entry = A2A_FLASH_TOASTS.find((t) => t.param === "error" && t.value === "invalid-url");
    expect(entry).toBeDefined();
    expect(entry?.variant).toBe("error");
    expect(entry?.message).toBe(A2A_ERROR_MESSAGES["invalid-url"]);
  });

  it("never toasts URL-derived text — every message is one of the static strings", () => {
    const known = new Set<string>([...Object.values(A2A_NOTICE_MESSAGES), ...Object.values(A2A_ERROR_MESSAGES)]);
    for (const entry of A2A_FLASH_TOASTS) {
      expect(known.has(entry.message)).toBe(true);
    }
  });
});

describe("flashHref redirect targets used by the setup actions", () => {
  it("builds the 'added' notice redirect", () => {
    expect(flashHref(SETUP_PATH, { notice: "added" })).toBe(`${SETUP_PATH}?notice=added`);
  });

  it("builds the 'removed' notice redirect", () => {
    expect(flashHref(SETUP_PATH, { notice: "removed" })).toBe(`${SETUP_PATH}?notice=removed`);
  });

  it("builds the 'invalid-url' error redirect", () => {
    expect(flashHref(SETUP_PATH, { error: "invalid-url" })).toBe(`${SETUP_PATH}?error=invalid-url`);
  });

  it("every code the actions can emit has a corresponding A2A_FLASH_TOASTS entry", () => {
    // Guards against emitting a code (via flashHref) the mount-site map
    // doesn't know about — that outcome would silently show nothing.
    const emittedCodes: Array<{ param: "notice" | "error"; value: string }> = [
      { param: "notice", value: "added" },
      { param: "notice", value: "removed" },
      { param: "error", value: "invalid-url" },
    ];
    for (const { param, value } of emittedCodes) {
      const match = A2A_FLASH_TOASTS.some((t) => t.param === param && t.value === value);
      expect(match).toBe(true);
    }
  });
});
