"use client";

// Faith features. Each person chooses Orthodox Christian, Muslim or neither; the
// choice (and, for Muslims, where they pray from and how times are worked out)
// is a one-record "profile" that syncs like everything else.
//
// Muslims get the five daily prayer times, the Hijri date and Islamic days, and a
// tracker for prayers and Quran reading. Orthodox Christians keep the Ethiopian
// Orthodox calendar (saints, feasts, fasts) and get a tracker for prayer, church
// and Bible reading. Both get a verse of the day.

import { useMemo } from "react";
import { jdnToDate } from "./ethiopian";
import { orthodoxDay, type Feast, type Named } from "./orthodox";
import { records, useRecords, type Rec } from "./records";

export type FaithKind = "orthodox" | "muslim" | "other";
export type Method = "mwl" | "umm" | "egypt" | "karachi" | "isna";

export type Profile = Rec & {
  faith?: FaithKind;
  /** where prayer times are worked out for (default Addis Ababa) */
  lat?: number;
  lng?: number;
  place?: string;
  /** hours ahead of UTC at that place */
  tz?: number;
  method?: Method;
  asr?: "shafi" | "hanafi";
  /** push a reminder at each prayer time (Muslims) or at `times` (Christians) */
  remind?: boolean;
  /** Christian prayer reminder times, "HH:MM" */
  times?: string[];
};

export const profileStore = records<Profile>("kutir-profile-v1");
export const PROFILE_KEY = profileStore.key;
const ID = "me";

export function useProfile(): Profile {
  const all = useRecords(profileStore);
  return useMemo(() => all.find((p) => p.id === ID) ?? { id: ID, u: 0 }, [all]);
}
export const saveProfile = (p: Partial<Profile>) => {
  const cur = profileStore.all().find((x) => x.id === ID && !x.deleted) ?? { id: ID, u: 0 };
  profileStore.put({ ...cur, ...p, id: ID } as Profile);
};

export const ADDIS = { lat: 9.0301, lng: 38.7408, tz: 3, place: "Addis Ababa" };

export const METHODS: Record<Method, { name: string; fajr: number; isha: number | { after: number } }> = {
  mwl: { name: "Muslim World League", fajr: 18, isha: 17 },
  umm: { name: "Umm al-Qura (Makkah)", fajr: 18.5, isha: { after: 90 } },
  egypt: { name: "Egyptian General Authority", fajr: 19.5, isha: 17.5 },
  karachi: { name: "University of Islamic Sciences, Karachi", fajr: 18, isha: 18 },
  isna: { name: "Islamic Society of North America", fajr: 15, isha: 15 },
};

/* ---------- Prayer times ---------- */

export const PRAYERS = [
  { key: "fajr", name: "Fajr", am: "ፈጅር" },
  { key: "dhuhr", name: "Dhuhr", am: "ዙህር" },
  { key: "asr", name: "Asr", am: "ዐስር" },
  { key: "maghrib", name: "Maghrib", am: "መግሪብ" },
  { key: "isha", name: "Isha", am: "ዒሻ" },
] as const;
export type PrayerKey = (typeof PRAYERS)[number]["key"];

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const fix = (a: number, b: number) => ((a % b) + b) % b;

/** Sun's declination and the equation of time for a Julian date (the method prayer timetables use). */
function sun(jd: number) {
  const D = jd - 2451545.0;
  const g = fix(357.529 + 0.98560028 * D, 360);
  const q = fix(280.459 + 0.98564736 * D, 360);
  const L = fix(q + 1.915 * Math.sin(rad(g)) + 0.02 * Math.sin(rad(2 * g)), 360);
  const e = 23.439 - 0.00000036 * D;
  const RA = fix(deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(L)), Math.cos(rad(L)))) / 15, 24);
  return { decl: deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(L)))), eqt: q / 15 - RA };
}

/**
 * The five prayer times (and sunrise) on day `j`, as minutes after local midnight.
 * Each is worked out twice, the second time from the first estimate, which is accurate to about a minute.
 */
export function prayerTimes(j: number, p: Profile) {
  const lat = p.lat ?? ADDIS.lat, lng = p.lng ?? ADDIS.lng, tz = p.tz ?? ADDIS.tz;
  const m = METHODS[p.method ?? "mwl"];
  const asrFactor = p.asr === "hanafi" ? 2 : 1;
  const jd = j - 0.5 - lng / (15 * 24);
  const noon = (t: number) => fix(12 - sun(jd + t).eqt, 24);
  const angleTime = (angle: number, t: number, before: boolean) => {
    const { decl } = sun(jd + t);
    const c = (-Math.sin(rad(angle)) - Math.sin(rad(decl)) * Math.sin(rad(lat))) / (Math.cos(rad(decl)) * Math.cos(rad(lat)));
    const T = deg(Math.acos(Math.max(-1, Math.min(1, c)))) / 15;
    return noon(t) + (before ? -T : T);
  };
  const asrTime = (t: number) => {
    const { decl } = sun(jd + t);
    const angle = -deg(Math.atan(1 / (asrFactor + Math.tan(rad(Math.abs(lat - decl))))));
    return angleTime(angle, t, false);
  };
  const calc = (g: Record<string, number>) => ({
    fajr: angleTime(m.fajr, g.fajr / 24, true),
    sunrise: angleTime(0.833, g.sunrise / 24, true),
    dhuhr: noon(g.dhuhr / 24),
    asr: asrTime(g.asr / 24),
    maghrib: angleTime(0.833, g.maghrib / 24, false),
    isha: typeof m.isha === "number" ? angleTime(m.isha, g.isha / 24, false) : 0,
  });
  let t = calc({ fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, maghrib: 18, isha: 18 });
  t = calc(t);
  if (typeof m.isha !== "number") t.isha = t.maghrib + m.isha.after / 60;
  const local = (h: number) => Math.round(fix(h + tz - lng / 15, 24) * 60);
  // Dhuhr a minute after the sun's peak, as timetables do.
  return {
    fajr: local(t.fajr), sunrise: local(t.sunrise), dhuhr: local(t.dhuhr) + 1, asr: local(t.asr), maghrib: local(t.maghrib), isha: local(t.isha),
  };
}

export const hhmm = (mins: number) => `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

/** Minutes since local midnight at the profile's place. */
export const minutesNow = (now: number, p: Profile) => {
  const d = new Date(now + (p.tz ?? ADDIS.tz) * 3600e3);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};

/** The prayer now due (the last one whose time has come) and the next one. */
export function prayerNow(j: number, now: number, p: Profile) {
  const t = prayerTimes(j, p);
  const mins = minutesNow(now, p);
  const list = PRAYERS.map((x) => ({ ...x, at: t[x.key] }));
  const next = list.find((x) => x.at > mins) ?? { ...list[0], at: prayerTimes(j + 1, p).fajr + 24 * 60 };
  const current = [...list].reverse().find((x) => x.at <= mins) ?? null;
  return { times: t, list, next, current, mins };
}

/* ---------- Hijri calendar ---------- */

const HIJRI_MONTHS = [
  "Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Thani", "Jumada al-Ula", "Jumada al-Akhirah",
  "Rajab", "Sha'ban", "Ramadan", "Shawwal", "Dhu al-Qadah", "Dhu al-Hijjah",
];
let hijriFmt: Intl.DateTimeFormat | null = null;

/** The Islamic (Umm al-Qura) date for a day. Local announcements in Ethiopia can differ by a day. */
export function hijri(j: number) {
  hijriFmt ??= new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC" });
  const parts = hijriFmt.formatToParts(jdnToDate(j));
  const n = (t: string) => Number(parts.find((x) => x.type === t)?.value.replace(/\D/g, "") ?? 0);
  const m = n("month");
  return { d: n("day"), m, y: n("year") || n("relatedYear"), month: HIJRI_MONTHS[m - 1] ?? "" };
}

export const formatHijri = (j: number) => {
  const h = hijri(j);
  return `${h.d} ${h.month} ${h.y} AH`;
};

/** Islamic days worth marking; `fast` is set on days many Muslims fast. */
export function islamicDay(j: number): { name: string; major?: boolean; fast?: string } | null {
  const h = hijri(j);
  if (h.m === 9) return h.d === 1 ? { name: "Ramadan begins", major: true, fast: "Ramadan day 1" } : { name: `Ramadan day ${h.d}`, fast: `Ramadan day ${h.d}` };
  if (h.m === 10 && h.d === 1) return { name: "Eid al-Fitr", major: true };
  if (h.m === 12 && h.d === 9) return { name: "Day of Arafah", fast: "Day of Arafah" };
  if (h.m === 12 && h.d === 10) return { name: "Eid al-Adha", major: true };
  if (h.m === 1 && h.d === 1) return { name: "Islamic New Year" };
  if (h.m === 1 && h.d === 10) return { name: "Ashura", fast: "Ashura" };
  if (h.m === 3 && h.d === 12) return { name: "Mawlid (the Prophet's birthday)", major: true };
  if (h.m === 7 && h.d === 27) return { name: "Isra and Mi'raj" };
  if (h.m === 8 && h.d === 15) return { name: "Mid-Sha'ban" };
  return null;
}

/* ---------- Devotion tracker ---------- */

export type Devotion = Rec & {
  day: number;
  /** prayers or practices done that day (PrayerKey for Muslims; CHRISTIAN keys for Christians) */
  done: string[];
  /** Quran pages read that day */
  pages?: number;
};

export const devotionStore = records<Devotion>("kutir-devotion-v1");
export const DEVOTION_KEY = devotionStore.key;

export function useDevotion() {
  const all = useRecords(devotionStore);
  return useMemo(() => new Map(all.map((d) => [d.day, d])), [all]);
}

const dayRec = (day: number) => devotionStore.all().find((d) => d.id === `d-${day}` && !d.deleted);

export function toggleDevotion(day: number, key: string) {
  const cur = dayRec(day);
  const done = cur?.done.includes(key) ? cur.done.filter((k) => k !== key) : [...(cur?.done ?? []), key];
  devotionStore.put({ id: `d-${day}`, day, done, pages: cur?.pages, u: 0 });
}

export function setPages(day: number, pages: number) {
  const cur = dayRec(day);
  devotionStore.put({ id: `d-${day}`, day, done: cur?.done ?? [], pages: Math.max(0, pages) || undefined, u: 0 });
}

export const CHRISTIAN = [
  { key: "morning", name: "Morning prayer", emoji: "🌅" },
  { key: "evening", name: "Evening prayer", emoji: "🌙" },
  { key: "bible", name: "Bible reading", emoji: "📖" },
  { key: "church", name: "Church", emoji: "⛪" },
] as const;

/** A full reading of the Quran in the standard Madani mushaf. */
export const QURAN_PAGES = 604;

/* ---------- What a day shows, by faith ---------- */

/** Eid al-Fitr, Eid al-Adha and Mawlid are public holidays in Ethiopia, so everyone sees them. */
const PUBLIC_ISLAMIC = new Set(["Eid al-Fitr", "Eid al-Adha", "Mawlid (the Prophet's birthday)"]);

/**
 * The line under a date and the special days on it. Muslims see the Hijri date,
 * Islamic days and national holidays; everyone else sees the Ethiopian Orthodox
 * saint of the day, feasts and fasts (plus the Islamic public holidays).
 */
export function dayFor(j: number, faith?: FaithKind): { line: Named; feasts: Feast[]; fast: Named | null; muslim: boolean } {
  const od = orthodoxDay(j);
  const isl = islamicDay(j);
  if (faith === "muslim") {
    const feasts: Feast[] = od.feasts.filter((f) => f.kind === "national");
    if (isl) feasts.unshift({ en: isl.name, am: "", kind: isl.major ? "major" : "feast" });
    return { line: { en: formatHijri(j), am: "" }, feasts, fast: isl?.fast ? { en: isl.fast, am: "" } : null, muslim: true };
  }
  const feasts = [...od.feasts];
  if (isl && PUBLIC_ISLAMIC.has(isl.name)) feasts.push({ en: isl.name, am: "", kind: "national" });
  return { line: od.monthly, feasts, fast: od.fast, muslim: false };
}
