import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Alert, Platform, Share } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { calculateAccountBalances, calculateBalances } from "./finance-calculations";
import { DEFAULT_CURRENCY, findCurrency, type Currency } from "./currencies";

export type EntryType = "debit" | "credit" | "transfer";
export type Account = "cash" | "bank";
export type AccountKind = "cash" | "bank";
export type FinancialAccount = { id: string; name: string; kind: AccountKind; openingBalance: number; createdAt: number };
export type FinancialEntry = { id: string; type: EntryType; amount: number; account: Account; accountId?: string; fromAccountId?: string; toAccountId?: string; note: string; date: string; category?: string; createdAt: number };
export type ExpenseCategory = { id: string; name: string; color: string };

export const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: "food", name: "طعام", color: "#0F9B8E" },
  { id: "transport", name: "مواصلات", color: "#3B82F6" },
  { id: "bills", name: "فواتير", color: "#C88A16" },
  { id: "shopping", name: "مشتريات", color: "#8B5CF6" },
  { id: "health", name: "صحة", color: "#D95D55" },
  { id: "other", name: "أخرى", color: "#667085" },
];

type FinanceContextValue = {
  entries: FinancialEntry[];
  accounts: FinancialAccount[];
  bankAccounts: FinancialAccount[];
  accountBalances: Record<string, number>;
  openingCash: number;
  openingBank: number;
  cashBalance: number;
  bankBalance: number;
  totalBalance: number;
  loading: boolean;
  categories: ExpenseCategory[];
  addEntry: (entry: Omit<FinancialEntry, "id" | "createdAt">) => void;
  updateEntry: (id: string, patch: Partial<Omit<FinancialEntry, "id" | "createdAt">>) => void;
  deleteEntry: (id: string) => void;
  setOpeningBalances: (cash: number, bank: number) => void;
  addBankAccount: (name: string, openingBalance: number) => void;
  updateAccountOpeningBalance: (accountId: string, amount: number) => void;
  renameBankAccount: (accountId: string, name: string) => void;
  deleteBankAccount: (accountId: string) => boolean;
  transferBetweenAccounts: (fromAccountId: string, toAccountId: string, amount: number, note: string, date: string) => void;
  exportEntries: () => Promise<void>;
  createBackup: () => Promise<void>;
  restoreBackup: () => Promise<void>;
  getBackupPayload: () => string;
  restorePayload: (payload: string) => boolean;
  currency: Currency;
  setCurrency: (code: string) => void;
};

const STORAGE_KEY = "masroofi-finance-v1";
const BACKUP_VERSION = 2;
const defaultBank = (): FinancialAccount => ({ id: "bank", name: "البنك", kind: "bank", openingBalance: 0, createdAt: 0 });
const FinanceContext = createContext<FinanceContextValue | null>(null);

function isValidBackup(value: unknown): value is { entries: FinancialEntry[]; accounts: FinancialAccount[]; currencyCode?: string; categories?: ExpenseCategory[] } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { entries?: unknown; accounts?: unknown };
  if (!Array.isArray(candidate.entries) || !Array.isArray(candidate.accounts)) return false;
  return candidate.entries.every((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const item = entry as Partial<FinancialEntry>;
    return typeof item.id === "string" && ["debit", "credit", "transfer"].includes(item.type ?? "") && Number(item.amount) > 0 && typeof item.note === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date ?? "");
  }) && candidate.accounts.every((account) => {
    if (!account || typeof account !== "object") return false;
    const item = account as Partial<FinancialAccount>;
    return typeof item.id === "string" && typeof item.name === "string" && ["cash", "bank"].includes(item.kind ?? "") && Number.isFinite(Number(item.openingBalance));
  });
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([{ id: "cash", name: "النقد", kind: "cash", openingBalance: 0, createdAt: 0 }, defaultBank()]);
  const [categories, setCategories] = useState<ExpenseCategory[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [currencyCode, setCurrencyCode] = useState(DEFAULT_CURRENCY.code);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<{ entries: FinancialEntry[]; accounts: FinancialAccount[]; categories: ExpenseCategory[]; currencyCode: string; openingCash: number; openingBank: number }>;
      const legacyAccounts: FinancialAccount[] = [{ id: "cash", name: "النقد", kind: "cash", openingBalance: Number(saved.openingCash) || 0, createdAt: 0 }, { ...defaultBank(), openingBalance: Number(saved.openingBank) || 0 }];
      setAccounts(saved.accounts?.length ? saved.accounts : legacyAccounts);
      setEntries((saved.entries ?? []).map((entry) => ({ ...entry, accountId: entry.accountId ?? (entry.account === "cash" ? "cash" : "bank"), category: entry.category ?? (entry.type === "credit" ? "other" : undefined) })));
      setCategories(saved.categories?.length ? saved.categories : DEFAULT_CATEGORIES);
      setCurrencyCode(saved.currencyCode ?? DEFAULT_CURRENCY.code);
    }).catch(() => undefined).finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (!loading) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ entries, accounts, categories, currencyCode })).catch(() => undefined); }, [entries, accounts, categories, currencyCode, loading]);

  const accountBalances = useMemo(() => calculateAccountBalances(entries, accounts.map(({ id, kind, openingBalance }) => ({ id, kind, openingBalance }))), [entries, accounts]);
  const cashBalance = accountBalances.cash ?? 0;
  const bankAccounts = accounts.filter((account) => account.kind === "bank");
  const bankBalance = bankAccounts.reduce((sum, account) => sum + (accountBalances[account.id] ?? 0), 0);
  const totalBalance = Object.values(accountBalances).reduce((sum, value) => sum + value, 0);

  const value = useMemo<FinanceContextValue>(() => ({
    entries, accounts, bankAccounts, accountBalances, categories, currency: findCurrency(currencyCode), openingCash: accounts.find((a) => a.id === "cash")?.openingBalance ?? 0, openingBank: accounts.find((a) => a.id === "bank")?.openingBalance ?? 0, cashBalance, bankBalance, totalBalance, loading,
    addEntry: (entry) => setEntries((current) => [{ ...entry, id: `${Date.now()}-${Math.random()}`, createdAt: Date.now() }, ...current]),
    updateEntry: (id, patch) => setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, ...patch } : entry)),
    deleteEntry: (id) => setEntries((current) => current.filter((entry) => entry.id !== id)),
    setOpeningBalances: (cash, bank) => setAccounts((current) => current.map((account) => account.id === "cash" ? { ...account, openingBalance: cash } : account.id === "bank" ? { ...account, openingBalance: bank } : account)),
    addBankAccount: (name, openingBalance) => { const cleanName = name.trim(); if (!cleanName || !Number.isFinite(openingBalance) || openingBalance < 0) return; setAccounts((current) => [...current, { id: `bank-${Date.now()}`, name: cleanName, kind: "bank", openingBalance, createdAt: Date.now() }]); },
    updateAccountOpeningBalance: (accountId, amount) => setAccounts((current) => current.map((account) => account.id === accountId ? { ...account, openingBalance: Math.max(0, amount) } : account)),
    renameBankAccount: (accountId, name) => { const cleanName = name.trim(); if (!cleanName) return; setAccounts((current) => current.map((account) => account.id === accountId && account.kind === "bank" ? { ...account, name: cleanName } : account)); },
    deleteBankAccount: (accountId) => { if (accountId === "bank" || entries.some((entry) => entry.accountId === accountId || entry.fromAccountId === accountId || entry.toAccountId === accountId)) return false; setAccounts((current) => current.filter((account) => account.id !== accountId)); return true; },
    transferBetweenAccounts: (fromAccountId, toAccountId, amount, note, date) => { if (fromAccountId === toAccountId || amount <= 0 || !note.trim()) return; setEntries((current) => [{ id: `${Date.now()}-${Math.random()}`, type: "transfer", amount, account: accounts.find((account) => account.id === fromAccountId)?.kind ?? "cash", accountId: fromAccountId, fromAccountId, toAccountId, note: note.trim(), date, createdAt: Date.now() }, ...current]); },
    setCurrency: (code) => setCurrencyCode(findCurrency(code).code),
    exportEntries: async () => { const header = "التاريخ,النوع,الحساب,التصنيف,البيان,المبلغ"; const rows = entries.map((entry) => `${entry.date},${entry.type === "debit" ? "مدين" : entry.type === "credit" ? "دائن" : "تحويل"},${accounts.find((account) => account.id === (entry.accountId ?? entry.account))?.name ?? entry.account},${categories.find((category) => category.id === entry.category)?.name ?? "-"},${entry.note.replace(/,/g, " ")},${entry.amount.toFixed(2)}`); await Share.share({ title: "سجل مصروفي", message: [header, ...rows].join("\n") }); },
    getBackupPayload: () => JSON.stringify({ schemaVersion: BACKUP_VERSION, exportedAt: new Date().toISOString(), entries, accounts, categories, currencyCode }),
    restorePayload: (text) => { try { const parsed = JSON.parse(text) as unknown; if (!isValidBackup(parsed)) return false; const backup = parsed as { entries: FinancialEntry[]; accounts: FinancialAccount[]; categories?: ExpenseCategory[]; currencyCode?: string }; setEntries(backup.entries); setAccounts(backup.accounts); setCategories(backup.categories?.length ? backup.categories : DEFAULT_CATEGORIES); setCurrencyCode(backup.currencyCode ?? DEFAULT_CURRENCY.code); return true; } catch { return false; } },
    createBackup: async () => {
      const payload = JSON.stringify({ schemaVersion: BACKUP_VERSION, exportedAt: new Date().toISOString(), entries, accounts, categories, currencyCode }, null, 2);
      try {
        if (Platform.OS === "web") { await Share.share({ title: "نسخة مصروفي الاحتياطية", message: payload }); return; }
        const uri = `${FileSystem.cacheDirectory}masroofi-backup-${new Date().toISOString().slice(0, 10)}.json`;
        await FileSystem.writeAsStringAsync(uri, payload, { encoding: FileSystem.EncodingType.UTF8 });
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: "حفظ نسخة مصروفي الاحتياطية" });
        else await Share.share({ title: "نسخة مصروفي الاحتياطية", message: payload });
      } catch { Alert.alert("تعذر إنشاء النسخة", "تحقق من مساحة الجهاز وحاول مرة أخرى."); }
    },
    restoreBackup: async () => {
      try {
        await AsyncStorage.setItem(`${STORAGE_KEY}-pre-restore`, JSON.stringify({ schemaVersion: BACKUP_VERSION, exportedAt: new Date().toISOString(), entries, accounts, categories, currencyCode }));
        const result = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true });
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        const text = Platform.OS === "web" && asset.file ? await asset.file.text() : await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
        const parsed = JSON.parse(text) as unknown;
        if (!isValidBackup(parsed)) { Alert.alert("ملف غير صالح", "هذا الملف ليس نسخة احتياطية صحيحة من مصروفي."); return; }
        Alert.alert("استعادة البيانات؟", "سيتم استبدال البيانات الحالية بعد التأكيد.", [{ text: "إلغاء", style: "cancel" }, { text: "استعادة", style: "destructive", onPress: () => { const restored = JSON.stringify(parsed); if (value.restorePayload(restored)) Alert.alert("تمت الاستعادة", "تم استرجاع سجلاتك بنجاح."); } }]);
      } catch { Alert.alert("تعذر الاستعادة", "تأكد من اختيار ملف JSON صالح ثم حاول مرة أخرى."); }
    },
  }), [entries, accounts, bankAccounts, accountBalances, categories, cashBalance, bankBalance, totalBalance, loading, currencyCode]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() { const context = useContext(FinanceContext); if (!context) throw new Error("useFinance must be used inside FinanceProvider"); return context; }
export function formatMoney(value: number, symbol = "د.أ") { return `${value.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`; }
export function typeLabel(type: EntryType) { return type === "debit" ? "مدين" : type === "credit" ? "دائن" : "تحويل"; }
export { calculateBalances };
