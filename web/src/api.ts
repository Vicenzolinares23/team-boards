import type { Board, EspnAthlete, EspnTeam, Sport } from "./types";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  teams(sport: Sport): Promise<{ sport: Sport; teams: EspnTeam[] }> {
    return req(`/api/teams/${sport}`);
  },
  roster(sport: Sport, teamId: string): Promise<{ roster: EspnAthlete[] }> {
    return req(`/api/teams/${sport}/${teamId}/roster`);
  },
  createBoard(sport: Sport, name?: string): Promise<Board> {
    return req("/api/boards", {
      method: "POST",
      body: JSON.stringify({ sport, name }),
    });
  },
  getBoard(id: string): Promise<Board> {
    return req(`/api/boards/${id}`);
  },
  toggle(id: string, teamId: string): Promise<Board> {
    return req(`/api/boards/${id}/toggle`, {
      method: "POST",
      body: JSON.stringify({ teamId }),
    });
  },
  reset(id: string): Promise<Board> {
    return req(`/api/boards/${id}/reset`, { method: "POST" });
  },
};
