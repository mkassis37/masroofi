import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Share } from "react-native";
import { calculateAccountBalances, calculateBalances } from "./finance-calculations";

export type EntryType = "debit" | "credit" | "transfer";
export type Account = "cash" | "bank";
export type AccountKind = "cash" | "bank";
export type FinancialAccount = { id: string; name: string; kind: AccountKind; openingBalance: number; createdAt: number };
export type FinancialEntry = { id: string; type: EntryType; amount: number; account: Account; accountId?: string; fromAccountId?: string; toAccountId?: string; note: string; date: string; createdAt: number };

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
  addEntry: (entry: Omit<FinancialEntry, "id" | "createdAt">) => void;
  deleteEntry: (id: string) => void;
  setOpeningBalances: (cash: number, bank: number) => void;
  addBankAccount: (name: string, openingBalance: number) => void;
  updateAccountOpeningBalance: (accountId: string, amount: number) => void;
  transferBetweenAccounts: (fromAccountId: string, toAccountId: string, amount: number, note: string, date: string) => void;
  exportEntries: () => Promise<void>;
};

const STORAGE_KEY = "masroofi-finance-v1";
const defaultBank = (): FinancialAccount => ({ id: "bank", name: "البنك", kind: "bank", openingBalance: 0, createdAt: 0 });
const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([{ id: "cash", name: "النقد", kind: "cash", openingBalance: 0, createdAt: 0 }, defaultBank()]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      const saved = JSON.parse(raw);
      const legacyAccounts: FinancialAccount[] = [{ id: "cash", name: "النقد", kind: "cash", openingBalance: Number(saved.openingCash) || 0, createdAt: 0 }, { ...defaultBank(), openingBalance: Number(saved.openingBank) || 0 }];
      setAccounts(saved.accounts?.length ? saved.accounts : legacyAccounts);
      setEntries((saved.entries ?? []).map((entry: FinancialEntry) => ({ ...entry, accountId: entry.accountId ?? (entry.account === "cash" ? "cash" : "bank") })));
    }).catch(() => undefined).finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (!loading) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ entries, accounts })).catch(() => undefined); }, [entries, accounts, loading]);

  const accountBalances = useMemo(() => calculateAccountBalances(entries, accounts.map(({ id, kind, openingBalance }) => ({ id, kind, openingBalance }))), [entries, accounts]);
  const cashBalance = accountBalances.cash ?? 0;
  const bankAccounts = accounts.filter((account) => account.kind === "bank");
  const bankBalance = bankAccounts.reduce((sum, account) => sum + (accountBalances[account.id] ?? 0), 0);
  const totalBalance = Object.values(accountBalances).reduce((sum, value) => sum + value, 0);

  const value = useMemo<FinanceContextValue>(() => ({
    entries, accounts, bankAccounts, accountBalances, openingCash: accounts.find((a) => a.id === "cash")?.openingBalance ?? 0, openingBank: accounts.find((a) => a.id === "bank")?.openingBalance ?? 0, cashBalance, bankBalance, totalBalance, loading,
    addEntry: (entry) => setEntries((current) => [{ ...entry, id: `${Date.now()}-${Math.random()}`, createdAt: Date.now() }, ...current]),
    deleteEntry: (id) => setEntries((current) => current.filter((entry) => entry.id !== id)),
    setOpeningBalances: (cash, bank) => setAccounts((current) => current.map((account) => account.id === "cash" ? { ...account, openingBalance: cash } : account.id === "bank" ? { ...account, openingBalance: bank } : account)),
    addBankAccount: (name, openingBalance) => { const cleanName = name.trim(); if (!cleanName) return; setAccounts((current) => [...current, { id: `bank-${Date.now()}`, name: cleanName, kind: "bank", openingBalance, createdAt: Date.now() }]); },
    updateAccountOpeningBalance: (accountId, amount) => setAccounts((current) => current.map((account) => account.id === accountId ? { ...account, openingBalance: amount } : account)),
    transferBetweenAccounts: (fromAccountId, toAccountId, amount, note, date) => { if (fromAccountId === toAccountId || amount <= 0) return; setEntries((current) => [{ id: `${Date.now()}-${Math.random()}`, type: "transfer", amount, account: accounts.find((account) => account.id === fromAccountId)?.kind ?? "cash", accountId: fromAccountId, fromAccountId, toAccountId, note, date, createdAt: Date.now() }, ...current]); },
    exportEntries: async () => { const header = "التاريخ,النوع,الحساب,البيان,المبلغ"; const rows = entries.map((entry) => `${entry.date},${entry.type === "debit" ? "مدين" : entry.type === "credit" ? "دائن" : "تحويل"},${accounts.find((account) => account.id === (entry.accountId ?? entry.account))?.name ?? entry.account},${entry.note.replace(/,/g, " ")},${entry.amount.toFixed(2)}`); await Share.share({ title: "سجل مصروفي", message: [header, ...rows].join("\n") || header }); },
  }), [entries, accounts, bankAccounts, accountBalances, cashBalance, bankBalance, totalBalance, loading]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() { const context = useContext(FinanceContext); if (!context) throw new Error("useFinance must be used inside FinanceProvider"); return context; }
export function formatMoney(value: number, symbol = "ر.س") { return `${value.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`; }
export function typeLabel(type: EntryType) { return type === "debit" ? "مدين" : type === "credit" ? "دائن" : "تحويل"; }
export { calculateBalances };
