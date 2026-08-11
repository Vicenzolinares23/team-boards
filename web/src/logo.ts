import type { EspnTeam, Sport } from "./types";

const NBA_ABBR_TO_FILE: Record<string, string> = {
  GS: "gsw",
  NO: "nop",
  NY: "nyk",
  SA: "sas",
  UTAH: "uta",
  WSH: "was",
};

export function localLogoUrl(sport: Sport, team: EspnTeam): string | null {
  const abbr = sport === "nba" ? NBA_ABBR_TO_FILE[team.abbreviation] ?? team.abbreviation.toLowerCase() : team.abbreviation.toLowerCase();
  return `/assets/${sport}/${abbr}.png`;
}