import { config } from "./config.js";
import { redis, espnTeamsKey, espnRosterKey } from "./redis.js";

const SPORTS: Record<string, string> = {
  nba: "basketball/nba",
  nfl: "football/nfl",
};

export interface EspnTeam {
  id: string;
  abbreviation: string;
  displayName: string;
  shortName: string;
  color: string | null;
  alternateColor: string | null;
  logo: string | null;
}

export interface EspnAthlete {
  id: string;
  fullName: string;
  displayName: string;
  position: string;
  jersey: string;
}

export function isSport(sport: string): sport is keyof typeof SPORTS {
  return sport in SPORTS;
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "user-agent": "team-boards/2.0", accept: "application/json" },
    signal,
  });
  if (!res.ok) throw new Error(`ESPN ${res.status} for ${url}`);
  return res.json() as Promise<unknown>;
}

function normalizeTeam(t: Record<string, unknown>): EspnTeam {
  const logos = (t.logos as Array<{ href: string }>) || [];
  const colors = (t.color as string) || (t.colors as Array<string> | undefined)?.[0] || null;
  return {
    id: String(t.id),
    abbreviation: String(t.abbreviation),
    displayName: String(t.displayName),
    shortName: String(t.shortName || t.abbreviation),
    color: colors,
    alternateColor: null,
    logo: logos[0]?.href ?? null,
  };
}

export async function getTeams(
  sport: keyof typeof SPORTS,
  { force = false, signal }: { force?: boolean; signal?: AbortSignal } = {}
): Promise<EspnTeam[]> {
  const key = espnTeamsKey(sport);
  const cached = force ? null : await redis.get(key).catch(() => null);
  if (cached) return JSON.parse(cached) as EspnTeam[];

  const data = (await fetchJson(`${config.espnBase}/${SPORTS[sport]}/teams`, signal)) as {
    sports: Array<{ leagues: Array<{ teams: Array<{ team: Record<string, unknown> }> }> }>;
  };
  const teams = data.sports[0].leagues[0].teams.map((t) => normalizeTeam(t.team));

  await redis.set(key, JSON.stringify(teams), "EX", config.espnTeamCacheTtl).catch(() => {});
  return teams;
}

export async function getRoster(
  sport: keyof typeof SPORTS,
  teamId: string,
  { force = false, signal }: { force?: boolean; signal?: AbortSignal } = {}
): Promise<EspnAthlete[]> {
  const key = espnRosterKey(sport, teamId);
  const cached = force ? null : await redis.get(key).catch(() => null);
  if (cached) return JSON.parse(cached) as EspnAthlete[];

  const data = (await fetchJson(
    `${config.espnBase}/${SPORTS[sport]}/teams/${teamId}/roster`,
    signal
  )) as { athletes: Array<Record<string, unknown>> };
  const roster = (data.athletes || []).map((a) => {
    const pos = (a.position ?? {}) as { abbreviation?: string; name?: string };
    return {
      id: String(a.id),
      fullName: String(a.fullName),
      displayName: String(a.displayName),
      position: String(pos.abbreviation ?? pos.name ?? ""),
      jersey: String(a.jersey ?? ""),
    };
  });

  await redis.set(key, JSON.stringify(roster), "EX", config.espnRosterCacheTtl).catch(() => {});
  return roster;
}
