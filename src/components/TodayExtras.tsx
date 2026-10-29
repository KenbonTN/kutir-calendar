"use client";

import { motion } from "motion/react";
import { Bell, ChevronRight, Hourglass, Phone, Scissors } from "lucide-react";
import { useState } from "react";
import { formatEt, formatGShort, WEEKDAYS, weekday } from "@/lib/ethiopian";
import { dueReminders, kind, whenLabel, type DateEvent } from "@/lib/events";
import { backToPool } from "@/lib/pool";
import { addTask, deleteTask, isStuck, moveTask, updateTask, type Task } from "@/lib/tasks";
import { equbStatus, left, useDebts, useEqubs } from "@/lib/money-plans";
import { dueIn, touched, usePeople } from "@/lib/people";

const btn = "rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold transition hover:border-muted";

/** Tasks that keep getting pushed to the next day: break them down, schedule them properly, or let them go. */
export function StuckTasks({ today, tasks }: { today: number; tasks: Task[] }) {
  const stuck = tasks.filter((t) => isStuck(t, today));
  if (!stuck.length) return null;
  return (
    <section className="card grid gap-3 border-gold/50 p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        <Hourglass size={18} className="text-gold" /> {stuck.length === 1 ? "A task keeps slipping" : `${stuck.length} tasks keep slipping`}
      </h2>
      <p className="-mt-2 text-sm text-muted">
        When something moves day after day, it usually needs to be smaller, or to have a real day of its own.
      </p>
      {stuck.map((t) => (
        <StuckRow key={t.id} t={t} today={today} />
      ))}
    </section>
  );
}

function StuckRow({ t, today }: { t: Task; today: number }) {
  const [mode, setMode] = useState<"" | "split" | "date">("");
  const [steps, setSteps] = useState("");
  const days = Array.from({ length: 60 }, (_, i) => today + 1 + i);
  return (
    <div className="grid gap-2 rounded-2xl bg-surface-2 p-3">
      <div>
        <div className="font-semibold">{t.title}</div>
        <div className="text-xs text-muted">Moved {t.missed.length} times · first planned for {formatEt(t.origin)}</div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className={btn} onClick={() => setMode(mode === "split" ? "" : "split")}>
          <Scissors size={13} className="mr-1 inline" /> Split into steps
        </button>
        <button type="button" className={btn} onClick={() => setMode(mode === "date" ? "" : "date")}>Give it a day</button>
        <button type="button" className={btn} onClick={() => backToPool(t)}>Back to the pool</button>
        <button type="button" className={`${btn} text-marker`} onClick={() => deleteTask(t)}>Drop it</button>
        <button type="button" className="px-2 text-sm font-semibold text-muted hover:text-ink" onClick={() => updateTask(t, { kept: t.missed.length })}>
          Keep going
        </button>
      </div>
      {mode === "split" && (
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const list = steps.split("\n").map((s) => s.trim()).filter(Boolean);
            if (!list.length) return;
            list.forEach((s, i) => addTask(s, today + i, { area: t.area, goal: t.goal }));
            deleteTask(t);
          }}
        >
          <label htmlFor={`steps-${t.id}`} className="text-sm text-muted">
            One small step per line. The first goes on today, the next on tomorrow, and so on.
          </label>
          <textarea
            id={`steps-${t.id}`}
            rows={3}
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            placeholder={"Write the outline\nDraft the first page\nSend it for review"}
            className="rounded-xl border border-line bg-surface px-3 py-2 text-[15px]"
          />
          <button type="submit" disabled={!steps.trim()} className="w-fit rounded-full bg-green px-4 py-1.5 text-sm font-semibold text-on-green disabled:opacity-40">
            Replace with these steps
          </button>
        </form>
      )}
      {mode === "date" && (
        <select
          id={`stuck-day-${t.id}`}
          aria-label="Day to do it"
          value=""
          onChange={(e) => e.target.value && moveTask(t, +e.target.value)}
          className="w-fit rounded-full border border-line bg-surface px-3 py-1.5 text-sm"
        >
          <option value="">Choose a day…</option>
          {days.map((d) => (
            <option key={d} value={d}>{WEEKDAYS[weekday(d)].slice(0, 3)} · {formatEt(d)} · {formatGShort(d)}</option>
          ))}
        </select>
      )}
    </div>
  );
}

/** Birthdays and important dates that are today or whose reminder has started. */
export function DateReminders({ today, events, onOpen }: { today: number; events: DateEvent[]; onOpen: (j: number) => void }) {
  const due = dueReminders(events, today);
  if (!due.length) return null;
  return (
    <section className="card grid gap-2 p-4 sm:px-6">
      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
        <Bell size={14} /> Coming up for you
      </h2>
      <ul className="grid gap-1.5">
        {due.map((o) => (
          <li key={`${o.ev.id}-${o.day}`}>
            <button type="button" onClick={() => onOpen(o.day)} className="flex w-full items-center gap-3 text-left">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-soft text-xl">{kind(o.ev.kind).emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {o.ev.title}
                  {o.years && <span className="font-normal text-muted"> · {o.years}</span>}
                </span>
                <span className="block text-sm text-muted">{formatEt(o.day)} · {formatGShort(o.day)}</span>
              </span>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${o.day === today ? "bg-gold text-bg" : "bg-surface-2 text-muted"}`}>
                {whenLabel(o.day, today)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Small nudges from the Life and Money plans: people to call, equb rounds and debts that are due. */
export function LifeNudges({ today, onOpen }: { today: number; onOpen: (tab: "life" | "money") => void }) {
  const people = usePeople(today).filter((p) => dueIn(p, today) <= 0);
  const equbs = useEqubs().flatMap((e) => {
    const s = equbStatus(e, today);
    return s.unpaid.length ? [{ id: e.id, text: `${e.name} equb: ${s.unpaid.length} round${s.unpaid.length > 1 ? "s" : ""} to pay` }] : [];
  });
  const debts = useDebts().filter((d) => left(d) > 0 && d.due != null && d.due <= today);
  if (!people.length && !equbs.length && !debts.length) return null;
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card grid gap-2 p-4 sm:p-5">
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-0.5">
        {people.slice(0, 4).map((p) => (
          <span key={p.id} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-marker/10 py-1 pl-1 pr-1.5 text-sm">
            <span className="grid size-7 place-items-center rounded-full bg-surface font-display text-xs font-extrabold text-marker">{p.name[0]?.toUpperCase()}</span>
            <span className="font-semibold">Call {p.name}</span>
            <span className="text-xs text-muted">{today - p.last}d</span>
            {p.phone && (
              <a href={`tel:${p.phone}`} aria-label={`Call ${p.name}`} className="grid size-7 place-items-center rounded-full bg-surface text-green">
                <Phone size={13} />
              </a>
            )}
            <button type="button" onClick={() => touched(p, today)} className="rounded-full bg-green px-2.5 py-1 text-xs font-bold text-on-green">
              Done
            </button>
          </span>
        ))}
        {equbs.map((e) => (
          <button key={e.id} type="button" onClick={() => onOpen("money")} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1.5 text-sm font-semibold text-gold">
            🪙 {e.text}
          </button>
        ))}
        {debts.map((d) => (
          <span key={d.id} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-semibold">
            💸 {d.dir === "owe" ? `Pay ${d.person} back` : `${d.person} owes you`} · {Math.round(left(d)).toLocaleString("en")} Birr
          </span>
        ))}
        {people.length > 4 && (
          <button type="button" onClick={() => onOpen("life")} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-muted">
            {people.length - 4} more <ChevronRight size={14} />
          </button>
        )}
      </div>
    </motion.section>
  );
}
