<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { api } from "../api";
import { RealtimeClient } from "../realtime";
import RosterModal from "../components/RosterModal.vue";
import type { Board, EspnTeam } from "../types";

const props = defineProps<{ boardId: string }>();
const emit = defineEmits<{ navigate: [hash: string] }>();

const board = ref<Board | null>(null);
const teams = ref<EspnTeam[]>([]);
const loading = ref(true);
const error = ref("");
const presence = ref(0);
const conn = ref<RealtimeClient["status"]>("connecting");

const selectedTeam = ref<EspnTeam | null>(null);

let realtime: RealtimeClient | null = null;

const takenCount = computed(() => (board.value ? Object.values(board.value.taken).filter(Boolean).length : 0));
const remaining = computed(() => teams.value.length - takenCount.value);
const complete = computed(() => teams.value.length > 0 && takenCount.value === teams.value.length);
const locked = computed(() => conn.value !== "open");

async function load() {
  loading.value = true;
  error.value = "";
  try {
    board.value = await api.getBoard(props.boardId);
    const data = await api.teams(board.value.sport);
    teams.value = data.teams;
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Failed to load board";
  } finally {
    loading.value = false;
  }
}

function isTaken(team: EspnTeam): boolean {
  return board.value?.taken[team.id] === true;
}

function onEvent(evt: { type: string; board?: Board; count?: number }) {
  if (evt.type === "board" && evt.board) board.value = evt.board;
  if (evt.type === "presence" && typeof evt.count === "number") presence.value = evt.count;
}

async function toggle(team: EspnTeam) {
  if (!board.value || locked.value) return;
  try {
    board.value = await api.toggle(board.value.id, team.id);
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Could not update board";
  }
}

async function reset() {
  if (!board.value) return;
  if (!window.confirm("Clear the whole board?")) return;
  try {
    board.value = await api.reset(board.value.id);
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Could not reset board";
  }
}

function readableOn(hex: string | null): string {
  if (!hex) return "#ffffff";
  const n = parseInt(hex.replace("#", ""), 16);
  if (Number.isNaN(n)) return "#ffffff";
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? "#0b0d11" : "#ffffff";
}

const cols = computed(() => {
  const n = teams.value.length;
  if (n <= 8) return { landscape: 4, portrait: 2 };
  if (n <= 10) return { landscape: 5, portrait: 2 };
  if (n <= 12) return { landscape: 6, portrait: 3 };
  if (n <= 16) return { landscape: 8, portrait: 4 };
  if (n <= 20) return { landscape: 10, portrait: 5 };
  if (n <= 30) return { landscape: 10, portrait: 5 };
  if (n <= 32) return { landscape: 8, portrait: 4 };
  return { landscape: 8, portrait: 4 };
});

async function copyLink() {
  try {
    await navigator.clipboard.writeText(location.href);
  } catch {
    /* clipboard unavailable */
  }
}

function toggleFullscreen() {
  const de = document.documentElement;
  if (document.fullscreenElement) void document.exitFullscreen();
  else if (de.requestFullscreen) void de.requestFullscreen();
}

onMounted(() => {
  void load();
  realtime = new RealtimeClient(props.boardId);
  realtime.on(onEvent);
  realtime.onStatus((s) => (conn.value = s));
  realtime.connect();
  window.addEventListener("hashchange", onHashChange);
});

function onHashChange() {
  const m = location.hash.match(/^#\/board\/([A-Za-z0-9]+)$/);
  if (!m || m[1] !== props.boardId) emit("navigate", location.hash);
}

onUnmounted(() => {
  realtime?.close();
  window.removeEventListener("hashchange", onHashChange);
});
</script>

<template>
  <div class="board">
    <header class="bar">
      <button class="home" @click="emit('navigate', '#/')">&larr;</button>
      <div class="title">
        <h1>{{ board?.sport.toUpperCase() }} Board</h1>
        <span v-if="board" class="code">{{ board.id }}</span>
      </div>
      <div class="count" :class="{ complete }">
        {{ complete ? "Complete!" : `${remaining} left` }}
      </div>
      <span class="dot" :class="conn" :title="`${presence} viewing`">
        {{ conn === "open" ? (presence || 1) : "…" }}
      </span>
      <button class="btn" @click="toggleFullscreen">⛶</button>
      <button class="btn" @click="reset">Reset</button>
      <button class="btn share" @click="copyLink">Share</button>
    </header>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="loading">Loading live {{ board?.sport.toUpperCase() || "" }} teams…</p>

    <main v-else-if="teams.length" id="grid" :style="{
      '--cols-l': cols.landscape,
      '--cols-p': cols.portrait,
    }">
      <button
        v-for="team in teams"
        :key="team.id"
        type="button"
        class="cell"
        :class="{ taken: isTaken(team) }"
        :style="{ background: team.color ?? '#262b34' }"
        :title="team.displayName"
        :aria-label="team.displayName"
        :aria-pressed="isTaken(team)"
        @click="toggle(team)"
      >
        <img v-if="team.logo" class="logo" :src="team.logo" :alt="''" loading="lazy" @error="($event.target as HTMLImageElement).style.display = 'none'" />
        <span v-else class="fallback" :style="{ color: readableOn(team.color) }">{{ team.abbreviation }}</span>
        <span class="info" @click.stop="selectedTeam = team" title="View roster">i</span>
      </button>
    </main>

    <footer v-if="board" class="foot">
      <button v-if="complete" class="done-banner" @click="reset">🎉 Board complete — everyone accounted for</button>
      <span v-else-if="locked" class="connecting">Reconnecting…</span>
      <span v-else>Tap a team to cross it off &middot; tap again to undo</span>
    </footer>

    <RosterModal
      v-if="selectedTeam && board"
      :sport="board.sport"
      :team="selectedTeam"
      @close="selectedTeam = null"
    />
  </div>
</template>

<style scoped>
.board {
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  padding-bottom: env(safe-area-inset-bottom);
}

.bar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  padding-top: calc(6px + env(safe-area-inset-top));
}

.home {
  flex: 0 0 auto;
  background: none;
  border: 0;
  color: var(--muted);
  font-size: 1.15rem;
  cursor: pointer;
  padding: 2px 6px;
}

.title { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
h1 { margin: 0; font-size: .95rem; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; white-space: nowrap; }
.code { color: var(--muted); font-size: .72rem; font-weight: 700; }

.count { flex: 1 1 auto; font-size: .74rem; font-weight: 700; letter-spacing: .06em; color: var(--muted); text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.count.complete { color: var(--ok); }

.dot { font-size: .72rem; font-weight: 800; min-width: 26px; text-align: center; }
.dot.open { color: var(--ok); }
.dot.connecting { color: #f7b32b; }
.dot.closed { color: var(--x); }

.btn {
  appearance: none;
  border: 2px solid var(--line);
  background: transparent;
  color: var(--muted);
  border-radius: 999px;
  padding: 7px 14px;
  font-size: .74rem;
  font-weight: 800;
  letter-spacing: .07em;
  text-transform: uppercase;
  cursor: pointer;
  touch-action: manipulation;
  white-space: nowrap;
  transition: color .15s, border-color .15s, transform .1s;
}
.btn:hover { color: var(--text); border-color: #3b424e; }
.btn:active { transform: scale(.95); }
.btn.share { display: none; }
@media (min-width: 560px) { .btn.share { display: inline-block; } }

#grid {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(var(--cols-l), 1fr);
  gap: 4px;
  padding: 0 5px 5px;
  align-content: stretch;
}
@media (orientation: portrait) {
  #grid { grid-template-columns: repeat(var(--cols-p), 1fr); }
}

.cell {
  position: relative;
  appearance: none;
  min-width: 0;
  min-height: 0;
  width: 100%;
  height: 100%;
  border: 2px solid rgba(255,255,255,.12);
  border-radius: 9px;
  padding: 0;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: manipulation;
  transition: transform .16s, opacity .18s, border-color .18s, filter .18s;
}
.cell:active { transform: scale(.94); }

.cell .logo { width: 100%; height: 100%; object-fit: contain; display: block; pointer-events: none; }
.cell .fallback { font-size: clamp(.7rem, 2.2vw, 1.3rem); font-weight: 800; pointer-events: none; }

.cell .info {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0,0,0,.55);
  color: #fff;
  font-size: .78rem;
  font-weight: 900;
  font-style: italic;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity .15s;
  z-index: 2;
}
.cell:hover .info, .cell:focus-within .info { opacity: 1; }

.cell.taken { opacity: .28; filter: grayscale(.85); border-color: rgba(255,255,255,.06); }
.cell.taken::before, .cell.taken::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: 150%;
  height: 5px;
  border-radius: 3px;
  background: var(--x);
  box-shadow: 0 0 8px rgba(255,53,70,.75);
  z-index: 1;
}
.cell.taken::before { transform: translate(-50%,-50%) rotate(42deg); }
.cell.taken::after { transform: translate(-50%,-50%) rotate(-42deg); }

@media (min-width: 700px) {
  .bar { padding: 9px 14px; }
  h1 { font-size: 1.05rem; }
  .count { font-size: .8rem; }
  #grid { gap: 6px; padding: 0 8px 8px; }
  .cell { border-radius: 12px; }
}

.error { color: var(--x); text-align: center; padding: 20px; font-weight: 700; }
.loading { color: var(--muted); text-align: center; padding: 30px; font-weight: 600; }

.foot { flex: 0 0 auto; text-align: center; color: var(--muted); font-size: .74rem; padding: 6px; font-weight: 600; }
.connecting { color: #f7b32b; }

.done-banner {
  border: 0;
  border-radius: 999px;
  background: var(--ok);
  color: #04260f;
  font-weight: 800;
  padding: 8px 18px;
  cursor: pointer;
  font-size: .78rem;
}
</style>
