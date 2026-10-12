import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Alert, Platform, Share } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {
  calculateAccountBalances,
  calculateAccountBalancesByCurrency,
  calculateBalances,
  calculateCurrencyTotals,
} from "./finance-calculations";
import { DEFAULT_CURRENCY, findCurrency, type Currency } from "./currencies";
import { useAppPreferences } from "./app-preferences";
import { translate } from "./i18n";
import { formatDate, formatNumber } from "./number-format";

export type EntryType = "debit" | "credit" | "transfer";
export type Account = "cash" | "bank";
export type AccountKind = "cash" | "bank";
export type FinancialAccount = {
  id: string;
  name: string;
  kind: AccountKind;
  openingBalance: number;
  openingBalances?: Record<string, number>;
  createdAt: number;
};
export type FinancialEntry = {
  id: string;
  type: EntryType;
  amount: number;
  account: Account;
  accountId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  note: string;
  date: string;
  category?: string;
  currencyCode?: string;
  createdAt: number;
};
export type ExpenseCategory = {
  id: string;
  name: string;
  color: string;
  icon: string;
};
export type YearRollover = {
  id: string;
  year: number;
  cashBalance: number;
  bankBalance: number;
  totalBalance: number;
  cashBalances?: Record<string, number>;
  bankBalances?: Record<string, number>;
  totalBalances?: Record<string, number>;
  createdAt: number;
};

export const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: "food", name: "طعام", color: "#0F9B8E", icon: "●" },
  { id: "transport", name: "مواصلات", color: "#3B82F6", icon: "◆" },
  { id: "bills", name: "فواتير", color: "#C88A16", icon: "▣" },
  { id: "shopping", name: "مشتريات", color: "#8B5CF6", icon: "✦" },
  { id: "health", name: "صحة", color: "#D95D55", icon: "★" },
  { id: "other", name: "أخرى", color: "#667085", icon: "◉" },
];

type FinanceContextValue = {
  entries: FinancialEntry[];
  accounts: FinancialAccount[];
  bankAccounts: FinancialAccount[];
  accountBalances: Record<string, number>;
  accountBalancesByCurrency: Record<string, Record<string, number>>;
  currencyTotals: Record<string, number>;
  openingCash: number;
  openingBank: number;
  cashBalance: number;
  bankBalance: number;
  totalBalance: number;
  loading: boolean;
  categories: ExpenseCategory[];
  addEntry: (entry: Omit<FinancialEntry, "id" | "createdAt">) => void;
  updateEntry: (
    id: string,
    patch: Partial<Omit<FinancialEntry, "id" | "createdAt">>,
  ) => void;
  deleteEntry: (id: string) => void;
  setOpeningBalances: (cash: number, bank: number) => void;
  addBankAccount: (name: string, openingBalance: number) => void;
  updateAccountOpeningBalance: (accountId: string, amount: number) => void;
  renameBankAccount: (accountId: string, name: string) => void;
  deleteBankAccount: (accountId: string) => boolean;
  transferBetweenAccounts: (
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    note: string,
    date: string,
    currencyCode?: string,
  ) => void;
  exportEntries: () => Promise<void>;
  createBackup: () => Promise<void>;
  restoreBackup: () => Promise<void>;
  getBackupPayload: () => string;
  restorePayload: (payload: string) => boolean;
  currency: Currency;
  setCurrency: (code: string) => void;
  addCategory: (name: string, color: string, icon: string) => void;
  deleteCategory: (categoryId: string) => boolean;
  yearlyRollovers: YearRollover[];
  rolloverYear: (year: number) => void;
};

const STORAGE_KEY = "masroofi-finance-v1";
const BACKUP_VERSION = 2;
const defaultBank = (): FinancialAccount => ({
  id: "bank",
  name: "البنك",
  kind: "bank",
  openingBalance: 0,
  openingBalances: {},
  createdAt: 0,
});
const defaultCash = (): FinancialAccount => ({
  id: "cash",
  name: "النقد",
  kind: "cash",
  openingBalance: 0,
  openingBalances: {},
  createdAt: 0,
});

function normalizeAccount(
  account: FinancialAccount,
  defaultCurrencyCode: string,
): FinancialAccount {
  const openingBalances = { ...(account.openingBalances ?? {}) };
  if (
    Object.keys(openingBalances).length === 0 &&
    Number.isFinite(account.openingBalance)
  )
    openingBalances[defaultCurrencyCode] = Number(account.openingBalance) || 0;
  return {
    ...account,
    openingBalance:
      typeof openingBalances[defaultCurrencyCode] === "number"
        ? openingBalances[defaultCurrencyCode]
        : Number(account.openingBalance) || 0,
    openingBalances,
  };
}

function normalizeEntry(
  entry: FinancialEntry,
  defaultCurrencyCode: string,
): FinancialEntry {
  return {
    ...entry,
    amount: Number(entry.amount),
    accountId: entry.accountId ?? (entry.account === "cash" ? "cash" : "bank"),
    currencyCode: entry.currencyCode ?? defaultCurrencyCode,
    category: entry.category ?? (entry.type === "credit" ? "other" : undefined),
  };
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidAmount(value: number) {
  return Number.isFinite(value) && value > 0;
}

function csvEscape(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function accountLabel(
  entry: FinancialEntry,
  accounts: FinancialAccount[],
  language: "ar" | "en",
) {
  if (entry.type === "transfer") {
    const from =
      accounts.find((account) => account.id === entry.fromAccountId)?.name ??
      translate("غير معروف", language, "Unknown");
    const to =
      accounts.find((account) => account.id === entry.toAccountId)?.name ??
      translate("غير معروف", language, "Unknown");
    return `${from} → ${to}`;
  }
  return (
    accounts.find(
      (account) => account.id === (entry.accountId ?? entry.account),
    )?.name ??
    (entry.account === "cash"
      ? translate("نقدي", language, "Cash")
      : translate("بنكي", language, "Bank"))
  );
}
const FinanceContext = createContext<FinanceContextValue | null>(null);

function isValidBackup(value: unknown): value is {
  entries: FinancialEntry[];
  accounts: FinancialAccount[];
  categories?: ExpenseCategory[];
  currencyCode?: string;
  yearlyRollovers?: YearRollover[];
} {
  if (!value || typeof value !== "object") return false;
  const candidate = value as {
    entries?: unknown;
    accounts?: unknown;
    currencyCode?: unknown;
    yearlyRollovers?: unknown;
  };
  if (!Array.isArray(candidate.entries) || !Array.isArray(candidate.accounts))
    return false;
  if (
    candidate.currencyCode !== undefined &&
    typeof candidate.currencyCode !== "string"
  )
    return false;
  return (
    candidate.entries.every((entry) => {
      if (!entry || typeof entry !== "object") return false;
      const item = entry as Partial<FinancialEntry>;
      return (
        typeof item.id === "string" &&
        ["debit", "credit", "transfer"].includes(item.type ?? "") &&
        Number.isFinite(Number(item.amount)) &&
        Number(item.amount) > 0 &&
        typeof item.note === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(item.date ?? "") &&
        (item.currencyCode === undefined ||
          typeof item.currencyCode === "string")
      );
    }) &&
    candidate.accounts.every((account) => {
      if (!account || typeof account !== "object") return false;
      const item = account as Partial<FinancialAccount>;
      return (
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        ["cash", "bank"].includes(item.kind ?? "") &&
        Number.isFinite(Number(item.openingBalance)) &&
        (item.openingBalances === undefined ||
          (typeof item.openingBalances === "object" &&
            Object.values(item.openingBalances).every((amount) =>
              Number.isFinite(Number(amount)),
            )))
      );
    })
  );
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const {
    language,
    numberStyle,
    updatedAt: preferencesUpdatedAt,
  } = useAppPreferences();
  const t = (ar: string, en?: string) => translate(ar, language, en);
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([
    defaultCash(),
    defaultBank(),
  ]);
  const [categories, setCategories] =
    useState<ExpenseCategory[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [currencyCode, setCurrencyCode] = useState(DEFAULT_CURRENCY.code);
  const [yearlyRollovers, setYearlyRollovers] = useState<YearRollover[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<{
          entries: FinancialEntry[];
          accounts: FinancialAccount[];
          categories: ExpenseCategory[];
          currencyCode: string;
          openingCash: number;
          openingBank: number;
          yearlyRollovers: YearRollover[];
        }>;
        const legacyAccounts: FinancialAccount[] = [
          {
            id: "cash",
            name: "النقد",
            kind: "cash",
            openingBalance: Number(saved.openingCash) || 0,
            createdAt: 0,
          },
          { ...defaultBank(), openingBalance: Number(saved.openingBank) || 0 },
        ];
        const loadedCurrency = saved.currencyCode ?? DEFAULT_CURRENCY.code;
        setAccounts(
          (saved.accounts?.length ? saved.accounts : legacyAccounts).map(
            (account) => normalizeAccount(account, loadedCurrency),
          ),
        );
        setEntries(
          (saved.entries ?? []).map((entry) =>
            normalizeEntry(entry, loadedCurrency),
          ),
        );
        setCategories(
          saved.categories?.length ? saved.categories : DEFAULT_CATEGORIES,
        );
        setCurrencyCode(saved.currencyCode ?? DEFAULT_CURRENCY.code);
        setYearlyRollovers(saved.yearlyRollovers ?? []);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading)
      AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          entries,
          accounts,
          categories,
          currencyCode,
          yearlyRollovers,
        }),
      ).catch(() => undefined);
  }, [entries, accounts, categories, currencyCode, yearlyRollovers, loading]);

  const balanceAccounts = accounts.map(
    ({ id, kind, openingBalance, openingBalances }) => ({
      id,
      kind,
      openingBalance,
      openingBalances,
    }),
  );
  const accountBalancesByCurrency = useMemo(
    () =>
      calculateAccountBalancesByCurrency(
        entries,
        balanceAccounts,
        currencyCode,
      ),
    [entries, accounts, currencyCode],
  );
  const accountBalances = useMemo(
    () =>
      accountBalancesByCurrency[currencyCode] ??
      Object.fromEntries(accounts.map((account) => [account.id, 0])),
    [accountBalancesByCurrency, accounts, currencyCode],
  );
  const currencyTotals = useMemo(
    () => calculateCurrencyTotals(accountBalancesByCurrency),
    [accountBalancesByCurrency],
  );
  const cashBalance = accountBalances.cash ?? 0;
  const bankAccounts = accounts.filter((account) => account.kind === "bank");
  const bankBalance = bankAccounts.reduce(
    (sum, account) => sum + (accountBalances[account.id] ?? 0),
    0,
  );
  const totalBalance = cashBalance + bankBalance;

  const value = useMemo<FinanceContextValue>(
    () => ({
      entries,
      accounts,
      bankAccounts,
      accountBalances,
      accountBalancesByCurrency,
      currencyTotals,
      categories,
      currency: findCurrency(currencyCode),
      openingCash: accounts.find((a) => a.id === "cash")?.openingBalance ?? 0,
      openingBank: accounts.find((a) => a.id === "bank")?.openingBalance ?? 0,
      cashBalance,
      bankBalance,
      totalBalance,
      loading,
      addEntry: (entry) => {
        if (
          !isValidAmount(entry.amount) ||
          !entry.note.trim() ||
          !isValidDate(entry.date) ||
          !accounts.some(
            (account) => account.id === (entry.accountId ?? entry.account),
          )
        )
          return;
        setEntries((current) => [
          {
            ...entry,
            currencyCode: findCurrency(entry.currencyCode ?? currencyCode).code,
            id: `${Date.now()}-${Math.random()}`,
            createdAt: Date.now(),
          },
          ...current,
        ]);
      },
      updateEntry: (id, patch) =>
        setEntries((current) =>
          current.map((entry) =>
            entry.id === id &&
            isValidAmount(patch.amount ?? entry.amount) &&
            Boolean((patch.note ?? entry.note).trim()) &&
            isValidDate(patch.date ?? entry.date)
              ? { ...entry, ...patch, amount: patch.amount ?? entry.amount }
              : entry,
          ),
        ),
      deleteEntry: (id) =>
        setEntries((current) => current.filter((entry) => entry.id !== id)),
      setOpeningBalances: (cash, bank) =>
        setAccounts((current) =>
          current.map((account) =>
            account.id === "cash"
              ? {
                  ...account,
                  openingBalance:
                    currencyCode === DEFAULT_CURRENCY.code
                      ? Math.max(0, Number.isFinite(cash) ? cash : 0)
                      : account.openingBalance,
                  openingBalances: {
                    ...(account.openingBalances ?? {}),
                    [currencyCode]: Math.max(
                      0,
                      Number.isFinite(cash) ? cash : 0,
                    ),
                  },
                }
              : account.id === "bank"
                ? {
                    ...account,
                    openingBalance:
                      currencyCode === DEFAULT_CURRENCY.code
                        ? Math.max(0, Number.isFinite(bank) ? bank : 0)
                        : account.openingBalance,
                    openingBalances: {
                      ...(account.openingBalances ?? {}),
                      [currencyCode]: Math.max(
                        0,
                        Number.isFinite(bank) ? bank : 0,
                      ),
                    },
                  }
                : account,
          ),
        ),
      addBankAccount: (name, openingBalance) => {
        const cleanName = name.trim();
        if (
          !cleanName ||
          !Number.isFinite(openingBalance) ||
          openingBalance < 0
        )
          return;
        setAccounts((current) => [
          ...current,
          {
            id: `bank-${Date.now()}`,
            name: cleanName,
            kind: "bank",
            openingBalance,
            openingBalances: { [currencyCode]: openingBalance },
            createdAt: Date.now(),
          },
        ]);
      },
      updateAccountOpeningBalance: (accountId, amount) =>
        setAccounts((current) =>
          current.map((account) =>
            account.id === accountId
              ? {
                  ...account,
                  openingBalance:
                    currencyCode === DEFAULT_CURRENCY.code
                      ? Math.max(0, amount)
                      : account.openingBalance,
                  openingBalances: {
                    ...(account.openingBalances ?? {}),
                    [currencyCode]: Math.max(0, amount),
                  },
                }
              : account,
          ),
        ),
      renameBankAccount: (accountId, name) => {
        const cleanName = name.trim();
        if (!cleanName) return;
        setAccounts((current) =>
          current.map((account) =>
            account.id === accountId && account.kind === "bank"
              ? { ...account, name: cleanName }
              : account,
          ),
        );
      },
      deleteBankAccount: (accountId) => {
        if (
          accountId === "bank" ||
          entries.some(
            (entry) =>
              entry.accountId === accountId ||
              entry.fromAccountId === accountId ||
              entry.toAccountId === accountId,
          )
        )
          return false;
        setAccounts((current) =>
          current.filter((account) => account.id !== accountId),
        );
        return true;
      },
      transferBetweenAccounts: (
        fromAccountId,
        toAccountId,
        amount,
        note,
        date,
        transferCurrencyCode = currencyCode,
      ) => {
        const sourceBalance =
          accountBalancesByCurrency[transferCurrencyCode]?.[fromAccountId] ?? 0;
        if (
          fromAccountId === toAccountId ||
          !isValidAmount(amount) ||
          amount > sourceBalance ||
          !note.trim() ||
          !isValidDate(date) ||
          !accounts.some((account) => account.id === fromAccountId) ||
          !accounts.some((account) => account.id === toAccountId)
        )
          return;
        setEntries((current) => [
          {
            id: `${Date.now()}-${Math.random()}`,
            type: "transfer",
            amount,
            account:
              accounts.find((account) => account.id === fromAccountId)?.kind ??
              "cash",
            accountId: fromAccountId,
            fromAccountId,
            toAccountId,
            note: note.trim(),
            date,
            currencyCode: findCurrency(transferCurrencyCode).code,
            createdAt: Date.now(),
          },
          ...current,
        ]);
      },
      setCurrency: (code) => setCurrencyCode(findCurrency(code).code),
      addCategory: (name, color, icon) => {
        const cleanName = name.trim();
        if (
          !cleanName ||
          !color ||
          !icon ||
          categories.some((category) => category.name === cleanName)
        )
          return;
        setCategories((current) => [
          ...current,
          { id: `category-${Date.now()}`, name: cleanName, color, icon },
        ]);
      },
      deleteCategory: (categoryId) => {
        if (
          DEFAULT_CATEGORIES.some((category) => category.id === categoryId) ||
          entries.some((entry) => entry.category === categoryId)
        )
          return false;
        setCategories((current) =>
          current.filter((category) => category.id !== categoryId),
        );
        return true;
      },
      yearlyRollovers,
      rolloverYear: (year) => {
        if (yearlyRollovers.some((item) => item.year === year)) return;
        setYearlyRollovers((current) => [
          ...current,
          {
            id: `rollover-${year}`,
            year,
            cashBalance,
            bankBalance,
            totalBalance,
            cashBalances: Object.fromEntries(
              Object.entries(accountBalancesByCurrency).map(
                ([code, balances]) => [code, balances.cash ?? 0],
              ),
            ),
            bankBalances: Object.fromEntries(
              Object.entries(accountBalancesByCurrency).map(
                ([code, balances]) => [
                  code,
                  Object.entries(balances)
                    .filter(([id]) => id !== "cash")
                    .reduce((sum, [, amount]) => sum + amount, 0),
                ],
              ),
            ),
            totalBalances: { ...currencyTotals },
            createdAt: Date.now(),
          },
        ]);
      },
      exportEntries: async () => {
        const header = (
          language === "en"
            ? [
                "Date",
                "Type",
                "Account",
                "Currency",
                "Category",
                "Description",
                "Amount",
              ]
            : [
                "التاريخ",
                "النوع",
                "الحساب",
                "العملة",
                "التصنيف",
                "البيان",
                "المبلغ",
              ]
        )
          .map(csvEscape)
          .join(",");
        const rows = entries.map((entry) =>
          [
            entry.date,
            entry.type === "debit"
              ? t("مدين", "Debit")
              : entry.type === "credit"
                ? t("دائن", "Credit")
                : t("تحويل", "Transfer"),
            accountLabel(entry, accounts, language),
            entry.currencyCode ?? currencyCode,
            categories.find((category) => category.id === entry.category)
              ?.name ?? "-",
            entry.note,
            formatNumber(entry.amount, "en", "western"),
          ]
            .map(csvEscape)
            .join(","),
        );
        await Share.share({
          title: t("سجل مصروفي", "Masroofi ledger"),
          message: [header, ...rows].join("\n"),
        });
      },
      getBackupPayload: () =>
        JSON.stringify({
          schemaVersion: BACKUP_VERSION,
          exportedAt: new Date().toISOString(),
          entries,
          accounts,
          categories,
          currencyCode,
          yearlyRollovers,
          preferences: {
            language,
            numberStyle,
            updatedAt: preferencesUpdatedAt,
          },
        }),
      restorePayload: (text) => {
        try {
          const parsed = JSON.parse(text) as unknown;
          if (!isValidBackup(parsed)) return false;
          const backup = parsed as {
            entries: FinancialEntry[];
            accounts: FinancialAccount[];
            categories?: ExpenseCategory[];
            currencyCode?: string;
            yearlyRollovers?: YearRollover[];
          };
          const restoredCurrency = backup.currencyCode ?? DEFAULT_CURRENCY.code;
          setEntries(
            backup.entries.map((entry) =>
              normalizeEntry(entry, restoredCurrency),
            ),
          );
          setAccounts(
            backup.accounts.map((account) =>
              normalizeAccount(account, restoredCurrency),
            ),
          );
          setCategories(
            backup.categories?.length ? backup.categories : DEFAULT_CATEGORIES,
          );
          setCurrencyCode(restoredCurrency);
          setYearlyRollovers(backup.yearlyRollovers ?? []);
          return true;
        } catch {
          return false;
        }
      },
      createBackup: async () => {
        const payload = JSON.stringify(
          {
            schemaVersion: BACKUP_VERSION,
            exportedAt: new Date().toISOString(),
            entries,
            accounts,
            categories,
            currencyCode,
            yearlyRollovers,
            preferences: {
              language,
              numberStyle,
              updatedAt: preferencesUpdatedAt,
            },
          },
          null,
          2,
        );
        try {
          if (Platform.OS === "web") {
            await Share.share({
              title: t("نسخة مصروفي الاحتياطية", "Masroofi backup"),
              message: payload,
            });
            return;
          }
          const uri = `${FileSystem.cacheDirectory}masroofi-backup-${new Date().toISOString().slice(0, 10)}.json`;
          await FileSystem.writeAsStringAsync(uri, payload, {
            encoding: FileSystem.EncodingType.UTF8,
          });
          if (await Sharing.isAvailableAsync())
            await Sharing.shareAsync(uri, {
              mimeType: "application/json",
              dialogTitle: t(
                "حفظ نسخة مصروفي الاحتياطية",
                "Save Masroofi backup",
              ),
            });
          else
            await Share.share({
              title: t("نسخة مصروفي الاحتياطية", "Masroofi backup"),
              message: payload,
            });
        } catch {
          Alert.alert(
            t("تعذر إنشاء النسخة", "Backup failed"),
            t(
              "تحقق من مساحة الجهاز وحاول مرة أخرى.",
              "Check device storage and try again.",
            ),
          );
        }
      },
      restoreBackup: async () => {
        try {
          await AsyncStorage.setItem(
            `${STORAGE_KEY}-pre-restore`,
            JSON.stringify({
              schemaVersion: BACKUP_VERSION,
              exportedAt: new Date().toISOString(),
              entries,
              accounts,
              categories,
              currencyCode,
              preferences: {
                language,
                numberStyle,
                updatedAt: preferencesUpdatedAt,
              },
            }),
          );
          const result = await DocumentPicker.getDocumentAsync({
            type: "application/json",
            copyToCacheDirectory: true,
          });
          if (result.canceled || !result.assets?.[0]) return;
          const asset = result.assets[0];
          const text =
            Platform.OS === "web" && asset.file
              ? await asset.file.text()
              : await FileSystem.readAsStringAsync(asset.uri, {
                  encoding: FileSystem.EncodingType.UTF8,
                });
          const parsed = JSON.parse(text) as unknown;
          if (!isValidBackup(parsed)) {
            Alert.alert(
              t("ملف غير صالح", "Invalid file"),
              t(
                "هذا الملف ليس نسخة احتياطية صحيحة من مصروفي.",
                "This file is not a valid Masroofi backup.",
              ),
            );
            return;
          }
          Alert.alert(
            t("استعادة البيانات؟", "Restore data?"),
            t(
              "سيتم استبدال البيانات الحالية بعد التأكيد.",
              "Current data will be replaced after confirmation.",
            ),
            [
              { text: t("إلغاء", "Cancel"), style: "cancel" },
              {
                text: t("استعادة", "Restore"),
                style: "destructive",
                onPress: () => {
                  const restored = JSON.stringify(parsed);
                  if (value.restorePayload(restored))
                    Alert.alert(
                      t("تمت الاستعادة", "Restored"),
                      t(
                        "تم استرجاع سجلاتك بنجاح.",
                        "Your records were restored successfully.",
                      ),
                    );
                },
              },
            ],
          );
        } catch {
          Alert.alert(
            t("تعذر الاستعادة", "Restore failed"),
            t(
              "تأكد من اختيار ملف JSON صالح ثم حاول مرة أخرى.",
              "Choose a valid JSON file and try again.",
            ),
          );
        }
      },
    }),
    [
      entries,
      accounts,
      bankAccounts,
      accountBalances,
      accountBalancesByCurrency,
      currencyTotals,
      categories,
      cashBalance,
      bankBalance,
      totalBalance,
      loading,
      currencyCode,
      yearlyRollovers,
      language,
      numberStyle,
      preferencesUpdatedAt,
    ],
  );

  return (
    <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context)
    throw new Error("useFinance must be used inside FinanceProvider");
  return context;
}
export { formatNumber } from "./number-format";
export function formatMoney(
  value: number,
  symbol = "د.أ",
  language: "ar" | "en" = "ar",
  numberStyle: "arabic-indic" | "western" = language === "ar"
    ? "arabic-indic"
    : "western",
) {
  return `${formatNumber(value, language, numberStyle)} ${symbol}`;
}
export function typeLabel(type: EntryType) {
  return type === "debit" ? "مدين" : type === "credit" ? "دائن" : "تحويل";
}
export { calculateBalances };
