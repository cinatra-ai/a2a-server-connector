// TEST STUB — vendored copy of @cinatra-ai/sdk-extensions's flash-href.ts
// (cinatra main, commit 3221c4fb). @cinatra-ai/sdk-extensions is a
// host-internal package this repo declares as an OPTIONAL peerDependency (see
// package.json + .github/workflows/ci.yml) — it is not resolvable from a
// standalone `pnpm install` here, so it can't be imported directly by a test
// that runs in THIS repo's own vitest (CI skips standalone install/test for
// that reason; the cinatra monorepo runs these tests for real against the
// real package when it workspace-links this repo). This stub is aliased in
// via vitest.config.ts ONLY for this repo's local test run and must be kept
// byte-faithful to the upstream source — re-vendor if flash-href.ts changes.
export type FlashParams = {
  notice?: string;
  error?: string;
};

const SENTINEL_ORIGIN = "http://flashhref.invalid";
const ABSOLUTE_URL = /^[a-z][a-z0-9+.-]*:\/\//i;

export function flashHref(base: string, params: FlashParams = {}): string {
  const isAbsolute = ABSOLUTE_URL.test(base);
  const url = new URL(base, SENTINEL_ORIGIN);

  if (params.notice !== undefined) url.searchParams.set("notice", params.notice);
  if (params.error !== undefined) url.searchParams.set("error", params.error);

  return isAbsolute ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
}
