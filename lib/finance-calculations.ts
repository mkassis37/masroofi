export type BalanceEntry = {
  type: "debit" | "credit" | "transfer";
  amount: number;
  account: "cash" | "bank";
  accountId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  currencyCode?: string;
};

export type BalanceAccount = {
  id: string;
  openingBalance?: number;
  openingBalances?: Record<string, number>;
  kind: "cash" | "bank";
};

function openingBalanceFor(
  account: BalanceAccount,
  currencyCode: string,
  defaultCurrencyCode: string,
) {
  const explicit = account.openingBalances?.[currencyCode];
  if (typeof explicit === "number" && Number.isFinite(explicit))
    return explicit;
  if (currencyCode === defaultCurrencyCode)
    return Number(account.openingBalance) || 0;
  return 0;
}

function accountIds(accounts: BalanceAccount[]) {
  return accounts.map((account) => account.id);
}

function resolveTransferAccounts(entry: BalanceEntry) {
  const fallbackFrom = entry.account === "cash" ? "cash" : "bank";
  const fallbackTo = entry.account === "cash" ? "bank" : "cash";
  return {
    fromId: entry.fromAccountId ?? fallbackFrom,
    toId: entry.toAccountId ?? fallbackTo,
  };
}

export function calculateAccountBalances(
  entries: BalanceEntry[],
  accounts: BalanceAccount[],
) {
  const balances: Record<string, number> = Object.fromEntries(
    accounts.map((account) => [
      account.id,
      Number(account.openingBalance) || 0,
    ]),
  );
  for (const entry of entries) {
    if (!Number.isFinite(entry.amount) || entry.amount < 0) continue;
    if (entry.type === "transfer") {
      const { fromId, toId } = resolveTransferAccounts(entry);
      balances[fromId] = (balances[fromId] ?? 0) - entry.amount;
      balances[toId] = (balances[toId] ?? 0) + entry.amount;
      continue;
    }
    const id = entry.accountId ?? entry.account;
    balances[id] =
      (balances[id] ?? 0) +
      (entry.type === "debit" ? entry.amount : -entry.amount);
  }
  return balances;
}

export function calculateAccountBalancesByCurrency(
  entries: BalanceEntry[],
  accounts: BalanceAccount[],
  defaultCurrencyCode: string,
) {
  const currencyCodes = new Set<string>([defaultCurrencyCode]);
  for (const account of accounts) {
    for (const code of Object.keys(account.openingBalances ?? {}))
      currencyCodes.add(code);
  }
  for (const entry of entries)
    currencyCodes.add(entry.currencyCode ?? defaultCurrencyCode);

  const balances: Record<string, Record<string, number>> = {};
  for (const currencyCode of currencyCodes) {
    balances[currencyCode] = Object.fromEntries(
      accounts.map((account) => [
        account.id,
        openingBalanceFor(account, currencyCode, defaultCurrencyCode),
      ]),
    );
  }

  for (const entry of entries) {
    if (!Number.isFinite(entry.amount) || entry.amount < 0) continue;
    const currencyCode = entry.currencyCode ?? defaultCurrencyCode;
    const current =
      balances[currencyCode] ??
      (balances[currencyCode] = Object.fromEntries(
        accountIds(accounts).map((id) => [id, 0]),
      ));
    if (entry.type === "transfer") {
      const { fromId, toId } = resolveTransferAccounts(entry);
      current[fromId] = (current[fromId] ?? 0) - entry.amount;
      current[toId] = (current[toId] ?? 0) + entry.amount;
    } else {
      const id = entry.accountId ?? entry.account;
      current[id] =
        (current[id] ?? 0) +
        (entry.type === "debit" ? entry.amount : -entry.amount);
    }
  }
  return balances;
}

export function calculateBalances(
  entries: BalanceEntry[],
  openingCash: number,
  openingBank: number,
) {
  const accounts = [
    { id: "cash", kind: "cash" as const, openingBalance: openingCash },
    { id: "bank", kind: "bank" as const, openingBalance: openingBank },
  ];
  const balances = calculateAccountBalances(entries, accounts);
  return {
    cash: balances.cash ?? 0,
    bank: balances.bank ?? 0,
    total: (balances.cash ?? 0) + (balances.bank ?? 0),
  };
}

export function calculateCurrencyTotals(
  accountBalancesByCurrency: Record<string, Record<string, number>>,
) {
  return Object.fromEntries(
    Object.entries(accountBalancesByCurrency).map(
      ([currencyCode, balances]) => [
        currencyCode,
        Object.values(balances).reduce((sum, value) => sum + value, 0),
      ],
    ),
  );
}
