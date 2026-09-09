import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CURRENCIES, findCurrency } from "@/lib/currencies";

type CurrencyDropdownProps = {
  value: string;
  onChange: (code: string) => void;
  allowAll?: boolean;
  label?: string;
};

export function CurrencyDropdown({ value, onChange, allowAll = false, label }: CurrencyDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const selectedLabel = value === "all" ? "كل العملات" : `${findCurrency(value).name} (${value})`;
  const options = allowAll ? [{ code: "all", label: "كل العملات" }, ...CURRENCIES.map((item) => ({ code: item.code, label: `${item.name} (${item.code})` }))] : CURRENCIES.map((item) => ({ code: item.code, label: `${item.name} (${item.code})` }));
  return <>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <Pressable onPress={() => setOpen(true)} style={styles.trigger}><Text style={styles.triggerText}>{selectedLabel}</Text><Text style={styles.chevron}>⌄</Text></Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable style={styles.backdrop} onPress={() => setOpen(false)}><View style={styles.sheet} onStartShouldSetResponder={() => true}><Text style={styles.title}>اختر العملة</Text><ScrollView style={styles.list}>{options.map((option) => <Pressable key={option.code} onPress={() => { onChange(option.code); setOpen(false); }} style={[styles.option, value === option.code && styles.optionActive]}><Text style={[styles.optionText, value === option.code && styles.optionTextActive]}>{option.label}</Text>{value === option.code ? <Text style={styles.check}>✓</Text> : null}</Pressable>)}</ScrollView></View></Pressable>
    </Modal>
  </>;
}

import React from "react";

const styles = StyleSheet.create({ label: { color: "#667085", fontSize: 12, fontWeight: "700", textAlign: "right", marginTop: 10, marginBottom: 6 }, trigger: { backgroundColor: "#FFFFFF", borderColor: "#E1E7EF", borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }, triggerText: { color: "#17212B", fontSize: 13, fontWeight: "700", textAlign: "right", flex: 1 }, chevron: { color: "#0F9B8E", fontSize: 20, fontWeight: "800", marginLeft: 8 }, backdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.35)", justifyContent: "flex-end" }, sheet: { backgroundColor: "#F6F8FB", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, maxHeight: "72%" }, title: { color: "#17365D", fontSize: 18, fontWeight: "800", textAlign: "right", marginBottom: 12 }, list: { maxHeight: 430 }, option: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 13, marginBottom: 7, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#E1E7EF" }, optionActive: { backgroundColor: "#0F9B8E", borderColor: "#0F9B8E" }, optionText: { color: "#17212B", fontSize: 13, fontWeight: "700", textAlign: "right" }, optionTextActive: { color: "#FFFFFF" }, check: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" } });
