import { describe, expect, it } from "vitest";
import { formatDate, formatNumber } from "../lib/number-format";

describe("formatNumber", () => {
  it("uses Arabic-Indic digits with three decimals", () => {
    const formatted = formatNumber(1234.5, "ar", "arabic-indic");
    expect(formatted).toMatch(/[٠-٩]/);
    expect(formatted).not.toMatch(/[0-9]/);
    expect(formatted).toContain("٥٠٠");
  });

  it("uses Western digits with three decimals", () => {
    expect(formatNumber(1234.5, "ar", "western")).toBe("1,234.500");
    expect(formatNumber(1234.5, "en", "western")).toBe("1,234.500");
  });

  it("applies the selected digit style to ISO dates", () => {
    expect(formatDate("2026-09-12", "ar", "arabic-indic")).toBe("٢٠٢٦-٠٩-١٢");
    expect(formatDate("2026-09-12", "en", "western")).toBe("2026-09-12");
  });
});
