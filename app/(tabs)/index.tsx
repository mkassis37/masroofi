import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useFinance, formatMoney, type EntryType } from "@/lib/finance-context";

const today = () => new Date().toISOString().slice(0, 10);

function EntryModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { addEntry, accounts, categories } = useFinance();
  const [type, setType] = useState<EntryType>("debit");
  const [accountId, setAccountId] = useState("cash");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [category, setCategory] = useState("other");

  const save = () => {
    const value = Number(amount.replace(",", "."));
    if (!value || value <= 0) return Alert.alert("المبلغ غير صحيح", "اكتب مبلغًا أكبر من صفر.");
    if (!note.trim()) return Alert.alert("أكمل البيان", "اكتب وصفًا مختصرًا للعملية.");
    addEntry({ type, account: accounts.find((account) => account.id === accountId)?.kind ?? "cash", accountId, amount: value, note: note.trim(), date: date || today(), category: type === "credit" ? category : undefined });
    setAmount(""); setNote(""); setDate(today()); setCategory("other"); onClose();
  };

  return <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.modalBackdrop}><View style={styles.modalCard}>
      <View style={styles.modalHeader}><Text style={styles.modalTitle}>إضافة حركة</Text><Pressable onPress={onClose}><Text style={styles.close}>إغلاق</Text></Pressable></View>
      <Text style={styles.label}>نوع العملية</Text>
      <View style={styles.segmentRow}>{([["debit", "مدين · دخل"], ["credit", "دائن · مصروف"]] as [EntryType, string][]).map(([value, label]) => <Pressable key={value} onPress={() => setType(value)} style={[styles.segment, type === value && styles.segmentActive]}><Text style={[styles.segmentText, type === value && styles.segmentTextActive]}>{label}</Text></Pressable>)}</View>
      <Text style={styles.label}>الحساب</Text>
      <View style={styles.accountChoices}>{accounts.map((account) => <Pressable key={account.id} onPress={() => setAccountId(account.id)} style={[styles.accountChoice, accountId === account.id && styles.accountChoiceActive]}><Text style={[styles.accountChoiceText, accountId === account.id && styles.accountChoiceTextActive]}>{account.name}</Text></Pressable>)}</View>
      <Text style={styles.label}>المبلغ</Text><TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#98A2B3" style={styles.input} />
      {type === "credit" && <><Text style={styles.label}>تصنيف المصروف</Text><View style={styles.accountChoices}>{categories.map((item) => <Pressable key={item.id} onPress={() => setCategory(item.id)} style={[styles.accountChoice, category === item.id && styles.accountChoiceActive]}><Text style={[styles.accountChoiceText, category === item.id && styles.accountChoiceTextActive]}>{item.name}</Text></Pressable>)}</View></>}
      <Text style={styles.label}>البيان</Text><TextInput value={note} onChangeText={setNote} placeholder="مثال: مشتريات المنزل" placeholderTextColor="#98A2B3" style={styles.input} />
      <Text style={styles.label}>تاريخ العملية</Text><TextInput value={date} onChangeText={setDate} placeholder="2026-09-02" placeholderTextColor="#98A2B3" style={styles.input} />
      <Pressable onPress={save} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}><Text style={styles.primaryText}>حفظ العملية</Text></Pressable>
    </View></View>
  </Modal>;
}

function TransferModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { accounts, accountBalances, transferBetweenAccounts } = useFinance();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("تحويل بين الحسابات");
  const [date, setDate] = useState(today());
  const [fromId, setFromId] = useState("cash");
  const [toId, setToId] = useState("bank");
  const save = () => {
    const value = Number(amount.replace(",", "."));
    const sourceBalance = accountBalances[fromId] ?? 0;
    if (!value || value <= 0) return Alert.alert("المبلغ غير صحيح", "اكتب مبلغًا أكبر من صفر.");
    if (fromId === toId) return Alert.alert("اختر حسابين مختلفين", "حساب المصدر والوجهة يجب أن يكونا مختلفين.");
    if (value > sourceBalance) return Alert.alert("الرصيد غير كافٍ", `المتاح في الحساب المصدر ${sourceBalance.toFixed(2)}.`);
    transferBetweenAccounts(fromId, toId, value, note.trim() || "تحويل بين الحسابات", date || today());
    setAmount(""); setDate(today()); onClose();
  };
  return <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={styles.modalCard}><View style={styles.modalHeader}><Text style={styles.modalTitle}>تحويل بين الحسابات</Text><Pressable onPress={onClose}><Text style={styles.close}>إغلاق</Text></Pressable></View><Text style={styles.label}>من الحساب</Text><View style={styles.accountChoices}>{accounts.map((account) => <Pressable key={`from-${account.id}`} onPress={() => setFromId(account.id)} style={[styles.accountChoice, fromId === account.id && styles.accountChoiceActive]}><Text style={[styles.accountChoiceText, fromId === account.id && styles.accountChoiceTextActive]}>{account.name}</Text><Text style={styles.accountChoiceBalance}>{(accountBalances[account.id] ?? 0).toFixed(2)}</Text></Pressable>)}</View><Text style={styles.label}>إلى الحساب</Text><View style={styles.accountChoices}>{accounts.map((account) => <Pressable key={`to-${account.id}`} onPress={() => setToId(account.id)} style={[styles.accountChoice, toId === account.id && styles.accountChoiceActive]}><Text style={[styles.accountChoiceText, toId === account.id && styles.accountChoiceTextActive]}>{account.name}</Text></Pressable>)}</View><Text style={styles.label}>المبلغ المحوّل</Text><TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#98A2B3" style={styles.input} /><Text style={styles.label}>البيان</Text><TextInput value={note} onChangeText={setNote} placeholder="سبب التحويل" placeholderTextColor="#98A2B3" style={styles.input} /><Text style={styles.label}>تاريخ العملية</Text><TextInput value={date} onChangeText={setDate} style={styles.input} /><Pressable onPress={save} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}><Text style={styles.primaryText}>تأكيد التحويل</Text></Pressable></View></View></Modal>;
}

export default function HomeScreen() {
  const { cashBalance, bankBalance, totalBalance, entries, accounts, currency } = useFinance();
  const money = (value: number): string => formatMoney(value, currency.symbol);
  const [showAdd, setShowAdd] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  return <ScreenContainer className="px-5 pt-5" containerClassName="bg-background">
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={styles.eyebrow}>دفتر مالي شخصي</Text><Text style={styles.title}>ملخصك اليومي</Text>
      <View style={styles.totalCard}><Text style={styles.totalCaption}>الرصيد الإجمالي</Text><Text style={styles.totalValue}>{money(totalBalance)}</Text><Text style={styles.totalHint}>النقد + البنك</Text></View>
      <View style={styles.balanceRow}><View style={[styles.smallCard, { borderTopColor: "#0F9B8E" }]}><Text style={styles.smallLabel}>النقد المتوفر</Text><Text style={styles.smallValue}>{money(cashBalance)}</Text></View><View style={[styles.smallCard, { borderTopColor: "#17365D" }]}><Text style={styles.smallLabel}>في البنك</Text><Text style={styles.smallValue}>{money(bankBalance)}</Text></View></View>
      <Pressable onPress={() => setShowAdd(true)} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}><Text style={styles.addIcon}>＋</Text><View><Text style={styles.addTitle}>إضافة حركة جديدة</Text><Text style={styles.addSub}>مدين أو دائن · نقدي أو بنكي</Text></View></Pressable>
      <Pressable onPress={() => setShowTransfer(true)} style={({ pressed }) => [styles.transferButton, pressed && styles.pressed]}><Text style={styles.transferIcon}>⇄</Text><View><Text style={styles.transferTitle}>تحويل بين الحسابات</Text><Text style={styles.transferSub}>اختر المصدر والوجهة وتابع الرصيد المتبقي</Text></View></Pressable>
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>آخر العمليات</Text><Text style={styles.count}>{entries.length} عملية</Text></View>
      {entries.length === 0 ? <View style={styles.empty}><Text style={styles.emptyIcon}>دفتر</Text><Text style={styles.emptyTitle}>لا توجد عمليات بعد</Text><Text style={styles.emptyText}>ابدأ بتسجيل أول دخل أو مصروف لتظهر الأرصدة هنا.</Text></View> : entries.slice(0, 5).map((entry) => <View key={entry.id} style={styles.transaction}><View style={[styles.dot, { backgroundColor: entry.type === "debit" ? "#0F9B8E" : "#D95D55" }]} /><View style={styles.transactionInfo}><Text style={styles.transactionNote}>{entry.note}</Text><Text style={styles.transactionMeta}>{entry.date} · {accounts.find((account) => account.id === (entry.accountId ?? entry.account))?.name ?? (entry.account === "cash" ? "نقدي" : "بنكي")}</Text></View><Text style={[styles.transactionAmount, { color: entry.type === "debit" ? "#0F9B8E" : "#D95D55" }]}>{entry.type === "debit" ? "+" : "-"}{money(entry.amount)}</Text></View>)}
    </ScrollView><EntryModal visible={showAdd} onClose={() => setShowAdd(false)} /><TransferModal visible={showTransfer} onClose={() => setShowTransfer(false)} />
  </ScreenContainer>;
}

const styles = StyleSheet.create({ eyebrow: { color: "#0F9B8E", fontSize: 14, fontWeight: "700", textAlign: "right", marginBottom: 5 }, title: { color: "#17212B", fontSize: 30, fontWeight: "800", textAlign: "right", marginBottom: 18 }, totalCard: { backgroundColor: "#17365D", borderRadius: 24, padding: 23, alignItems: "flex-end", marginBottom: 12 }, totalCaption: { color: "#C9D8E8", fontSize: 14 }, totalValue: { color: "#FFFFFF", fontSize: 31, fontWeight: "800", marginTop: 6 }, totalHint: { color: "#9EB5CB", fontSize: 12, marginTop: 5 }, balanceRow: { flexDirection: "row", gap: 10, marginBottom: 18 }, smallCard: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 18, padding: 15, borderTopWidth: 4, alignItems: "flex-end", shadowColor: "#17365D", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }, smallLabel: { color: "#667085", fontSize: 12, marginBottom: 7 }, smallValue: { color: "#17212B", fontSize: 16, fontWeight: "800" },   transferButton: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 14, flexDirection: "row-reverse", alignItems: "center", gap: 12, marginBottom: 25, borderWidth: 1, borderColor: "#D8E2EC" }, transferIcon: { color: "#17365D", fontSize: 26, fontWeight: "700" }, transferTitle: { color: "#17365D", fontSize: 14, fontWeight: "800", textAlign: "right" }, transferSub: { color: "#667085", fontSize: 11, marginTop: 2, textAlign: "right" }, addButton: { backgroundColor: "#0F9B8E", borderRadius: 18, padding: 16, flexDirection: "row-reverse", alignItems: "center", gap: 12, marginBottom: 25 }, addIcon: { color: "#FFFFFF", fontSize: 29, fontWeight: "300" }, addTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", textAlign: "right" }, addSub: { color: "#D5F4EF", fontSize: 12, marginTop: 2, textAlign: "right" }, sectionHeader: { flexDirection: "row-reverse", justifyContent: "space-between", marginBottom: 10 }, sectionTitle: { color: "#17212B", fontSize: 18, fontWeight: "800" }, count: { color: "#667085", fontSize: 12, paddingTop: 4 }, transaction: { backgroundColor: "#FFFFFF", borderRadius: 15, padding: 14, marginBottom: 8, flexDirection: "row-reverse", alignItems: "center", gap: 10 }, dot: { width: 10, height: 10, borderRadius: 5 }, transactionInfo: { flex: 1 }, transactionNote: { color: "#17212B", fontSize: 14, fontWeight: "700", textAlign: "right" }, transactionMeta: { color: "#667085", fontSize: 11, marginTop: 4, textAlign: "right" }, transactionAmount: { fontSize: 13, fontWeight: "800" }, empty: { backgroundColor: "#FFFFFF", padding: 28, borderRadius: 20, alignItems: "center" }, emptyIcon: { color: "#0F9B8E", fontWeight: "800", fontSize: 16 }, emptyTitle: { color: "#17212B", fontWeight: "800", fontSize: 16, marginTop: 9 }, emptyText: { color: "#667085", textAlign: "center", fontSize: 13, marginTop: 6, lineHeight: 20 }, modalBackdrop: { flex: 1, backgroundColor: "rgba(23,54,93,0.38)", justifyContent: "flex-end" }, modalCard: { backgroundColor: "#F6F8FB", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 21, paddingBottom: 30 }, modalHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }, modalTitle: { color: "#17212B", fontSize: 22, fontWeight: "800" }, close: { color: "#0F9B8E", fontWeight: "700" }, label: { color: "#667085", fontSize: 12, fontWeight: "700", textAlign: "right", marginTop: 10, marginBottom: 6 }, segmentRow: { flexDirection: "row-reverse", gap: 8 }, segment: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: "#E8EDF3", alignItems: "center" }, segmentActive: { backgroundColor: "#17365D" }, segmentText: { color: "#667085", fontSize: 13, fontWeight: "700" }, segmentTextActive: { color: "#FFFFFF" }, input: { backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#17212B", fontSize: 16, textAlign: "right", borderWidth: 1, borderColor: "#E1E7EF" },   accountChoices: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6 }, accountChoice: { backgroundColor: "#E8EDF3", borderRadius: 10, padding: 9, minWidth: "30%", alignItems: "flex-end" }, accountChoiceActive: { backgroundColor: "#17365D" }, accountChoiceText: { color: "#667085", fontSize: 12, fontWeight: "700" }, accountChoiceTextActive: { color: "#FFFFFF" }, accountChoiceBalance: { color: "#667085", fontSize: 10, marginTop: 3 }, primaryButton: { backgroundColor: "#0F9B8E", borderRadius: 14, padding: 15, alignItems: "center", marginTop: 18 },   transferHint: { backgroundColor: "#E1F5F1", borderRadius: 13, padding: 13, alignItems: "flex-end" }, transferHintText: { color: "#347D76", fontSize: 12 }, transferBalance: { color: "#0F6E66", fontSize: 13, fontWeight: "800", marginTop: 5 }, primaryText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 }, pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] } });
