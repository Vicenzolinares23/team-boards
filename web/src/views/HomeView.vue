<script setup lang="ts">
import { ref } from "vue";
import { api } from "../api";
import type { Sport } from "../types";

const emit = defineEmits<{ navigate: [hash: string] }>();

const sport = ref<Sport>("nba");
const name = ref("");
const joinId = ref("");
const creating = ref(false);
const error = ref("");
const joinError = ref("");

async function createBoard() {
  error.value = "";
  creating.value = true;
  try {
    const board = await api.createBoard(sport.value, name.value);
    emit("navigate", `#/board/${board.id}`);
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Could not create board";
  } finally {
    creating.value = false;
  }
}

async function joinBoard() {
  joinError.value = "";
  const id = joinId.value.trim();
  if (!id) return;
  try {
    await api.getBoard(id);
    emit("navigate", `#/board/${id}`);
  } catch {
    joinError.value = "No board found with that code";
  }
}
</script>

<template>
  <main class="home">
    <header>
      <h1>Team Boards</h1>
      <p class="sub">Live tap-to-cross-off boards for card breaks</p>
    </header>

    <section class="card">
      <h2>Start a break</h2>
      <div class="sports">
        <button
          type="button"
          class="sport nba"
          :class="{ active: sport === 'nba' }"
          @click="sport = 'nba'"
        >
          NBA
          <span>30 teams</span>
        </button>
        <button
          type="button"
          class="sport nfl"
          :class="{ active: sport === 'nfl' }"
          @click="sport = 'nfl'"
        >
          NFL
          <span>32 teams</span>
        </button>
      </div>
      <input
        v-model="name"
        type="text"
        placeholder="Break name (optional)"
        maxlength="60"
        @keyup.enter="createBoard"
      />
      <button type="button" class="primary" :disabled="creating" @click="createBoard">
        {{ creating ? "Creating…" : `Create ${sport.toUpperCase()} board` }}
      </button>
      <p v-if="error" class="err">{{ error }}</p>
    </section>

    <section class="card">
      <h2>Join a break</h2>
      <input v-model="joinId" type="text" placeholder="Break code" maxlength="64" @keyup.enter="joinBoard" />
      <button type="button" class="secondary" :disabled="!joinId.trim()" @click="joinBoard">Join</button>
      <p v-if="joinError" class="err">{{ joinError }}</p>
    </section>

    <footer>
      Live team &amp; roster data from ESPN &middot; Real-time sync across everyone on the board
    </footer>
  </main>
</template>

<style scoped>
.home {
  max-width: 480px;
  margin: 0 auto;
  padding: 40px 18px calc(40px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-height: 100vh;
  justify-content: center;
}

header { text-align: center; }
h1 { margin: 0; font-size: 1.5rem; font-weight: 900; letter-spacing: .05em; text-transform: uppercase; }
.sub { margin: 8px 0 0; color: var(--muted); font-size: .9rem; font-weight: 600; }

.card {
  background: var(--panel);
  border: 2px solid var(--line);
  border-radius: 18px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.card h2 { margin: 0; font-size: .95rem; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }

.sports { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.sport {
  border: 2px solid var(--line);
  border-radius: 14px;
  background: transparent;
  color: var(--text);
  padding: 16px 10px;
  font-size: 1.25rem;
  font-weight: 900;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: border-color .15s, background .15s, transform .1s;
}
.sport span { font-size: .72rem; font-weight: 600; color: var(--muted); }
.sport:active { transform: scale(.97); }
.sport.nba.active { border-color: #f7b32b; background: rgba(247,179,43,.08); }
.sport.nfl.active { border-color: #4ec9a8; background: rgba(78,201,168,.08); }

input {
  background: var(--bg);
  border: 2px solid var(--line);
  border-radius: 12px;
  color: var(--text);
  padding: 12px 14px;
  font-size: 1rem;
  outline: none;
  width: 100%;
}
input:focus { border-color: #3b424e; }

button.primary, button.secondary {
  border-radius: 12px;
  border: 0;
  padding: 13px 16px;
  font-size: .92rem;
  font-weight: 800;
  letter-spacing: .04em;
  cursor: pointer;
  transition: opacity .15s, transform .1s;
}
button.primary { background: #f7b32b; color: #0b0d11; }
button.secondary { background: #262b34; color: var(--text); }
button:active { transform: scale(.98); }
button:disabled { opacity: .5; cursor: default; }

.err { margin: 0; color: var(--x); font-size: .82rem; font-weight: 600; }
footer { text-align: center; color: #5f6a7a; font-size: .76rem; line-height: 1.6; }
</style>
