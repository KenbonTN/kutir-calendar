"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Plus, Repeat, Trash2 } from "lucide-react";
import { useState } from "react";
import { formatEt, WEEKDAYS } from "@/lib/ethiopian";
import {
  addRoutine, addTask, deleteTask, lateBy, routineLabel, toggleTask, type Task,
} from "@/lib/tasks";

const REPEATS: [string, number[] | null][] = [
  ["Once", null],
  ["Every day", [0, 1, 2, 3, 4, 5, 6]],
  ["Weekdays", [0, 1, 2, 3, 4]],
  ["Pick days", []],
];

/** Checklist for one day: tick, delete, add (optionally repeating). Past days are read-only. */
export function TaskList({ day, today, tasks, compact = false }: { day: number; today: number; tasks: Task[]; compact?: boolean }) {
  const past = day < today;
  return (
    <div className="grid gap-1">
      <AnimatePresence initial={false}>
        {tasks.map((t) => (
          <TaskRow key={t.id} t={t} readOnly={past} preview={day > today && t.u === 0} />
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

function TaskRow({ t, readOnly, preview }: { t: Task; readOnly: boolean; preview: boolean }) {
  const late = lateBy(t);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="group flex items-start gap-3 rounded-xl px-1 py-2"
    >
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
        {(late > 0 || t.routine || (readOnly && !t.done)) && (
          <div className="mt-0.5 flex flex-wrap gap-1.5 text-xs">
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
            {readOnly && !t.done && <span className="font-semibold text-marker">Not done</span>}
          </div>
        )}
      </div>
      {!readOnly && !preview && (
        <button
          type="button"
          onClick={() => deleteTask(t)}
          aria-label={`Delete ${t.title}`}
          className="shrink-0 rounded-lg p-1 text-muted opacity-60 transition hover:text-marker sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
        >
          <Trash2 size={15} />
        </button>
      )}
    </motion.div>
  );
}

function AddTask({ day, compact }: { day: number; compact: boolean }) {
  const [title, setTitle] = useState("");
  const [repeat, setRepeat] = useState(0);
  const [days, setDays] = useState<number[]>([]);
  const [open, setOpen] = useState(false);

  const submit = () => {
    const name = title.trim();
    if (!name) return;
    const r = REPEATS[repeat][1];
    if (r === null) addTask(name, day);
    else addRoutine(name, repeat === 3 ? days : r, day);
    setTitle("");
    setRepeat(0); // back to a one-off task, so the next one doesn't repeat by accident
    setDays([]);
  };
  const pickDays = repeat === 3;
  const canAdd = title.trim() && (!pickDays || days.length);

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
