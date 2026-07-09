// TEST STUB — vendored copy of @cinatra-ai/sdk-ui's search-param-toast.tsx
// (cinatra main, commit 3221c4fb). See __stubs__/flash-href.ts for why this
// repo vendors a stub of this host-internal package for its own standalone
// test run rather than importing the real one.
"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { toast } from "./toast";

export type SearchParamToastConfig = {
  param: string;
  value?: string;
  message: string;
  variant?: "success" | "error" | "info" | "warning";
};

export function SearchParamToast({ toasts }: { toasts: SearchParamToastConfig[] }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const handledKey = useRef<string | null>(null);

  useEffect(() => {
    const matched = toasts.filter((entry) => {
      const raw = searchParams.get(entry.param);
      if (raw === null) return false;
      return entry.value === undefined ? raw.length > 0 : raw === entry.value;
    });

    if (matched.length === 0) {
      handledKey.current = null;
      return;
    }

    const key = searchParams.toString();
    if (handledKey.current === key) return;
    handledKey.current = key;

    for (const entry of matched) {
      const variant = entry.variant ?? "success";
      toast[variant](entry.message, {
        id: `search-param-toast:${entry.param}:${entry.value ?? "*"}`,
      });
    }

    const next = new URLSearchParams(searchParams.toString());
    for (const entry of matched) next.delete(entry.param);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [toasts, searchParams, pathname, router]);

  return null;
}
