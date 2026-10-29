"use client";

import { AnimatePresence, motion } from "motion/react";
import { Quote as QuoteIcon, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { byCategory, type Expense } from "@/lib/expenses";
import { quoteFor } from "@/lib/quotes";
import { sumRange, total, type ScreenLog } from "@/lib/screen";
import type { Task } from "@/lib/tasks";

/** One quote a day, chosen to fit how the week is going, with a note on what it means today. */
export function QuoteCard({
  today, tasks, logs, expenses, streak,
}: { today: number; tasks: Task[]; logs: Map<number, ScreenLog>; expenses: Expense[]; streak: number }) {
  const [skip, setSkip] = useState(0);

  const signals = useMemo(() => {
    const week = sumRange(logs, today - 7, today - 1);
    const thisWeek = byCategory(expenses, today - 6, today).total;
    const lastWeek = byCategory(expenses, today - 13, today - 7).total;
    return {
      screenAvg: week.days ? total(week) / week.days : 0,
      postponed: tasks.filter((t) => t.date === today && !t.done && t.missed.length > 0).length,
      spendRatio: lastWeek > 0 ? thisWeek / lastWeek : 0,
      streak,
    };
  }, [logs, expenses, tasks, today, streak]);

  const { quote, why } = quoteFor(today, signals, skip);

  return (
    <section className="card relative overflow-clip p-5 sm:p-7">
      <QuoteIcon aria-hidden size={88} className="pointer-events-none absolute -right-2 -top-3 text-gold/15" fill="currentColor" />
      <div className="relative flex items-center justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Quote of the day</h2>
        <button
          type="button"
          onClick={() => setSkip(skip + 1)}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold text-muted hover:text-ink"
        >
          <RefreshCw size={13} /> Another
        </button>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.figure
          key={quote.text}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="relative mt-3 grid gap-3"
        >
          {quote.am && (
            <p lang="am" className="font-display text-xl font-bold text-green sm:text-2xl">
              {quote.am}
            </p>
          )}
          <blockquote className={`font-display font-bold leading-snug text-balance ${quote.am ? "text-lg" : "text-xl sm:text-2xl"}`}>
            “{quote.text}”
          </blockquote>
          <figcaption className="text-sm font-semibold text-muted">— {quote.by}</figcaption>
          <p className="max-w-prose border-l-2 border-gold pl-3 text-[15px] leading-relaxed">{quote.note}</p>
          {why && <p className="text-xs text-muted">{why}</p>}
        </motion.figure>
      </AnimatePresence>
    </section>
  );
}
