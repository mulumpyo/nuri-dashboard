<script lang="ts">
import { defineComponent, watch } from "vue";
import BoardScreen from "./BoardScreen.vue";
import PairScreen from "./PairScreen.vue";
import { useDisplay } from "./use-display";

export default defineComponent({
  name: "DashboardApp",
  components: { BoardScreen, PairScreen },
  setup() {
    const display = useDisplay();

    watch(
      display.paired,
      (value) => {
        document.title = value ? "누리디에스엠 | 발송 보드" : "누리디에스엠 | 화면 연결";
      },
      { immediate: true },
    );

    return display;
  },
});
</script>

<template>
  <div class="shell">
    <a class="skip" href="#main">본문으로 건너뛰기</a>
    <span
      class="dot"
      :class="{ off: !live && paired }"
      role="status"
      :aria-label="live ? '실시간 연결됨' : paired ? '연결 끊김' : '연결 대기'"
    />
    <p class="sr-only" aria-live="polite">{{ liveHint }}</p>
    <p v-if="paired && tag" class="device-tag tabular" :aria-label="`화면 ${tag}`">{{ tag }}</p>
    <PairScreen v-if="!paired" :hint="hint" :code="code" :digits="digits" @copy="copyCode" />
    <BoardScreen v-else :board="board" :slide="slide" :flashes="flashes" />
  </div>
</template>
