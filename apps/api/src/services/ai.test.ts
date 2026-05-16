import { describe, expect, it } from "vitest";
import { fallbackCluster, fallbackRecommend, improveText } from "./ai.js";

describe("AI fallbacks", () => {
  it("returns bounded code recommendations without a model", () => {
    const result = fallbackRecommend("I lose context when moving quotes into spreadsheets", [
      { id: "11111111-1111-4111-8111-111111111111", name: "Context loss" },
      { id: "22222222-2222-4222-8222-222222222222", name: "Export workflow" }
    ]);

    expect(result.degraded).toBe(true);
    expect(result.recommendations).toHaveLength(2);
    expect(result.recommendations[0]?.score).toBeGreaterThanOrEqual(result.recommendations[1]?.score ?? 0);
  });

  it("clusters canvas nodes into named fallback groups", () => {
    const result = fallbackCluster([
      { id: "n1", label: "Quote source tracking" },
      { id: "n2", label: "Theme comparison friction" }
    ]);

    expect(result.degraded).toBe(true);
    expect(Object.keys(result.groups).length).toBeGreaterThan(0);
  });

  it("cleans text when the model is unavailable", async () => {
    const result = await improveText("  transcript   spacing  ", "correct");

    expect(result.degraded).toBe(true);
    expect(result.text).toBe("transcript spacing");
    expect(result.reason).toContain("fallback");
  });
});
