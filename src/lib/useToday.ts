"use client";

import { useEffect, useState } from "react";
import { dateToJdn } from "./ethiopian";

/** Today's JDN on this device (null during the static render), plus a clock that ticks each minute. */
export function useToday() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 60_000);
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return { today: now == null ? null : dateToJdn(new Date(now)), now };
}

export function countdown(iso: string, now: number) {
  const ms = Date.parse(iso) - now;
  if (ms <= 0) return ms > -2 * 3600e3 ? "Live now" : "Played";
  const mins = Math.floor(ms / 60e3);
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
  if (d >= 2) return `in ${d} days`;
  if (d === 1) return `in 1 day ${h}h`;
  if (h) return `in ${h}h ${m}m`;
  return `in ${m} min`;
}
