"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  CalendarDays, CalendarRange, Check, ChevronLeft, ChevronRight, Clock, Compass, Gem,
  Inbox, Plus, Star, Sun, Target, Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useAims } from "@/lib/aims";
import { useAreas } from "@/lib/areas";
import { formatClock, formatEt, fromJdn, MONTHS, MONTHS_AM, WEEKDAYS, weekday } from "@/lib/ethiopian";
import { useExpenses } from "@/lib/expenses";
import { useIncome } from "@/lib/income";
import { SCORE_FACES, useNotes } from "@/lib/notes";
import {
  addOutcome, atMinutes, deleteOutcome, hoursOn, load, monthKey, monthRange, nextMonth, OUTCOME_LIMIT, outcomeProgress,
  paceFactor, prevMonth, TIMES, updateOutcome, useCapacity, useOutcomes, type Outcome,
} from "@/lib/plan";
import { addToPool, deletePoolItem, ESTIMATES, minsLabel, planPoolItem, type PoolItem } from "@/lib/pool";
import { review, weekOf } from "@/lib/review";
import { addTask, dayScorer, moveTask, tasksOn, toggleTask, updateTask, type Routine, type Task } from "@/lib/tasks";
import { AreaSelect, AreaTag } from "./AreaBits";
import { Deadline } from "./Deadline";
import { Journal } from "./Journal";
import { Counter, Reveal } from "./Motion";
import { CoachCard, useCoach, usePlanView, type PlanView } from "./Coach";
import { PoolTab, WeekReview } from "./PoolTab";
import { usePool } from "./PullFromPool";
import { TaskList } from "./TaskList";


const label = "text-xs font-bold uppercase tracking-[0.12em] text-muted";
const pill = "rounded-full border border-line bg-surface px-3 py-1.5 text-sm";
const dayShort = (j: number) => `${WEEKDAYS[weekday(j)].slice(0, 3)} ${fromJdn(j).d}`;
const pct = (n: number) => `${Math.round(n)}%`;

export function PlanTab({ today, now, tasks, routines }: { today: number; now: number; tasks: Task[]; routines: Routine[] }) {
  const [view, setView] = usePlanView();
  const views: [PlanView, string, typeof Sun][] = [
    ["day", "Day", Sun],
    ["week", "Week", CalendarRange],
    ["month", "Month", CalendarDays],
    ["pool", "Pool", Inbox],
  ];
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold">
          <Compass size={26} className="text-green" /> Plan
        </h1>
        <div className="flex rounded-full border border-line bg-surface p-1 text-sm font-semibold" role="tablist" aria-label="Plan view">
          {views.map(([k, l, Icon]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={view === k}
              onClick={() => setView(k)}
              className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${view === k ? "text-bg" : "text-muted hover:text-ink"}`}
            >
              {view === k && <motion.span layoutId="plan-view" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <span className="relative inline-flex items-center gap-1.5"><Icon size={14} /> {l}</span>
            </button>
          ))}
        </div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={view}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.22 }}
          className="grid min-w-0 grid-cols-1 gap-6"
        >
          {view === "day" && <DayPlan today={today} now={now} tasks={tasks} routines={routines} />}
          {view === "week" && <WeekPlan today={today} tasks={tasks} routines={routines} />}
          {view === "month" && <MonthPlan today={today} tasks={tasks} routines={routines} />}
          {view === "pool" && <PoolTab today={today} tasks={tasks} />}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

/* ====================================================================== */
/* Day                                                                     */
/* ====================================================================== */

function DayPlan({ today, now, tasks, routines }: { today: number; now: number; tasks: Task[]; routines: Routine[] }) {
  const [day, setDay] = useState(today);
  const list = tasksOn(day, tasks, routines, today);
  const tips = useCoach(today, now, tasks);
  const [, setView] = usePlanView();
  const hour = new Date(now + 3 * 3600e3).getUTCHours();

  return (
    <>
      <DayStrip today={today} day={day} setDay={setDay} tasks={tasks} routines={routines} />
      {day === today && (
        <CoachCard
          tips={tips}
          max={4}
          onAction={(to) =>
            to === "journal" || to === "day"
              ? document.getElementById(to === "day" ? "top3" : "journal")?.scrollIntoView({ behavior: "smooth", block: "start" })
              : setView(to)
          }
        />
      )}
      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="grid min-w-0 gap-6 lg:col-span-7">
          <Top3 day={day} today={today} list={list} />
          <section className="card grid gap-3 p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
              <Clock size={19} className="text-green" /> {day === today ? "Today" : day === today + 1 ? "Tomorrow" : dayShort(day)} · all tasks
            </h2>
            <TaskList day={day} today={today} tasks={list} />
          </section>
          {day <= today && (day === today ? hour >= 15 : true) && <Journal day={day} today={today} tasks={tasks} />}
          {day === today && hour < 15 && (
            <p className="text-center text-sm text-muted">
              Your journal opens here in the afternoon.{" "}
              <button type="button" onClick={() => setDay(today - 1)} className="font-semibold text-green">See yesterday&apos;s</button>
            </p>
          )}
        </div>
        <div className="grid min-w-0 gap-6 lg:col-span-5">
          <DayDashboard day={day} today={today} tasks={tasks} list={list} />
          <Timeline list={list} />
        </div>
      </div>
    </>
  );
}

function DayStrip({ today, day, setDay, tasks, routines }: { today: number; day: number; setDay: (d: number) => void; tasks: Task[]; routines: Routine[] }) {
  const days = Array.from({ length: 10 }, (_, i) => today - 2 + i);
  const score = useMemo(() => dayScorer(tasks, routines), [tasks, routines]);
  return (
    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
      {days.map((j) => {
        const s = j < today ? score(j) : { done: 0, due: tasksOn(j, tasks, routines, today).length };
        const sel = j === day;
        return (
          <button
            key={j}
            type="button"
            onClick={() => setDay(j)}
            aria-pressed={sel}
            className={`relative grid w-16 shrink-0 place-items-center gap-0.5 rounded-2xl border px-2 py-2 transition ${sel ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:border-muted"}`}
          >
            <span className="text-[11px] font-semibold uppercase opacity-70">{j === today ? "Today" : WEEKDAYS[weekday(j)].slice(0, 3)}</span>
            <span className="font-display text-xl font-extrabold">{fromJdn(j).d}</span>
            <span className={`text-[10px] tabular-nums ${sel ? "opacity-80" : "text-muted"}`}>{j < today ? `${s.done}/${s.due}` : s.due ? `${s.due} tasks` : "—"}</span>
          </button>
        );
      })}
    </div>
  );
}

/** The day's three priorities, each with a time: "what" plus "when". */
function Top3({ day, today, list }: { day: number; today: number; list: Task[] }) {
  const tops = list.filter((t) => t.top);
  const others = list.filter((t) => !t.top && !t.done && t.u !== 0);
  const [title, setTitle] = useState("");
  const editable = day >= today;
  return (
    <section id="top3" className="card sky-morning grid scroll-mt-24 gap-3 p-5 sm:p-6">
      <div>
        <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
          <Star size={19} className="text-gold" fill="currentColor" /> Top 3
        </h2>
        <p className="text-sm text-muted">The few things that would make {day === today ? "today" : "this day"} a good day. Give each a time.</p>
      </div>
      <div className="grid gap-2">
        {[0, 1, 2].map((i) => {
          const t = tops[i];
          if (!t)
            return (
              <div key={i} className="flex items-center gap-3 rounded-2xl border border-dashed border-line px-3 py-3 text-sm text-muted">
                <span className="grid size-7 place-items-center rounded-full bg-surface-2 font-display font-extrabold">{i + 1}</span>
                Empty
              </div>
            );
          return (
            <motion.div key={t.id} layout className={`flex flex-wrap items-center gap-3 rounded-2xl bg-surface px-3 py-2.5 shadow-sm ${t.done ? "opacity-60" : ""}`}>
              <button
                type="button"
                disabled={!editable && day !== today}
                onClick={() => toggleTask(t)}
                aria-label={t.done ? `Mark not done: ${t.title}` : `Mark done: ${t.title}`}
                className={`grid size-7 shrink-0 place-items-center rounded-full font-display font-extrabold transition active:scale-90 ${t.done ? "bg-green text-on-green" : "bg-gold-soft text-gold"}`}
              >
                {t.done ? <Check size={15} strokeWidth={3} /> : i + 1}
              </button>
              <span className={`min-w-0 flex-1 font-semibold ${t.done ? "line-through" : ""}`}>{t.title}</span>
              {editable && (
                <>
                  <select
                    id={`at-${t.id}`}
                    aria-label={`When you'll do ${t.title}`}
                    value={t.at ?? ""}
                    onChange={(e) => updateTask(t, { at: e.target.value || undefined })}
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${t.at ? "border-green bg-green-soft text-green" : "border-gold text-gold"}`}
                  >
                    <option value="">When?</option>
                    {TIMES.map((x) => <option key={x} value={x}>{formatClock(x)}</option>)}
                  </select>
                  <button type="button" onClick={() => updateTask(t, { top: undefined })} aria-label={`Remove ${t.title} from the Top 3`} className="text-muted hover:text-ink">
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </motion.div>
          );
        })}
      </div>
      {editable && tops.length < 3 && (
        <>
          {others.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {others.slice(0, 8).map((t) => (
                <button key={t.id} type="button" onClick={() => updateTask(t, { top: true })} className="inline-flex items-center gap-1 rounded-full border border-dashed border-gold bg-surface/60 px-3 py-1 text-xs font-semibold text-gold">
                  <Star size={11} /> {t.title}
                </button>
              ))}
            </div>
          )}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim()) return;
              addTask(title.trim(), day, { top: true });
              setTitle("");
            }}
          >
            <input id={`top-new-${day}`} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Or write a new priority…" className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-[15px]" />
            <button type="submit" disabled={!title.trim()} className="rounded-xl bg-gold px-4 text-sm font-semibold text-bg disabled:opacity-40">Add</button>
          </form>
        </>
      )}
    </section>
  );
}

function DayDashboard({ day, today, tasks, list }: { day: number; today: number; tasks: Task[]; list: Task[] }) {
  const [capacity, setCapacity] = useCapacity();
  const notes = useNotes();
  const pace = paceFactor(tasks);
  const done = list.filter((t) => t.done).length;
  const l = load(list, pace);
  const hours = hoursOn(capacity, weekday(day));
  const spent = list.reduce((a, t) => a + (t.spent ?? 0), 0);
  const planned = list.reduce((a, t) => a + (t.mins ?? 0), 0);
  const areas = [...new Set(list.filter((t) => t.done && t.area).map((t) => t.area!))];
  const note = notes.get(day);
  const fill = Math.min(1, l.likely / Math.max(1, hours * 60));
  const over = l.likely > hours * 60;
  const isWeekend = weekday(day) >= 5;

  return (
    <section className="card grid gap-4 p-5 sm:p-6">
      <h2 className="font-display text-xl font-extrabold">{day === today ? "Today at a glance" : `${dayShort(day)} at a glance`}</h2>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Done" value={<><Counter value={done} /><span className="text-base text-muted">/{list.length}</span></>} />
        <Stat label="Planned" value={planned ? minsLabel(planned) : "—"} small />
        <Stat label="Focused" value={spent ? minsLabel(spent) : "—"} small />
      </div>
      {day >= today && (
        <div className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-semibold">Does the day fit?</span>
            <span className={`tabular-nums ${over ? "font-bold text-marker" : "text-muted"}`}>
              ~{minsLabel(l.likely || 0)} of {hours}h
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-surface-2">
            <motion.div className={`h-full rounded-full ${over ? "bg-marker" : fill > 0.85 ? "bg-gold" : "bg-green"}`} initial={{ width: 0 }} animate={{ width: `${fill * 100}%` }} />
          </div>
          <p className="text-xs text-muted">
            At your pace (×{pace.toFixed(2)}{pace === 1.25 ? ", a starting buffer until the focus timer learns yours" : ", from your focus timer"}).
            {l.unestimated ? ` ${l.unestimated} task${l.unestimated > 1 ? "s have" : " has"} no estimate.` : ""}
          </p>
          <label className="flex items-center gap-2 text-xs text-muted">
            Focus hours I have on a {isWeekend ? "weekend day" : "weekday"}:
            <select
              id="capacity"
              value={hours}
              onChange={(e) => setCapacity({ ...capacity, [isWeekend ? "weekend" : "weekday"]: +e.target.value })}
              className="rounded-full border border-line bg-surface px-2 py-0.5"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((h) => <option key={h} value={h}>{h}h</option>)}
            </select>
          </label>
        </div>
      )}
      {areas.length > 0 && (
        <div className="flex flex-wrap gap-1.5 text-xs">{areas.map((a) => <AreaTag key={a} id={a} short />)}</div>
      )}
      {note && (note.rating || note.mood) && (
        <p className="text-sm">
          Journal: day {note.rating ? SCORE_FACES[note.rating] : "—"} · mood {note.mood ? SCORE_FACES[note.mood] : "—"} · energy {note.energy ? "⚡".repeat(note.energy) : "—"}
        </p>
      )}
    </section>
  );
}

/** Tasks with a time, in order, then the rest. */
function Timeline({ list }: { list: Task[] }) {
  const timed = list.filter((t) => t.at).sort((a, b) => atMinutes(a.at)! - atMinutes(b.at)!);
  if (!timed.length) return null;
  return (
    <section className="card grid gap-1 p-5 sm:p-6">
      <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-extrabold"><Clock size={17} className="text-ucl" /> Timeline</h2>
      <ol className="relative grid gap-3 border-l-2 border-line pl-4">
        {timed.map((t) => (
          <li key={t.id} className="relative">
            <span className={`absolute -left-[23px] top-1 size-3 rounded-full ring-4 ring-surface ${t.done ? "bg-green" : t.top ? "bg-gold" : "bg-ucl"}`} />
            <div className="text-xs font-bold tabular-nums text-muted">{formatClock(t.at!)}{t.mins ? ` · ${minsLabel(t.mins)}` : ""}</div>
            <div className={`text-[15px] ${t.done ? "text-muted line-through" : ""}`}>{t.title}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ====================================================================== */
/* Week                                                                    */
/* ====================================================================== */

function WeekPlan({ today, tasks, routines }: { today: number; tasks: Task[]; routines: Routine[] }) {
  const [offset, setOffset] = useState(0);
  const [from, to] = weekOf(today + offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => from + i);
  const rocks = tasks.filter((t) => t.rock && t.date >= from && t.date <= to);

  return (
    <>
      <Switcher
        label={offset === 0 ? "This week" : offset === 1 ? "Next week" : offset === -1 ? "Last week" : "Week"}
        sub={`${formatEt(from)} – ${formatEt(to)}`}
        onPrev={() => setOffset(offset - 1)}
        onNext={() => setOffset(offset + 1)}
        onReset={offset ? () => setOffset(0) : undefined}
      />
      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="grid min-w-0 gap-6 lg:col-span-7">
          <Rocks from={from} to={to} today={today} rocks={rocks} />
          <WeekBoard days={days} today={today} tasks={tasks} routines={routines} />
          <ToPlace from={from} to={to} today={today} />
        </div>
        <div className="grid min-w-0 gap-6 lg:col-span-5">
          <WeekDashboard from={from} to={to} today={today} tasks={tasks} routines={routines} rocks={rocks} />
          {offset >= 0 && <WeekReview today={today} tasks={tasks} routines={routines} last />}
        </div>
      </div>
    </>
  );
}

function Switcher({ label: l, sub, onPrev, onNext, onReset }: { label: string; sub: string; onPrev: () => void; onNext: () => void; onReset?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <button type="button" onClick={onPrev} aria-label="Previous" className="grid size-10 place-items-center rounded-full border border-line bg-surface hover:border-muted"><ChevronLeft size={18} /></button>
      <div className="text-center">
        <div className="font-display text-xl font-extrabold">{l}</div>
        <div className="text-sm text-muted">
          {sub}
          {onReset && <button type="button" onClick={onReset} className="ml-2 font-semibold text-green">Back to now</button>}
        </div>
      </div>
      <button type="button" onClick={onNext} aria-label="Next" className="grid size-10 place-items-center rounded-full border border-line bg-surface hover:border-muted"><ChevronRight size={18} /></button>
    </div>
  );
}

/** The week's big rocks: chosen first, each given a day (Covey). */
function Rocks({ from, to, today, rocks }: { from: number; to: number; today: number; rocks: Task[] }) {
  const month = monthKey(Math.max(from, Math.min(today, to)));
  const outcomes = useOutcomes(month);
  const [title, setTitle] = useState("");
  const [area, setArea] = useState("");
  const [outcome, setOutcome] = useState("");
  const first = Math.max(from, today);
  const [day, setDay] = useState(first);
  const dayOk = day >= from && day <= to && day >= today ? day : first;
  const done = rocks.filter((r) => r.done).length;

  return (
    <section className="card grid gap-3 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
          <Gem size={19} className="text-ucl" /> Big rocks
        </h2>
        {rocks.length > 0 && <span className="text-sm font-semibold tabular-nums text-muted">{done}/{rocks.length} done</span>}
      </div>
      <p className="-mt-1 text-sm text-muted">The few things that matter most this week, one or two per life area. Put them in first; smaller tasks fit around them.</p>
      <div className="grid gap-1.5">
        {rocks.map((r) => (
          <div key={r.id} className={`flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 ${r.done ? "bg-green-soft/50" : "bg-surface-2"}`}>
            <button type="button" onClick={() => toggleTask(r)} aria-label={r.done ? `Mark not done: ${r.title}` : `Mark done: ${r.title}`} className={`grid size-6 shrink-0 place-items-center rounded-lg border-2 ${r.done ? "border-green bg-green text-on-green" : "border-ucl"}`}>
              {r.done && <Check size={14} strokeWidth={3} />}
            </button>
            <span className={`min-w-0 flex-1 text-[15px] ${r.done ? "text-muted line-through" : "font-semibold"}`}>{r.title}</span>
            {r.area && <span className="text-xs"><AreaTag id={r.area} short /></span>}
            {!r.done ? (
              <select id={`rock-day-${r.id}`} aria-label="Day" value={r.date} onChange={(e) => moveTask(r, +e.target.value)} className="rounded-full border border-line bg-surface px-2 py-0.5 text-xs">
                {Array.from({ length: 7 }, (_, i) => from + i).filter((d) => d >= today || d === r.date).map((d) => <option key={d} value={d}>{dayShort(d)}</option>)}
              </select>
            ) : (
              <span className="text-xs text-muted">{dayShort(r.date)}</span>
            )}
          </div>
        ))}
      </div>
      {to >= today && (
        <form
          className="grid gap-2 rounded-2xl border border-dashed border-line p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            const o = outcomes.find((x) => x.id === outcome);
            addTask(title.trim(), dayOk, { rock: true, area: area || o?.area, outcome });
            setTitle("");
          }}
        >
          <input id="rock-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Add a big rock, e.g. Finish the supplier contract" className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-[15px]" />
          <div className="flex flex-wrap items-center gap-2">
            <select id="rock-day" aria-label="Day" value={dayOk} onChange={(e) => setDay(+e.target.value)} className={`${pill} text-xs`}>
              {Array.from({ length: 7 }, (_, i) => from + i).filter((d) => d >= today).map((d) => <option key={d} value={d}>{dayShort(d)}</option>)}
            </select>
            <AreaSelect id="rock-area" value={area} onChange={setArea} className="!py-1 text-xs" />
            {outcomes.length > 0 && (
              <select id="rock-outcome" aria-label="Monthly outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} className={`${pill} max-w-[12rem] text-xs`}>
                <option value="">No outcome</option>
                {outcomes.map((o) => <option key={o.id} value={o.id}>🎯 {o.title}</option>)}
              </select>
            )}
            <button type="submit" disabled={!title.trim()} className="ml-auto rounded-full bg-ucl px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40">
              <Plus size={14} className="inline" /> Rock
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

/** Seven days side by side: what's on each, and whether it fits. */
function WeekBoard({ days, today, tasks, routines }: { days: number[]; today: number; tasks: Task[]; routines: Routine[] }) {
  const [capacity] = useCapacity();
  const pace = paceFactor(tasks);
  return (
    <section className="card grid gap-3 p-5 sm:p-6">
      <h2 className="font-display text-xl font-extrabold">The week</h2>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {days.map((d) => {
          const list = tasksOn(d, tasks, routines, today);
          const l = load(list, pace);
          const hours = hoursOn(capacity, weekday(d));
          const over = l.likely > hours * 60;
          const past = d < today;
          return (
            <div key={d} className={`grid content-start gap-1.5 rounded-2xl border p-3 ${d === today ? "border-gold" : "border-line"} ${past ? "opacity-60" : ""}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{d === today ? "Today" : WEEKDAYS[weekday(d)]}</span>
                <span className="text-xs text-muted">{formatEt(d).replace(/ \d{4}$/, "")}</span>
              </div>
              {!past && (
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" title={`~${minsLabel(l.likely || 0)} of ${hours}h`}>
                  <div className={`h-full rounded-full ${over ? "bg-marker" : "bg-green"}`} style={{ width: `${Math.min(100, (l.likely / (hours * 60)) * 100)}%` }} />
                </div>
              )}
              {list.length === 0 && <p className="text-xs text-muted">Free</p>}
              <ul className="grid gap-1">
                {list.slice(0, 6).map((t) => (
                  <li key={t.id} className="flex items-center gap-1.5 text-sm">
                    <span className={`size-1.5 shrink-0 rounded-full ${t.done ? "bg-green" : t.rock ? "bg-ucl" : t.top ? "bg-gold" : "bg-line"}`} />
                    <span className={`min-w-0 flex-1 truncate ${t.done ? "text-muted line-through" : ""}`}>{t.title}</span>
                    {!past && !t.done && !t.routine && t.u !== 0 && (
                      <select
                        id={`wk-move-${t.id}`}
                        aria-label={`Move ${t.title}`}
                        value={d}
                        onChange={(e) => moveTask(t, +e.target.value)}
                        className="w-5 shrink-0 appearance-none bg-transparent text-center text-xs text-muted"
                        title="Move to another day"
                      >
                        {days.filter((x) => x >= today).map((x) => <option key={x} value={x}>{dayShort(x)}</option>)}
                      </select>
                    )}
                  </li>
                ))}
                {list.length > 6 && <li className="text-xs text-muted">+{list.length - 6} more</li>}
              </ul>
              {over && !past && <p className="text-[11px] font-semibold text-marker">Too full: ~{minsLabel(l.likely)} for {hours}h</p>}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted">Bars show the work planned at your pace against the focus hours you have. Tap ⌄ next to a task to move it.</p>
    </section>
  );
}

/** This month's outcome tasks still in the pool: give each a day this week. */
function ToPlace({ from, to, today }: { from: number; to: number; today: number }) {
  const pool = usePool();
  const outcomes = useOutcomes(monthKey(Math.max(from, Math.min(today, to))));
  const ids = new Set(outcomes.map((o) => o.id));
  const items = pool.filter((p) => p.outcome && ids.has(p.outcome));
  if (!items.length || to < today) return null;
  const days = Array.from({ length: 7 }, (_, i) => from + i).filter((d) => d >= today);
  return (
    <section className="card grid gap-2 p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-extrabold"><Target size={18} className="text-marker" /> From this month&apos;s plan</h2>
      <p className="-mt-1 text-sm text-muted">Tasks for your monthly outcomes that don&apos;t have a day yet.</p>
      <ul className="divide-y divide-line">
        {items.map((p) => (
          <li key={p.id} className="flex items-center gap-2 py-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px]">{p.title}</div>
              <div className="truncate text-xs text-muted">🎯 {outcomes.find((o) => o.id === p.outcome)?.title}{p.mins ? ` · ${minsLabel(p.mins)}` : ""}</div>
            </div>
            <select id={`place-${p.id}`} aria-label={`Plan ${p.title} on a day`} value="" onChange={(e) => e.target.value && planPoolItem(p, +e.target.value)} className={`${pill} text-xs`}>
              <option value="">Plan on…</option>
              {days.map((d) => <option key={d} value={d}>{d === today ? "Today" : dayShort(d)}</option>)}
            </select>
          </li>
        ))}
      </ul>
    </section>
  );
}

function WeekDashboard({ from, to, today, tasks, routines, rocks }: { from: number; to: number; today: number; tasks: Task[]; routines: Routine[]; rocks: Task[] }) {
  const areas = useAreas();
  const notes = useNotes();
  const end = Math.min(to, today);
  const r = end >= from ? review(from, end, tasks, routines, areas) : null;
  const days = Array.from({ length: 7 }, (_, i) => from + i);
  const focus = tasks.filter((t) => t.date >= from && t.date <= to).reduce((a, t) => a + (t.spent ?? 0), 0);
  const rate = r && r.due ? (r.done / r.due) * 100 : null;

  return (
    <section className="card grid gap-4 p-5 sm:p-6">
      <h2 className="font-display text-xl font-extrabold">Week at a glance</h2>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Big rocks" value={rocks.length ? `${rocks.filter((x) => x.done).length}/${rocks.length}` : "—"} />
        <Stat label="Follow-through" value={rate == null ? "—" : <Counter value={rate} format={pct} />} />
        <Stat label="Tasks done" value={r ? `${r.done}/${r.due}` : "—"} small />
        <Stat label="Focused" value={focus ? minsLabel(focus) : "—"} small />
      </div>
      <div>
        <div className={`${label} mb-2`}>Mood and energy</div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {days.map((d) => {
            const n = notes.get(d);
            return (
              <div key={d} className="grid gap-0.5">
                <span className="text-lg">{n?.mood ? SCORE_FACES[n.mood] : n?.rating ? SCORE_FACES[n.rating] : "·"}</span>
                <div className="mx-auto flex h-10 w-3 items-end overflow-hidden rounded-full bg-surface-2">
                  <motion.div className="w-full rounded-full bg-gold" initial={{ height: 0 }} animate={{ height: `${((n?.energy ?? 0) / 5) * 100}%` }} />
                </div>
                <span className="text-[10px] text-muted">{WEEKDAYS[weekday(d)].slice(0, 2)}</span>
              </div>
            );
          })}
        </div>
      </div>
      {r && r.byArea.length > 0 && <BalanceWheel rows={r.byArea} />}
      {r && r.missing.length > 0 && (
        <p className="rounded-xl bg-gold-soft px-3 py-2 text-sm">Nothing yet for {r.missing.map((a) => `${a.emoji} ${a.name}`).join(", ")}.</p>
      )}
    </section>
  );
}

/** Finished tasks by life area as a ring (a Wheel of Life built from what you actually did). */
function BalanceWheel({ rows }: { rows: { id: string; name: string; emoji: string; color: string; n: number }[] }) {
  const total = rows.reduce((a, r) => a + r.n, 0);
  const R = 42, C = 2 * Math.PI * R;
  // Where each slice starts along the ring.
  const starts = rows.map((_, i) => rows.slice(0, i).reduce((a, r) => a + (r.n / total) * C, 0));
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="size-28 shrink-0 -rotate-90" role="img" aria-label="Finished tasks by life area">
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="14" />
        {rows.map((r, i) => {
          const len = (r.n / total) * C;
          return (
            <motion.circle
              key={r.id}
              cx="50" cy="50" r={R} fill="none" stroke={r.color} strokeWidth="14"
              strokeDasharray={`${len} ${C - len}`}
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: -starts[i] }}
              transition={{ duration: 0.8 }}
            />
          );
        })}
      </svg>
      <ul className="grid min-w-0 flex-1 gap-1 text-sm">
        {rows.slice(0, 6).map((r) => (
          <li key={r.id} className="flex min-w-0 items-center gap-1.5">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
            <span className="truncate">{r.emoji} {r.name}</span>
            <span className="ml-auto tabular-nums text-muted">{r.n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ====================================================================== */
/* Month                                                                   */
/* ====================================================================== */

function MonthPlan({ today, tasks, routines }: { today: number; tasks: Task[]; routines: Routine[] }) {
  const [key, setKey] = useState(monthKey(today));
  const outcomes = useOutcomes(key);
  const pool = usePool();
  const areas = useAreas();
  const [adding, setAdding] = useState(false);
  const y = Math.floor(key / 100), m = key % 100;
  const groups = useMemo(() => {
    const g = new Map<string, Outcome[]>();
    for (const o of outcomes) {
      const top = areas.topOf(o.area) ?? "none";
      g.set(top, [...(g.get(top) ?? []), o]);
    }
    return [...g.entries()];
  }, [outcomes, areas]);

  return (
    <>
      <Switcher
        label={`${MONTHS[m - 1]} ${y}`}
        sub={`${MONTHS_AM[m - 1]} · ${formatEt(monthRange(key)[0])} – ${formatEt(monthRange(key)[1])}`}
        onPrev={() => setKey(prevMonth(key))}
        onNext={() => setKey(nextMonth(key))}
        onReset={key !== monthKey(today) ? () => setKey(monthKey(today)) : undefined}
      />
      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="grid min-w-0 gap-4 lg:col-span-7">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold"><Target size={22} className="text-marker" /> Outcomes</h2>
            <button
              type="button"
              onClick={() => setAdding(!adding)}
              className="inline-flex items-center gap-1 rounded-full bg-green px-3 py-1.5 text-sm font-semibold text-on-green transition active:scale-95"
            >
              <Plus size={15} /> Outcome
            </button>
          </div>
          <p className="-mt-2 text-sm text-muted">
            What should be true by the end of {MONTHS[m - 1]}? One to three per life area that matters this month, around {OUTCOME_LIMIT} in all.
            Then list the tasks for each, and give them days in the Week plan.
          </p>
          {outcomes.length >= OUTCOME_LIMIT && (
            <p className="rounded-xl bg-gold-soft px-3 py-2 text-sm">
              That&apos;s {outcomes.length} outcomes. Fewer goals get more done; consider moving some to next month.
            </p>
          )}
          <AnimatePresence initial={false}>
            {adding && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <AddOutcome month={key} onDone={() => setAdding(false)} />
              </motion.div>
            )}
          </AnimatePresence>
          {outcomes.length === 0 && !adding && (
            <div className="card grid place-items-center gap-3 p-8 text-center">
              <span className="text-4xl">🗺️</span>
              <p className="max-w-sm text-sm text-muted">
                Start with the areas that matter most: your faith, your family, your health, each business and your work.
              </p>
              <button type="button" onClick={() => setAdding(true)} className="rounded-full bg-marker px-4 py-2 text-sm font-semibold text-white">
                Plan {MONTHS[m - 1]}
              </button>
            </div>
          )}
          {groups.map(([top, list]) => {
            const a = areas.info(top);
            return (
              <Reveal key={top}>
                <div className="grid gap-3">
                  <h3 className="flex items-center gap-2 text-sm font-bold" style={{ color: a?.color }}>
                    {a ? `${a.emoji} ${a.name}` : "No area"}
                  </h3>
                  {list.map((o) => <OutcomeCard key={o.id} o={o} month={key} today={today} tasks={tasks} pool={pool} />)}
                </div>
              </Reveal>
            );
          })}
        </div>
        <div className="grid min-w-0 gap-6 lg:col-span-5">
          <MonthDashboard monthKey_={key} today={today} tasks={tasks} routines={routines} outcomes={outcomes} pool={pool} />
        </div>
      </div>
    </>
  );
}

function AddOutcome({ month, onDone }: { month: number; onDone: () => void }) {
  const aims = useAims().filter((a) => a.year >= Math.floor(month / 100) - 1);
  const [title, setTitle] = useState("");
  const [area, setArea] = useState("");
  const [aim, setAim] = useState("");
  return (
    <form
      className="card grid gap-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        const a = aims.find((x) => x.id === aim);
        addOutcome({ title: title.trim(), area: area || a?.area, month, aim });
        setTitle("");
        onDone();
      }}
    >
      <input id="outcome-title" autoFocus value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Coffee shop: 20% more sales · Read the Gospel of John · Gym 12 times" className="rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[15px]" />
      <div className="flex flex-wrap items-center gap-2">
        <AreaSelect id="outcome-area" value={area} onChange={setArea} />
        {aims.length > 0 && (
          <select id="outcome-aim" aria-label="Big goal" value={aim} onChange={(e) => setAim(e.target.value)} className={`${pill} max-w-[14rem]`}>
            <option value="">No big goal</option>
            {aims.map((a) => <option key={a.id} value={a.id}>🏔 {a.title}</option>)}
          </select>
        )}
        <button type="submit" disabled={!title.trim()} className="ml-auto rounded-full bg-green px-4 py-2 text-sm font-semibold text-on-green disabled:opacity-40">
          Add outcome
        </button>
      </div>
    </form>
  );
}

function OutcomeCard({ o, month, today, tasks, pool }: { o: Outcome; month: number; today: number; tasks: Task[]; pool: PoolItem[] }) {
  const p = outcomeProgress(o, tasks, pool);
  const aims = useAims();
  const aim = o.aim ? aims.find((a) => a.id === o.aim) : undefined;
  const mine = tasks.filter((t) => t.outcome === o.id && !t.routine).sort((a, b) => a.date - b.date);
  const waiting = pool.filter((x) => x.outcome === o.id);
  const [title, setTitle] = useState("");
  const [mins, setMins] = useState(0);
  const [armed, setArmed] = useState(false);
  const [open, setOpen] = useState(true);
  const [mFrom, mTo] = monthRange(month);
  const days = Array.from({ length: Math.min(14, mTo - Math.max(today, mFrom) + 1) }, (_, i) => Math.max(today, mFrom) + i);

  return (
    <article className={`card card-hover grid gap-3 p-4 sm:p-5 ${o.achieved ? "ring-2 ring-gold/60" : ""}`}>
      <div className="flex items-start gap-3">
        <button type="button" onClick={() => setOpen(!open)} className="min-w-0 flex-1 text-left">
          <div className="font-display text-lg font-bold leading-snug">{o.achieved && "🏆 "}{o.title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            {o.area && <AreaTag id={o.area} />}
            {aim && <span>🏔 {aim.title}</span>}
            <span>{p.total ? `${p.done}/${p.total} tasks` : "No tasks yet"}</span>
          </div>
        </button>
        <span className="font-display text-xl font-extrabold tabular-nums text-green">{Math.round(p.pct * 100)}%</span>
      </div>
      {today <= mTo && <Deadline start={mFrom} end={mTo} today={today} />}
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <motion.div className={`h-full rounded-full ${o.achieved ? "bg-gold" : "bg-green"}`} initial={{ width: 0 }} animate={{ width: `${p.pct * 100}%` }} transition={{ type: "spring", damping: 22 }} />
      </div>
      {open && (
        <>
          <ul className="grid gap-1">
            {mine.map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-sm">
                <button type="button" onClick={() => toggleTask(t)} aria-label={t.done ? `Mark not done: ${t.title}` : `Mark done: ${t.title}`} className={`grid size-5 shrink-0 place-items-center rounded-md border-2 ${t.done ? "border-green bg-green text-on-green" : "border-line"}`}>
                  {t.done && <Check size={12} strokeWidth={3} />}
                </button>
                <span className={`min-w-0 flex-1 truncate ${t.done ? "text-muted line-through" : ""}`}>{t.rock && "💎 "}{t.title}</span>
                <span className={`shrink-0 text-xs ${!t.done && t.date < today ? "text-marker" : "text-muted"}`}>{t.date === today ? "Today" : dayShort(t.date)}</span>
              </li>
            ))}
            {waiting.map((x) => (
              <li key={x.id} className="flex items-center gap-2 text-sm">
                <span className="grid size-5 shrink-0 place-items-center rounded-md border-2 border-dashed border-line" />
                <span className="min-w-0 flex-1 truncate">{x.title}{x.mins ? <span className="text-xs text-muted"> · {minsLabel(x.mins)}</span> : null}</span>
                {days.length > 0 && (
                  <select id={`plan-${x.id}`} aria-label={`Plan ${x.title}`} value="" onChange={(e) => e.target.value && planPoolItem(x, +e.target.value)} className="rounded-full border border-line bg-surface px-2 py-0.5 text-xs">
                    <option value="">Give it a day…</option>
                    {days.map((d) => <option key={d} value={d}>{d === today ? "Today" : dayShort(d)}</option>)}
                  </select>
                )}
                <button type="button" onClick={() => deletePoolItem(x.id)} aria-label={`Remove ${x.title}`} className="text-muted hover:text-marker"><Trash2 size={12} /></button>
              </li>
            ))}
          </ul>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim()) return;
              addToPool(title.trim(), { area: o.area, outcome: o.id, mins });
              setTitle("");
              setMins(0);
            }}
          >
            <input id={`otask-${o.id}`} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task for this outcome" className="min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3 py-1.5 text-sm" />
            <select id={`omins-${o.id}`} aria-label="Time it takes" value={mins} onChange={(e) => setMins(+e.target.value)} className="rounded-xl border border-line bg-surface px-2 text-xs">
              <option value={0}>Time?</option>
              {ESTIMATES.map((x) => <option key={x} value={x}>{minsLabel(x)}</option>)}
            </select>
            <button type="submit" disabled={!title.trim()} className="rounded-xl bg-green px-3 text-sm font-semibold text-on-green disabled:opacity-40"><Plus size={15} /></button>
          </form>
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3 text-xs">
            <button type="button" onClick={() => updateOutcome(o.id, { achieved: !o.achieved })} className={`rounded-full px-3 py-1 font-semibold ${o.achieved ? "bg-gold text-bg" : "border border-line hover:border-gold hover:text-gold"}`}>
              {o.achieved ? "Achieved ✓" : "Mark achieved"}
            </button>
            {!o.achieved && (
              <button type="button" onClick={() => updateOutcome(o.id, { month: nextMonth(month) })} className="rounded-full border border-line px-3 py-1 font-semibold hover:border-muted">
                Move to next month
              </button>
            )}
            <button
              type="button"
              onClick={() => (armed ? deleteOutcome(o.id) : (setArmed(true), setTimeout(() => setArmed(false), 3000)))}
              className={`ml-auto ${armed ? "font-semibold text-marker" : "text-muted hover:text-marker"}`}
            >
              {armed ? "Tap again to delete" : <Trash2 size={13} />}
            </button>
          </div>
        </>
      )}
    </article>
  );
}

function MonthDashboard({
  monthKey_: key, today, tasks, routines, outcomes, pool,
}: { monthKey_: number; today: number; tasks: Task[]; routines: Routine[]; outcomes: Outcome[]; pool: PoolItem[] }) {
  const areas = useAreas();
  const notes = useNotes();
  const income = useIncome();
  const expenses = useExpenses();
  const [from, to] = monthRange(key);
  const end = Math.min(to, today);
  const r = end >= from ? review(from, end, tasks, routines, areas) : null;
  const achieved = outcomes.filter((o) => o.achieved || outcomeProgress(o, tasks, pool).pct === 1).length;
  const avgPct = outcomes.length ? outcomes.reduce((a, o) => a + outcomeProgress(o, tasks, pool).pct, 0) / outcomes.length : 0;
  const inMonth = (d: number) => d >= from && d <= to;
  const moneyIn = income.filter((i) => inMonth(i.day)).reduce((a, i) => a + i.amount, 0);
  const moneyOut = expenses.filter((e) => inMonth(e.day)).reduce((a, e) => a + e.amount, 0);
  const entries = [...notes.values()].filter((n) => inMonth(n.day));
  const ratings = entries.filter((n) => n.rating).map((n) => n.rating!);
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
  const wins = entries.filter((n) => n.well).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.day - a.day).slice(0, 4);
  const n0 = (n: number) => Math.round(n).toLocaleString("en");

  return (
    <section className="card grid gap-4 p-5 sm:p-6">
      <h2 className="font-display text-xl font-extrabold">Month at a glance</h2>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Outcomes" value={outcomes.length ? `${achieved}/${outcomes.length}` : "—"} />
        <Stat label="Progress" value={outcomes.length ? <Counter value={avgPct * 100} format={pct} /> : "—"} />
        <Stat label="Tasks done" value={r ? `${r.done}/${r.due}` : "—"} small />
        <Stat label="Journal" value={entries.length ? `${entries.length} days${avgRating ? ` · ${SCORE_FACES[Math.round(avgRating)]}` : ""}` : "—"} small />
        <Stat label="Money in" value={moneyIn ? n0(moneyIn) : "—"} small />
        <Stat label="Money out" value={moneyOut ? n0(moneyOut) : "—"} small />
      </div>
      {r && r.byArea.length > 0 && <BalanceWheel rows={r.byArea} />}
      {wins.length > 0 && (
        <div>
          <div className={`${label} mb-2`}>Best moments</div>
          <ul className="grid gap-1.5">
            {wins.map((n) => (
              <li key={n.id} className="rounded-xl bg-green-soft/50 px-3 py-2 text-sm">
                {n.rating ? `${SCORE_FACES[n.rating]} ` : ""}“{n.well}” <span className="text-xs text-muted">· {formatEt(n.day)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Stat({ label: l, value, small }: { label: string; value: React.ReactNode; small?: boolean }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-3">
      <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{l}</div>
      <div className={`font-display font-extrabold tabular-nums ${small ? "text-lg" : "text-2xl"}`}>{value}</div>
    </div>
  );
}
