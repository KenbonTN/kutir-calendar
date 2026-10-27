"use client";

// Money spent, one record per purchase, in Ethiopian Birr. Like tasks, records
// carry a change time (`u`) and are soft-deleted so devices can merge safely.

import { useMemo } from "react";
import { readStored, useStored, writeStored } from "./storage";

export const CATEGORIES = [
  { key: "food", name: "Food & drinks", am: "ምግብ", color: "#e8a33d" },
  { key: "transport", name: "Transport", am: "ትራንስፖርት", color: "#3b82f6" },
  { key: "rent", name: "Rent & home", am: "ቤት", color: "#8b5cf6" },
  { key: "bills", name: "Bills & airtime", am: "ክፍያዎች", color: "#06b6d4" },
  { key: "shopping", name: "Shopping & clothes", am: "ግብይት", color: "#ec4899" },
  { key: "health", name: "Health", am: "ጤና", color: "#10b981" },
  { key: "fun", name: "Going out & fun", am: "መዝናኛ", color: "#f97316" },
  { key: "education", name: "Learning", am: "ትምህርት", color: "#6366f1" },
  { key: "family", name: "Family & gifts", am: "ቤተሰብ", color: "#f43f5e" },
  { key: "church", name: "Church & giving", am: "ቤተ ክርስቲያን", color: "#a3a3a3" },
  { key: "other", name: "Other", am: "ሌላ", color: "#78716c" },
] as const;
export type CategoryKey = (typeof CATEGORIES)[number]["key"];
export const category = (k: string) => CATEGORIES.find((c) => c.key === k) ?? CATEGORIES[CATEGORIES.length - 1];

export type Expense = {
  id: string;
  /** Birr */
  amount: number;
  category: CategoryKey;
  note: string;
  /** the day it was spent, as a JDN */
  day: number;
  created: number;
  deleted?: boolean;
  u: number;
};

export const EXPENSES_KEY = "kutir-expenses-v1";
const NONE: Expense[] = [];

export function useExpenses() {
  const [all] = useStored<Expense[]>(EXPENSES_KEY, NONE);
  return useMemo(() => all.filter((e) => !e.deleted).sort((a, b) => b.day - a.day || b.created - a.created), [all]);
}

export function addExpense(e: Pick<Expense, "amount" | "category" | "note" | "day">) {
  const rec: Expense = { ...e, id: Math.random().toString(36).slice(2, 10), created: Date.now(), u: Date.now() };
  writeStored(EXPENSES_KEY, [...readStored<Expense[]>(EXPENSES_KEY, NONE), rec]);
}

export function deleteExpense(id: string) {
  writeStored(
    EXPENSES_KEY,
    readStored<Expense[]>(EXPENSES_KEY, NONE).map((e) => (e.id === id ? { ...e, deleted: true, u: Date.now() } : e)),
  );
}

const birrFmt = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });
export const birr = (n: number) => `${birrFmt.format(n)} Birr`;

/** Totals per category for expenses within [from, to], biggest first. */
export function byCategory(list: Expense[], from: number, to: number) {
  const sums = new Map<string, number>();
  let total = 0;
  for (const e of list)
    if (e.day >= from && e.day <= to) {
      sums.set(e.category, (sums.get(e.category) ?? 0) + e.amount);
      total += e.amount;
    }
  const rows = [...sums.entries()].map(([k, v]) => ({ ...category(k), amount: v })).sort((a, b) => b.amount - a.amount);
  return { total, rows };
}
