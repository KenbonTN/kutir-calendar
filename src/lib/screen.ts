"use client";

// Daily minutes on TikTok, Instagram and YouTube, typed in from the iPhone's
// Screen Time each evening, plus the messages that put those minutes in perspective.

import { useMemo } from "react";
import { fromJdn, MONTHS, toJdn } from "./ethiopian";
import { readStored, useStored, writeStored } from "./storage";

export const APPS = [
  { key: "tiktok", name: "TikTok", color: "var(--tiktok)" },
  { key: "instagram", name: "Instagram", color: "var(--instagram)" },
  { key: "youtube", name: "YouTube", color: "var(--youtube)" },
] as const;
export type AppKey = (typeof APPS)[number]["key"];

export type ScreenLog = { id: string; day: number; tiktok: number; instagram: number; youtube: number; u: number };

export const SCREEN_KEY = "kutir-screen-v1";
const NONE: ScreenLog[] = [];

export const total = (l: Pick<ScreenLog, AppKey>) => l.tiktok + l.instagram + l.youtube;

export function useScreen() {
  const [logs] = useStored<ScreenLog[]>(SCREEN_KEY, NONE);
  return useMemo(() => new Map(logs.map((l) => [l.day, l])), [logs]);
}

export function logScreen(day: number, mins: Record<AppKey, number>) {
  const rest = readStored<ScreenLog[]>(SCREEN_KEY, NONE).filter((l) => l.day !== day);
  writeStored(SCREEN_KEY, [...rest, { id: String(day), day, ...mins, u: Date.now() }]);
}

export type Period = "day" | "week" | "month" | "year";

/** The days a period covers: today, the last 7 days, this Ethiopian month, this Ethiopian year. */
export function periodRange(p: Period, today: number): [number, number] {
  const e = fromJdn(today);
  if (p === "day") return [today, today];
  if (p === "week") return [today - 6, today];
  if (p === "month") return [toJdn(e.y, e.m, 1), today];
  return [toJdn(e.y, 1, 1), today];
}

export function periodLabel(p: Period, today: number) {
  const e = fromJdn(today);
  return p === "day" ? "Today" : p === "week" ? "Last 7 days" : p === "month" ? `${MONTHS[e.m - 1]} so far` : `${e.y} E.C. so far`;
}

export function sumRange(logs: Map<number, ScreenLog>, from: number, to: number) {
  const s = { tiktok: 0, instagram: 0, youtube: 0, days: 0 };
  for (let d = from; d <= to; d++) {
    const l = logs.get(d);
    if (!l) continue;
    s.tiktok += l.tiktok;
    s.instagram += l.instagram;
    s.youtube += l.youtube;
    s.days++;
  }
  return s;
}

export const fmt = (mins: number) => {
  const h = Math.floor(mins / 60), m = Math.round(mins % 60);
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
};

const n = (x: number) => (x >= 10 ? Math.round(x) : Math.round(x * 10) / 10);

/** What the same minutes could have bought. Each entry: minutes per unit and how to say it. */
const SWAPS: [number, (k: number) => string][] = [
  [2, (k) => `${n(k)} pages of a book`],
  [600, (k) => `${n(k)} whole books (300 pages each)`],
  [60, (k) => `${n(k)} gym sessions`],
  [12, (k) => `${n(k)} km of walking`],
  [15, (k) => `${n(k)} 15-minute language lessons`],
  [105, (k) => `${n(k)} full football matches`],
  [90, (k) => `${n(k)} 90-minute blocks of focused study`],
  [480, (k) => `${n(k)} full nights of sleep`],
];

/**
 * Messages for the dashboard, picked from the numbers themselves. `seed` rotates
 * the examples day to day so the page doesn't say the same thing every visit.
 */
export function wasteMessages(opts: {
  period: Period;
  mins: Record<AppKey, number>;
  days: number;
  weekAvg: number;
  postponed: number;
  seed: number;
}) {
  const { period, mins, days, weekAvg, postponed, seed } = opts;
  const sum = total(mins);
  const out: string[] = [];
  const when = period === "day" ? "today" : period === "week" ? "in the last 7 days" : period === "month" ? "this month" : "this year";
  if (!days) return out;

  const top = APPS.map((a) => ({ ...a, m: mins[a.key] })).sort((a, b) => b.m - a.m)[0];
  if (sum < 1) {
    out.push(`Zero minutes on TikTok, Instagram and YouTube ${when}. That's the time you get back.`);
    return out;
  }

  out.push(`You spent ${fmt(sum)} scrolling ${when}${top.m ? `, most of it on ${top.name} (${fmt(top.m)})` : ""}.`);

  const fits = SWAPS.filter(([per]) => sum / per >= 1 && sum / per <= 400);
  for (let i = 0; i < Math.min(2, fits.length); i++) {
    const [per, say] = fits[(seed + i * 3) % fits.length];
    out.push(`${i ? "Or" : "That's"} ${say(sum / per)}.`);
  }

  if (sum >= 1440) out.push(`Put together, that's ${n(sum / 1440)} full days of your life, awake or not.`);

  if (weekAvg > 0) {
    const yearly = (weekAvg * 365) / 60;
    out.push(
      `At your current pace (${fmt(weekAvg)} a day), that adds up to ${Math.round(yearly)} hours a year, about ${n(yearly / 24)} days.`,
    );
  }

  if (postponed > 0 && period !== "year")
    out.push(`Meanwhile ${postponed} task${postponed === 1 ? " was" : "s were"} pushed to another day ${when}.`);

  return out;
}
