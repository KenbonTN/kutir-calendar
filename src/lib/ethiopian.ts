// Ethiopian calendar math, built on Julian Day Numbers (JDN).
// A "day" everywhere in the app is a JDN integer, so ranges and lookups stay simple.

export type EtDate = { y: number; m: number; d: number };

const EPOCH = 1724221; // JDN of 1 Meskerem, year 1 (Amete Mihret)

export const toJdn = (y: number, m: number, d: number) =>
  EPOCH + 365 * (y - 1) + Math.floor(y / 4) + 30 * (m - 1) + d - 1;

export function fromJdn(j: number): EtDate {
  const c = j - 1723856;
  const r = ((c % 1461) + 1461) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  return {
    y: 4 * Math.floor(c / 1461) + Math.floor(r / 365) - Math.floor(r / 1460),
    m: Math.floor(n / 30) + 1,
    d: (n % 30) + 1,
  };
}

/** Pagume has 6 days in the year before a Gregorian leap year (E.C. year % 4 === 3). */
export const monthLength = (y: number, m: number) => (m < 13 ? 30 : y % 4 === 3 ? 6 : 5);

export const gregorianToJdn = (y: number, m: number, d: number) =>
  Math.floor(Date.UTC(y, m - 1, d) / 864e5) + 2440588;
export const dateToJdn = (dt: Date) => gregorianToJdn(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
export const jdnToDate = (j: number) => new Date((j - 2440588) * 864e5);

/** JDN of a date in the (old) Julian calendar, used for the Orthodox Easter computus. */
export function julianToJdn(y: number, m: number, d: number) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - 32083;
}

/** 0 = Monday … 6 = Sunday */
export const weekday = (j: number) => ((j % 7) + 7) % 7;

export const MONTHS = [
  "Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit", "Megabit",
  "Miyazya", "Ginbot", "Sene", "Hamle", "Nehase", "Pagume",
];
export const MONTHS_AM = [
  "መስከረም", "ጥቅምት", "ኅዳር", "ታኅሣሥ", "ጥር", "የካቲት", "መጋቢት",
  "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ",
];
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const WEEKDAYS_AM = ["ሰኞ", "ማክሰኞ", "ረቡዕ", "ሐሙስ", "ዓርብ", "ቅዳሜ", "እሑድ"];
export const WEEKDAYS_AM_SHORT = ["ሰኞ", "ማክ", "ረቡ", "ሐሙ", "ዓር", "ቅዳ", "እሑ"];

const GEEZ_ONES = ["", "፩", "፪", "፫", "፬", "፭", "፮", "፯", "፰", "፱"];
const GEEZ_TENS = ["", "፲", "፳", "፴", "፵", "፶", "፷", "፸", "፹", "፺"];
/** Ge'ez numeral for 1–99 (enough for days and months). */
export const geez = (n: number) => GEEZ_TENS[Math.floor(n / 10)] + GEEZ_ONES[n % 10];

export const formatEt = (j: number) => {
  const e = fromJdn(j);
  return `${e.d} ${MONTHS[e.m - 1]} ${e.y}`;
};
export const formatEtAm = (j: number) => {
  const e = fromJdn(j);
  return `${MONTHS_AM[e.m - 1]} ${e.d} ቀን ${e.y}`;
};

const gLong = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const gMed = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const gShort = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
export const formatGLong = (j: number) => gLong.format(jdnToDate(j));
export const formatG = (j: number) => gMed.format(jdnToDate(j));
export const formatGShort = (j: number) => gShort.format(jdnToDate(j));

/** 20, 0 → "8:00 PM" */
export const twelveHour = (h: number, min: number) =>
  `${h % 12 || 12}:${String(min).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;

/** "20:30" → "8:30 PM" */
export const formatClock = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return twelveHour(h, m);
};

/** Ethiopia runs on EAT (UTC+3) all year, no daylight saving. */
export const ADDIS_OFFSET_H = 3;

/** JDN of the Addis Ababa calendar day an instant falls on. */
export const addisJdn = (iso: string) =>
  Math.floor((Date.parse(iso) + ADDIS_OFFSET_H * 3600e3) / 864e5) + 2440588;

/**
 * Kickoff time in Addis, both ways people say it:
 * the international 12-hour clock, and the Ethiopian clock, where the day starts at 6 a.m.
 * (10:00 PM EAT is "ከምሽቱ 4 ሰዓት", 4 o'clock in the evening).
 */
export function addisTime(iso: string) {
  const t = new Date(Date.parse(iso) + ADDIS_OFFSET_H * 3600e3);
  const h = t.getUTCHours();
  const min = t.getUTCMinutes();
  const mm = String(min).padStart(2, "0");
  const etHour = (h + 6) % 12 || 12;
  const period =
    h >= 6 && h < 12 ? "ከጠዋቱ" : h >= 12 && h < 18 ? "ከሰዓት በኋላ" : h >= 18 ? "ከምሽቱ" : "ከሌሊቱ";
  const periodEn =
    h >= 6 && h < 12 ? "morning" : h >= 12 && h < 18 ? "afternoon" : h >= 18 ? "evening" : "night";
  return {
    intl: twelveHour(h, min),
    ethiopian: `${period} ${etHour}${min ? ":" + mm : ""} ሰዓት`,
    ethiopianEn: `${etHour}${min ? ":" + mm : ""} in the ${periodEn} (Ethiopian clock)`,
  };
}
