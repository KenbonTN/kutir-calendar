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
  const parts = [];
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
