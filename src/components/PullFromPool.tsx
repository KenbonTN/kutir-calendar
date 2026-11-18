"use client";

import { ArrowUpRight, Inbox, PartyPopper } from "lucide-react";
import { useMemo, useState } from "react";
import { formatEt, WEEKDAYS, weekday } from "@/lib/ethiopian";
import { minsLabel, planPoolItem, poolStore } from "@/lib/pool";
import { useRecords } from "@/lib/records";
import { pullForward, type Task } from "@/lib/tasks";
import { AreaTag } from "./AreaBits";

const shortDay = (j: number, today: number) =>
  j === today ? "Today" : j === today + 1 ? "Tomorrow" : `${WEEKDAYS[weekday(j)].slice(0, 3)} · ${formatEt(j)}`;

export const usePool = () => {
  const items = useRecords(poolStore);
  return useMemo(() => [...items].sort((a, b) => a.created - b.created), [items]);
};

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
