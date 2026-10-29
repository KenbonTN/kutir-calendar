"use client";

// Focus timer: one task at a time. The running timer lives on this device only;
// when it stops, the minutes are added to the task's `spent`, which syncs.

import { allTasks, updateTask } from "./tasks";
import { useStored, writeStored, readStored } from "./storage";

export type Running = { task: string; title: string; since: number; goal: number };
const KEY = "kutir-focus-running";

export const useFocus = () => useStored<Running | null>(KEY, null)[0];

/** Starts timing a task; `goal` is the planned minutes (or 25, a classic focus block). */
export function startFocus(task: { id: string; title: string; mins?: number }) {
  stopFocus();
  writeStored<Running>(KEY, { task: task.id, title: task.title, since: Date.now(), goal: task.mins || 25 });
}

/** Stops the timer and saves the time. Returns the minutes added. */
export function stopFocus(done = false) {
  const r = readStored<Running | null>(KEY, null);
  if (!r) return 0;
  writeStored(KEY, null);
  const mins = Math.max(1, Math.round((Date.now() - r.since) / 60e3));
  const t = allTasks().find((x) => x.id === r.task);
  if (t) updateTask(t, { spent: (t.spent ?? 0) + mins, ...(done ? { done: true } : {}) });
  return mins;
}

export const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(sec).padStart(2, "0")}`;
};

/** How your estimates compare with the time tasks really took (tasks with both). */
export function estimateAccuracy(tasks: { mins?: number; spent?: number; done: boolean }[]) {
  const both = tasks.filter((t) => t.done && t.mins && t.spent);
  if (both.length < 3) return null;
  const planned = both.reduce((a, t) => a + t.mins!, 0);
  const spent = both.reduce((a, t) => a + t.spent!, 0);
  return { count: both.length, ratio: spent / planned };
}
