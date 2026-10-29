"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowDownLeft, ArrowUpRight, Briefcase, Plus, Trash2, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { formatEt, formatGShort, WEEKDAYS, weekday } from "@/lib/ethiopian";
import {
  addExpense, birr, byCategory, CATEGORIES, category, deleteExpense, useExpenses, type CategoryKey, type Expense,
} from "@/lib/expenses";
import { useAreas } from "@/lib/areas";
import {
  addIncome, bySource, deleteIncome, ownSources, SOURCES, sourceOf, useIncome, type Income, type SourceKey,
} from "@/lib/income";
import { periodLabel, periodRange, type Period } from "@/lib/screen";
import { Counter, Reveal } from "./Motion";
import { Budgets, Debts, Equbs, ProfitTrend } from "./MoneyPlans";

const PERIODS: [Period, string][] = [["day", "Today"], ["week", "Week"], ["month", "Month"], ["year", "Year"]];

export function Money({ today }: { today: number }) {
  const expenses = useExpenses();
  const income = useIncome();
  const [period, setPeriod] = useState<Period>("month");
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [from, to] = periodRange(period, today);
  const { total, rows } = useMemo(() => byCategory(expenses, from, to), [expenses, from, to]);
  const earned = useMemo(() => bySource(income, from, to), [income, from, to]);
  const len = to - from + 1;
  const prev = useMemo(() => byCategory(expenses, from - len, from - 1).total, [expenses, from, len]);
  const net = earned.total - total;

  return (
    <div className="grid gap-6">
      <section className="card grid gap-4 p-5 sm:p-6">
        <div className="flex w-fit rounded-full border border-line bg-surface-2 p-1 text-sm font-semibold" role="tablist" aria-label="Add">
          {([["expense", "Money out", ArrowUpRight], ["income", "Money in", ArrowDownLeft]] as const).map(([k, l, Icon]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              onClick={() => setKind(k)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 transition ${kind === k ? (k === "income" ? "bg-green text-on-green" : "bg-ink text-bg") : "text-muted"}`}
            >
              <Icon size={15} /> {l}
            </button>
          ))}
        </div>
        {kind === "expense" ? <AddExpense today={today} /> : <AddIncome today={today} income={income} />}
      </section>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Tile label="Money in" value={earned.total} tone="text-green" />
        <Tile label="Money out" value={total} tone="text-marker" />
        <Tile label={net >= 0 ? "Left over" : "Overspent"} value={Math.abs(net)} tone={net >= 0 ? "" : "text-marker"} sub={periodLabel(period, today)} />
      </div>

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

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Reveal><Budgets today={today} expenses={expenses} /></Reveal>
        <Reveal delay={0.05}><ProfitTrend today={today} income={income} expenses={expenses} /></Reveal>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Reveal><IncomeCard rows={earned.rows} total={earned.total} /></Reveal>
        <Reveal delay={0.05}><ByBusiness expenses={expenses} income={income} from={from} to={to} /></Reveal>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Reveal><Equbs today={today} /></Reveal>
        <Reveal delay={0.05}><Debts today={today} /></Reveal>
      </div>

      <History
        expenses={expenses.filter((e) => e.day >= from && e.day <= to)}
        income={income.filter((e) => e.day >= from && e.day <= to)}
        today={today}
      />
    </div>
  );
}

function Tile({ label, value, tone, sub }: { label: string; value: number; tone: string; sub?: string }) {
  return (
    <div className="card card-hover min-w-0 p-3 sm:p-5">
      <div className="truncate text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{label}</div>
      <div className={`truncate font-display text-lg font-extrabold tabular-nums sm:text-3xl ${tone}`}><Counter value={value} /></div>
      <div className="truncate text-xs text-muted">{sub ?? "Birr"}</div>
    </div>
  );
}

const birrFmt = (n: number) => new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(n);

function IncomeCard({ rows, total }: { rows: { key: string; name: string; color: string; amount: number }[]; total: number }) {
  return (
    <section className="card grid content-start gap-3 p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
        <ArrowDownLeft size={20} className="text-green" /> Where money came from
      </h2>
      {rows.length === 0 && <p className="text-sm text-muted">No income recorded for this period yet. Switch to “Money in” above to add it.</p>}
      {rows.map((r) => (
        <div key={r.key}>
          <div className="mb-1 flex justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2 font-semibold">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
              <span className="truncate">{r.name}</span>
            </span>
            <span className="shrink-0 tabular-nums">
              {birr(r.amount)} <span className="text-muted">· {Math.round((r.amount / total) * 100)}%</span>
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full" style={{ width: `${(r.amount / rows[0].amount) * 100}%`, background: r.color }} />
          </div>
        </div>
      ))}
    </section>
  );
}

/** In, out and what's left for each business and organization money was tagged with. */
function ByBusiness({ expenses, income, from, to }: { expenses: Expense[]; income: Income[]; from: number; to: number }) {
  const areas = useAreas();
  const rows = useMemo(() => {
    const m = new Map<string, { in: number; out: number }>();
    for (const e of expenses) if (e.area && e.day >= from && e.day <= to) {
      const r = m.get(e.area) ?? { in: 0, out: 0 };
      r.out += e.amount;
      m.set(e.area, r);
    }
    for (const i of income) if (i.area && i.day >= from && i.day <= to) {
      const r = m.get(i.area) ?? { in: 0, out: 0 };
      r.in += i.amount;
      m.set(i.area, r);
    }
    return [...m.entries()].map(([id, v]) => ({ ...areas.info(id), id, ...v })).sort((a, b) => b.in + b.out - (a.in + a.out));
  }, [expenses, income, from, to, areas]);

  return (
    <section className="card grid content-start gap-3 p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
        <Briefcase size={20} className="text-green" /> By business & work
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">
          Choose a business or organization when you add money in or out, and see what each one brings in and costs.
          Add your businesses under Pool → Life areas.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((r) => {
            const net = r.in - r.out;
            return (
              <li key={r.id} className="flex items-center gap-3 py-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl text-lg" style={{ background: `${r.color ?? "#78716c"}22` }}>{r.emoji ?? "💼"}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{r.label ?? "Removed"}</div>
                  <div className="text-xs text-muted tabular-nums">
                    <span className="text-green">+{birrFmt(r.in)}</span> in · <span className="text-marker">−{birrFmt(r.out)}</span> out
                  </div>
                </div>
                <span className={`shrink-0 font-display font-extrabold tabular-nums ${net >= 0 ? "text-green" : "text-marker"}`}>
                  {net >= 0 ? "+" : "−"}{birrFmt(Math.abs(net))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Businesses and organizations, for tagging money. */
function BizSelect({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  const areas = useAreas();
  const groups = ["business", "work"].map((g) => areas.byId.get(g)).filter((a) => a && !a.deleted);
  return (
    <select id={id} aria-label="Business or organization" value={value} onChange={(e) => onChange(e.target.value)} className="min-w-0 rounded-full border border-line bg-surface px-3 py-1.5 text-sm">
      <option value="">Personal (no business)</option>
      {groups.map((g) => (
        <optgroup key={g!.id} label={`${g!.emoji} ${g!.name}`}>
          {areas.subs(g!.id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          {areas.subs(g!.id).length === 0 && <option value={g!.id}>{g!.name} (general)</option>}
        </optgroup>
      ))}
    </select>
  );
}

function AddIncome({ today, income }: { today: number; income: Income[] }) {
  const [amount, setAmount] = useState("");
  const [src, setSrc] = useState<SourceKey>("salary");
  const [label, setLabel] = useState("");
  const [area, setArea] = useState("");
  const [note, setNote] = useState("");
  const [day, setDay] = useState(today);
  const [added, setAdded] = useState<string | null>(null);
  const own = useMemo(() => ownSources(income), [income]);
  const value = Number(amount.replace(/,/g, ""));
  const valid = value > 0 && value < 1e9 && (src !== "other" || label.trim());

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        const rec = { amount: Math.round(value * 100) / 100, source: src, label: src === "other" ? label.trim() : "", area, note: note.trim(), day };
        addIncome(rec);
        setAdded(`Added ${birr(value)} from ${sourceOf(rec).name.toLowerCase()}.`);
        setAmount("");
        setNote("");
        setDay(today);
      }}
    >
      <div className="flex flex-wrap gap-3">
        <AmountInput id="income-amount" value={amount} onChange={(v) => { setAmount(v); setAdded(null); }} />
        <input
          id="income-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={80}
          placeholder="Note (optional): which client, which month…"
          className="min-w-0 flex-[2_1_14rem] rounded-2xl border border-line bg-surface-2 px-4 py-3 text-[15px]"
        />
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Source">
        {SOURCES.map((c) => (
          <button
            key={c.key}
            type="button"
            role="radio"
            aria-checked={src === c.key && !(c.key === "other" && own.includes(label))}
            onClick={() => {
              setSrc(c.key);
              if (c.key === "other") setLabel("");
            }}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
              src === c.key && !(c.key === "other" && own.includes(label)) ? "border-green bg-green text-on-green" : "border-line text-muted hover:border-muted"
            }`}
          >
            <span className="size-2 rounded-full" style={{ background: c.color }} /> {c.key === "other" ? "Other (write your own)" : c.name}
          </button>
        ))}
        {own.map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={src === "other" && label === l}
            onClick={() => {
              setSrc("other");
              setLabel(l);
            }}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${src === "other" && label === l ? "border-green bg-green text-on-green" : "border-dashed border-line text-muted hover:border-muted"}`}
          >
            {l}
          </button>
        ))}
      </div>
      {src === "other" && !own.includes(label) && (
        <input
          id="income-label"
          autoFocus
          value={label}
          maxLength={40}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Name this source, e.g. Tutoring, YouTube, Car rental"
          className="rounded-2xl border border-line bg-surface-2 px-4 py-3 text-[15px]"
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <DayChips today={today} day={day} setDay={setDay} id="income-day" />
          <BizSelect id="income-area" value={area} onChange={setArea} />
        </div>
        <button
          type="submit"
          disabled={!valid}
          className="inline-flex items-center gap-2 rounded-full bg-green px-5 py-2.5 font-semibold text-on-green transition active:scale-95 disabled:opacity-40"
        >
          <Plus size={17} /> Add income
        </button>
      </div>
      {added && <p className="text-sm font-semibold text-green">{added}</p>}
    </form>
  );
}

function AmountInput({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex min-w-0 flex-[1_1_12rem] items-center gap-2 rounded-2xl border border-line bg-surface-2 px-4 focus-within:border-green">
      <input
        id={id}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
        placeholder="0"
        aria-label="Amount in Birr"
        className="w-full min-w-0 bg-transparent py-3 font-display text-3xl font-extrabold tabular-nums outline-none focus-visible:outline-none"
      />
      <span className="shrink-0 font-semibold text-muted">Birr</span>
    </label>
  );
}

function DayChips({ today, day, setDay, id }: { today: number; day: number; setDay: (d: number) => void; id: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {([[today, "Today"], [today - 1, "Yesterday"]] as const).map(([d, l]) => (
        <button
          key={l}
          type="button"
          aria-pressed={day === d}
          onClick={() => setDay(d)}
          className={`rounded-full border px-3 py-1.5 font-semibold ${day === d ? "border-green bg-green-soft text-green" : "border-line text-muted"}`}
        >
          {l}
        </button>
      ))}
      <select
        id={id}
        aria-label="Another day"
        value={day < today - 1 ? day : ""}
        onChange={(e) => e.target.value && setDay(Number(e.target.value))}
        className="rounded-full border border-line bg-surface px-3 py-1.5 text-muted"
      >
        <option value="">Earlier…</option>
        {Array.from({ length: 60 }, (_, i) => today - 2 - i).map((d) => (
          <option key={d} value={d}>{formatEt(d)}</option>
        ))}
      </select>
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
  const [area, setArea] = useState("");
  const [day, setDay] = useState(today);
  const [added, setAdded] = useState<string | null>(null);
  const value = Number(amount.replace(/,/g, ""));
  const valid = value > 0 && value < 1e9;

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        addExpense({ amount: Math.round(value * 100) / 100, category: cat, note: note.trim(), day, area });
        setAdded(`Added ${birr(value)} for ${category(cat).name.toLowerCase()}.`);
        setAmount("");
        setNote("");
        setDay(today);
      }}
    >
      <div className="flex flex-wrap gap-3">
        <AmountInput id="expense-amount" value={amount} onChange={(v) => { setAmount(v); setAdded(null); }} />
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
        <div className="flex flex-wrap items-center gap-2">
          <DayChips today={today} day={day} setDay={setDay} id="expense-day" />
          <BizSelect id="expense-area" value={area} onChange={setArea} />
        </div>
        <button
          type="submit"
          disabled={!valid}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-semibold text-bg transition active:scale-95 disabled:opacity-40"
        >
          <Plus size={17} /> Add expense
        </button>
      </div>
      {added && <p className="text-sm font-semibold text-green">{added}</p>}
    </form>
  );
}

type Entry = { id: string; day: number; created: number; amount: number; title: string; sub?: string; color: string; incoming: boolean; remove: () => void };

function History({ expenses, income, today }: { expenses: Expense[]; income: Income[]; today: number }) {
  const areas = useAreas();
  const [all, setAll] = useState(false);
  const days = useMemo(() => {
    const entries: Entry[] = [
      ...expenses.map((e) => {
        const c = category(e.category);
        const biz = areas.info(e.area)?.name;
        return {
          id: e.id, day: e.day, created: e.created, amount: e.amount, incoming: false, color: c.color,
          title: e.note || c.name, sub: [e.note ? c.name : "", biz].filter(Boolean).join(" · "), remove: () => deleteExpense(e.id),
        };
      }),
      ...income.map((i) => {
        const src = sourceOf(i);
        const biz = areas.info(i.area)?.name;
        return {
          id: i.id, day: i.day, created: i.created, amount: i.amount, incoming: true, color: src.color,
          title: i.note || src.name, sub: [i.note ? src.name : "", biz].filter(Boolean).join(" · "), remove: () => deleteIncome(i.id),
        };
      }),
    ].sort((a, b) => b.day - a.day || b.created - a.created);
    const m = new Map<number, Entry[]>();
    for (const e of entries) m.set(e.day, [...(m.get(e.day) ?? []), e]);
    return [...m.entries()];
  }, [expenses, income, areas]);
  const shown = all ? days : days.slice(0, 7);
  if (!days.length) return null;

  return (
    <section className="grid gap-3">
      <h2 className="font-display text-xl font-extrabold">History</h2>
      <div className="card divide-y divide-line px-4 sm:px-6">
        {shown.map(([day, list]) => {
          const out = list.filter((e) => !e.incoming).reduce((a, e) => a + e.amount, 0);
          const inn = list.filter((e) => e.incoming).reduce((a, e) => a + e.amount, 0);
          return (
            <div key={day} className="py-3">
              <div className="mb-1 flex justify-between gap-2 text-sm">
                <span className="font-semibold">
                  {day === today ? "Today" : day === today - 1 ? "Yesterday" : WEEKDAYS[weekday(day)]} · {formatEt(day)}
                  <span className="font-normal text-muted"> · {formatGShort(day)}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted">
                  {inn > 0 && <span className="text-green">+{birrFmt(inn)} </span>}
                  {out > 0 && <span>−{birrFmt(out)}</span>}
                </span>
              </div>
              <AnimatePresence initial={false}>
                {list.map((e) => (
                  <motion.div key={e.id} layout exit={{ opacity: 0, height: 0 }} className="group flex items-center gap-3 py-1.5">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: e.color }} />
                    <span className="min-w-0 flex-1 truncate text-[15px]">
                      {e.title}
                      {e.sub && <span className="text-sm text-muted"> · {e.sub}</span>}
                    </span>
                    <span className={`shrink-0 font-semibold tabular-nums ${e.incoming ? "text-green" : ""}`}>
                      {e.incoming ? "+" : "−"}{birr(e.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={e.remove}
                      aria-label={`Delete ${e.title}, ${birr(e.amount)}`}
                      className="shrink-0 p-1 text-muted opacity-60 hover:text-marker sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      {days.length > 7 && (
        <button type="button" onClick={() => setAll(!all)} className="justify-self-center text-sm font-semibold text-green">
          {all ? "Show fewer days" : `Show all ${days.length} days`}
        </button>
      )}
    </section>
  );
}
