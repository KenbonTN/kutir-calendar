"use client";

import { Star } from "lucide-react";
import { memo } from "react";
import { formatEt, formatG, fromJdn, geez, weekday, WEEKDAYS, WEEKDAYS_AM_SHORT } from "@/lib/ethiopian";
import { badge, matchesOn } from "@/lib/fixtures";
import { dayNumber, otherDate, type Cal, type MonthSpec } from "@/lib/months";
import { orthodoxDay } from "@/lib/orthodox";
import { XMark } from "./XMark";

export type Layers = { saints: boolean; football: boolean };
export type Plan = { start: number; end: number } | null;
/** Per day: tasks done and tasks due (for past days), or tasks planned (today and later). */
export type DayInfo = Map<number, { done: number; due: number }>;

type Props = {
  month: MonthSpec;
  cal: Cal;
  today: number;
  plan: Plan;
  layers: Layers;
  info: DayInfo;
  onOpen: (j: number) => void;
};

const Day = memo(function Day({
  j, cal, today, plan, layers, score, onOpen,
}: {
  j: number; cal: Cal; today: number; plan: Plan; layers: Layers;
  score: { done: number; due: number } | undefined; onOpen: (j: number) => void;
}) {
  const inPlan = !!plan && j >= plan.start && j <= plan.end;
  const crossed = inPlan && j < today; // the day is over: it crosses itself
  const isToday = j === today;
  const od = layers.saints ? orthodoxDay(j) : null;
  const feast = od?.feasts[0];
  const matches = layers.football ? matchesOn(j) : [];
  const match = matches[0];
  const d = dayNumber(cal, j);

  return (
    <button
      type="button"
      onClick={() => onOpen(j)}
      id={isToday ? "countdown-today" : undefined}
      aria-label={`${formatEt(j)}, ${formatG(j)}${crossed ? ", passed" : ""}${score?.due ? `, ${j < today ? `${score.done} of ${score.due} tasks done` : `${score.due} tasks`}` : ""}${isToday ? ", today" : ""}${feast ? `, ${feast.en}` : ""}${match ? `, ${match.home} vs ${match.away}` : ""}`}
      className={[
        "group relative flex aspect-square min-w-0 scroll-mt-24 flex-col justify-between overflow-hidden rounded-xl border p-1 text-left transition sm:aspect-[5/4] sm:rounded-2xl sm:p-2",
        isToday
          ? "border-gold bg-gold-soft ring-2 ring-gold/50"
          : inPlan
            ? "border-line bg-surface hover:border-green"
            : "border-transparent bg-surface-2/60 text-muted hover:border-line",
        !isToday && feast?.kind === "major" ? "bg-gold-soft/60" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className={`font-display text-[15px] font-bold leading-none tabular-nums sm:text-xl ${
            inPlan && j > today ? "text-muted" : ""
          }`}
        >
          {d}
        </span>
        <span className="min-w-0 truncate font-mono text-[9px] leading-none text-muted sm:text-[10.5px]">{otherDate(cal, j)}</span>
      </div>

      {isToday ? (
        <span className="w-fit rounded-full bg-gold px-1.5 py-px text-[8.5px] font-extrabold uppercase tracking-wide text-bg sm:text-[10px]">
          Today
        </span>
      ) : od && (
        <span className="hidden min-w-0 text-[11px] leading-tight text-muted sm:line-clamp-2" title={od.monthly.en}>
          {feast ? (
            <span className="font-semibold text-gold">
              {feast.kind === "major" && <Star size={9} className="mr-0.5 inline -translate-y-px" fill="currentColor" />}
              {feast.en.split(" · ")[0]}
            </span>
          ) : (
            od.monthly.en.split(" · ")[0]
          )}
        </span>
      )}

      <div className="flex items-end justify-between gap-1">
        {score?.due ? (
          <ScoreChip score={score} past={j < today} />
        ) : match ? (
          <>
            <span
              className={`size-1.5 shrink-0 rounded-full sm:hidden ${match.arsenal ? "bg-arsenal" : "bg-ucl"}`}
            />
            <span
              className={`hidden min-w-0 truncate rounded-md px-1.5 py-0.5 font-mono text-[10.5px] font-semibold sm:inline ${
                match.arsenal ? "bg-arsenal/10 text-arsenal" : "bg-ucl-soft text-ucl"
              }`}
            >
              {badge(match)}
              {matches.length > 1 && ` +${matches.length - 1}`}
            </span>
          </>
        ) : (
          <span className={`size-1.5 shrink-0 rounded-full sm:hidden ${feast ? "bg-gold" : "bg-transparent"}`} />
        )}
        {layers.saints && cal === "ethiopian" && (
          <span lang="am" className="ml-auto text-[9px] leading-none text-muted sm:text-[10.5px]">{geez(fromJdn(j).d)}</span>
        )}
      </div>

      {crossed && <XMark seed={j} animate={false} className="opacity-70" />}
    </button>
  );
});

function ScoreChip({ score, past }: { score: { done: number; due: number }; past: boolean }) {
  const all = score.done === score.due;
  const tone = !past
    ? "bg-surface-2 text-muted"
    : all
      ? "bg-green-soft text-green"
      : score.done
        ? "bg-gold-soft text-gold"
        : "bg-marker/10 text-marker";
  return (
    <span className={`relative z-10 rounded-md px-1 py-px font-mono text-[9px] font-bold leading-tight sm:px-1.5 sm:text-[10.5px] ${tone}`}>
      {past || score.done ? `${score.done}/${score.due}` : `${score.due}`}
      <span className="hidden sm:inline">{past || score.done ? "" : score.due === 1 ? " task" : " tasks"}</span>
    </span>
  );
}

export function MonthGrid({ month, cal, today, plan, layers, info, onOpen }: Props) {
  const { first, length: len } = month;
  const lead = weekday(first);
  return (
    <section className="card p-3 sm:p-5" aria-label={month.title}>
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-1">
        <h3 className="font-display text-xl font-bold sm:text-2xl">
          {month.title}
          {month.titleAm && (
            <span lang="am" className="ml-2 text-base font-semibold text-green sm:text-lg">
              {month.titleAm}
            </span>
          )}
        </h3>
        <span className="text-sm text-muted">{month.subtitle}</span>
      </header>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className="pb-1 text-center text-[11px] font-semibold text-muted">
            {cal === "ethiopian" ? <span lang="am">{WEEKDAYS_AM_SHORT[i]}</span> : w.slice(0, 3)}
          </div>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <div key={`b${i}`} />
        ))}
        {Array.from({ length: len }, (_, i) => {
          const j = first + i;
          return (
            <Day
              key={j}
              j={j}
              cal={cal}
              today={today}
              plan={plan}
              layers={layers}
              score={info.get(j)}
              onOpen={onOpen}
            />
          );
        })}
      </div>
    </section>
  );
}
