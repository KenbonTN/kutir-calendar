// Numbers worked out from what's already logged: habit heatmaps, the Ethiopian
// year in review, and month-by-month profit for each business.

import { fromJdn, monthLength, toJdn, weekday } from "./ethiopian";
import type { Expense } from "./expenses";
import type { Goal } from "./goals";
import type { Income } from "./income";
import type { DayNote } from "./notes";
import type { ScreenLog } from "./screen";
import { dayScore, type Routine, type Task } from "./tasks";

/* ---------- Habits ---------- */

export type HabitCell = { day: number; state: "done" | "missed" | "off" | "future" | "before" };

/** One cell per day for the last `weeks` weeks (Monday to Sunday columns), for one repeating task. */
export function habitGrid(r: Routine, tasks: Task[], today: number, weeks = 26) {
  const done = new Set(tasks.filter((t) => t.routine === r.id && t.done).map((t) => t.date));
  const end = today + (6 - weekday(today));
  const first = end - weeks * 7 + 1;
  const cells: HabitCell[] = [];
  let hit = 0, due = 0, streak = 0, best = 0, run = 0;
  for (let d = first; d <= end; d++) {
    const applies = r.days.includes(weekday(d));
    const state: HabitCell["state"] =
      d > today ? "future" : d < r.start ? "before" : !applies ? "off" : done.has(d) ? "done" : d === today ? "future" : "missed";
    cells.push({ day: d, state });
    if (state === "done") {
      hit++;
      due++;
      run++;
      best = Math.max(best, run);
    } else if (state === "missed") {
      due++;
      run = 0;
    }
  }
  // Current streak: due days done, counting back from today (today only counts once done).
  for (let i = cells.length - 1; i >= 0; i--) {
    const c = cells[i];
    if (c.state === "done") streak++;
    else if (c.state === "missed") break;
  }
  return { cells, rate: due ? hit / due : null, streak, best };
}

/* ---------- Ethiopian year in review ---------- */

export function yearRange(y: number): [number, number] {
  return [toJdn(y, 1, 1), toJdn(y, 13, monthLength(y, 13))];
}

export function yearReview(
  y: number,
  today: number,
  d: { tasks: Task[]; routines: Routine[]; goals: Goal[]; expenses: Expense[]; income: Income[]; logs: Map<number, ScreenLog>; notes: Map<number, DayNote> },
) {
  const [from, last] = yearRange(y);
  const to = Math.min(last, today - 1);
  let done = 0, due = 0, perfect = 0, bestDay = 0, bestCount = 0;
  const byMonth = Array.from({ length: 13 }, () => ({ done: 0, due: 0 }));
  for (let j = from; j <= to; j++) {
    const s = dayScore(j, d.tasks, d.routines);
    done += s.done;
    due += s.due;
    const m = fromJdn(j).m - 1;
    byMonth[m].done += s.done;
    byMonth[m].due += s.due;
    if (s.due && s.done === s.due) perfect++;
    if (s.done > bestCount) {
      bestCount = s.done;
      bestDay = j;
    }
  }
  const inYear = (day: number) => day >= from && day <= last;
  const areas = new Map<string, number>();
  for (const t of d.tasks) if (t.done && t.area && inYear(t.date)) areas.set(t.area, (areas.get(t.area) ?? 0) + 1);
  const goalsEnded = d.goals.filter((g) => inYear(g.start + g.days - 1));
  const moneyIn = d.income.filter((i) => inYear(i.day)).reduce((a, i) => a + i.amount, 0);
  const moneyOut = d.expenses.filter((e) => inYear(e.day)).reduce((a, e) => a + e.amount, 0);
  let screen = 0;
  for (const [day, l] of d.logs) if (inYear(day)) screen += l.tiktok + l.instagram + l.youtube;
  const wins = [...d.notes.values()].filter((n) => inYear(n.day) && n.well).sort((a, b) => b.day - a.day).slice(0, 5);
  const focus = d.tasks.filter((t) => inYear(t.date)).reduce((a, t) => a + (t.spent ?? 0), 0);
  return {
    from, to: last, days: Math.max(0, to - from + 1),
    done, due, rate: due ? done / due : null, perfect, bestDay: bestCount ? bestDay : null, bestCount,
    byMonth,
    areas: [...areas.entries()].sort((a, b) => b[1] - a[1]),
    goalsEnded,
    moneyIn, moneyOut, screen, wins, focus,
  };
}

/** Enkutatash: the first days of Meskerem, when the year in review is offered. */
export const isNewYearWeek = (today: number) => {
  const e = fromJdn(today);
  return e.m === 1 && e.d <= 10;
};

/* ---------- Profit by business, month by month ---------- */

/** Last `n` Ethiopian months up to today's: money in, out and profit for one area (or all with none). */
export function monthlyProfit(income: Income[], expenses: Expense[], today: number, n = 6, area?: (a: string | undefined) => boolean) {
  const e = fromJdn(today);
  const months: { y: number; m: number; from: number; to: number; inc: number; out: number }[] = [];
  let y = e.y, m = e.m;
  for (let i = 0; i < n; i++) {
    const from = toJdn(y, m, 1);
    months.unshift({ y, m, from, to: from + monthLength(y, m) - 1, inc: 0, out: 0 });
    m--;
    if (m === 0) {
      m = 13;
      y--;
    }
  }
  const at = (day: number) => months.find((x) => day >= x.from && day <= x.to);
  for (const i of income) if (!area || area(i.area)) { const x = at(i.day); if (x) x.inc += i.amount; }
  for (const x of expenses) if (!area || area(x.area)) { const mo = at(x.day); if (mo) mo.out += x.amount; }
  return months.map((x) => ({ ...x, profit: x.inc - x.out }));
}
