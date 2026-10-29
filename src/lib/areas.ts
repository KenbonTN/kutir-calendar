"use client";

// Life areas: the parts of life a task or a birr belongs to. Everyone starts with
// the built-in set below; people can rename or hide those, add their own, and add
// sub-groups under any area (each business, each organization, each person…).
// Only changes are saved, as records with the same id as the built-in area.

import { useMemo } from "react";
import { readStored, useStored } from "./storage";
import { records, type Rec } from "./records";

export type Area = Rec & {
  name: string;
  emoji: string;
  color: string;
  /** set on sub-groups: the area they sit under */
  parent?: string;
  /** what belongs here, shown while choosing */
  hint?: string;
  /** what a sub-group of this area is called: "business", "organization" */
  sub?: string;
  order: number;
};

const d = (id: string, emoji: string, name: string, color: string, hint: string, sub?: string): Area => ({
  id, emoji, name, color, hint, sub, order: 0, u: 0,
});

export const BUILT_IN: Area[] = [
  d("spirit", "🙏", "Faith & spirit", "#b57a08", "Prayer, church, fasting, scripture, confession"),
  d("family", "👨‍👩‍👧", "Family", "#e11d48", "Parents, siblings, children, relatives", "family member"),
  d("partner", "💞", "Love & partner", "#db2777", "Your partner, marriage, dates"),
  d("friends", "🤝", "Friends & community", "#f97316", "Friends, neighbours, mahber, idir", "group"),
  d("health", "💪", "Health & body", "#16a34a", "Exercise, food, sleep, check-ups"),
  d("mind", "🧘", "Mind & rest", "#0d9488", "Rest, quiet time, mental health, time off screens"),
  d("learning", "📚", "Learning & growth", "#4f46e5", "Courses, books, languages, new skills", "course"),
  d("work", "🏢", "Work", "#2563eb", "Your job and the organizations you work for", "organization"),
  d("business", "💼", "Business", "#7c3aed", "Businesses you own or are building", "business"),
  d("money", "💰", "Money & savings", "#ca8a04", "Saving, equb, debts, budgeting, investments"),
  d("home", "🏠", "Home & errands", "#64748b", "Chores, repairs, paperwork, shopping"),
  d("fun", "🎨", "Fun & hobbies", "#0891b2", "Sport, music, art, travel, games"),
  d("giving", "🌱", "Giving & service", "#65a30d", "Volunteering, charity, helping others"),
  d("other", "✨", "Other", "#78716c", "Anything that doesn't fit elsewhere"),
].map((a, i) => ({ ...a, order: i }));

/** Colours offered for new areas. */
export const COLORS = ["#e11d48", "#f97316", "#ca8a04", "#16a34a", "#0d9488", "#0891b2", "#2563eb", "#4f46e5", "#7c3aed", "#db2777", "#64748b"];
export const EMOJIS = ["⭐", "🎯", "🚀", "🧠", "🏃", "🎓", "🏗️", "🛒", "✍️", "🎵", "⚽", "🌍", "🐾", "🍳", "💻", "📷"];

export const areaStore = records<Area>("kutir-areas-v1");
export const AREAS_KEY = areaStore.key;

function combine(saved: Area[]) {
  const map = new Map<string, Area>(BUILT_IN.map((a) => [a.id, a]));
  for (const a of saved) map.set(a.id, a);
  return [...map.values()];
}

export type Areas = ReturnType<typeof organize>;

function organize(list: Area[]) {
  const live = list.filter((a) => !a.deleted);
  const byId = new Map(list.map((a) => [a.id, a])); // includes hidden ones, so old tasks still show their area
  const sort = (a: Area, b: Area) => a.order - b.order || a.name.localeCompare(b.name);
  const top = live.filter((a) => !a.parent).sort(sort);
  const subs = (id: string) => live.filter((a) => a.parent === id).sort(sort);
  /** Name, colour and emoji for an area or sub-group id. */
  const info = (id?: string) => {
    const a = id ? byId.get(id) : undefined;
    if (!a) return null;
    const parent = a.parent ? byId.get(a.parent) : undefined;
    return {
      id: a.id,
      top: parent?.id ?? a.id,
      name: a.name,
      label: parent ? `${parent.name} · ${a.name}` : a.name,
      emoji: parent?.emoji ?? a.emoji,
      color: parent?.color ?? a.color,
    };
  };
  /** The top-level area for any id ("business" for "Business · Coffee shop"). */
  const topOf = (id?: string) => info(id)?.top;
  return { top, subs, info, topOf, byId };
}

export function useAreas() {
  const [saved] = useStored<Area[]>(AREAS_KEY, areaStore.NONE);
  return useMemo(() => organize(combine(Array.isArray(saved) ? saved : [])), [saved]);
}

export const readAreas = () => organize(combine(readStored<Area[]>(AREAS_KEY, areaStore.NONE)));

export function addArea(a: { name: string; emoji?: string; color?: string; parent?: string }) {
  const all = combine(areaStore.all());
  const parent = a.parent ? all.find((x) => x.id === a.parent) : undefined;
  return areaStore.add({
    name: a.name,
    emoji: a.emoji ?? parent?.emoji ?? "⭐",
    color: a.color ?? parent?.color ?? COLORS[all.length % COLORS.length],
    parent: a.parent,
    order: all.length + 100,
  });
}

/** Rename, recolour or hide; built-in areas get saved as a changed copy. */
export function changeArea(id: string, p: Partial<Area>) {
  const cur = combine(areaStore.all()).find((a) => a.id === id);
  if (cur) areaStore.put({ ...cur, ...p });
}

export const hideArea = (id: string) => changeArea(id, { deleted: true });
