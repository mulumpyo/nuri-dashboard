<script lang="ts">
import { defineComponent, onActivated, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import type { SsePayload } from "@nuri/shared";
import { carrierNeedsTime, PAY_TYPE_LABEL, PAY_TYPES } from "@nuri/shared";
import { connectEvents } from "@nuri/shared/sse";
import CardRail from "./CardRail.vue";
import Chevron from "./Chevron.vue";
import DatePicker from "./DatePicker.vue";
import HomeDock from "./HomeDock.vue";
import SegControl from "./SegControl.vue";
import Skeleton from "./Skeleton.vue";
import TimePicker from "./TimePicker.vue";
import { emptyBoardHint } from "../lib/board-copy";
import { useDayTravel, type DayPane } from "../lib/use-day-travel";
import { useHomeBoard } from "../lib/use-home-board";

export default defineComponent({
  name: "HomeBoard",
  components: { CardRail, Chevron, DatePicker, HomeDock, SegControl, Skeleton, TimePicker },
  setup() {
    const router = useRouter();
    const home = useHomeBoard(() => router.replace("/login"));
    const snap = (): DayPane => ({
      date: home.date.value,
      empty: !home.hasRows.value,
      groups: (home.activeDay.value?.carriers ?? []).map((group) => ({
        ...group,
        companies: group.companies.map((row) => ({ ...row })),
      })),
    });
    const travel = useDayTravel(snap, home.stepDay, home.pickDay, () => home.date.value);

    watch(
      () => [home.date.value, home.hasRows.value, home.activeDay.value] as const,
      () => {
        if (!home.board.value || travel.snapBusy()) return;
        travel.show(snap());
      },
      { deep: true },
    );

    let stopEvents: (() => void) | undefined;
    const onEvent = (payload: SsePayload) => {
      if (payload.type === "shipment.changed" || payload.type === "day.boundary") void home.load();
    };

    let skipActivate = true;
    onMounted(async () => {
      if (await home.load()) {
        travel.show(snap());
        stopEvents = connectEvents(onEvent);
      }
    });
    onActivated(() => {
      if (skipActivate) {
        skipActivate = false;
        return;
      }
      void home.load();
    });
    onUnmounted(() => stopEvents?.());

    return {
      home,
      ...home,
      ...travel,
      payOptions: PAY_TYPES.map((id) => ({ id, label: PAY_TYPE_LABEL[id] })),
      carrierNeedsTime,
      emptyBoardHint,
    };
  },
});
</script>

<template>
  <div class="workspace">
    <section class="list" aria-labelledby="list-heading">
      <div class="list-head">
        <h1 id="list-heading" class="title">{{ boardTitle }}</h1>
        <div class="day-switch" role="group" aria-label="날짜 이동">
          <button
            class="day-step"
            type="button"
            aria-label="어제"
            :disabled="!canPrevDay"
            @click="step(-1)"
          >
            <Chevron />
          </button>
          <DatePicker
            :model-value="date"
            variant="label"
            :disabled-dates="holidayDates"
            @update:model-value="pick"
          >
            <template #trigger="{ open, toggle, popId }">
              <button
                class="day-switch-label"
                type="button"
                :aria-expanded="open"
                aria-haspopup="dialog"
                :aria-controls="popId"
                aria-label="날짜 선택"
                @click="toggle"
              >
                {{ activeDay ? `${activeDay.label} ${activeDay.date.slice(5)}` : "보낼 목록" }}
              </button>
            </template>
          </DatePicker>
          <button
            class="day-step"
            type="button"
            aria-label="내일"
            :disabled="!canNextDay"
            @click="step(1)"
          >
            <Chevron dir="next" />
          </button>
        </div>
      </div>
      <Skeleton v-if="!board" variant="board" :rows="4" />
      <div v-else ref="stage" class="day-stage" :class="{ 'is-sliding': traveling }">
        <div
          class="day-track"
          :class="{ go: traveling, next: dayDir > 0, prev: dayDir < 0 }"
          :style="{ '--from': String(trackFrom), '--to': String(trackTo) }"
        >
          <div v-for="pane in dayPanes" :key="pane.date" class="day-pane">
            <p v-if="pane.empty" class="empty">
              <strong>아직 보낼 업체가 없어요</strong>
              <span class="caption">{{ emptyBoardHint }}</span>
            </p>
            <section v-else class="day-block">
              <template v-for="group in pane.groups" :key="group.carrierId">
                <div v-if="group.companies.length" class="carrier-group" role="group" :aria-label="group.name">
                  <p class="caption carrier-label">{{ group.name }}</p>
                  <CardRail>
                    <article v-for="row in group.companies" :key="row.shipmentId" class="item company-card" role="listitem">
                      <div class="card-head">
                        <strong :title="row.name">{{ row.name }}</strong>
                        <button
                          class="card-drop"
                          type="button"
                          :aria-label="`${row.name} 삭제`"
                          @click.stop="remove(row.shipmentId, row.name)"
                        >
                          <svg viewBox="0 0 12 12" aria-hidden="true">
                            <path
                              d="M2.2 2.2l7.6 7.6M9.8 2.2l-7.6 7.6"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="1.5"
                              stroke-linecap="round"
                            />
                          </svg>
                        </button>
                      </div>
                      <SegControl
                        class="card-pay"
                        :model-value="row.payType ?? 'prepaid'"
                        :options="payOptions"
                        label="결제 구분"
                        @update:model-value="patchPay(row.shipmentId, row.payType, $event)"
                      />
                      <TimePicker
                        v-if="carrierNeedsTime(group.name)"
                        class="card-time"
                        :model-value="row.shipTime ?? ''"
                        @update:model-value="patchTime(row.shipmentId, $event)"
                      />
                      <div v-else class="card-time" aria-hidden="true" />
                      <div class="row stepper">
                        <button class="ghost" type="button" aria-label="수량 줄이기" @click="patch(row.shipmentId, row.boxCount - 1)">
                          −
                        </button>
                        <span class="tabular">{{ row.boxCount }}</span>
                        <button class="ghost" type="button" aria-label="수량 늘리기" @click="patch(row.shipmentId, row.boxCount + 1)">
                          +
                        </button>
                      </div>
                    </article>
                  </CardRail>
                </div>
              </template>
            </section>
          </div>
        </div>
      </div>
    </section>

    <HomeDock :board="home" />
  </div>
</template>
