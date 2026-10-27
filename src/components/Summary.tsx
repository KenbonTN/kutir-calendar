"use client";

import { ArrowRight, CheckCircle2, Moon, Sunrise } from "lucide-react";
import { useState } from "react";
import { formatEt } from "@/lib/ethiopian";
import { fmt, total, type ScreenLog } from "@/lib/screen";
import { useStored } from "@/lib/storage";
import { dayScore, type Routine, type Task } from "@/lib/tasks";
import { ScreenLogForm } from "./ScreenTime";

/** What happened on a day: tasks finished, what moved on, and screen time. */
export function DaySummary({
  day, today, tasks, routines, log,
}: { day: number; today: number; tasks: Task[]; routines: Routine[]; log?: ScreenLog }) {
  const isToday = day === today;
  const s = isToday
    ? { done: tasks.filter((t) => t.date === day && t.done).length, due: tasks.filter((t) => t.date === day).length }
    : dayScore(day, tasks, routines);
  const moving = isToday
    ? tasks.filter((t) => t.date === day && !t.done && !t.routine)
    : tasks.filter((t) => t.missed.includes(day) && !t.routine);
  const missedRepeats = tasks.filter((t) => t.date === day && t.routine && !t.done);
  const mins = log ? total(log) : null;

  return (
    <div className="grid content-start gap-3 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-surface-2 p-3">
          <div className="text-xs font-bold uppercase tracking-[0.1em] text-muted">Tasks done</div>
          <div className="font-display text-2xl font-extrabold tabular-nums">
            {s.done}
            <span className="text-base text-muted"> / {s.due}</span>
          </div>
        </div>
        <div className="rounded-2xl bg-surface-2 p-3">
          <div className="text-xs font-bold uppercase tracking-[0.1em] text-muted">Social apps</div>
          <div className="font-display text-2xl font-extrabold tabular-nums">{mins == null ? "—" : fmt(mins)}</div>
        </div>
      </div>
      {s.due > 0 && s.done === s.due && (
        <p className="flex items-center gap-2 font-semibold text-green">
          <CheckCircle2 size={16} /> Every task done{isToday ? " so far" : ""}.
        </p>
      )}
      {moving.length > 0 && (
        <div>
          <div className="mb-1 font-semibold">
            {isToday ? "Moves to tomorrow if not done tonight:" : "Moved to the next day:"}
          </div>
          <ul className="grid gap-1">
            {moving.map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-muted">
                <ArrowRight size={13} className="shrink-0 text-gold" /> {t.title}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!isToday && missedRepeats.length > 0 && (
        <p className="text-muted">Missed repeating tasks: {missedRepeats.map((t) => t.title).join(", ")}</p>
      )}
    </div>
  );
}

/**
 * Evening: today's summary with the screen-time form until it's logged.
 * Morning: yesterday's summary, until dismissed. Hidden in the middle of the day.
 */
export function EndOfDayCard({
  today, now, tasks, routines, logs,
}: { today: number; now: number; tasks: Task[]; routines: Routine[]; logs: Map<number, ScreenLog> }) {
  const hour = new Date(now).getHours();
  const [seen, setSeen] = useStored<number>("kutir-summary-seen", 0);
  const [editing, setEditing] = useState(false);

  const evening = hour >= 18;
  const morning = hour < 12 && seen !== today - 1;
  if (!evening && !morning) return null;

  const day = evening ? today : today - 1;
  const hasAnything = tasks.some((t) => t.date === day || t.missed.includes(day)) || logs.has(day);
  if (morning && !hasAnything) return null;
  const log = logs.get(day);

  return (
    <section className="card grid gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
            {evening ? <Moon size={20} className="text-gold" /> : <Sunrise size={20} className="text-gold" />}
            {evening ? "How today went" : "Yesterday"}
          </h2>
          <p className="text-sm text-muted">{formatEt(day)}</p>
        </div>
        {morning && (
          <button type="button" onClick={() => setSeen(today - 1)} className="text-sm font-semibold text-muted hover:text-ink">
            Got it
          </button>
        )}
      </div>
      <div className="grid items-start gap-5 md:grid-cols-2">
        <DaySummary day={day} today={today} tasks={tasks} routines={routines} log={log} />
        {(evening && !log) || editing ? (
          <div>
            <div className="mb-2 font-semibold">How long on each app {evening ? "today" : "yesterday"}?</div>
            <ScreenLogForm day={day} existing={log} onSaved={() => setEditing(false)} />
          </div>
        ) : (
          <div className="text-sm text-muted">
            {log ? (
              <button type="button" onClick={() => setEditing(true)} className="font-semibold text-green">
                Edit screen time
              </button>
            ) : (
              <>
                You didn&apos;t log screen time for this day.{" "}
                <button type="button" onClick={() => setEditing(true)} className="font-semibold text-green">
                  Add it now
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
