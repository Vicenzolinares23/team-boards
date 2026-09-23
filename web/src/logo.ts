import type { EspnTeam, Sport } from "./types";

const NBA_ABBR_TO_FILE: Record<string, string> = {
  GS: "gsw",
  NO: "nop",
  NY: "nyk",
  SA: "sas",
  UTAH: "uta",
  WSH: "was",
};

const MLB_ABBR_TO_FILE: Record<string, string> = {
  CHW: "cws",
  OAK: "ath",
};

const ABBR_TO_FILE: Partial<Record<Sport, Record<string, string>>> = {
  nba: NBA_ABBR_TO_FILE,
  mlb: MLB_ABBR_TO_FILE,
};

export function localLogoUrl(sport: Sport, team: EspnTeam): string | null {
  const abbr = ABBR_TO_FILE[sport]?.[team.abbreviation] ?? team.abbreviation.toLowerCase();
  return `/assets/${sport}/${abbr}.png`;
}
