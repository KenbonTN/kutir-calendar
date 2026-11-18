"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Inbox, NotebookPen, Pencil, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { formatEt } from "@/lib/ethiopian";
import { SCORE_FACES, saveJournal, useNotes, type DayNote, type Journal as JournalT } from "@/lib/notes";
import { backToPool } from "@/lib/pool";
import { addTask, deleteTask, moveTask, updateTask, type Task } from "@/lib/tasks";

const label = "text-xs font-bold uppercase tracking-[0.12em] text-muted";
const field = "w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[15px]";

/**
 * The evening journal: how the day felt, wins, what got in the way, gratitude and a
 * lesson. For today it also settles unfinished tasks and sets tomorrow's Top 3.
 */
export function Journal({ day, today, tasks }: { day: number; today: number; tasks: Task[] }) {
  const notes = useNotes();
  const note = notes.get(day);
  const [editing, setEditing] = useState(!note);
  const isToday = day === today;

  return (
    <section id="journal" className="card grid scroll-mt-24 gap-4 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
          <NotebookPen size={20} className="text-gold" /> {isToday ? "Today's journal" : `Journal · ${formatEt(day)}`}
        </h2>
        {note && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-sm font-semibold text-green">
            <Pencil size={13} /> Edit
          </button>
        )}
      </div>
      {note && !editing ? <Entry note={note} /> : <JournalForm day={day} note={note} onSaved={() => setEditing(false)} />}
      {isToday && <Unfinished day={day} tasks={tasks} />}
      {isToday && <TomorrowTop3 tomorrow={today + 1} tasks={tasks} />}
    </section>
  );
}

function Entry({ note }: { note: DayNote }) {
  return (
    <div className="grid gap-2 text-sm">
      {(note.rating || note.mood || note.energy) && (
        <div className="flex flex-wrap gap-2">
          {note.rating ? <Chip>Day {SCORE_FACES[note.rating]} {note.rating}/5</Chip> : null}
          {note.mood ? <Chip>Mood {SCORE_FACES[note.mood]}</Chip> : null}
          {note.energy ? <Chip>Energy {"⚡".repeat(note.energy)}</Chip> : null}
        </div>
      )}
      {note.well && <p><span className="font-semibold text-green">Wins:</span> {note.well}</p>}
      {note.blocked && <p><span className="font-semibold text-gold">Got in the way:</span> {note.blocked}</p>}
      {note.grateful && <p><span className="font-semibold text-marker">Grateful for:</span> {note.grateful}</p>}
      {note.lesson && <p><span className="font-semibold text-ucl">Lesson:</span> {note.lesson}</p>}
    </div>
  );
}

const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold">{children}</span>
);

function JournalForm({ day, note, onSaved }: { day: number; note?: DayNote; onSaved: () => void }) {
  const [j, setJ] = useState<JournalT>({
    well: note?.well ?? "",
    blocked: note?.blocked ?? "",
    rating: note?.rating,
    mood: note?.mood,
    energy: note?.energy,
    grateful: note?.grateful ?? "",
    lesson: note?.lesson ?? "",
  });
  const set = (p: Partial<JournalT>) => setJ({ ...j, ...p });
  const empty = !j.well.trim() && !j.blocked.trim() && !j.grateful?.trim() && !j.lesson?.trim() && !j.rating;

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (empty) return;
        saveJournal(day, j);
        onSaved();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Scale label="How was the day?" value={j.rating} onChange={(rating) => set({ rating })} faces />
        <Scale label="Mood" value={j.mood} onChange={(mood) => set({ mood })} faces />
        <Scale label="Energy" value={j.energy} onChange={(energy) => set({ energy })} />
      </div>
      <label className="grid gap-1.5">
        <span className={label}>Wins: what moved forward today?</span>
        <textarea id={`wins-${day}`} rows={2} value={j.well} maxLength={400} onChange={(e) => set({ well: e.target.value })} placeholder="Even small steps count. Progress is what makes a day feel good." className={field} />
      </label>
      <label className="grid gap-1.5">
        <span className={label}>What got in the way?</span>
        <input id={`blocked-${day}`} value={j.blocked} maxLength={200} onChange={(e) => set({ blocked: e.target.value })} placeholder="Interruptions, energy, a task that was too big…" className={field} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className={label}>One thing I&apos;m grateful for</span>
          <input id={`grateful-${day}`} value={j.grateful} maxLength={200} onChange={(e) => set({ grateful: e.target.value })} placeholder="A person, a moment, a small thing" className={field} />
        </label>
        <label className="grid gap-1.5">
          <span className={label}>Lesson for tomorrow</span>
          <input id={`lesson-${day}`} value={j.lesson} maxLength={200} onChange={(e) => set({ lesson: e.target.value })} placeholder="What would you do differently?" className={field} />
        </label>
      </div>
      <button type="submit" disabled={empty} className="w-fit rounded-full bg-ink px-5 py-2 text-sm font-semibold text-bg transition active:scale-95 disabled:opacity-40">
        Save journal
      </button>
    </form>
  );
}

function Scale({ label: l, value, onChange, faces }: { label: string; value?: number; onChange: (v: number | undefined) => void; faces?: boolean }) {
  return (
    <div className="grid gap-1.5">
      <span className={label}>{l}</span>
      <div className="flex gap-1" role="radiogroup" aria-label={l}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} of 5`}
            onClick={() => onChange(value === n ? undefined : n)}
            className={`grid h-10 flex-1 place-items-center rounded-xl text-lg transition active:scale-90 ${
              value === n ? "bg-green-soft ring-2 ring-green" : value && n < value && !faces ? "bg-gold-soft" : "bg-surface-2 opacity-70 hover:opacity-100"
            }`}
          >
            {faces ? SCORE_FACES[n] : n <= (value ?? 0) ? "⚡" : <span className="text-sm text-muted">{n}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Decide what happens to each unfinished task, instead of everything rolling over by itself (Bullet Journal "migration"). */
function Unfinished({ day, tasks }: { day: number; tasks: Task[] }) {
  const open = tasks.filter((t) => t.date === day && !t.done && !t.routine);
  if (!open.length) return null;
  const btn = "inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-semibold transition hover:border-muted";
  return (
    <div className="grid gap-2 border-t border-line pt-4">
      <div className={label}>Still open: decide what happens to each</div>
      <AnimatePresence initial={false}>
        {open.map((t) => (
          <motion.div key={t.id} layout exit={{ opacity: 0, height: 0 }} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
            <button type="button" className={btn} onClick={() => moveTask(t, day + 1)}>
              <ArrowRight size={12} /> Tomorrow
            </button>
            <button type="button" className={btn} onClick={() => backToPool(t)}>
              <Inbox size={12} /> Pool
            </button>
            <button type="button" className={`${btn} text-marker`} onClick={() => deleteTask(t)}>
              <Trash2 size={12} /> Drop
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
      <p className="text-xs text-muted">Anything you leave here moves to tomorrow at midnight and shows as late.</p>
    </div>
  );
}

/** Tomorrow's Top 3, written tonight: specific plans settle the mind (and help you fall asleep). */
function TomorrowTop3({ tomorrow, tasks }: { tomorrow: number; tasks: Task[] }) {
  const planned = tasks.filter((t) => t.date === tomorrow && !t.routine);
  const tops = planned.filter((t) => t.top);
  const others = planned.filter((t) => !t.top);
  const [title, setTitle] = useState("");
  return (
    <div className="grid gap-2 border-t border-line pt-4">
      <div className={label}>Tomorrow&apos;s Top 3</div>
      {tops.map((t) => (
        <div key={t.id} className="flex items-center gap-2 rounded-xl bg-gold-soft/70 px-3 py-2 text-sm font-semibold">
          <Star size={14} className="text-gold" fill="currentColor" />
          <span className="min-w-0 flex-1 truncate">{t.title}</span>
          <button type="button" onClick={() => updateTask(t, { top: undefined })} aria-label={`Remove ${t.title} from tomorrow's Top 3`} className="text-xs font-semibold text-muted hover:text-ink">
            Remove
          </button>
        </div>
      ))}
      {tops.length < 3 && (
        <>
          {others.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {others.slice(0, 6).map((t) => (
                <button key={t.id} type="button" onClick={() => updateTask(t, { top: true })} className="inline-flex items-center gap-1 rounded-full border border-dashed border-gold px-3 py-1 text-xs font-semibold text-gold">
                  <Star size={11} /> {t.title}
                </button>
              ))}
            </div>
          )}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim()) return;
              addTask(title.trim(), tomorrow, { top: true });
              setTitle("");
            }}
          >
            <input id="tomorrow-top" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder={`Priority ${tops.length + 1} for tomorrow`} className={`${field} py-2`} />
            <button type="submit" disabled={!title.trim()} className="shrink-0 rounded-xl bg-gold px-4 text-sm font-semibold text-bg disabled:opacity-40">
              <Check size={16} />
            </button>
          </form>
        </>
      )}
      {tops.length === 3 && <p className="text-xs text-green">Tomorrow is set. Rest well.</p>}
    </div>
  );
}
