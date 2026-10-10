<script lang="ts">
import { defineComponent, onActivated, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import type { SsePayload } from "@nuri/shared";
import { carrierNeedsTime, PAY_TYPE_LABEL, PAY_TYPES } from "@nuri/shared";
import { connectEvents } from "@nuri/shared/sse";
import CardRail from "./CardRail.vue";
import Chevron from "./Chevron.vue";
import DatePicker from "@nuri/ui/DatePicker.vue";
import FormDialog from "./FormDialog.vue";
import HomeDock from "./HomeDock.vue";
import SegControl from "./SegControl.vue";
import Skeleton from "./Skeleton.vue";
import TimePicker from "./TimePicker.vue";
import { emptyBoardHint } from "../lib/board-copy";
import { useDayTravel, type DayPane } from "../lib/use-day-travel";
import { useHomeBoard } from "../lib/use-home-board";

export default defineComponent({
  name: "HomeBoard",
  components: { CardRail, Chevron, DatePicker, FormDialog, HomeDock, SegControl, Skeleton, TimePicker },
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

    const nameTip = ref<{
      text: string;
      left: number;
      top: number;
      below: boolean;
      maxWidth: number;
      out?: boolean;
    } | null>(null);
    let nameTipTimer: ReturnType<typeof setTimeout> | undefined;
    const hideName = () => {
      if (nameTipTimer) clearTimeout(nameTipTimer);
      nameTipTimer = undefined;
      const cur = nameTip.value;
      if (!cur || cur.out) return;
      nameTip.value = { ...cur, out: true };
      nameTipTimer = setTimeout(() => {
        nameTip.value = null;
        nameTipTimer = undefined;
      }, 200);
    };
    const placeName = (el: HTMLElement, name: string) => {
      if (el.scrollWidth <= el.clientWidth + 1) return false;
      const box = el.getBoundingClientRect();
      const pad = 16;
      const maxWidth = Math.min(320, window.innerWidth - pad * 2);
      let left = box.left + box.width / 2;
      left = Math.min(window.innerWidth - pad - maxWidth / 2, Math.max(pad + maxWidth / 2, left));
      const below = box.top < 64;
      nameTip.value = {
        text: name,
        left,
        top: below ? box.bottom + 12 : box.top - 12,
        below,
        maxWidth,
      };
      return true;
    };
    const canHoverName = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const previewName = (event: PointerEvent, name: string) => {
      if (event.pointerType === "touch" || !canHoverName()) return;
      const el = event.currentTarget as HTMLElement;
      if (nameTipTimer) clearTimeout(nameTipTimer);
      if (nameTip.value?.out) nameTip.value = null;
      nameTipTimer = setTimeout(() => {
        placeName(el, name);
      }, 220);
    };
    const leaveName = (event: PointerEvent) => {
      if (event.pointerType === "touch" || !canHoverName()) return;
      hideName();
    };
    const toggleName = (event: MouseEvent, name: string) => {
      if (canHoverName()) return;
      const el = event.currentTarget as HTMLElement;
      if (nameTip.value?.text === name && !nameTip.value.out) {
        hideName();
        return;
      }
      if (nameTipTimer) clearTimeout(nameTipTimer);
      if (nameTip.value?.out) nameTip.value = null;
      if (!placeName(el, name)) return;
      nameTipTimer = setTimeout(hideName, 2800);
    };
    const awayName = (event: PointerEvent) => {
      if (!nameTip.value || nameTip.value.out) return;
      const node = event.target;
      if (node instanceof Element && node.closest(".card-name")) return;
      hideName();
    };

    let skipActivate = true;
    onMounted(async () => {
      window.addEventListener("scroll", hideName, true);
      document.addEventListener("pointerdown", awayName, true);
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
    onUnmounted(() => {
      window.removeEventListener("scroll", hideName, true);
      document.removeEventListener("pointerdown", awayName, true);
      hideName();
      stopEvents?.();
    });

    return {
      home,
      ...home,
      ...travel,
      payOptions: PAY_TYPES.map((id) => ({ id, label: PAY_TYPE_LABEL[id] })),
      carrierNeedsTime,
      emptyBoardHint,
      nameTip,
      previewName,
      leaveName,
      toggleName,
      hideName,
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
                :class="{ today: activeDay?.isToday }"
                type="button"
                :aria-expanded="open"
                aria-haspopup="dialog"
                :aria-controls="popId"
                aria-label="날짜 선택"
                @click="toggle"
              >
                <svg class="cal-icon" viewBox="0 0 20 20" aria-hidden="true">
                  <rect x="3.2" y="4.5" width="13.6" height="12.2" rx="3.2" fill="none" stroke="currentColor" stroke-width="1.5" />
                  <path d="M6.2 3.2v2.8M13.8 3.2v2.8M3.2 8.2h13.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
                <span>{{ activeDay ? `${activeDay.label} ${activeDay.date.slice(5)}` : "보낼 목록" }}</span>
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
                        <button
                          class="card-name"
                          type="button"
                          :aria-label="row.name"
                          :aria-expanded="nameTip?.text === row.name && !nameTip.out"
                          :aria-describedby="nameTip?.text === row.name ? 'name-tip' : undefined"
                          @pointerenter="previewName($event, row.name)"
                          @pointerleave="leaveName"
                          @click="toggleName($event, row.name)"
                        >{{ row.name }}</button>
                        <button
                          class="card-note"
                          :class="{ add: !row.note }"
                          type="button"
                          :aria-label="row.note ? `${row.name} 메모 ${row.note}` : `${row.name} 메모 추가`"
                          @click="editNote(row)"
                        >
                          <span class="card-note-text">{{ row.note || "메모 추가" }}</span>
                          <span class="card-note-edit" aria-hidden="true">
                            <svg viewBox="0 0 12 12">
                              <path
                                d="M7.85 2.15l2 2-6.2 6.2H1.65V8.35z"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.3"
                                stroke-linejoin="round"
                                stroke-linecap="round"
                              />
                            </svg>
                          </span>
                        </button>
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

    <Teleport to="body">
      <div
        v-if="nameTip"
        id="name-tip"
        class="name-tip"
        :class="{ below: nameTip.below, out: nameTip.out }"
        role="tooltip"
        :style="{
          left: `${nameTip.left}px`,
          top: `${nameTip.top}px`,
          maxWidth: `${nameTip.maxWidth}px`,
        }"
      >
        {{ nameTip.text }}
      </div>
    </Teleport>
    <HomeDock :board="home" />
    <FormDialog
      v-if="noteForm"
      :title="noteForm.from ? '메모 수정' : '메모 추가'"
      confirm-label="저장"
      :busy="noteBusy"
      @cancel="closeNote"
      @confirm="saveNote"
    >
      <label class="form-field">
        <span class="caption">메모</span>
        <span class="field-shell">
          <input
            v-model="noteDraft"
            class="field"
            type="text"
            maxlength="40"
            aria-label="바꿀 메모"
            placeholder="메모"
            autocomplete="off"
          />
        </span>
      </label>
    </FormDialog>
  </div>
</template>
