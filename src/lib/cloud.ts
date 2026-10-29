"use client";

// Google sign-in and cloud backup through Firebase (Auth + Firestore).
//
// Each person has one document, users/{uid}, holding their goals, tasks,
// repeating tasks, task pool, life areas, screen-time logs, expenses, income,
// important dates, daily notes, big goals, budgets, equbs, debts, people to keep
// in touch with and fast days, plus their reminder and Telegram settings. The
// device keeps its own copy in localStorage, so the app works offline and for
// people who never sign in. Every record carries a change time (`u`), so when
// both sides changed, the newer version of each record wins.

import { useSyncExternalStore } from "react";
import { firebaseConfig } from "./firebase-config";
import { AIMS_KEY } from "./aims";
import { AREAS_KEY } from "./areas";
import { EVENTS_KEY } from "./events";
import { EXPENSES_KEY } from "./expenses";
import { GOALS_KEY } from "./goals";
import { INCOME_KEY } from "./income";
import { BUDGETS_KEY, DEBTS_KEY, EQUBS_KEY } from "./money-plans";
import { NOTES_KEY } from "./notes";
import { FASTS_KEY, PEOPLE_KEY } from "./people";
import { POOL_KEY } from "./pool";
import { SCREEN_KEY } from "./screen";
import { ROUTINES_KEY, TASKS_KEY } from "./tasks";
import { readStored, subscribeStored, writeStored } from "./storage";

export type CloudStatus = "off" | "starting" | "signed-out" | "syncing" | "synced" | "saving" | "offline" | "error";
export type CloudUser = { name: string; email: string; photo: string | null };
type State = { status: CloudStatus; user: CloudUser | null; message: string | null };

const SERVER_STATE: State = { status: "off", user: null, message: null };
let state: State = { status: firebaseConfig ? "starting" : "off", user: null, message: null };
const subs = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  subs.forEach((fn) => fn());
};

export function useCloud() {
  return useSyncExternalStore(
    (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    () => state,
    () => SERVER_STATE,
  );
}

export const dismissCloudMessage = () => set({ message: null });

/* ---------- Firebase, loaded only when configured ---------- */

async function load() {
  const [{ initializeApp }, auth, fs] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/firestore"),
  ]);
  const app = initializeApp(firebaseConfig!);
  let db;
  try {
    db = fs.initializeFirestore(app, {
      localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
    });
  } catch {
    db = fs.getFirestore(app); // e.g. storage blocked: fall back to memory cache
  }
  return { auth, fs, a: auth.getAuth(app), db };
}
let loading: ReturnType<typeof load> | null = null;
const firebase = () => (loading ??= load());

let started = false;
export function startCloud() {
  if (started || !firebaseConfig) return;
  started = true;
  firebase()
    .then(({ auth, a }) =>
      auth.onAuthStateChanged(a, (u) => {
        stopSync();
        if (!u) return set({ status: "signed-out", user: null });
        set({
          user: { name: u.displayName ?? "", email: u.email ?? "", photo: u.photoURL },
          status: navigator.onLine ? "syncing" : "offline",
          message: null,
        });
        startSync(u.uid);
      }),
    )
    .catch(() => set({ status: "error", message: "Couldn't connect to your account. Everything is still saved on this device." }));
}

export async function signIn() {
  const { auth, a } = await firebase();
  try {
    await auth.signInWithPopup(a, new auth.GoogleAuthProvider());
  } catch (e) {
    const code = (e as { code?: string }).code ?? "";
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
    set({
      message:
        code === "auth/popup-blocked"
          ? "Your browser blocked the Google window. Allow pop-ups for this site and try again."
          : code === "auth/unauthorized-domain"
            ? "Google sign-in isn't switched on for this website yet."
            : "Sign-in didn't work. Check your connection and try again.",
    });
  }
}

export async function signOut() {
  const { auth, a } = await firebase();
  await auth.signOut(a);
}

/* ---------- Sync ---------- */

type Rec = { id: string; u?: number; deleted?: boolean; draft?: boolean };
type Data = Record<Field, Rec[]>;
export type Field =
  | "goals" | "tasks" | "routines" | "screen" | "expenses" | "pool" | "areas" | "income" | "events" | "notes"
  | "aims" | "budgets" | "equbs" | "debts" | "people" | "fasts";

export const FIELDS: Record<Field, string> = {
  goals: GOALS_KEY,
  tasks: TASKS_KEY,
  routines: ROUTINES_KEY,
  screen: SCREEN_KEY,
  expenses: EXPENSES_KEY,
  pool: POOL_KEY,
  areas: AREAS_KEY,
  income: INCOME_KEY,
  events: EVENTS_KEY,
  notes: NOTES_KEY,
  aims: AIMS_KEY,
  budgets: BUDGETS_KEY,
  equbs: EQUBS_KEY,
  debts: DEBTS_KEY,
  people: PEOPLE_KEY,
  fasts: FASTS_KEY,
};
const KEEP_DELETED_MS = 90 * 864e5; // long enough for every device to hear about a deletion

const tidy = (list: Rec[]) =>
  list
    .filter((r) => !r.draft && !(r.deleted && Date.now() - (r.u ?? 0) > KEEP_DELETED_MS))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

export const readLocal = (): Data =>
  Object.fromEntries(
    (Object.keys(FIELDS) as Field[]).map((f) => {
      const v = readStored<Rec[]>(FIELDS[f], []);
      return [f, tidy(Array.isArray(v) ? v : [])];
    }),
  ) as Data;

/** Record by record, the most recently changed version wins; records on only one side are kept. */
export function merge(a: Data, b: Data): Data {
  const out = {} as Data;
  for (const f of Object.keys(FIELDS) as Field[]) {
    const m = new Map<string, Rec>();
    for (const r of b[f] ?? []) m.set(r.id, r);
    for (const r of a[f] ?? []) {
      const o = m.get(r.id);
      if (!o || (r.u ?? 0) > (o.u ?? 0)) m.set(r.id, r);
    }
    out[f] = tidy([...m.values()]);
  }
  return out;
}

const json = (d: Data) => JSON.stringify(d);

let stop: (() => void) | null = null;
const stopSync = () => {
  stop?.();
  stop = null;
};

/* Reminder settings live on the same document; the page writes them, the daily job reads them. */
export type Reminder = { on: boolean; time: string; subs: PushSubscriptionJSON[] };
let docRef: unknown = null;
let latestReminder: Reminder | null = null;

export async function saveReminder(change: (r: Reminder) => Reminder) {
  if (!docRef) throw new Error("not signed in");
  const { fs } = await firebase();
  const next = change(latestReminder ?? { on: false, time: "21:00", subs: [] });
  latestReminder = next;
  await fs.setDoc(docRef as never, { reminder: next }, { merge: true });
  return next;
}
export const currentReminder = () => latestReminder;

/* Telegram quick-add: the page saves a one-time code; the bot job links the chat that sends it. */
export type Telegram = { code?: string; chat?: number; name?: string };
let latestTelegram: Telegram | null = null;
const tgSubs = new Set<() => void>();
export function useTelegram() {
  return useSyncExternalStore(
    (fn) => {
      tgSubs.add(fn);
      return () => tgSubs.delete(fn);
    },
    () => latestTelegram,
    () => null,
  );
}
export async function saveTelegram(t: Telegram | null) {
  if (!docRef) throw new Error("not signed in");
  const { fs } = await firebase();
  await fs.setDoc(docRef as never, { telegram: t ?? fs.deleteField() }, { merge: true });
}

function startSync(uid: string) {
  let cancelled = false;
  stop = () => {
    cancelled = true;
  };

  firebase().then(({ fs, db }) => {
    if (cancelled) return;
    const ref = fs.doc(db, "users", uid);
    docRef = ref;
    let ready = false;
    let cloudJson = "";
    let timer: ReturnType<typeof setTimeout> | undefined;
    let writing = false;
    let again = false;

    const applyLocal = (d: Data) => {
      const local = readLocal();
      for (const f of Object.keys(FIELDS) as Field[])
        if (JSON.stringify(d[f]) !== JSON.stringify(local[f])) writeStored(FIELDS[f], d[f]);
    };

    const push = async () => {
      if (!ready) return;
      if (writing) {
        again = true;
        return;
      }
      const data = readLocal();
      const j = json(data);
      if (j === cloudJson) return set({ status: navigator.onLine ? "synced" : "offline" });
      writing = true;
      set({ status: navigator.onLine ? "saving" : "offline" });
      try {
        // merge: true leaves the reminder settings alone. Resolves once the server has it.
        await fs.setDoc(ref, { ...data, updated: fs.serverTimestamp() }, { merge: true });
        cloudJson = j;
        set({ status: "synced", message: null });
      } catch {
        set({ status: "error", message: "Couldn't save to your account. Everything is still saved on this device." });
      }
      writing = false;
      if (again) {
        again = false;
        push();
      }
    };

    const unsubSnap = fs.onSnapshot(
      ref,
      { includeMetadataChanges: true },
      (snap) => {
        // Only act on the server's confirmed copy, never on our own unconfirmed write or a stale cache.
        if (snap.metadata.fromCache || snap.metadata.hasPendingWrites) return;
        const raw = (snap.data() ?? {}) as Partial<Data> & { reminder?: Reminder; telegram?: Telegram };
        latestReminder = raw.reminder ?? null;
        latestTelegram = raw.telegram ?? null;
        tgSubs.forEach((fn) => fn());
        const fields = Object.keys(FIELDS) as Field[];
        const empty = Object.fromEntries(fields.map((f) => [f, []])) as unknown as Data;
        const cloud = merge(empty, Object.fromEntries(fields.map((f) => [f, raw[f] ?? []])) as unknown as Data);
        cloudJson = json(cloud);
        ready = true;
        const merged = merge(readLocal(), cloud);
        applyLocal(merged);
        if (json(merged) !== cloudJson) push();
        else if (!writing) set({ status: "synced" });
      },
      () => set({ status: "error", message: "Couldn't load your saved data. Check your connection." }),
    );

    const onLocal = () => {
      clearTimeout(timer);
      timer = setTimeout(push, 500);
    };
    const unsubs = Object.values(FIELDS).map((k) => subscribeStored(k, onLocal));
    const onOnline = () => push();
    const onOffline = () => set({ status: "offline" });
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    stop = () => {
      cancelled = true;
      docRef = null;
      latestReminder = null;
      latestTelegram = null;
      tgSubs.forEach((fn) => fn());
      unsubSnap();
      unsubs.forEach((u) => u());
      clearTimeout(timer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  });
}
