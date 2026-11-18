"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Trophy } from "lucide-react";
import { useState } from "react";
import { addisJdn, addisTime, fromJdn, MONTHS, WEEKDAYS, weekday } from "@/lib/ethiopian";
import { MATCHES, type Match } from "@/lib/fixtures";
import { useStored } from "@/lib/storage";
import { countdown } from "@/lib/useToday";
import { MatchRow } from "./MatchRow";

export default function Football({ now, today, onOpen }: { now: number; today: number; onOpen: (j: number) => void }) {
  const [open, setOpen] = useStored<boolean>("kutir-football-open", false);
  const [filter, setFilter] = useState<"all" | "arsenal" | "ucl">("all");
  const [more, setMore] = useState(false);
  const upcoming = MATCHES.filter((m) => Date.parse(m.kickoff) > now - 2 * 3600e3);
  const next = upcoming.find((m) => m.arsenal);
  const list = upcoming.filter((m) => (filter === "arsenal" ? m.arsenal : filter === "ucl" ? m.comp === "UCL" : true));
  const shown = more ? list : list.slice(0, 6);

  return (
    <section className="card overflow-clip">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left sm:px-6"
      >
        <span className="flex min-w-0 items-center gap-3">
          <Trophy size={18} className="shrink-0 text-muted" />
          <span className="min-w-0">
            <span className="font-semibold">Football</span>
            {next && (
              <span className="block truncate text-sm text-muted">
                Next: {next.home} vs {next.away} · {nextWhen(next, today)} · {countdown(next.kickoff, now)}
              </span>
            )}
          </span>
        </span>
        <ChevronDown size={18} className={`shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="grid gap-3 border-t border-line px-5 pb-5 pt-4 sm:px-6">
              <div className="flex w-fit rounded-full border border-line bg-surface-2 p-1 text-sm font-semibold">
                {([["all", "All"], ["arsenal", "Arsenal"], ["ucl", "Champions League"]] as const).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={filter === k}
                    onClick={() => setFilter(k)}
                    className={`rounded-full px-3 py-1 transition ${filter === k ? "bg-ink text-bg" : "text-muted"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="divide-y divide-line">
                {shown.length === 0 && <p className="py-4 text-sm text-muted">No upcoming matches in this list yet.</p>}
                {shown.map((m) => (
                  <button key={m.id} type="button" onClick={() => onOpen(addisJdn(m.kickoff))} className="block w-full text-left">
                    <MatchRow m={m} now={now} />
                  </button>
                ))}
              </div>
              {list.length > 6 && (
                <button type="button" onClick={() => setMore(!more)} className="justify-self-center text-sm font-semibold text-green">
                  {more ? "Show fewer" : `Show all ${list.length} matches`}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function nextWhen(m: Match, today: number) {
  const j = addisJdn(m.kickoff);
  const day = j === today ? "today" : j === today + 1 ? "tomorrow" : `${WEEKDAYS[weekday(j)].slice(0, 3)} ${fromJdn(j).d} ${MONTHS[fromJdn(j).m - 1]}`;
  return `${day}, ${addisTime(m.kickoff).intl}`;
}

