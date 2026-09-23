import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import staticPlugin from "@fastify/static";
import websocket from "@fastify/websocket";
import { z } from "zod";
import { config } from "./config.js";
import { connectRedis, redis } from "./redis.js";
import { pool, initDb } from "./db.js";
import { hub } from "./realtime.js";
import {
  createBoard,
  getBoard,
  listBoards,
  resetBoard,
  toggleTeam,
  BoardError,
  isSport as isBoardSport,
} from "./boards.js";
import { getTeams, getRoster, isSport as isEspnSport } from "./espn.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = Fastify({ logger: { level: process.env.LOG_LEVEL || "info" } });

await app.register(cors, { origin: true });
await app.register(websocket);
await app.register(staticPlugin, {
  root: path.resolve(__dirname, "../../web/dist"),
  prefix: "/",
  wildcard: false,
});
await app.register(staticPlugin, {
  root: path.resolve(__dirname, "../../assets"),
  prefix: "/assets/",
});

app.get("/api/health", async () => {
  const dbOk = await pool
    .query("SELECT 1")
    .then(() => true)
    .catch(() => false);
  const redisOk = await redis
    .ping()
    .then((p) => p === "PONG")
    .catch(() => false);
  return { ok: dbOk && redisOk, postgres: dbOk ? "up" : "down", redis: redisOk ? "up" : "down", ts: Date.now() };
});

app.get<{ Params: { sport: string } }>("/api/teams/:sport", async (req, reply) => {
  const sport = req.params.sport.toLowerCase();
  if (!isEspnSport(sport)) return reply.code(400).send({ error: `Unknown sport: ${sport}` });
  const teams = await getTeams(sport);
  return { sport, teams };
});

app.get<{ Params: { sport: string; teamId: string } }>(
  "/api/teams/:sport/:teamId/roster",
  async (req, reply) => {
    const sport = req.params.sport.toLowerCase();
    if (!isEspnSport(sport)) return reply.code(400).send({ error: `Unknown sport: ${sport}` });
    const roster = await getRoster(sport, req.params.teamId);
    return { sport, teamId: req.params.teamId, roster };
  }
);

app.post("/api/boards", async (req, reply) => {
  const body = z
    .object({ sport: z.string(), name: z.string().optional().default("") })
    .safeParse(req.body);
  if (!body.success || !isBoardSport(body.data.sport)) {
    return reply.code(400).send({ error: "sport must be 'nba', 'nfl' or 'mlb'" });
  }
  const board = await createBoard(body.data.sport, body.data.name);
  return reply.code(201).send(board);
});

app.get("/api/boards", async () => ({ boards: await listBoards() }));

const boardParams = z.object({ id: z.string().min(1).max(64) });

app.get<{ Params: { id: string } }>("/api/boards/:id", async (req, reply) => {
  const { id } = boardParams.parse(req.params);
  const board = await getBoard(id);
  if (!board) return reply.code(404).send({ error: "Board not found" });
  return board;
});

app.post<{ Params: { id: string } }>("/api/boards/:id/toggle", async (req, reply) => {
  const { id } = boardParams.parse(req.params);
  const body = z.object({ teamId: z.string().min(1) }).safeParse(req.body);
  if (!body.success) return reply.code(400).send({ error: "teamId required" });
  try {
    const board = await toggleTeam(id, body.data.teamId);
    return board;
  } catch (e) {
    if (e instanceof BoardError) return reply.code(404).send({ error: e.message });
    throw e;
  }
});

app.post<{ Params: { id: string } }>("/api/boards/:id/reset", async (req, reply) => {
  const { id } = boardParams.parse(req.params);
  try {
    const board = await resetBoard(id);
    return board;
  } catch (e) {
    if (e instanceof BoardError) return reply.code(404).send({ error: e.message });
    throw e;
  }
});

app.get<{ Params: { boardId: string } }>("/ws/:boardId", { websocket: true }, (socket, req) => {
  void hub.join(socket, req.params.boardId);
});

const pingTimer = setInterval(() => hub.pingAll(), 30000);

app.setNotFoundHandler((req, reply) => {
  if (req.raw.url?.startsWith("/api") || req.raw.url?.startsWith("/ws")) {
    return reply.code(404).send({ error: "Not found" });
  }
  return reply.sendFile("index.html");
});

try {
  await initDb();
  await connectRedis();
  await hub.start();
  await app.listen({ port: config.port, host: config.host });
  app.log.info(`team-boards server listening on http://${config.host}:${config.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, async () => {
    clearInterval(pingTimer);
    await app.close();
    await pool.end().catch(() => {});
    process.exit(0);
  });
}
