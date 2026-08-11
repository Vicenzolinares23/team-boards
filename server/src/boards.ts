import { randomUUID } from "node:crypto";
import { pool } from "./db.js";
import { pub, boardChannel } from "./redis.js";

export type Sport = "nba" | "nfl";

export interface Board {
  id: string;
  sport: Sport;
  name: string;
  taken: Record<string, boolean>;
  createdAt: number;
  updatedAt: number;
}

export class BoardError extends Error {}

export function isSport(s: string): s is Sport {
  return s === "nba" || s === "nfl";
}

interface BoardRow {
  id: string;
  sport: Sport;
  name: string;
  taken: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

function toBoard(row: BoardRow): Board {
  return {
    id: row.id,
    sport: row.sport,
    name: row.name,
    taken: row.taken ?? {},
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export async function createBoard(sport: Sport, name: string): Promise<Board> {
  const id = randomUUID().slice(0, 8);
  const now = Date.now();
  const cleanName = name.trim() || `${sport.toUpperCase()} Break`;

  await pool.query(
    `INSERT INTO boards (id, sport, name, taken, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, sport, cleanName, JSON.stringify({}), now, now]
  );
  return { id, sport, name: cleanName, taken: {}, createdAt: now, updatedAt: now };
}

export async function getBoard(id: string): Promise<Board | null> {
  const res = await pool.query<BoardRow>(
    "SELECT id, sport, name, taken, created_at, updated_at FROM boards WHERE id = $1",
    [id]
  );
  return res.rows[0] ? toBoard(res.rows[0]) : null;
}

async function persist(board: Board): Promise<void> {
  board.updatedAt = Date.now();
  await pool.query(
    "UPDATE boards SET taken = $2, name = $3, updated_at = $4 WHERE id = $1",
    [board.id, JSON.stringify(board.taken), board.name, board.updatedAt]
  );
  await pub.publish(boardChannel(board.id), JSON.stringify({ type: "board", board }));
}

export async function toggleTeam(boardId: string, teamId: string): Promise<Board> {
  const board = await getBoard(boardId);
  if (!board) throw new BoardError("Board not found");
  board.taken[teamId] = !board.taken[teamId];
  await persist(board);
  return board;
}

export async function resetBoard(boardId: string): Promise<Board> {
  const board = await getBoard(boardId);
  if (!board) throw new BoardError("Board not found");
  board.taken = {};
  await persist(board);
  return board;
}

export async function listBoards(limit = 20): Promise<Board[]> {
  const res = await pool.query<BoardRow>(
    "SELECT id, sport, name, taken, created_at, updated_at FROM boards ORDER BY updated_at DESC LIMIT $1",
    [limit]
  );
  return res.rows.map(toBoard);
}