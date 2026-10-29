"use client";

import { Church, Gift, Hourglass, Leaf, ListChecks, NotebookPen, Plus, Star, Trophy } from "lucide-react";
import { useState } from "react";
import {
  formatEt, formatEtAm, formatGLong, fromJdn, geez, MONTHS_AM, WEEKDAYS, WEEKDAYS_AM, weekday,
} from "@/lib/ethiopian";
import { between, useEvents } from "@/lib/events";
import { matchesOn } from "@/lib/fixtures";
import { orthodoxDay } from "@/lib/orthodox";
import type { Goal } from "@/lib/goals";
import { fmt, total, type ScreenLog } from "@/lib/screen";
import { tasksOn, type Routine, type Task } from "@/lib/tasks";
import { MatchRow } from "./MatchRow";
import { ScreenLogForm } from "./ScreenTime";
import { EventForm, EventRow } from "./Dates";
import { DaySummary, Reflection } from "./Summary";
import { TaskList } from "./TaskList";

type Props = {
  j: number;
  today: number;
  now: number;
  goal: Goal | null;
  tasks: Task[];
  routines: Routine[];
  log?: ScreenLog;
};

const heading = "flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted";

export function DaySheet({ j, today, now, goal, tasks, routines, log }: Props) {
  const e = fromJdn(j);
  const od = orthodoxDay(j);
  const matches = matchesOn(j);
  const end = goal ? goal.start + goal.days - 1 : -1;
  const inPlan = !!goal && j >= goal.start && j <= end;
  const list = tasksOn(j, tasks, routines, today);
  const rel = j === today ? "Today" : j === today + 1 ? "Tomorrow" : j === today - 1 ? "Yesterday" : null;
  const dates = between(useEvents(), j, j);
  const [adding, setAdding] = useState(false);

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
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface-2 px-3 py-2 text-sm">
          <span className="font-semibold">{goal!.name}</span>
          <span className="text-muted">
            Day {j - goal!.start + 1} of {goal!.days}
            {j < today ? " · crossed off" : j === today ? " · today" : ` · in ${j - today} day${j - today === 1 ? "" : "s"}`}
          </span>
        </div>
      )}

      <section className="grid gap-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className={heading}>
            <Gift size={14} /> Birthdays & dates
          </h3>
          {!adding && (
            <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1 text-sm font-semibold text-green">
              <Plus size={14} /> Add a date
            </button>
          )}
        </div>
        {dates.length > 0 && (
          <div className="divide-y divide-line">
            {dates.map((o) => <EventRow key={o.ev.id} ev={o.ev} day={o.day} years={o.years} today={today} />)}
          </div>
        )}
        {adding && (
          <div className="mt-2 rounded-2xl border border-line p-3">
            <EventForm today={today} day={j} onDone={() => setAdding(false)} />
          </div>
        )}
      </section>

      <section className="grid gap-2">
        <h3 className={heading}>
          <ListChecks size={14} /> Tasks
        </h3>
        {j < today && <DaySummary day={j} today={today} tasks={tasks} routines={routines} log={log} />}
        <TaskList day={j} today={today} tasks={list} />
      </section>

      {j <= today && (
        <section className="grid gap-2">
          <h3 className={heading}>
            <NotebookPen size={14} /> Reflection
          </h3>
          <Reflection key={j} day={j} />
        </section>
      )}

      {j <= today && (
        <section className="grid gap-2">
          <h3 className={heading}>
            <Hourglass size={14} /> Social apps{log ? ` · ${fmt(total(log))}` : ""}
          </h3>
          <ScreenLogForm key={j} day={j} existing={log} />
        </section>
      )}

      <section className="grid gap-3">
        <h3 className={heading}>
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
          <h3 className={heading}>
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
