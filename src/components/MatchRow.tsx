"use client";

import { Star } from "lucide-react";
import { addisJdn, addisTime, formatEt, formatGShort, WEEKDAYS, weekday } from "@/lib/ethiopian";
import type { Match } from "@/lib/fixtures";
import { countdown } from "@/lib/useToday";

export function CompBadge({ m }: { m: Match }) {
  return m.comp === "UCL" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-ucl-soft px-2 py-0.5 text-[11px] font-semibold text-ucl">
      <Star size={11} fill="currentColor" /> UCL
    </span>
  ) : (
    <span className="rounded-full bg-arsenal/10 px-2 py-0.5 text-[11px] font-semibold text-arsenal">
      Premier League
    </span>
  );
}

function Team({ name }: { name: string }) {
  return <span className={name === "Arsenal" ? "font-bold text-arsenal" : "font-semibold"}>{name}</span>;
}

/** One fixture with its Ethiopian date, both Addis clocks and a countdown. */
export function MatchRow({ m, now, showDate = true }: { m: Match; now: number; showDate?: boolean }) {
  const j = addisJdn(m.kickoff);
  const t = addisTime(m.kickoff);
  const played = Date.parse(m.kickoff) < now - 2 * 3600e3;
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <CompBadge m={m} />
          <span className="truncate text-xs text-muted">{m.stage}</span>
        </div>
        <div className="text-[15px] leading-snug">
          <Team name={m.home} /> <span className="text-muted">vs</span> <Team name={m.away} />
          {m.score && (
            <span className="ml-2 font-mono text-sm font-medium">
              {m.score[0]}–{m.score[1]}
            </span>
          )}
        </div>
        <div className="mt-1 text-[13px] text-muted">
          {showDate && (
            <>
              {WEEKDAYS[weekday(j)]} {formatEt(j)} · {formatGShort(j)} ·{" "}
            </>
          )}
          <span className="font-mono text-ink">{t.intl}</span> Addis · <span lang="am">{t.ethiopian}</span>
        </div>
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
          played ? "bg-surface-2 text-muted" : "bg-gold-soft text-gold"
        }`}
      >
        {countdown(m.kickoff, now)}
      </span>
    </div>
  );
}
