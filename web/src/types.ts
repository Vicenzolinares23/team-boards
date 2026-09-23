export type Sport = "nba" | "nfl" | "mlb";

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

export interface Board {
  id: string;
  sport: Sport;
  name: string;
  taken: Record<string, boolean>;
  createdAt: number;
  updatedAt: number;
}

export interface BoardEvent {
  type: "board" | "presence";
  board?: Board;
  count?: number;
}
