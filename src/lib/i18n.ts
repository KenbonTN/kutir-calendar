"use client";

// Amharic option. Labels are written in English in the code and looked up here;
// anything without a translation yet stays in English.

import { useCallback } from "react";
import { useStored } from "./storage";

export type Lang = "en" | "am";

const AM: Record<string, string> = {
  Today: "ዛሬ",
  Pool: "ማከማቻ",
  Calendar: "ቀን መቁጠሪያ",
  Money: "ገንዘብ",
  Life: "ሕይወት",
  Settings: "ቅንብሮች",
  "Today's tasks": "የዛሬ ሥራዎች",
  "done today": "ዛሬ የተሠሩ",
  "From the pool": "ከማከማቻው",
  "days left": "ቀናት ቀርተዋል",
  "Crossed off": "የተሰረዙ",
  "Tasks done": "የተሠሩ ሥራዎች",
  "Perfect days": "ሙሉ ቀናት",
  Streak: "ተከታታይ",
  "New countdown": "አዲስ ቆጠራ",
  "Countdown calendar": "የቆጠራ ቀን መቁጠሪያ",
  "Add a task": "ሥራ ጨምር",
  Add: "ጨምር",
  Save: "አስቀምጥ",
  Delete: "ሰርዝ",
  Cancel: "ተው",
  "Good morning": "እንደምን አደሩ",
  "Good afternoon": "እንደምን ዋሉ",
  "Good evening": "እንደምን አመሹ",
  "Big goals": "ትልልቅ ግቦች",
  "Habits": "ልማዶች",
  "Keep in touch": "ግንኙነት",
  "Fasting": "ጾም",
  "Year in review": "የዓመቱ ግምገማ",
  "Budgets": "በጀት",
  "Equb": "እቁብ",
  "Debts & loans": "ብድርና ዕዳ",
  "Profit by month": "ወርሃዊ ትርፍ",
  "Money in": "ገቢ",
  "Money out": "ወጪ",
  "Left over": "የቀረ",
  "Spending": "ወጪዎች",
  "Birthdays & dates": "ልደትና ቀናት",
  "Focus": "ትኩረት",
  "Language": "ቋንቋ",
  "Backup & export": "ምትኬና ማውጫ",
  "Telegram quick-add": "በቴሌግራም ፈጥኖ መጨመር",
  "Evening reminder": "የምሽት ማስታወሻ",
  "Repeating tasks": "የሚደጋገሙ ሥራዎች",
  "Install as an app": "እንደ መተግበሪያ ጫን",
  "Weekly review": "ሳምንታዊ ግምገማ",
  "Task pool": "የሥራ ማከማቻ",
  "Life areas": "የሕይወት ዘርፎች",
  "Kept the fast": "ጾሙን ጠብቄያለሁ",
  "Didn't fast": "አልጾምኩም",
  "Called": "ደወልኩ",
};

export function useLang() {
  return useStored<Lang>("kutir-lang", "en");
}

export function useT() {
  const [lang] = useLang();
  return useCallback((en: string) => (lang === "am" ? (AM[en] ?? en) : en), [lang]);
}
