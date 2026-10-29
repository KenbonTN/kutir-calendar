"use client";

// Backup and export: everything as one JSON file (which can be loaded back),
// and birthdays plus planned tasks as an .ics file for Google or Apple Calendar.

import { FIELDS, merge, readLocal, type Field } from "./cloud";
import { formatEt, jdnToDate } from "./ethiopian";
import { between, kind, type DateEvent } from "./events";
import { writeStored } from "./storage";
import type { Task } from "./tasks";

function download(name: string, type: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

export function exportBackup() {
  const data = readLocal();
  download(`kutir-backup-${stamp()}.json`, "application/json", JSON.stringify({ app: "kutir", version: 1, saved: Date.now(), data }, null, 1));
  return Object.values(data).reduce((a, l) => a + l.filter((r) => !r.deleted).length, 0);
}

/** Merges a backup file in: record by record, the newer copy wins, so nothing newer is lost. */
export async function importBackup(file: File) {
  const parsed = JSON.parse(await file.text());
  if (parsed?.app !== "kutir" || typeof parsed.data !== "object") throw new Error("not a kutir backup");
  const incoming = Object.fromEntries(
    (Object.keys(FIELDS) as Field[]).map((f) => [f, Array.isArray(parsed.data[f]) ? parsed.data[f].filter((r: unknown) => r && typeof (r as { id?: unknown }).id === "string") : []]),
  ) as ReturnType<typeof readLocal>;
  const merged = merge(readLocal(), incoming);
  let count = 0;
  for (const f of Object.keys(FIELDS) as Field[]) {
    writeStored(FIELDS[f], merged[f]);
    count += incoming[f].length;
  }
  return count;
}

/* ---------- iCalendar ---------- */

const ymd = (j: number) => jdnToDate(j).toISOString().slice(0, 10).replaceAll("-", "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
/** Lines longer than 75 bytes are folded, as the format requires. */
const fold = (line: string) => line.match(/.{1,70}/gu)?.join("\r\n ") ?? line;

function vevent(uid: string, day: number, summary: string, description = "", alarmDays?: number) {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${uid}@kutir`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${ymd(day)}`,
    `DTEND;VALUE=DATE:${ymd(day + 1)}`,
    `SUMMARY:${esc(summary)}`,
  ];
  if (description) lines.push(`DESCRIPTION:${esc(description)}`);
  if (alarmDays != null)
    lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(summary)}`, `TRIGGER:-P${alarmDays}DT0H`, "END:VALARM");
  lines.push("END:VEVENT");
  return lines.map(fold).join("\r\n");
}

/**
 * Important dates for the next 3 years (Ethiopian dates move on the Gregorian
 * calendar, so each year is its own event) and tasks planned from today on.
 */
export function exportCalendar(events: DateEvent[], tasks: Task[], today: number) {
  const out: string[] = [];
  for (const o of between(events, today, today + 3 * 366)) {
    const k = kind(o.ev.kind);
    const title = `${k.emoji} ${o.ev.kind === "birthday" ? `${o.ev.title}'s birthday` : o.ev.title}${o.years ? ` (${o.years})` : ""}`;
    out.push(vevent(`ev-${o.ev.id}-${o.day}`, o.day, title, [formatEt(o.day), o.ev.note].filter(Boolean).join(" · "), o.ev.remind || undefined));
  }
  for (const t of tasks)
    if (!t.deleted && !t.done && !t.routine && t.date >= today) out.push(vevent(`task-${t.id}`, t.date, `☐ ${t.title}`, formatEt(t.date)));
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Kutir//Ethiopian planner//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Kutir", ...out, "END:VCALENDAR"].join("\r\n");
  download(`kutir-calendar-${stamp()}.ics`, "text/calendar", ics);
  return out.length;
}
