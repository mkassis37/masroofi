import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CURRENCIES, findCurrency } from "@/lib/currencies";
import { useI18n } from "@/lib/i18n";

type CurrencyUsage = Record<string, { count: number; lastUsed: number }>;

const USAGE_KEY = "masroofi.currency-usage.v1";

type CurrencyDropdownProps = {
  value: string;
  onChange: (code: string) => void;
  allowAll?: boolean;
  label?: string;
};

export function CurrencyDropdown({ value, onChange, allowAll = false, label }: CurrencyDropdownProps) {
  const [open, setOpen] = useState(false);
  const [usage, setUsage] = useState<CurrencyUsage>({});
  const { t, currencyName } = useI18n();
  const selectedCurrency = findCurrency(value);
  const selectedLabel = value === "all" ? t("كل العملات", "All currencies") : `${currencyName(value, selectedCurrency.name)} (${value})`;

  useEffect(() => {
    AsyncStorage.getItem(USAGE_KEY).then((stored) => {
      if (!stored) return;
      try {
        setUsage(JSON.parse(stored) as CurrencyUsage);
      } catch {
        setUsage({});
      }
    });
  }, []);

  const options = useMemo(() => {
    const sorted = [...CURRENCIES].sort((a, b) => {
      const usageA = usage[a.code] ?? { count: 0, lastUsed: 0 };
      const usageB = usage[b.code] ?? { count: 0, lastUsed: 0 };
      return usageB.count - usageA.count || usageB.lastUsed - usageA.lastUsed;
    }).map((item) => ({ code: item.code, label: `${currencyName(item.code, item.name)} (${item.code})` }));
    return allowAll ? [{ code: "all", label: t("كل العملات", "All currencies") }, ...sorted] : sorted;
  }, [allowAll, usage, currencyName, t]);

  const choose = (code: string) => {
    if (code !== "all") {
      const nextUsage = {
        ...usage,
        [code]: { count: (usage[code]?.count ?? 0) + 1, lastUsed: Date.now() },
      };
      setUsage(nextUsage);
      AsyncStorage.setItem(USAGE_KEY, JSON.stringify(nextUsage)).catch(() => undefined);
    }
    onChange(code);
    setOpen(false);
  };

  return <>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <Pressable onPress={() => setOpen(true)} style={styles.trigger} accessibilityRole="button" accessibilityLabel={label ?? t("اختيار العملة", "Choose currency")}>
      <Text style={styles.triggerText}>{selectedLabel}</Text>
      <Text style={styles.chevron}>⌄</Text>
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>{t("اختر العملة", "Select currency")}</Text>
          <Text style={styles.hint}>{t("الأكثر استخدامًا تظهر أولًا", "Most used currencies appear first")}</Text>
          <ScrollView style={styles.list}>{options.map((option) => <Pressable key={option.code} onPress={() => choose(option.code)} style={[styles.option, value === option.code && styles.optionActive]}><Text style={[styles.optionText, value === option.code && styles.optionTextActive]}>{option.label}</Text>{value === option.code ? <Text style={styles.check}>✓</Text> : null}</Pressable>)}</ScrollView>
        </View>
      </Pressable>
    </Modal>
  </>;
}

const styles = StyleSheet.create({ label: { color: "#667085", fontSize: 12, fontWeight: "700", textAlign: "right", marginTop: 10, marginBottom: 6 }, trigger: { backgroundColor: "#FFFFFF", borderColor: "#E1E7EF", borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }, triggerText: { color: "#17212B", fontSize: 13, fontWeight: "700", textAlign: "right", flex: 1 }, chevron: { color: "#0F9B8E", fontSize: 20, fontWeight: "800", marginLeft: 8 }, backdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.35)", justifyContent: "flex-end" }, sheet: { backgroundColor: "#F6F8FB", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, maxHeight: "72%" }, title: { color: "#17365D", fontSize: 18, fontWeight: "800", textAlign: "right", marginBottom: 2 }, hint: { color: "#667085", fontSize: 11, textAlign: "right", marginBottom: 12 }, list: { maxHeight: 430 }, option: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 13, marginBottom: 7, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#E1E7EF" }, optionActive: { backgroundColor: "#0F9B8E", borderColor: "#0F9B8E" }, optionText: { color: "#17212B", fontSize: 13, fontWeight: "700", textAlign: "right" }, optionTextActive: { color: "#FFFFFF" }, check: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" } });
