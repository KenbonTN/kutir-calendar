"use client";

// Google sign-in and cloud backup through Firebase (Auth + Firestore).
//
// Each person has one document, users/{uid}, holding all their goals. The
// device keeps its own copy in localStorage, so the app works offline and
// for people who never sign in. When both sides change, crosses are merged
// (a day crossed on either device stays crossed).

import { useSyncExternalStore } from "react";
import { firebaseConfig } from "./firebase-config";
import { GOALS_KEY, replaceGoals, savedGoals, type Goal } from "./goals";
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
    .catch(() => set({ status: "error", message: "Couldn't connect to your account. Your crosses are still saved on this device." }));
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

const SYNC_KEY = "kutir-last-synced"; // the last copy this device and the cloud agreed on

const clean = (goals: Goal[]): Goal[] =>
  goals
    .filter((g) => !g.draft)
    .map(({ id, name, start, days, done, created }) => ({
      id, name, start, days, created, done: [...new Set(done)].sort((x, y) => x - y),
    }));
const asJson = (goals: Goal[]) => JSON.stringify(clean(goals));

/** Same goal on both sides: keep every crossed day. Goals only on one side are kept too. */
export function mergeGoals(local: Goal[], cloud: Goal[]): Goal[] {
  const out = new Map(cloud.map((g) => [g.id, g]));
  for (const g of local) {
    const c = out.get(g.id);
    out.set(g.id, c ? { ...c, done: [...new Set([...c.done, ...g.done])] } : g);
  }
  return clean([...out.values()].sort((x, y) => x.created - y.created));
}

let stop: (() => void) | null = null;
const stopSync = () => {
  stop?.();
  stop = null;
};

function startSync(uid: string) {
  let cancelled = false;
  stop = () => {
    cancelled = true;
  };

  firebase().then(({ fs, db }) => {
    if (cancelled) return;
    const ref = fs.doc(db, "users", uid);
    let first = true;
    let cloudJson = "";
    let timer: ReturnType<typeof setTimeout> | undefined;
    let writing = false;
    let again = false;

    const agreed = (json: string) => writeStored(SYNC_KEY, { uid, json });

    const push = async () => {
      if (first) return;
      if (writing) {
        again = true;
        return;
      }
      const goals = clean(savedGoals());
      const json = JSON.stringify(goals);
      if (json === cloudJson) return set({ status: navigator.onLine ? "synced" : "offline" });
      writing = true;
      set({ status: navigator.onLine ? "saving" : "offline" });
      try {
        await fs.setDoc(ref, { goals, updated: fs.serverTimestamp() }); // resolves once the server has it
        cloudJson = json;
        agreed(json);
        set({ status: "synced", message: null });
      } catch {
        set({ status: "error", message: "Couldn't save to your account. Your crosses are still on this device." });
      }
      writing = false;
      if (again) {
        again = false;
        push();
      }
    };

    const apply = (goals: Goal[]) => {
      if (asJson(goals) !== asJson(savedGoals())) replaceGoals(clean(goals));
    };

    const unsubSnap = fs.onSnapshot(
      ref,
      { includeMetadataChanges: true },
      (snap) => {
        // Only act on the server's confirmed copy, never on our own unconfirmed write or a stale cache.
        if (snap.metadata.fromCache || snap.metadata.hasPendingWrites) return;
        const cloud = clean((snap.data()?.goals ?? []) as Goal[]);
        cloudJson = JSON.stringify(cloud);

        if (first) {
          first = false;
          const local = clean(savedGoals());
          const last = readStored<{ uid: string; json: string } | null>(SYNC_KEY, null);
          const unchangedHere = last?.uid === uid && last.json === JSON.stringify(local);
          const next = unchangedHere || !local.length ? cloud : mergeGoals(local, cloud);
          apply(next);
          if (JSON.stringify(next) !== cloudJson) push();
          else {
            agreed(cloudJson);
            set({ status: "synced" });
          }
          return;
        }
        if (cloudJson !== asJson(savedGoals())) {
          apply(cloud);
          agreed(cloudJson);
        }
        if (!writing) set({ status: "synced" });
      },
      () => set({ status: "error", message: "Couldn't load your saved crosses. Check your connection." }),
    );

    const unsubLocal = subscribeStored(GOALS_KEY, () => {
      clearTimeout(timer);
      timer = setTimeout(push, 400);
    });
    const onOnline = () => push();
    const onOffline = () => set({ status: "offline" });
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    stop = () => {
      cancelled = true;
      unsubSnap();
      unsubLocal();
      clearTimeout(timer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  });
}
