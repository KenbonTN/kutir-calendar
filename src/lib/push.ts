"use client";

// The evening reminder. The page subscribes this device for push messages and
// stores the subscription with the reminder time on the person's document; a
// scheduled GitHub Actions job (scripts/send-reminders.mjs) sends the message.

import { currentReminder, saveReminder } from "./cloud";

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
  if ("serviceWorker" in navigator)
    navigator.serviceWorker.register(`${BASE}/sw.js`, { scope: `${BASE}/` }).catch(() => {});
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
  const endpoint = sub?.endpoint;
  await sub?.unsubscribe().catch(() => {});
  return saveReminder((r) => {
    const subs = r.subs.filter((s) => s.endpoint !== endpoint);
    return { ...r, on: subs.length > 0, subs };
  });
}

export const setReminderTime = (time: string) => saveReminder((r) => ({ ...r, time }));
