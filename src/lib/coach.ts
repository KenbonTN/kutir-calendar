// The planning coach: a few plain rules from planning research, applied to what's
// in Kutir, that turn into short nudges. Each rule says why in its comment.

import type { Areas } from "./areas";
import { weekday } from "./ethiopian";
import { estimateAccuracy } from "./focus";
import type { DayNote } from "./notes";
import { minsLabel } from "./pool";
import { hoursOn, load, monthKey, monthRange, type Capacity, type Outcome } from "./plan";
import { weekOf } from "./review";
import type { Task } from "./tasks";

export type Tip = {
  id: string;
  tone: "warn" | "tip" | "good";
  text: string;
  action?: { label: string; to: "day" | "week" | "month" | "journal" };
};

/** Life areas that quietly suffer first when days get busy. */
const CORE = ["spirit", "family", "health"];

export function coach(d: {
  today: number;
  hour: number;
  tasks: Task[];
  outcomes: Outcome[];
  notes: Map<number, DayNote>;
  areas: Areas;
  capacity: Capacity;
  pace: number;
}): Tip[] {
  const { today, hour, tasks, outcomes, notes, areas, capacity, pace } = d;
  const tips: Tip[] = [];
  const todays = tasks.filter((t) => t.date === today);
  const open = todays.filter((t) => !t.done);
  const tops = todays.filter((t) => t.top);

  // Choosing a few priorities each day ties the day to the week (Full Focus "Daily Big 3", Covey's big rocks).
  if (open.length > 0 && tops.length === 0 && hour < 16)
    tips.push({ id: "top3", tone: "tip", text: "Pick today's Top 3: the few things that would make today a good day, whatever else happens.", action: { label: "Plan today", to: "day" } });

  // "I'll do X at 9:00" plans get done more often than "I'll do X" (implementation intentions).
  const noWhen = tops.filter((t) => !t.done && !t.at);
  if (noWhen.length)
    tips.push({ id: "when", tone: "tip", text: `Give ${noWhen.length === 1 ? `"${noWhen[0].title}"` : `${noWhen.length} of your Top 3`} a time. Plans with a "when" are kept more often.`, action: { label: "Set times", to: "day" } });

  // People underestimate how long things take (planning fallacy); check the day fits, at their real pace.
  const l = load(todays, pace);
  const left = hoursOn(capacity, weekday(today)) * 60;
  if (l.likely > left && l.likely > 0)
    tips.push({
      id: "overload",
      tone: "warn",
      text: `Today holds about ${minsLabel(l.likely)} of work at your pace, but you planned ${minsLabel(left)} of focus time. Move something to a lighter day.`,
      action: { label: "Rebalance", to: "week" },
    });
  if (l.unestimated >= 3)
    tips.push({ id: "estimate", tone: "tip", text: `Add a time estimate to ${l.unestimated} of today's tasks, so Kutir can check the day fits.`, action: { label: "Plan today", to: "day" } });

  // Let them know the estimates are being corrected from the focus timer.
  const acc = estimateAccuracy(tasks);
  if (acc && acc.ratio > 1.3)
    tips.push({ id: "pace", tone: "tip", text: `Your tasks take about ${acc.ratio.toFixed(1)}× your estimates (from ${acc.count} timed tasks). Kutir now plans your days with that in mind.` });

  // Balance: an area that matters with nothing done in a week (Wheel of Life; weekly roles in Covey).
  const month = monthKey(today);
  const watched = new Set([...CORE, ...outcomes.filter((o) => o.month === month).map((o) => areas.topOf(o.area)).filter((a): a is string => !!a)]);
  const lastDone = new Map<string, number>();
  for (const t of tasks)
    if (t.done && t.area) {
      const top = areas.topOf(t.area);
      if (top && (lastDone.get(top) ?? 0) < t.date) lastDone.set(top, t.date);
    }
  const firstUse = Math.min(...tasks.map((t) => t.created || Infinity));
  const usedForAWeek = Date.now() - firstUse > 7 * 864e5;
  for (const id of watched) {
    const a = areas.info(id);
    if (!a || !usedForAWeek) continue;
    const since = today - (lastDone.get(id) ?? today - 99);
    if (since >= 7)
      tips.push({
        id: `area-${id}`,
        tone: "warn",
        text: `Nothing done for ${a.emoji} ${a.name} ${since >= 30 ? "in over a month" : `in ${since} days`}. Plan one small thing for it this week.`,
        action: { label: "Plan the week", to: "week" },
      });
  }

  // The month is where big plans most often fail to reach the week.
  const [mFrom] = monthRange(month);
  if (!outcomes.some((o) => o.month === month) && today - mFrom <= 10)
    tips.push({ id: "month", tone: "tip", text: "Set this month's outcomes: one to three per life area that matters this month.", action: { label: "Plan the month", to: "month" } });

  // Weekly planning is the hinge between the month and the day.
  const [wFrom, wTo] = weekOf(today);
  if (!tasks.some((t) => t.rock && t.date >= wFrom && t.date <= wTo))
    tips.push({ id: "week", tone: "tip", text: "Choose this week's big rocks, the few things that matter most, and give each one a day.", action: { label: "Plan the week", to: "week" } });

  // Evening: reflect and write tomorrow's Top 3 (helps progress feel real, and helps you sleep).
  if (hour >= 18 && !notes.get(today))
    tips.push({ id: "journal", tone: "tip", text: "Five minutes for today's journal: your wins, what got in the way, and tomorrow's Top 3.", action: { label: "Write it", to: "journal" } });

  // Praise a journaling habit.
  let streak = 0;
  for (let j = today - 1; notes.get(j); j--) streak++;
  if (streak >= 3) tips.push({ id: "streak", tone: "good", text: `${streak} days of journaling in a row. That's how small wins add up.` });

  return tips;
}
