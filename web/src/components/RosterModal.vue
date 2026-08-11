<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../api";
import type { EspnAthlete, EspnTeam, Sport } from "../types";

const props = defineProps<{ sport: Sport; team: EspnTeam }>();
const emit = defineEmits<{ close: [] }>();

const roster = ref<EspnAthlete[] | null>(null);
const loading = ref(true);
const error = ref("");

const sorted = ref<EspnAthlete[]>([]);
const sortKey = ref<"displayName" | "position">("position");

onMounted(async () => {
  try {
    const data = await api.roster(props.sport, props.team.id);
    roster.value = data.roster;
    sortRoster();
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Could not load roster";
  } finally {
    loading.value = false;
  }
});

function sortRoster() {
  if (!roster.value) return;
  sorted.value = [...roster.value].sort((a, b) => {
    if (sortKey.value === "position") {
      const pa = a.position || "ZZ", pb = b.position || "ZZ";
      if (pa !== pb) return pa.localeCompare(pb);
      return a.displayName.localeCompare(b.displayName);
    }
    return a.displayName.localeCompare(b.displayName);
  });
}

function setSort(k: "displayName" | "position") {
  sortKey.value = k;
  sortRoster();
}
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="modal" role="dialog" aria-modal="true">
      <header>
        <div class="head">
          <img v-if="team.logo" class="logo" :src="team.logo" alt="" />
          <div>
            <h2>{{ team.displayName }}</h2>
            <p>{{ sport.toUpperCase() }} roster &middot; live from ESPN</p>
          </div>
        </div>
        <button class="x" @click="emit('close')">&times;</button>
      </header>

      <p v-if="loading" class="muted">Loading roster…</p>
      <p v-if="error" class="err">{{ error }}</p>

      <div v-else-if="sorted.length" class="tools">
        <button type="button" :class="{ on: sortKey === 'position' }" @click="setSort('position')">By position</button>
        <button type="button" :class="{ on: sortKey === 'displayName' }" @click="setSort('displayName')">A–Z</button>
        <span class="count">{{ sorted.length }} players</span>
      </div>

      <ul v-if="sorted.length" class="list">
        <li v-for="p in sorted" :key="p.id">
          <span class="pos">{{ p.position || "—" }}</span>
          <span class="name">{{ p.displayName }}</span>
          <span class="jersey" v-if="p.jersey">#{{ p.jersey }}</span>
        </li>
      </ul>
      <p v-else-if="!loading && !error" class="muted">No roster data right now.</p>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(5,7,10,.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 16px;
  backdrop-filter: blur(2px);
}
.modal {
  background: #14171d;
  border: 2px solid var(--line);
  border-radius: 18px;
  width: 100%;
  max-width: 440px;
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 16px 16px 10px;
}
.head { display: flex; align-items: center; gap: 12px; }
.logo { width: 42px; height: 42px; object-fit: contain; }
h2 { margin: 0; font-size: 1.05rem; }
header p { margin: 3px 0 0; color: var(--muted); font-size: .74rem; font-weight: 600; }
.x {
  border: 0;
  background: #262b34;
  color: var(--text);
  width: 30px;
  height: 30px;
  border-radius: 50%;
  font-size: 1.1rem;
  cursor: pointer;
}
.tools {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px 12px;
}
.tools button {
  border: 2px solid var(--line);
  background: transparent;
  color: var(--muted);
  border-radius: 999px;
  padding: 5px 12px;
  font-size: .72rem;
  font-weight: 800;
  cursor: pointer;
}
.tools button.on { color: var(--text); border-color: #4ec9a8; }
.tools .count { margin-left: auto; color: var(--muted); font-size: .74rem; font-weight: 700; }

.list {
  list-style: none;
  margin: 0;
  padding: 0 16px 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 4px;
  border-bottom: 1px solid #20242c;
  font-size: .9rem;
}
li:last-child { border-bottom: 0; }
.pos { width: 34px; color: var(--muted); font-weight: 800; font-size: .78rem; }
.name { flex: 1; font-weight: 700; }
.jersey { color: var(--muted); font-size: .78rem; font-weight: 700; }

.muted { color: var(--muted); text-align: center; padding: 24px; font-weight: 600; }
.err { color: var(--x); text-align: center; padding: 24px; font-weight: 700; }
</style>
