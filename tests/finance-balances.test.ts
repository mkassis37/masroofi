import { describe, expect, it } from "vitest";
import { calculateBalances } from "../lib/finance-calculations";

const entry = (partial: Record<string, unknown>): any => ({ id: "1", type: "debit", amount: 0, account: "cash", note: "", date: "2026-09-02", createdAt: 0, ...partial });

describe("calculateBalances", () => {
  it("calculates cash and bank after income and expenses", () => {
    const result = calculateBalances([
      entry({ type: "debit", amount: 1000, account: "cash" }),
      entry({ type: "credit", amount: 250, account: "cash" }),
      entry({ type: "debit", amount: 500, account: "bank" }),
      entry({ type: "credit", amount: 75, account: "bank" }),
    ], 100, 50);
    expect(result).toEqual({ cash: 850, bank: 475, total: 1325 });
  });

  it("moves money from cash to bank without changing total balance", () => {
    const result = calculateBalances([entry({ type: "transfer", amount: 300, account: "cash" })], 1000, 200);
    expect(result).toEqual({ cash: 700, bank: 500, total: 1200 });
  });
});


describe("multiple accounts", () => {
  it("moves money between named bank accounts", async () => {
    const { calculateAccountBalances } = await import("../lib/finance-calculations");
    const result = calculateAccountBalances([
      { type: "transfer", amount: 250, fromAccountId: "cash", toAccountId: "bank-arab", account: "cash" },
      { type: "transfer", amount: 100, fromAccountId: "bank-arab", toAccountId: "bank-housing", account: "bank" },
    ], [
      { id: "cash", kind: "cash", openingBalance: 1000 },
      { id: "bank-arab", kind: "bank", openingBalance: 200 },
      { id: "bank-housing", kind: "bank", openingBalance: 50 },
    ]);
    expect(result).toEqual({ cash: 750, "bank-arab": 350, "bank-housing": 150 });
  });
});
