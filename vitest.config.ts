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
//
// `lucide-react` follows the same shape (a real npm package, but not declared
// as a dependency of THIS extension — it resolves only once the monorepo
// hoists it) — aliased to a minimal local stub (not vendored — its surface is
// generic enough to hand-write) so a test can import a2a-server-setup-impl.tsx
// (which uses `LinkIcon`) standalone.
//
// TWO of these entries are the EXCEPTION to "real when resolvable", and are
// stubbed UNCONDITIONALLY (cinatra#2288):
//
//   * `next/navigation` — `useRouter()` is not a thing a unit test can use
//     "for real": outside a mounted Next App Router it throws
//     `invariant expected app router to be mounted`. Inside the monorepo the
//     real module DOES resolve, so the conditional alias stepped aside and
//     every DOM test in this repo died on that invariant — 6 failures that no
//     gate ran, because the monorepo layout is exactly the one this repo's own
//     CI defers to.
//   * `sonner` — the assertions here are `expect(toast.success).toHaveBeenCalled…`
//     against the vi.fn() spies the TEST imports from `./__stubs__/sonner`. If
//     the component under test resolves the real `sonner` instead, it calls a
//     different object and the assertion can only ever be vacuous or red.
//
// Both are test SEAMS, not host code under test: the code actually exercised
// is still the real `@cinatra-ai/sdk-ui` <SearchParamToast> and this repo's
// real flash config.
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

// Always aliased, in BOTH layouts — see the `next/navigation` / `sonner` note
// above.
function alwaysStub(specifier: string, stubFile: string) {
  return { find: specifier, replacement: path.join(stubs, stubFile) };
}

const alias = [
  resolvableOrStub("@cinatra-ai/sdk-extensions/flash-href", "flash-href.ts"),
  resolvableOrStub("@cinatra-ai/sdk-ui/search-param-toast", "search-param-toast.tsx"),
  alwaysStub("next/navigation", "next-navigation.ts"),
  alwaysStub("sonner", "sonner.ts"),
  resolvableOrStub("lucide-react", "lucide-react.tsx"),
].filter((entry): entry is { find: string; replacement: string } => entry !== null);

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/__tests__/**/*.test.ts", "src/__tests__/**/*.test.tsx"],
    exclude: ["**/node_modules/**"],
  },
  resolve: { alias },
});
