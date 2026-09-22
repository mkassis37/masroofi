import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "@/lib/i18n";

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function parseIso(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date();
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function toIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const monthNames = {
  ar: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};
const weekNames = { ar: ["ح", "ن", "ث", "ر", "خ", "ج", "س"], en: ["S", "M", "T", "W", "T", "F", "S"] };

export function DatePickerField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const { language, t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [cursor, setCursor] = useState(() => parseIso(value));
  const selected = parseIso(value || todayIso());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = useMemo(() => Array.from({ length: firstDay + daysInMonth }, (_, index) => index < firstDay ? null : index - firstDay + 1), [firstDay, daysInMonth]);
  const open = () => { setCursor(selected); setVisible(true); };
  const choose = (day: number) => { onChange(toIso(new Date(year, month, day))); setVisible(false); };
  const shiftMonth = (offset: number) => setCursor(new Date(year, month + offset, 1));
  const isSelected = (day: number) => day === selected.getDate() && month === selected.getMonth() && year === selected.getFullYear();
  const isToday = (day: number) => toIso(new Date(year, month, day)) === todayIso();

  return <>
    <Text style={styles.label}>{label}</Text>
    <Pressable onPress={open} style={styles.field} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={styles.calendarIcon}>▣</Text><Text style={styles.value}>{value || todayIso()}</Text><Text style={styles.hint}>{t("اختيار من التقويم", "Choose from calendar")}</Text>
    </Pressable>
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <View style={styles.backdrop}><View style={styles.calendarCard}>
        <View style={styles.header}><Pressable onPress={() => setVisible(false)}><Text style={styles.close}>{t("إغلاق", "Close")}</Text></Pressable><Text style={styles.title}>{t("اختيار التاريخ", "Choose date")}</Text><View style={styles.headerSpacer} /></View>
        <View style={styles.monthHeader}><Pressable onPress={() => shiftMonth(language === "ar" ? 1 : -1)} style={styles.arrow}><Text style={styles.arrowText}>{language === "ar" ? "›" : "‹"}</Text></Pressable><Text style={styles.monthTitle}>{monthNames[language][month]} {year}</Text><Pressable onPress={() => shiftMonth(language === "ar" ? -1 : 1)} style={styles.arrow}><Text style={styles.arrowText}>{language === "ar" ? "‹" : "›"}</Text></Pressable></View>
        <View style={styles.weekRow}>{weekNames[language].map((day, index) => <Text key={`${day}-${index}`} style={styles.weekDay}>{day}</Text>)}</View>
        <View style={styles.grid}>{days.map((day, index) => day === null ? <View key={`blank-${index}`} style={styles.dayCell} /> : <Pressable key={day} onPress={() => choose(day)} style={[styles.dayCell, isSelected(day) && styles.selectedDay, isToday(day) && !isSelected(day) && styles.todayDay]}><Text style={[styles.dayText, isSelected(day) && styles.selectedDayText, isToday(day) && !isSelected(day) && styles.todayText]}>{day}</Text></Pressable>)}</View>
        <Pressable onPress={() => { onChange(todayIso()); setCursor(new Date()); setVisible(false); }} style={styles.todayButton}><Text style={styles.todayButtonText}>{t("اليوم", "Today")}</Text></Pressable>
      </View></View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({ backdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.42)", justifyContent: "center", padding: 20 }, calendarCard: { backgroundColor: "#F6F8FB", borderRadius: 24, padding: 18, maxWidth: 420, width: "100%", alignSelf: "center" }, header: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }, title: { color: "#17212B", fontSize: 20, fontWeight: "800" }, close: { color: "#0F9B8E", fontWeight: "700" }, headerSpacer: { width: 45 }, monthHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }, monthTitle: { color: "#17365D", fontSize: 16, fontWeight: "800" }, arrow: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#E8EDF3", alignItems: "center", justifyContent: "center" }, arrowText: { color: "#17365D", fontSize: 25, lineHeight: 28 }, weekRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 6 }, weekDay: { width: "14.28%", textAlign: "center", color: "#667085", fontSize: 12, fontWeight: "800" }, grid: { flexDirection: "row", flexWrap: "wrap" }, dayCell: { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 12 }, dayText: { color: "#17212B", fontSize: 14 }, selectedDay: { backgroundColor: "#0F9B8E" }, selectedDayText: { color: "#FFFFFF", fontWeight: "800" }, todayDay: { borderWidth: 1, borderColor: "#0F9B8E" }, todayText: { color: "#0F9B8E", fontWeight: "800" }, todayButton: { marginTop: 14, backgroundColor: "#17365D", borderRadius: 12, padding: 12, alignItems: "center" }, todayButtonText: { color: "#FFFFFF", fontWeight: "800" }, label: { color: "#667085", fontSize: 12, fontWeight: "700", textAlign: "right", marginTop: 10, marginBottom: 6 }, field: { backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: "#E1E7EF", flexDirection: "row-reverse", alignItems: "center", gap: 8 }, calendarIcon: { color: "#0F9B8E", fontSize: 16 }, value: { flex: 1, color: "#17212B", fontSize: 16, textAlign: "right" }, hint: { color: "#98A2B3", fontSize: 10 }, });
