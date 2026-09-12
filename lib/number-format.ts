export type NumberStyle = "arabic-indic" | "western";

export function formatNumber(
  value: number,
  language: "ar" | "en" = "ar",
  numberStyle: NumberStyle = language === "ar" ? "arabic-indic" : "western",
) {
  const locale = numberStyle === "arabic-indic" ? "ar-SA" : "en-US";
  return value.toLocaleString(locale, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}
