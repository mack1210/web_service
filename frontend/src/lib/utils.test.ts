import { describe, expect, it } from "vitest";

import { cn, formatPercent } from "./utils";

describe("display helpers", () => {
  it("joins only truthy class fragments", () => {
    expect(cn("base", false, undefined, "active")).toBe("base active");
  });

  it("formats a fraction as a percentage", () => {
    expect(formatPercent(0.992)).toBe("99.2%");
  });
});
