// TEST STUB — replaces the real `sonner` package (a peerDependency this
// standalone repo doesn't install; the cinatra host provides the single
// instance at runtime — see flash-href.ts stub comment) with vi.fn() spies so
// search-param-toast.test.tsx can assert on the exact toast variant + message
// fired for each flash code, without a real Toaster/DOM portal.
import { vi } from "vitest";

export const toast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
};

export function __resetSonnerStub() {
  toast.success.mockClear();
  toast.error.mockClear();
  toast.warning.mockClear();
  toast.info.mockClear();
}
