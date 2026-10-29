// Telegram quick-add. Run by .github/workflows/telegram.yml every few minutes:
// reads new messages sent to the bot, links chats to accounts, and adds tasks,
// pool items, spending and income to the person's Kutir. The app picks them up
// on its next sync, like an edit from another device.
//
// Needs: FIREBASE_SERVICE_ACCOUNT (JSON), TELEGRAM_BOT_TOKEN.

import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.log("telegram: no TELEGRAM_BOT_TOKEN, nothing to do");
  process.exit(0);
}
initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();

const api = async (method, body) => {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`${method}: ${json.description}`);
  return json.result;
};
const reply = (chat, text) => api("sendMessage", { chat_id: chat, text, parse_mode: "HTML", disable_web_page_preview: true }).catch((e) => console.warn(e.message));

const ADDIS_OFFSET_MIN = 180;
const today = Math.floor((Date.now() + ADDIS_OFFSET_MIN * 60e3) / 864e5) + 2440588; // Addis calendar day as a JDN
const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------- Understanding a message ---------- */

const CATS = [
  ["food", /food|lunch|dinner|breakfast|coffee|buna|tea|shai|injera|restaurant|cafe|café|macchiato|juice|snack|groceries|grocery|bread|meat|sga/i],
  ["transport", /taxi|ride|bus|fuel|benzine|petrol|gas|uber|feres|bajaj|transport|lada|parking|train/i],
  ["rent", /rent|kiray|house|repair|furniture/i],
  ["bills", /airtime|card|wifi|internet|electric|water|bill|ethio ?tel|safaricom|package|subscription|netflix|spotify/i],
  ["health", /pharmacy|medicine|doctor|hospital|clinic|gym|dentist|lab/i],
  ["fun", /movie|cinema|party|drinks|beer|game|concert|outing/i],
  ["education", /book|course|school|tuition|class|exam|udemy/i],
  ["family", /gift|family|mom|mum|dad|mother|father|sister|brother|kids?/i],
  ["church", /church|tithe|asrat|selet|mosque|charity|donat|mahber|idir/i],
  ["shopping", /cloth|shoe|shopping|market|merkato|dress|shirt|phone|laptop/i],
];
const SOURCES = [
  ["salary", /salary|paycheck|wage|demoz/i],
  ["business", /sales?|business|shop|customer|order/i],
  ["freelance", /freelance|client|gig|project|side/i],
  ["bonus", /bonus|allowance|per ?diem/i],
  ["equb", /equb|ekub|iqub/i],
  ["rent", /rent|kiray|tenant/i],
  ["invest", /interest|dividend|invest|saving/i],
  ["family", /family|mom|dad|support/i],
  ["gift", /gift/i],
  ["refund", /refund|repaid|paid back|loan back/i],
];
const guess = (list, text, fallback) => list.find(([, re]) => re.test(text))?.[0] ?? fallback;
const amountOf = (s) => Math.round(Number(s.replace(/,/g, "")) * 100) / 100;

export function parse(raw) {
  const text = raw.trim().replace(/\s+/g, " ");
  let m;
  if ((m = text.match(/^\/start(?:@\w+)?\s+([A-F0-9]{8})$/i))) return { kind: "link", code: m[1].toUpperCase() };
  if (/^\/(start|help)(@\w+)?$/i.test(text)) return { kind: "help" };
  if (/^\/today(@\w+)?$/i.test(text)) return { kind: "today" };
  if ((m = text.match(/^(?:spent|paid|-)\s*([\d,]+(?:\.\d+)?)\s*(?:birr|br|etb)?\s*(?:on|for)?\s*(.*)$/i)))
    return { kind: "expense", amount: amountOf(m[1]), note: m[2], category: guess(CATS, m[2], "other") };
  if ((m = text.match(/^(?:got|earned|received|income|\+)\s*([\d,]+(?:\.\d+)?)\s*(?:birr|br|etb)?\s*(?:from)?\s*(.*)$/i))) {
    const source = guess(SOURCES, m[2], "other");
    return { kind: "income", amount: amountOf(m[1]), note: m[2], source, label: source === "other" && m[2] ? m[2].slice(0, 40) : undefined };
  }
  if ((m = text.match(/^(?:pool|later|someday)\s*[:\-–]?\s*(.+)$/i))) return { kind: "pool", title: m[1] };
  if ((m = text.match(/^(?:tomorrow|tmr|tmrw)\s*[:\-–]?\s*(.+)$/i))) return { kind: "task", title: m[1], day: today + 1 };
  if ((m = text.match(/^(?:task|todo|today|t)\s*[:\-–]\s*(.+)$/i))) return { kind: "task", title: m[1], day: today };
  if (text.startsWith("/")) return { kind: "help" };
  return { kind: "task", title: text, day: today };
}

const HELP = [
  "<b>Kutir quick-add</b>",
  "• <code>call the bank</code> → task for today",
  "• <code>tomorrow: gym</code> → task for tomorrow",
  "• <code>pool: read a book</code> → into the task pool",
  "• <code>-250 taxi</code> or <code>spent 250 lunch</code> → spending",
  "• <code>+5000 salary</code> or <code>got 1200 from a client</code> → income",
  "• /today → what's left today",
].join("\n");

const fmt = (n) => new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(n);

/* ---------- Applying it ---------- */

async function add(ref, item) {
  const now = Date.now();
  const field = { task: "tasks", pool: "pool", expense: "expenses", income: "income" }[item.kind];
  const rec =
    item.kind === "task"
      ? { id: uid(), title: item.title.slice(0, 200), date: item.day, origin: item.day, done: false, missed: [], created: now, u: now }
      : item.kind === "pool"
        ? { id: uid(), title: item.title.slice(0, 200), created: now, u: now }
        : item.kind === "expense"
          ? { id: uid(), amount: item.amount, category: item.category, note: item.note.slice(0, 80), day: today, created: now, u: now }
          : { id: uid(), amount: item.amount, source: item.source, ...(item.label ? { label: item.label } : {}), note: item.note.slice(0, 80), day: today, created: now, u: now };
  await ref.update({ [field]: FieldValue.arrayUnion(rec), updated: FieldValue.serverTimestamp() });
}

function todayList(data) {
  const open = (data.tasks ?? []).filter((t) => !t.deleted && !t.done && t.date <= today);
  if (!open.length) return "Nothing left today. ✕";
  return `<b>${open.length} left today</b>\n` + open.slice(0, 15).map((t) => `☐ ${escape(t.title)}`).join("\n");
}
const escape = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ---------- Main ---------- */

const meta = db.collection("meta").doc("telegram");
const offset = (await meta.get()).data()?.offset ?? 0;
const updates = await api("getUpdates", { offset, timeout: 0, allowed_updates: ["message"] });
let handled = 0;

for (const u of updates) {
  const msg = u.message;
  if (!msg?.text || msg.chat?.type !== "private") continue;
  const chat = msg.chat.id;
  const item = parse(msg.text);
  try {
    if (item.kind === "link") {
      const found = await db.collection("users").where("telegram.code", "==", item.code).limit(1).get();
      if (found.empty) {
        await reply(chat, "That code didn't match. In Kutir, open Settings → Telegram quick-add and use the newest code.");
        continue;
      }
      // One chat, one account: unlink it anywhere else first.
      const old = await db.collection("users").where("telegram.chat", "==", chat).get();
      for (const d of old.docs) if (d.id !== found.docs[0].id) await d.ref.update({ telegram: FieldValue.delete() });
      await found.docs[0].ref.update({ telegram: { chat, name: msg.from?.first_name ?? "" } });
      await reply(chat, `Linked to your Kutir ✕\n\n${HELP}`);
      handled++;
      continue;
    }
    if (item.kind === "help") {
      await reply(chat, HELP);
      continue;
    }
    const found = await db.collection("users").where("telegram.chat", "==", chat).limit(1).get();
    if (found.empty) {
      await reply(chat, "This chat isn't linked yet. In Kutir, open Settings → Telegram quick-add → Connect Telegram.");
      continue;
    }
    const ref = found.docs[0].ref;
    if (item.kind === "today") {
      await reply(chat, todayList(found.docs[0].data()));
      continue;
    }
    if ((item.kind === "expense" || item.kind === "income") && !(item.amount > 0)) {
      await reply(chat, "I couldn't read the amount. Try <code>-250 taxi</code>.");
      continue;
    }
    await add(ref, item);
    handled++;
    const what =
      item.kind === "task"
        ? `☐ ${escape(item.title)} · ${item.day === today ? "today" : "tomorrow"}`
        : item.kind === "pool"
          ? `📥 ${escape(item.title)} · in the pool`
          : item.kind === "expense"
            ? `− ${fmt(item.amount)} Birr · ${item.category}${item.note ? ` · ${escape(item.note)}` : ""}`
            : `+ ${fmt(item.amount)} Birr · ${item.label ? escape(item.label) : item.source}`;
    await reply(chat, `Added ${what}`);
  } catch (e) {
    console.warn(`message ${u.update_id}: ${e.message}`);
    await reply(chat, "Something went wrong saving that. Try again in a minute.");
  }
}

if (updates.length) await meta.set({ offset: updates[updates.length - 1].update_id + 1 }, { merge: true });
console.log(`telegram: ${updates.length} updates, ${handled} saved`);
