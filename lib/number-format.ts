export type NumberStyle = "arabic-indic" | "western";

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function formatDigits(value: string | number, numberStyle: NumberStyle) {
  const text = String(value);
  if (numberStyle === "western") {
    return text.replace(/[٠-٩]/g, (digit) => String(ARABIC_INDIC_DIGITS.indexOf(digit)));
  }
  return text.replace(/[0-9]/g, (digit) => ARABIC_INDIC_DIGITS[Number(digit)]);
}

export function normalizeDigits(value: string) {
  return value.replace(/[٠-٩]/g, (digit) => String(ARABIC_INDIC_DIGITS.indexOf(digit)));
}

export function formatDate(value: string | number | Date, language: "ar" | "en", numberStyle: NumberStyle) {
  const raw = value instanceof Date ? value.toISOString() : String(value);
  const dateText = /^\d{4}(?:-\d{2})?(?:-\d{2})?$/.test(raw) ? raw : new Date(value).toLocaleDateString(language === "en" ? "en-US" : "ar-JO");
  return formatDigits(dateText, numberStyle);
}

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
