"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  Award, Check, Flame, HeartHandshake, Leaf, Mountain, Phone, Plus, Repeat, Sparkles, Target, Trash2, Trophy,
} from "lucide-react";
import { useMemo, useState } from "react";
import { addAim, aimProgress, deleteAim, updateAim, useAims, type Aim } from "@/lib/aims";
import { useAreas } from "@/lib/areas";
import { formatEt, fromJdn, MONTHS, toJdn } from "@/lib/ethiopian";
import { birr, useExpenses } from "@/lib/expenses";
import { linkGoal, useGoals } from "@/lib/goals";
import { useT } from "@/lib/i18n";
import { useIncome } from "@/lib/income";
import { habitGrid, yearRange, yearReview } from "@/lib/insights";
import { useNotes } from "@/lib/notes";
import { orthodoxDay } from "@/lib/orthodox";
import { addPerson, deletePerson, dueIn, EVERY, logFast, touched, useFasts, usePeople, type Person } from "@/lib/people";
import { minsLabel } from "@/lib/pool";
import { useScreen } from "@/lib/screen";
import { routineLabel, type Routine, type Task } from "@/lib/tasks";
import { AreaSelect, AreaTag } from "./AreaBits";
import { Counter, Reveal } from "./Motion";
import { Sheet } from "./Sheet";

const label = "text-xs font-bold uppercase tracking-[0.12em] text-muted";
const input = "rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[15px]";
const pctFmt = (n: number) => `${Math.round(n)}%`;

export function LifeTab({ today, tasks, routines }: { today: number; tasks: Task[]; routines: Routine[] }) {
  const t = useT();
  const [review, setReview] = useState<number | null>(null);
  const year = fromJdn(today).y;
  return (
    <>
      <Reveal>
        <header className="card sky-day relative overflow-clip p-6 sm:p-8">
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 text-[10rem] leading-none opacity-[0.07]"
            animate={{ rotate: [0, 8, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          >
            ⛰
          </motion.div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-soft px-2.5 py-1 text-xs font-bold text-green">
            <Mountain size={13} /> {year} E.C.
          </span>
          <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-balance sm:text-4xl">
            The bigger picture
          </h1>
          <p className="mt-2 max-w-xl text-[15px] text-muted">
            Your goals for the year, the habits that get you there, the people who matter and the fasts you keep.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setReview(year)}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg transition active:scale-95"
            >
              <Sparkles size={15} /> {t("Year in review")} {year}
            </button>
            <button
              type="button"
              onClick={() => setReview(year - 1)}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold transition hover:border-muted active:scale-95"
            >
              {year - 1}
            </button>
          </div>
        </header>
      </Reveal>

      <Reveal><Aims today={today} tasks={tasks} /></Reveal>
      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal><Habits today={today} tasks={tasks} routines={routines} /></Reveal>
        <Reveal delay={0.05}><People today={today} /></Reveal>
      </div>
      <Reveal><Fasting today={today} /></Reveal>

      <Sheet open={review != null} onClose={() => setReview(null)} label="Year in review">
        {review != null && <YearReview year={review} today={today} tasks={tasks} routines={routines} />}
      </Sheet>
    </>
  );
}

/* ---------- Big goals ---------- */

function Aims({ today, tasks }: { today: number; tasks: Task[] }) {
  const t = useT();
  const year = fromJdn(today).y;
  const aims = useAims().filter((a) => a.year >= year - 1);
  const goals = useGoals();
  const [adding, setAdding] = useState(false);

  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold">
          <Target size={22} className="text-marker" /> {t("Big goals")}
        </h2>
        <button
          type="button"
          onClick={() => setAdding(!adding)}
          className="inline-flex items-center gap-1 rounded-full bg-green px-3 py-1.5 text-sm font-semibold text-on-green transition active:scale-95"
        >
          <Plus size={15} /> Goal
        </button>
      </div>
      <p className="-mt-2 text-sm text-muted">
        Big goal → countdowns → today&apos;s tasks. Link a countdown to a goal, link tasks to the countdown, and every task you
        finish moves the goal forward.
      </p>
      <AnimatePresence initial={false}>
        {adding && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <AddAim year={year} onDone={() => setAdding(false)} />
          </motion.div>
        )}
      </AnimatePresence>
      {aims.length === 0 && !adding ? (
        <div className="card grid place-items-center gap-3 p-8 text-center">
          <span className="text-4xl">🎯</span>
          <p className="max-w-sm text-sm text-muted">
            What do you want {year} to be the year of? Add two or three big goals: a degree, a business milestone, a
            healthier body, a closer family.
          </p>
          <button type="button" onClick={() => setAdding(true)} className="rounded-full bg-marker px-4 py-2 text-sm font-semibold text-white">
            Set my first goal
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {aims.map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <AimCard aim={a} goals={goals} tasks={tasks} />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}

function AddAim({ year, onDone }: { year: number; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [area, setArea] = useState("");
  const [why, setWhy] = useState("");
  const [y, setY] = useState(year);
  return (
    <form
      className="card grid gap-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        addAim({ title: title.trim(), year: y, area, why });
        onDone();
      }}
    >
      <input id="aim-title" autoFocus value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Launch my second business" className={input} />
      <input id="aim-why" value={why} maxLength={140} onChange={(e) => setWhy(e.target.value)} placeholder="Why it matters to you (optional)" className={input} />
      <div className="flex flex-wrap items-center gap-2">
        <AreaSelect id="aim-area" value={area} onChange={setArea} />
        <select id="aim-year" aria-label="Year" value={y} onChange={(e) => setY(+e.target.value)} className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm">
          {[year, year + 1].map((v) => <option key={v} value={v}>{v} E.C.</option>)}
        </select>
        <button type="submit" disabled={!title.trim()} className="ml-auto rounded-full bg-green px-4 py-2 text-sm font-semibold text-on-green disabled:opacity-40">
          Add goal
        </button>
      </div>
    </form>
  );
}

function AimCard({ aim, goals, tasks }: { aim: Aim; goals: ReturnType<typeof useGoals>; tasks: Task[] }) {
  const p = aimProgress(aim, goals, tasks);
  const free = goals.filter((g) => !g.aim);
  const [armed, setArmed] = useState(false);
  const R = 30, C = 2 * Math.PI * R;
  return (
    <article className={`card card-hover grid h-full content-start gap-3 p-5 ${aim.achieved ? "ring-2 ring-gold/60" : ""}`}>
      <div className="flex items-start gap-4">
        <div className="relative size-[72px] shrink-0">
          <svg viewBox="0 0 72 72" className="size-full -rotate-90">
            <circle cx="36" cy="36" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="7" />
            <motion.circle
              cx="36" cy="36" r={R} fill="none" stroke={aim.achieved ? "var(--gold)" : "var(--green)"} strokeWidth="7" strokeLinecap="round"
              strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - p.pct) }} transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center font-display text-lg font-extrabold tabular-nums">
            {aim.achieved ? <Trophy size={24} className="text-gold" /> : <Counter value={p.pct * 100} format={pctFmt} />}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold leading-snug">{aim.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
            {aim.area && <AreaTag id={aim.area} />}
            <span className="text-muted">{aim.year} E.C.</span>
          </div>
          {aim.why && <p className="mt-1.5 text-sm italic text-muted">“{aim.why}”</p>}
        </div>
      </div>
      <div className="text-sm text-muted">
        {p.total ? `${p.done} of ${p.total} linked tasks done` : p.linked.length ? "No tasks linked to its countdowns yet." : "Link a countdown to start tracking."}
      </div>
      {p.linked.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {p.linked.map((g) => (
            <button
              key={g.id}
              type="button"
              title="Unlink"
              onClick={() => linkGoal(g.id, "")}
              className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold hover:line-through"
            >
              ⏳ {g.name}
            </button>
          ))}
        </div>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-3">
        {free.length > 0 && (
          <select
            id={`link-${aim.id}`}
            aria-label="Link a countdown"
            value=""
            onChange={(e) => e.target.value && linkGoal(e.target.value, aim.id)}
            className="min-w-0 flex-1 rounded-full border border-line bg-surface px-3 py-1.5 text-xs"
          >
            <option value="">+ Link a countdown…</option>
            {free.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
        <button
          type="button"
          onClick={() => updateAim(aim.id, { achieved: !aim.achieved })}
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${aim.achieved ? "bg-gold text-bg" : "border border-line hover:border-gold hover:text-gold"}`}
        >
          <Award size={13} /> {aim.achieved ? "Achieved" : "Mark achieved"}
        </button>
        <button
          type="button"
          onClick={() => (armed ? deleteAim(aim.id) : (setArmed(true), setTimeout(() => setArmed(false), 3000)))}
          aria-label={armed ? "Tap again to delete" : `Delete ${aim.title}`}
          className={`p-1 transition ${armed ? "text-marker" : "text-muted hover:text-marker"}`}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  );
}

/* ---------- Habits ---------- */

function Habits({ today, tasks, routines }: { today: number; tasks: Task[]; routines: Routine[] }) {
  const t = useT();
  return (
    <section className="card grid content-start gap-4 p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
        <Repeat size={20} className="text-green" /> {t("Habits")}
      </h2>
      {routines.length === 0 ? (
        <p className="text-sm text-muted">
          Repeating tasks show up here as a grid of squares, one for each day. Add a task on the Today tab and choose
          &quot;Every day&quot; or &quot;Weekdays&quot;.
        </p>
      ) : (
        routines.map((r) => <HabitRow key={r.id} r={r} today={today} tasks={tasks} />)
      )}
    </section>
  );
}

const CELL: Record<string, string> = {
  done: "bg-green",
  missed: "bg-marker/25",
  off: "bg-surface-2/60",
  future: "bg-surface-2/40",
  before: "bg-transparent",
};

function HabitRow({ r, today, tasks }: { r: Routine; today: number; tasks: Task[] }) {
  const g = useMemo(() => habitGrid(r, tasks, today, 26), [r, tasks, today]);
  const weeks = Array.from({ length: g.cells.length / 7 }, (_, w) => g.cells.slice(w * 7, w * 7 + 7));
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold">{r.title}</div>
          <div className="text-xs text-muted">{routineLabel(r.days)}</div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1 font-bold text-gold"><Flame size={13} /> {g.streak}</span>
          <span>best {g.best}</span>
          <span className="font-bold text-ink">{g.rate == null ? "—" : `${Math.round(g.rate * 100)}%`}</span>
        </div>
      </div>
      <div className="no-scrollbar flex gap-[3px] overflow-x-auto pb-1" role="img" aria-label={`${r.title}: done on ${g.rate == null ? 0 : Math.round(g.rate * 100)}% of its days over the last 26 weeks`}>
        {weeks.map((w, i) => (
          <div key={i} className="grid shrink-0 grid-rows-7 gap-[3px]">
            {w.map((c, k) => (
              <motion.i
                key={c.day}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: (i * 7 + k) * 0.002 }}
                title={`${formatEt(c.day)}: ${c.state}`}
                className={`block size-[11px] rounded-[3px] ${CELL[c.state]} ${c.day === today ? "ring-1 ring-gold" : ""}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Keep in touch ---------- */

function People({ today }: { today: number }) {
  const t = useT();
  const people = usePeople(today);
  const [adding, setAdding] = useState(false);
  const due = people.filter((p) => dueIn(p, today) <= 0).length;
  return (
    <section className="card grid content-start gap-3 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
          <HeartHandshake size={20} className="text-marker" /> {t("Keep in touch")}
          {due > 0 && <span className="pulse-ring rounded-full bg-marker px-2 py-0.5 text-xs font-bold text-white">{due}</span>}
        </h2>
        <button type="button" onClick={() => setAdding(!adding)} className="inline-flex items-center gap-1 rounded-full bg-green px-3 py-1.5 text-sm font-semibold text-on-green">
          <Plus size={15} /> Person
        </button>
      </div>
      {adding && <AddPerson today={today} onDone={() => setAdding(false)} />}
      {people.length === 0 && !adding && (
        <p className="text-sm text-muted">
          Add the people you don&apos;t want to drift away from: parents, grandparents, old friends, mentors. Kutir nudges you
          when it&apos;s been too long.
        </p>
      )}
      <div className="divide-y divide-line">
        <AnimatePresence initial={false}>
          {people.map((p) => (
            <motion.div key={p.id} layout exit={{ opacity: 0, height: 0 }}>
              <PersonRow p={p} today={today} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}

function AddPerson({ today, onDone }: { today: number; onDone: () => void }) {
  const [name, setName] = useState("");
  const [every, setEvery] = useState(7);
  const [phone, setPhone] = useState("");
  return (
    <form
      className="grid gap-2 rounded-2xl bg-surface-2 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        addPerson({ name: name.trim(), every, last: today, phone });
        onDone();
      }}
    >
      <input id="person-name" autoFocus value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Name, e.g. Mom, Abel" className={`${input} bg-surface`} />
      <div className="flex flex-wrap gap-2">
        <select id="person-every" aria-label="How often" value={every} onChange={(e) => setEvery(+e.target.value)} className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm">
          {EVERY.map(([n, l]) => <option key={n} value={n}>{l}</option>)}
        </select>
        <input id="person-phone" value={phone} maxLength={20} inputMode="tel" onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" className="min-w-0 flex-1 rounded-full border border-line bg-surface px-3 py-1.5 text-sm" />
        <button type="submit" disabled={!name.trim()} className="rounded-full bg-green px-4 py-1.5 text-sm font-semibold text-on-green disabled:opacity-40">
          Add
        </button>
      </div>
    </form>
  );
}

function PersonRow({ p, today }: { p: Person; today: number }) {
  const t = useT();
  const d = dueIn(p, today);
  const since = today - p.last;
  const [armed, setArmed] = useState(false);
  const tone = d < 0 ? "text-marker" : d <= 1 ? "text-gold" : "text-muted";
  return (
    <div className="group flex items-center gap-3 py-2.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-green-soft to-gold-soft font-display font-extrabold text-green">
        {p.name.slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{p.name}</div>
        <div className={`text-xs ${tone}`}>
          {since === 0 ? "In touch today" : `${since} day${since === 1 ? "" : "s"} since you talked`}
          {d < 0 ? ` · ${-d} overdue` : d === 0 ? " · today" : ""}
        </div>
      </div>
      {p.phone && (
        <a href={`tel:${p.phone}`} aria-label={`Call ${p.name}`} className="grid size-9 place-items-center rounded-full border border-line text-muted hover:text-green">
          <Phone size={15} />
        </a>
      )}
      <button
        type="button"
        disabled={since === 0}
        onClick={() => touched(p, today)}
        className="inline-flex items-center gap-1 rounded-full bg-green-soft px-3 py-1.5 text-xs font-bold text-green transition active:scale-95 disabled:opacity-50"
      >
        <Check size={13} /> {t("Called")}
      </button>
      <button
        type="button"
        onClick={() => (armed ? deletePerson(p.id) : (setArmed(true), setTimeout(() => setArmed(false), 3000)))}
        aria-label={armed ? `Tap again to remove ${p.name}` : `Remove ${p.name}`}
        className={`p-1 transition ${armed ? "text-marker" : "text-muted opacity-60 hover:text-marker sm:opacity-0 sm:group-hover:opacity-100"}`}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

/* ---------- Fasting ---------- */

function Fasting({ today }: { today: number }) {
  const t = useT();
  const fasts = useFasts();
  const days = useMemo(() => {
    const out: { day: number; name: string }[] = [];
    for (let j = today - 59; j <= today; j++) {
      const f = orthodoxDay(j).fast;
      if (f) out.push({ day: j, name: f.en });
    }
    return out;
  }, [today]);
  const [from, to] = yearRange(fromJdn(today).y);
  const year = useMemo(() => {
    let kept = 0, broke = 0;
    for (const [d, k] of fasts) if (d >= from && d <= to) {
      if (k) kept++;
      else broke++;
    }
    return { kept, broke };
  }, [fasts, from, to]);
  const todayFast = orthodoxDay(today).fast;

  return (
    <section className="card grid gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
          <Leaf size={20} className="text-green" /> {t("Fasting")}
        </h2>
        <div className="flex gap-4 text-sm">
          <span><b className="font-display text-lg text-green"><Counter value={year.kept} /></b> kept this year</span>
          {year.broke > 0 && <span className="text-muted">{year.broke} not kept</span>}
        </div>
      </div>
      {todayFast ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-green-soft/60 p-3">
          <span className="text-sm font-semibold">Today: {todayFast.en}</span>
          <FastToggle day={today} value={fasts.get(today)} />
        </div>
      ) : (
        <p className="text-sm text-muted">No fast today. On fast days you can log whether you kept it, here or on the Today card.</p>
      )}
      {days.length > 0 && (
        <div>
          <div className={`${label} mb-2`}>Fast days, last 60 days</div>
          <div className="flex flex-wrap gap-1.5">
            {days.map(({ day, name }) => {
              const v = fasts.get(day);
              return (
                <button
                  key={day}
                  type="button"
                  title={`${formatEt(day)} · ${name}: ${v == null ? "not logged" : v ? "kept" : "not kept"} (tap to change)`}
                  onClick={() => logFast(day, v == null ? true : v ? false : null)}
                  className={`grid size-8 place-items-center rounded-lg text-[11px] font-bold tabular-nums transition active:scale-90 ${
                    v == null ? "border border-dashed border-line text-muted" : v ? "bg-green text-on-green" : "bg-marker/20 text-marker"
                  } ${day === today ? "ring-2 ring-gold" : ""}`}
                >
                  {fromJdn(day).d}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted">Tap a day: kept → not kept → not logged.</p>
        </div>
      )}
    </section>
  );
}

export function FastToggle({ day, value }: { day: number; value: boolean | undefined }) {
  const t = useT();
  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        aria-pressed={value === true}
        onClick={() => logFast(day, value === true ? null : true)}
        className={`rounded-full px-3 py-1 text-xs font-bold transition active:scale-95 ${value === true ? "bg-green text-on-green" : "border border-line bg-surface"}`}
      >
        🌿 {t("Kept the fast")}
      </button>
      <button
        type="button"
        aria-pressed={value === false}
        onClick={() => logFast(day, value === false ? null : false)}
        className={`rounded-full px-3 py-1 text-xs font-bold transition active:scale-95 ${value === false ? "bg-marker text-white" : "border border-line bg-surface text-muted"}`}
      >
        {t("Didn't fast")}
      </button>
    </div>
  );
}

/* ---------- Year in review ---------- */

export function YearReview({ year, today, tasks, routines }: { year: number; today: number; tasks: Task[]; routines: Routine[] }) {
  const goals = useGoals();
  const expenses = useExpenses();
  const income = useIncome();
  const logs = useScreen();
  const notes = useNotes();
  const areas = useAreas();
  const aims = useAims().filter((a) => a.year === year);
  const r = useMemo(
    () => yearReview(year, today, { tasks, routines, goals, expenses, income, logs, notes }),
    [year, today, tasks, routines, goals, expenses, income, logs, notes],
  );
  const maxMonth = Math.max(1, ...r.byMonth.map((m) => m.due));
  const started = today >= toJdn(year, 1, 1);

  return (
    <div className="grid gap-5">
      <div className="pr-10">
        <div className={label}>{t2(year, today)}</div>
        <h2 className="font-display text-3xl font-extrabold">Your {year}</h2>
      </div>
      {!started || r.due === 0 ? (
        <p className="text-sm text-muted">Nothing logged for {year} yet. Come back once you&apos;ve planned a few days.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Big label="Tasks done" value={r.done} />
            <Big label="Follow-through" value={(r.rate ?? 0) * 100} fmt={pctFmt} />
            <Big label="Perfect days" value={r.perfect} />
            <Big label="Money in" value={r.moneyIn} fmt={(n) => birr(Math.round(n))} small />
            <Big label="Money out" value={r.moneyOut} fmt={(n) => birr(Math.round(n))} small />
            <Big label="Focused time" value={r.focus} fmt={(n) => (n ? minsLabel(Math.round(n)) : "—")} small />
          </div>

          <div>
            <div className={`${label} mb-2`}>Month by month</div>
            <div className="flex h-28 items-end gap-1">
              {r.byMonth.map((m, i) => (
                <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${MONTHS[i]}: ${m.done}/${m.due}`}>
                  <div className="relative w-full flex-1">
                    <motion.div className="absolute inset-x-0 bottom-0 rounded-t-md bg-surface-2" initial={{ height: 0 }} animate={{ height: `${(m.due / maxMonth) * 100}%` }} />
                    <motion.div
                      className="absolute inset-x-0 bottom-0 rounded-t-md bg-green"
                      initial={{ height: 0 }}
                      animate={{ height: `${(m.done / maxMonth) * 100}%` }}
                      transition={{ delay: 0.1 + i * 0.04, type: "spring", damping: 20 }}
                    />
                  </div>
                  <span className="text-[9px] font-semibold text-muted">{MONTHS[i].slice(0, 3)}</span>
                </div>
              ))}
            </div>
          </div>

          {r.areas.length > 0 && (
            <div>
              <div className={`${label} mb-2`}>Where your effort went</div>
              <div className="grid gap-1.5">
                {r.areas.slice(0, 6).map(([id, n]) => {
                  const a = areas.info(id);
                  return (
                    <div key={id} className="flex items-center gap-2 text-sm">
                      <span className="w-36 shrink-0 truncate">{a ? `${a.emoji} ${a.label}` : id}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <motion.div className="h-full rounded-full" style={{ background: a?.color ?? "var(--green)" }} initial={{ width: 0 }} animate={{ width: `${(n / r.areas[0][1]) * 100}%` }} />
                      </div>
                      <span className="w-8 text-right tabular-nums text-muted">{n}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(aims.length > 0 || r.goalsEnded.length > 0) && (
            <div>
              <div className={`${label} mb-2`}>Goals</div>
              <ul className="grid gap-1 text-sm">
                {aims.map((a) => (
                  <li key={a.id} className="flex items-center gap-2">{a.achieved ? "🏆" : "🎯"} {a.title}</li>
                ))}
                {r.goalsEnded.map((g) => (
                  <li key={g.id} className="flex items-center gap-2 text-muted">⏳ {g.name} ended {formatEt(g.start + g.days - 1)}</li>
                ))}
              </ul>
            </div>
          )}

          {r.wins.length > 0 && (
            <div>
              <div className={`${label} mb-2`}>Things that went well</div>
              <ul className="grid gap-1.5">
                {r.wins.map((n) => (
                  <li key={n.id} className="rounded-xl bg-green-soft/50 px-3 py-2 text-sm">
                    “{n.well}” <span className="text-xs text-muted">· {formatEt(n.day)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {r.bestDay != null && (
            <p className="text-sm text-muted">
              Your biggest day: <b className="text-ink">{formatEt(r.bestDay)}</b>, with {r.bestCount} tasks done.
              {r.screen > 0 && ` You logged ${minsLabel(r.screen)} on social apps.`}
            </p>
          )}
        </>
      )}
    </div>
  );
}

const t2 = (year: number, today: number) => (fromJdn(today).y > year ? "Year in review" : "So far this year");

function Big({ label: l, value, fmt, small }: { label: string; value: number; fmt?: (n: number) => string; small?: boolean }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-3">
      <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{l}</div>
      <div className={`font-display font-extrabold tabular-nums ${small ? "text-lg" : "text-3xl"}`}>
        <Counter value={value} format={fmt} />
      </div>
    </div>
  );
}
