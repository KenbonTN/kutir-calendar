"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Clock, Inbox, MoreHorizontal, Plus, Repeat, Star, Target, Trash2 } from "lucide-react";
import { useState } from "react";
import { formatEt, WEEKDAYS, weekday } from "@/lib/ethiopian";
import { useGoals } from "@/lib/goals";
import { backToPool, ESTIMATES, minsLabel } from "@/lib/pool";
import {
  addRoutine, addTask, deleteTask, earlyBy, lateBy, moveTask, routineLabel, toggleTask, updateTask, type Task,
} from "@/lib/tasks";
import { AreaSelect, AreaTag } from "./AreaBits";

const REPEATS: [string, number[] | null][] = [
  ["Once", null],
  ["Every day", [0, 1, 2, 3, 4, 5, 6]],
  ["Weekdays", [0, 1, 2, 3, 4]],
  ["Pick days", []],
];

const dayName = (j: number, today: number) =>
  j === today ? "today" : j === today + 1 ? "tomorrow" : `${WEEKDAYS[weekday(j)].slice(0, 3)}, ${formatEt(j)}`;

/** Checklist for one day: tick, star, move, delete, add (optionally repeating). Past days are read-only. */
export function TaskList({ day, today, tasks, compact = false }: { day: number; today: number; tasks: Task[]; compact?: boolean }) {
  const past = day < today;
  const tops = tasks.filter((t) => t.top && !t.done).length;
  return (
    <div className="grid gap-1">
      <AnimatePresence initial={false}>
        {tasks.map((t) => (
          <TaskRow key={t.id} t={t} today={today} readOnly={past} preview={day > today && t.u === 0} canStar={day === today && (t.top || tops < 3)} />
        ))}
      </AnimatePresence>
      {tasks.length === 0 && (
        <p className="py-2 text-sm text-muted">
          {past ? "No tasks were planned for this day." : day === today ? "Nothing planned yet. Add your first task for today." : "Nothing planned for this day yet."}
        </p>
      )}
      {!past && <AddTask day={day} compact={compact} />}
    </div>
  );
}

function TaskRow({
  t, today, readOnly, preview, canStar,
}: { t: Task; today: number; readOnly: boolean; preview: boolean; canStar: boolean }) {
  const late = lateBy(t);
  const early = earlyBy(t);
  const goals = useGoals();
  const goal = t.goal ? goals.find((g) => g.id === t.goal) : undefined;
  const [menu, setMenu] = useState(false);
  const editable = !readOnly && !preview;
  const isToday = t.date === today;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className={`group rounded-xl px-1 py-2 ${t.top && !t.done ? "bg-gold-soft/60" : ""}`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          disabled={readOnly || preview}
          onClick={() => toggleTask(t)}
          aria-pressed={t.done}
          aria-label={`${t.done ? "Mark not done" : "Mark done"}: ${t.title}`}
          className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg border-2 transition active:scale-90 ${
            t.done ? "border-green bg-green text-on-green" : "border-line hover:border-green"
          } ${readOnly && !t.done ? "border-marker/50" : ""} disabled:cursor-default`}
        >
          {t.done && <Check size={15} strokeWidth={3} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className={`break-words text-[15px] leading-snug ${t.done ? "text-muted line-through decoration-2" : ""}`}>
            {t.title}
          </div>
          {(late > 0 || early > 0 || t.routine || t.area || t.mins || goal || (readOnly && !t.done)) && (
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
              {t.area && <AreaTag id={t.area} />}
              {t.mins ? (
                <span className="inline-flex items-center gap-1 text-muted">
                  <Clock size={11} /> {minsLabel(t.mins)}
                </span>
              ) : null}
              {goal && (
                <span className="inline-flex items-center gap-1 text-muted">
                  <Target size={11} /> {goal.name}
                </span>
              )}
              {t.routine && (
                <span className="inline-flex items-center gap-1 text-muted">
                  <Repeat size={11} /> Repeats
                </span>
              )}
              {late > 0 && (
                <span className="rounded-full bg-gold-soft px-2 py-px font-semibold text-gold">
                  Postponed from {formatEt(t.origin)} · {late} day{late === 1 ? "" : "s"} late
                </span>
              )}
              {early > 0 && (
                <span className="rounded-full bg-green-soft px-2 py-px font-semibold text-green">
                  Pulled forward from {dayName(t.origin, today)} · {early} day{early === 1 ? "" : "s"} early
                </span>
              )}
              {readOnly && !t.done && <span className="font-semibold text-marker">Not done</span>}
            </div>
          )}
        </div>
        {editable && isToday && !t.done && (canStar || t.top) && (
          <button
            type="button"
            onClick={() => updateTask(t, { top: !t.top })}
            aria-pressed={!!t.top}
            aria-label={t.top ? `Remove ${t.title} from today's top 3` : `Make ${t.title} one of today's top 3`}
            title={t.top ? "One of today's top 3" : "Make it one of today's top 3"}
            className={`shrink-0 rounded-lg p-1 transition ${t.top ? "text-gold" : "text-muted opacity-60 hover:text-gold sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"}`}
          >
            <Star size={16} fill={t.top ? "currentColor" : "none"} />
          </button>
        )}
        {editable && (
          <button
            type="button"
            onClick={() => setMenu(!menu)}
            aria-expanded={menu}
            aria-label={`More for ${t.title}`}
            className="shrink-0 rounded-lg p-1 text-muted opacity-70 transition hover:text-ink sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 aria-expanded:opacity-100"
          >
            <MoreHorizontal size={16} />
          </button>
        )}
      </div>
      {menu && editable && <TaskMenu t={t} today={today} onDone={() => setMenu(false)} />}
    </motion.div>
  );
}

const menuBtn = "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold transition hover:border-muted";

function TaskMenu({ t, today, onDone }: { t: Task; today: number; onDone: () => void }) {
  const goals = useGoals();
  const days = Array.from({ length: 60 }, (_, i) => today + i).filter((d) => d !== t.date);
  return (
    <div className="ml-9 mt-2 grid gap-2 rounded-2xl bg-surface-2 p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {!t.routine && (
          <>
            {t.date !== today + 1 && (
              <button type="button" className={menuBtn} onClick={() => { moveTask(t, today + 1); onDone(); }}>
                Move to tomorrow
              </button>
            )}
            <select
              id={`move-${t.id}`}
              aria-label="Move to another day"
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                moveTask(t, +e.target.value);
                onDone();
              }}
              className={`${menuBtn} pr-2`}
            >
              <option value="">Move to a day…</option>
              {days.map((d) => (
                <option key={d} value={d}>{d === today ? "Today" : `${WEEKDAYS[weekday(d)].slice(0, 3)} · ${formatEt(d)}`}</option>
              ))}
            </select>
            <button type="button" className={menuBtn} onClick={() => { backToPool(t); onDone(); }}>
              <Inbox size={13} /> Back to the pool
            </button>
          </>
        )}
        <button type="button" className={`${menuBtn} text-marker`} onClick={() => deleteTask(t)}>
          <Trash2 size={13} /> Delete
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <AreaSelect id={`area-${t.id}`} value={t.area} onChange={(area) => updateTask(t, { area })} className="text-xs" />
        <select
          id={`mins-${t.id}`}
          aria-label="Time it takes"
          value={t.mins ?? 0}
          onChange={(e) => updateTask(t, { mins: +e.target.value })}
          className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs"
        >
          <option value={0}>No time estimate</option>
          {ESTIMATES.map((m) => <option key={m} value={m}>{minsLabel(m)}</option>)}
        </select>
        {goals.length > 0 && (
          <select
            id={`goal-${t.id}`}
            aria-label="Countdown"
            value={t.goal ?? ""}
            onChange={(e) => updateTask(t, { goal: e.target.value })}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs"
          >
            <option value="">No countdown</option>
            {goals.map((g) => <option key={g.id} value={g.id}>For: {g.name}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}

function AddTask({ day, compact }: { day: number; compact: boolean }) {
  const goals = useGoals();
  const [title, setTitle] = useState("");
  const [repeat, setRepeat] = useState(0);
  const [days, setDays] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const [area, setArea] = useState("");
  const [mins, setMins] = useState(0);
  const [goal, setGoal] = useState("");

  const submit = () => {
    const name = title.trim();
    if (!name) return;
    const r = REPEATS[repeat][1];
    if (r === null) addTask(name, day, { area, mins, goal });
    else addRoutine(name, repeat === 3 ? days : r, day);
    setTitle("");
    setRepeat(0); // back to a one-off task, so the next one doesn't repeat by accident
    setDays([]);
    setMins(0);
  };
  const pickDays = repeat === 3;
  const canAdd = title.trim() && (!pickDays || days.length);
  const small = "rounded-full border border-line bg-surface px-2.5 py-1 text-xs";

  return (
    <form
      className="mt-1 grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (canAdd) submit();
      }}
    >
      <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 focus-within:border-green">
        <Plus size={17} className="shrink-0 text-muted" />
        <input
          id={`add-task-${day}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setOpen(true)}
          maxLength={120}
          placeholder="Add a task…"
          className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] outline-none focus-visible:outline-none"
        />
        {title.trim() && (
          <button type="submit" disabled={!canAdd} className="rounded-lg bg-green px-3 py-1 text-sm font-semibold text-on-green disabled:opacity-40">
            Add
          </button>
        )}
      </div>
      {(open || !compact) && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Repeat size={13} className="text-muted" />
          {REPEATS.map(([label], i) => (
            <button
              key={label}
              type="button"
              aria-pressed={repeat === i}
              onClick={() => setRepeat(i)}
              className={`rounded-full border px-2.5 py-1 font-semibold transition ${
                repeat === i ? "border-green bg-green-soft text-green" : "border-line text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {(open || !compact) && repeat === 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <AreaSelect id={`add-area-${day}`} value={area} onChange={setArea} className="!px-2.5 !py-1 text-xs" />
          <select id={`add-mins-${day}`} aria-label="Time it takes" value={mins} onChange={(e) => setMins(+e.target.value)} className={small}>
            <option value={0}>Time?</option>
            {ESTIMATES.map((m) => <option key={m} value={m}>{minsLabel(m)}</option>)}
          </select>
          {goals.length > 0 && (
            <select id={`add-goal-${day}`} aria-label="Countdown" value={goal} onChange={(e) => setGoal(e.target.value)} className={small}>
              <option value="">No countdown</option>
              {goals.map((g) => <option key={g.id} value={g.id}>For: {g.name}</option>)}
            </select>
          )}
        </div>
      )}
      {pickDays && (
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((w, i) => (
            <button
              key={w}
              type="button"
              aria-pressed={days.includes(i)}
              onClick={() => setDays(days.includes(i) ? days.filter((d) => d !== i) : [...days, i])}
              className={`rounded-lg border px-2 py-1 text-xs font-semibold ${
                days.includes(i) ? "border-green bg-green-soft text-green" : "border-line text-muted"
              }`}
            >
              {w.slice(0, 3)}
            </button>
          ))}
          {days.length > 0 && <span className="self-center text-xs text-muted">{routineLabel([...days].sort())}</span>}
        </div>
      )}
    </form>
  );
}
