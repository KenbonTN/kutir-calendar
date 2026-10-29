// Month layouts in either calendar, as JDN ranges with a heading in both calendars.

import { fromJdn, gregorianToJdn, jdnToDate, monthLength, MONTHS, MONTHS_AM, toJdn } from "./ethiopian";

export type Cal = "ethiopian" | "gregorian";
export type MonthSpec = { key: string; first: number; length: number; title: string; titleAm?: string; subtitle: string };

export const G_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const gShort = (d: Date) => `${G_MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCDate()}`;

export function ethiopianMonth(y: number, m: number): MonthSpec {
  const first = toJdn(y, m, 1);
  const length = monthLength(y, m);
  const a = jdnToDate(first), b = jdnToDate(first + length - 1);
  return {
    key: `e${y}-${m}`, first, length,
    title: `${MONTHS[m - 1]} ${y}`,
    titleAm: MONTHS_AM[m - 1],
    subtitle: `${gShort(a)} – ${gShort(b)}, ${b.getUTCFullYear()}`,
  };
}

export function gregorianMonth(y: number, m: number): MonthSpec {
  const first = gregorianToJdn(y, m, 1);
  const length = gregorianToJdn(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1) - first;
  const a = fromJdn(first), b = fromJdn(first + length - 1);
  return {
    key: `g${y}-${m}`, first, length,
    title: `${G_MONTHS[m - 1]} ${y}`,
    subtitle:
      a.m === b.m
        ? `${MONTHS[a.m - 1]} ${a.y}`
        : `${MONTHS[a.m - 1]} ${a.d} – ${MONTHS[b.m - 1]} ${b.d}, ${b.y}`,
  };
}

/** Every month (in the chosen calendar) that a range of days touches. */
export function monthsCovering(cal: Cal, start: number, end: number): MonthSpec[] {
  const out: MonthSpec[] = [];
  if (cal === "ethiopian") {
    const s = fromJdn(start), e = fromJdn(end);
    for (let y = s.y, m = s.m; y < e.y || (y === e.y && m <= e.m); m === 13 ? ((m = 1), y++) : m++)
      out.push(ethiopianMonth(y, m));
  } else {
    const s = jdnToDate(start), e = jdnToDate(end);
    for (let y = s.getUTCFullYear(), m = s.getUTCMonth() + 1; y < e.getUTCFullYear() || (y === e.getUTCFullYear() && m <= e.getUTCMonth() + 1); m === 12 ? ((m = 1), y++) : m++)
      out.push(gregorianMonth(y, m));
  }
  return out;
}

/** The other calendar's date for the small corner label: "Oct 27" or "Tikimt 17". */
export function otherDate(cal: Cal, j: number) {
  if (cal === "ethiopian") {
    const g = jdnToDate(j);
    return g.getUTCDate() === 1 ? `${G_MONTHS[g.getUTCMonth()].slice(0, 3)} 1` : String(g.getUTCDate());
  }
  const e = fromJdn(j);
  return e.d === 1 ? `${MONTHS[e.m - 1]} 1` : String(e.d);
}

export const dayNumber = (cal: Cal, j: number) => (cal === "ethiopian" ? fromJdn(j).d : jdnToDate(j).getUTCDate());
