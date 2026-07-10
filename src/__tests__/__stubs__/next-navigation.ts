// TEST STUB — a minimal controllable stand-in for next/navigation's
// useSearchParams/usePathname/useRouter, aliased in vitest.config.ts so
// search-param-toast.test.tsx can drive SearchParamToast's client-side
// wiring without a real Next.js router context (this repo has no Next
// runtime installed standalone — see flash-href.ts stub comment).
import { useSyncExternalStore } from "react";

let current = new URLSearchParams();
const pathname = "/connectors/cinatra-ai/a2a-server-connector/setup";
let replaceCalls: string[] = [];
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

export function __setSearchParams(qs: string) {
  current = new URLSearchParams(qs);
  notify();
}

export function __getReplaceCalls(): string[] {
  return replaceCalls;
}

export function __resetNavigationStub() {
  current = new URLSearchParams();
  replaceCalls = [];
}

export function useSearchParams() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
}

export function usePathname() {
  return pathname;
}

export function useRouter() {
  return {
    replace: (url: string) => {
      replaceCalls.push(url);
      const [, qs] = url.split("?");
      current = new URLSearchParams(qs ?? "");
      notify();
    },
  };
}
