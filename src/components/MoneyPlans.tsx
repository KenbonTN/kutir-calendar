"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Check, Coins, HandCoins, PiggyBank, Plus, Trash2, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useAreas } from "@/lib/areas";
import { formatEt, fromJdn, MONTHS, toJdn, monthLength } from "@/lib/ethiopian";
import { birr, CATEGORIES, category, type CategoryKey, type Expense } from "@/lib/expenses";
import { useT } from "@/lib/i18n";
import type { Income } from "@/lib/income";
import { monthlyProfit } from "@/lib/insights";
import {
  addDebt, addEqub, deleteDebt, deleteEqub, equbStatus, left, repay, roundDay, setBudget, togglePaid, useBudgets, useDebts, useEqubs,
  type Debt, type Equb,
} from "@/lib/money-plans";
import { Counter } from "./Motion";

const n0 = (n: number) => new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(n);
const input = "rounded-xl border border-line bg-surface px-3 py-2 text-[15px]";
const pill = "rounded-full border border-line bg-surface px-3 py-1.5 text-sm";

/** The current Ethiopian month, as [first day, last day]. */
export function thisMonth(today: number): [number, number] {
  const e = fromJdn(today);
  const first = toJdn(e.y, e.m, 1);
  return [first, first + monthLength(e.y, e.m) - 1];
}

/* ---------- Budgets ---------- */

export function Budgets({ today, expenses }: { today: number; expenses: Expense[] }) {
  const t = useT();
  const budgets = useBudgets();
  const [editing, setEditing] = useState(false);
  const [from, to] = thisMonth(today);
  const spent = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of expenses) if (e.day >= from && e.day <= to) m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
    return m;
  }, [expenses, from, to]);
  const daysIn = to - from + 1, dayOf = today - from + 1;
  const total = budgets.reduce((a, b) => a + b.amount, 0);
  const used = budgets.reduce((a, b) => a + (spent.get(b.category) ?? 0), 0);

  return (
    <section className="card grid content-start gap-4 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
          <PiggyBank size={20} className="text-gold" /> {t("Budgets")}
          <span className="text-sm font-semibold text-muted">· {MONTHS[fromJdn(today).m - 1]}</span>
        </h2>
        <button type="button" onClick={() => setEditing(!editing)} className="rounded-full border border-line px-3 py-1.5 text-sm font-semibold hover:border-muted">
          {editing ? "Done" : budgets.length ? "Edit" : "Set budgets"}
        </button>
      </div>
      {editing ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {CATEGORIES.map((c) => {
            const b = budgets.find((x) => x.category === c.key);
            return (
              <label key={c.key} className="flex items-center gap-2 text-sm">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                <input
                  id={`budget-${c.key}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  defaultValue={b?.amount ?? ""}
                  placeholder="—"
                  onBlur={(e) => {
                    const v = Math.max(0, Math.round(+e.target.value || 0));
                    if (v !== (b?.amount ?? 0)) setBudget(c.key as CategoryKey, v);
                  }}
                  className="w-28 rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-right tabular-nums"
                />
              </label>
            );
          })}
          <p className="text-xs text-muted sm:col-span-2">Birr per Ethiopian month. Leave empty for no limit.</p>
        </div>
      ) : budgets.length === 0 ? (
        <p className="text-sm text-muted">Give each kind of spending a monthly limit. Kutir shows how much is left and warns you before you go over.</p>
      ) : (
        <>
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="font-display text-3xl font-extrabold tabular-nums"><Counter value={Math.max(0, total - used)} /></div>
              <div className="text-xs text-muted">Birr left of {n0(total)} · day {dayOf} of {daysIn}</div>
            </div>
            <Ring pct={used / total} pace={dayOf / daysIn} />
          </div>
          <div className="grid gap-3">
            {budgets
              .map((b) => ({ b, c: category(b.category), s: spent.get(b.category) ?? 0 }))
              .sort((x, y) => y.s / y.b.amount - x.s / x.b.amount)
              .map(({ b, c, s }) => {
                const pct = s / b.amount;
                const ahead = pct > dayOf / daysIn + 0.1;
                return (
                  <div key={b.id}>
                    <div className="mb-1 flex justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2 font-semibold">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                        <span className="truncate">{c.name}</span>
                        {pct >= 1 ? (
                          <span className="rounded-full bg-marker px-1.5 text-[10px] font-bold text-white">OVER</span>
                        ) : ahead && pct >= 0.7 ? (
                          <AlertTriangle size={13} className="text-gold" aria-label="Spending faster than the month" />
                        ) : null}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted">
                        <span className={pct >= 1 ? "font-bold text-marker" : "text-ink"}>{n0(s)}</span> / {n0(b.amount)}
                      </span>
                    </div>
                    <div className="relative h-2.5 overflow-hidden rounded-full bg-surface-2">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: pct >= 1 ? "var(--marker)" : c.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(1, pct) * 100}%` }}
                        transition={{ type: "spring", damping: 22 }}
                      />
                      <i className="absolute inset-y-0 w-0.5 bg-ink/40" style={{ left: `${(dayOf / daysIn) * 100}%` }} title="Where you'd be at an even pace" />
                    </div>
                  </div>
                );
              })}
          </div>
          <p className="text-xs text-muted">The thin line is where you&apos;d be if you spent evenly through the month.</p>
        </>
      )}
    </section>
  );
}

function Ring({ pct, pace }: { pct: number; pace: number }) {
  const R = 26, C = 2 * Math.PI * R;
  const over = pct > pace + 0.1;
  return (
    <svg viewBox="0 0 64 64" className="size-16 -rotate-90" aria-hidden>
      <circle cx="32" cy="32" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="7" />
      <motion.circle
        cx="32" cy="32" r={R} fill="none" stroke={pct >= 1 ? "var(--marker)" : over ? "var(--gold)" : "var(--green)"} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - Math.min(1, pct)) }} transition={{ duration: 0.9 }}
      />
    </svg>
  );
}

/* ---------- Equb ---------- */

export function Equbs({ today }: { today: number }) {
  const t = useT();
  const equbs = useEqubs();
  const [adding, setAdding] = useState(false);
  return (
    <section className="card grid content-start gap-4 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
          <Coins size={20} className="text-gold" /> {t("Equb")}
        </h2>
        <button type="button" onClick={() => setAdding(!adding)} className="inline-flex items-center gap-1 rounded-full bg-green px-3 py-1.5 text-sm font-semibold text-on-green">
          <Plus size={15} /> Equb
        </button>
      </div>
      {adding && <AddEqub today={today} onDone={() => setAdding(false)} />}
      {equbs.length === 0 && !adding && (
        <p className="text-sm text-muted">Track each equb you&apos;re in: what you pay each round, which rounds you&apos;ve paid, and when your turn to collect comes.</p>
      )}
      {equbs.map((e) => <EqubCard key={e.id} e={e} today={today} />)}
    </section>
  );
}

function AddEqub({ today, onDone }: { today: number; onDone: () => void }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [every, setEvery] = useState(30);
  const [rounds, setRounds] = useState(12);
  const [mine, setMine] = useState(1);
  const [startIn, setStartIn] = useState(0);
  const start = today - startIn * every;
  return (
    <form
      className="grid gap-2 rounded-2xl bg-surface-2 p-3"
      onSubmit={(ev) => {
        ev.preventDefault();
        const a = +amount;
        if (!name.trim() || !(a > 0)) return;
        addEqub({ name: name.trim(), amount: a, every, rounds, mine: Math.min(mine, rounds), start });
        onDone();
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <input id="equb-name" autoFocus value={name} maxLength={50} onChange={(e) => setName(e.target.value)} placeholder="Name, e.g. Office equb" className={input} />
        <input id="equb-amount" type="number" inputMode="numeric" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Birr per round" className={input} />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select id="equb-every" aria-label="How often" value={every} onChange={(e) => setEvery(+e.target.value)} className={pill}>
          <option value={7}>Weekly</option>
          <option value={14}>Every 2 weeks</option>
          <option value={30}>Monthly</option>
        </select>
        <label className="flex items-center gap-1.5">
          <input id="equb-rounds" type="number" min={2} max={100} value={rounds} onChange={(e) => setRounds(Math.max(2, +e.target.value || 2))} className="w-16 rounded-lg border border-line bg-surface px-2 py-1.5" />
          members
        </label>
        <label className="flex items-center gap-1.5">
          my turn: round
          <input id="equb-mine" type="number" min={1} max={rounds} value={mine} onChange={(e) => setMine(Math.max(1, +e.target.value || 1))} className="w-14 rounded-lg border border-line bg-surface px-2 py-1.5" />
        </label>
        <label className="flex items-center gap-1.5">
          rounds done so far
          <input id="equb-done" type="number" min={0} max={rounds - 1} value={startIn} onChange={(e) => setStartIn(Math.max(0, +e.target.value || 0))} className="w-14 rounded-lg border border-line bg-surface px-2 py-1.5" />
        </label>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <span>Pot: {birr((+amount || 0) * rounds)} · first round {formatEt(start)}</span>
        <button type="submit" disabled={!name.trim() || !(+amount > 0)} className="rounded-full bg-green px-4 py-1.5 text-sm font-semibold text-on-green disabled:opacity-40">
          Add
        </button>
      </div>
    </form>
  );
}

function EqubCard({ e, today }: { e: Equb; today: number }) {
  const s = equbStatus(e, today);
  const [armed, setArmed] = useState(false);
  const toPayout = s.payout - today;
  return (
    <div className="grid gap-3 rounded-2xl border border-line p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold">{e.name}</div>
          <div className="text-xs text-muted">
            {birr(e.amount)} × {e.rounds} · pot {birr(s.pot)}
          </div>
        </div>
        <div className="text-right">
          <div className={`font-display text-lg font-extrabold ${toPayout === 0 ? "text-gold" : toPayout > 0 ? "text-green" : "text-muted"}`}>
            {toPayout > 0 ? `${toPayout}d` : toPayout === 0 ? "Today!" : "Collected"}
          </div>
          <div className="text-[11px] text-muted">your payout · {formatEt(s.payout)}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: e.rounds }, (_, i) => i + 1).map((r) => {
          const paid = e.paid.includes(r);
          const past = roundDay(e, r) <= today;
          return (
            <button
              key={r}
              type="button"
              onClick={() => togglePaid(e, r)}
              title={`Round ${r} · ${formatEt(roundDay(e, r))}${paid ? " · paid" : past ? " · not paid yet" : ""}`}
              className={`grid size-7 place-items-center rounded-lg text-[11px] font-bold tabular-nums transition active:scale-90 ${
                paid ? "bg-green text-on-green" : past ? "bg-marker/15 text-marker ring-1 ring-marker/40" : "bg-surface-2 text-muted"
              } ${r === e.mine ? "outline-2 outline-offset-1 outline-gold" : ""}`}
            >
              {r === e.mine ? "★" : r}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={s.unpaid.length ? "font-semibold text-marker" : "text-muted"}>
          {s.unpaid.length ? `${s.unpaid.length} round${s.unpaid.length > 1 ? "s" : ""} unpaid` : s.nextDay != null ? `Next payment ${formatEt(s.nextDay)}` : "All paid"}
          {" · "}paid {birr(s.paidTotal)}
        </span>
        <button
          type="button"
          onClick={() => (armed ? deleteEqub(e.id) : (setArmed(true), setTimeout(() => setArmed(false), 3000)))}
          className={armed ? "font-semibold text-marker" : "text-muted hover:text-marker"}
          aria-label={`Remove ${e.name}`}
        >
          {armed ? "Tap again" : <Trash2 size={13} />}
        </button>
      </div>
    </div>
  );
}

/* ---------- Debts ---------- */

export function Debts({ today }: { today: number }) {
  const t = useT();
  const debts = useDebts();
  const [adding, setAdding] = useState(false);
  const open = debts.filter((d) => left(d) > 0);
  const owed = open.filter((d) => d.dir === "owed").reduce((a, d) => a + left(d), 0);
  const owe = open.filter((d) => d.dir === "owe").reduce((a, d) => a + left(d), 0);
  const settled = debts.filter((d) => left(d) === 0);
  const [showSettled, setShowSettled] = useState(false);
  return (
    <section className="card grid content-start gap-4 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
          <HandCoins size={20} className="text-green" /> {t("Debts & loans")}
        </h2>
        <button type="button" onClick={() => setAdding(!adding)} className="inline-flex items-center gap-1 rounded-full bg-green px-3 py-1.5 text-sm font-semibold text-on-green">
          <Plus size={15} /> Add
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-green-soft/60 p-3">
          <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.1em] text-green"><ArrowDownLeft size={12} /> Owed to you</div>
          <div className="font-display text-2xl font-extrabold tabular-nums"><Counter value={owed} /></div>
        </div>
        <div className="rounded-2xl bg-marker/10 p-3">
          <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.1em] text-marker"><ArrowUpRight size={12} /> You owe</div>
          <div className="font-display text-2xl font-extrabold tabular-nums"><Counter value={owe} /></div>
        </div>
      </div>
      {adding && <AddDebt today={today} onDone={() => setAdding(false)} />}
      <div className="divide-y divide-line">
        <AnimatePresence initial={false}>
          {(showSettled ? debts : open).map((d) => (
            <motion.div key={d.id} layout exit={{ opacity: 0, height: 0 }}>
              <DebtRow d={d} today={today} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {debts.length === 0 && !adding && <p className="text-sm text-muted">Money you lent or borrowed, so nobody forgets. Add a due date to get a nudge.</p>}
      {settled.length > 0 && (
        <button type="button" onClick={() => setShowSettled(!showSettled)} className="justify-self-start text-sm font-semibold text-green">
          {showSettled ? "Hide settled" : `Show ${settled.length} settled`}
        </button>
      )}
    </section>
  );
}

function AddDebt({ today, onDone }: { today: number; onDone: () => void }) {
  const [dir, setDir] = useState<"owed" | "owe">("owed");
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState(0);
  const [note, setNote] = useState("");
  return (
    <form
      className="grid gap-2 rounded-2xl bg-surface-2 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!person.trim() || !(+amount > 0)) return;
        addDebt({ person: person.trim(), amount: +amount, dir, note, due: due ? today + due : undefined, day: today });
        onDone();
      }}
    >
      <div className="flex w-fit rounded-full border border-line bg-surface p-1 text-sm font-semibold">
        {([["owed", "I lent"], ["owe", "I borrowed"]] as const).map(([k, l]) => (
          <button key={k} type="button" aria-pressed={dir === k} onClick={() => setDir(k)} className={`rounded-full px-3 py-1 transition ${dir === k ? "bg-ink text-bg" : "text-muted"}`}>
            {l}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input id="debt-person" autoFocus value={person} maxLength={50} onChange={(e) => setPerson(e.target.value)} placeholder={dir === "owed" ? "Who borrowed?" : "Who lent you?"} className={input} />
        <input id="debt-amount" type="number" inputMode="numeric" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Birr" className={input} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select id="debt-due" aria-label="Pay back by" value={due} onChange={(e) => setDue(+e.target.value)} className={pill}>
          <option value={0}>No due date</option>
          {[7, 14, 30, 60, 90].map((d) => <option key={d} value={d}>In {d} days · {formatEt(today + d)}</option>)}
        </select>
        <input id="debt-note" value={note} maxLength={80} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className={`${pill} min-w-0 flex-1`} />
        <button type="submit" disabled={!person.trim() || !(+amount > 0)} className="rounded-full bg-green px-4 py-1.5 text-sm font-semibold text-on-green disabled:opacity-40">
          Add
        </button>
      </div>
    </form>
  );
}

function DebtRow({ d, today }: { d: Debt; today: number }) {
  const [paying, setPaying] = useState(false);
  const [amt, setAmt] = useState("");
  const [armed, setArmed] = useState(false);
  const l = left(d);
  const overdue = l > 0 && d.due != null && d.due < today;
  return (
    <div className="group py-2.5">
      <div className="flex items-center gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-full ${d.dir === "owed" ? "bg-green-soft text-green" : "bg-marker/10 text-marker"}`}>
          {d.dir === "owed" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className={`truncate font-semibold ${l === 0 ? "text-muted line-through" : ""}`}>
            {d.dir === "owed" ? `${d.person} owes you` : `You owe ${d.person}`}
          </div>
          <div className={`text-xs ${overdue ? "font-semibold text-marker" : "text-muted"}`}>
            {d.repaid > 0 && l > 0 && `${n0(d.repaid)} of ${n0(d.amount)} paid back · `}
            {d.due != null && l > 0 ? (overdue ? `${today - d.due} days overdue` : `due ${formatEt(d.due)}`) : formatEt(d.day)}
            {d.note && ` · ${d.note}`}
          </div>
        </div>
        <span className="shrink-0 font-display font-extrabold tabular-nums">{n0(l || d.amount)}</span>
        {l > 0 ? (
          <button type="button" onClick={() => setPaying(!paying)} className="shrink-0 rounded-full border border-line px-2.5 py-1 text-xs font-semibold hover:border-green hover:text-green">
            Paid back
          </button>
        ) : (
          <Check size={16} className="shrink-0 text-green" />
        )}
        <button
          type="button"
          onClick={() => (armed ? deleteDebt(d.id) : (setArmed(true), setTimeout(() => setArmed(false), 3000)))}
          aria-label={armed ? "Tap again to delete" : "Delete"}
          className={`shrink-0 p-1 ${armed ? "text-marker" : "text-muted opacity-60 hover:text-marker sm:opacity-0 sm:group-hover:opacity-100"}`}
        >
          <Trash2 size={13} />
        </button>
      </div>
      {paying && (
        <div className="ml-12 mt-2 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => { repay(d, l); setPaying(false); }} className="rounded-full bg-green px-3 py-1 text-xs font-semibold text-on-green">
            All of it ({n0(l)})
          </button>
          <input id={`repay-${d.id}`} type="number" min={1} max={l} value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="Part" className="w-24 rounded-full border border-line bg-surface px-3 py-1 text-xs" />
          <button type="button" disabled={!(+amt > 0)} onClick={() => { repay(d, +amt); setAmt(""); setPaying(false); }} className="rounded-full border border-line px-3 py-1 text-xs font-semibold disabled:opacity-40">
            Save
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Profit by month ---------- */

export function ProfitTrend({ today, income, expenses }: { today: number; income: Income[]; expenses: Expense[] }) {
  const t = useT();
  const areas = useAreas();
  const [pick, setPick] = useState("all");
  const tagged = useMemo(() => {
    const s = new Set<string>();
    for (const x of [...income, ...expenses]) if (x.area) s.add(x.area);
    return [...s].map((id) => areas.info(id)).filter((a): a is NonNullable<typeof a> => !!a);
  }, [income, expenses, areas]);
  const months = useMemo(() => {
    const filter = pick === "all" ? undefined : pick === "biz" ? (a?: string) => !!a : (a?: string) => a === pick;
    return monthlyProfit(income, expenses, today, 6, filter);
  }, [income, expenses, today, pick]);
  const max = Math.max(1, ...months.flatMap((m) => [m.inc, m.out]));
  const total = months.reduce((a, m) => a + m.profit, 0);

  return (
    <section className="card grid content-start gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
          <TrendingUp size={20} className="text-green" /> {t("Profit by month")}
        </h2>
        <select id="profit-area" aria-label="Whose money" value={pick} onChange={(e) => setPick(e.target.value)} className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm">
          <option value="all">Everything</option>
          {tagged.length > 0 && <option value="biz">All businesses & work</option>}
          {tagged.map((a) => <option key={a.id} value={a.id}>{a.emoji} {a.label}</option>)}
        </select>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`font-display text-3xl font-extrabold tabular-nums ${total >= 0 ? "text-green" : "text-marker"}`}>
          {total >= 0 ? "+" : "−"}<Counter value={Math.abs(total)} />
        </span>
        <span className="text-sm text-muted">Birr over 6 months</span>
      </div>
      <div className="grid grid-cols-6 items-end gap-2">
        {months.map((m, i) => (
          <div key={`${m.y}-${m.m}`} className="grid gap-1 text-center">
            <div className="flex h-32 items-end justify-center gap-0.5">
              <motion.div className="w-1/3 rounded-t-md bg-green" initial={{ height: 0 }} animate={{ height: `${(m.inc / max) * 100}%` }} transition={{ delay: i * 0.05, type: "spring", damping: 20 }} title={`In: ${birr(m.inc)}`} />
              <motion.div className="w-1/3 rounded-t-md bg-marker/70" initial={{ height: 0 }} animate={{ height: `${(m.out / max) * 100}%` }} transition={{ delay: i * 0.05 + 0.03, type: "spring", damping: 20 }} title={`Out: ${birr(m.out)}`} />
            </div>
            <div className={`text-[11px] font-bold tabular-nums ${m.profit >= 0 ? "text-green" : "text-marker"}`}>
              {m.profit === 0 ? "0" : `${m.profit > 0 ? "+" : "−"}${Math.abs(m.profit) >= 1000 ? `${n0(Math.abs(m.profit) / 1000)}k` : n0(Math.abs(m.profit))}`}
            </div>
            <div className="text-[10px] text-muted">{MONTHS[m.m - 1].slice(0, 3)}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-green" /> In</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-marker/70" /> Out</span>
      </div>
    </section>
  );
}
