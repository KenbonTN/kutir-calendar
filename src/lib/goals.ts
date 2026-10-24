"use client";

import { useMemo } from "react";
import { fromJdn, toJdn } from "./ethiopian";
import { readStored, useStored, writeStored } from "./storage";

export type Goal = {
  id: string;
  name: string;
  /** first day, as a JDN */
  start: number;
  days: number;
  /** crossed-off days, as JDNs */
  done: number[];
  created: number;
  /** shown before anything is saved; becomes real on the first change */
  draft?: boolean;
};

// Same key and shape as the first (single-file) version, so crosses made there carry over.
const KEY = "kutir-trackers-v1";
const EMPTY: Goal[] = [];

/** The plan this app was built for: 90 days from 1 Tikimt 2019, or the current month for anyone starting later. */
export function defaultGoal(today: number): Goal {
  const original = toJdn(2019, 2, 1);
  const t = fromJdn(today);
  const start = today >= original && today < original + 90 ? original : toJdn(t.y, t.m, 1);
  return { id: "three-months", name: "My 3 months", start, days: 90, done: [], created: 0, draft: true };
}

export function useGoals(today: number | null) {
  const [saved] = useStored<Goal[]>(KEY, EMPTY);
  return useMemo(() => {
    const list = Array.isArray(saved) ? saved : EMPTY;
    if (list.length || today == null) return list;
    return [defaultGoal(today)];
  }, [saved, today]);
}

const savedGoals = () => {
  const v = readStored<Goal[]>(KEY, EMPTY);
  return Array.isArray(v) ? v : EMPTY;
};

function upsert(goal: Goal) {
  const clean: Goal = { ...goal };
  delete clean.draft;
  const list = savedGoals();
  const i = list.findIndex((g) => g.id === goal.id);
  writeStored(KEY, i >= 0 ? list.map((g) => (g.id === goal.id ? clean : g)) : [...list, clean]);
}

export function toggleDay(goal: Goal, day: number) {
  const done = goal.done.includes(day) ? goal.done.filter((d) => d !== day) : [...goal.done, day];
  upsert({ ...goal, done });
}

export function addGoal(goal: Omit<Goal, "id" | "done" | "created">) {
  const g: Goal = { ...goal, id: Math.random().toString(36).slice(2, 10), done: [], created: Date.now() };
  upsert(g);
  return g;
}

export function removeGoal(id: string) {
  writeStored(KEY, savedGoals().filter((g) => g.id !== id));
}

export function goalStats(goal: Goal, today: number) {
  const end = goal.start + goal.days - 1;
  const done = new Set(goal.done.filter((d) => d >= goal.start && d <= end));
  const elapsed = Math.max(0, Math.min(goal.days, today - goal.start + 1));
  let streak = 0;
  for (let j = Math.min(today, end); j >= goal.start; j--) {
    if (done.has(j)) streak++;
    else if (j === today) continue; // today isn't over yet
    else break;
  }
  return {
    end,
    done,
    count: done.size,
    elapsed,
    left: Math.max(0, end - today),
    streak,
    dayNumber: today >= goal.start && today <= end ? today - goal.start + 1 : null,
    rate: elapsed ? done.size / elapsed : 0,
  };
}
