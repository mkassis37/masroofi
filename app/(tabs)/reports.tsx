import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { formatMoney, useFinance } from "@/lib/finance-context";
import { CURRENCIES } from "@/lib/currencies";
import { CurrencyDropdown } from "@/components/currency-dropdown";
import { generateAndSharePdf } from "@/lib/pdf-reports";
import { useI18n } from "@/lib/i18n";
import { formatDigits } from "@/lib/number-format";

function totalsByCurrency(
  entries: { type: string; amount: number; currencyCode?: string }[],
  type: string,
) {
  return entries
    .filter((entry) => entry.type === type)
    .reduce<Record<string, number>>((totals, entry) => {
      const code = entry.currencyCode ?? "JOD";
      totals[code] = (totals[code] ?? 0) + entry.amount;
      return totals;
    }, {});
}

export default function ReportsScreen() {
  const { entries, currency, categories } = useFinance();
  const { t, language, numberStyle } = useI18n();
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [currencyFilter, setCurrencyFilter] = useState(currency.code);
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const currentYear = now.getFullYear().toString();
  const visible = useMemo(
    () =>
      entries.filter((entry) => {
        const inPeriod =
          period === "month"
            ? entry.date.startsWith(currentMonth)
            : entry.date.startsWith(currentYear);
        const inCurrency =
          currencyFilter === "all" ||
          (entry.currencyCode ?? currency.code) === currencyFilter;
        return inPeriod && inCurrency;
      }),
    [entries, period, currentMonth, currentYear, currencyFilter, currency.code],
  );
  const income = totalsByCurrency(visible, "debit");
  const expense = totalsByCurrency(visible, "credit");
  const currencyCodes = Array.from(
    new Set([...Object.keys(income), ...Object.keys(expense)]),
  );
  const selectedCurrency = currencyFilter === "all" ? null : currencyFilter;
  const money = (value: number, code = selectedCurrency ?? currency.code) =>
    formatMoney(
      value,
      CURRENCIES.find((item) => item.code === code)?.symbol ?? currency.symbol,
      language,
      numberStyle,
    );
  const totalFor = (totals: Record<string, number>) =>
    Object.values(totals).reduce((sum, value) => sum + value, 0);
  const cashExpense = visible
    .filter((e) => e.type === "credit" && e.account === "cash")
    .reduce<Record<string, number>>((totals, entry) => {
      const code = entry.currencyCode ?? currency.code;
      totals[code] = (totals[code] ?? 0) + entry.amount;
      return totals;
    }, {});
  const bankExpense = visible
    .filter((e) => e.type === "credit" && e.account !== "cash")
    .reduce<Record<string, number>>((totals, entry) => {
      const code = entry.currencyCode ?? currency.code;
      totals[code] = (totals[code] ?? 0) + entry.amount;
      return totals;
    }, {});
  const categoryTotals = categories
    .map((category) => ({
      ...category,
      totals: totalsByCurrency(
        visible.filter((entry) => entry.category === category.id),
        "credit",
      ),
    }))
    .filter((category) =>
      Object.values(category.totals).some((value) => value > 0),
    );
  const exportPdf = () =>
    generateAndSharePdf(
      period === "month"
        ? t("التقرير الشهري", "Monthly report")
        : t("التقرير السنوي", "Annual report"),
      period === "month"
        ? `${t("الفترة", "Period")}: ${formatDigits(currentMonth, numberStyle)}`
        : `${t("السنة", "Year")}: ${formatDigits(currentYear, numberStyle)}`,
      visible,
      currency.symbol,
      language,
      numberStyle,
    );
  return (
    <ScreenContainer className="px-5 pt-5">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        <Text style={styles.eyebrow}>{t("صورة أوضح لأموالك")}</Text>
        <Text style={styles.title}>{t("التقارير")}</Text>
        <View style={styles.periods}>
          <Pressable
            onPress={() => setPeriod("month")}
            style={[styles.period, period === "month" && styles.active]}
          >
            <Text
              style={[
                styles.periodText,
                period === "month" && styles.activeText,
              ]}
            >
              {t("هذا الشهر")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setPeriod("year")}
            style={[styles.period, period === "year" && styles.active]}
          >
            <Text
              style={[
                styles.periodText,
                period === "year" && styles.activeText,
              ]}
            >
              {t("هذه السنة")}
            </Text>
          </Pressable>
        </View>
        <CurrencyDropdown
          label={t("عملة التقرير", "Report currency")}
          value={currencyFilter}
          onChange={setCurrencyFilter}
          allowAll
        />
        <Pressable
          onPress={exportPdf}
          style={({ pressed }) => [
            styles.pdfButton,
            pressed && { opacity: 0.75 },
          ]}
        >
          <Text style={styles.pdfButtonText}>
            {t("إنشاء ومشاركة PDF")}{" "}
            {period === "month" ? t("للشهر") : t("للسنة")}
          </Text>
        </Pressable>
        {currencyCodes.length === 0 ? (
          <View style={styles.noData}>
            <Text style={styles.noDataText}>
              {t(
                "لا توجد عمليات ضمن الفترة والعملة المحددة.",
                "No transactions for the selected period and currency.",
              )}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.summary}>
              <View style={styles.summaryItem}>
                <Text style={styles.label}>{t("الدخل / مدين")}</Text>
                {Object.entries(income).map(([code, value]) => (
                  <Text key={code} style={[styles.value, { color: "#0F9B8E" }]}>
                    {money(value, code)} · {code}
                  </Text>
                ))}
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryItem}>
                <Text style={styles.label}>{t("المصروف / دائن")}</Text>
                {Object.entries(expense).map(([code, value]) => (
                  <Text key={code} style={[styles.value, { color: "#D95D55" }]}>
                    -{money(value, code)} · {code}
                  </Text>
                ))}
              </View>
            </View>
            <Text style={styles.section}>{t("توزيع المصروفات")}</Text>
            <View style={styles.card}>
              <View style={styles.line}>
                <Text style={styles.lineValue}>
                  {Object.entries(cashExpense)
                    .map(([code, value]) => `${money(value, code)} · ${code}`)
                    .join("\n") || "-"}
                </Text>
                <Text style={styles.lineLabel}>{t("مصروف نقدي")}</Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${totalFor(expense) ? Math.min(100, (totalFor(cashExpense) / totalFor(expense)) * 100) : 0}%`,
                      backgroundColor: "#0F9B8E",
                    },
                  ]}
                />
              </View>
              <View style={styles.line}>
                <Text style={styles.lineValue}>
                  {Object.entries(bankExpense)
                    .map(([code, value]) => `${money(value, code)} · ${code}`)
                    .join("\n") || "-"}
                </Text>
                <Text style={styles.lineLabel}>{t("مصروف بنكي")}</Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${totalFor(expense) ? Math.min(100, (totalFor(bankExpense) / totalFor(expense)) * 100) : 0}%`,
                      backgroundColor: "#17365D",
                    },
                  ]}
                />
              </View>
            </View>
            <View style={styles.categoryCard}>
              <Text style={styles.categoryTitle}>{t("نسبة كل تصنيف")}</Text>
              {categoryTotals.map((category) => (
                <View key={category.id} style={styles.categoryRow}>
                  <View style={styles.categoryTextWrap}>
                    <Text style={styles.categoryName}>
                      {category.icon} {category.name}
                    </Text>
                    <Text style={styles.categoryAmount}>
                      {Object.entries(category.totals)
                        .map(
                          ([code, value]) =>
                            `${money(value, code)} · ${formatDigits(totalFor(expense) ? Math.round((value / (expense[code] || 1)) * 100) : 0, numberStyle)}%`,
                        )
                        .join(" | ")}
                    </Text>
                  </View>
                  <View style={styles.categoryTrack}>
                    <View
                      style={[
                        styles.categoryFill,
                        {
                          width: `${totalFor(expense) ? Math.min(100, (totalFor(category.totals) / totalFor(expense)) * 100) : 0}%`,
                          backgroundColor: category.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
            <View style={styles.insight}>
              <Text style={styles.insightTitle}>{t("صافي الفترة")}</Text>
              {currencyCodes.map((code) => (
                <Text key={code} style={styles.insightValue}>
                  {money((income[code] ?? 0) - (expense[code] ?? 0), code)} ·{" "}
                  {code}
                </Text>
              ))}
              <Text style={styles.insightText}>
                {t(
                  "المدين ناقص الدائن لكل عملة، دون احتساب التحويلات بين الحسابات.",
                )}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  eyebrow: {
    color: "#0F9B8E",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
  },
  title: {
    color: "#17212B",
    fontSize: 30,
    fontWeight: "800",
    textAlign: "right",
    marginTop: 4,
    marginBottom: 18,
  },
  periods: {
    flexDirection: "row-reverse",
    backgroundColor: "#E8EDF3",
    padding: 4,
    borderRadius: 13,
    marginBottom: 10,
  },
  period: { flex: 1, padding: 10, alignItems: "center", borderRadius: 10 },
  active: { backgroundColor: "#FFFFFF" },
  periodText: { color: "#667085", fontWeight: "700" },
  activeText: { color: "#17365D" },
  pdfButton: {
    backgroundColor: "#17365D",
    borderRadius: 13,
    padding: 13,
    alignItems: "center",
    marginBottom: 15,
  },
  pdfButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  summary: {
    flexDirection: "row-reverse",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    alignItems: "flex-start",
  },
  summaryItem: { flex: 1, alignItems: "flex-end" },
  label: { color: "#667085", fontSize: 12 },
  value: { fontSize: 14, fontWeight: "800", marginTop: 7, textAlign: "right" },
  divider: {
    width: 1,
    height: 38,
    backgroundColor: "#E1E7EF",
    marginHorizontal: 12,
  },
  section: {
    color: "#17212B",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "right",
    marginTop: 25,
    marginBottom: 10,
  },
  card: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 18 },
  line: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  lineLabel: { color: "#17212B", fontWeight: "700" },
  lineValue: { color: "#667085", fontSize: 12, textAlign: "left" },
  track: {
    height: 9,
    backgroundColor: "#EDF1F5",
    borderRadius: 8,
    marginBottom: 17,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 8 },
  insight: {
    backgroundColor: "#E1F5F1",
    borderRadius: 18,
    padding: 18,
    alignItems: "flex-end",
    marginTop: 14,
  },
  insightTitle: { color: "#0F6E66", fontSize: 13, fontWeight: "700" },
  insightValue: {
    color: "#0F6E66",
    fontSize: 20,
    fontWeight: "800",
    marginVertical: 4,
  },
  insightText: { color: "#347D76", fontSize: 11, textAlign: "right" },
  categoryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginTop: 14,
  },
  categoryTitle: {
    color: "#17212B",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 14,
  },
  categoryRow: { marginBottom: 13 },
  categoryTextWrap: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryName: { color: "#17212B", fontWeight: "700" },
  categoryAmount: {
    color: "#667085",
    fontSize: 11,
    textAlign: "right",
    flex: 1,
  },
  categoryTrack: {
    height: 9,
    backgroundColor: "#EDF1F5",
    borderRadius: 8,
    marginTop: 7,
    overflow: "hidden",
  },
  categoryFill: { height: "100%", borderRadius: 8 },
  noData: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 24,
    marginTop: 15,
  },
  noDataText: { color: "#667085", textAlign: "right" },
});
