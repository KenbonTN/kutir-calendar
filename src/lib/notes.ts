"use client";

// The evening journal, one per day: how the day felt, the wins, what got in the
// way, one thing you're grateful for and a lesson. Older entries have only
// `well` (wins) and `blocked`, so everything else is optional.

import { useMemo } from "react";
import { records, useRecords, type Rec } from "./records";

export type DayNote = Rec & {
  day: number;
  /** wins: what went well or moved forward */
  well: string;
  /** what got in the way */
  blocked: string;
  /** 1 (hard) to 5 (great) */
  rating?: number;
  mood?: number;
  energy?: number;
  grateful?: string;
  lesson?: string;
};

export const noteStore = records<DayNote>("kutir-notes-v1");
export const NOTES_KEY = noteStore.key;

export function useNotes() {
  const all = useRecords(noteStore);
  return useMemo(() => new Map(all.map((n) => [n.day, n])), [all]);
}

export type Journal = Omit<DayNote, "id" | "u" | "day" | "deleted">;

/** Saves the day's entry; empty text fields and unset scores are left out. */
export const saveJournal = (day: number, j: Journal) =>
  noteStore.put({
    id: `n-${day}`,
    day,
    well: j.well.trim(),
    blocked: j.blocked.trim(),
    rating: j.rating || undefined,
    mood: j.mood || undefined,
    energy: j.energy || undefined,
    grateful: j.grateful?.trim() || undefined,
    lesson: j.lesson?.trim() || undefined,
    u: 0,
  });

export const saveNote = (day: number, well: string, blocked: string) => saveJournal(day, { well, blocked });

export const SCORE_FACES = ["", "😣", "😕", "😐", "🙂", "😄"];
