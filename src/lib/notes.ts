"use client";

// One short reflection per day: what went well and what got in the way.

import { useMemo } from "react";
import { records, useRecords, type Rec } from "./records";

export type DayNote = Rec & { day: number; well: string; blocked: string };

export const noteStore = records<DayNote>("kutir-notes-v1");
export const NOTES_KEY = noteStore.key;

export function useNotes() {
  const all = useRecords(noteStore);
  return useMemo(() => new Map(all.map((n) => [n.day, n])), [all]);
}

export const saveNote = (day: number, well: string, blocked: string) =>
  noteStore.put({ id: `n-${day}`, day, well: well.trim(), blocked: blocked.trim(), u: 0 });
