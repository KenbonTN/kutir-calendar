"use client";

// Big goals for an Ethiopian year ("aims"). Countdowns link up to them, and the
// tasks linked to those countdowns show how much each goal has moved.

import { useMemo } from "react";
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
  created: number;
};

export const aimStore = records<Aim>("kutir-aims-v1");
export const AIMS_KEY = aimStore.key;

export function useAims() {
  const all = useRecords(aimStore);
  return useMemo(() => [...all].sort((a, b) => a.year - b.year || a.created - b.created), [all]);
}

export const addAim = (a: Pick<Aim, "title" | "year" | "area" | "why">) =>
  aimStore.add({ ...a, area: a.area || undefined, why: a.why?.trim() || undefined, created: Date.now() });
export const updateAim = (id: string, p: Partial<Aim>) => aimStore.patch(id, p);
export const deleteAim = (id: string) => aimStore.remove(id);

/** Countdowns linked to the goal, and how many of their tasks are done. */
export function aimProgress(aim: Aim, goals: Goal[], tasks: Task[]) {
  const linked = goals.filter((g) => g.aim === aim.id);
  const ids = new Set(linked.map((g) => g.id));
  const mine = tasks.filter((t) => t.goal && ids.has(t.goal));
  const done = mine.filter((t) => t.done).length;
  return { linked, done, total: mine.length, pct: aim.achieved ? 1 : mine.length ? done / mine.length : 0 };
}
