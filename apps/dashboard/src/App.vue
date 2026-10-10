<script lang="ts">
import { defineComponent, watch } from "vue";
import DatePicker from "@nuri/ui/DatePicker.vue";
import BoardScreen from "./BoardScreen.vue";
import PairScreen from "./PairScreen.vue";
import { useDisplay } from "./use-display";

export default defineComponent({
  name: "DashboardApp",
  components: { BoardScreen, DatePicker, PairScreen },
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
    <nav v-if="paired && preview" class="asof" aria-label="미리보기 오늘">
      <p class="asof-mark">미리보기</p>
      <div class="asof-switch" role="group" aria-label="날짜 이동">
        <button class="asof-step" type="button" aria-label="하루 전" @click="nudgeAsOf(-1)">
          <svg class="chev prev" viewBox="0 0 12 20" aria-hidden="true">
            <path
              d="M10 2 2 10l8 8"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <DatePicker :model-value="asOfCursor" aria-label="미리보기 날짜" @update:model-value="applyAsOf">
          <template #trigger="{ open, toggle, popId }">
            <button
              class="asof-day"
              type="button"
              :aria-expanded="open"
              aria-haspopup="dialog"
              :aria-controls="popId"
              aria-label="날짜 선택"
              @click="toggle"
            >
              <svg class="cal-icon" viewBox="0 0 20 20" aria-hidden="true">
                <rect
                  x="3.2"
                  y="4.5"
                  width="13.6"
                  height="12.2"
                  rx="3.2"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
                <path
                  d="M6.2 3.2v2.8M13.8 3.2v2.8M3.2 8.2h13.6"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
              <span>{{ asOfLabel }}</span>
            </button>
          </template>
        </DatePicker>
        <button class="asof-step" type="button" aria-label="하루 후" @click="nudgeAsOf(1)">
          <svg class="chev next" viewBox="0 0 12 20" aria-hidden="true">
            <path
              d="M10 2 2 10l8 8"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>
      <Transition name="asof-reset">
        <span v-if="asOf" class="asof-reset-slot">
          <button class="asof-reset" type="button" @click="clearAsOf">실제 오늘</button>
        </span>
      </Transition>
    </nav>
    <PairScreen v-if="!paired" :hint="hint" :code="code" :digits="digits" @copy="copyCode" />
    <BoardScreen v-else :board="board" :slide="slide" :flashes="flashes" />
  </div>
</template>
