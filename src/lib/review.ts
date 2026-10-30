// How a stretch of days went, for the weekly review and the life-balance chart.

import type { Areas } from "./areas";
import { weekday } from "./ethiopian";
import { dayScorer, type Routine, type Task } from "./tasks";

/** Monday to Sunday of the week that contains `day`. */
export const weekOf = (day: number): [number, number] => [day - weekday(day), day - weekday(day) + 6];

/** Areas worth a nudge when a week passes without them. */
const CORE = ["spirit", "family", "health"];

export function review(from: number, to: number, tasks: Task[], routines: Routine[], areas: Areas) {
  let done = 0, due = 0;
  const score = dayScorer(tasks, routines);
  for (let d = from; d <= to; d++) {
    const s = score(d);
    done += s.done;
    due += s.due;
  }

  // Finished tasks per top-level area.
  const counts = new Map<string, number>();
  let untagged = 0;
  for (const t of tasks)
    if (t.done && t.date >= from && t.date <= to) {
      const top = areas.topOf(t.area);
      if (top) counts.set(top, (counts.get(top) ?? 0) + 1);
      else untagged++;
    }
  const byArea = [...counts.entries()]
    .map(([id, n]) => ({ ...areas.info(id)!, n }))
    .sort((a, b) => b.n - a.n);

  // Areas used in the four weeks before, plus the core ones, that got nothing this time.
  const recent = new Set(
    tasks.filter((t) => t.area && t.date >= from - 28 && t.date < from).map((t) => areas.topOf(t.area)!),
  );
  const live = new Set(areas.top.map((a) => a.id));
  const missing = [...new Set([...CORE, ...recent])]
    .filter((id) => id && live.has(id) && !counts.has(id))
    .map((id) => areas.info(id)!);

  const slipped = tasks.filter((t) => !t.routine && t.missed.some((d) => d >= from && d <= to));
  const mostMoved = [...slipped].sort((a, b) => b.missed.length - a.missed.length)[0];
  const early = tasks.filter((t) => t.done && !t.routine && t.date >= from && t.date <= to && t.origin > t.date).length;

  return { done, due, byArea, untagged, missing, slipped, mostMoved, early };
}
