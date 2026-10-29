"use client";

// Birthdays and other important dates. A yearly date comes back on the same day
// of the calendar it was entered in: an Ethiopian birthday on the same Ethiopian
// day (Pagume 6 falls back to Pagume 5), a Gregorian one on the same Gregorian
// day (29 February falls back to 28 February).

import { useMemo } from "react";
import { fromJdn, gregorianToJdn, jdnToDate, monthLength, toJdn } from "./ethiopian";
import type { Cal } from "./months";
import { records, useRecords, type Rec } from "./records";

export const KINDS = [
  { key: "birthday", name: "Birthday", emoji: "🎂" },
  { key: "anniversary", name: "Anniversary", emoji: "💍" },
  { key: "memorial", name: "Remembrance (tazkar)", emoji: "🕯️" },
  { key: "celebration", name: "Celebration", emoji: "🎉" },
  { key: "appointment", name: "Appointment", emoji: "📅" },
  { key: "deadline", name: "Deadline", emoji: "📌" },
  { key: "other", name: "Other", emoji: "⭐" },
] as const;
export type KindKey = (typeof KINDS)[number]["key"];
export const kind = (k: string) => KINDS.find((x) => x.key === k) ?? KINDS[KINDS.length - 1];

export type DateEvent = Rec & {
  title: string;
  kind: KindKey;
  /** the original date (a birth date, a wedding day…), as a JDN */
  date: number;
  /** which calendar it repeats in */
  cal: Cal;
  yearly: boolean;
  /** is the year of `date` real? (Used for "turns 30".) */
  hasYear: boolean;
  /** remind this many days before, besides on the day */
  remind: number;
  note?: string;
  created: number;
};

export const eventStore = records<DateEvent>("kutir-events-v1");
export const EVENTS_KEY = eventStore.key;
export const useEvents = () => useRecords(eventStore);

export const addEvent = (e: Omit<DateEvent, "id" | "u" | "created">) =>
  eventStore.add({ ...e, note: e.note || undefined, created: Date.now() } as DateEvent);
export const saveEvent = (e: DateEvent) => eventStore.put(e);
export const deleteEvent = (id: string) => eventStore.remove(id);

/** The day it falls on in a given year of its calendar. */
function inYear(ev: DateEvent, y: number) {
  if (ev.cal === "ethiopian") {
    const e = fromJdn(ev.date);
    return toJdn(y, e.m, Math.min(e.d, monthLength(y, e.m)));
  }
  const g = jdnToDate(ev.date);
  const m = g.getUTCMonth() + 1;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return gregorianToJdn(y, m, Math.min(g.getUTCDate(), last));
}

const yearOf = (cal: Cal, j: number) => (cal === "ethiopian" ? fromJdn(j).y : jdnToDate(j).getUTCFullYear());

/** The first time it happens on or after day `j`, or null for a one-off date that has passed. */
export function nextOn(ev: DateEvent, j: number) {
  if (!ev.yearly) return ev.date >= j ? ev.date : null;
  const y = yearOf(ev.cal, j);
  for (const yy of [y - 1, y, y + 1]) {
    const d = inYear(ev, yy);
    if (d >= j && d >= ev.date) return d;
  }
  return null;
}

/** "turns 30", "10 years" for dates whose year is known. */
export function yearsLabel(ev: DateEvent, on: number) {
  if (!ev.yearly || !ev.hasYear) return null;
  const n = yearOf(ev.cal, on) - yearOf(ev.cal, ev.date);
  if (n <= 0) return null;
  return ev.kind === "birthday" ? `turns ${n}` : `${n} year${n === 1 ? "" : "s"}`;
}

export type Occurrence = { ev: DateEvent; day: number; years: string | null };

/** Everything happening in [from, to], soonest first. */
export function between(events: DateEvent[], from: number, to: number): Occurrence[] {
  const out: Occurrence[] = [];
  for (const ev of events) {
    let d = nextOn(ev, from);
    while (d != null && d <= to) {
      out.push({ ev, day: d, years: yearsLabel(ev, d) });
      d = ev.yearly ? nextOn(ev, d + 1) : null;
    }
  }
  return out.sort((a, b) => a.day - b.day || a.ev.title.localeCompare(b.ev.title));
}

/** Days to their date for each event, in the order they come. */
export function useEventsBetween(from: number, to: number) {
  const events = useEvents();
  return useMemo(() => between(events, from, to), [events, from, to]);
}

/** Dates to mention today: those on today, and those whose reminder window has started. */
export const dueReminders = (events: DateEvent[], today: number) =>
  between(events, today, today + 30).filter((o) => o.day - today <= o.ev.remind);

export const REMIND_OPTIONS: [number, string][] = [
  [0, "On the day"], [1, "1 day before"], [3, "3 days before"], [7, "1 week before"], [14, "2 weeks before"],
];

export const whenLabel = (day: number, today: number) =>
  day === today ? "Today" : day === today + 1 ? "Tomorrow" : `In ${day - today} days`;
