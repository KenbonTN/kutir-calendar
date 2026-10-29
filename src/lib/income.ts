"use client";

// Money coming in, one record per payment, in Birr. A source is one of the
// common ones below, or the person's own name for it ("other" + label).

import { useMemo } from "react";
import { records, useRecords, type Rec } from "./records";

export const SOURCES = [
  { key: "salary", name: "Salary", am: "ደመወዝ", color: "#2563eb" },
  { key: "business", name: "Business sales", am: "ንግድ", color: "#7c3aed" },
  { key: "freelance", name: "Freelance & side work", am: "የጎን ሥራ", color: "#0891b2" },
  { key: "bonus", name: "Bonus & allowance", am: "ጉርሻ", color: "#4f46e5" },
  { key: "equb", name: "Equb payout", am: "እቁብ", color: "#ca8a04" },
  { key: "rent", name: "Rent income", am: "ኪራይ", color: "#64748b" },
  { key: "invest", name: "Savings interest & investments", am: "ወለድ", color: "#16a34a" },
  { key: "family", name: "Family support", am: "ቤተሰብ", color: "#e11d48" },
  { key: "gift", name: "Gifts", am: "ስጦታ", color: "#db2777" },
  { key: "refund", name: "Refunds & loans repaid", am: "ተመላሽ", color: "#0d9488" },
  { key: "other", name: "Other", am: "ሌላ", color: "#78716c" },
] as const;
export type SourceKey = (typeof SOURCES)[number]["key"];
export const source = (k: string) => SOURCES.find((s) => s.key === k) ?? SOURCES[SOURCES.length - 1];

export type Income = Rec & {
  amount: number;
  source: SourceKey;
  /** the person's own name for an "other" source */
  label?: string;
  /** business or organization it came from */
  area?: string;
  note: string;
  day: number;
  created: number;
};

export const incomeStore = records<Income>("kutir-income-v1");
export const INCOME_KEY = incomeStore.key;

export function useIncome() {
  const all = useRecords(incomeStore);
  return useMemo(() => [...all].sort((a, b) => b.day - a.day || b.created - a.created), [all]);
}

export const addIncome = (i: Omit<Income, "id" | "u" | "created">) =>
  incomeStore.add({ ...i, label: i.label || undefined, area: i.area || undefined, created: Date.now() });
export const deleteIncome = (id: string) => incomeStore.remove(id);

/** Display name and colour; own sources share the "Other" colour. */
export const sourceOf = (i: Pick<Income, "source" | "label">) => {
  const s = source(i.source);
  return { key: i.source === "other" && i.label ? `other:${i.label}` : s.key, name: i.source === "other" && i.label ? i.label : s.name, color: s.color };
};

export function bySource(list: Income[], from: number, to: number) {
  const sums = new Map<string, { key: string; name: string; color: string; amount: number }>();
  let total = 0;
  for (const i of list)
    if (i.day >= from && i.day <= to) {
      const s = sourceOf(i);
      const row = sums.get(s.key) ?? { ...s, amount: 0 };
      row.amount += i.amount;
      sums.set(s.key, row);
      total += i.amount;
    }
  return { total, rows: [...sums.values()].sort((a, b) => b.amount - a.amount) };
}

/** Names people gave their own sources, most used first, to offer again. */
export function ownSources(list: Income[]) {
  const n = new Map<string, number>();
  for (const i of list) if (i.source === "other" && i.label) n.set(i.label, (n.get(i.label) ?? 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1]).map(([l]) => l);
}
