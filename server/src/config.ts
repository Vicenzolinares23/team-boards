export const config = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || "0.0.0.0",
  databaseUrl: process.env.DATABASE_URL || "postgres://team:team@localhost:5432/team_boards",
  redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  espnTeamCacheTtl: Number(process.env.ESPN_TEAM_TTL || 3600),
  espnRosterCacheTtl: Number(process.env.ESPN_ROSTER_TTL || 600),
  espnBase: "https://site.api.espn.com/apis/site/v2/sports",
  webDist: process.env.WEB_DIST || "web/dist",
};