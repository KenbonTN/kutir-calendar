"use client";

// Monthly budgets per spending category, equb groups, and money lent or borrowed.

import { useMemo } from "react";
import { records, useRecords, type Rec } from "./records";
import type { CategoryKey } from "./expenses";

/* ---------- Budgets ---------- */

export type Budget = Rec & { category: CategoryKey; amount: number };

export const budgetStore = records<Budget>("kutir-budgets-v1");
export const BUDGETS_KEY = budgetStore.key;
export const useBudgets = () => useRecords(budgetStore);

/** One budget per category (same id everywhere); 0 removes it. */
export const setBudget = (category: CategoryKey, amount: number) =>
  amount > 0
    ? budgetStore.put({ id: `b-${category}`, category, amount, u: 0 })
    : budgetStore.remove(`b-${category}`);

/* ---------- Equb ---------- */

export type Equb = Rec & {
  name: string;
  /** Birr each member pays per round */
  amount: number;
  /** days between rounds: 7 weekly, 30 monthly */
  every: number;
  /** first round's day, as a JDN */
  start: number;
  /** members, so rounds */
  rounds: number;
  /** the round you collect on (1-based) */
  mine: number;
  /** rounds you've paid (1-based) */
  paid: number[];
  created: number;
};

export const equbStore = records<Equb>("kutir-equbs-v1");
export const EQUBS_KEY = equbStore.key;
export const useEqubs = () => useRecords(equbStore);

export const addEqub = (e: Omit<Equb, "id" | "u" | "created" | "paid">) => equbStore.add({ ...e, paid: [], created: Date.now() });
export const deleteEqub = (id: string) => equbStore.remove(id);
export const togglePaid = (e: Equb, round: number) =>
  equbStore.patch(e.id, { paid: e.paid.includes(round) ? e.paid.filter((r) => r !== round) : [...e.paid, round] });

export const roundDay = (e: Equb, round: number) => e.start + (round - 1) * e.every;

export function equbStatus(e: Equb, today: number) {
  const current = Math.min(e.rounds, Math.max(1, Math.floor((today - e.start) / e.every) + 1));
  const started = today >= e.start;
  const unpaid = Array.from({ length: started ? current : 0 }, (_, i) => i + 1).filter((r) => !e.paid.includes(r));
  const next = started ? (e.paid.includes(current) ? current + 1 : current) : 1;
  const payout = roundDay(e, e.mine);
  return {
    current,
    unpaid,
    next: next <= e.rounds ? next : null,
    nextDay: next <= e.rounds ? roundDay(e, next) : null,
    payout,
    pot: e.amount * e.rounds,
    paidTotal: e.paid.length * e.amount,
    finished: today > roundDay(e, e.rounds),
  };
}

/* ---------- Debts ---------- */

export type Debt = Rec & {
  person: string;
  amount: number;
  /** "owed": they owe you; "owe": you owe them */
  dir: "owed" | "owe";
  /** repaid so far */
  repaid: number;
  note?: string;
  /** when it should be paid back, as a JDN */
  due?: number;
  day: number;
  created: number;
};

export const debtStore = records<Debt>("kutir-debts-v1");
export const DEBTS_KEY = debtStore.key;

export function useDebts() {
  const all = useRecords(debtStore);
  return useMemo(() => [...all].sort((a, b) => Number(a.repaid >= a.amount) - Number(b.repaid >= b.amount) || (a.due ?? 1e9) - (b.due ?? 1e9)), [all]);
}

export const addDebt = (d: Omit<Debt, "id" | "u" | "created" | "repaid">) =>
  debtStore.add({ ...d, note: d.note?.trim() || undefined, repaid: 0, created: Date.now() });
export const repay = (d: Debt, amount: number) => debtStore.patch(d.id, { repaid: Math.min(d.amount, d.repaid + amount) });
export const deleteDebt = (id: string) => debtStore.remove(id);
export const left = (d: Debt) => Math.max(0, d.amount - d.repaid);
