"use client";

import { Star } from "lucide-react";
import { memo } from "react";
import {
  geez, jdnToDate, monthLength, MONTHS, MONTHS_AM, toJdn, weekday, WEEKDAYS_AM_SHORT,
} from "@/lib/ethiopian";
import { badge, matchesOn } from "@/lib/fixtures";
import { orthodoxDay } from "@/lib/orthodox";
import { XMark } from "./XMark";

export type Layers = { saints: boolean; football: boolean };
export type Plan = { start: number; end: number } | null;
/** Per day: tasks done and tasks due (for past days), or tasks planned (today and later). */
export type DayInfo = Map<number, { done: number; due: number }>;

type Props = {
  y: number;
  m: number;
  today: number;
  plan: Plan;
  layers: Layers;
  info: DayInfo;
  onOpen: (j: number) => void;
};

const gDay = (j: number) => {
  const d = jdnToDate(j);
  return d.getUTCDate() === 1
    ? d.toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" })
    : String(d.getUTCDate());
};

const Day = memo(function Day({
  j, d, today, plan, layers, score, onOpen,
}: {
  j: number; d: number; today: number; plan: Plan; layers: Layers;
  score: { done: number; due: number } | undefined; onOpen: (j: number) => void;
}) {
  const inPlan = !!plan && j >= plan.start && j <= plan.end;
  const crossed = inPlan && j < today; // the day is over: it crosses itself
  const isToday = j === today;
  const od = layers.saints ? orthodoxDay(j) : null;
  const feast = od?.feasts[0];
  const matches = layers.football ? matchesOn(j) : [];
  const match = matches[0];

  return (
    <button
      type="button"
      onClick={() => onOpen(j)}
      aria-label={`${d}${crossed ? ", passed" : ""}${score?.due ? `, ${j < today ? `${score.done} of ${score.due} tasks done` : `${score.due} tasks`}` : ""}${isToday ? ", today" : ""}${feast ? `, ${feast.en}` : ""}${match ? `, ${match.home} vs ${match.away}` : ""}`}
      className={[
        "group relative flex aspect-square min-w-0 flex-col justify-between overflow-hidden rounded-xl border p-1 text-left transition sm:aspect-[5/4] sm:rounded-2xl sm:p-2",
        inPlan ? "border-line bg-surface hover:border-green" : "border-transparent bg-surface-2/60 text-muted hover:border-line",
        isToday ? "!border-gold ring-2 ring-gold/40" : "",
        feast?.kind === "major" ? "bg-gold-soft/60" : "",
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
        {layers.saints && (
          <span lang="am" className="text-[10px] leading-none text-muted sm:text-[11px]">
            {geez(d)}
          </span>
        )}
      </div>

      {od && (
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
        <span className="ml-auto font-mono text-[9px] leading-none text-muted sm:text-[10px]">{gDay(j)}</span>
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

export function MonthGrid({ y, m, today, plan, layers, info, onOpen }: Props) {
  const first = toJdn(y, m, 1);
  const len = monthLength(y, m);
  const lead = weekday(first);
  return (
    <section className="card p-3 sm:p-5" aria-label={`${MONTHS[m - 1]} ${y}`}>
      <header className="mb-3 flex items-baseline justify-between gap-2 px-1">
        <h3 className="font-display text-xl font-bold sm:text-2xl">
          {MONTHS[m - 1]}{" "}
          <span lang="am" className="ml-1 text-base font-semibold text-green sm:text-lg">
            {MONTHS_AM[m - 1]}
          </span>
        </h3>
        <span className="font-mono text-xs text-muted">{y} E.C.</span>
      </header>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {WEEKDAYS_AM_SHORT.map((w) => (
          <div key={w} lang="am" className="pb-1 text-center text-[11px] font-semibold text-muted">
            {w}
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
              d={i + 1}
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
