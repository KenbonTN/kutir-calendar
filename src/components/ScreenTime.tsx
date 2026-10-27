"use client";

import { Hourglass, Smartphone } from "lucide-react";
import { useMemo, useState } from "react";
import { formatEt, fromJdn, MONTHS, toJdn, monthLength } from "@/lib/ethiopian";
import {
  APPS, fmt, logScreen, periodLabel, periodRange, sumRange, total, wasteMessages,
  type AppKey, type Period, type ScreenLog,
} from "@/lib/screen";
import type { Task } from "@/lib/tasks";

/** Hours and minutes for each app, as read off Settings → Screen Time. */
export function ScreenLogForm({
  day, existing, onSaved,
}: { day: number; existing?: ScreenLog; onSaved?: () => void }) {
  const init = (k: AppKey) => {
    const m = existing?.[k] ?? 0;
    return { h: m ? String(Math.floor(m / 60)) : "", m: m ? String(m % 60) : "" };
  };
  const [vals, setVals] = useState(() => ({ tiktok: init("tiktok"), instagram: init("instagram"), youtube: init("youtube") }));
  const [saved, setSaved] = useState(false);
  const mins = (k: AppKey) => (Number(vals[k].h) || 0) * 60 + (Number(vals[k].m) || 0);

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        logScreen(day, { tiktok: mins("tiktok"), instagram: mins("instagram"), youtube: mins("youtube") });
        setSaved(true);
        onSaved?.();
      }}
    >
      <div className="grid gap-2">
        {APPS.map((a) => (
          <div key={a.key} className="flex items-center gap-3">
            <span className="flex w-24 items-center gap-2 text-sm font-semibold">
              <span className="size-2.5 rounded-full" style={{ background: a.color }} /> {a.name}
            </span>
            {(["h", "m"] as const).map((unit) => (
              <label key={unit} className="flex items-center gap-1 text-sm text-muted">
                <input
                  id={`screen-${day}-${a.key}-${unit}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={unit === "h" ? 23 : 59}
                  value={vals[a.key][unit]}
                  placeholder="0"
                  onChange={(e) => {
                    setSaved(false);
                    setVals({ ...vals, [a.key]: { ...vals[a.key], [unit]: e.target.value } });
                  }}
                  className="w-14 rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-center text-[15px] text-ink tabular-nums"
                />
                {unit}
              </label>
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg active:scale-95">
          {existing ? "Update" : "Save"} screen time
        </button>
        {saved && <span className="text-sm text-green">Saved · {fmt(mins("tiktok") + mins("instagram") + mins("youtube"))}</span>}
      </div>
      <p className="text-xs text-muted">On your iPhone: Settings → Screen Time → See All App &amp; Website Activity → pick the day.</p>
    </form>
  );
}

const PERIODS: [Period, string][] = [["day", "Today"], ["week", "Week"], ["month", "Month"], ["year", "Year"]];

export function ScreenDashboard({
  today, logs, tasks, onLogToday,
}: { today: number; logs: Map<number, ScreenLog>; tasks: Task[]; onLogToday: () => void }) {
  const [period, setPeriod] = useState<Period>("week");
  const [from, to] = periodRange(period, today);
  const sums = sumRange(logs, from, to);
  const sum = total(sums);
  const week = sumRange(logs, today - 7, today - 1);
  const weekAvg = week.days ? total(week) / week.days : 0;
  const postponed = useMemo(
    () => tasks.filter((t) => t.missed.some((d) => d >= from && d <= to)).length,
    [tasks, from, to],
  );
  const messages = wasteMessages({ period, mins: sums, days: sums.days, weekAvg, postponed, seed: today });
  const todayLogged = logs.has(today);

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold">
          <Hourglass size={22} className="text-marker" /> Time on social apps
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
            <div className="font-display text-5xl font-extrabold tabular-nums">{sums.days ? fmt(sum) : "—"}</div>
            <div className="text-sm text-muted">
              {sums.days
                ? `${sums.days} day${sums.days === 1 ? "" : "s"} logged${sums.days > 1 ? ` · ${fmt(sum / sums.days)} a day on average` : ""}`
                : "Nothing logged for this period yet."}
            </div>
          </div>
          <div className="grid gap-3">
            {APPS.map((a) => {
              const m = sums[a.key];
              return (
                <div key={a.key}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="flex items-center gap-2 font-semibold">
                      <span className="size-2.5 rounded-full" style={{ background: a.color }} /> {a.name}
                    </span>
                    <span className="tabular-nums text-muted">{fmt(m)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${sum ? (m / sum) * 100 : 0}%`, background: a.color }} />
                  </div>
                </div>
              );
            })}
          </div>
          {!todayLogged && (
            <button
              type="button"
              onClick={onLogToday}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-muted"
            >
              <Smartphone size={15} /> Log today&apos;s screen time
            </button>
          )}
        </div>

        <div className="card grid content-start gap-4 p-5 sm:p-6 lg:col-span-7">
          <Chart period={period} today={today} logs={logs} />
          <div className="grid gap-2">
            {messages.length === 0 ? (
              <p className="text-sm text-muted">
                Log your minutes each evening and this space will tell you what that time adds up to, and what else it could have been.
              </p>
            ) : (
              messages.map((m, i) => (
                <p key={i} className={i === 0 ? "font-display text-lg font-bold leading-snug" : "text-[15px] leading-snug"}>
                  {m}
                </p>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Stacked bars: days for day/week/month views, Ethiopian months for the year view. */
function Chart({ period, today, logs }: { period: Period; today: number; logs: Map<number, ScreenLog> }) {
  const e = fromJdn(today);
  type Bar = { label: string; title: string; v: Record<AppKey, number>; current: boolean };
  let bars: Bar[];
  if (period === "year") {
    bars = Array.from({ length: e.m }, (_, i) => {
      const first = toJdn(e.y, i + 1, 1);
      const s = sumRange(logs, first, Math.min(today, first + monthLength(e.y, i + 1) - 1));
      return { label: MONTHS[i].slice(0, 3), title: MONTHS[i], v: s, current: i + 1 === e.m };
    });
  } else {
    const [from] = period === "month" ? periodRange("month", today) : [today - 13];
    bars = [];
    for (let d = from; d <= today; d++) {
      const l = logs.get(d);
      bars.push({
        label: String(fromJdn(d).d),
        title: formatEt(d),
        v: { tiktok: l?.tiktok ?? 0, instagram: l?.instagram ?? 0, youtube: l?.youtube ?? 0 },
        current: d === today,
      });
    }
  }
  // Round the scale up to whole hours (at least 2) so the guide lines read 1h, 2h, 3h…
  const max = Math.max(2, Math.ceil(Math.max(...bars.map((b) => total(b.v))) / 60)) * 60;
  const H = 140;
  const ticks = max <= 240 ? Array.from({ length: max / 60 }, (_, i) => (i + 1) * 60) : [max / 2, max];

  return (
    <div>
      <div className="relative flex h-[140px] items-end gap-[3px] border-b border-line pl-10">
        {ticks.map((t) => (
          <div key={t} className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-line" style={{ bottom: (t / max) * H }}>
            <span className="absolute -top-2 left-0 bg-surface pr-1 text-[10px] tabular-nums text-muted">{fmt(t)}</span>
          </div>
        ))}
        {bars.map((b, i) => {
          const tot = total(b.v);
          return (
            <div key={i} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end" title={`${b.title}: ${fmt(tot)}`}>
              {APPS.map((a) =>
                b.v[a.key] ? (
                  <div key={a.key} style={{ height: (b.v[a.key] / max) * H, background: a.color }} className="w-full first:rounded-t-[3px]" />
                ) : null,
              ).reverse()}
              {!tot && <div className="h-[2px] w-full rounded bg-line" />}
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-[3px] pl-10">
        {bars.map((b, i) => (
          <div key={i} className={`min-w-0 flex-1 truncate text-center text-[9.5px] ${b.current ? "font-bold text-ink" : "text-muted"}`}>
            {bars.length > 16 && i % 3 && !b.current ? "" : b.label}
          </div>
        ))}
      </div>
    </div>
  );
}
