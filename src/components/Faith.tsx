"use client";

import { motion } from "motion/react";
import { BookOpen, Check, Minus, MoonStar, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { formatClock, weekday } from "@/lib/ethiopian";
import {
  CHRISTIAN, formatHijri, hhmm, islamicDay, prayerNow, PRAYERS, QURAN_PAGES, saveProfile, setPages, toggleDevotion,
  useDevotion, useProfile, type FaithKind, type Profile,
} from "@/lib/faith";
import { orthodoxDay } from "@/lib/orthodox";
import { useStored } from "@/lib/storage";


/** Asked once on the Today screen; can be changed later in Settings. */
export function FaithAsk() {
  const profile = useProfile();
  const [later, setLater] = useStored<boolean>("kutir-faith-later", false);
  if (profile.faith || later) return null;
  const choose = (faith: FaithKind) => saveProfile({ faith });
  const btn = "flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition hover:border-green active:scale-[0.99]";
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card grid gap-3 p-5 sm:p-6">
      <div>
        <h2 className="font-display text-xl font-extrabold">Would you like faith features?</h2>
        <p className="text-sm text-muted">Kutir can follow your faith: its calendar, a daily verse, prayer reminders and a way to track your practice.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <button type="button" onClick={() => choose("orthodox")} className={btn}>
          <span className="text-2xl">☦️</span>
          <span><b className="block">Orthodox Christian</b><span className="text-xs text-muted">Ethiopian Orthodox calendar, fasts, Bible verse, prayer and church</span></span>
        </button>
        <button type="button" onClick={() => choose("muslim")} className={btn}>
          <span className="text-2xl">☪️</span>
          <span><b className="block">Muslim</b><span className="text-xs text-muted">Prayer times and reminders, Hijri date, Quran verse and reading</span></span>
        </button>
        <button type="button" onClick={() => choose("other")} className={btn}>
          <span className="text-2xl">🌿</span>
          <span><b className="block">Neither, no thanks</b><span className="text-xs text-muted">Keep everyday quotes and the national calendar</span></span>
        </button>
      </div>
      <button type="button" onClick={() => setLater(true)} className="justify-self-start text-sm text-muted hover:text-ink">Ask me later (in Settings)</button>
    </motion.section>
  );
}

/* ---------- Muslims ---------- */

/** Today's five prayers: times, the next one with a countdown, ticks, and Quran reading. */
export function PrayerCard({ today, now }: { today: number; now: number }) {
  const profile = useProfile();
  const dev = useDevotion();
  const p = useMemo(() => prayerNow(today, now, profile), [today, now, profile]);
  const rec = dev.get(today);
  const done = new Set(rec?.done ?? []);
  const total = useMemo(() => [...dev.values()].reduce((a, d) => a + (d.pages ?? 0), 0), [dev]);
  const inKhatm = total % QURAN_PAGES;
  const left = p.next.at - p.mins;
  const special = islamicDay(today);

  return (
    <section className="card relative grid gap-4 overflow-clip p-5 sm:p-6">
      <div aria-hidden className="pointer-events-none absolute -right-6 -top-8 text-[7rem] leading-none opacity-[0.06]">☪</div>
      <div className="relative flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-extrabold"><MoonStar size={20} className="text-green" /> Prayer times</h2>
          <p className="text-sm text-muted">{formatHijri(today)} · {profile.place ?? "Addis Ababa"}</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Next: {p.next.name}</div>
          <div className="font-display text-2xl font-extrabold tabular-nums text-green">
            {left >= 60 ? `${Math.floor(left / 60)}h ${left % 60}m` : `${left}m`}
          </div>
        </div>
      </div>
      {special && (
        <p className={`relative rounded-xl px-3 py-2 text-sm font-semibold ${special.major ? "bg-gold-soft text-gold" : "bg-green-soft/70 text-green"}`}>
          ✨ {special.name}
        </p>
      )}
      <div className="relative grid grid-cols-5 gap-1.5">
        {p.list.map((x) => {
          const isNext = x.key === p.next.key && left < 24 * 60 - 1;
          const ticked = done.has(x.key);
          const passed = x.at <= p.mins;
          return (
            <button
              key={x.key}
              type="button"
              onClick={() => toggleDevotion(today, x.key)}
              aria-pressed={ticked}
              aria-label={`${x.name} at ${formatClock(hhmm(x.at))}${ticked ? ", prayed" : ""}`}
              className={`grid place-items-center gap-0.5 rounded-2xl border px-1 py-2.5 text-center transition active:scale-95 ${
                ticked ? "border-green bg-green text-on-green" : isNext ? "border-green bg-green-soft/60" : passed ? "border-marker/30" : "border-line bg-surface"
              }`}
            >
              <span className="text-[11px] font-bold uppercase">{x.name}</span>
              <span className="text-xs tabular-nums opacity-80">{formatClock(hhmm(x.at)).replace(" ", "")}</span>
              <span className="grid size-5 place-items-center">{ticked ? <Check size={14} strokeWidth={3} /> : <span lang="am" className="text-[10px] opacity-60">{x.am}</span>}</span>
            </button>
          );
        })}
      </div>
      <p className="relative text-xs text-muted">
        Tap a prayer once you&apos;ve prayed it · {done.size} of 5 today · sunrise {formatClock(hhmm(p.times.sunrise))}
      </p>
      <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <div className="flex items-center gap-2 text-sm">
          <BookOpen size={16} className="text-green" />
          <span className="font-semibold">Quran today</span>
          <button type="button" onClick={() => setPages(today, (rec?.pages ?? 0) - 1)} aria-label="One page less" className="grid size-7 place-items-center rounded-full border border-line"><Minus size={13} /></button>
          <span className="w-14 text-center font-display font-extrabold tabular-nums">{rec?.pages ?? 0} p</span>
          <button type="button" onClick={() => setPages(today, (rec?.pages ?? 0) + 1)} aria-label="One page more" className="grid size-7 place-items-center rounded-full border border-line"><Plus size={13} /></button>
          <button type="button" onClick={() => setPages(today, (rec?.pages ?? 0) + 20)} className="rounded-full border border-line px-2 py-0.5 text-xs font-semibold">+1 juz</button>
        </div>
        <div className="min-w-[10rem] flex-1">
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>Reading through: page {inKhatm} of {QURAN_PAGES}</span>
            {total >= QURAN_PAGES && <span>{Math.floor(total / QURAN_PAGES)}× completed</span>}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <motion.div className="h-full rounded-full bg-green" animate={{ width: `${(inKhatm / QURAN_PAGES) * 100}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Orthodox Christians ---------- */

/** Morning and evening prayer, Bible reading and church, ticked off for the day. */
export function ChristianCard({ today }: { today: number }) {
  const dev = useDevotion();
  const done = new Set(dev.get(today)?.done ?? []);
  const od = orthodoxDay(today);
  const churchDay = weekday(today) === 6 || od.feasts.some((f) => f.kind === "major");
  const items = CHRISTIAN.filter((c) => c.key !== "church" || churchDay);
  let streak = 0;
  for (let j = today - 1; (dev.get(j)?.done.length ?? 0) > 0; j--) streak++;
  return (
    <section className="card grid gap-3 p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">☦️ Today&apos;s devotion</h2>
        <span className="text-sm text-muted">{od.monthly.en}{streak >= 2 ? ` · ${streak}-day streak` : ""}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((c) => {
          const on = done.has(c.key);
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={on}
              onClick={() => toggleDevotion(today, c.key)}
              className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition active:scale-95 ${on ? "border-green bg-green text-on-green" : "border-line bg-surface hover:border-green"}`}
            >
              <span className="text-lg">{c.emoji}</span>
              <span className="min-w-0 flex-1">{c.name}</span>
              {on && <Check size={15} strokeWidth={3} />}
            </button>
          );
        })}
      </div>
      {churchDay && <p className="text-xs text-muted">{weekday(today) === 6 ? "Sunday" : od.feasts[0]?.en}: a day for church.</p>}
    </section>
  );
}

/* ---------- Life tab: the last 30 days ---------- */

export function FaithHistory({ today }: { today: number }) {
  const profile = useProfile();
  const dev = useDevotion();
  if (profile.faith !== "muslim" && profile.faith !== "orthodox") return null;
  const muslim = profile.faith === "muslim";
  const max = muslim ? 5 : 3;
  const days = Array.from({ length: 30 }, (_, i) => today - 29 + i);
  const full = days.filter((d) => (dev.get(d)?.done.filter((k) => !muslim || PRAYERS.some((p) => p.key === k)).length ?? 0) >= max).length;
  const pages = days.reduce((a, d) => a + (dev.get(d)?.pages ?? 0), 0);
  return (
    <section className="card grid gap-3 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
          {muslim ? <MoonStar size={20} className="text-green" /> : "☦️"} {muslim ? "Prayers" : "Devotion"}, last 30 days
        </h2>
        <span className="text-sm text-muted">
          {full} day{full === 1 ? "" : "s"} {muslim ? "with all 5 prayers" : "with prayer and Bible"}{muslim && pages ? ` · ${pages} Quran pages` : ""}
        </span>
      </div>
      <div className="grid grid-cols-10 gap-1.5 sm:grid-cols-15">
        {days.map((d) => {
          const n = Math.min(max, dev.get(d)?.done.length ?? 0);
          return (
            <div
              key={d}
              title={`${n} of ${max}`}
              className={`aspect-square rounded-md ${d === today ? "ring-2 ring-gold" : ""}`}
              style={{ background: n ? `color-mix(in oklab, var(--green) ${25 + (n / max) * 75}%, var(--surface-2))` : "var(--surface-2)" }}
            />
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Settings ---------- */

export function FaithSettings({ onRemind }: { onRemind: (on: boolean) => Promise<void> }) {
  const p = useProfile();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const set = (x: Partial<Profile>) => saveProfile(x);
  const sel = "rounded-full border border-line bg-surface px-3 py-1.5 text-sm";
  const locate = () => {
    setNote("Finding your location…");
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        set({ lat: +pos.coords.latitude.toFixed(4), lng: +pos.coords.longitude.toFixed(4), tz: -new Date().getTimezoneOffset() / 60, place: "My location" });
        setNote("Prayer times now follow your location.");
      },
      () => setNote("Couldn't get your location. Allow location for Kutir, or keep Addis Ababa."),
      { timeout: 10000 },
    );
  };
  const remind = async (on: boolean) => {
    setBusy(true);
    setNote(null);
    try {
      await onRemind(on);
      set({ remind: on });
      setNote(on ? "Prayer reminders are on for this device." : "Prayer reminders are off.");
    } catch (e) {
      setNote((e as Error).message === "denied" ? "Notifications are blocked. Allow them for Kutir, then try again." : (e as Error).message || "Couldn't change reminders.");
    }
    setBusy(false);
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-1.5">
        {([["orthodox", "☦️ Orthodox Christian"], ["muslim", "☪️ Muslim"], ["other", "🌿 Neither"]] as const).map(([k, l]) => (
          <button key={k} type="button" aria-pressed={p.faith === k} onClick={() => set({ faith: k })} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${p.faith === k ? "border-ink bg-ink text-bg" : "border-line text-muted"}`}>
            {l}
          </button>
        ))}
      </div>
      {p.faith === "muslim" && (
        <div className="grid gap-2 rounded-2xl bg-surface-2 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span>Prayer times for <b>{p.place ?? "Addis Ababa"}</b></span>
            <button type="button" onClick={locate} className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold">Use my location</button>
            {p.lat != null && <button type="button" onClick={() => set({ lat: undefined, lng: undefined, tz: undefined, place: undefined })} className="text-xs text-muted">Back to Addis Ababa</button>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select id="prayer-method" aria-label="Calculation method" value={p.method ?? "mwl"} onChange={(e) => set({ method: e.target.value as Profile["method"] })} className={sel}>
              <option value="mwl">Muslim World League</option>
              <option value="umm">Umm al-Qura (Makkah)</option>
              <option value="egypt">Egyptian Authority</option>
              <option value="karachi">Karachi</option>
              <option value="isna">ISNA (North America)</option>
            </select>
            <select id="prayer-asr" aria-label="Asr time" value={p.asr ?? "shafi"} onChange={(e) => set({ asr: e.target.value as Profile["asr"] })} className={sel}>
              <option value="shafi">Asr: Shafi&apos;i, Maliki, Hanbali</option>
              <option value="hanafi">Asr: Hanafi</option>
            </select>
          </div>
          <p className="text-xs text-muted">Check the times against your local mosque once; if they differ, try another method.</p>
        </div>
      )}
      {p.faith === "orthodox" && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface-2 p-3 text-sm">
          Remind me to pray at
          {[0, 1].map((i) => (
            <select
              key={i}
              id={`pray-time-${i}`}
              aria-label={i ? "Evening prayer time" : "Morning prayer time"}
              value={p.times?.[i] ?? (i ? "21:00" : "06:00")}
              onChange={(e) => {
                const times = [...(p.times ?? ["06:00", "21:00"])];
                times[i] = e.target.value;
                set({ times });
              }}
              className={sel}
            >
              {Array.from({ length: 48 }, (_, k) => `${String(Math.floor(k / 2)).padStart(2, "0")}:${k % 2 ? "30" : "00"}`)
                .filter((t) => (i ? t >= "17:00" : t >= "04:00" && t <= "11:30"))
                .map((t) => <option key={t} value={t}>{formatClock(t)}</option>)}
            </select>
          ))}
        </div>
      )}
      {(p.faith === "muslim" || p.faith === "orthodox") && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => remind(!p.remind)}
            className={`rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50 ${p.remind ? "border border-line text-muted" : "bg-green text-on-green"}`}
          >
            {p.remind ? "Turn off prayer reminders" : "Turn on prayer reminders"}
          </button>
          <span className="text-xs text-muted">Notifications can arrive up to about 10 minutes after the time.</span>
        </div>
      )}
      {note && <p className="text-sm">{note}</p>}
    </div>
  );
}
