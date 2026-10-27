"use client";

import { AnimatePresence, motion } from "motion/react";
import { Plus, Trash2, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { formatEt, formatGShort, WEEKDAYS, weekday } from "@/lib/ethiopian";
import {
  addExpense, birr, byCategory, CATEGORIES, category, deleteExpense, useExpenses, type CategoryKey, type Expense,
} from "@/lib/expenses";
import { periodLabel, periodRange, type Period } from "@/lib/screen";

const PERIODS: [Period, string][] = [["day", "Today"], ["week", "Week"], ["month", "Month"], ["year", "Year"]];

export function Money({ today }: { today: number }) {
  const expenses = useExpenses();
  const [period, setPeriod] = useState<Period>("month");
  const [from, to] = periodRange(period, today);
  const { total, rows } = useMemo(() => byCategory(expenses, from, to), [expenses, from, to]);
  const len = to - from + 1;
  const prev = useMemo(() => byCategory(expenses, from - len, from - 1).total, [expenses, from, len]);

  return (
    <div className="grid gap-6">
      <AddExpense today={today} />

      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold">
            <Wallet size={22} className="text-green" /> Spending
          </h2>
          <div className="flex rounded-full border border-line bg-surface p-1 text-sm font-semibold">
            {PERIODS.map(([p, label]) => (
              <button
                key={p}
                type="button"
                aria-pressed={period === p}
                onClick={() => setPeriod(p)}
                className={`rounded-full px-3 py-1 transition ${period === p ? "bg-ink text-bg" : "text-muted"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="card grid content-start gap-4 p-5 sm:p-6 lg:col-span-5">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{periodLabel(period, today)}</div>
              <div className="font-display text-4xl font-extrabold tabular-nums sm:text-5xl">{birr(total)}</div>
              <Insights total={total} prev={prev} period={period} days={len} top={rows[0]} />
            </div>
            <Donut rows={rows} total={total} />
          </div>

          <div className="card grid content-start gap-3 p-5 sm:p-6 lg:col-span-7">
            <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Where it went</h3>
            {rows.length === 0 && <p className="text-sm text-muted">No spending recorded for this period yet.</p>}
            {rows.map((r) => (
              <div key={r.key}>
                <div className="mb-1 flex justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2 font-semibold">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
                    <span className="truncate">{r.name}</span>
                    <span lang="am" className="hidden text-xs font-normal text-muted sm:inline">{r.am}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {birr(r.amount)} <span className="text-muted">· {Math.round((r.amount / total) * 100)}%</span>
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(r.amount / rows[0].amount) * 100}%`, background: r.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <History expenses={expenses.filter((e) => e.day >= from && e.day <= to)} today={today} />
    </div>
  );
}

function Insights({
  total, prev, period, days, top,
}: { total: number; prev: number; period: Period; days: number; top?: { name: string; amount: number } }) {
  if (!total) return <p className="text-sm text-muted">Add what you spend and this shows where your money goes.</p>;
  const lines: string[] = [];
  if (top) lines.push(`Most of it went to ${top.name.toLowerCase()} (${Math.round((top.amount / total) * 100)}%).`);
  if (days > 1) lines.push(`About ${birr(Math.round(total / days))} a day.`);
  if (prev > 0 && period !== "year") {
    const change = Math.round(((total - prev) / prev) * 100);
    const before = period === "day" ? "yesterday" : `the ${days} days before`;
    if (Math.abs(change) >= 5) lines.push(`${Math.abs(change)}% ${change > 0 ? "more" : "less"} than ${before}.`);
    else lines.push(`About the same as ${before}.`);
  }
  return (
    <div className="mt-1 grid gap-0.5 text-sm text-muted">
      {lines.map((l) => (
        <p key={l}>{l}</p>
      ))}
    </div>
  );
}

/** Category shares as a ring, biggest first. */
function Donut({ rows, total }: { rows: { key: string; color: string; amount: number }[]; total: number }) {
  if (!total) return null;
  const R = 52, C = 2 * Math.PI * R;
  // Where each slice starts along the ring: the running total of the slices before it.
  const slices = rows.map((r, i) => ({
    ...r,
    len: (r.amount / total) * C,
    start: rows.slice(0, i).reduce((a, x) => a + (x.amount / total) * C, 0),
  }));
  return (
    <svg viewBox="0 0 140 140" className="mx-auto size-40" role="img" aria-label="Spending by category">
      <circle cx="70" cy="70" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="18" />
      {slices.map((r) => (
        <circle
          key={r.key}
          cx="70" cy="70" r={R} fill="none" stroke={r.color} strokeWidth="18"
          strokeDasharray={`${Math.max(r.len - 1.5, 0.5)} ${C}`}
          strokeDashoffset={-r.start}
          transform="rotate(-90 70 70)"
        />
      ))}
    </svg>
  );
}

function AddExpense({ today }: { today: number }) {
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState<CategoryKey>("food");
  const [note, setNote] = useState("");
  const [day, setDay] = useState(today);
  const [added, setAdded] = useState<string | null>(null);
  const value = Number(amount.replace(/,/g, ""));
  const valid = value > 0 && value < 1e9;

  return (
    <section className="card grid gap-4 p-5 sm:p-6">
      <h2 className="font-display text-xl font-extrabold">Add an expense</h2>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          addExpense({ amount: Math.round(value * 100) / 100, category: cat, note: note.trim(), day });
          setAdded(`Added ${birr(value)} for ${category(cat).name.toLowerCase()}.`);
          setAmount("");
          setNote("");
          setDay(today);
        }}
      >
        <div className="flex flex-wrap gap-3">
          <label className="flex min-w-0 flex-[1_1_12rem] items-center gap-2 rounded-2xl border border-line bg-surface-2 px-4 focus-within:border-green">
            <input
              id="expense-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value.replace(/[^\d.,]/g, ""));
                setAdded(null);
              }}
              placeholder="0"
              aria-label="Amount in Birr"
              className="w-full min-w-0 bg-transparent py-3 font-display text-3xl font-extrabold tabular-nums outline-none focus-visible:outline-none"
            />
            <span className="shrink-0 font-semibold text-muted">Birr</span>
          </label>
          <input
            id="expense-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={80}
            placeholder="What was it? (optional)"
            className="min-w-0 flex-[2_1_14rem] rounded-2xl border border-line bg-surface-2 px-4 py-3 text-[15px]"
          />
        </div>

        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Category">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              role="radio"
              aria-checked={cat === c.key}
              onClick={() => setCat(c.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                cat === c.key ? "border-ink bg-ink text-bg" : "border-line text-muted hover:border-muted"
              }`}
            >
              <span className="size-2 rounded-full" style={{ background: c.color }} /> {c.name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {[
              [today, "Today"],
              [today - 1, "Yesterday"],
            ].map(([d, label]) => (
              <button
                key={label}
                type="button"
                aria-pressed={day === d}
                onClick={() => setDay(d as number)}
                className={`rounded-full border px-3 py-1.5 font-semibold ${day === d ? "border-green bg-green-soft text-green" : "border-line text-muted"}`}
              >
                {label}
              </button>
            ))}
            <select
              id="expense-day"
              aria-label="Another day"
              value={day < today - 1 ? day : ""}
              onChange={(e) => e.target.value && setDay(Number(e.target.value))}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-muted"
            >
              <option value="">Earlier…</option>
              {Array.from({ length: 28 }, (_, i) => today - 2 - i).map((d) => (
                <option key={d} value={d}>
                  {formatEt(d)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={!valid}
            className="inline-flex items-center gap-2 rounded-full bg-green px-5 py-2.5 font-semibold text-on-green transition active:scale-95 disabled:opacity-40"
          >
            <Plus size={17} /> Add
          </button>
        </div>
        {added && <p className="text-sm font-semibold text-green">{added}</p>}
      </form>
    </section>
  );
}

function History({ expenses, today }: { expenses: Expense[]; today: number }) {
  const [all, setAll] = useState(false);
  const days = useMemo(() => {
    const m = new Map<number, Expense[]>();
    for (const e of expenses) m.set(e.day, [...(m.get(e.day) ?? []), e]);
    return [...m.entries()];
  }, [expenses]);
  const shown = all ? days : days.slice(0, 7);
  if (!days.length) return null;

  return (
    <section className="grid gap-3">
      <h2 className="font-display text-xl font-extrabold">History</h2>
      <div className="card divide-y divide-line px-4 sm:px-6">
        {shown.map(([day, list]) => (
          <div key={day} className="py-3">
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-semibold">
                {day === today ? "Today" : day === today - 1 ? "Yesterday" : WEEKDAYS[weekday(day)]} · {formatEt(day)}
                <span className="font-normal text-muted"> · {formatGShort(day)}</span>
              </span>
              <span className="tabular-nums text-muted">{birr(list.reduce((a, e) => a + e.amount, 0))}</span>
            </div>
            <AnimatePresence initial={false}>
              {list.map((e) => {
                const c = category(e.category);
                return (
                  <motion.div
                    key={e.id}
                    layout
                    exit={{ opacity: 0, height: 0 }}
                    className="group flex items-center gap-3 py-1.5"
                  >
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                    <span className="min-w-0 flex-1 truncate text-[15px]">
                      {e.note || c.name}
                      {e.note && <span className="text-sm text-muted"> · {c.name}</span>}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">{birr(e.amount)}</span>
                    <button
                      type="button"
                      onClick={() => deleteExpense(e.id)}
                      aria-label={`Delete ${e.note || c.name}, ${birr(e.amount)}`}
                      className="shrink-0 p-1 text-muted opacity-60 hover:text-marker sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ))}
      </div>
      {days.length > 7 && (
        <button type="button" onClick={() => setAll(!all)} className="justify-self-center text-sm font-semibold text-green">
          {all ? "Show fewer days" : `Show all ${days.length} days`}
        </button>
      )}
    </section>
  );
}
