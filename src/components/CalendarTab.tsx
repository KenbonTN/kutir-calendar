"use client";

import { ChevronLeft, ChevronRight, Leaf, Star } from "lucide-react";
import { useMemo, useState } from "react";
import {
  fromJdn, geez, gregorianToJdn, jdnToDate, monthLength, MONTHS, MONTHS_AM, toJdn, weekday, WEEKDAYS,
  WEEKDAYS_AM_SHORT, formatEt, formatG,
} from "@/lib/ethiopian";
import { between, kind, type DateEvent, type Occurrence, useEvents } from "@/lib/events";
import { orthodoxDay } from "@/lib/orthodox";
import { useStored } from "@/lib/storage";
import { tasksOn, type Routine, type Task } from "@/lib/tasks";
import { EventForm, ImportantDates } from "./Dates";
import { Sheet } from "./Sheet";

type Mode = "ethiopian" | "gregorian";
const G_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** The whole calendar: Ethiopian or Gregorian months, both dates on every day, and what's coming up. */
export function CalendarTab({
  today, tasks, routines, onOpen,
}: { today: number; tasks: Task[]; routines: Routine[]; onOpen: (j: number) => void }) {
  const [mode, setMode] = useStored<Mode>("kutir-cal-mode", "ethiopian");
  const [offset, setOffset] = useState(0); // months away from the current one

  const month = useMemo(() => monthOf(mode, today, offset), [mode, today, offset]);
  const events = useEvents();
  const [form, setForm] = useState<{ ev?: DateEvent } | null>(null);
  const dated = useMemo(() => {
    const m = new Map<number, Occurrence[]>();
    for (const o of between(events, month.first, month.first + month.length - 1)) m.set(o.day, [...(m.get(o.day) ?? []), o]);
    return m;
  }, [events, month]);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-12">
      <section className="card grid content-start gap-4 p-3 sm:p-5 lg:col-span-8">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex rounded-full border border-line bg-surface-2 p-1 text-sm font-semibold">
            {(["ethiopian", "gregorian"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => {
                  setMode(m);
                  setOffset(0);
                }}
                className={`rounded-full px-3 py-1 transition ${mode === m ? "bg-ink text-bg" : "text-muted"}`}
              >
                {m === "ethiopian" ? "Ethiopian" : "Gregorian"}
              </button>
            ))}
          </div>
          {offset !== 0 && (
            <button type="button" onClick={() => setOffset(0)} className="text-sm font-semibold text-green">
              Back to today
            </button>
          )}
        </div>

        <header className="flex items-center justify-between gap-2 px-1">
          <button type="button" onClick={() => setOffset(offset - 1)} aria-label="Previous month" className="grid size-10 shrink-0 place-items-center rounded-full border border-line">
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-0 text-center">
            <h2 className="font-display text-2xl font-extrabold leading-tight sm:text-3xl">
              {month.title}
              {month.titleAm && <span lang="am" className="ml-2 text-lg text-green sm:text-xl">{month.titleAm}</span>}
            </h2>
            <p className="text-sm text-muted">{month.subtitle}</p>
          </div>
          <button type="button" onClick={() => setOffset(offset + 1)} aria-label="Next month" className="grid size-10 shrink-0 place-items-center rounded-full border border-line">
            <ChevronRight size={18} />
          </button>
        </header>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {WEEKDAYS.map((w, i) => (
            <div key={w} className="pb-1 text-center text-[11px] font-semibold leading-tight text-muted">
              {mode === "ethiopian" ? <span lang="am">{WEEKDAYS_AM_SHORT[i]}</span> : w.slice(0, 3)}
            </div>
          ))}
          {Array.from({ length: weekday(month.first) }, (_, i) => (
            <div key={`b${i}`} />
          ))}
          {Array.from({ length: month.length }, (_, i) => {
            const j = month.first + i;
            return <Cell key={j} j={j} mode={mode} today={today} tasks={tasks} routines={routines} dates={dated.get(j)} onOpen={onOpen} />;
          })}
        </div>
        <p className="px-1 text-xs text-muted">
          {mode === "ethiopian" ? "Big number: Ethiopian date. Small: Gregorian." : "Big number: Gregorian date. Small: Ethiopian."} Tap a day for its
          saint, feasts and tasks.
        </p>
      </section>

      <div className="grid content-start gap-6 lg:col-span-4">
        <ImportantDates today={today} onAdd={() => setForm({})} onEdit={(ev) => setForm({ ev })} />
        <ComingUp today={today} onOpen={onOpen} />
      </div>

      <Sheet open={form != null} onClose={() => setForm(null)} label={form?.ev ? "Edit date" : "Add a date"}>
        {form && (
          <div className="grid gap-4">
            <h2 className="pr-10 font-display text-2xl font-extrabold">{form.ev ? "Edit date" : "Add a birthday or date"}</h2>
            <EventForm today={today} existing={form.ev} onDone={() => setForm(null)} />
          </div>
        )}
      </Sheet>
    </div>
  );
}

function monthOf(mode: Mode, today: number, offset: number) {
  if (mode === "ethiopian") {
    const e = fromJdn(today);
    let y = e.y, m = e.m + offset;
    while (m > 13) { m -= 13; y++; }
    while (m < 1) { m += 13; y--; }
    const first = toJdn(y, m, 1);
    const length = monthLength(y, m);
    const a = jdnToDate(first), b = jdnToDate(first + length - 1);
    const g = (d: Date) => `${G_MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCDate()}`;
    return {
      first, length,
      title: `${MONTHS[m - 1]} ${y}`,
      titleAm: MONTHS_AM[m - 1],
      subtitle: `${g(a)} – ${g(b)}, ${b.getUTCFullYear()}`,
    };
  }
  const now = jdnToDate(today);
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1;
  const first = gregorianToJdn(y, m, 1);
  const length = gregorianToJdn(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1) - first;
  const ea = fromJdn(first), eb = fromJdn(first + length - 1);
  return {
    first, length,
    title: `${G_MONTHS[m - 1]} ${y}`,
    titleAm: null,
    subtitle:
      ea.m === eb.m
        ? `${MONTHS[ea.m - 1]} ${ea.y}`
        : `${MONTHS[ea.m - 1]} ${ea.d} – ${MONTHS[eb.m - 1]} ${eb.d}, ${eb.y}`,
  };
}

function Cell({
  j, mode, today, tasks, routines, dates, onOpen,
}: { j: number; mode: Mode; today: number; tasks: Task[]; routines: Routine[]; dates?: Occurrence[]; onOpen: (j: number) => void }) {
  const e = fromJdn(j);
  const g = jdnToDate(j);
  const od = orthodoxDay(j);
  const feast = od.feasts[0];
  const planned = j >= today ? tasksOn(j, tasks, routines, today).filter((t) => !t.done).length : 0;
  const big = mode === "ethiopian" ? e.d : g.getUTCDate();
  const small =
    mode === "ethiopian"
      ? g.getUTCDate() === 1 ? G_MONTHS[g.getUTCMonth()].slice(0, 3) + " 1" : String(g.getUTCDate())
      : e.d === 1 ? `${MONTHS[e.m - 1]} 1` : String(e.d);
  const isToday = j === today;

  return (
    <button
      type="button"
      onClick={() => onOpen(j)}
      aria-label={`${formatEt(j)}, ${formatG(j)}${feast ? `, ${feast.en}` : ""}${dates ? `, ${dates.map((o) => o.ev.title).join(", ")}` : ""}${isToday ? ", today" : ""}`}
      className={[
        "relative flex aspect-square min-w-0 flex-col justify-between gap-0.5 overflow-hidden rounded-xl border p-1 text-left transition hover:border-green sm:aspect-auto sm:min-h-[5.75rem] sm:rounded-2xl sm:p-2",
        isToday ? "border-gold ring-2 ring-gold/40" : "border-line",
        feast?.kind === "major" ? "bg-gold-soft" : feast?.kind === "national" ? "bg-green-soft" : j < today ? "bg-surface-2/50" : "bg-surface",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-1">
        <span className={`font-display text-[15px] font-bold leading-none tabular-nums sm:text-xl ${j < today ? "text-muted" : ""}`}>{big}</span>
        <span className="min-w-0 truncate font-mono text-[9px] leading-none text-muted sm:text-[10.5px]">{small}</span>
      </div>
      <span className="hidden min-w-0 text-[10.5px] leading-tight sm:line-clamp-2">
        {dates ? (
          <span className="font-semibold text-marker">
            {kind(dates[0].ev.kind).emoji} {dates[0].ev.title}
            {dates.length > 1 ? ` +${dates.length - 1}` : ""}
          </span>
        ) : feast ? (
          <span className={`font-semibold ${feast.kind === "national" ? "text-green" : "text-gold"}`}>
            {feast.kind === "major" && <Star size={9} className="mr-0.5 inline -translate-y-px" fill="currentColor" />}
            {feast.en.split(" · ")[0]}
          </span>
        ) : (
          <span className="text-muted">{od.monthly.en.split(" · ")[0]}</span>
        )}
      </span>
      <div className="flex items-end justify-between gap-1">
        <span lang="am" className="text-[9px] leading-none text-muted sm:hidden">
          {mode === "ethiopian" ? geez(e.d) : ""}
        </span>
        <span className="ml-auto flex items-center gap-1">
          {dates && <span className="text-[10px] leading-none sm:hidden">{kind(dates[0].ev.kind).emoji}</span>}
          {feast && !dates && <span className="size-1.5 rounded-full bg-gold sm:hidden" />}
          {planned > 0 && (
            <span className="rounded-md bg-surface-2 px-1 font-mono text-[9px] font-bold text-muted sm:text-[10px]">{planned}</span>
          )}
        </span>
      </div>
    </button>
  );
}

/** Feasts, national holidays and fasts in the next 120 days. */
function ComingUp({ today, onOpen }: { today: number; onOpen: (j: number) => void }) {
  const [more, setMore] = useState(false);
  const items = useMemo(() => {
    const out: { j: number; title: string; am: string; kind: "major" | "feast" | "national" | "fast" }[] = [];
    let prevFast = orthodoxDay(today - 1).fast?.en;
    for (let j = today; j < today + 120; j++) {
      const od = orthodoxDay(j);
      for (const f of od.feasts) out.push({ j, title: f.en, am: f.am, kind: f.kind });
      const fast = od.fast?.en;
      // Announce a fasting season when it starts (not the weekly Wednesday/Friday fasts).
      if (fast && fast !== prevFast && !/Wednesday|Friday/.test(fast)) out.push({ j, title: `${fast} begins`, am: od.fast!.am, kind: "fast" });
      prevFast = fast;
    }
    return out;
  }, [today]);
  const shown = more ? items : items.slice(0, 10);

  return (
    <section className="card grid content-start gap-2 p-5 sm:p-6">
      <h2 className="font-display text-xl font-extrabold">Coming up</h2>
      <p className="text-xs text-muted">Orthodox feasts, fasting seasons and national holidays in the next four months.</p>
      <ul className="divide-y divide-line">
        {shown.map((it, i) => {
          const days = it.j - today;
          return (
            <li key={`${it.j}-${i}`}>
              <button type="button" onClick={() => onOpen(it.j)} className="flex w-full items-start gap-3 py-2.5 text-left">
                <span className="mt-1 shrink-0">
                  {it.kind === "fast" ? (
                    <Leaf size={14} className="text-green" />
                  ) : (
                    <Star size={14} className={it.kind === "national" ? "text-green" : "text-gold"} fill={it.kind === "major" ? "currentColor" : "none"} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[15px] leading-snug ${it.kind === "major" ? "font-bold" : "font-semibold"}`}>{it.title}</span>
                  <span lang="am" className="block text-sm text-muted">{it.am}</span>
                  <span className="block text-xs text-muted">
                    {formatEt(it.j)} · {formatG(it.j)}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold tabular-nums text-muted">
                  {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {items.length > 10 && (
        <button type="button" onClick={() => setMore(!more)} className="justify-self-start text-sm font-semibold text-green">
          {more ? "Show fewer" : `Show all ${items.length}`}
        </button>
      )}
      <p className="text-xs text-muted">
        Muslim holidays (Eid al-Fitr, Eid al-Adha, Mawlid) follow the moon sighting and aren&apos;t listed yet.
      </p>
    </section>
  );
}
