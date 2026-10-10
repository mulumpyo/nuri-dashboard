<script lang="ts">
import { computed, defineComponent, onMounted, onUnmounted, ref, type PropType } from "vue";
import type { BoardResponse } from "@nuri/shared";
import { PAY_TYPE_LABEL } from "@nuri/shared";
import { formatBoardDate, formatBoardDay, formatBoardWeekday } from "./format-date";
import { fitName } from "./fit-name";
import { BOARD_PAGE_MS, BOARD_ROWS, viewDays } from "./page-board";

export default defineComponent({
  name: "BoardScreen",
  directives: { fitName },
  props: {
    board: { type: Object as PropType<BoardResponse | null>, default: null },
    slide: { type: Boolean, default: false },
    flashes: { type: Object as PropType<Record<string, boolean>>, default: () => ({}) },
  },
  setup(props) {
    const tick = ref(0);
    const narrow = ref(false);
    let timer: number | undefined;
    let media: MediaQueryList | undefined;
    const onWide = () => {
      narrow.value = Boolean(media?.matches);
    };
    onMounted(() => {
      media = window.matchMedia("(max-width: 1023px)");
      onWide();
      media.addEventListener("change", onWide);
      timer = window.setInterval(() => {
        if (!narrow.value) tick.value += 1;
      }, BOARD_PAGE_MS);
    });
    onUnmounted(() => {
      media?.removeEventListener("change", onWide);
      if (timer) window.clearInterval(timer);
    });
    const days = computed(() => (props.board ? viewDays(props.board.days, tick.value, !narrow.value) : []));
    const padPage = (page: (typeof days.value)[number]["page"]) =>
      narrow.value ? page : Array.from({ length: BOARD_ROWS }, (_, index) => page[index] ?? null);
    return {
      days,
      padPage,
      formatDate: formatBoardDate,
      formatDay: formatBoardDay,
      formatWeekday: formatBoardWeekday,
      PAY_TYPE_LABEL,
      BOARD_ROWS,
    };
  },
});
</script>

<template>
  <main v-if="!board" id="main" class="board" aria-busy="true">
    <h1 class="sr-only">발송 보드</h1>
    <p class="sr-only" role="status">불러오는 중</p>
    <section v-for="col in 4" :key="col" class="col">
      <header class="col-head">
        <p class="skel skel-board-date" />
      </header>
      <div class="col-body">
        <div class="board-page">
          <div v-for="row in BOARD_ROWS" :key="row" class="slot">
            <article class="entry skel-entry">
              <span class="skel skel-board-name" />
              <div class="entry-meta">
                <span class="skel skel-board-note" />
                <span class="skel skel-board-chip" />
                <span class="skel skel-board-chip" />
                <span class="skel skel-board-meta" />
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  </main>
  <main v-else id="main" class="board" :class="{ slide }">
    <h1 class="sr-only">발송 보드</h1>
    <section
      v-for="day in days"
      :key="day.date"
      class="col"
      :class="{ today: day.isToday, tomorrow: day.isTomorrow }"
      :aria-label="`${day.label} ${formatDate(day.date)}`"
    >
      <header class="col-head">
        <h2 class="when-date" :class="{ today: day.isToday }">
          <span class="when-day">{{ formatDay(day.date) }}</span>
          <span v-if="day.isToday" class="when-tag today">오늘</span>
          <span v-if="day.isTomorrow" class="when-tag">내일</span>
          <span class="when-tag">{{ formatWeekday(day.date) }}</span>
          <span v-if="day.pageCount > 1" class="page-mark">{{ day.pageIndex + 1 }}/{{ day.pageCount }}</span>
        </h2>
      </header>
      <div class="col-body">
        <div class="board-page" :key="`${day.date}-${day.pageIndex}`">
          <div v-for="(row, index) in padPage(day.page)" :key="row?.shipmentId ?? index" class="slot">
            <template v-if="row">
              <p v-if="row.showCarrier" class="carrier" v-fit-name>{{ row.carrier }}</p>
              <article class="entry" :class="{ flash: flashes[row.shipmentId] }">
                <strong class="name" v-fit-name>{{ row.name }}</strong>
                <div class="entry-meta">
                  <span class="note" :class="{ empty: !row.note }" :aria-hidden="!row.note" v-fit-name>{{
                    row.note
                  }}</span>
                  <span class="when tabular" :class="{ empty: !row.shipTime }" :aria-hidden="!row.shipTime">{{
                    row.shipTime
                  }}</span>
                  <span
                    class="pay"
                    :class="(row.payType ?? 'prepaid') === 'collect' ? 'collect' : 'prepaid'"
                  >{{ PAY_TYPE_LABEL[row.payType ?? "prepaid"] }}</span>
                  <span class="count tabular">{{ row.boxCount }}건</span>
                </div>
              </article>
            </template>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
