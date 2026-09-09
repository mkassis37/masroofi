export type BalanceEntry = {
  type: "debit" | "credit" | "transfer";
  amount: number;
  account: "cash" | "bank";
  accountId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  currencyCode?: string;
};

export type BalanceAccount = { id: string; openingBalance: number; kind: "cash" | "bank" };

export function calculateAccountBalances(entries: BalanceEntry[], accounts: BalanceAccount[]) {
  const balances: Record<string, number> = Object.fromEntries(accounts.map((account) => [account.id, account.openingBalance]));
  for (const entry of entries) {
    if (entry.type === "transfer") {
      const fromId = entry.fromAccountId ?? (entry.account === "cash" ? "cash" : "bank");
      const toId = entry.toAccountId ?? (entry.account === "cash" ? "bank" : "cash");
      balances[fromId] = (balances[fromId] ?? 0) - entry.amount;
      balances[toId] = (balances[toId] ?? 0) + entry.amount;
      continue;
    }
    const id = entry.accountId ?? entry.account ?? "cash";
    balances[id] = (balances[id] ?? 0) + (entry.type === "debit" ? entry.amount : -entry.amount);
  }
  return balances;
}

export function calculateAccountBalancesByCurrency(entries: BalanceEntry[], accounts: BalanceAccount[], defaultCurrencyCode: string) {
  const balances: Record<string, Record<string, number>> = {
    [defaultCurrencyCode]: Object.fromEntries(accounts.map((account) => [account.id, account.openingBalance])),
  };
  for (const entry of entries) {
    const currencyCode = entry.currencyCode ?? defaultCurrencyCode;
    if (!balances[currencyCode]) balances[currencyCode] = Object.fromEntries(accounts.map((account) => [account.id, 0]));
    const current = balances[currencyCode];
    if (entry.type === "transfer") {
      const fromId = entry.fromAccountId ?? (entry.account === "cash" ? "cash" : "bank");
      const toId = entry.toAccountId ?? (entry.account === "cash" ? "bank" : "cash");
      current[fromId] = (current[fromId] ?? 0) - entry.amount;
      current[toId] = (current[toId] ?? 0) + entry.amount;
    } else {
      const id = entry.accountId ?? entry.account ?? "cash";
      current[id] = (current[id] ?? 0) + (entry.type === "debit" ? entry.amount : -entry.amount);
    }
  }
  return balances;
}

export function calculateBalances(entries: BalanceEntry[], openingCash: number, openingBank: number) {
  const accounts = [{ id: "cash", kind: "cash" as const, openingBalance: openingCash }, { id: "bank", kind: "bank" as const, openingBalance: openingBank }];
  const balances = calculateAccountBalances(entries, accounts);
  return { cash: balances.cash ?? 0, bank: balances.bank ?? 0, total: Object.values(balances).reduce((sum, value) => sum + value, 0) };
}

export function calculateCurrencyTotals(accountBalancesByCurrency: Record<string, Record<string, number>>) {
  return Object.fromEntries(Object.entries(accountBalancesByCurrency).map(([currencyCode, balances]) => [currencyCode, Object.values(balances).reduce((sum, value) => sum + value, 0)]));
}
