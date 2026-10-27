"use client";

// A goal is a countdown period: a start day and a length. Every day of it that
// has ended is crossed off automatically; how each day went comes from its tasks.

import { useMemo } from "react";
import { fromJdn, toJdn } from "./ethiopian";
import { readStored, useStored, writeStored } from "./storage";
import { dayScore, type Routine, type Task } from "./tasks";

export type Goal = {
  id: string;
  name: string;
  /** first day, as a JDN */
  start: number;
  days: number;
  /** manual crosses from the first versions; kept so old data still loads */
  done: number[];
  created: number;
  deleted?: boolean;
  u?: number;
  /** shown before anything is saved; becomes real on the first change */
  draft?: boolean;
};

// Same key as the first version, so goals made there carry over.
export const GOALS_KEY = "kutir-trackers-v1";
const EMPTY: Goal[] = [];

/** The plan this app was built for: 90 days from 1 Tikimt 2019, or the current month for anyone starting later. */
export function defaultGoal(today: number): Goal {
  const original = toJdn(2019, 2, 1);
  const t = fromJdn(today);
  const start = today >= original && today < original + 90 ? original : toJdn(t.y, t.m, 1);
  return { id: "three-months", name: "My 3 months", start, days: 90, done: [], created: 0, draft: true };
}

export function useGoals(today: number | null) {
  const [saved] = useStored<Goal[]>(GOALS_KEY, EMPTY);
  return useMemo(() => {
    const list = (Array.isArray(saved) ? saved : EMPTY)
      .filter((g) => !g.deleted)
      .sort((a, b) => a.created - b.created);
    if (list.length || today == null) return list;
    return [defaultGoal(today)];
  }, [saved, today]);
}

export const savedGoals = () => {
  const v = readStored<Goal[]>(GOALS_KEY, EMPTY);
  return Array.isArray(v) ? v : EMPTY;
};

export function addGoal(goal: Pick<Goal, "name" | "start" | "days">) {
  const g: Goal = { ...goal, id: Math.random().toString(36).slice(2, 10), done: [], created: Date.now(), u: Date.now() };
  writeStored(GOALS_KEY, [...savedGoals(), g]);
  return g;
}

export function removeGoal(id: string) {
  writeStored(GOALS_KEY, savedGoals().map((g) => (g.id === id ? { ...g, deleted: true, u: Date.now() } : g)));
}

export function goalStats(goal: Goal, today: number, tasks: Task[], routines: Routine[]) {
  const end = goal.start + goal.days - 1;
  const passed = Math.max(0, Math.min(goal.days, today - goal.start));
  const lastEnded = Math.min(today - 1, end);

  let tasksDone = 0, tasksDue = 0, perfect = 0, streak = 0;
  const scores = new Map<number, { done: number; due: number }>();
  for (let d = goal.start; d <= lastEnded; d++) {
    const s = dayScore(d, tasks, routines);
    scores.set(d, s);
    tasksDone += s.done;
    tasksDue += s.due;
    if (s.due && s.done === s.due) perfect++;
  }
  // Streak of finished days where every task was done, counting back from yesterday.
  for (let d = lastEnded; d >= goal.start; d--) {
    const s = scores.get(d)!;
    if (s.due && s.done === s.due) streak++;
    else break;
  }

  return {
    end,
    passed,
    left: Math.max(0, end - today + (today >= goal.start && today <= end ? 1 : 0)),
    dayNumber: today >= goal.start && today <= end ? today - goal.start + 1 : null,
    tasksDone,
    tasksDue,
    perfect,
    streak,
    rate: tasksDue ? tasksDone / tasksDue : null,
  };
}
