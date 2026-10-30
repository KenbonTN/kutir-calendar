"use client";

// A goal is a countdown period: a start day and a length. Every day of it that
// has ended is crossed off automatically; how each day went comes from its tasks.

import { useMemo } from "react";
import { toJdn } from "./ethiopian";
import { readStored, useStored, writeStored } from "./storage";
import { dayScorer, type Routine, type Task } from "./tasks";

export type Goal = {
  id: string;
  name: string;
  /** first day, as a JDN */
  start: number;
  days: number;
  /** manual crosses from the first versions; kept so old data still loads */
  done: number[];
  created: number;
  /** the big goal for the year it serves (see aims.ts) */
  aim?: string;
  deleted?: boolean;
  u?: number;
};

// Same key as the first version, so goals made there carry over.
export const GOALS_KEY = "kutir-trackers-v1";
const EMPTY: Goal[] = [];

/**
 * The countdown everyone saw before countdowns had to be created: 90 days from 1 Tikimt 2019.
 * New visitors start with none; people who were already using the app keep this one.
 * `u: 1` means any saved copy (from the cloud or an edit) always wins over this.
 */
export const LEGACY_GOAL: Goal = {
  id: "three-months", name: "My 3 months", start: toJdn(2019, 2, 1), days: 90, done: [], created: 0, u: 1,
};

export function useGoals() {
  const [saved] = useStored<Goal[]>(GOALS_KEY, EMPTY);
  return useMemo(
    () => (Array.isArray(saved) ? saved : EMPTY).filter((g) => !g.deleted).sort((a, b) => a.created - b.created),
    [saved],
  );
}

/**
 * One-time step for devices that used Kutir before: if this device has data
 * (tasks, screen time, expenses, or crosses from the first version) but has
 * never saved a countdown, save the old default so it doesn't disappear.
 */
export function keepLegacyGoal(otherKeys: string[]) {
  if (savedGoals().length) return; // saved, edited or deleted before: leave it alone
  const used = otherKeys.some((k) => {
    try {
      const v = JSON.parse(localStorage.getItem(k) ?? "[]");
      return Array.isArray(v) && v.length > 0;
    } catch {
      return false;
    }
  });
  if (used) writeStored(GOALS_KEY, [LEGACY_GOAL]);
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

/** Links a countdown to a big goal, or unlinks it (empty id). */
export function linkGoal(id: string, aim: string) {
  writeStored(
    GOALS_KEY,
    savedGoals().map((g) => {
      if (g.id !== id) return g;
      const { aim: _old, ...rest } = g; // eslint-disable-line @typescript-eslint/no-unused-vars
      return aim ? { ...rest, aim, u: Date.now() } : { ...rest, u: Date.now() };
    }),
  );
}

export function goalStats(goal: Goal, today: number, tasks: Task[], routines: Routine[]) {
  const end = goal.start + goal.days - 1;
  const passed = Math.max(0, Math.min(goal.days, today - goal.start));
  const lastEnded = Math.min(today - 1, end);

  let tasksDone = 0, tasksDue = 0, perfect = 0, streak = 0;
  const scores = new Map<number, { done: number; due: number }>();
  const score = dayScorer(tasks, routines);
  for (let d = goal.start; d <= lastEnded; d++) {
    const s = score(d);
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
