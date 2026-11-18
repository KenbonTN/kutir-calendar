// Downloads the verse-of-the-day texts once, so the app never shows a verse typed
// from memory. Quran: Arabic (Uthmani) and Marmaduke Pickthall's 1930 English
// translation (public domain), from alquran.cloud. Bible: King James Version
// (public domain), from bible-api.com. Writes src/data/verses.json.
//
// Run: node scripts/fetch-verses.mjs

import { writeFileSync } from "node:fs";

// [reference, theme] — themes match the quote themes in src/lib/quotes.ts.
const QURAN = [
  ["103:1-3", "time"], ["59:18", "purpose"], ["18:23-24", "start"], ["94:5-6", "steady"], ["94:7-8", "focus"],
  ["2:286", "steady"], ["2:153", "steady"], ["2:152", "purpose"], ["13:11", "start"], ["13:28", "focus"],
  ["3:139", "steady"], ["3:159", "start"], ["3:200", "steady"], ["65:2-3", "purpose"], ["39:53", "start"],
  ["29:69", "steady"], ["53:39-40", "start"], ["8:46", "steady"], ["17:23-24", "purpose"], ["31:14", "purpose"],
  ["30:21", "purpose"], ["49:13", "purpose"], ["2:261", "money"], ["2:274", "money"], ["4:135", "purpose"],
  ["5:8", "purpose"], ["16:90", "purpose"], ["16:97", "steady"], ["25:63", "focus"], ["31:18-19", "focus"],
  ["40:60", "purpose"], ["2:186", "purpose"], ["3:8", "focus"], ["25:74", "purpose"], ["20:114", "focus"],
  ["96:1-5", "start"], ["39:10", "steady"], ["42:43", "steady"], ["64:16", "start"], ["62:10", "money"],
  ["9:105", "start"], ["17:78", "time"], ["11:114", "time"], ["2:45", "steady"], ["29:45", "focus"],
  ["2:183", "steady"], ["67:2", "time"], ["3:185", "time"], ["57:20", "time"], ["28:77", "money"],
  ["2:195", "money"], ["17:35", "money"], ["2:280", "money"], ["25:67", "money"], ["17:29", "money"],
  ["17:26-27", "money"], ["7:31", "money"], ["14:7", "purpose"], ["93:11", "purpose"], ["16:18", "purpose"],
  ["73:20", "time"], ["2:110", "start"], ["63:10", "start"], ["4:103", "time"], ["70:19-23", "steady"],
];

const BIBLE = [
  ["Psalm 90:12", "time"], ["Ephesians 5:15-16", "time"], ["Ecclesiastes 3:1", "time"], ["Psalm 118:24", "time"],
  ["James 4:13-15", "time"], ["Proverbs 27:1", "start"], ["Ecclesiastes 9:10", "start"], ["Ecclesiastes 11:4", "start"],
  ["Proverbs 6:6-8", "start"], ["Mark 1:35", "start"], ["James 1:22", "start"], ["Proverbs 16:3", "purpose"],
  ["Proverbs 16:9", "purpose"], ["Proverbs 19:21", "purpose"], ["Proverbs 3:5-6", "purpose"], ["Matthew 6:33", "purpose"],
  ["Micah 6:8", "purpose"], ["Psalm 127:1", "purpose"], ["Luke 6:31", "purpose"], ["1 Corinthians 16:14", "purpose"],
  ["Colossians 3:23", "focus"], ["Philippians 3:13-14", "focus"], ["Hebrews 12:1", "focus"], ["Proverbs 4:23", "focus"],
  ["Psalm 46:10", "focus"], ["Romans 12:2", "focus"], ["1 Corinthians 10:31", "focus"], ["Galatians 6:9", "steady"],
  ["Isaiah 40:31", "steady"], ["Romans 12:12", "steady"], ["Lamentations 3:22-23", "steady"], ["Philippians 4:13", "steady"],
  ["1 Corinthians 9:24", "steady"], ["Isaiah 41:10", "steady"], ["Joshua 1:9", "steady"], ["Romans 8:28", "steady"],
  ["Philippians 4:6-7", "steady"], ["Matthew 6:34", "steady"], ["Matthew 11:28", "steady"], ["2 Timothy 1:7", "steady"],
  ["John 14:27", "steady"], ["1 Thessalonians 5:16-18", "purpose"], ["Psalm 37:5", "purpose"], ["Matthew 7:7", "start"],
  ["Proverbs 21:5", "money"], ["Proverbs 13:11", "money"], ["Proverbs 22:7", "money"], ["Proverbs 24:27", "money"],
  ["Luke 14:28", "money"], ["Luke 16:10", "money"], ["Proverbs 10:4", "money"], ["Proverbs 12:24", "money"],
  ["Deuteronomy 8:18", "money"], ["Hebrews 13:5", "money"], ["1 Timothy 6:10", "money"], ["Malachi 3:10", "money"],
  ["2 Thessalonians 3:10", "start"], ["James 1:5", "focus"], ["Psalm 1:1-3", "purpose"], ["Proverbs 3:9-10", "money"],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) {
  for (let i = 0; i < 8; i++) {
    let res;
    try {
      res = await fetch(url);
    } catch {
      await sleep(3000 * (i + 1)); // slow or dropped connection: try again
      continue;
    }
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) await sleep(5000 * (i + 1));
    else throw new Error(`${res.status} ${url}`);
  }
  throw new Error(`gave up on ${url}`);
}

const ayahs = (ref) => {
  const [s, range] = ref.split(":");
  const [a, b = a] = range.split("-").map(Number);
  return Array.from({ length: b - a + 1 }, (_, i) => `${s}:${a + i}`);
};

const quran = [];
for (const [ref, theme] of QURAN) {
  let ar = [], en = [], surah = "";
  for (const one of ayahs(ref)) {
    const { data } = await get(`https://api.alquran.cloud/v1/ayah/${one}/editions/quran-uthmani,en.pickthall`);
    // The source opens verse 1 of each surah with the Bismillah, which is a heading there (not part of the verse) except in Al-Fatiha.
    const words = data[0].text.split(" ");
    const text = data[0].numberInSurah === 1 && data[0].surah.number !== 1 && words[0].startsWith("بِسْمِ") ? words.slice(4).join(" ") : data[0].text;
    ar.push(text);
    en.push(data[1].text);
    surah = data[0].surah.englishName;
    await sleep(150);
  }
  quran.push({ ref, surah, ar: ar.join(" ۝ "), en: en.join(" "), theme });
  process.stdout.write(".");
}
console.log(`\nquran: ${quran.length}`);

const bible = [];
for (const [ref, theme] of BIBLE) {
  const d = await get(`https://bible-api.com/${encodeURIComponent(ref)}?translation=kjv`);
  bible.push({ ref: d.reference, en: d.text.replace(/\s+/g, " ").trim(), theme });
  process.stdout.write(".");
  await sleep(2500); // bible-api.com allows about 15 requests per 30 seconds
}
console.log(`\nbible: ${bible.length}`);

writeFileSync(
  new URL("../src/data/verses.json", import.meta.url),
  JSON.stringify({ fetched: new Date().toISOString(), quran, bible }, null, 1) + "\n",
);
