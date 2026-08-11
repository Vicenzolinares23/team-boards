<script setup lang="ts">
import { ref, computed } from "vue";
import HomeView from "./views/HomeView.vue";
import BoardView from "./views/BoardView.vue";

const route = ref<string>(location.hash || "#/");

function parse(): { boardId?: string } {
  const m = route.value.match(/^#\/board\/([A-Za-z0-9]+)$/);
  return m ? { boardId: m[1] } : {};
}

const { boardId } = parse();

function onNavigate(hash: string) {
  route.value = hash;
  location.hash = hash;
}

const showHome = computed(() => !boardId);
</script>

<template>
  <HomeView v-if="showHome" @navigate="onNavigate" />
  <BoardView v-else :board-id="boardId!" @navigate="onNavigate" />
</template>
