"use client";

// Tiny localStorage-backed stores. Each key gets its own subscriber list, so
// components re-render only for the value they read. Reads and writes are
// wrapped because storage can be blocked (private windows, strict settings).

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Map<string, Set<() => void>>();
const cache = new Map<string, unknown>();

function read<T>(key: string, fallback: T): T {
  if (cache.has(key)) return cache.get(key) as T;
  let value = fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw != null) value = JSON.parse(raw) as T;
  } catch {}
  cache.set(key, value);
  return value;
}

export function writeStored<T>(key: string, value: T) {
  cache.set(key, value);
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
  listeners.get(key)?.forEach((fn) => fn());
}

export function readStored<T>(key: string, fallback: T): T {
  return read(key, fallback);
}

/** Listen for changes to one key outside React (used by cloud sync). */
export function subscribeStored(key: string, fn: () => void) {
  const set = listeners.get(key) ?? new Set();
  set.add(fn);
  listeners.set(key, set);
  return () => set.delete(fn);
}

export function useStored<T>(key: string, fallback: T) {
  const subscribe = useCallback(
    (fn: () => void) => {
      const set = listeners.get(key) ?? new Set();
      set.add(fn);
      listeners.set(key, set);
      const onStorage = (e: StorageEvent) => {
        if (e.key !== key) return;
        cache.delete(key);
        fn();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        set.delete(fn);
        window.removeEventListener("storage", onStorage);
      };
    },
    [key],
  );
  const value = useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => fallback,
  );
  const set = useCallback((v: T) => writeStored(key, v), [key]);
  return [value, set] as const;
}
