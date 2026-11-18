// Prayer reminders. Run by .github/workflows/prayers.yml every 5 minutes: for each
// person who turned prayer reminders on, works out today's times for their place
// (Muslims: the five prayers; Orthodox Christians: their chosen morning and
// evening times) and sends one notification per prayer, at most 20 minutes late.
//
// Needs: FIREBASE_SERVICE_ACCOUNT (JSON), VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY.

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import webpush from "web-push";

const LATE_LIMIT_MIN = 20;

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();
webpush.setVapidDetails("https://kenbontn.github.io/kutir-calendar/", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

/* Prayer times, as in src/lib/faith.ts. */
const ADDIS = { lat: 9.0301, lng: 38.7408, tz: 3 };
const METHODS = {
  mwl: { fajr: 18, isha: 17 }, umm: { fajr: 18.5, isha: { after: 90 } }, egypt: { fajr: 19.5, isha: 17.5 },
  karachi: { fajr: 18, isha: 18 }, isna: { fajr: 15, isha: 15 },
};
const rad = (d) => (d * Math.PI) / 180, deg = (r) => (r * 180) / Math.PI, fix = (a, b) => ((a % b) + b) % b;
function sun(jd) {
  const D = jd - 2451545.0;
  const g = fix(357.529 + 0.98560028 * D, 360), q = fix(280.459 + 0.98564736 * D, 360);
  const L = fix(q + 1.915 * Math.sin(rad(g)) + 0.02 * Math.sin(rad(2 * g)), 360);
  const e = 23.439 - 0.00000036 * D;
  const RA = fix(deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(L)), Math.cos(rad(L)))) / 15, 24);
  return { decl: deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(L)))), eqt: q / 15 - RA };
}
function prayerTimes(j, p) {
  const lat = p.lat ?? ADDIS.lat, lng = p.lng ?? ADDIS.lng, tz = p.tz ?? ADDIS.tz;
  const m = METHODS[p.method ?? "mwl"] ?? METHODS.mwl, asrFactor = p.asr === "hanafi" ? 2 : 1;
  const jd = j - 0.5 - lng / (15 * 24);
  const noon = (t) => fix(12 - sun(jd + t).eqt, 24);
  const angleTime = (angle, t, before) => {
    const { decl } = sun(jd + t);
    const c = (-Math.sin(rad(angle)) - Math.sin(rad(decl)) * Math.sin(rad(lat))) / (Math.cos(rad(decl)) * Math.cos(rad(lat)));
    const T = deg(Math.acos(Math.max(-1, Math.min(1, c)))) / 15;
    return noon(t) + (before ? -T : T);
  };
  const asrTime = (t) => {
    const { decl } = sun(jd + t);
    return angleTime(-deg(Math.atan(1 / (asrFactor + Math.tan(rad(Math.abs(lat - decl)))))), t, false);
  };
  const calc = (g) => ({
    fajr: angleTime(m.fajr, g.fajr / 24, true), dhuhr: noon(g.dhuhr / 24), asr: asrTime(g.asr / 24),
    maghrib: angleTime(0.833, g.maghrib / 24, false), isha: typeof m.isha === "number" ? angleTime(m.isha, g.isha / 24, false) : 0,
  });
  let t = calc({ fajr: 5, dhuhr: 12, asr: 13, maghrib: 18, isha: 18 });
  t = calc(t);
  if (typeof m.isha !== "number") t.isha = t.maghrib + m.isha.after / 60;
  const local = (h) => Math.round(fix(h + tz - lng / 15, 24) * 60);
  return { fajr: local(t.fajr), dhuhr: local(t.dhuhr) + 1, asr: local(t.asr), maghrib: local(t.maghrib), isha: local(t.isha) };
}

const NAMES = { fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha" };
const twelve = (mins) => {
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

/** The reminder due now for this person, if any: { key, title, body }. */
function due(p, nowUtc) {
  const tz = p.tz ?? ADDIS.tz;
  const local = new Date(nowUtc + tz * 3600e3);
  const j = Math.floor(local.getTime() / 864e5) + 2440588;
  const mins = local.getUTCHours() * 60 + local.getUTCMinutes();
  const list =
    p.faith === "muslim"
      ? Object.entries(prayerTimes(j, p)).map(([k, at]) => ({ key: k, at, title: `Time for ${NAMES[k]}`, body: `${NAMES[k]} is at ${twelve(at)}. Tap to mark it prayed in Kutir.` }))
      : (p.times ?? ["06:00", "21:00"]).map((t, i) => {
          const [h, m] = t.split(":").map(Number);
          return { key: i ? "evening" : "morning", at: h * 60 + m, title: i ? "Evening prayer" : "Morning prayer", body: "A few minutes with God. Tap to mark it in Kutir." };
        });
  const hit = list.filter((x) => mins >= x.at && mins - x.at <= LATE_LIMIT_MIN).pop();
  return hit ? { ...hit, id: `${j}-${hit.key}` } : null;
}

const snap = await db.collection("users").get();
let sent = 0, people = 0;
for (const doc of snap.docs) {
  const data = doc.data();
  const p = (data.profile ?? []).find((x) => x.id === "me" && !x.deleted);
  if (!p?.remind || (p.faith !== "muslim" && p.faith !== "orthodox")) continue;
  people++;
  const d = due(p, Date.now());
  if (!d || data.lastPrayer === d.id) continue;
  const payload = JSON.stringify({ title: d.title, body: d.body, url: "https://kenbontn.github.io/kutir-calendar/", tag: "kutir-prayer" });
  const keep = [];
  for (const sub of data.reminder?.subs ?? []) {
    try {
      await webpush.sendNotification(sub, payload, { TTL: LATE_LIMIT_MIN * 60 });
      keep.push(sub);
      sent++;
    } catch (err) {
      if (err.statusCode !== 404 && err.statusCode !== 410) keep.push(sub);
    }
  }
  await doc.ref.update({ lastPrayer: d.id, "reminder.subs": keep });
}
console.log(`prayers: ${people} people with prayer reminders, ${sent} notifications sent`);
