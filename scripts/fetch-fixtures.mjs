// Pulls this season's Arsenal fixtures and the big Champions League games into
// src/data/fixtures.json. Runs before every build (and daily in CI), so the
// static site stays current without any API key.
//
// Sources (both free, no key):
//   Premier League  openfootball/football.json (kickoffs in UK local time)
//   Champions League TheSportsDB public API      (kickoffs in UTC)
// If a source fails, the matches already in the file are kept for that competition.

import { readFile, writeFile } from "node:fs/promises";

const OUT = new URL("../src/data/fixtures.json", import.meta.url);
const SPORTSDB = "https://www.thesportsdb.com/api/v1/json/123";
const UCL_LEAGUE = 4480;

const BIG_CLUBS = [
  "Arsenal", "Real Madrid", "Barcelona", "Bayern Munich", "Manchester City", "Liverpool",
  "Chelsea", "Paris Saint-Germain", "Inter Milan", "Juventus", "AC Milan", "Borussia Dortmund",
  "Atlético Madrid", "Manchester United", "Napoli", "Tottenham Hotspur",
];

// TheSportsDB round ids → stage names. Knockout rounds are always "big".
const UCL_ROUNDS = [
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((r) => [r, `League phase · Matchday ${r}`, false]),
  [32, "Knockout play-offs", false],
  [16, "Round of 16", true],
  [125, "Quarter-final", true],
  [150, "Semi-final", true],
  [200, "Final", true],
];

const now = new Date();
const startYear = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
const seasonSlug = `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`; // 2026-27
const seasonLong = `${startYear}-${startYear + 1}`; // 2026-2027

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (name) => name.replace(/\s+(A?FC)$/, "").trim();
const isArsenal = (...teams) => teams.some((t) => t === "Arsenal");

async function getJson(url, tries = 3) {
  const res = await fetch(url, { headers: { "user-agent": "kutir-calendar" } });
  if (res.status === 429 && tries > 1) {
    await sleep(30_000); // rate limited: wait out the minute window
    return getJson(url, tries - 1);
  }
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

/** "2026-10-24" + "15:00" in Europe/London → UTC ISO string. */
function londonToUtc(date, time) {
  const naive = Date.parse(`${date}T${time || "15:00"}:00Z`);
  const offset = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", timeZoneName: "shortOffset" })
    .formatToParts(new Date(naive))
    .find((p) => p.type === "timeZoneName").value; // "GMT" or "GMT+1"
  const hours = Number(offset.replace("GMT", "") || 0);
  return new Date(naive - hours * 3600e3).toISOString();
}

async function premierLeague() {
  const data = await getJson(
    `https://raw.githubusercontent.com/openfootball/football.json/master/${seasonSlug}/en.1.json`,
  );
  return data.matches
    .map((m) => ({ ...m, team1: clean(m.team1), team2: clean(m.team2) }))
    .filter((m) => isArsenal(m.team1, m.team2))
    .map((m) => ({
      id: `pl-${m.date}-${m.team1}-${m.team2}`.replace(/\s+/g, "_"),
      comp: "PL",
      stage: m.round,
      kickoff: londonToUtc(m.date, m.time),
      home: m.team1,
      away: m.team2,
      score: m.score?.ft ?? null,
      arsenal: true,
      big: true,
    }));
}

/** Fetches round by round; a round that fails keeps its previously saved matches. */
async function championsLeague(previous) {
  const out = [];
  let blocked = false;
  for (const [round, stage, knockout] of UCL_ROUNDS) {
    let events = null;
    if (!blocked) {
      try {
        events = (await getJson(`${SPORTSDB}/eventsround.php?id=${UCL_LEAGUE}&r=${round}&s=${seasonLong}`)).events ?? [];
      } catch (err) {
        console.warn(`fixtures: Champions League ${stage} failed (${err.message}), keeping saved data`);
        blocked = true; // stop hammering a rate-limited API; reuse saved rounds
      }
      await sleep(6000); // free tier is strict about bursts
    }
    if (events == null) {
      out.push(...previous.filter((m) => m.comp === "UCL" && m.stage === stage));
      continue;
    }
    for (const e of events) {
      const home = e.strHomeTeam, away = e.strAwayTeam;
      const arsenal = isArsenal(home, away);
      const big = arsenal || knockout || (BIG_CLUBS.includes(home) && BIG_CLUBS.includes(away));
      if (!big) continue;
      const ts = e.strTimestamp ? `${e.strTimestamp.replace(/Z?$/, "")}Z` : `${e.dateEvent}T${e.strTime || "20:00:00"}Z`;
      out.push({
        id: `ucl-${e.idEvent}`,
        comp: "UCL",
        stage,
        kickoff: new Date(ts).toISOString(),
        home,
        away,
        score: e.intHomeScore != null && e.intAwayScore != null ? [Number(e.intHomeScore), Number(e.intAwayScore)] : null,
        arsenal,
        big: true,
      });
    }
  }
  return out;
}

let previous = { matches: [] };
try { previous = JSON.parse(await readFile(OUT, "utf8")); } catch {}
const keep = (comp) => previous.matches.filter((m) => m.comp === comp);

const results = await Promise.allSettled([premierLeague(), championsLeague(previous.matches)]);
const [pl, ucl] = results.map((r, i) => {
  if (r.status === "fulfilled") return r.value;
  console.warn(`fixtures: ${i ? "Champions League" : "Premier League"} fetch failed, keeping old data:`, r.reason?.message);
  return keep(i ? "UCL" : "PL");
});

const matches = [...pl, ...ucl].sort((a, b) => a.kickoff.localeCompare(b.kickoff));
await writeFile(
  OUT,
  JSON.stringify({ season: seasonSlug, updated: new Date().toISOString(), matches }, null, 1) + "\n",
);
console.log(`fixtures: ${pl.length} Arsenal league games, ${ucl.length} big Champions League games`);
