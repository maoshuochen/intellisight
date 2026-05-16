import { describe, expect, it } from "vitest";
import { canUseAiModel, getAiConfig, updateAiConfig } from "./aiConfig.js";

describe("aiConfig", () => {
  it("updates runtime provider settings and preserves the current key when omitted", () => {
    updateAiConfig({
      enabled: true,
      apiBase: "https://example.com/v1",
      apiKey: "first-secret",
      model: "first-model"
    });

    updateAiConfig({
      enabled: true,
      apiBase: "https://models.example.org/v1",
      model: "second-model"
    });

    expect(getAiConfig()).toMatchObject({
      enabled: true,
      apiBase: "https://models.example.org/v1",
      apiKey: "first-secret",
      model: "second-model",
      source: "runtime"
    });
    expect(canUseAiModel()).toBe(true);
  });
});
