import type { EspnTeam } from "./types";

/* ------------------------------------------------------------------
   MLB board layout. The MLB logos are cutouts from a photo of
   embroidered patches (assets/mlb/), so the board shows those first
   and falls back to ESPN's logo, sets each patch on a color picked to
   contrast with it, and keeps a fixed order: division order, two
   divisions per row of the 10x3 grid, with the Pirates, Dodgers,
   Cardinals and Royals swapped into the center.
   Keyed by ESPN abbreviation.
------------------------------------------------------------------ */

const ORDER = [
  "BAL", "BOS", "NYY", "TB", "TOR", "CHW", "CLE", "DET", "MIA", "MIN",
  "ATH", "HOU", "LAA", "PIT", "LAD", "STL", "KC", "NYM", "PHI", "WSH",
  "CHC", "CIN", "MIL", "SEA", "ATL", "ARI", "COL", "TEX", "SD", "SF",
];

const COLORS: Record<string, string> = {
  BAL: "#27251F", BOS: "#0C2340", NYY: "#0C2340", TB: "#8FBCE6", TOR: "#1D2D5C",
  CHW: "#C4CED4", CLE: "#00385D", DET: "#FA4616", MIA: "#00A3E0", MIN: "#D31145",
  ATH: "#EFB21E", HOU: "#002D62", LAA: "#003263", PIT: "#27251F", LAD: "#005A9C",
  STL: "#0C2340", KC: "#7AB2DD", NYM: "#002D72", PHI: "#6F263D", WSH: "#AB0003",
  CHC: "#CC3433", CIN: "#27251F", MIL: "#FFC52F", SEA: "#005C5C", ATL: "#13274F",
  ARI: "#30CED8", COL: "#33006F", TEX: "#003278", SD: "#FFC425", SF: "#EFD19F",
};

// ESPN has used OAK for the Athletics; treat it as ATH.
function key(team: EspnTeam): string {
  return team.abbreviation === "OAK" ? "ATH" : team.abbreviation;
}

export function orderMlbTeams(teams: EspnTeam[]): EspnTeam[] {
  const rank = (t: EspnTeam) => {
    const i = ORDER.indexOf(key(t));
    return i === -1 ? ORDER.length : i;
  };
  return [...teams].sort((a, b) => rank(a) - rank(b));
}

export function mlbColor(team: EspnTeam): string | null {
  return COLORS[key(team)] ?? null;
}
