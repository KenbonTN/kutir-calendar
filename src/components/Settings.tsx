"use client";

import {
  Bell, BellOff, CalendarPlus, Check, Copy, Download, FileDown, FileUp, Languages, Repeat, Send, Share, SquarePlus, Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { exportBackup, exportCalendar, importBackup } from "@/lib/backup";
import { currentReminder, saveTelegram, useCloud, useTelegram } from "@/lib/cloud";
import { useEvents } from "@/lib/events";
import { useLang, useT } from "@/lib/i18n";
import { useTasks } from "@/lib/tasks";
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
  const t = useT();
  return (
    <div className="grid gap-6">
      <h2 className="pr-10 font-display text-2xl font-extrabold">{t("Settings")}</h2>
      <Language />
      <Install />
      <Reminder />
      <TelegramLink />
      <Backup today={today} />
      <section className="grid gap-2">
        <h3 className={heading}>
          <Repeat size={14} /> {t("Repeating tasks")}
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

function Language() {
  const [lang, setLang] = useLang();
  const t = useT();
  return (
    <section className="grid gap-2">
      <h3 className={heading}>
        <Languages size={14} /> {t("Language")}
      </h3>
      <div className="flex w-fit rounded-full border border-line bg-surface-2 p-1 text-sm font-semibold">
        {([["en", "English"], ["am", "አማርኛ"]] as const).map(([k, l]) => (
          <button
            key={k}
            type="button"
            aria-pressed={lang === k}
            onClick={() => {
              setLang(k);
              document.documentElement.lang = k;
            }}
            className={`rounded-full px-4 py-1.5 transition ${lang === k ? "bg-ink text-bg" : "text-muted"}`}
          >
            {l}
          </button>
        ))}
      </div>
      {lang === "am" && <p className="text-xs text-muted">ዋና ዋና ርዕሶችና አዝራሮች በአማርኛ ይታያሉ፤ ሌሎቹ ቀስ በቀስ ይተረጎማሉ።</p>}
    </section>
  );
}

function Backup({ today }: { today: number }) {
  const t = useT();
  const events = useEvents();
  const { tasks } = useTasks();
  const file = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<string | null>(null);
  const btn = "inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold transition hover:border-muted active:scale-95";
  return (
    <section className="grid gap-2">
      <h3 className={heading}>
        <FileDown size={14} /> {t("Backup & export")}
      </h3>
      <p className="text-sm text-muted">
        Save everything to a file you keep, or add your birthdays and planned tasks to Google Calendar or your phone&apos;s calendar.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={() => setNote(`Saved ${exportBackup()} records to your downloads.`)}>
          <Download size={15} /> Download backup
        </button>
        <button type="button" className={btn} onClick={() => file.current?.click()}>
          <FileUp size={15} /> Load a backup
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => {
            const n = exportCalendar(events, tasks, today);
            setNote(n ? `${n} dates and tasks saved as a calendar file. Open it to add them to Google or Apple Calendar.` : "No dates or planned tasks to export yet.");
          }}
        >
          <CalendarPlus size={15} /> Export to calendar (.ics)
        </button>
      </div>
      <input
        ref={file}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          try {
            const n = await importBackup(f);
            setNote(`Loaded ${n} records. Anything newer on this device was kept.`);
          } catch {
            setNote("That file isn't a Kutir backup.");
          }
        }}
      />
      {note && <p className="text-sm">{note}</p>}
      <p className="text-xs text-muted">
        In Google Calendar on a computer: Settings → Import &amp; export → Import, and choose the .ics file. On iPhone, open the file and tap Add All.
      </p>
    </section>
  );
}

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT ?? "";

function TelegramLink() {
  const t = useT();
  const { user } = useCloud();
  const tg = useTelegram();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const newCode = async () => {
    setBusy(true);
    setErr(null);
    try {
      const code = Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
      await saveTelegram({ code });
    } catch {
      setErr("Couldn't make a code. Check your connection.");
    }
    setBusy(false);
  };

  return (
    <section className="grid gap-2">
      <h3 className={heading}>
        <Send size={14} /> {t("Telegram quick-add")}
      </h3>
      <p className="text-sm text-muted">
        Message the Kutir bot to add things without opening the app: <b className="text-ink">call the bank</b> adds a task for today,{" "}
        <b className="text-ink">tomorrow: gym</b>, <b className="text-ink">pool: read a book</b>, <b className="text-ink">-250 taxi</b> or{" "}
        <b className="text-ink">spent 250 taxi</b> logs spending, <b className="text-ink">+5000 salary</b> logs income.
      </p>
      {!BOT ? (
        <p className="rounded-2xl bg-surface-2 p-3 text-sm">The bot isn&apos;t set up for this website yet.</p>
      ) : !user ? (
        <p className="rounded-2xl bg-surface-2 p-3 text-sm">Sign in with Google first, so the bot knows whose Kutir to add to.</p>
      ) : tg?.chat ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-green">
            <Check size={16} /> Linked{tg.name ? ` to ${tg.name}` : ""}
          </span>
          <a href={`https://t.me/${BOT}`} target="_blank" rel="noreferrer" className="rounded-full bg-[#229ED9] px-4 py-2 text-sm font-semibold text-white">
            Open @{BOT}
          </a>
          <button type="button" disabled={busy} onClick={() => saveTelegram(null)} className="text-sm text-muted hover:text-marker">
            Unlink
          </button>
        </div>
      ) : tg?.code ? (
        <div className="grid gap-2 rounded-2xl bg-surface-2 p-3 text-sm">
          <p>
            Open the bot and send it this message. It links within about 10 minutes, then confirms in Telegram.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-surface px-3 py-1.5 font-mono font-bold">/start {tg.code}</code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(`/start ${tg.code}`).then(() => setCopied(true));
              }}
              className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-semibold"
            >
              <Copy size={13} /> {copied ? "Copied" : "Copy"}
            </button>
            <a href={`https://t.me/${BOT}?start=${tg.code}`} target="_blank" rel="noreferrer" className="rounded-full bg-[#229ED9] px-4 py-1.5 text-xs font-semibold text-white">
              Open Telegram
            </a>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={newCode}
          className="inline-flex w-fit items-center gap-2 rounded-full bg-[#229ED9] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Send size={15} /> Connect Telegram
        </button>
      )}
      {err && <p className="text-sm text-marker">{err}</p>}
    </section>
  );
}
