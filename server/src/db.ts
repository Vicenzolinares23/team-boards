import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
});

export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS boards (
      id         TEXT PRIMARY KEY,
      sport      TEXT NOT NULL,
      name       TEXT NOT NULL DEFAULT '',
      taken      JSONB NOT NULL DEFAULT '{}',
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    );
  `);
  // Replaced rather than declared inline so databases created before MLB
  // existed pick up the wider list too.
  await pool.query(`
    ALTER TABLE boards DROP CONSTRAINT IF EXISTS boards_sport_check;
    ALTER TABLE boards ADD CONSTRAINT boards_sport_check CHECK (sport IN ('nba','nfl','mlb'));
  `);
}