"use client";

import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, Church, Star, Target, Trophy } from "lucide-react";
import { useMemo } from "react";
import type { Goal } from "@/lib/goals";
import { monthsCovering, type Cal } from "@/lib/months";
import { useStored } from "@/lib/storage";
import { dayScorer, tasksOn, type Routine, type Task } from "@/lib/tasks";
import { MonthGrid, type DayInfo, type Layers } from "./MonthGrid";
import { CalSwitch } from "./NewGoalForm";

export default function CountdownCalendar({
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
    const score = dayScorer(tasks, routines);
    for (const { first, length } of months) {
      for (let j = first; j < first + length; j++) {
        if (j < today) map.set(j, score(j));
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

