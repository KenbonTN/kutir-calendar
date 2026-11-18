"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowRight, Lightbulb, Sparkles, ThumbsUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useAreas } from "@/lib/areas";
import { coach, type Tip } from "@/lib/coach";
import { useDevotion } from "@/lib/faith";
import { useNotes } from "@/lib/notes";
import { useFasts } from "@/lib/people";
import { paceFactor, useCapacity, useOutcomes } from "@/lib/plan";
import { useStored } from "@/lib/storage";
import type { Task } from "@/lib/tasks";

export type PlanView = "day" | "week" | "month" | "pool";
export const usePlanView = () => useStored<PlanView>("kutir-plan-view", "day");

export function useCoach(today: number, now: number, tasks: Task[]) {
  const notes = useNotes();
  const areas = useAreas();
  const outcomes = useOutcomes();
  const [capacity] = useCapacity();
  const devotion = useDevotion();
  const fasts = useFasts();
  const hour = new Date(now + 3 * 3600e3).getUTCHours();
  return useMemo(() => {
    const faithDays = [
      ...[...devotion.values()].filter((d) => d.done.length || d.pages).map((d) => d.day),
      ...[...fasts.entries()].filter(([, kept]) => kept).map(([day]) => day),
    ];
    return coach({ today, hour, tasks, outcomes, notes, areas, capacity, pace: paceFactor(tasks), faithDays });
  }, [today, hour, tasks, outcomes, notes, areas, capacity, devotion, fasts]);
}

const TONE: Record<Tip["tone"], { icon: typeof Lightbulb; cls: string }> = {
  warn: { icon: AlertTriangle, cls: "bg-gold-soft/70 text-gold" },
  tip: { icon: Lightbulb, cls: "bg-green-soft/70 text-green" },
  good: { icon: ThumbsUp, cls: "bg-ucl-soft text-ucl" },
};

/** The coach's nudges; actions jump to the right plan view. */
export function CoachCard({ tips, onAction, max = 3, title = "Your planning coach" }: { tips: Tip[]; onAction: (to: NonNullable<Tip["action"]>["to"]) => void; max?: number; title?: string }) {
  const [hidden, setHidden] = useStored<string[]>("kutir-coach-hidden", []);
  const [day] = useState(() => Math.floor(Date.now() / 864e5));
  const shown = tips.filter((t) => !hidden.includes(`${day}:${t.id}`)).slice(0, max);
  if (!shown.length) return null;
  return (
    <section className="card grid gap-2 p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
        <Sparkles size={14} className="text-gold" /> {title}
      </h2>
      <AnimatePresence initial={false}>
        {shown.map((t) => {
          const { icon: Icon, cls } = TONE[t.tone];
          return (
            <motion.div key={t.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="flex items-start gap-3 rounded-2xl bg-surface-2/70 p-3">
              <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${cls}`}><Icon size={16} /></span>
              <p className="min-w-0 flex-1 text-sm leading-snug">{t.text}</p>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {t.action && (
                  <button type="button" onClick={() => onAction(t.action!.to)} className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-bg transition active:scale-95">
                    {t.action.label} <ArrowRight size={12} />
                  </button>
                )}
                <button type="button" onClick={() => setHidden([...hidden.filter((h) => h.startsWith(`${day}:`)), `${day}:${t.id}`])} className="text-[11px] text-muted hover:text-ink">
                  Not today
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </section>
  );
}
