// Sends each person's evening reminder: the tasks still open today and a nudge
// to log screen time. Run by .github/workflows/reminders.yml every half hour in
// the evening; each person gets at most one reminder a day, at or after their chosen time.
//
// Needs: FIREBASE_SERVICE_ACCOUNT (JSON), VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY.

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import webpush from "web-push";

const ADDIS_OFFSET_MIN = 180; // Ethiopia is UTC+3 all year
const LATE_LIMIT_MIN = 180; // don't send a reminder more than 3 hours late

const account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
initializeApp({ credential: cert(account) });
const db = getFirestore();
webpush.setVapidDetails(
  "https://kenbontn.github.io/kutir-calendar/",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

const addisNow = new Date(Date.now() + ADDIS_OFFSET_MIN * 60e3);
const today = Math.floor(addisNow.getTime() / 864e5) + 2440588; // JDN of the Addis calendar day
const nowMin = addisNow.getUTCHours() * 60 + addisNow.getUTCMinutes();
const weekday = (j) => ((j % 7) + 7) % 7; // 0 = Monday, as in the app

// Ethiopian calendar math, as in src/lib/ethiopian.ts and src/lib/events.ts.
const toJdn = (y, m, d) => 1724221 + 365 * (y - 1) + Math.floor(y / 4) + 30 * (m - 1) + d - 1;
function fromJdn(j) {
  const c = j - 1723856;
  const r = ((c % 1461) + 1461) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  return { y: 4 * Math.floor(c / 1461) + Math.floor(r / 365) - Math.floor(r / 1460), m: Math.floor(n / 30) + 1, d: (n % 30) + 1 };
}
const monthLength = (y, m) => (m < 13 ? 30 : y % 4 === 3 ? 6 : 5);
const gToJdn = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / 864e5) + 2440588;
const jdnToDate = (j) => new Date((j - 2440588) * 864e5);

/** The next day (on or after j) an important date falls on, or null. */
function nextOn(ev, j) {
  if (!ev.yearly) return ev.date >= j ? ev.date : null;
  const eth = ev.cal === "ethiopian";
  const y = eth ? fromJdn(j).y : jdnToDate(j).getUTCFullYear();
  for (const yy of [y - 1, y, y + 1]) {
    let d;
    if (eth) {
      const e = fromJdn(ev.date);
      d = toJdn(yy, e.m, Math.min(e.d, monthLength(yy, e.m)));
    } else {
      const g = jdnToDate(ev.date);
      const m = g.getUTCMonth() + 1;
      d = gToJdn(yy, m, Math.min(g.getUTCDate(), new Date(Date.UTC(yy, m, 0)).getUTCDate()));
    }
    if (d >= j && d >= ev.date) return d;
  }
  return null;
}

/** "Mom's birthday is tomorrow." for dates whose reminder window covers tomorrow or today. */
function dateLines(events) {
  const out = [];
  for (const ev of events ?? []) {
    if (ev.deleted) continue;
    const d = nextOn(ev, today + 1); // in the evening, today's date has mostly passed: look ahead
    if (d == null || d - today > Math.max(1, ev.remind ?? 0)) continue;
    const when = d === today + 1 ? "tomorrow" : `in ${d - today} days`;
    const what = ev.kind === "birthday" ? `${ev.title}'s birthday` : ev.title;
    out.push({ d, text: `${what} is ${when}.` });
  }
  return out.sort((a, b) => a.d - b.d).map((x) => x.text);
}

/** People you're overdue to call, equb rounds due, and debts due tomorrow. */
function lifeLines(data) {
  const out = [];
  const people = (data.people ?? []).filter((p) => !p.deleted && p.last + p.every <= today);
  if (people.length)
    out.push(`Time to call ${people.slice(0, 2).map((p) => p.name).join(" and ")}${people.length > 2 ? ` and ${people.length - 2} more` : ""}.`);
  for (const e of data.equbs ?? []) {
    if (e.deleted) continue;
    const next = Math.floor((today + 1 - e.start) / e.every) + 1;
    if (next >= 1 && next <= e.rounds && e.start + (next - 1) * e.every === today + 1 && !(e.paid ?? []).includes(next))
      out.push(`${e.name} equb payment is due tomorrow.`);
  }
  for (const d of data.debts ?? [])
    if (!d.deleted && d.due === today + 1 && d.repaid < d.amount)
      out.push(d.dir === "owe" ? `You're due to pay ${d.person} back tomorrow.` : `${d.person} is due to pay you back tomorrow.`);
  return out;
}

function message(data) {
  const tasks = (data.tasks ?? []).filter((t) => !t.deleted);
  const open = tasks.filter((t) => !t.done && (t.date === today || (!t.routine && t.date < today)));
  const made = new Set(tasks.map((t) => t.id));
  for (const r of data.routines ?? [])
    if (!r.deleted && r.start <= today && r.days.includes(weekday(today)) && !made.has(`r-${r.id}-${today}`))
      open.push({ title: r.title });
  const logged = (data.screen ?? []).some((l) => l.day === today && !l.deleted);

  const names = open.slice(0, 3).map((t) => t.title).join(", ") + (open.length > 3 ? ` and ${open.length - 3} more` : "");
  const title = open.length
    ? `${open.length} task${open.length === 1 ? "" : "s"} left today`
    : "Every task done today ✕";
  const parts = [...dateLines(data.events), ...lifeLines(data)];
  if (open.length) parts.push(`${names}. Unfinished tasks move to tomorrow at midnight.`);
  if (!logged) parts.push("Log today's TikTok, Instagram and YouTube time.");
  if (!parts.length) parts.push("Great day. See you tomorrow.");
  return { title, body: parts.join(" ") };
}

const snap = await db.collection("users").where("reminder.on", "==", true).get();
let sent = 0;
for (const doc of snap.docs) {
  const data = doc.data();
  const r = data.reminder;
  const [h, m] = String(r.time || "21:00").split(":").map(Number);
  const due = h * 60 + m;
  if (data.lastReminder === today || nowMin < due || nowMin > due + LATE_LIMIT_MIN) continue;

  const payload = JSON.stringify({ ...message(data), url: "https://kenbontn.github.io/kutir-calendar/" });
  const keep = [];
  for (const sub of r.subs ?? []) {
    try {
      await webpush.sendNotification(sub, payload, { TTL: 3 * 3600 });
      keep.push(sub);
      sent++;
    } catch (err) {
      // 404/410: the device unsubscribed or the app was removed; forget it.
      if (err.statusCode !== 404 && err.statusCode !== 410) {
        keep.push(sub);
        console.warn(`push failed (${err.statusCode ?? err.message})`);
      }
    }
  }
  await doc.ref.update({
    lastReminder: today,
    "reminder.subs": keep,
    "reminder.on": keep.length > 0,
  });
}
console.log(`reminders: ${snap.size} people with reminders on, ${sent} notifications sent`);
