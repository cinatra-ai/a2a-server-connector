import { defineConfig } from "vitest/config";
import * as path from "node:path";
import { createRequire } from "node:module";

// Test-only fallback aliases for packages this repo can't resolve standalone.
//
// This repo declares @cinatra-ai/sdk-extensions + @cinatra-ai/sdk-ui as
// OPTIONAL peerDependencies (see package.json + .github/workflows/ci.yml) —
// they're host-internal packages that live only in the cinatra monorepo,
// which is also where this repo's tests run for real once the monorepo
// workspace-links this package (CI here SKIPS standalone install/test for
// exactly that reason). `sonner` (sdk-ui's own peerDependency) and
// `next/navigation` (the host's router, real only inside a Next app) are
// unresolvable standalone for the same reason.
//
// To let THIS repo's own `vitest run` still exercise the toast-migration
// wiring (a2a-server-setup-impl.tsx -> SearchParamToast / flashHref) without
// those installed, each entry below aliases to a byte-faithful vendored stub
// under src/__tests__/__stubs__/ (see that directory's file comments for
// provenance + re-vendor instructions) — but ONLY when the real specifier
// fails to resolve. Inside the cinatra monorepo, where every one of these IS
// resolvable via the workspace, resolution succeeds and no alias applies, so
// the monorepo's test run exercises the real host code, never a stub.
const stubs = path.join(__dirname, "src/__tests__/__stubs__");
const require = createRequire(import.meta.url);

function resolvableOrStub(specifier: string, stubFile: string) {
  try {
    require.resolve(specifier);
    return null;
  } catch {
    return { find: specifier, replacement: path.join(stubs, stubFile) };
  }
}

const alias = [
  resolvableOrStub("@cinatra-ai/sdk-extensions/flash-href", "flash-href.ts"),
  resolvableOrStub("@cinatra-ai/sdk-ui/search-param-toast", "search-param-toast.tsx"),
  resolvableOrStub("next/navigation", "next-navigation.ts"),
  resolvableOrStub("sonner", "sonner.ts"),
].filter((entry): entry is { find: string; replacement: string } => entry !== null);

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/__tests__/**/*.test.ts", "src/__tests__/**/*.test.tsx"],
    exclude: ["**/node_modules/**"],
  },
  resolve: { alias },
});
