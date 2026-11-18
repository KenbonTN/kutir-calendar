"use client";

import { useSyncExternalStore } from "react";

// The evening reminder. The page subscribes this device for push messages and
// stores the subscription with the reminder time on the person's document; a
// scheduled GitHub Actions job (scripts/send-reminders.mjs) sends the message.

import { currentReminder, saveReminder } from "./cloud";
import { profileStore } from "./faith";

export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Public half of the push key pair; the private half is a GitHub secret. */
const VAPID_PUBLIC = "BC_7g5Rc8i-X-LqXG56SkntSk3jXzS0r3K4muaOpTdQvH1zV_XwvMh70TsyH4uC2uYWZl_r0J6lxOf6hDMiDhIk";

export const isIOS = () =>
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

export const isInstalled = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true);

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

type InstallPrompt = Event & { prompt: () => Promise<void> };
let installPrompt: InstallPrompt | null = null;
/** Chrome/Edge/Android offer their own install dialog; iPhone uses Share → Add to Home Screen. */
export const canPromptInstall = () => !!installPrompt;
export async function promptInstall() {
  await installPrompt?.prompt();
  installPrompt = null;
}

export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installPrompt = e as InstallPrompt;
  });
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker
    .register(`${BASE}/sw.js`, { scope: `${BASE}/`, updateViaCache: "none" })
    .then((reg) => {
      // A Home Screen app can sit in memory for days: look for a newer version whenever it comes back.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") reg.update().catch(() => {});
      });
    })
    .catch(() => {});
  // The page opens from the saved copy; the service worker says when a newer one has arrived.
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.type === "kutir-update") markUpdate();
  });
  // A tab opened from an older saved page may ask for build files a newer deploy replaced:
  // reload once to pick up the current version.
  const chunkFailed = (msg: string) => /chunk|dynamically imported module|module script failed/i.test(msg);
  const reloadOnce = () => {
    try {
      if (sessionStorage.getItem("kutir-chunk-reload")) return;
      sessionStorage.setItem("kutir-chunk-reload", "1");
    } catch {}
    location.reload();
  };
  window.addEventListener("unhandledrejection", (e) => chunkFailed(String(e.reason?.message ?? e.reason)) && reloadOnce());
  window.addEventListener("error", (e) => chunkFailed(String(e.message)) && reloadOnce());
  // The newer copy may arrive before this page was listening: compare build files once settled.
  setTimeout(checkSavedVersion, 5000);
  // When a new version takes over, reload once so the page matches it.
  let reloaded = false;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    location.reload();
  });
}

/* ---------- "New version ready" ---------- */

let updateReady = false;
const updateSubs = new Set<() => void>();
const markUpdate = () => {
  updateReady = true;
  updateSubs.forEach((fn) => fn());
};

/** True once a newer version of Kutir is saved and a refresh would show it. */
export function useUpdateReady() {
  return useSyncExternalStore(
    (fn) => {
      updateSubs.add(fn);
      return () => updateSubs.delete(fn);
    },
    () => updateReady,
    () => false,
  );
}

/** The saved page lists build files with content-hashed names; any the running page lacks means a newer version. */
async function checkSavedVersion() {
  try {
    const saved = await caches.match(`${BASE}/`);
    if (!saved) return;
    const files = (await saved.text()).match(/\/_next\/static\/chunks\/[\w.-]+\.js/g) ?? [];
    const running = new Set([...document.scripts].map((x) => new URL(x.src || location.href).pathname.replace(BASE, "")));
    if (files.some((f) => !running.has(f))) markUpdate();
  } catch {}
}

const keyBytes = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

async function deviceSubscription(create: boolean) {
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing || !create) return existing;
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC) });
}

/** Is this device signed up for the reminder? */
export async function reminderOnHere() {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  const sub = await deviceSubscription(false);
  const r = currentReminder();
  return !!sub && !!r?.subs.some((s) => s.endpoint === sub.endpoint);
}

export async function turnOnReminder(time: string) {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("denied");
  const sub = (await deviceSubscription(true))!.toJSON();
  return saveReminder((r) => ({
    on: true,
    time,
    subs: [...r.subs.filter((s) => s.endpoint !== sub.endpoint), sub],
  }));
}

export async function turnOffReminder() {
  const sub = await deviceSubscription(false);
  // Prayer reminders use the same device subscription: keep it while they're on.
  if (profileStore.all().some((p) => p.remind && !p.deleted)) return saveReminder((r) => ({ ...r, on: false }));
  const endpoint = sub?.endpoint;
  await sub?.unsubscribe().catch(() => {});
  return saveReminder((r) => {
    const subs = r.subs.filter((s) => s.endpoint !== endpoint);
    return { ...r, on: subs.length > 0, subs };
  });
}

export const setReminderTime = (time: string) => saveReminder((r) => ({ ...r, time }));

/**
 * Prayer reminders: signs this device up for notifications without touching the
 * evening reminder (the job sends them at each prayer time, see scripts/reminders/prayers.mjs).
 */
export async function setPrayerReminders(on: boolean) {
  if (on) {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("denied");
    const sub = (await deviceSubscription(true))!.toJSON();
    await saveReminder((r) => ({ ...r, subs: [...r.subs.filter((s) => s.endpoint !== sub.endpoint), sub] }));
    return;
  }
  if (currentReminder()?.on) return; // the evening reminder still needs this device
  const sub = await deviceSubscription(false);
  const endpoint = sub?.endpoint;
  await sub?.unsubscribe().catch(() => {});
  await saveReminder((r) => ({ ...r, subs: r.subs.filter((s) => s.endpoint !== endpoint) }));
}
