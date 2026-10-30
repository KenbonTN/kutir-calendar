"use client";

// Tasks live on a day (a JDN). When a day ends with a one-off task unfinished,
// the task moves to the next day and remembers each day it was missed.
// Repeating tasks ("routines") create one task per matching day; those don't
// pile up when missed, they just count as missed for that day.
//
// Every record carries `u` (last change, ms) and is never hard-deleted
// (`deleted: true`), so two devices can merge their copies safely.

import { useMemo } from "react";
import { weekday } from "./ethiopian";
import { readStored, useStored, writeStored } from "./storage";

export type Task = {
  id: string;
  title: string;
  /** the day it is on now */
  date: number;
  /** the day it was first planned for */
  origin: number;
  done: boolean;
  /** days it was left unfinished before moving on */
  missed: number[];
  /** set on tasks created by a repeating task */
  routine?: string;
  /** life area or sub-group id (see areas.ts) */
  area?: string;
  /** countdown it counts towards */
  goal?: string;
  /** one of today's top 3 */
  top?: boolean;
  /** estimated minutes */
  mins?: number;
  /** how many misses the person had already seen when they chose to keep a stuck task */
  kept?: number;
  /** minutes actually spent, from the focus timer */
  spent?: number;
  created: number;
  deleted?: boolean;
  u: number;
};

export type Routine = {
  id: string;
  title: string;
  /** weekdays it repeats on, 0 = Monday … 6 = Sunday */
  days: number[];
  start: number;
  deleted?: boolean;
  u: number;
};

export const TASKS_KEY = "kutir-tasks-v1";
export const ROUTINES_KEY = "kutir-routines-v1";
const NO_TASKS: Task[] = [];
const NO_ROUTINES: Routine[] = [];

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => Date.now();

export const allTasks = () => readStored<Task[]>(TASKS_KEY, NO_TASKS);
export const allRoutines = () => readStored<Routine[]>(ROUTINES_KEY, NO_ROUTINES);

export function useTasks() {
  const [tasks] = useStored<Task[]>(TASKS_KEY, NO_TASKS);
  const [routines] = useStored<Routine[]>(ROUTINES_KEY, NO_ROUTINES);
  return useMemo(
    () => ({ tasks: tasks.filter((t) => !t.deleted), routines: routines.filter((r) => !r.deleted) }),
    [tasks, routines],
  );
}

const saveTasks = (list: Task[]) => writeStored(TASKS_KEY, list);
const patchTask = (id: string, patch: Partial<Task>) =>
  saveTasks(allTasks().map((t) => (t.id === id ? { ...t, ...patch, u: now() } : t)));

export type TaskExtras = Partial<Pick<Task, "area" | "goal" | "mins">>;

export function addTask(title: string, date: number, extras: TaskExtras = {}) {
  const t: Task = { id: uid(), title, date, origin: date, done: false, missed: [], ...clean(extras), created: now(), u: now() };
  saveTasks([...allTasks(), t]);
  return t;
}

/** Drops empty optional fields so they aren't stored as undefined (Firestore refuses those). */
export const clean = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== "" && v !== 0)) as T;

export const updateTask = (t: Task, patch: Partial<Task>) => patchTask(t.id, patch);

/** Planned again for another day on purpose: it starts fresh there (no longer "late"). */
export const moveTask = (t: Task, day: number) => patchTask(t.id, { date: day, origin: day });

/** Taken from a later day onto today: keeps its planned day, so it shows as done early. */
export const pullForward = (t: Task, today: number) => patchTask(t.id, { date: today });

export const toggleTask = (t: Task) => patchTask(t.id, { done: !t.done });
export const renameTask = (t: Task, title: string) => patchTask(t.id, { title });
export const deleteTask = (t: Task) => patchTask(t.id, { deleted: true });

export const routineLabel = (days: number[]) =>
  days.length === 7
    ? "Every day"
    : days.join() === "0,1,2,3,4"
      ? "Weekdays"
      : days.map((d) => ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d]).join(", ");

export function addRoutine(title: string, days: number[], start: number) {
  const r: Routine = { id: uid(), title, days: [...days].sort(), start, u: now() };
  writeStored(ROUTINES_KEY, [...allRoutines(), r]);
  ensureRoutineTasks(start);
}

/** Stops a repeating task from today on; days already passed keep their record. */
export function deleteRoutine(r: Routine, today: number) {
  writeStored(ROUTINES_KEY, allRoutines().map((x) => (x.id === r.id ? { ...x, deleted: true, u: now() } : x)));
  saveTasks(
    allTasks().map((t) => (t.routine === r.id && t.date >= today && !t.done ? { ...t, deleted: true, u: now() } : t)),
  );
}

const routineTaskId = (r: Routine, day: number) => `r-${r.id}-${day}`;
const appliesOn = (r: Routine, day: number) => !r.deleted && day >= r.start && r.days.includes(weekday(day));

/** Makes today's copy of each repeating task (same id on every device, so no duplicates). */
export function ensureRoutineTasks(today: number) {
  const tasks = allTasks();
  const have = new Set(tasks.map((t) => t.id));
  const fresh: Task[] = allRoutines()
    .filter((r) => appliesOn(r, today) && !have.has(routineTaskId(r, today)))
    .map((r) => ({
      id: routineTaskId(r, today), title: r.title, date: today, origin: today, done: false,
      missed: [], routine: r.id, created: now(), u: now(),
    }));
  if (fresh.length) saveTasks([...tasks, ...fresh]);
}

/** Moves unfinished one-off tasks from past days onto today. */
export function rollOver(today: number) {
  let changed = false;
  const next = allTasks().map((t) => {
    if (t.deleted || t.done || t.routine || t.date >= today) return t;
    changed = true;
    const missed = [...t.missed];
    for (let d = t.date; d < today; d++) if (!missed.includes(d)) missed.push(d);
    return { ...t, date: today, missed, u: now() };
  });
  if (changed) saveTasks(next);
}

/** Tasks to show on a day, with previews of repeating tasks on future days. */
export function tasksOn(day: number, tasks: Task[], routines: Routine[], today: number): Task[] {
  const list = tasks.filter((t) => t.date === day);
  if (day > today) {
    const ids = new Set(list.map((t) => t.id));
    for (const r of routines)
      if (appliesOn(r, day) && !ids.has(routineTaskId(r, day)))
        list.push({
          id: routineTaskId(r, day), title: r.title, date: day, origin: day, done: false,
          missed: [], routine: r.id, created: 0, u: 0,
        });
  }
  return list.sort((a, b) => Number(a.done) - Number(b.done) || Number(!!b.top) - Number(!!a.top) || a.created - b.created);
}

/**
 * How a finished day went: tasks done out of tasks that were due that day.
 * A repeating task due that day counts even if the app wasn't opened to create it.
 */
export function dayScore(day: number, tasks: Task[], routines: Routine[] = []) {
  let done = 0, due = 0;
  const ids = new Set<string>();
  for (const t of tasks) {
    ids.add(t.id);
    if (t.date === day) {
      due++;
      if (t.done) done++;
    } else if (t.missed.includes(day)) due++;
  }
  for (const r of routines) if (appliesOn(r, day) && !ids.has(routineTaskId(r, day))) due++;
  return { done, due };
}

/**
 * dayScore for many days at once: one pass over the tasks indexes them by day,
 * so scoring a month or a year doesn't look through every task for every day.
 */
export function dayScorer(tasks: Task[], routines: Routine[] = []) {
  const byDay = new Map<number, { done: number; due: number }>();
  const ids = new Set<string>();
  const bump = (day: number, done: boolean) => {
    const s = byDay.get(day) ?? { done: 0, due: 0 };
    s.due++;
    if (done) s.done++;
    byDay.set(day, s);
  };
  for (const t of tasks) {
    ids.add(t.id);
    bump(t.date, t.done);
    for (const m of t.missed) if (m !== t.date) bump(m, false);
  }
  return (day: number) => {
    const s = byDay.get(day);
    const done = s?.done ?? 0;
    let due = s?.due ?? 0;
    for (const r of routines) if (appliesOn(r, day) && !ids.has(routineTaskId(r, day))) due++;
    return { done, due };
  };
}

/** "2 days late" style label for a task that was postponed. */
export const lateBy = (t: Task) => (t.routine ? 0 : t.date - t.origin);

/** Days ahead of plan, for tasks pulled forward from a later day. */
export const earlyBy = (t: Task) => (t.routine ? 0 : Math.max(0, t.origin - t.date));

/** A one-off task that keeps moving: 5 misses, and 5 more each time the person chooses to keep it. */
export const isStuck = (t: Task, today: number) =>
  !t.done && !t.routine && t.date === today && t.missed.length >= (t.kept ?? 0) + 5;
