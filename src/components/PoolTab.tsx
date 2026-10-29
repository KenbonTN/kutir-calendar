"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRight, CalendarPlus, Clock, Inbox, PartyPopper, Plus, Scale, Settings2, Target, Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useAreas } from "@/lib/areas";
import { formatEt, formatGShort, WEEKDAYS, weekday } from "@/lib/ethiopian";
import { useGoals } from "@/lib/goals";
import type { Cal } from "@/lib/months";
import {
  addToPool, backToPool, deletePoolItem, ESTIMATES, minsLabel, planPoolItem, poolStore, updatePoolItem, type PoolItem,
} from "@/lib/pool";
import { useRecords } from "@/lib/records";
import { review, weekOf } from "@/lib/review";
import { useStored } from "@/lib/storage";
import { addTask, pullForward, type Routine, type Task } from "@/lib/tasks";
import { AreaPicker, AreaSelect, AreaTag } from "./AreaBits";
import { AreasManager } from "./AreasManager";
import { CalSwitch, DatePicker } from "./NewGoalForm";
import { Sheet } from "./Sheet";

const shortDay = (j: number, today: number) =>
  j === today ? "Today" : j === today + 1 ? "Tomorrow" : `${WEEKDAYS[weekday(j)].slice(0, 3)} · ${formatEt(j)}`;

export const usePool = () => {
  const items = useRecords(poolStore);
  return useMemo(() => [...items].sort((a, b) => a.created - b.created), [items]);
};

export function PoolTab({ today, tasks, routines }: { today: number; tasks: Task[]; routines: Routine[] }) {
  const pool = usePool();
  const areas = useAreas();
  const [filter, setFilter] = useState<string>("all");
  const [manage, setManage] = useState(false);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of pool) {
      const k = areas.topOf(p.area) ?? "none";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [pool, areas]);
  const shown = filter === "all" ? pool : pool.filter((p) => (areas.topOf(p.area) ?? "none") === filter);
  const ahead = tasks
    .filter((t) => !t.done && !t.routine && t.date > today)
    .sort((a, b) => a.date - b.date || a.created - b.created);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold">
            <Inbox size={26} className="text-green" /> Task pool
          </h1>
          <p className="text-sm text-muted">Everything you want to do, sorted by life area. Plan it onto a day when you&apos;re ready.</p>
        </div>
        <button
          type="button"
          onClick={() => setManage(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-semibold hover:border-muted"
        >
          <Settings2 size={15} /> Life areas
        </button>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="grid gap-6 lg:col-span-7">
          <AddToPool today={today} />

          <section className="grid gap-3">
            <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-1">
              <FilterChip on={filter === "all"} onClick={() => setFilter("all")}>All · {pool.length}</FilterChip>
              {areas.top.filter((a) => counts.has(a.id)).map((a) => (
                <FilterChip key={a.id} on={filter === a.id} color={a.color} onClick={() => setFilter(a.id)}>
                  {a.emoji} {a.name} · {counts.get(a.id)}
                </FilterChip>
              ))}
              {counts.has("none") && (
                <FilterChip on={filter === "none"} onClick={() => setFilter("none")}>No area · {counts.get("none")}</FilterChip>
              )}
            </div>
            <div className="card divide-y divide-line px-4 sm:px-5">
              {shown.length === 0 && (
                <p className="py-6 text-center text-sm text-muted">
                  {pool.length ? "Nothing in this area." : "Your pool is empty. Add the things you want to get done, even without a date."}
                </p>
              )}
              <AnimatePresence initial={false}>
                {shown.map((p) => (
                  <PoolRow key={p.id} p={p} today={today} />
                ))}
              </AnimatePresence>
            </div>
          </section>
        </div>

        <div className="grid gap-6 lg:col-span-5">
          <WeekReview today={today} tasks={tasks} routines={routines} />
          <section className="card grid gap-2 p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <CalendarPlus size={18} className="text-green" /> Planned ahead
            </h2>
            {ahead.length === 0 && <p className="text-sm text-muted">Nothing planned for the coming days yet.</p>}
            <ul className="divide-y divide-line">
              {ahead.slice(0, 20).map((t) => (
                <li key={t.id} className="flex items-center gap-2 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px]">{t.title}</div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                      {shortDay(t.date, today)} {t.area && <AreaTag id={t.area} short />}
                    </div>
                  </div>
                  <button type="button" onClick={() => pullForward(t, today)} className="shrink-0 rounded-full border border-line px-2.5 py-1 text-xs font-semibold hover:border-green">
                    Do today
                  </button>
                  <button type="button" onClick={() => backToPool(t)} aria-label={`Send ${t.title} back to the pool`} title="Back to the pool" className="shrink-0 p-1 text-muted hover:text-ink">
                    <Inbox size={15} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <Sheet open={manage} onClose={() => setManage(false)} label="Life areas">
        {manage && <AreasManager />}
      </Sheet>
    </div>
  );
}

function FilterChip({ on, color, onClick, children }: { on: boolean; color?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${on ? "text-white" : "border-line bg-surface text-muted"}`}
      style={on ? { background: color ?? "var(--ink)", borderColor: color ?? "var(--ink)", color: color ? "#fff" : "var(--bg)" } : undefined}
    >
      {children}
    </button>
  );
}

/** Day picker for planning: quick chips plus a full date in either calendar. */
function WhenPicker({ today, value, onChange, allowPool }: { today: number; value: number | null; onChange: (d: number | null) => void; allowPool: boolean }) {
  const [cal, setCal] = useStored<Cal>("kutir-pick-cal", "ethiopian");
  const [custom, setCustom] = useState(false);
  const chip = (on: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-semibold transition ${on ? "border-green bg-green-soft text-green" : "border-line text-muted hover:border-muted"}`;
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-1.5">
        {allowPool && (
          <button type="button" className={chip(value == null && !custom)} onClick={() => { onChange(null); setCustom(false); }}>
            Keep in the pool
          </button>
        )}
        <button type="button" className={chip(value === today && !custom)} onClick={() => { onChange(today); setCustom(false); }}>Today</button>
        <button type="button" className={chip(value === today + 1 && !custom)} onClick={() => { onChange(today + 1); setCustom(false); }}>Tomorrow</button>
        <button type="button" className={chip(custom)} onClick={() => { setCustom(true); onChange(Math.max(value ?? today + 2, today)); }}>Pick a day</button>
      </div>
      {custom && value != null && (
        <div className="grid gap-2 rounded-2xl bg-surface-2 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold">{shortDay(value, today)} · <span className="font-normal text-muted">{formatGShort(value)}</span></span>
            <CalSwitch cal={cal} setCal={setCal} id="plan-cal" />
          </div>
          <DatePicker value={value} onChange={(d) => onChange(Math.max(d, today))} cal={cal} id="plan-day" />
        </div>
      )}
    </div>
  );
}

function AddToPool({ today }: { today: number }) {
  const goals = useGoals();
  const [title, setTitle] = useState("");
  const [area, setArea] = useState("");
  const [mins, setMins] = useState(0);
  const [goal, setGoal] = useState("");
  const [when, setWhen] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <form
      className="card grid gap-4 p-5 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        const name = title.trim();
        if (!name) return;
        if (when == null) addToPool(name, { area, mins, goal });
        else addTask(name, when, { area, mins, goal });
        setMsg(when == null ? `“${name}” is in the pool.` : `“${name}” is planned for ${shortDay(when, today).toLowerCase()}.`);
        setTitle("");
        setMins(0);
      }}
    >
      <h2 className="font-display text-xl font-extrabold">Add to the pool</h2>
      <input
        id="pool-title"
        value={title}
        maxLength={120}
        onChange={(e) => {
          setTitle(e.target.value);
          setMsg(null);
        }}
        placeholder="Call the supplier, read Psalms 1–10, visit grandma…"
        className="rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[15px]"
      />
      <div className="grid gap-1.5">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Life area</span>
        <AreaPicker value={area} onChange={setArea} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">Takes about</span>
        {ESTIMATES.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mins === m}
            onClick={() => setMins(mins === m ? 0 : m)}
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${mins === m ? "border-green bg-green-soft text-green" : "border-line text-muted"}`}
          >
            {minsLabel(m)}
          </button>
        ))}
        {goals.length > 0 && (
          <select id="pool-goal" aria-label="Countdown" value={goal} onChange={(e) => setGoal(e.target.value)} className="ml-auto rounded-full border border-line bg-surface px-3 py-1 text-xs">
            <option value="">No countdown</option>
            {goals.map((g) => <option key={g.id} value={g.id}>For: {g.name}</option>)}
          </select>
        )}
      </div>
      <div className="grid gap-1.5">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">When</span>
        <WhenPicker today={today} value={when} onChange={setWhen} allowPool />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!title.trim()}
          className="inline-flex items-center gap-1.5 rounded-full bg-green px-5 py-2.5 font-semibold text-on-green transition active:scale-95 disabled:opacity-40"
        >
          <Plus size={17} /> {when == null ? "Add to pool" : "Plan it"}
        </button>
        {msg && <span className="text-sm font-semibold text-green">{msg}</span>}
      </div>
    </form>
  );
}

function PoolRow({ p, today }: { p: PoolItem; today: number }) {
  const goals = useGoals();
  const goal = p.goal ? goals.find((g) => g.id === p.goal) : undefined;
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState<number | null>(today);

  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="break-words text-[15px] font-semibold leading-snug">{p.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            {p.area && <AreaTag id={p.area} />}
            {p.mins ? <span className="inline-flex items-center gap-1"><Clock size={11} /> {minsLabel(p.mins)}</span> : null}
            {goal && <span className="inline-flex items-center gap-1"><Target size={11} /> {goal.name}</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition ${open ? "bg-surface-2" : "bg-green text-on-green"}`}
        >
          {open ? "Close" : "Plan it"}
        </button>
      </div>
      {open && (
        <div className="mt-3 grid gap-3 rounded-2xl border border-line p-3">
          <WhenPicker today={today} value={day} onChange={setDay} allowPool={false} />
          <div className="flex flex-wrap items-center gap-1.5">
            <AreaSelect id={`pool-area-${p.id}`} value={p.area} onChange={(area) => updatePoolItem(p.id, { area })} className="text-xs" />
            <select
              id={`pool-mins-${p.id}`}
              aria-label="Time it takes"
              value={p.mins ?? 0}
              onChange={(e) => updatePoolItem(p.id, { mins: +e.target.value })}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs"
            >
              <option value={0}>No time estimate</option>
              {ESTIMATES.map((m) => <option key={m} value={m}>{minsLabel(m)}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={() => deletePoolItem(p.id)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-marker">
              <Trash2 size={14} /> Delete
            </button>
            <button
              type="button"
              disabled={day == null}
              onClick={() => day != null && planPoolItem(p, day)}
              className="inline-flex items-center gap-1.5 rounded-full bg-green px-4 py-2 text-sm font-semibold text-on-green disabled:opacity-40"
            >
              <CalendarPlus size={15} /> Plan for {day != null ? shortDay(day, today).toLowerCase() : "…"}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Shown when every task for today is done: more work from later days and from
 * the pool. Taking one moves it onto today. Items that fit the time left come first.
 */
export function PullFromPool({
  today, now, tasks, cleared, onClose,
}: { today: number; now: number; tasks: Task[]; cleared: boolean; onClose?: () => void }) {
  const pool = usePool();
  const [more, setMore] = useState(false);
  const d = new Date(now);
  const mins = d.getHours() * 60 + d.getMinutes();
  const left = Math.max(0, (mins < 22 * 60 ? 22 * 60 : 24 * 60) - mins);

  type Pick = { id: string; title: string; area?: string; mins?: number; from?: number; take: () => void };
  const picks: Pick[] = [
    ...tasks
      .filter((t) => !t.done && !t.routine && t.date > today && t.date <= today + 14)
      .sort((a, b) => a.date - b.date)
      .map((t) => ({ id: t.id, title: t.title, area: t.area, mins: t.mins, from: t.date, take: () => pullForward(t, today) })),
    ...pool.map((p) => ({ id: p.id, title: p.title, area: p.area, mins: p.mins, take: () => planPoolItem(p, today) })),
  ];
  const fits = (p: Pick) => !p.mins || p.mins <= left;
  const sorted = [...picks.filter(fits), ...picks.filter((p) => !fits(p))];
  const shown = more ? sorted : sorted.slice(0, 5);

  return (
    <div className="grid gap-2 rounded-2xl border border-green/40 bg-green-soft/50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 font-display text-lg font-bold">
            {cleared ? <PartyPopper size={18} className="text-green" /> : <Inbox size={18} className="text-green" />}
            {cleared ? "Day cleared early!" : "Take more for today"}
          </div>
          <p className="text-sm text-muted">
            {picks.length
              ? `About ${minsLabel(left)} left before ${mins < 22 * 60 ? "10 PM" : "midnight"}. Take something on and it moves to today.`
              : `Nothing waiting in the pool or later days.${cleared ? " Enjoy the rest of your day." : ""}`}
          </p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="shrink-0 text-sm font-semibold text-muted hover:text-ink">Hide</button>
        )}
      </div>
      <ul className="grid gap-1">
        {shown.map((p) => (
          <li key={p.id} className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px]">{p.title}</div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                {p.from ? <span>Planned for {shortDay(p.from, today).toLowerCase()}</span> : <span>From the pool</span>}
                {p.mins ? <span className={fits(p) ? "" : "text-gold"}>· {minsLabel(p.mins)}{fits(p) ? "" : " (longer than the time left)"}</span> : null}
                {p.area && <AreaTag id={p.area} short />}
              </div>
            </div>
            <button
              type="button"
              onClick={p.take}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green px-3 py-1.5 text-xs font-semibold text-on-green active:scale-95"
            >
              <ArrowUpRight size={13} /> Do it today
            </button>
          </li>
        ))}
      </ul>
      {sorted.length > 5 && (
        <button type="button" onClick={() => setMore(!more)} className="justify-self-start text-sm font-semibold text-green">
          {more ? "Show fewer" : `Show all ${sorted.length}`}
        </button>
      )}
    </div>
  );
}

/** How a week went: done vs planned, balance across life areas, and what slipped. */
export function WeekReview({
  today, tasks, routines, last = false, onPlan, onDismiss,
}: { today: number; tasks: Task[]; routines: Routine[]; last?: boolean; onPlan?: () => void; onDismiss?: () => void }) {
  const areas = useAreas();
  const [which, setWhich] = useState<"this" | "last">(last ? "last" : "this");
  const [from, to] = weekOf(which === "this" ? today : today - 7);
  const end = Math.min(to, which === "this" ? today : to);
  const r = review(from, end, tasks, routines, areas);
  const totalArea = r.byArea.reduce((a, x) => a + x.n, 0) + r.untagged;

  return (
    <section className="card grid gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <Scale size={18} className="text-green" /> {which === "this" ? "This week" : "Last week"}
          </h2>
          <p className="text-xs text-muted">{formatEt(from)} – {formatEt(to)}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-line bg-surface-2 p-0.5 text-xs font-semibold">
            {(["this", "last"] as const).map((w) => (
              <button key={w} type="button" aria-pressed={which === w} onClick={() => setWhich(w)} className={`rounded-full px-2.5 py-1 ${which === w ? "bg-ink text-bg" : "text-muted"}`}>
                {w === "this" ? "This week" : "Last week"}
              </button>
            ))}
          </div>
          {onDismiss && <button type="button" onClick={onDismiss} className="text-sm font-semibold text-muted hover:text-ink">Got it</button>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Mini label="Done" value={`${r.done}/${r.due}`} />
        <Mini label="Slipped" value={`${r.slipped.length}`} />
        <Mini label="Done early" value={`${r.early}`} />
      </div>

      <div className="grid gap-2">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Balance of your life areas</h3>
        {totalArea === 0 ? (
          <p className="text-sm text-muted">Finish tasks with a life area and you&apos;ll see where your time goes.</p>
        ) : (
          <>
            <div className="flex h-3 overflow-hidden rounded-full bg-surface-2" role="img" aria-label="Finished tasks by life area">
              {r.byArea.map((a) => (
                <span key={a.id} style={{ width: `${(a.n / totalArea) * 100}%`, background: a.color }} />
              ))}
            </div>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              {r.byArea.map((a) => (
                <li key={a.id} className="flex min-w-0 items-center gap-1.5">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: a.color }} />
                  <span className="truncate">{a.emoji} {a.name}</span>
                  <span className="ml-auto shrink-0 tabular-nums text-muted">{Math.round((a.n / totalArea) * 100)}%</span>
                </li>
              ))}
              {r.untagged > 0 && (
                <li className="flex items-center gap-1.5 text-muted">
                  <span className="size-2.5 rounded-full bg-line" /> No area <span className="ml-auto tabular-nums">{Math.round((r.untagged / totalArea) * 100)}%</span>
                </li>
              )}
            </ul>
          </>
        )}
        {r.missing.length > 0 && (
          <p className="rounded-xl bg-gold-soft px-3 py-2 text-sm">
            Nothing done for {r.missing.map((a) => `${a.emoji} ${a.name}`).join(", ")} {which === "this" ? "yet this week" : "last week"}.
            {which === "this" ? " Maybe plan something small?" : ""}
          </p>
        )}
      </div>

      {r.mostMoved && r.mostMoved.missed.length > 1 && (
        <p className="text-sm text-muted">
          Moved the most: <span className="font-semibold text-ink">{r.mostMoved.title}</span> ({r.mostMoved.missed.length} times)
        </p>
      )}

      {onPlan && (
        <button type="button" onClick={onPlan} className="inline-flex w-fit items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg">
          <CalendarPlus size={15} /> Plan next week from the pool
        </button>
      )}
    </section>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-2 py-2.5">
      <div className="font-display text-xl font-extrabold tabular-nums">{value}</div>
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{label}</div>
    </div>
  );
}
