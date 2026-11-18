import { formatEt } from "@/lib/ethiopian";

export type HabitDays = { id: string; title: string; done: number; due: number };

/**
 * Days passed and days left for anything with a start and a deadline, plus how
 * many days each linked habit was done since the start.
 */
export function Deadline({ start, end, today, habits = [] }: { start: number; end: number; today: number; habits?: HabitDays[] }) {
  const total = Math.max(1, end - start + 1);
  const passed = Math.max(0, Math.min(total, today - start));
  const left = Math.max(0, end - today + (today >= start && today <= end ? 1 : 0));
  const label =
    today < start ? `Starts ${formatEt(start)}` : today > end ? `Ended ${formatEt(end)}` : `Day ${today - start + 1} of ${total}`;
  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
        <span className="font-semibold">{label}</span>
        <span className={`tabular-nums ${left && left <= 7 ? "font-bold text-marker" : "text-muted"}`}>
          {today > end ? "" : `${left} day${left === 1 ? "" : "s"} left · by ${formatEt(end)}`}
        </span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div className="h-full rounded-full bg-marker/80" style={{ width: `${(passed / total) * 100}%` }} />
      </div>
      {habits.map((h) => (
        <div key={h.id} className="flex items-center justify-between gap-2 text-xs">
          <span className="min-w-0 truncate">🔁 {h.title}</span>
          <span className="shrink-0 tabular-nums">
            <b className={h.due && h.done / h.due >= 0.8 ? "text-green" : "text-ink"}>{h.done}</b>
            <span className="text-muted"> of {h.due} days</span>
          </span>
        </div>
      ))}
    </div>
  );
}
