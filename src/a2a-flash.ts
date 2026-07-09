// -----------------------------------------------------------------------------
// A2A server setup — codes-only flash protocol (toast-notifications epic,
// cinatra-ai/cinatra#1107 S3). The "use server" actions in
// ./a2a-server-setup-impl redirect back to this page carrying an outcome CODE
// (`?notice=<code>` / `?error=<code>`); the <SearchParamToast> island mounted
// there maps each code to a STATIC, server-trusted message here — it NEVER
// toasts URL-derived text (a crafted `?error=<spoofed link>` maps to no entry
// and is ignored). This module is the single source of truth so the action
// emitters and the mount-site message map cannot drift.
// -----------------------------------------------------------------------------

import type { SearchParamToastConfig } from "@cinatra-ai/sdk-ui/search-param-toast";

export const A2A_NOTICE_MESSAGES = {
  added: "A2A server connected and agent template created.",
  removed: "Connection removed.",
} as const;

export const A2A_ERROR_MESSAGES = {
  "invalid-url": "Invalid URL — must start with http:// or https://.",
} as const;

export type A2ANoticeCode = keyof typeof A2A_NOTICE_MESSAGES;
export type A2AErrorCode = keyof typeof A2A_ERROR_MESSAGES;

// One <SearchParamToast> config entry per code, mounted in
// a2a-server-setup-impl.tsx.
export const A2A_FLASH_TOASTS: SearchParamToastConfig[] = [
  {
    param: "notice",
    value: "added" satisfies A2ANoticeCode,
    message: A2A_NOTICE_MESSAGES.added,
    variant: "success",
  },
  {
    param: "notice",
    value: "removed" satisfies A2ANoticeCode,
    message: A2A_NOTICE_MESSAGES.removed,
    variant: "warning",
  },
  ...(Object.entries(A2A_ERROR_MESSAGES) as [A2AErrorCode, string][]).map(
    ([code, message]) => ({
      param: "error" as const,
      value: code,
      message,
      variant: "error" as const,
    }),
  ),
];
