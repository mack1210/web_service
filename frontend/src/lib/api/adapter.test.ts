import { describe, expect, it } from "vitest";

import { getSampleApi } from "./adapter";

describe("mock API adapter", () => {
  it("filters the same contract consumed by the HTTP adapter", async () => {
    const response = await getSampleApi().listSamples({ q: "inventory", sort: "title" });
    expect(response.total).toBe(1);
    expect(response.items[0]?.id).toBe("inventory-reconciliation");
    expect(response.partial).toBe(true);
  });

  it("returns a structured action result", async () => {
    const response = await getSampleApi().runAction("pipeline-drift-monitor", { action: "validate", force_failure: false });
    expect(response.status).toBe("succeeded");
    expect(response.result).toHaveProperty("validated_records");
  });

  it("preserves a not-found status for the detail recovery state", async () => {
    await expect(getSampleApi().getSample("missing")).rejects.toMatchObject({
      name: "RequestError",
      status: 404,
    });
  });
});
