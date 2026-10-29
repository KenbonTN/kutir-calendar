"use client";

// Small motion pieces used across the app: sections that rise in as they scroll
// into view, numbers that count up, and a burst of confetti for finished days.

import { animate, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Fades and lifts its content in the first time it scrolls into view. */
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18, filter: "blur(4px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "0px 0px -40px 0px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

const whole = (n: number) => Math.round(n).toLocaleString("en");

/** A number that counts from its previous value to the new one. */
export function Counter({ value, format = whole }: { value: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  const fmt = useRef(format);
  useEffect(() => {
    fmt.current = format;
  });
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    if (reduce) {
      el.textContent = fmt.current(value);
      from.current = value;
      return;
    }
    const c = animate(from.current, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (n) => (el.textContent = fmt.current(n)),
    });
    from.current = value;
    return () => c.stop();
  }, [value, inView, reduce]);
  return <span ref={ref}>{format(0)}</span>;
}

const BITS = ["#0b7a4b", "#3ddc91", "#f2b544", "#e0322b", "#8fa3ff", "#ffffff"];

/** Confetti that bursts once from the middle of its parent each time `fire` changes to a new number. */
export function Burst({ fire }: { fire: number }) {
  const reduce = useReducedMotion();
  const [shot, setShot] = useState<{ id: number; bits: { x: number; y: number; r: number; c: string; s: number }[] } | null>(null);
  useEffect(() => {
    if (!fire || reduce) return;
    // Random spread is worked out once per burst, in an effect, so renders stay pure.
    const bits = Array.from({ length: 36 }, (_, i) => {
      const a = (i / 36) * Math.PI * 2 + Math.random() * 0.4;
      const d = 70 + Math.random() * 110;
      return { x: Math.cos(a) * d, y: Math.sin(a) * d - 40, r: Math.random() * 540 - 270, c: BITS[i % BITS.length], s: 5 + Math.random() * 5 };
    });
    const t = setTimeout(() => setShot({ id: fire, bits }), 0);
    const t2 = setTimeout(() => setShot(null), 1600);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [fire, reduce]);
  if (!shot) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-20 grid place-items-center overflow-visible">
      {shot.bits.map((b, i) => (
        <motion.i
          key={`${shot.id}-${i}`}
          className="absolute block rounded-[2px]"
          style={{ width: b.s, height: b.s * 0.6, background: b.c }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
          animate={{ x: b.x, y: [0, b.y, b.y + 140], opacity: [1, 1, 0], rotate: b.r, scale: 1 }}
          transition={{ duration: 1.4, ease: "easeOut", times: [0, 0.45, 1] }}
        />
      ))}
    </div>
  );
}

/** The light behind the page. */
export function Aurora() {
  return <div aria-hidden className="aurora" />;
}

/** Which part of the day it is in Addis, for greetings and the hero's colours. */
export function partOfDay(now: number) {
  const h = new Date(now + 3 * 3600e3).getUTCHours();
  return h >= 5 && h < 12 ? "morning" : h >= 12 && h < 17 ? "day" : "evening";
}
