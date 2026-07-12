// TEST STUB — minimal stand-in for `lucide-react`, aliased in vitest.config.ts
// ONLY for this repo's local standalone test run (see that file's comment).
// `lucide-react` is a real npm package resolvable once the cinatra monorepo
// hoists it; this repo doesn't declare it as its own dependency, so it can't
// be `require.resolve`d standalone. Unlike the other stubs here this one is
// NOT a byte-faithful vendor copy — every lucide icon component is a
// decorative `<svg>` wrapper with the same generic prop surface (forwards
// `className`/`aria-*`/etc., renders nothing semantically meaningful), so one
// tiny icon factory stands in for each named export a connector source
// imports. Add a new `export const <Name> = makeIcon("<Name>");` line here
// if a future change imports another lucide icon.
import * as React from "react";

function makeIcon(name: string) {
  const Icon = (props: React.SVGProps<SVGSVGElement>) =>
    React.createElement("svg", { "data-lucide-icon-stub": name, ...props });
  Icon.displayName = `LucideIconStub(${name})`;
  return Icon;
}

export const LinkIcon = makeIcon("LinkIcon");
