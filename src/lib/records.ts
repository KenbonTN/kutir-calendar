"use client";

// A list of records in localStorage that syncs like tasks do: each record has an
// id and a change time (`u`), and is soft-deleted so other devices hear about it.

import { useMemo } from "react";
import { readStored, useStored, writeStored } from "./storage";

export type Rec = { id: string; u: number; deleted?: boolean };

export const uid = () => Math.random().toString(36).slice(2, 10);

/** Removes undefined fields: Firestore refuses them, and in a patch they mean "clear this". */
const strip = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

export function records<T extends Rec>(key: string) {
  const NONE: T[] = [];
  const all = () => {
    const v = readStored<T[]>(key, NONE);
    return Array.isArray(v) ? v : NONE;
  };
  const patch = (id: string, p: Partial<T>) =>
    writeStored(key, all().map((x) => (x.id === id ? strip({ ...x, ...p, u: Date.now() }) : x)));
  return {
    key,
    NONE,
    all,
    patch,
    add: (rec: Omit<T, "id" | "u"> & { id?: string }) => {
      const r = strip({ ...rec, id: rec.id ?? uid(), u: Date.now() }) as T;
      writeStored(key, [...all().filter((x) => x.id !== r.id), r]);
      return r;
    },
    /** Adds the record, or replaces the one with the same id. */
    put: (rec: T) => writeStored(key, [...all().filter((x) => x.id !== rec.id), strip({ ...rec, u: Date.now() })]),
    remove: (id: string) => patch(id, { deleted: true } as Partial<T>),
  };
}

/** The records that aren't deleted. */
export function useRecords<T extends Rec>(store: { key: string; NONE: T[] }) {
  const [v] = useStored<T[]>(store.key, store.NONE);
  return useMemo(() => (Array.isArray(v) ? v : store.NONE).filter((x) => !x.deleted), [v, store.NONE]);
}
