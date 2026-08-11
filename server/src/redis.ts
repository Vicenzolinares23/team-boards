import { Redis } from "ioredis";
import { config } from "./config.js";

export const redis = new Redis(config.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 3 });

redis.on("error", (err) => {
  console.error("[redis]", err.message);
});

export const pub = new Redis(config.redisUrl, { lazyConnect: true });
pub.on("error", () => {});

export async function connectRedis(): Promise<void> {
  await Promise.all([redis.connect(), pub.connect()]);
}

export function boardChannel(id: string): string {
  return `board:${id}:events`;
}

export function espnTeamsKey(sport: string): string {
  return `espn:teams:${sport}`;
}

export function espnRosterKey(sport: string, teamId: string): string {
  return `espn:roster:${sport}:${teamId}`;
}
