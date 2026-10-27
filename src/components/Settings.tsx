"use client";

import { Bell, BellOff, Check, Download, Repeat, Share, SquarePlus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { currentReminder, useCloud } from "@/lib/cloud";
import { formatClock, formatEt } from "@/lib/ethiopian";
import {
  canPromptInstall, isInstalled, isIOS, promptInstall, pushSupported, reminderOnHere, setReminderTime,
  turnOffReminder, turnOnReminder,
} from "@/lib/push";
import { deleteRoutine, routineLabel, type Routine } from "@/lib/tasks";

const heading = "flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted";
const TIMES = Array.from({ length: 14 }, (_, i) => {
  const mins = 17 * 60 + i * 30; // 5:00 PM … 11:30 PM (stored as "17:00" … "23:30")
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${mins % 60 ? "30" : "00"}`;
});

export function Settings({ today, routines }: { today: number; routines: Routine[] }) {
  return (
    <div className="grid gap-6">
      <h2 className="pr-10 font-display text-2xl font-extrabold">Settings</h2>
      <Install />
      <Reminder />
      <section className="grid gap-2">
        <h3 className={heading}>
          <Repeat size={14} /> Repeating tasks
        </h3>
        {routines.length === 0 ? (
          <p className="text-sm text-muted">
            None yet. When you add a task, choose &quot;Every day&quot;, &quot;Weekdays&quot; or &quot;Pick days&quot; to make it repeat.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {routines.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{r.title}</div>
                  <div className="text-xs text-muted">
                    {routineLabel(r.days)} · since {formatEt(r.start)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteRoutine(r, today)}
                  className="inline-flex items-center gap-1 text-sm text-muted hover:text-marker"
                >
                  <Trash2 size={14} /> Stop
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Install() {
  // The settings sheet only ever renders in the browser, so these can be read straight away.
  const [installed] = useState(isInstalled);
  const [canPrompt, setCanPrompt] = useState(canPromptInstall);
  const ios = typeof navigator !== "undefined" && isIOS();

  return (
    <section className="grid gap-2">
      <h3 className={heading}>
        <Download size={14} /> Install as an app
      </h3>
      {installed ? (
        <p className="flex items-center gap-2 text-sm font-semibold text-green">
          <Check size={16} /> Installed. You&apos;re using Kutir as an app.
        </p>
      ) : ios ? (
        <ol className="grid gap-2 rounded-2xl bg-surface-2 p-4 text-sm">
          <li className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-ink text-xs font-bold text-bg">1</span>
            Open this page in <b>Safari</b>.
          </li>
          <li className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-ink text-xs font-bold text-bg">2</span>
            Tap <Share size={15} className="inline" /> <b>Share</b> at the bottom of the screen.
          </li>
          <li className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-ink text-xs font-bold text-bg">3</span>
            Choose <SquarePlus size={15} className="inline" /> <b>Add to Home Screen</b>, then <b>Add</b>.
          </li>
        </ol>
      ) : canPrompt ? (
        <button
          type="button"
          onClick={() => promptInstall().then(() => setCanPrompt(false))}
          className="inline-flex w-fit items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg"
        >
          <Download size={15} /> Install Kutir
        </button>
      ) : (
        <p className="text-sm text-muted">
          Use your browser&apos;s menu and choose &quot;Install app&quot; or &quot;Add to Home Screen&quot;.
        </p>
      )}
    </section>
  );
}

function Reminder() {
  const { user } = useCloud();
  const [on, setOn] = useState(false);
  const [time, setTime] = useState(currentReminder()?.time ?? "21:00");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    reminderOnHere().then(setOn).catch(() => setOn(false));
  }, [user]);

  const ios = typeof navigator !== "undefined" && isIOS();
  const blocker = !user
    ? "Sign in with Google first. The reminder is sent to your account's devices."
    : ios && !isInstalled()
      ? "On iPhone, notifications only work after you add Kutir to your Home Screen (see above). Then open it from the Home Screen and turn this on."
      : !pushSupported()
        ? "This browser can't receive notifications."
        : null;

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setNote(null);
    try {
      await fn();
      setNote(ok);
    } catch (e) {
      setNote(
        (e as Error).message === "denied"
          ? "Notifications are blocked. Allow them for Kutir in Settings → Notifications, then try again."
          : "Couldn't change the reminder. Check your connection and try again.",
      );
    }
    setBusy(false);
  };

  return (
    <section className="grid gap-2">
      <h3 className={heading}>
        <Bell size={14} /> Evening reminder
      </h3>
      <p className="text-sm text-muted">
        Each evening you get a notification with the tasks you haven&apos;t finished, and a nudge to log your screen time.
      </p>
      {blocker ? (
        <p className="rounded-2xl bg-surface-2 p-3 text-sm">{blocker}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            Remind me at
            <select
              id="reminder-time"
              value={time}
              disabled={busy}
              onChange={(e) => {
                setTime(e.target.value);
                if (on) run(() => setReminderTime(e.target.value), "Reminder time saved.");
              }}
              className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-[15px]"
            >
              {TIMES.map((t) => (
                <option key={t} value={t}>{formatClock(t)}</option>
              ))}
            </select>
            <span className="text-muted">Addis time</span>
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              on
                ? run(async () => { await turnOffReminder(); setOn(false); }, "Reminder turned off on this device.")
                : run(async () => { await turnOnReminder(time); setOn(true); }, `Done. You'll get a reminder around ${formatClock(time)} each evening.`)
            }
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
              on ? "border border-line text-muted" : "bg-green text-on-green"
            }`}
          >
            {on ? <><BellOff size={15} /> Turn off</> : <><Bell size={15} /> Turn on</>}
          </button>
        </div>
      )}
      {note && <p className="text-sm">{note}</p>}
      <p className="text-xs text-muted">Reminders can arrive up to about 20 minutes after the time you pick.</p>
    </section>
  );
}
