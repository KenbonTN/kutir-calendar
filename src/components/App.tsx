"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  CalendarDays, ChevronDown, Church, Clock, Flame, Inbox, Leaf, ListChecks, Monitor, Moon, Plus,
  Settings as SettingsIcon, Sparkles, Star, Sun, Target, Trash2, Trophy, Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  addisJdn, addisTime, formatEt, formatG, fromJdn, geez, MONTHS, MONTHS_AM, WEEKDAYS, WEEKDAYS_AM, weekday,
} from "@/lib/ethiopian";
import { startCloud, useCloud } from "@/lib/cloud";
import { useEvents } from "@/lib/events";
import { EXPENSES_KEY, useExpenses } from "@/lib/expenses";
import { FIXTURES_UPDATED, MATCHES, type Match } from "@/lib/fixtures";
import { addGoal, goalStats, keepLegacyGoal, removeGoal, useGoals, type Goal } from "@/lib/goals";
import { monthsCovering, type Cal } from "@/lib/months";
import { orthodoxDay } from "@/lib/orthodox";
import { minsLabel } from "@/lib/pool";
import { registerServiceWorker } from "@/lib/push";
import { weekOf } from "@/lib/review";
import { SCREEN_KEY, useScreen } from "@/lib/screen";
import { useStored } from "@/lib/storage";
import {
  dayScore, ensureRoutineTasks, rollOver, ROUTINES_KEY, tasksOn, TASKS_KEY, useTasks, type Routine, type Task,
} from "@/lib/tasks";
import { countdown, useToday } from "@/lib/useToday";
import { AccountButton, CloudNotice } from "./Account";
import { CalendarTab } from "./CalendarTab";
import { DaySheet } from "./DaySheet";
import { MatchRow } from "./MatchRow";
import { MonthGrid, type DayInfo, type Layers } from "./MonthGrid";
import { Money } from "./Money";
import { PoolTab, PullFromPool, usePool, WeekReview } from "./PoolTab";
import { DateReminders, StuckTasks } from "./TodayExtras";
import { CalSwitch, DateBoth, NewGoalForm } from "./NewGoalForm";
import { QuoteCard } from "./QuoteCard";
import { ScreenDashboard } from "./ScreenTime";
import { Settings } from "./Settings";
import { Sheet } from "./Sheet";
import { EndOfDayCard } from "./Summary";
import { TaskList } from "./TaskList";

// v2 key: football markers are now off unless switched on.
const DEFAULT_LAYERS: Layers = { saints: true, football: false };
const gutter = "px-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))]";

export default function App() {
  const { today, now } = useToday();
  useEffect(() => {
    startCloud();
    registerServiceWorker();
  }, []);
  if (today == null || now == null) return <Skeleton />;
  return <Main today={today} now={now} />;
}

function Main({ today, now }: { today: number; now: number }) {
  const goals = useGoals();
  const cloud = useCloud();
  const { tasks, routines } = useTasks();
  const logs = useScreen();
  const [activeId, setActiveId] = useStored<string | null>("kutir-active", null);
  const [layers, setLayers] = useStored<Layers>("kutir-layers-v2", DEFAULT_LAYERS);
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [newGoal, setNewGoal] = useState<{ name?: string; days?: number } | null>(null);
  const [settings, setSettings] = useState(false);
  const [tab, setTab] = useStored<Tab>("kutir-tab", "today");
  const expenses = useExpenses();
  const events = useEvents();
  const pool = usePool();
  // Sunday: review this week. Monday: last week's review, until dismissed.
  const [reviewSeen, setReviewSeen] = useStored<number>("kutir-review-seen", 0);
  const wd = weekday(today);
  const reviewWeek = wd === 6 ? weekOf(today)[0] : wd === 0 ? weekOf(today - 7)[0] : null;

  // Devices that used Kutir before countdowns had to be created keep the old "My 3 months".
  useEffect(() => keepLegacyGoal([TASKS_KEY, ROUTINES_KEY, SCREEN_KEY, EXPENSES_KEY]), []);

  // A new day: create today's repeating tasks and move unfinished ones forward.
  // Runs again whenever tasks change (e.g. a synced copy arrives); both steps do nothing when there's nothing to do.
  useEffect(() => {
    ensureRoutineTasks(today);
    rollOver(today);
  }, [today, tasks, routines]);

  const goal = goals.find((g) => g.id === activeId) ?? goals[0] ?? null;
  const todays = tasksOn(today, tasks, routines, today);
  const streak = useMemo(() => (goal ? goalStats(goal, today, tasks, routines).streak : 0), [goal, today, tasks, routines]);

  const today_ = (
    <>
      <div className="grid gap-4 lg:grid-cols-12">
        <TodayCard today={today} now={now} tasks={todays} allTasks={tasks} />
        {goal ? (
          <CountdownCard goal={goal} today={today} tasks={tasks} routines={routines} poolGoals={pool.map((p) => p.goal)} />
        ) : cloud.status === "starting" || cloud.status === "syncing" ? (
          <div className="card h-72 animate-pulse lg:col-span-5" aria-label="Loading your countdowns" />
        ) : (
          <WelcomeCard today={today} onStart={setNewGoal} />
        )}
      </div>

      <DateReminders today={today} events={events} onOpen={setOpenDay} />

      <StuckTasks today={today} tasks={tasks} />

      {reviewWeek != null && reviewSeen !== reviewWeek && (
        <WeekReview
          today={today}
          tasks={tasks}
          routines={routines}
          last={wd === 0}
          onPlan={() => {
            setTab("pool");
            window.scrollTo({ top: 0 });
          }}
          onDismiss={() => setReviewSeen(reviewWeek)}
        />
      )}

      <QuoteCard today={today} tasks={tasks} logs={logs} expenses={expenses} streak={streak} />

      <EndOfDayCard today={today} now={now} tasks={tasks} routines={routines} logs={logs} />

      <CloudNotice />

      <ScreenDashboard today={today} logs={logs} tasks={tasks} onLogToday={() => setOpenDay(today)} />

      {goal && (
        <>
          <GoalBar goals={goals} active={goal} onSelect={setActiveId} onNew={() => setNewGoal({})} />
          <Calendar
            today={today}
            goal={goal}
            tasks={tasks}
            routines={routines}
            layers={layers}
            setLayers={setLayers}
            onOpen={setOpenDay}
          />
        </>
      )}

      <Football now={now} today={today} onOpen={setOpenDay} />
    </>
  );

  return (
    <>
      <TopBar today={today} tab={tab} setTab={setTab} onSettings={() => setSettings(true)} />
      <main className={`mx-auto grid max-w-6xl gap-6 pb-32 pt-5 sm:gap-8 sm:pb-24 ${gutter}`}>
        {tab === "today" && today_}
        {tab === "pool" && <PoolTab today={today} tasks={tasks} routines={routines} />}
        {tab === "calendar" && <CalendarTab today={today} tasks={tasks} routines={routines} onOpen={setOpenDay} />}
        {tab === "money" && <Money today={today} />}

        <footer className="grid gap-1 border-t border-line pt-6 text-xs text-muted">
          <p>
            Every day of your countdown is crossed off automatically once it ends. Unfinished tasks move to the next day.
            Everything is saved in this browser, and in your account when you sign in with Google.
          </p>
          <p>
            Saints&apos; days follow the common monthly commemorations of the Ethiopian Orthodox Tewahedo Church; some
            parishes keep local feasts too. Fixtures: Premier League from openfootball, Champions League from
            TheSportsDB, updated{" "}
            {new Date(FIXTURES_UPDATED).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}.
          </p>
        </footer>
      </main>
      <BottomTabs tab={tab} setTab={setTab} />

      <Sheet open={openDay != null} onClose={() => setOpenDay(null)} label="Day details">
        {openDay != null && (
          <DaySheet j={openDay} today={today} now={now} goal={goal} tasks={tasks} routines={routines} log={logs.get(openDay)} />
        )}
      </Sheet>
      <Sheet open={newGoal != null} onClose={() => setNewGoal(null)} label="New countdown">
        {newGoal && (
          <NewGoalForm
            today={today}
            initial={newGoal}
            onCreate={(g) => {
              const created = addGoal(g);
              setActiveId(created.id);
              setNewGoal(null);
            }}
          />
        )}
      </Sheet>
      <Sheet open={settings} onClose={() => setSettings(false)} label="Settings">
        {settings && <Settings today={today} routines={routines} />}
      </Sheet>
    </>
  );
}

/* ---------- Top bar ---------- */

type Tab = "today" | "pool" | "calendar" | "money";
const TABS: [Tab, string, typeof ListChecks][] = [
  ["today", "Today", ListChecks],
  ["pool", "Pool", Inbox],
  ["calendar", "Calendar", CalendarDays],
  ["money", "Money", Wallet],
];

function TopTabs({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <nav aria-label="Sections" className="hidden rounded-full border border-line bg-surface p-1 text-sm font-semibold sm:flex">
      {TABS.map(([k, label, Icon]) => (
        <button
          key={k}
          type="button"
          aria-current={tab === k ? "page" : undefined}
          onClick={() => {
            setTab(k);
            window.scrollTo({ top: 0 });
          }}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition ${tab === k ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}
        >
          <Icon size={15} /> {label}
        </button>
      ))}
    </nav>
  );
}

/** Phone navigation, pinned to the bottom like a native app. */
function BottomTabs({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <nav
      aria-label="Sections"
      className="glass fixed inset-x-0 bottom-0 z-40 border-t border-line/70 pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <div className="grid grid-cols-4">
        {TABS.map(([k, label, Icon]) => (
          <button
            key={k}
            type="button"
            aria-current={tab === k ? "page" : undefined}
            onClick={() => {
              setTab(k);
              window.scrollTo({ top: 0 });
            }}
            className={`flex flex-col items-center gap-0.5 pb-2 pt-2.5 text-[11px] font-semibold transition ${tab === k ? "text-green" : "text-muted"}`}
          >
            <Icon size={22} strokeWidth={tab === k ? 2.4 : 1.8} />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function TopBar({
  today, tab, setTab, onSettings,
}: { today: number; tab: Tab; setTab: (t: Tab) => void; onSettings: () => void }) {
  const e = fromJdn(today);
  return (
    <header className="glass sticky top-0 z-40 border-b border-line/70 pt-[env(safe-area-inset-top)]">
      <div className={`mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 ${gutter}`}>
        <div className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight">
          <span className="grid size-8 place-items-center rounded-xl bg-ink text-base text-bg">✕</span>
          Kutir
          <span lang="am" className="hidden text-sm font-semibold text-muted lg:inline">ቁጥር</span>
        </div>
        <TopTabs tab={tab} setTab={setTab} />
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border border-line px-3 py-1 text-sm lg:inline">
            <span lang="am">{MONTHS_AM[e.m - 1]} {e.d}</span> · {e.y}
          </span>
          <ThemeToggle />
          <button
            type="button"
            onClick={onSettings}
            aria-label="Settings: reminders, install, repeating tasks"
            className="grid size-9 place-items-center rounded-full border border-line text-muted transition hover:text-ink"
          >
            <SettingsIcon size={17} />
          </button>
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

/* ---------- Hero ---------- */

function TodayCard({ today, now, tasks, allTasks }: { today: number; now: number; tasks: Task[]; allTasks: Task[] }) {
  const e = fromJdn(today);
  const od = orthodoxDay(today);
  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? done / tasks.length : 0;
  const cleared = tasks.length > 0 && done === tasks.length;
  const [pulling, setPulling] = useState(false);
  const [hidden, setHidden] = useStored<number>("kutir-cleared-hidden", 0);
  const planned = tasks.filter((t) => !t.done).reduce((a, t) => a + (t.mins ?? 0), 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card relative overflow-hidden p-5 sm:p-7 lg:col-span-7"
    >
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-green/10 blur-3xl" />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-end gap-4">
          <span className="font-display text-7xl font-extrabold leading-[0.8] tracking-tight tabular-nums sm:text-8xl">{e.d}</span>
          <div className="pb-0.5">
            <div className="font-display text-2xl font-bold leading-tight">{MONTHS[e.m - 1]}</div>
            <div lang="am" className="font-semibold text-green">
              {MONTHS_AM[e.m - 1]} {geez(e.d)} · {e.y}
            </div>
            <div className="text-sm text-muted">
              {WEEKDAYS[weekday(today)]} · <span lang="am">{WEEKDAYS_AM[weekday(today)]}</span> · {formatG(today)}
            </div>
          </div>
        </div>
        {tasks.length > 0 && (
          <div className="text-right">
            <div className="font-display text-3xl font-extrabold tabular-nums">
              {done}
              <span className="text-lg text-muted">/{tasks.length}</span>
            </div>
            <div className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">done today</div>
          </div>
        )}
      </div>

      <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <motion.div className="h-full rounded-full bg-green" animate={{ width: `${pct * 100}%` }} transition={{ type: "spring", damping: 25 }} />
      </div>

      <div className="relative mt-4">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
            <ListChecks size={15} /> Today&apos;s tasks
            {planned > 0 && (
              <span className="inline-flex items-center gap-1 font-semibold normal-case tracking-normal">
                · <Clock size={12} /> {minsLabel(planned)} left
              </span>
            )}
          </h2>
          {!cleared && (
            <button
              type="button"
              onClick={() => setPulling(!pulling)}
              aria-expanded={pulling}
              className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-muted hover:text-ink"
            >
              <Inbox size={13} /> From the pool
            </button>
          )}
        </div>
        <TaskList day={today} today={today} tasks={tasks} compact />
        {((cleared && hidden !== today) || (!cleared && pulling)) && (
          <div className="mt-3">
            <PullFromPool
              today={today}
              now={now}
              tasks={allTasks}
              cleared={cleared}
              onClose={() => (cleared ? setHidden(today) : setPulling(false))}
            />
          </div>
        )}
      </div>

      <div className="relative mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-sm text-muted">
        <span className="flex items-center gap-1.5">
          <Church size={14} /> {od.monthly.en} · <span lang="am">{od.monthly.am}</span>
        </span>
        {od.feasts.map((f) => (
          <span key={f.en} className="flex items-center gap-1.5 font-semibold text-gold">
            <Star size={14} fill="currentColor" /> {f.en}
          </span>
        ))}
        {od.fast && (
          <span className="flex items-center gap-1.5">
            <Leaf size={14} className="text-green" /> {od.fast.en}
          </span>
        )}
      </div>
    </motion.section>
  );
}

function CountdownCard({
  goal, today, tasks, routines, poolGoals,
}: { goal: Goal; today: number; tasks: Task[]; routines: Routine[]; poolGoals: (string | undefined)[] }) {
  const s = useMemo(() => goalStats(goal, today, tasks, routines), [goal, today, tasks, routines]);
  const linked = tasks.filter((t) => t.goal === goal.id);
  const linkedDone = linked.filter((t) => t.done).length;
  const linkedAll = linked.length + poolGoals.filter((g) => g === goal.id).length;
  const R = 54, C = 2 * Math.PI * R;
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="card flex flex-col gap-5 p-5 sm:p-7 lg:col-span-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="truncate font-display text-lg font-bold">{goal.name}</h2>
        <span className="shrink-0 text-xs text-muted">
          {s.dayNumber ? `Day ${s.dayNumber} of ${goal.days}` : today < goal.start ? "Starts soon" : "Finished"}
        </span>
      </div>
      <div className="flex items-center gap-5">
        <div className="relative size-32 shrink-0">
          <svg viewBox="0 0 128 128" className="size-full -rotate-90">
            <circle cx="64" cy="64" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="12" />
            <motion.circle
              cx="64" cy="64" r={R} fill="none" stroke="var(--marker)" strokeWidth="12" strokeLinecap="round"
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: C * (1 - s.passed / goal.days) }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center">
            <div className="font-display text-4xl font-extrabold tabular-nums text-marker">{s.left}</div>
            <div className="text-xs text-muted">days left</div>
          </div>
        </div>
        <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Stat label="Crossed off" value={`${s.passed}`} />
          <Stat label="Tasks done" value={s.tasksDue ? `${Math.round((s.rate ?? 0) * 100)}%` : "—"} />
          <Stat label="Perfect days" value={`${s.perfect}`} />
          <Stat label="Streak" value={<span className="inline-flex items-center gap-1"><Flame size={16} className="text-gold" />{s.streak}</span>} />
        </dl>
      </div>
      {linkedAll > 0 && (
        <div className="grid gap-1.5">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">Tasks for this countdown</span>
            <span className="tabular-nums text-muted">{linkedDone} of {linkedAll} done</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <motion.div className="h-full rounded-full bg-green" animate={{ width: `${(linkedDone / linkedAll) * 100}%` }} />
          </div>
        </div>
      )}
      <div>
        <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
          <DateBoth j={goal.start} title="Started" />
          <DateBoth j={s.end} title="Deadline" align="right" />
        </div>
        <div className="flex h-3 gap-[2px]" aria-hidden>
          {Array.from({ length: goal.days }, (_, i) => {
            const j = goal.start + i;
            const c = j < today ? "bg-marker" : j === today ? "bg-gold" : "bg-surface-2";
            return <i key={j} className={`min-w-0 flex-1 rounded-[2px] ${c}`} />;
          })}
        </div>
      </div>
    </motion.section>
  );
}

/** Shown instead of the countdown until the person creates their first one. */
function WelcomeCard({ today, onStart }: { today: number; onStart: (preset: { name?: string; days?: number }) => void }) {
  const ideas: [string, number][] = [["30 days of gym", 30], ["Exam in 60 days", 60], ["90-day reset", 90]];
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="card relative flex flex-col justify-between gap-5 overflow-hidden p-5 sm:p-7 lg:col-span-5"
    >
      <div aria-hidden className="pointer-events-none absolute -bottom-10 -right-6 hidden grid-cols-5 gap-1.5 opacity-60 sm:grid">
        {Array.from({ length: 15 }, (_, i) => (
          <span key={i} className="relative grid size-7 place-items-center rounded-md border border-line bg-surface-2">
            {i < 9 && <span className="text-sm font-black text-marker">✕</span>}
          </span>
        ))}
      </div>
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-soft px-2.5 py-1 text-xs font-bold text-green">
          <Sparkles size={13} /> Start here
        </span>
        <h2 className="mt-3 font-display text-2xl font-extrabold leading-tight text-balance sm:text-3xl">
          What are you counting down to?
        </h2>
        <p className="mt-2 max-w-sm text-[15px] text-muted">
          Pick a goal and a deadline. Every day that passes gets a big red ✕, so you always see how many days are left.
        </p>
      </div>
      <div className="relative grid gap-3">
        <button
          type="button"
          onClick={() => onStart({})}
          className="inline-flex w-fit items-center gap-2 rounded-full bg-marker px-5 py-3 font-semibold text-white shadow-lg shadow-marker/25 transition active:scale-95"
        >
          <Plus size={18} /> Start your countdown
        </button>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>Or try:</span>
          {ideas.map(([idea, days]) => (
            <button
              key={idea}
              type="button"
              onClick={() => onStart({ name: idea, days })}
              className="rounded-full border border-line bg-surface px-2.5 py-1 transition hover:border-green hover:text-ink"
            >
              {idea} · ends {formatEt(today + days - 1)}
            </button>
          ))}
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
          <Plus size={16} /> New countdown
        </button>
      </div>
      {active && (
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
          <Trash2 size={15} /> {armed ? "Tap again to delete" : "Delete countdown"}
        </button>
      )}
    </div>
  );
}

/* ---------- Calendar ---------- */

function Calendar({
  today, goal, tasks, routines, layers, setLayers, onOpen,
}: {
  today: number;
  goal: Goal | null;
  tasks: Task[];
  routines: Routine[];
  layers: Layers;
  setLayers: (l: Layers) => void;
  onOpen: (j: number) => void;
}) {
  const [cal, setCal] = useStored<Cal>("kutir-countdown-cal", "ethiopian");
  const plan = useMemo(() => (goal ? { start: goal.start, end: goal.start + goal.days - 1 } : null), [goal]);
  const months = useMemo(() => (plan ? monthsCovering(cal, plan.start, plan.end) : []), [cal, plan]);
  const todayInPlan = !!plan && today >= plan.start && today <= plan.end;

  const info: DayInfo = useMemo(() => {
    const map: DayInfo = new Map();
    for (const { first, length } of months) {
      for (let j = first; j < first + length; j++) {
        if (j < today) map.set(j, dayScore(j, tasks, routines));
        else {
          const list = tasksOn(j, tasks, routines, today);
          map.set(j, { done: list.filter((x) => x.done).length, due: list.length });
        }
      }
    }
    return map;
  }, [months, tasks, routines, today]);

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
          <CalendarDays size={22} className="text-green" /> Countdown calendar
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <CalSwitch cal={cal} setCal={setCal} id="countdown-cal" />
          {todayInPlan && (
            <button
              type="button"
              onClick={() => document.getElementById("countdown-today")?.scrollIntoView({ behavior: "smooth", block: "center" })}
              className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1.5 text-sm font-semibold text-gold"
            >
              <Target size={15} /> Today
            </button>
          )}
          {toggleChip("saints", "Saints' days", Church)}
          {toggleChip("football", "Football", Trophy)}
        </div>
      </div>

      <p className="text-sm text-muted">
        {cal === "ethiopian" ? "Big number: Ethiopian date, small: Gregorian." : "Big number: Gregorian date, small: Ethiopian."} Tap
        any day to plan its tasks or see how it went. To browse other months, use the Calendar tab.
      </p>

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={cal}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="grid gap-4"
        >
          {months.map((month) => (
            <MonthGrid key={month.key} month={month} cal={cal} today={today} plan={plan} layers={layers} info={info} onOpen={onOpen} />
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
      <span className={item}><span className="text-base font-bold text-marker">✕</span> Day passed</span>
      <span className={item}><span className="rounded-full bg-gold px-1.5 text-[9px] font-extrabold uppercase text-bg">Today</span> Today</span>
      <span className={item}><span className="rounded bg-green-soft px-1 font-mono font-bold text-green">5/5</span> All tasks done</span>
      <span className={item}><span className="rounded bg-gold-soft px-1 font-mono font-bold text-gold">3/5</span> Some done</span>
      <span className={item}><span className="size-3.5 rounded bg-surface-2" /> Outside your countdown</span>
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

/* ---------- Football (tucked away) ---------- */

function Football({ now, today, onOpen }: { now: number; today: number; onOpen: (j: number) => void }) {
  const [open, setOpen] = useStored<boolean>("kutir-football-open", false);
  const [filter, setFilter] = useState<"all" | "arsenal" | "ucl">("all");
  const [more, setMore] = useState(false);
  const upcoming = MATCHES.filter((m) => Date.parse(m.kickoff) > now - 2 * 3600e3);
  const next = upcoming.find((m) => m.arsenal);
  const list = upcoming.filter((m) => (filter === "arsenal" ? m.arsenal : filter === "ucl" ? m.comp === "UCL" : true));
  const shown = more ? list : list.slice(0, 6);

  return (
    <section className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left sm:px-6"
      >
        <span className="flex min-w-0 items-center gap-3">
          <Trophy size={18} className="shrink-0 text-muted" />
          <span className="min-w-0">
            <span className="font-semibold">Football</span>
            {next && (
              <span className="block truncate text-sm text-muted">
                Next: {next.home} vs {next.away} · {nextWhen(next, today)} · {countdown(next.kickoff, now)}
              </span>
            )}
          </span>
        </span>
        <ChevronDown size={18} className={`shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="grid gap-3 border-t border-line px-5 pb-5 pt-4 sm:px-6">
              <div className="flex w-fit rounded-full border border-line bg-surface-2 p-1 text-sm font-semibold">
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
              <div className="divide-y divide-line">
                {shown.length === 0 && <p className="py-4 text-sm text-muted">No upcoming matches in this list yet.</p>}
                {shown.map((m) => (
                  <button key={m.id} type="button" onClick={() => onOpen(addisJdn(m.kickoff))} className="block w-full text-left">
                    <MatchRow m={m} now={now} />
                  </button>
                ))}
              </div>
              {list.length > 6 && (
                <button type="button" onClick={() => setMore(!more)} className="justify-self-center text-sm font-semibold text-green">
                  {more ? "Show fewer" : `Show all ${list.length} matches`}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function nextWhen(m: Match, today: number) {
  const j = addisJdn(m.kickoff);
  const day = j === today ? "today" : j === today + 1 ? "tomorrow" : `${WEEKDAYS[weekday(j)].slice(0, 3)} ${fromJdn(j).d} ${MONTHS[fromJdn(j).m - 1]}`;
  return `${day}, ${addisTime(m.kickoff).intl}`;
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
