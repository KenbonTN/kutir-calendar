"use client";

import { Check, Church, Leaf, Star, Trophy } from "lucide-react";
import {
  formatEt, formatEtAm, formatGLong, fromJdn, geez, MONTHS_AM, WEEKDAYS, WEEKDAYS_AM, weekday,
} from "@/lib/ethiopian";
import { matchesOn } from "@/lib/fixtures";
import { orthodoxDay } from "@/lib/orthodox";
import type { Goal } from "@/lib/goals";
import { MatchRow } from "./MatchRow";

type Props = {
  j: number;
  today: number;
  now: number;
  goal: Goal | null;
  onToggle: (j: number) => void;
};

export function DaySheet({ j, today, now, goal, onToggle }: Props) {
  const e = fromJdn(j);
  const od = orthodoxDay(j);
  const matches = matchesOn(j);
  const end = goal ? goal.start + goal.days - 1 : -1;
  const inPlan = !!goal && j >= goal.start && j <= end;
  const done = inPlan && goal!.done.includes(j);
  const rel = j === today ? "Today" : j === today + 1 ? "Tomorrow" : j === today - 1 ? "Yesterday" : null;

  return (
    <div className="grid gap-5">
      <header className="pr-10">
        <p className="text-sm font-semibold text-muted">
          {rel && <span className="mr-2 rounded-full bg-gold-soft px-2 py-0.5 text-gold">{rel}</span>}
          {WEEKDAYS[weekday(j)]} · <span lang="am">{WEEKDAYS_AM[weekday(j)]}</span>
        </p>
        <h2 className="mt-1 font-display text-3xl font-extrabold leading-tight">{formatEt(j)}</h2>
        <p lang="am" className="text-lg font-semibold text-green">
          {MONTHS_AM[e.m - 1]} {geez(e.d)} · {formatEtAm(j)}
        </p>
        <p className="text-sm text-muted">{formatGLong(j)}</p>
      </header>

      {inPlan && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-2 p-3">
          <div className="min-w-0 text-sm">
            <div className="font-semibold">{goal!.name}</div>
            <div className="text-muted">
              Day {j - goal!.start + 1} of {goal!.days}
            </div>
          </div>
          {j <= today ? (
            <button
              type="button"
              onClick={() => onToggle(j)}
              aria-pressed={done}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 ${
                done ? "bg-surface text-muted ring-1 ring-line" : "bg-marker text-white"
              }`}
            >
              {done ? <>Undo cross</> : <>✕ Cross off this day</>}
            </button>
          ) : (
            <span className="text-sm text-muted">Comes up in {j - today} day{j - today === 1 ? "" : "s"}</span>
          )}
        </div>
      )}
      {done && (
        <p className="-mt-3 flex items-center gap-1.5 text-sm font-medium text-green">
          <Check size={16} /> Crossed off
        </p>
      )}

      <section className="grid gap-3">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
          <Church size={14} /> Orthodox calendar
        </h3>
        <div className="rounded-2xl border border-line p-3">
          <div className="text-xs text-muted">Remembered on the {e.d}{suffix(e.d)} of every month</div>
          <div className="font-semibold">{od.monthly.en}</div>
          <div lang="am" className="text-green">{od.monthly.am}</div>
        </div>
        {od.feasts.map((f) => (
          <div key={f.en} className="flex items-start gap-2 rounded-2xl bg-gold-soft p-3">
            <Star size={16} className="mt-0.5 shrink-0 text-gold" fill={f.kind === "major" ? "currentColor" : "none"} />
            <div>
              <div className="font-semibold">{f.en}</div>
              <div lang="am" className="text-sm">{f.am}</div>
              {f.kind === "national" && <div className="text-xs text-muted">National holiday</div>}
            </div>
          </div>
        ))}
        {od.fast && (
          <div className="flex items-center gap-2 text-sm">
            <Leaf size={16} className="text-green" />
            <span>
              Fasting day: {od.fast.en} · <span lang="am">{od.fast.am}</span>
            </span>
          </div>
        )}
      </section>

      {matches.length > 0 && (
        <section>
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
            <Trophy size={14} /> Football
          </h3>
          <div className="divide-y divide-line">
            {matches.map((m) => (
              <MatchRow key={m.id} m={m} now={now} showDate={false} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const suffix = (n: number) => (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th");
