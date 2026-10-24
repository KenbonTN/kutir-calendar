"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  CalendarDays, ChevronLeft, ChevronRight, Church, Flame, Leaf, Monitor, Moon, Plus, Star, Sun, Trash2, Trophy,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addisJdn, addisTime, formatEt, formatG, fromJdn, geez, MONTHS, MONTHS_AM, WEEKDAYS, WEEKDAYS_AM, weekday,
} from "@/lib/ethiopian";
import { startCloud } from "@/lib/cloud";
import { FIXTURES_UPDATED, MATCHES, type Match } from "@/lib/fixtures";
import { addGoal, goalStats, removeGoal, toggleDay, useGoals, type Goal } from "@/lib/goals";
import { orthodoxDay } from "@/lib/orthodox";
import { useStored } from "@/lib/storage";
import { countdown, useToday } from "@/lib/useToday";
import { AccountButton, CloudNotice } from "./Account";
import { DaySheet } from "./DaySheet";
import { CompBadge, MatchRow } from "./MatchRow";
import { MonthGrid, type Layers } from "./MonthGrid";
import { NewGoalForm } from "./NewGoalForm";
import { Sheet } from "./Sheet";

const DEFAULT_LAYERS: Layers = { saints: true, football: true };
const gutter = "px-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))]";

export default function App() {
  const { today, now } = useToday();
  useEffect(() => startCloud(), []);
  if (today == null || now == null) return <Skeleton />;
  return <Main today={today} now={now} />;
}

function Main({ today, now }: { today: number; now: number }) {
  const goals = useGoals(today);
  const [activeId, setActiveId] = useStored<string | null>("kutir-active", null);
  const [layers, setLayers] = useStored<Layers>("kutir-layers", DEFAULT_LAYERS);
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [newGoal, setNewGoal] = useState(false);
  const [justMarked, setJustMarked] = useState<number | null>(null);

  const goal = goals.find((g) => g.id === activeId) ?? goals[0] ?? null;
  const stats = goal ? goalStats(goal, today) : null;

  const toggle = useCallback(
    (j: number) => {
      if (!goal || j > today) return;
      if (!goal.done.includes(j)) setJustMarked(j);
      toggleDay(goal, j);
    },
    [goal, today],
  );

  return (
    <>
      <TopBar today={today} />
      <main className={`mx-auto grid max-w-6xl gap-6 pb-24 pt-5 sm:gap-8 ${gutter}`}>
        <div className="grid gap-4 lg:grid-cols-12">
          <TodayCard today={today} goal={goal} onToggle={toggle} />
          {goal && stats && <ProgressCard goal={goal} stats={stats} today={today} />}
          <NextUp now={now} today={today} onOpen={setOpenDay} />
        </div>

        <CloudNotice />

        <GoalBar goals={goals} active={goal} onSelect={setActiveId} onNew={() => setNewGoal(true)} />

        <Calendar
          today={today}
          goal={goal}
          layers={layers}
          setLayers={setLayers}
          justMarked={justMarked}
          onOpen={setOpenDay}
        />

        <Fixtures now={now} onOpen={setOpenDay} />

        <footer className="grid gap-1 border-t border-line pt-6 text-xs text-muted">
          <p>
            Fixtures: Premier League from openfootball, Champions League from TheSportsDB. Updated{" "}
            {new Date(FIXTURES_UPDATED).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}.
            Kickoff times can move when TV picks are announced.
          </p>
          <p>
            Saints&apos; days follow the common monthly commemorations of the Ethiopian Orthodox Tewahedo Church; some
            parishes keep local feasts too. Your crosses are saved in this browser, and in your account when you sign in with Google.
          </p>
        </footer>
      </main>

      <Sheet open={openDay != null} onClose={() => setOpenDay(null)} label="Day details">
        {openDay != null && <DaySheet j={openDay} today={today} now={now} goal={goal} onToggle={toggle} />}
      </Sheet>
      <Sheet open={newGoal} onClose={() => setNewGoal(false)} label="New goal">
        {newGoal && (
          <NewGoalForm
            today={today}
            onCreate={(g) => {
              const created = addGoal(g);
              setActiveId(created.id);
              setNewGoal(false);
            }}
          />
        )}
      </Sheet>
    </>
  );
}

/* ---------- Top bar ---------- */

function TopBar({ today }: { today: number }) {
  const e = fromJdn(today);
  return (
    <header className="glass sticky top-0 z-40 border-b border-line/70 pt-[env(safe-area-inset-top)]">
      <div className={`mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 ${gutter}`}>
        <div className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight">
          <span className="grid size-8 place-items-center rounded-xl bg-ink text-base text-bg">✕</span>
          Kutir
          <span lang="am" className="hidden text-sm font-semibold text-muted sm:inline">ቁጥር</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border border-line px-3 py-1 text-sm sm:inline">
            <span lang="am">{MONTHS_AM[e.m - 1]} {e.d}</span> · {e.y}
          </span>
          <ThemeToggle />
          <AccountButton />
        </div>
      </div>
    </header>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useStored<"system" | "light" | "dark">("kutir-theme-choice", "system");
  const next = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  return (
    <button
      type="button"
      aria-label={`Theme: ${theme}. Switch to ${next}`}
      title={`Theme: ${theme}`}
      onClick={() => {
        setTheme(next);
        try {
          if (next === "system") localStorage.removeItem("kutir-theme");
          else localStorage.setItem("kutir-theme", next);
        } catch {}
        if (next === "system") delete document.documentElement.dataset.theme;
        else document.documentElement.dataset.theme = next;
      }}
      className="grid size-9 place-items-center rounded-full border border-line text-muted transition hover:text-ink"
    >
      <Icon size={17} />
    </button>
  );
}

/* ---------- Hero cards ---------- */

function TodayCard({ today, goal, onToggle }: { today: number; goal: Goal | null; onToggle: (j: number) => void }) {
  const e = fromJdn(today);
  const od = orthodoxDay(today);
  const inPlan = !!goal && today >= goal.start && today < goal.start + goal.days;
  const done = inPlan && goal!.done.includes(today);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card relative overflow-hidden p-5 sm:p-7 lg:col-span-7"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-green/10 blur-3xl"
      />
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
        Today · <span lang="am">ዛሬ</span>
      </p>
      <div className="mt-2 flex items-end gap-4">
        <span className="font-display text-[5.5rem] font-extrabold leading-[0.8] tracking-tight tabular-nums sm:text-[7rem]">
          {e.d}
        </span>
        <div className="pb-1">
          <div className="font-display text-2xl font-bold leading-tight sm:text-3xl">{MONTHS[e.m - 1]}</div>
          <div lang="am" className="text-lg font-semibold text-green">
            {MONTHS_AM[e.m - 1]} {geez(e.d)} · {e.y}
          </div>
          <div className="text-sm text-muted">
            {WEEKDAYS[weekday(today)]} · <span lang="am">{WEEKDAYS_AM[weekday(today)]}</span> · {formatG(today)}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-2 text-sm">
        <div className="flex items-start gap-2">
          <Church size={16} className="mt-0.5 shrink-0 text-muted" />
          <span>
            {od.monthly.en} · <span lang="am" className="text-muted">{od.monthly.am}</span>
          </span>
        </div>
        {od.feasts.map((f) => (
          <div key={f.en} className="flex items-center gap-2 font-semibold text-gold">
            <Star size={16} fill="currentColor" /> {f.en} · <span lang="am">{f.am}</span>
          </div>
        ))}
        {od.fast && (
          <div className="flex items-center gap-2 text-muted">
            <Leaf size={16} className="text-green" /> {od.fast.en}
          </div>
        )}
      </div>

      {inPlan && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => onToggle(today)}
            aria-pressed={done}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-3 font-semibold transition ${
              done ? "bg-green-soft text-green" : "bg-marker text-white shadow-lg shadow-marker/25"
            }`}
          >
            {done ? "✓ Today is crossed off" : "✕ Cross off today"}
          </motion.button>
          {done && (
            <button type="button" onClick={() => onToggle(today)} className="text-sm text-muted underline-offset-4 hover:underline">
              Undo
            </button>
          )}
        </div>
      )}
    </motion.section>
  );
}

function ProgressCard({ goal, stats, today }: { goal: Goal; stats: ReturnType<typeof goalStats>; today: number }) {
  const pct = stats.count / goal.days;
  const R = 54, C = 2 * Math.PI * R;
  const endE = fromJdn(stats.end);
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="card flex flex-col gap-5 p-5 sm:p-7 lg:col-span-5"
    >
      <div className="flex items-center gap-5">
        <div className="relative size-32 shrink-0">
          <svg viewBox="0 0 128 128" className="size-full -rotate-90">
            <circle cx="64" cy="64" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="12" />
            <motion.circle
              cx="64" cy="64" r={R} fill="none" stroke="var(--marker)" strokeWidth="12" strokeLinecap="round"
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: C * (1 - pct) }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center">
            <div className="font-display text-3xl font-extrabold tabular-nums">{stats.count}</div>
            <div className="text-xs text-muted">of {goal.days} days</div>
          </div>
        </div>
        <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Stat label="Where you are" value={stats.dayNumber ? `Day ${stats.dayNumber}` : today < goal.start ? "Not started" : "Finished"} />
          <Stat label="Streak" value={<span className="inline-flex items-center gap-1"><Flame size={16} className="text-gold" />{stats.streak}</span>} />
          <Stat label="Days left" value={<span className="text-marker">{stats.left}</span>} />
          <Stat label="Hit rate" value={`${Math.round(stats.rate * 100)}%`} />
        </dl>
      </div>
      <div>
        <div className="mb-2 flex justify-between text-xs text-muted">
          <span>{formatEt(goal.start)}</span>
          <span>
            Deadline <b className="text-ink">{endE.d} {MONTHS[endE.m - 1]}</b>
          </span>
        </div>
        <div className="flex h-3 gap-[2px]" aria-hidden>
          {Array.from({ length: goal.days }, (_, i) => {
            const j = goal.start + i;
            const c = stats.done.has(j) ? "bg-marker" : j < today ? "bg-line" : "bg-surface-2";
            return <i key={j} className={`min-w-0 flex-1 rounded-[2px] ${c} ${j === today ? "outline-2 outline-offset-1 outline-gold" : ""}`} />;
          })}
        </div>
      </div>
    </motion.section>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{label}</dt>
      <dd className="font-display text-xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function NextUp({ now, today, onOpen }: { now: number; today: number; onOpen: (j: number) => void }) {
  const upcoming = MATCHES.filter((m) => Date.parse(m.kickoff) > now - 2 * 3600e3);
  const arsenal = upcoming.find((m) => m.arsenal);
  const ucl = upcoming.find((m) => m.comp === "UCL" && !m.arsenal);
  const items = [arsenal && { m: arsenal, title: "Next Arsenal match" }, ucl && { m: ucl, title: "Next big Champions League night" }].filter(
    Boolean,
  ) as { m: Match; title: string }[];
  if (!items.length) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:col-span-12">
      {items.map(({ m, title }, i) => (
        <NextMatchCard key={m.id} m={m} title={title} now={now} today={today} delay={0.1 + i * 0.05} onOpen={onOpen} />
      ))}
    </div>
  );
}

function NextMatchCard({
  m, title, now, today, delay, onOpen,
}: { m: Match; title: string; now: number; today: number; delay: number; onOpen: (j: number) => void }) {
  const j = addisJdn(m.kickoff);
  const accent = m.arsenal ? "from-arsenal/15" : "from-ucl/15";
  const when = j === today ? "Today" : j === today + 1 ? "Tomorrow" : `${WEEKDAYS[weekday(j)]}, ${formatEt(j)}`;
  return (
    <motion.button
      type="button"
      onClick={() => onOpen(j)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`card relative overflow-hidden bg-gradient-to-br ${accent} to-transparent p-5 text-left transition hover:-translate-y-0.5`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{title}</span>
        <CompBadge m={m} />
      </div>
      <div className="mt-3 font-display text-xl font-bold leading-tight sm:text-2xl">
        <span className={m.home === "Arsenal" ? "text-arsenal" : ""}>{m.home}</span>{" "}
        <span className="text-muted">vs</span>{" "}
        <span className={m.away === "Arsenal" ? "text-arsenal" : ""}>{m.away}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
        <div className="text-sm">
          <div className="font-semibold">{when}</div>
          <MatchTime m={m} />
        </div>
        <span className="rounded-full bg-gold-soft px-3 py-1.5 text-sm font-bold text-gold tabular-nums">
          {countdown(m.kickoff, now)}
        </span>
      </div>
    </motion.button>
  );
}

function MatchTime({ m }: { m: Match }) {
  const t = addisTime(m.kickoff);
  return (
    <div className="text-muted">
      <span className="font-mono text-ink">{t.intl}</span> Addis · <span lang="am">{t.ethiopian}</span>
    </div>
  );
}

/* ---------- Goals ---------- */

function GoalBar({
  goals, active, onSelect, onNew,
}: { goals: Goal[]; active: Goal | null; onSelect: (id: string) => void; onNew: () => void }) {
  const [armed, setArmed] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="no-scrollbar -mx-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 py-1">
        {goals.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => {
              onSelect(g.id);
              setArmed(false);
            }}
            aria-pressed={g.id === active?.id}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              g.id === active?.id ? "bg-ink text-bg" : "border border-line bg-surface hover:border-muted"
            }`}
          >
            {g.name}
          </button>
        ))}
        <button
          type="button"
          onClick={onNew}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed border-green px-4 py-2 text-sm font-semibold text-green"
        >
          <Plus size={16} /> New goal
        </button>
      </div>
      {active && !active.draft && (
        <button
          type="button"
          onClick={() => {
            if (armed) {
              removeGoal(active.id);
              setArmed(false);
            } else {
              setArmed(true);
              setTimeout(() => setArmed(false), 3000);
            }
          }}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition ${
            armed ? "bg-marker text-white" : "text-muted hover:text-marker"
          }`}
        >
          <Trash2 size={15} /> {armed ? "Tap again to delete" : "Delete goal"}
        </button>
      )}
    </div>
  );
}

/* ---------- Calendar ---------- */

function Calendar({
  today, goal, layers, setLayers, justMarked, onOpen,
}: {
  today: number;
  goal: Goal | null;
  layers: Layers;
  setLayers: (l: Layers) => void;
  justMarked: number | null;
  onOpen: (j: number) => void;
}) {
  const [view, setView] = useStored<"plan" | "browse">("kutir-view", "plan");
  const t = fromJdn(today);
  const [cursor, setCursor] = useState({ y: t.y, m: t.m });

  const plan = useMemo(
    () => (goal ? { start: goal.start, end: goal.start + goal.days - 1, done: new Set(goal.done) } : null),
    [goal],
  );

  const months = useMemo(() => {
    if (view === "browse" || !plan) return [cursor];
    const s = fromJdn(plan.start), e = fromJdn(plan.end);
    const out: { y: number; m: number }[] = [];
    for (let y = s.y, m = s.m; y < e.y || (y === e.y && m <= e.m); m === 13 ? ((m = 1), y++) : m++) out.push({ y, m });
    return out;
  }, [view, plan, cursor]);

  const step = (d: number) =>
    setCursor(({ y, m }) => {
      m += d;
      if (m > 13) return { y: y + 1, m: 1 };
      if (m < 1) return { y: y - 1, m: 13 };
      return { y, m };
    });

  const toggleChip = (key: keyof Layers, label: string, Icon: typeof Church) => (
    <button
      type="button"
      aria-pressed={layers[key]}
      onClick={() => setLayers({ ...layers, [key]: !layers[key] })}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
        layers[key] ? "border-green bg-green-soft text-green" : "border-line text-muted"
      }`}
    >
      <Icon size={15} /> {label}
    </button>
  );

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold">
          <CalendarDays size={22} className="text-green" /> Calendar
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-line bg-surface p-1 text-sm font-semibold">
            {(["plan", "browse"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={`rounded-full px-3 py-1 transition ${view === v ? "bg-ink text-bg" : "text-muted"}`}
              >
                {v === "plan" ? "My plan" : "Any month"}
              </button>
            ))}
          </div>
          {toggleChip("saints", "Saints' days", Church)}
          {toggleChip("football", "Football", Trophy)}
        </div>
      </div>

      {view === "browse" && (
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => step(-1)} aria-label="Previous month" className="grid size-10 place-items-center rounded-full border border-line bg-surface">
            <ChevronLeft size={18} />
          </button>
          <button type="button" onClick={() => setCursor({ y: t.y, m: t.m })} className="text-sm font-semibold text-muted hover:text-ink">
            Back to this month
          </button>
          <button type="button" onClick={() => step(1)} aria-label="Next month" className="grid size-10 place-items-center rounded-full border border-line bg-surface">
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      <p className="text-sm text-muted">Tap any day to see its saint, feasts, fasting and matches, and to cross it off.</p>

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={months.map((x) => `${x.y}-${x.m}`).join(",")}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="grid gap-4"
        >
          {months.map(({ y, m }) => (
            <MonthGrid key={`${y}-${m}`} y={y} m={m} today={today} plan={plan} layers={layers} justMarked={justMarked} onOpen={onOpen} />
          ))}
        </motion.div>
      </AnimatePresence>

      <Legend layers={layers} />
    </section>
  );
}

function Legend({ layers }: { layers: Layers }) {
  const item = "inline-flex items-center gap-1.5";
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
      <span className={item}><span className="text-base font-bold text-marker">✕</span> Crossed off</span>
      <span className={item}><span className="size-3.5 rounded border-2 border-gold" /> Today</span>
      <span className={item}><span className="missed size-3.5 rounded border border-line" /> Missed</span>
      <span className={item}><span className="size-3.5 rounded bg-surface-2" /> Outside your plan</span>
      {layers.saints && <span className={item}><Star size={12} className="text-gold" fill="currentColor" /> Feast day</span>}
      {layers.football && (
        <>
          <span className={item}><span className="size-2 rounded-full bg-arsenal" /> Arsenal</span>
          <span className={item}><span className="size-2 rounded-full bg-ucl" /> Big Champions League game</span>
        </>
      )}
    </div>
  );
}

/* ---------- Fixtures ---------- */

function Fixtures({ now, onOpen }: { now: number; onOpen: (j: number) => void }) {
  const [filter, setFilter] = useState<"all" | "arsenal" | "ucl">("all");
  const [more, setMore] = useState(false);
  const upcoming = MATCHES.filter((m) => Date.parse(m.kickoff) > now - 2 * 3600e3).filter((m) =>
    filter === "arsenal" ? m.arsenal : filter === "ucl" ? m.comp === "UCL" : true,
  );
  const shown = more ? upcoming : upcoming.slice(0, 6);

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold">
          <Trophy size={22} className="text-gold" /> Match days
        </h2>
        <div className="flex rounded-full border border-line bg-surface p-1 text-sm font-semibold">
          {([["all", "All"], ["arsenal", "Arsenal"], ["ucl", "Champions League"]] as const).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={filter === k}
              onClick={() => setFilter(k)}
              className={`rounded-full px-3 py-1 transition ${filter === k ? "bg-ink text-bg" : "text-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="card divide-y divide-line px-4 sm:px-6">
        {shown.length === 0 && (
          <p className="py-6 text-sm text-muted">
            No upcoming matches in this list yet. Fixtures refresh every day.
          </p>
        )}
        {shown.map((m) => (
          <button key={m.id} type="button" onClick={() => onOpen(addisJdn(m.kickoff))} className="block w-full text-left">
            <MatchRow m={m} now={now} />
          </button>
        ))}
      </div>
      {upcoming.length > 6 && (
        <button type="button" onClick={() => setMore(!more)} className="justify-self-center text-sm font-semibold text-green">
          {more ? "Show fewer" : `Show all ${upcoming.length} matches`}
        </button>
      )}
    </section>
  );
}

/* ---------- Loading ---------- */

function Skeleton() {
  return (
    <div className={`mx-auto grid max-w-6xl gap-4 pt-20 ${gutter}`} aria-busy="true" aria-label="Loading your calendar">
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="card h-72 animate-pulse lg:col-span-7" />
        <div className="card h-72 animate-pulse lg:col-span-5" />
      </div>
      <div className="card h-96 animate-pulse" />
    </div>
  );
}
