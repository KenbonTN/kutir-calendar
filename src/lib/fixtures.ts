import data from "@/data/fixtures.json";
import { addisJdn } from "./ethiopian";

export type Match = {
  id: string;
  comp: "PL" | "UCL";
  stage: string;
  /** UTC ISO timestamp */
  kickoff: string;
  home: string;
  away: string;
  score: [number, number] | null;
  arsenal: boolean;
  big: boolean;
};

export const MATCHES = data.matches as Match[];
export const FIXTURES_UPDATED = data.updated;

export const COMP_NAME = { PL: "Premier League", UCL: "Champions League" } as const;

const byDay = new Map<number, Match[]>();
for (const m of MATCHES) {
  const j = addisJdn(m.kickoff);
  byDay.set(j, [...(byDay.get(j) ?? []), m]);
}
/** Matches by the Addis Ababa calendar day they kick off on. */
export const matchesOn = (j: number) => byDay.get(j) ?? [];

const SHORT: Record<string, string> = {
  Arsenal: "ARS", "Aston Villa": "AVL", "AFC Bournemouth": "BOU", Brentford: "BRE",
  "Brighton & Hove Albion": "BHA", Chelsea: "CHE", "Coventry City": "COV", "Crystal Palace": "CRY",
  Everton: "EVE", Fulham: "FUL", "Hull City": "HUL", "Ipswich Town": "IPS", "Leeds United": "LEE",
  Liverpool: "LIV", "Manchester City": "MCI", "Manchester United": "MUN", "Newcastle United": "NEW",
  "Nottingham Forest": "NFO", Sunderland: "SUN", "Tottenham Hotspur": "TOT", "Real Madrid": "RMA",
  Barcelona: "BAR", "Bayern Munich": "BAY", "Paris Saint-Germain": "PSG", "Inter Milan": "INT",
  Juventus: "JUV", "AC Milan": "MIL", "Borussia Dortmund": "BVB", "Atlético Madrid": "ATM",
  Napoli: "NAP", "Slavia Prague": "SLA", "Real Betis": "BET", Lille: "LIL", "Sabah Baku": "SAB",
};
export const short = (team: string) => SHORT[team] ?? team.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();

/** "vs EVE" for a home game, "@ LIV" away; for neutral big games "RMA–BAY". */
export function badge(m: Match) {
  if (m.arsenal) return m.home === "Arsenal" ? `vs ${short(m.away)}` : `@ ${short(m.home)}`;
  return `${short(m.home)}–${short(m.away)}`;
}
