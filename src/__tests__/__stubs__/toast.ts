// TEST STUB — vendored copy of @cinatra-ai/sdk-ui's toast.ts (cinatra main,
// commit 3221c4fb), trimmed of the Copy-action affordance (test-irrelevant)
// but preserving the same `toast.success/error/warning/info` call surface
// SearchParamToast depends on. See __stubs__/flash-href.ts for why this repo
// vendors a stub rather than importing the real host-internal package.
import { toast as sonnerToast } from "sonner";

export const toast = {
  success: (message: string, options?: unknown) => sonnerToast.success(message, options as never),
  error: (message: string, options?: unknown) => sonnerToast.error(message, options as never),
  warning: (message: string, options?: unknown) => sonnerToast.warning(message, options as never),
  info: (message: string, options?: unknown) => sonnerToast.info(message, options as never),
};
