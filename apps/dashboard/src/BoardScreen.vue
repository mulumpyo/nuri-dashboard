<script lang="ts">
import { defineComponent, type PropType } from "vue";
import type { BoardResponse } from "@nuri/shared";
import { PAY_TYPE_LABEL } from "@nuri/shared";
import { formatBoardDate } from "./format-date";
import { fitName } from "./fit-name";

export default defineComponent({
  name: "BoardScreen",
  directives: { fitName },
  props: {
    board: { type: Object as PropType<BoardResponse | null>, default: null },
    slide: { type: Boolean, default: false },
    flashes: { type: Object as PropType<Record<string, boolean>>, default: () => ({}) },
  },
  setup() {
    return { formatDate: formatBoardDate, PAY_TYPE_LABEL };
  },
});
</script>

<template>
  <main v-if="!board" id="main" class="board" aria-busy="true">
    <h1 class="sr-only">발송 보드</h1>
    <p class="sr-only" role="status">불러오는 중</p>
    <section v-for="col in 4" :key="col" class="col">
      <header class="col-head">
        <p class="skel skel-board-label" />
        <p class="skel skel-board-date" />
      </header>
      <div class="col-body">
        <article v-for="row in 3" :key="row" class="entry skel-entry">
          <span class="skel skel-board-name" />
          <span class="skel skel-board-meta" />
        </article>
      </div>
    </section>
  </main>
  <main v-else id="main" class="board" :class="{ slide }">
    <h1 class="sr-only">발송 보드</h1>
    <section
      v-for="day in board.days"
      :key="day.date"
      class="col"
      :class="{ today: day.isToday, tomorrow: day.isTomorrow }"
      :aria-label="`${day.label} ${formatDate(day.date)}`"
    >
      <header class="col-head">
        <p class="label" :class="{ today: day.isToday }">{{ day.label }}</p>
        <h2 class="when-date" :class="{ today: day.isToday }" v-fit-name>
          {{ formatDate(day.date) }}<span v-if="day.isToday" class="today-mark"> (오늘)</span>
        </h2>
      </header>
      <div class="col-body">
        <template v-for="group in day.carriers" :key="group.carrierId">
          <div v-if="group.companies.length" class="group">
            <p class="carrier" v-fit-name>{{ group.name }}</p>
            <article
              v-for="row in group.companies"
              :key="row.shipmentId"
              class="entry"
              :class="{ flash: flashes[row.shipmentId] }"
            >
              <div class="entry-copy">
                <strong class="name" v-fit-name>{{ row.name }}</strong>
              </div>
              <span v-if="row.shipTime" class="when tabular">{{ row.shipTime }}</span>
              <span
                class="pay"
                :class="(row.payType ?? 'prepaid') === 'collect' ? 'collect' : 'prepaid'"
              >{{ PAY_TYPE_LABEL[row.payType ?? "prepaid"] }}</span>
              <span class="count tabular">{{ row.boxCount }}건</span>
            </article>
          </div>
        </template>
      </div>
    </section>
  </main>
</template>
