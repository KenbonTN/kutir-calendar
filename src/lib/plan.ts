"use client";

// Month → week → day planning.
//
// A month has a few outcomes, one to three per life area that matters that month,
// each with its own list of tasks (pool items or tasks carrying `outcome`). Each
// week has its big rocks: tasks marked `rock`, placed on a day of that week. Each
// day has its Top 3, ideally with a time (`at`) so there's a when, not just a what.

import { useMemo } from "react";
import { fromJdn, monthLength, toJdn } from "./ethiopian";
import { estimateAccuracy } from "./focus";
import type { PoolItem } from "./pool";
import { records, useRecords, type Rec } from "./records";
import { useStored } from "./storage";
import type { Task } from "./tasks";

/* ---------- Months ---------- */

/** An Ethiopian month as one number: 2019 Tikimt → 201902. */
export const monthKey = (j: number) => {
  const e = fromJdn(j);
  return e.y * 100 + e.m;
};
export const monthRange = (key: number): [number, number] => {
  const y = Math.floor(key / 100), m = key % 100;
  const first = toJdn(y, m, 1);
  return [first, first + monthLength(y, m) - 1];
};
export const nextMonth = (key: number) => (key % 100 === 13 ? (Math.floor(key / 100) + 1) * 100 + 1 : key + 1);
export const prevMonth = (key: number) => (key % 100 === 1 ? (Math.floor(key / 100) - 1) * 100 + 13 : key - 1);

/* ---------- Outcomes ---------- */

export type Outcome = Rec & {
  title: string;
  /** life area or sub-group (a business, an organization…) */
  area?: string;
  /** month key, see monthKey */
  month: number;
  /** the big goal for the year it serves */
  aim?: string;
  /** marked achieved by hand */
  achieved?: boolean;
  created: number;
};

export const outcomeStore = records<Outcome>("kutir-outcomes-v1");
export const OUTCOMES_KEY = outcomeStore.key;

export function useOutcomes(month?: number) {
  const all = useRecords(outcomeStore);
  return useMemo(
    () => all.filter((o) => month == null || o.month === month).sort((a, b) => a.created - b.created),
    [all, month],
  );
}

export const addOutcome = (o: Pick<Outcome, "title" | "area" | "month" | "aim">) =>
  outcomeStore.add({ ...o, area: o.area || undefined, aim: o.aim || undefined, created: Date.now() });
export const updateOutcome = (id: string, p: Partial<Outcome>) => outcomeStore.patch(id, p);
export const deleteOutcome = (id: string) => outcomeStore.remove(id);

/** Research and practice agree: a handful of outcomes beats a long list. */
export const OUTCOME_LIMIT = 7;

export function outcomeProgress(o: Outcome, tasks: Task[], pool: PoolItem[]) {
  const mine = tasks.filter((t) => t.outcome === o.id && !t.routine);
  const waiting = pool.filter((p) => p.outcome === o.id).length;
  const done = mine.filter((t) => t.done).length;
  const total = mine.length + waiting;
  return { done, total, planned: mine.length - done, waiting, pct: o.achieved ? 1 : total ? done / total : 0 };
}

/* ---------- Capacity ---------- */

/** Hours of focused work you can really give on a weekday and on a weekend day. */
export type Capacity = { weekday: number; weekend: number };
export const useCapacity = () => useStored<Capacity>("kutir-capacity-v1", { weekday: 6, weekend: 3 });
export const hoursOn = (c: Capacity, weekdayIdx: number) => (weekdayIdx >= 5 ? c.weekend : c.weekday);

/**
 * How long your plans really take, from the focus timer: time spent ÷ time planned.
 * Without enough history, a 1.25 buffer (people underestimate; see the planning fallacy).
 */
export function paceFactor(tasks: Task[]) {
  const a = estimateAccuracy(tasks);
  return a ? Math.min(2.5, Math.max(0.6, a.ratio)) : 1.25;
}

/** Planned minutes for a day's unfinished tasks, and what they'll likely take at your pace. */
export function load(dayTasks: Task[], pace: number) {
  const open = dayTasks.filter((t) => !t.done);
  const planned = open.reduce((a, t) => a + (t.mins ?? 0), 0);
  return { planned, likely: Math.round(planned * pace), unestimated: open.filter((t) => !t.mins).length };
}

/** "09:30" → minutes after midnight, for sorting a day's timeline. */
export const atMinutes = (at?: string) => {
  if (!at) return null;
  const [h, m] = at.split(":").map(Number);
  return h * 60 + m;
};

/** Times offered for "when": every half hour from 5 AM to 11 PM. */
export const TIMES = Array.from({ length: 37 }, (_, i) => {
  const mins = 5 * 60 + i * 30;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${mins % 60 ? "30" : "00"}`;
});
