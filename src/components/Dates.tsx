"use client";

import { AnimatePresence, motion } from "motion/react";
import { Bell, Gift, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { formatEt, formatGShort } from "@/lib/ethiopian";
import {
  addEvent, between, deleteEvent, KINDS, kind, REMIND_OPTIONS, saveEvent, useEvents, whenLabel, type DateEvent, type KindKey,
} from "@/lib/events";
import type { Cal } from "@/lib/months";
import { useStored } from "@/lib/storage";
import { CalSwitch, DatePicker } from "./NewGoalForm";

const label = "text-xs font-bold uppercase tracking-[0.12em] text-muted";
const YEARLY: KindKey[] = ["birthday", "anniversary", "memorial"];

/** Add or edit a birthday or another important date. */
export function EventForm({
  today, day, existing, onDone,
}: { today: number; day?: number; existing?: DateEvent; onDone: () => void }) {
  const [cal, setCal] = useStored<Cal>("kutir-event-cal", "ethiopian");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [k, setK] = useState<KindKey>(existing?.kind ?? "birthday");
  const [date, setDate] = useState(existing?.date ?? day ?? today);
  const [yearly, setYearly] = useState(existing?.yearly ?? true);
  const [hasYear, setHasYear] = useState(existing?.hasYear ?? false);
  const [remind, setRemind] = useState(existing?.remind ?? 1);
  const [note, setNote] = useState(existing?.note ?? "");
  const repeatCal = existing?.cal ?? cal;

  const placeholder =
    k === "birthday" ? "Whose birthday? e.g. Mom, Abel" : k === "anniversary" ? "e.g. Our wedding" : k === "memorial" ? "e.g. Grandfather's tazkar" : "What is it?";

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        const rec = { title: title.trim(), kind: k, date, cal: repeatCal, yearly, hasYear: yearly && hasYear, remind, note: note.trim() };
        if (existing) saveEvent({ ...existing, ...rec, note: rec.note || undefined });
        else addEvent(rec);
        onDone();
      }}
    >
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Kind of date">
        {KINDS.map((x) => (
          <button
            key={x.key}
            type="button"
            role="radio"
            aria-checked={k === x.key}
            onClick={() => {
              setK(x.key);
              if (!existing) setYearly(YEARLY.includes(x.key));
            }}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${k === x.key ? "border-ink bg-ink text-bg" : "border-line text-muted hover:border-muted"}`}
          >
            {x.emoji} {x.name}
          </button>
        ))}
      </div>
      <input
        id="event-title"
        value={title}
        maxLength={80}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[15px]"
      />
      <fieldset className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <legend className={label}>{k === "birthday" ? "Birth date" : "Date"}</legend>
          {!existing && <CalSwitch cal={cal} setCal={setCal} id="event-cal" />}
        </div>
        <DatePicker value={date} onChange={setDate} cal={repeatCal} id="event-date" years={yearly ? [-100, 3] : [-1, 5]} anchor={today} />
        <p className="text-xs text-muted">{formatEt(date)} · {formatGShort(date)}</p>
      </fieldset>
      <div className="grid gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={yearly} onChange={(e) => setYearly(e.target.checked)} className="size-4 accent-[var(--green)]" />
          Every year, on this {repeatCal === "ethiopian" ? "Ethiopian" : "Gregorian"} date
        </label>
        {yearly && (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={hasYear} onChange={(e) => setHasYear(e.target.checked)} className="size-4 accent-[var(--green)]" />
            The year is right {k === "birthday" ? "(shows their age)" : "(shows how many years)"}
          </label>
        )}
      </div>
      <label className="grid gap-1.5">
        <span className={label}>Remind me</span>
        <select id="event-remind" value={remind} onChange={(e) => setRemind(+e.target.value)} className="w-fit rounded-full border border-line bg-surface px-3 py-1.5 text-sm">
          {REMIND_OPTIONS.map(([n, l]) => <option key={n} value={n}>{l}</option>)}
        </select>
      </label>
      <input
        id="event-note"
        value={note}
        maxLength={140}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional): gift idea, phone number…"
        className="rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[15px]"
      />
      <button type="submit" disabled={!title.trim()} className="rounded-full bg-green py-3 font-semibold text-on-green disabled:opacity-40">
        {existing ? "Save" : "Add date"}
      </button>
    </form>
  );
}

/** One date in a list, with its next occurrence. */
export function EventRow({
  ev, day, years, today, onEdit,
}: { ev: DateEvent; day: number; years: string | null; today: number; onEdit?: () => void }) {
  const [armed, setArmed] = useState(false);
  return (
    <div className="group flex items-center gap-3 py-2.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-xl">{kind(ev.kind).emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">
          {ev.title}
          {years && <span className="font-normal text-muted"> · {years}</span>}
        </div>
        <div className="text-sm text-muted">
          {formatEt(day)} · {formatGShort(day)}
          {ev.note && <span> · {ev.note}</span>}
        </div>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${day === today ? "bg-gold text-bg" : "bg-surface-2 text-muted"}`}>
        {whenLabel(day, today)}
      </span>
      {onEdit && (
        <button type="button" onClick={onEdit} aria-label={`Edit ${ev.title}`} className="shrink-0 p-1 text-muted opacity-60 hover:text-ink sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100">
          <Pencil size={14} />
        </button>
      )}
      <button
        type="button"
        onClick={() => (armed ? deleteEvent(ev.id) : (setArmed(true), setTimeout(() => setArmed(false), 3000)))}
        aria-label={armed ? `Tap again to delete ${ev.title}` : `Delete ${ev.title}`}
        className={`shrink-0 p-1 transition ${armed ? "text-marker" : "text-muted opacity-60 hover:text-marker sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"}`}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

/** Calendar tab section: every birthday and important date, next one first. */
export function ImportantDates({
  today, onAdd, onEdit,
}: { today: number; onAdd: () => void; onEdit: (ev: DateEvent) => void }) {
  const events = useEvents();
  const [all, setAll] = useState(false);
  const list = useMemo(() => {
    // Each date once, at its next occurrence within a year.
    const seen = new Set<string>();
    return between(events, today, today + 400).filter((o) => !seen.has(o.ev.id) && seen.add(o.ev.id));
  }, [events, today]);
  const shown = all ? list : list.slice(0, 8);

  return (
    <section className="card grid content-start gap-2 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
          <Gift size={20} className="text-marker" /> Birthdays & dates
        </h2>
        <button type="button" onClick={onAdd} className="inline-flex items-center gap-1 rounded-full bg-green px-3 py-1.5 text-sm font-semibold text-on-green">
          <Plus size={15} /> Add
        </button>
      </div>
      {list.length === 0 ? (
        <div className="grid gap-2 py-2 text-sm text-muted">
          <p>Add the birthdays of the people you love, anniversaries, tazkar days, appointments and deadlines.</p>
          <p className="flex items-center gap-1.5"><Bell size={14} /> They show on the calendar and you get reminded before each one.</p>
        </div>
      ) : (
        <div className="divide-y divide-line">
          <AnimatePresence initial={false}>
            {shown.map((o) => (
              <motion.div key={o.ev.id} layout exit={{ opacity: 0, height: 0 }}>
                <EventRow ev={o.ev} day={o.day} years={o.years} today={today} onEdit={() => onEdit(o.ev)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      {list.length > 8 && (
        <button type="button" onClick={() => setAll(!all)} className="justify-self-start text-sm font-semibold text-green">
          {all ? "Show fewer" : `Show all ${list.length}`}
        </button>
      )}
    </section>
  );
}
