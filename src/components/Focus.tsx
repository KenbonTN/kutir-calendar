"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Pause, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { clock, stopFocus, useFocus } from "@/lib/focus";
import { minsLabel } from "@/lib/pool";

/** Floating bar while a focus timer runs: time so far against the plan, stop, or stop and mark done. */
export function FocusBar() {
  const r = useFocus();
  const [now, setNow] = useState(() => Date.now());
  const [saved, setSaved] = useState<string | null>(null);
  useEffect(() => {
    if (!r) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [r]);
  useEffect(() => {
    if (!saved) return;
    const id = setTimeout(() => setSaved(null), 3500);
    return () => clearTimeout(id);
  }, [saved]);

  const elapsed = r ? Math.max(0, now - r.since) : 0;
  const pct = r ? Math.min(1, elapsed / (r.goal * 60e3)) : 0;
  const over = r && elapsed > r.goal * 60e3;
  const R = 17, C = 2 * Math.PI * R;
  const stop = (done: boolean) => {
    const mins = stopFocus(done);
    setSaved(`${minsLabel(mins)} saved${done ? " · task done" : ""}`);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 sm:bottom-6">
      <AnimatePresence>
        {r && (
          <motion.div
            key="bar"
            initial={{ y: 40, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            className="glass pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-full border border-line py-2 pl-2 pr-2 shadow-2xl"
            role="status"
            aria-live="off"
          >
            <div className="relative size-11 shrink-0">
              <svg viewBox="0 0 40 40" className="size-full -rotate-90">
                <circle cx="20" cy="20" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="4" />
                <circle
                  cx="20" cy="20" r={R} fill="none" stroke={over ? "var(--gold)" : "var(--green)"} strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={C * (1 - pct)} style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <Timer size={16} className={`absolute inset-0 m-auto ${over ? "text-gold" : "text-green"}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{r.title}</div>
              <div className="font-mono text-xs tabular-nums text-muted">
                <span className={over ? "font-bold text-gold" : "text-ink"}>{clock(elapsed)}</span> / {minsLabel(r.goal)}
              </div>
            </div>
            <button type="button" onClick={() => stop(false)} aria-label="Stop timer" className="grid size-10 place-items-center rounded-full border border-line bg-surface text-muted transition hover:text-ink active:scale-90">
              <Pause size={16} />
            </button>
            <button type="button" onClick={() => stop(true)} aria-label="Stop timer and mark the task done" className="grid size-10 place-items-center rounded-full bg-green text-on-green transition active:scale-90">
              <Check size={18} strokeWidth={3} />
            </button>
          </motion.div>
        )}
        {!r && saved && (
          <motion.div
            key="saved"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="pointer-events-auto rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg shadow-xl"
          >
            ⏱ {saved}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
