"use client";

import { AnimatePresence, motion } from "motion/react";
import { Cloud, CloudOff, LogOut, RefreshCw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { dismissCloudMessage, signIn, signOut, useCloud, type CloudStatus } from "@/lib/cloud";

function GoogleG({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

const STATUS: Record<CloudStatus, { text: string; tone: string }> = {
  off: { text: "", tone: "" },
  starting: { text: "Connecting…", tone: "bg-muted" },
  "signed-out": { text: "", tone: "" },
  syncing: { text: "Loading your crosses…", tone: "bg-gold" },
  synced: { text: "Backed up to your account", tone: "bg-green" },
  saving: { text: "Saving…", tone: "bg-gold" },
  offline: { text: "Offline. Will save when you reconnect", tone: "bg-muted" },
  error: { text: "Not backed up right now", tone: "bg-marker" },
};

/** Top-bar control: "Sign in" when signed out, avatar with sync status and a menu when signed in. */
export function AccountButton() {
  const { status, user } = useCloud();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (status === "off" || status === "starting") return null;

  if (!user)
    return (
      <button
        type="button"
        onClick={signIn}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-sm font-semibold transition hover:border-muted"
      >
        <GoogleG /> Sign in
      </button>
    );

  const s = STATUS[status];
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={`Account: ${user.name || user.email}. ${s.text}`}
        className="relative grid size-9 place-items-center overflow-hidden rounded-full border border-line bg-surface-2 font-semibold"
      >
        {user.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photo} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
        ) : (
          (user.name || user.email || "?")[0].toUpperCase()
        )}
      </button>
      <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-bg ${s.tone}`} />
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            className="card absolute right-0 top-12 z-50 w-72 p-4"
          >
            <div className="truncate font-semibold">{user.name || "Your account"}</div>
            <div className="truncate text-sm text-muted">{user.email}</div>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
              {status === "synced" ? (
                <Cloud size={16} className="text-green" />
              ) : status === "offline" || status === "error" ? (
                <CloudOff size={16} className="text-muted" />
              ) : (
                <RefreshCw size={16} className="animate-spin text-gold" />
              )}
              {s.text}
            </div>
            <p className="mt-3 text-xs text-muted">
              Sign in with this Google account on any phone or computer to see the same crosses.
            </p>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-marker"
            >
              <LogOut size={15} /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Nudge to back up, shown only while signed out; plus any sign-in or sync problem. */
export function CloudNotice() {
  const { status, user, message } = useCloud();
  const [hidden, setHidden] = useState(false);

  if (message)
    return (
      <div role="status" className="flex items-start justify-between gap-3 rounded-2xl border border-marker/40 bg-marker/10 px-4 py-3 text-sm">
        <span>{message}</span>
        <button type="button" onClick={dismissCloudMessage} aria-label="Dismiss" className="shrink-0 text-muted hover:text-ink">
          <X size={16} />
        </button>
      </div>
    );

  if (status !== "signed-out" || user || hidden) return null;
  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <CloudOff size={20} className="mt-0.5 shrink-0 text-muted" />
        <div className="min-w-0 text-sm">
          <div className="font-semibold">Your data is only saved on this device</div>
          <div className="text-muted">Sign in with Google to back up your countdowns, tasks and spending, and see them on your phone and laptop.</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setHidden(true)} className="px-2 text-sm text-muted hover:text-ink">
          Not now
        </button>
        <button
          type="button"
          onClick={signIn}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg transition active:scale-95"
        >
          <GoogleG /> Sign in with Google
        </button>
      </div>
    </div>
  );
}
