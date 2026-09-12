import type { AppLanguage, NumberStyle } from "./app-preferences";

export type CloudPreferenceSnapshot = {
  language: AppLanguage;
  numberStyle: NumberStyle;
  updatedAt: number;
};

export function isCloudPreferenceSnapshot(value: unknown): value is CloudPreferenceSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CloudPreferenceSnapshot>;
  return (candidate.language === "ar" || candidate.language === "en") &&
    (candidate.numberStyle === "arabic-indic" || candidate.numberStyle === "western") &&
    Number.isFinite(candidate.updatedAt) && Number(candidate.updatedAt) >= 0;
}

export function compareCloudPreferences(local: CloudPreferenceSnapshot, remote: CloudPreferenceSnapshot) {
  if (local.language === remote.language && local.numberStyle === remote.numberStyle && local.updatedAt === remote.updatedAt) return "same" as const;
  return remote.updatedAt > local.updatedAt ? "cloud-newer" as const : "device-newer" as const;
}
