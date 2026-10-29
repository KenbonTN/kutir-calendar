"use client";

// The task pool: things to do that don't have a day yet. Planning one moves it
// onto a day as a normal task; sending a task back puts it in the pool again.

import { records, type Rec } from "./records";
import { addTask, clean, deleteTask, type Task, type TaskExtras } from "./tasks";

export type PoolItem = Rec & {
  title: string;
  area?: string;
  goal?: string;
  mins?: number;
  created: number;
};

export const poolStore = records<PoolItem>("kutir-pool-v1");
export const POOL_KEY = poolStore.key;

export const addToPool = (title: string, extras: TaskExtras = {}) =>
  poolStore.add({ title, ...clean(extras), created: Date.now() });

export const updatePoolItem = (id: string, p: Partial<PoolItem>) => poolStore.patch(id, p);
export const deletePoolItem = (id: string) => poolStore.remove(id);

export function planPoolItem(item: PoolItem, day: number) {
  addTask(item.title, day, { area: item.area, goal: item.goal, mins: item.mins });
  poolStore.remove(item.id);
}

export function backToPool(t: Task) {
  addToPool(t.title, { area: t.area, goal: t.goal, mins: t.mins });
  deleteTask(t);
}

/** "1h 30m", "45m" */
export const minsLabel = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`);
export const ESTIMATES = [15, 30, 60, 120, 240];
