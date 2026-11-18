"use client";

// Big goals for an Ethiopian year ("aims"). Countdowns link up to them, and the
// tasks linked to those countdowns show how much each goal has moved.

import { useMemo } from "react";
import { dateToJdn, monthLength, toJdn } from "./ethiopian";
import { records, useRecords, type Rec } from "./records";
import type { Goal } from "./goals";
import type { Task } from "./tasks";

export type Aim = Rec & {
  title: string;
  /** Ethiopian year it is for */
  year: number;
  area?: string;
  why?: string;
  /** marked achieved by hand */
  achieved?: boolean;
  /** last day, as a JDN (default: the end of its Ethiopian year) */
  deadline?: number;
  /** first day, as a JDN (default: the day it was added, or the start of its year) */
  start?: number;
  created: number;
};

export const aimStore = records<Aim>("kutir-aims-v1");
export const AIMS_KEY = aimStore.key;

export function useAims() {
  const all = useRecords(aimStore);
  return useMemo(() => [...all].sort((a, b) => a.year - b.year || a.created - b.created), [all]);
}

export const addAim = (a: Pick<Aim, "title" | "year" | "area" | "why" | "deadline" | "start">) =>
  aimStore.add({ ...a, area: a.area || undefined, why: a.why?.trim() || undefined, created: Date.now() });

/** The days a big goal runs over: from its start (or its year's) to its deadline (or its year's end). */
export function aimSpan(aim: Aim) {
  const first = toJdn(aim.year, 1, 1);
  const last = toJdn(aim.year, 13, monthLength(aim.year, 13));
  const start = aim.start ?? Math.max(first, dateToJdn(new Date(aim.created)));
  const end = aim.deadline ?? last;
  return { start, end };
}
export const updateAim = (id: string, p: Partial<Aim>) => aimStore.patch(id, p);
export const deleteAim = (id: string) => aimStore.remove(id);

/** Countdowns and monthly outcomes linked to the goal, and how many of their tasks are done. */
export function aimProgress(aim: Aim, goals: Goal[], tasks: Task[], outcomes: { id: string; aim?: string }[] = []) {
  const linked = goals.filter((g) => g.aim === aim.id);
  const ids = new Set(linked.map((g) => g.id));
  const outs = new Set(outcomes.filter((o) => o.aim === aim.id).map((o) => o.id));
  const mine = tasks.filter((t) => (t.goal && ids.has(t.goal)) || (t.outcome && outs.has(t.outcome)));
  const done = mine.filter((t) => t.done).length;
  return { linked, done, total: mine.length, pct: aim.achieved ? 1 : mine.length ? done / mine.length : 0 };
}
