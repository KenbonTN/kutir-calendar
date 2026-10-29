"use client";

// Keep in touch: the people you want to call or see regularly, and when you last did.
// Also the fasting log: which church fast days you kept.

import { useMemo } from "react";
import { records, useRecords, type Rec } from "./records";

export type Person = Rec & {
  name: string;
  /** aim to be in touch at least every N days */
  every: number;
  /** last time you were in touch, as a JDN */
  last: number;
  phone?: string;
  note?: string;
  created: number;
};

export const personStore = records<Person>("kutir-people-v1");
export const PEOPLE_KEY = personStore.key;

/** Days until they're due (negative: overdue). */
export const dueIn = (p: Person, today: number) => p.last + p.every - today;

export function usePeople(today: number) {
  const all = useRecords(personStore);
  return useMemo(() => [...all].sort((a, b) => dueIn(a, today) - dueIn(b, today)), [all, today]);
}

export const addPerson = (p: Pick<Person, "name" | "every" | "last" | "phone" | "note">) =>
  personStore.add({ ...p, phone: p.phone?.trim() || undefined, note: p.note?.trim() || undefined, created: Date.now() });
export const touched = (p: Person, today: number) => personStore.patch(p.id, { last: today });
export const updatePerson = (id: string, p: Partial<Person>) => personStore.patch(id, p);
export const deletePerson = (id: string) => personStore.remove(id);

export const EVERY: [number, string][] = [
  [3, "Every few days"],
  [7, "Every week"],
  [14, "Every 2 weeks"],
  [30, "Every month"],
  [90, "Every 3 months"],
];

/* ---------- Fasting ---------- */

export type FastDay = Rec & { day: number; kept: boolean };

export const fastStore = records<FastDay>("kutir-fasts-v1");
export const FASTS_KEY = fastStore.key;

export function useFasts() {
  const all = useRecords(fastStore);
  return useMemo(() => new Map(all.map((f) => [f.day, f.kept])), [all]);
}

/** Kept, broken, or (null) not logged. */
export const logFast = (day: number, kept: boolean | null) =>
  kept == null ? fastStore.remove(`f-${day}`) : fastStore.put({ id: `f-${day}`, day, kept, u: 0 });
