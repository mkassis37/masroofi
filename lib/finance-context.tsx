import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { calculateBalances } from "./finance-calculations";
import { Share } from "react-native";

export type EntryType = "debit" | "credit" | "transfer";
export type Account = "cash" | "bank";

export type FinancialEntry = {
  id: string;
  type: EntryType;
  amount: number;
  account: Account;
  note: string;
  date: string;
  createdAt: number;
};

type FinanceContextValue = {
  entries: FinancialEntry[];
  openingCash: number;
  openingBank: number;
  cashBalance: number;
  bankBalance: number;
  totalBalance: number;
  loading: boolean;
  addEntry: (entry: Omit<FinancialEntry, "id" | "createdAt">) => void;
  deleteEntry: (id: string) => void;
  setOpeningBalances: (cash: number, bank: number) => void;
  exportEntries: () => Promise<void>;
};

const STORAGE_KEY = "masroofi-finance-v1";
const defaultData = { entries: [] as FinancialEntry[], openingCash: 0, openingBank: 0 };
const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [openingCash, setOpeningCash] = useState(0);
  const [openingBank, setOpeningBank] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        setEntries(saved.entries ?? []);
        setOpeningCash(Number(saved.openingCash) || 0);
        setOpeningBank(Number(saved.openingBank) || 0);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ entries, openingCash, openingBank })).catch(() => undefined);
  }, [entries, openingCash, openingBank, loading]);

  const balances = useMemo(() => calculateBalances(entries, openingCash, openingBank), [entries, openingCash, openingBank]);

  const value = useMemo<FinanceContextValue>(() => ({
    entries,
    openingCash,
    openingBank,
    cashBalance: balances.cash,
    bankBalance: balances.bank,
    totalBalance: balances.total,
    loading,
    addEntry: (entry) => setEntries((current) => [{ ...entry, id: `${Date.now()}-${Math.random()}`, createdAt: Date.now() }, ...current]),
    deleteEntry: (id) => setEntries((current) => current.filter((entry) => entry.id !== id)),
    setOpeningBalances: (cash, bank) => { setOpeningCash(cash); setOpeningBank(bank); },
    exportEntries: async () => {
      const header = "التاريخ,النوع,الحساب,البيان,المبلغ";
      const rows = entries.map((entry) => `${entry.date},${entry.type === "debit" ? "مدين" : entry.type === "credit" ? "دائن" : "تحويل"},${entry.account === "cash" ? "نقدي" : "بنكي"},${entry.note.replace(/,/g, " ")},${entry.amount.toFixed(2)}`);
      await Share.share({ title: "سجل مصروفي", message: [header, ...rows].join("\n") || header });
    },
  }), [entries, openingCash, openingBank, balances, loading]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) throw new Error("useFinance must be used inside FinanceProvider");
  return context;
}

export function formatMoney(value: number) {
  return `${value.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
}

export function typeLabel(type: EntryType) {
  return type === "debit" ? "مدين" : type === "credit" ? "دائن" : "تحويل للبنك";
}

export { defaultData, calculateBalances };
