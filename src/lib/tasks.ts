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

export function addTask(title: string, date: number) {
  const t: Task = { id: uid(), title, date, origin: date, done: false, missed: [], created: now(), u: now() };
  saveTasks([...allTasks(), t]);
}

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
  return list.sort((a, b) => Number(a.done) - Number(b.done) || a.created - b.created);
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

/** "2 days late" style label for a task that was postponed. */
export const lateBy = (t: Task) => (t.routine ? 0 : t.date - t.origin);
