import { describe, expect, it } from "vitest";
import { compareCloudPreferences, isCloudPreferenceSnapshot } from "../lib/cloud-preferences";

describe("cloud preferences", () => {
  it("accepts only supported language, number style, and timestamp values", () => {
    expect(isCloudPreferenceSnapshot({ language: "ar", numberStyle: "arabic-indic", updatedAt: 10 })).toBe(true);
    expect(isCloudPreferenceSnapshot({ language: "fr", numberStyle: "western", updatedAt: 10 })).toBe(false);
    expect(isCloudPreferenceSnapshot({ language: "en", numberStyle: "arabic-indic", updatedAt: -1 })).toBe(false);
  });

  it("prefers the newer side and detects identical snapshots", () => {
    const local = { language: "ar" as const, numberStyle: "arabic-indic" as const, updatedAt: 10 };
    expect(compareCloudPreferences(local, { ...local })).toBe("same");
    expect(compareCloudPreferences(local, { language: "en", numberStyle: "western", updatedAt: 11 })).toBe("cloud-newer");
    expect(compareCloudPreferences({ ...local, updatedAt: 12 }, { language: "en", numberStyle: "western", updatedAt: 11 })).toBe("device-newer");
  });
});
