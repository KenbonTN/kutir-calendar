"use client";

import { motion, useReducedMotion } from "motion/react";

/** The big hand-drawn X. Each day gets its own slight tilt so a row of them looks drawn by hand. */
export function XMark({ seed, animate, className = "" }: { seed: number; animate: boolean; className?: string }) {
  const reduce = useReducedMotion();
  const tilt = ((seed * 37) % 11) - 5;
  const draw = animate && !reduce;
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={`pointer-events-none absolute inset-[10%] h-[80%] w-[80%] overflow-visible ${className}`}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {["M14 16 C38 40 60 62 86 86", "M84 14 C62 38 40 60 16 86"].map((d, i) => (
        <motion.path
          key={i}
          d={d}
          fill="none"
          stroke="var(--marker)"
          strokeWidth={10}
          strokeLinecap="round"
          initial={draw ? { pathLength: 0 } : false}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.22, delay: i * 0.14, ease: "easeOut" }}
        />
      ))}
    </svg>
  );
}
