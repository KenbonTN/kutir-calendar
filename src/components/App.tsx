"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  CalendarDays, ChevronDown, Church, Compass, Clock, Flame, Inbox, Leaf, ListChecks, Monitor, Moon, Mountain, PartyPopper, Plus,
  Settings as SettingsIcon, Sparkles, Star, Sun, Trash2, Wallet, X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { formatEt, formatG, fromJdn, geez, MONTHS, MONTHS_AM, WEEKDAYS, WEEKDAYS_AM, weekday } from "@/lib/ethiopian";
import { startCloud, useCloud } from "@/lib/cloud";
import { useT } from "@/lib/i18n";
import { habitDays, isNewYearWeek } from "@/lib/insights";
import { useFasts } from "@/lib/people";
import { useEvents } from "@/lib/events";
import { EXPENSES_KEY, useExpenses } from "@/lib/expenses";
import { FIXTURES_UPDATED } from "@/lib/fixtures";
import { addGoal, goalStats, keepLegacyGoal, removeGoal, useGoals, type Goal } from "@/lib/goals";
import { orthodoxDay } from "@/lib/orthodox";
import { minsLabel } from "@/lib/pool";
import { registerServiceWorker, useUpdateReady } from "@/lib/push";
import { weekOf } from "@/lib/review";
import { SCREEN_KEY, useScreen } from "@/lib/screen";
import { useStored } from "@/lib/storage";
import { ensureRoutineTasks, rollOver, ROUTINES_KEY, tasksOn, TASKS_KEY, useTasks, type Routine, type Task } from "@/lib/tasks";
import { useToday } from "@/lib/useToday";
import { AccountButton, CloudNotice } from "./Account";
import { CoachCard, useCoach, usePlanView, type PlanView } from "./Coach";
import { DateBoth } from "./DateBoth";
import type { Layers } from "./MonthGrid";
import { PullFromPool, usePool } from "./PullFromPool";
import { DateReminders, FastToggle, LifeNudges, StuckTasks } from "./TodayExtras";
import { QuoteCard } from "./QuoteCard";
import { Sheet } from "./Sheet";
import { EndOfDayCard } from "./Summary";
import { FocusBar } from "./Focus";
import { Aurora, Burst, Counter, partOfDay, Reveal } from "./Motion";
import { TaskList } from "./TaskList";

// Everything off the first screen loads when it's first needed, so opening Kutir is quick.
const tabLoading = () => <div className="card shimmer h-96" aria-label="Loading" />;
const PlanTab = dynamic(() => import("./PlanTab").then((m) => m.PlanTab), { loading: tabLoading });
const CalendarTab = dynamic(() => import("./CalendarTab").then((m) => m.CalendarTab), { loading: tabLoading });
const Money = dynamic(() => import("./Money").then((m) => m.Money), { loading: tabLoading });
const LifeTab = dynamic(() => import("./LifeTab").then((m) => m.LifeTab), { loading: tabLoading });
const YearReview = dynamic(() => import("./LifeTab").then((m) => m.YearReview));
const DaySheet = dynamic(() => import("./DaySheet").then((m) => m.DaySheet));
const NewGoalForm = dynamic(() => import("./NewGoalForm").then((m) => m.NewGoalForm));
const Settings = dynamic(() => import("./Settings").then((m) => m.Settings));
const ScreenDashboard = dynamic(() => import("./ScreenTime").then((m) => m.ScreenDashboard));
const CountdownCalendar = dynamic(() => import("./CountdownCalendar"));
const Football = dynamic(() => import("./Football"));

// v2 key: football markers are now off unless switched on.
const DEFAULT_LAYERS: Layers = { saints: true, football: false };
const gutter = "px-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))]";

export default function App() {
  const { today, now } = useToday();
  useEffect(() => {
    registerServiceWorker();
    // Local data shows at once; connecting to the account waits until the first screen is drawn.
    const idle = window.requestIdleCallback ?? ((fn: () => void) => setTimeout(fn, 300));
    idle(() => startCloud(), { timeout: 1500 });
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
  // The countdown calendar is long; it opens on request (and stays open once opened).
  const [calOpen, setCalOpen] = useStored<boolean>("kutir-countdown-cal-open", false);
  const [tab, setTab] = useStored<Tab>("kutir-tab", "today");
  const expenses = useExpenses();
  const events = useEvents();
  const pool = usePool();
  // Sunday: review this week. Monday: last week's review, until dismissed.
  const [reviewSeen, setReviewSeen] = useStored<number>("kutir-review-seen", 0);
  const wd = weekday(today);
  const reviewWeek = wd === 6 ? weekOf(today)[0] : wd === 0 ? weekOf(today - 7)[0] : null;
  const [nySeen, setNySeen] = useStored<number>("kutir-newyear-seen", 0);
  const [, setPlanView] = usePlanView();
  const tips = useCoach(today, now, tasks);
  const openPlan = (v: PlanView, journal = false) => {
    setPlanView(v);
    setTab("pool");
    if (journal) setTimeout(() => document.getElementById("journal")?.scrollIntoView({ behavior: "smooth" }), 400);
    else window.scrollTo({ top: 0 });
  };
  const [yearReview, setYearReview] = useState<number | null>(null);

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
  // Worked out once here, for both the countdown card and the quote's streak.
  const stats = useMemo(() => (goal ? goalStats(goal, today, tasks, routines) : null), [goal, today, tasks, routines]);
  const streak = stats?.streak ?? 0;

  const today_ = (
    <>
      <div className="grid gap-4 lg:grid-cols-12">
        <TodayCard today={today} now={now} tasks={todays} allTasks={tasks} name={cloud.user?.name.split(" ")[0] ?? ""} />
        {goal ? (
          <CountdownCard goal={goal} s={stats!} today={today} tasks={tasks} routines={routines} poolGoals={pool.map((p) => p.goal)} />
        ) : cloud.status === "starting" || cloud.status === "syncing" ? (
          <div className="card shimmer h-72 lg:col-span-5" aria-label="Loading your countdowns" />
        ) : (
          <WelcomeCard today={today} onStart={setNewGoal} />
        )}
      </div>

      {isNewYearWeek(today) && nySeen !== fromJdn(today).y && (
        <NewYearCard year={fromJdn(today).y} onOpen={() => setYearReview(fromJdn(today).y - 1)} onDismiss={() => setNySeen(fromJdn(today).y)} />
      )}

      <CoachCard tips={tips} onAction={(to) => openPlan(to === "journal" ? "day" : to, to === "journal")} />

      <DateReminders today={today} events={events} onOpen={setOpenDay} />

      <LifeNudges
        today={today}
        onOpen={(t) => {
          setTab(t);
          window.scrollTo({ top: 0 });
        }}
      />

      <StuckTasks today={today} tasks={tasks} />

      {reviewWeek != null && reviewSeen !== reviewWeek && (
        <div className="card flex flex-wrap items-center gap-3 p-4">
          <span className="text-2xl" aria-hidden>🗓️</span>
          <p className="min-w-0 flex-1 text-sm">
            <b>{wd === 0 ? "Last week's" : "This week's"} review is ready.</b> See how it went, then plan the week ahead.
          </p>
          <button type="button" onClick={() => openPlan("week")} className="rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-bg">
            Review &amp; plan
          </button>
          <button type="button" onClick={() => setReviewSeen(reviewWeek)} className="text-sm text-muted hover:text-ink">
            Later
          </button>
        </div>
      )}

      <Reveal><QuoteCard today={today} tasks={tasks} logs={logs} expenses={expenses} streak={streak} /></Reveal>

      <EndOfDayCard today={today} now={now} tasks={tasks} routines={routines} logs={logs} onJournal={() => openPlan("day", true)} />

      <CloudNotice />

      <Reveal><ScreenDashboard today={today} logs={logs} tasks={tasks} onLogToday={() => setOpenDay(today)} /></Reveal>

      {goal && (
        <>
          <GoalBar goals={goals} active={goal} onSelect={setActiveId} onNew={() => setNewGoal({})} />
          {calOpen ? (
            <CountdownCalendar
              today={today}
              goal={goal}
              tasks={tasks}
              routines={routines}
              layers={layers}
              setLayers={setLayers}
              onOpen={setOpenDay}
            />
          ) : (
            <button
              type="button"
              onClick={() => setCalOpen(true)}
              className="card card-hover flex items-center justify-between gap-3 px-5 py-4 text-left"
            >
              <span className="flex items-center gap-3">
                <CalendarDays size={18} className="text-green" />
                <span>
                  <span className="block font-semibold">Countdown calendar</span>
                  <span className="text-sm text-muted">Every day of {goal.name}, crossed off as it passes</span>
                </span>
              </span>
              <ChevronDown size={18} className="text-muted" />
            </button>
          )}
        </>
      )}

      <Football now={now} today={today} onOpen={setOpenDay} />
    </>
  );

  return (
    <>
      <Aurora />
      <TopBar today={today} tab={tab} setTab={setTab} onSettings={() => setSettings(true)} />
      <main className={`mx-auto grid max-w-6xl gap-6 pb-32 pt-5 sm:gap-8 sm:pb-24 ${gutter}`}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="grid min-w-0 grid-cols-1 gap-6 sm:gap-8"
          >
            {tab === "today" && today_}
            {tab === "pool" && <PlanTab today={today} now={now} tasks={tasks} routines={routines} />}
            {tab === "calendar" && <CalendarTab today={today} tasks={tasks} routines={routines} onOpen={setOpenDay} />}
            {tab === "money" && <Money today={today} />}
            {tab === "life" && <LifeTab today={today} tasks={tasks} routines={routines} />}
          </motion.div>
        </AnimatePresence>

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
      <UpdatePill />
      <FocusBar />

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
      <Sheet open={yearReview != null} onClose={() => setYearReview(null)} label="Year in review">
        {yearReview != null && <YearReview year={yearReview} today={today} tasks={tasks} routines={routines} />}
      </Sheet>
      <Sheet open={settings} onClose={() => setSettings(false)} label="Settings">
        {settings && <Settings today={today} />}
      </Sheet>
    </>
  );
}

/** A newer version of Kutir is saved: one tap to switch to it. */
function UpdatePill() {
  const ready = useUpdateReady();
  return (
    <AnimatePresence>
      {ready && (
        <motion.button
          type="button"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -30, opacity: 0 }}
          onClick={() => location.reload()}
          className="fixed left-1/2 top-[calc(64px+env(safe-area-inset-top))] z-50 -translate-x-1/2 rounded-full bg-green px-4 py-2 text-sm font-semibold text-on-green shadow-xl"
        >
          ✨ New version ready · Refresh
        </motion.button>
      )}
    </AnimatePresence>
  );
}

/* ---------- Top bar ---------- */

type Tab = "today" | "pool" | "calendar" | "money" | "life";
const TABS: [Tab, string, typeof ListChecks][] = [
  ["today", "Today", ListChecks],
  ["pool", "Plan", Compass],
  ["calendar", "Calendar", CalendarDays],
  ["money", "Money", Wallet],
  ["life", "Life", Mountain],
];

function TopTabs({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const t = useT();
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
          className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors ${tab === k ? "text-bg" : "text-muted hover:text-ink"}`}
        >
          {tab === k && (
            <motion.span layoutId="top-tab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
          )}
          <span className="relative inline-flex items-center gap-1.5">
            <Icon size={15} /> {t(label)}
          </span>
        </button>
      ))}
    </nav>
  );
}

/** Phone navigation, pinned to the bottom like a native app. */
function BottomTabs({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const t = useT();
  return (
    <nav
      aria-label="Sections"
      className="glass fixed inset-x-0 bottom-0 z-40 border-t border-line/70 pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <div className="grid grid-cols-5">
        {TABS.map(([k, label, Icon]) => (
          <button
            key={k}
            type="button"
            aria-current={tab === k ? "page" : undefined}
            onClick={() => {
              setTab(k);
              window.scrollTo({ top: 0 });
            }}
            className={`relative flex flex-col items-center gap-0.5 pb-2 pt-2.5 text-[11px] font-semibold transition-colors ${tab === k ? "text-green" : "text-muted"}`}
          >
            {tab === k && (
              <motion.span
                layoutId="bottom-tab"
                className="absolute inset-x-2 top-1 bottom-1 rounded-2xl bg-green-soft/80"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <motion.span className="relative" animate={{ y: tab === k ? -1 : 0, scale: tab === k ? 1.08 : 1 }}>
              <Icon size={22} strokeWidth={tab === k ? 2.4 : 1.8} />
            </motion.span>
            <span className="relative truncate">{t(label)}</span>
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
          <motion.span
            className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-ink to-green text-base text-bg shadow-md"
            whileHover={{ rotate: 90 }}
            whileTap={{ scale: 0.85, rotate: 180 }}
            transition={{ type: "spring", stiffness: 300, damping: 14 }}
          >
            ✕
          </motion.span>
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

function TodayCard({ today, now, tasks, allTasks, name }: { today: number; now: number; tasks: Task[]; allTasks: Task[]; name: string }) {
  const t = useT();
  const e = fromJdn(today);
  const sky = partOfDay(now);
  const greeting = t(sky === "morning" ? "Good morning" : sky === "day" ? "Good afternoon" : "Good evening");
  const fasts = useFasts();
  const od = orthodoxDay(today);
  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? done / tasks.length : 0;
  const cleared = tasks.length > 0 && done === tasks.length;
  const [pulling, setPulling] = useState(false);
  const [hidden, setHidden] = useStored<number>("kutir-cleared-hidden", 0);
  const planned = tasks.filter((t) => !t.done).reduce((a, t) => a + (t.mins ?? 0), 0);
  // Confetti the moment the last task of the day is ticked (not on load).
  const [fire, setFire] = useState(0);
  const [wasCleared, setWasCleared] = useState(cleared);
  if (cleared !== wasCleared) {
    setWasCleared(cleared);
    if (cleared) setFire(fire + 1);
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card sky-${sky} relative overflow-clip p-5 sm:p-7 lg:col-span-7`}
    >
      <Burst fire={fire} />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-green/10 blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
        <span aria-hidden>{sky === "morning" ? "☀️" : sky === "day" ? "🌤️" : "🌙"}</span>
        {greeting}{name ? `, ${name}` : ""}
      </div>
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-end gap-4">
          <motion.span
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 16 }}
            className="ink-gradient font-display text-7xl font-extrabold leading-[0.8] tracking-tight tabular-nums sm:text-8xl"
          >
            {e.d}
          </motion.span>
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
              <Counter value={done} />
              <span className="text-lg text-muted">/{tasks.length}</span>
            </div>
            <div className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
              {cleared ? <span className="inline-flex items-center gap-1 text-green"><PartyPopper size={12} /> all done</span> : t("done today")}
            </div>
          </div>
        )}
      </div>

      <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-green to-[color-mix(in_oklab,var(--green)_60%,var(--gold))]"
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ type: "spring", damping: 25 }}
        />
      </div>

      <div className="relative mt-4">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
            <ListChecks size={15} /> {t("Today's tasks")}
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
              <Inbox size={13} /> {t("From the pool")}
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
          <span className="flex flex-wrap items-center gap-1.5">
            <Leaf size={14} className="text-green" /> {od.fast.en}
            <FastToggle day={today} value={fasts.get(today)} />
          </span>
        )}
      </div>
    </motion.section>
  );
}

function CountdownCard({
  goal, s, today, tasks, routines, poolGoals,
}: { goal: Goal; s: ReturnType<typeof goalStats>; today: number; tasks: Task[]; routines: Routine[]; poolGoals: (string | undefined)[] }) {
  // Habits that count towards this countdown: days done since it started.
  const habits = routines
    .filter((r) => r.goal === goal.id)
    .map((r) => ({ id: r.id, title: r.title, ...habitDays(r, tasks, goal.start, goal.start + goal.days - 1, today) }));
  const linked = tasks.filter((t) => t.goal === goal.id);
  const linkedDone = linked.filter((t) => t.done).length;
  const linkedAll = linked.length + poolGoals.filter((g) => g === goal.id).length;
  const R = 54, C = 2 * Math.PI * R;
  const t = useT();
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="card card-hover flex flex-col gap-5 p-5 sm:p-7 lg:col-span-5"
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
              style={{ filter: "drop-shadow(0 0 6px color-mix(in oklab, var(--marker) 45%, transparent))" }}
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: C * (1 - s.passed / goal.days) }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center">
            <div className="font-display text-4xl font-extrabold tabular-nums text-marker"><Counter value={s.left} /></div>
            <div className="text-xs text-muted">{t("days left")}</div>
          </div>
        </div>
        <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Stat label="Crossed off" value={`${s.passed}`} />
          <Stat label="Tasks done" value={s.tasksDue ? `${Math.round((s.rate ?? 0) * 100)}%` : "—"} />
          <Stat label="Perfect days" value={`${s.perfect}`} />
          <Stat label="Streak" value={<span className="inline-flex items-center gap-1"><Flame size={16} className="text-gold" />{s.streak}</span>} />
        </dl>
      </div>
      {habits.length > 0 && (
        <div className="grid gap-1.5">
          <span className="text-sm font-semibold">Habits for this countdown</span>
          {habits.map((h) => (
            <div key={h.id} className="grid gap-1">
              <div className="flex justify-between gap-2 text-sm">
                <span className="truncate">🔁 {h.title}</span>
                <span className="shrink-0 tabular-nums text-muted"><b className="text-ink">{h.done}</b> of {h.due} days</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <motion.div className="h-full rounded-full bg-green" animate={{ width: `${h.due ? (h.done / h.due) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
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
            const c = j < today ? "bg-marker" : j === today ? "bg-gold animate-pulse" : "bg-surface-2";
            return (
              <i key={j} className={`grow-in min-w-0 flex-1 rounded-[2px] ${c}`} style={{ animationDelay: `${Math.min(i, 120) * 4}ms` }} />
            );
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
      className="card relative flex flex-col justify-between gap-5 overflow-clip p-5 sm:p-7 lg:col-span-5"
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

/** On Enkutatash week: a look back at the year that just ended. */
function NewYearCard({ year, onOpen, onDismiss }: { year: number; onOpen: () => void; onDismiss: () => void }) {
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card sky-morning relative overflow-clip p-5 sm:p-6"
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -right-4 -top-6 text-8xl"
        animate={{ rotate: [-6, 6, -6], y: [0, -4, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        🌼
      </motion.span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-surface/70 text-muted hover:text-ink">
        <X size={16} />
      </button>
      <div className="relative max-w-lg">
        <div lang="am" className="font-semibold text-gold">እንቁጣጣሽ · መልካም አዲስ ዓመት</div>
        <h2 className="mt-1 font-display text-2xl font-extrabold">Happy {year}! Here&apos;s how {year - 1} went.</h2>
        <p className="mt-1 text-sm text-muted">Tasks done, goals reached, money in and out, and the days you&apos;re proudest of. Then set your big goals for {year}.</p>
        <button type="button" onClick={onOpen} className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg transition active:scale-95">
          <Sparkles size={15} /> See my {year - 1}
        </button>
      </div>
    </motion.section>
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

/* ---------- Loading ---------- */

function Skeleton() {
  return (
    <div className={`mx-auto grid max-w-6xl gap-4 pt-20 ${gutter}`} aria-busy="true" aria-label="Loading your calendar">
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="card shimmer h-72 lg:col-span-7" />
        <div className="card shimmer h-72 lg:col-span-5" />
      </div>
      <div className="card shimmer h-96" />
    </div>
  );
}
