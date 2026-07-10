// @vitest-environment jsdom
//
// DOM render test of the toast state (toast-notifications epic, S3): mounts
// the real <SearchParamToast> island (or, standalone here, its byte-faithful
// vendored stub — see vitest.config.ts + __stubs__/ comments) with THIS
// connector's real A2A_FLASH_TOASTS config, and asserts the exact toast
// variant + static message fires for each of the three codes the setup
// actions emit (added / removed / invalid-url), with zero toast calls when no
// flash code is present.
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import React from "react";

import { SearchParamToast } from "@cinatra-ai/sdk-ui/search-param-toast";
import { toast, __resetSonnerStub } from "./__stubs__/sonner";
import { __resetNavigationStub, __setSearchParams } from "./__stubs__/next-navigation";
import { A2A_FLASH_TOASTS, A2A_NOTICE_MESSAGES, A2A_ERROR_MESSAGES } from "../a2a-flash";

function renderIsland() {
  return render(<SearchParamToast toasts={A2A_FLASH_TOASTS} />);
}

describe("A2A setup — SearchParamToast DOM render", () => {
  afterEach(() => {
    cleanup();
    __resetSonnerStub();
    __resetNavigationStub();
  });

  it("renders nothing visible (island is a null-rendering effect component)", () => {
    const { container } = renderIsland();
    expect(container.innerHTML).toBe("");
  });

  it("fires no toast when the URL carries no flash code", () => {
    __setSearchParams("");
    renderIsland();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.warning).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("?notice=added fires a success toast with the static 'added' message", () => {
    __setSearchParams("notice=added");
    renderIsland();
    expect(toast.success).toHaveBeenCalledWith(
      A2A_NOTICE_MESSAGES.added,
      expect.objectContaining({ id: "search-param-toast:notice:added" }),
    );
    expect(toast.warning).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("?notice=removed fires a warning toast with the static 'removed' message", () => {
    __setSearchParams("notice=removed");
    renderIsland();
    expect(toast.warning).toHaveBeenCalledWith(
      A2A_NOTICE_MESSAGES.removed,
      expect.objectContaining({ id: "search-param-toast:notice:removed" }),
    );
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("?error=invalid-url fires an error toast with the static message", () => {
    __setSearchParams("error=invalid-url");
    renderIsland();
    expect(toast.error).toHaveBeenCalledWith(
      A2A_ERROR_MESSAGES["invalid-url"],
      expect.objectContaining({ id: "search-param-toast:error:invalid-url" }),
    );
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it("a crafted/unknown error code is ignored — never toasted (codes-only protocol)", () => {
    __setSearchParams("error=some-spoofed-link-text");
    renderIsland();
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.warning).not.toHaveBeenCalled();
  });
});
