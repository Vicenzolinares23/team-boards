# Team Boards

A real-time, tap-to-cross-off team board for live sports card breaks.

## What's new in 2.0

The original boards were single HTML files with browser-local storage. This is
a full rewrite — a real backend with durable storage, live team data, and
real-time sync so everyone on a break watches the same board update together.

- **Live team data** — NBA and NFL teams, logos, and current rosters are pulled
  from ESPN's public API in real time (cached in Redis). No hardcoded lists.
- **Real-time sync** — WebSockets keep every connected viewer in lockstep. Tap
  a team on your phone and it crosses off on every screen watching the board.
- **Presence** — the header shows how many people are currently viewing the
  break, live.
- **Live rosters** — tap the `i` on any team to see its current ESPN roster
  (sortable by position or A–Z).
- **Durable storage** — boards live in PostgreSQL (Dockerized); nothing depends
  on a single browser's localStorage.
- **Break codes** — each break gets a short ID. Share the link, anyone joins.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Vue 3 + Vite + TypeScript |
| Backend | Node.js + Fastify + WebSocket + TypeScript |
| Storage | PostgreSQL 16 |
| Cache / pub-sub | Redis 7 |
| Deploy | Docker Compose |

## Architecture

```
┌──────────────┐     REST + WS reroute      ┌─────────────────────────┐
│  Vue 3 web   │ ─────────────────────────▶ │  Fastify server         │
│  (web/dist)  │ ◀───────────────────────── │  • /api/teams (ESPN)    │
└──────────────┘                            │  • /api/boards (CRUD)    │
         ▲                                  │  • /ws/:boardId (sync)  │
         │ WebSocket (board + presence)     └───────┬─────────┬───────┘
                                                   │         │
                                          ┌────────▼──┐  ┌──▼──────────┐
                                          │ PostgreSQL │  │   Redis     │
                                          │ boards     │  │ cache+pubsub│
                                          └────────────┘  └─────────────┘
```

- **PostgreSQL** is the source of truth for board state.
- **Redis** caches ESPN team/roster responses and carries the pub/sub channel
  that fans board updates out to every connected WebSocket.
- Multiple server instances can be run behind a load balancer — Redis pub/sub
  keeps them all in sync.

## Running it (Docker)

```bash
cp .env.example .env   # defaults match compose
docker compose up --build
```

Open http://localhost:3000. Compose starts Postgres, Redis, and the app
(built Vue frontend served by the Fastify server).

- App: http://localhost:3000
- Health check: http://localhost:3000/api/health
- Postgres: localhost:5432 (`team` / `team`, database `team_boards`)
- Redis: localhost:6379

## Running it locally (dev)

Requires Node 20+, a Postgres, and a Redis.

```bash
npm install
docker compose up -d db redis          # or point DATABASE_URL/REDIS_URL at existing ones
npm run dev                            # server :3000 + Vite :5173 together
```

For a using your own Postgres/Redis:

```bash
export DATABASE_URL=postgres://user:pass@localhost:5432/team_boards
export REDIS_URL=redis://localhost:6379
npm run dev
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Postgres + Redis status |
| GET | `/api/teams/:sport` | Live teams from ESPN (`nba` / `nfl`) |
| GET | `/api/teams/:sport/:teamId/roster` | Live roster for a team |
| POST | `/api/boards` | Create a board `{ sport, name? }` |
| GET | `/api/boards` | Recent boards |
| GET | `/api/boards/:id` | Board state |
| POST | `/api/boards/:id/toggle` | Cross off / un-cross a team `{ teamId }` |
| POST | `/api/boards/:id/reset` | Clear the board |
| WS | `/ws/:boardId` | Realtime board + presence stream |

## How a break works

1. Open the app, pick **NBA** or **NFL**, name the break, hit create.
2. Share the link (a short break code like `#/board/a1b2c3d4`).
3. Everyone viewing the board sees it live. Tap a team to cross it off —
   the cell dims, grays out, and gets a red X. Tap again to undo.
4. Tap a team's `i` badge to open its current roster from ESPN.

The header counts teams remaining and flips to a "Board complete" banner when
every team is crossed off.