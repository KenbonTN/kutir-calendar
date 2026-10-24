"use client";

import { useState } from "react";
import { formatEt, formatG, fromJdn, monthLength, MONTHS, MONTHS_AM, toJdn } from "@/lib/ethiopian";

const PRESETS: [string, number][] = [
  ["1 week", 7], ["2 weeks", 14], ["1 month", 30], ["2 months", 60], ["3 months", 90],
];

const field = "rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[15px] min-w-0";
const chip = (on: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
    on ? "border-green bg-green-soft text-green" : "border-line bg-surface-2 hover:border-muted"
  }`;

export function NewGoalForm({
  today,
  onCreate,
}: {
  today: number;
  onCreate: (g: { name: string; start: number; days: number }) => void;
}) {
  const t = fromJdn(today);
  const [name, setName] = useState("");
  const [date, setDate] = useState({ y: t.y, m: t.m, d: t.d });
  const [days, setDays] = useState(30);

  const len = monthLength(date.y, date.m);
  const d = Math.min(date.d, len);
  const start = toJdn(date.y, date.m, d);
  const end = start + days - 1;

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        onCreate({ name: name.trim() || "My goal", start, days });
      }}
    >
      <h2 className="pr-10 font-display text-2xl font-extrabold">New goal</h2>

      <label className="grid gap-1.5">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">What are you tracking?</span>
        <input
          id="goal-name"
          autoFocus
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Gym, reading, learning Python…"
          className={field}
        />
      </label>

      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-xs font-bold uppercase tracking-[0.12em] text-muted">
          Start date (Ethiopian)
        </legend>
        <div className="flex flex-wrap gap-2">
          <select id="goal-day" aria-label="Day" className={field} value={d} onChange={(e) => setDate({ ...date, d: +e.target.value })}>
            {Array.from({ length: len }, (_, i) => (
              <option key={i} value={i + 1}>{i + 1}</option>
            ))}
          </select>
          <select id="goal-month" aria-label="Month" className={field} value={date.m} onChange={(e) => setDate({ ...date, m: +e.target.value })}>
            {MONTHS.map((mn, i) => (
              <option key={mn} value={i + 1}>{mn} · {MONTHS_AM[i]}</option>
            ))}
          </select>
          <select id="goal-year" aria-label="Year" className={field} value={date.y} onChange={(e) => setDate({ ...date, y: +e.target.value })}>
            {[t.y - 1, t.y, t.y + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={chip(start === today)} onClick={() => setDate({ y: t.y, m: t.m, d: t.d })}>
            Today
          </button>
          <button type="button" className={chip(start === toJdn(t.y, t.m, 1))} onClick={() => setDate({ y: t.y, m: t.m, d: 1 })}>
            1st of this month
          </button>
        </div>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-xs font-bold uppercase tracking-[0.12em] text-muted">How long?</legend>
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map(([label, n]) => (
            <button key={n} type="button" className={chip(days === n)} onClick={() => setDays(n)}>
              {label}
            </button>
          ))}
          <label className="flex items-center gap-2 text-sm text-muted">
            or
            <input
              id="goal-days"
              type="number"
              min={1}
              max={400}
              value={days}
              onChange={(e) => {
                const n = Math.round(+e.target.value);
                if (n >= 1 && n <= 400) setDays(n);
              }}
              className={`${field} w-20`}
            />
            days
          </label>
        </div>
      </fieldset>

      <p className="rounded-2xl bg-surface-2 p-3 text-sm">
        Runs <b>{formatEt(start)}</b> → <b>{formatEt(end)}</b>
        <br />
        <span className="text-muted">
          {formatG(start)} – {formatG(end)}
        </span>
      </p>

      <button type="submit" className="rounded-full bg-green py-3 font-semibold text-on-green transition active:scale-[0.98]">
        Start tracking
      </button>
    </form>
  );
}
