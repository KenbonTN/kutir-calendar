"use client";

import { ArrowRight, CalendarRange, Flag } from "lucide-react";
import { useState } from "react";
import {
  formatEt, formatG, fromJdn, gregorianToJdn, jdnToDate, monthLength, MONTHS, MONTHS_AM, toJdn,
} from "@/lib/ethiopian";
import { useStored } from "@/lib/storage";

const PRESETS: [string, number][] = [
  ["1 week", 7], ["2 weeks", 14], ["30 days", 30], ["60 days", 60], ["90 days", 90],
];
const G_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const field = "rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[15px] min-w-0";
const label = "text-xs font-bold uppercase tracking-[0.12em] text-muted";
const chip = (on: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
    on ? "border-green bg-green-soft text-green" : "border-line bg-surface-2 hover:border-muted"
  }`;

export type Cal = "ethiopian" | "gregorian";

/** A day/month/year picker in either calendar; the value is always a JDN. */
export function DatePicker({ value, onChange, cal, id }: { value: number; onChange: (j: number) => void; cal: Cal; id: string }) {
  if (cal === "ethiopian") {
    const e = fromJdn(value);
    const set = (y: number, m: number, d: number) => onChange(toJdn(y, m, Math.min(d, monthLength(y, m))));
    return (
      <div className="flex flex-wrap gap-2">
        <select id={`${id}-d`} aria-label="Day" className={field} value={e.d} onChange={(x) => set(e.y, e.m, +x.target.value)}>
          {Array.from({ length: monthLength(e.y, e.m) }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
        </select>
        <select id={`${id}-m`} aria-label="Month" className={field} value={e.m} onChange={(x) => set(e.y, +x.target.value, e.d)}>
          {MONTHS.map((mn, i) => <option key={mn} value={i + 1}>{mn} · {MONTHS_AM[i]}</option>)}
        </select>
        <select id={`${id}-y`} aria-label="Year" className={field} value={e.y} onChange={(x) => set(+x.target.value, e.m, e.d)}>
          {[e.y - 1, e.y, e.y + 1, e.y + 2].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    );
  }
  const g = jdnToDate(value);
  const y = g.getUTCFullYear(), m = g.getUTCMonth() + 1, d = g.getUTCDate();
  const daysIn = (yy: number, mm: number) => new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  const set = (yy: number, mm: number, dd: number) => onChange(gregorianToJdn(yy, mm, Math.min(dd, daysIn(yy, mm))));
  return (
    <div className="flex flex-wrap gap-2">
      <select id={`${id}-gm`} aria-label="Month" className={field} value={m} onChange={(x) => set(y, +x.target.value, d)}>
        {G_MONTHS.map((mn, i) => <option key={mn} value={i + 1}>{mn}</option>)}
      </select>
      <select id={`${id}-gd`} aria-label="Day" className={field} value={d} onChange={(x) => set(y, m, +x.target.value)}>
        {Array.from({ length: daysIn(y, m) }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
      </select>
      <select id={`${id}-gy`} aria-label="Year" className={field} value={y} onChange={(x) => set(+x.target.value, m, d)}>
        {[y - 1, y, y + 1, y + 2].map((yy) => <option key={yy} value={yy}>{yy}</option>)}
      </select>
    </div>
  );
}

/** Ethiopian / Gregorian switch, shared by every place that picks or shows countdown dates. */
export function CalSwitch({ cal, setCal, id }: { cal: Cal; setCal: (c: Cal) => void; id: string }) {
  return (
    <select
      id={id}
      aria-label="Calendar"
      value={cal}
      onChange={(e) => setCal(e.target.value as Cal)}
      className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold"
    >
      <option value="ethiopian">Ethiopian calendar</option>
      <option value="gregorian">Gregorian calendar</option>
    </select>
  );
}

export function NewGoalForm({
  today,
  initial = {},
  onCreate,
}: {
  today: number;
  initial?: { name?: string; days?: number };
  onCreate: (g: { name: string; start: number; days: number }) => void;
}) {
  const [cal, setCal] = useStored<Cal>("kutir-pick-cal", "ethiopian");
  const [name, setName] = useState(initial.name ?? "");
  const [by, setBy] = useState<"length" | "deadline">("length");
  const [start, setStart] = useState(today);
  const [days, setDays] = useState(initial.days ?? 30);
  const [deadline, setDeadline] = useState(today + (initial.days ?? 30) - 1);

  const end = by === "length" ? start + days - 1 : deadline;
  const valid = end >= start;
  const total = end - start + 1;

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onCreate({ name: name.trim() || "My countdown", start, days: total });
      }}
    >
      <div className="pr-10">
        <h2 className="font-display text-2xl font-extrabold">New countdown</h2>
        <p className="text-sm text-muted">Every day that passes gets crossed off, all the way to your deadline.</p>
      </div>

      <label className="grid gap-1.5">
        <span className={label}>What are you counting down to?</span>
        <input
          id="goal-name"
          autoFocus
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Exam prep, 60 days of gym, saving for a trip…"
          className={field}
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-full border border-line bg-surface-2 p-1 text-sm font-semibold">
          {([["length", "Set a length", CalendarRange], ["deadline", "Pick a deadline", Flag]] as const).map(([k, l, Icon]) => (
            <button
              key={k}
              type="button"
              aria-pressed={by === k}
              onClick={() => {
                // Switching to a deadline starts from the length chosen so far, and back again.
                if (k === "deadline" && by === "length") setDeadline(start + days - 1);
                if (k === "length" && by === "deadline") setDays(Math.max(1, Math.min(1000, deadline - start + 1)));
                setBy(k);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition ${by === k ? "bg-ink text-bg" : "text-muted"}`}
            >
              <Icon size={14} /> {l}
            </button>
          ))}
        </div>
        <CalSwitch cal={cal} setCal={setCal} id="goal-cal" />
      </div>

      <fieldset className="grid gap-2">
        <legend className={`mb-1.5 ${label}`}>Start</legend>
        <DatePicker value={start} onChange={setStart} cal={cal} id="goal-start" />
        <div className="flex flex-wrap gap-2">
          <button type="button" className={chip(start === today)} onClick={() => setStart(today)}>Today</button>
          <button type="button" className={chip(start === today + 1)} onClick={() => setStart(today + 1)}>Tomorrow</button>
          <button
            type="button"
            className={chip(start === toJdn(fromJdn(today).y, fromJdn(today).m, 1))}
            onClick={() => setStart(toJdn(fromJdn(today).y, fromJdn(today).m, 1))}
          >
            1st of this Ethiopian month
          </button>
        </div>
      </fieldset>

      {by === "length" ? (
        <fieldset className="grid gap-2">
          <legend className={`mb-1.5 ${label}`}>How long?</legend>
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map(([l, n]) => (
              <button key={n} type="button" className={chip(days === n)} onClick={() => setDays(n)}>{l}</button>
            ))}
            <label className="flex items-center gap-2 text-sm text-muted">
              or
              <input
                id="goal-days"
                type="number"
                min={1}
                max={1000}
                value={days}
                onChange={(e) => {
                  const n = Math.round(+e.target.value);
                  if (n >= 1 && n <= 1000) setDays(n);
                }}
                className={`${field} w-20`}
              />
              days
            </label>
          </div>
        </fieldset>
      ) : (
        <fieldset className="grid gap-2">
          <legend className={`mb-1.5 ${label}`}>Deadline (last day)</legend>
          <DatePicker value={deadline} onChange={setDeadline} cal={cal} id="goal-end" />
          {deadline < start && <p className="text-sm font-semibold text-marker">The deadline has to be on or after the start day.</p>}
        </fieldset>
      )}

      <div className="grid gap-2 rounded-2xl bg-surface-2 p-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <DateBoth j={start} title="Starts" />
          <ArrowRight size={18} className="text-muted" />
          <DateBoth j={end} title="Deadline" align="right" />
        </div>
        <div className="text-center font-display text-lg font-extrabold">
          {valid ? `${total} day${total === 1 ? "" : "s"}` : "—"}
        </div>
      </div>

      <button type="submit" disabled={!valid} className="rounded-full bg-green py-3 font-semibold text-on-green transition active:scale-[0.98] disabled:opacity-40">
        Start countdown
      </button>
    </form>
  );
}

/** One date in both calendars, Ethiopian first. */
export function DateBoth({ j, title, align = "left" }: { j: number; title?: string; align?: "left" | "right" }) {
  return (
    <div className={`min-w-0 ${align === "right" ? "text-right" : ""}`}>
      {title && <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{title}</div>}
      <div className="font-semibold leading-snug">{formatEt(j)}</div>
      <div className="text-sm text-muted">{formatG(j)}</div>
    </div>
  );
}
