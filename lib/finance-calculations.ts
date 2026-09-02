export type BalanceEntry = { type: "debit" | "credit" | "transfer"; amount: number; account: "cash" | "bank" };

export function calculateBalances(entries: BalanceEntry[], openingCash: number, openingBank: number) {
  let cash = openingCash;
  let bank = openingBank;
  for (const entry of entries) {
    const signed = entry.type === "debit" ? entry.amount : -entry.amount;
    if (entry.type === "transfer") {
      if (entry.account === "cash") { cash -= entry.amount; bank += entry.amount; }
      else { bank -= entry.amount; cash += entry.amount; }
    } else if (entry.account === "cash") cash += signed;
    else bank += signed;
  }
  return { cash, bank, total: cash + bank };
}
