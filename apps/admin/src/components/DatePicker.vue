<script lang="ts">
import { computed, defineComponent, nextTick, onUnmounted, ref, watch, type PropType } from "vue";
import { formatDay, parseDay } from "../lib/day";
import { trapTab } from "../lib/focus";
import Chevron from "./Chevron.vue";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const todayStamp = () => formatDay(new Date());

export default defineComponent({
  name: "DatePicker",
  components: { Chevron },
  props: {
    modelValue: { type: String, default: "" },
    variant: { type: String, default: "pill" },
    placeholder: { type: String, default: "날짜 선택" },
    ariaLabel: { type: String, default: "" },
    disabledDates: { type: Array as PropType<string[]>, default: () => [] },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const open = ref(false);
    const sheet = ref(false);
    const trigger = ref<HTMLElement | null>(null);
    const pop = ref<HTMLElement | null>(null);
    const popId = `cal-pop-${Math.random().toString(36).slice(2, 8)}`;
    const view = ref({ y: new Date().getFullYear(), m: new Date().getMonth() });
    const popStyle = ref<Record<string, string>>({});

    const label = computed(() => {
      if (!props.modelValue) return props.placeholder;
      return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "short", day: "numeric" }).format(
        parseDay(props.modelValue),
      );
    });

    const shortLabel = computed(() => {
      if (!props.modelValue) return props.placeholder;
      return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(parseDay(props.modelValue));
    });

    const blocked = computed(() => new Set(props.disabledDates));
    const todayBlocked = computed(() => blocked.value.has(todayStamp()));
    const title = computed(() => `${view.value.y}년 ${view.value.m + 1}월`);

    const cells = computed(() => {
      const first = new Date(view.value.y, view.value.m, 1);
      const start = new Date(view.value.y, view.value.m, 1 - first.getDay());
      return Array.from({ length: 42 }, (_, i) => {
        const day = new Date(start);
        day.setDate(start.getDate() + i);
        const date = formatDay(day);
        return {
          date,
          day: day.getDate(),
          inMonth: day.getMonth() === view.value.m,
          today: date === todayStamp(),
          on: date === props.modelValue,
          disabled: blocked.value.has(date),
        };
      });
    });

    const place = () => {
      sheet.value = window.innerWidth < 1024;
      if (sheet.value) {
        popStyle.value = {
          top: "auto",
          left: "12px",
          right: "12px",
          bottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
          width: "auto",
        };
        return;
      }
      const box = trigger.value?.getBoundingClientRect();
      if (!box) return;
      const width = 328;
      const gap = 8;
      const edge = 12;
      const height = pop.value?.offsetHeight || 360;
      const roomRight = window.innerWidth - edge - box.left;
      const roomLeft = box.right - edge;
      let left = box.left;
      if (roomRight < width && roomLeft >= width) left = box.right - width;
      else if (roomRight < width) left = Math.max(edge, window.innerWidth - width - edge);
      let top = box.bottom + gap;
      if (top + height > window.innerHeight - edge && box.top - gap - height >= edge) {
        top = box.top - gap - height;
      }
      popStyle.value = {
        top: `${top}px`,
        left: `${left}px`,
        right: "auto",
        bottom: "auto",
        width: `${width}px`,
      };
    };

    const focusTrigger = () => {
      const root = trigger.value;
      if (!root) return;
      if (root.matches("button, [href], [tabindex]")) {
        root.focus();
        return;
      }
      root.querySelector<HTMLElement>("button, [href], [tabindex]")?.focus();
    };

    const close = () => {
      open.value = false;
    };

    const onDoc = (event: MouseEvent) => {
      const node = event.target as Node;
      if (trigger.value?.contains(node) || pop.value?.contains(node)) return;
      close();
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopImmediatePropagation();
        close();
        return;
      }
      trapTab(event, pop.value);
      const delta =
        event.key === "ArrowLeft"
          ? -1
          : event.key === "ArrowRight"
            ? 1
            : event.key === "ArrowUp"
              ? -7
              : event.key === "ArrowDown"
                ? 7
                : 0;
      if (!delta) return;
      const days = Array.from(pop.value?.querySelectorAll<HTMLButtonElement>(".cal-day") ?? []);
      const index = days.findIndex((el) => el === document.activeElement);
      event.preventDefault();
      if (index < 0) {
        days.find((el) => !el.disabled)?.focus();
        return;
      }
      let next = index + delta;
      while (days[next]?.disabled) next += Math.sign(delta);
      days[next]?.focus();
    };

    watch(open, async (value) => {
      if (!value) {
        document.removeEventListener("mousedown", onDoc);
        document.removeEventListener("keydown", onKey, true);
        window.removeEventListener("resize", place);
        focusTrigger();
        return;
      }
      const source = props.modelValue ? parseDay(props.modelValue) : new Date();
      view.value = { y: source.getFullYear(), m: source.getMonth() };
      await nextTick();
      place();
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("keydown", onKey, true);
      window.addEventListener("resize", place);
      pop.value?.querySelector<HTMLElement>(".cal-nav")?.focus();
    });

    onUnmounted(() => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", place);
    });

    const shift = (delta: number) => {
      const next = new Date(view.value.y, view.value.m + delta, 1);
      view.value = { y: next.getFullYear(), m: next.getMonth() };
    };

    const pick = (date: string) => {
      if (blocked.value.has(date)) return;
      emit("update:modelValue", date);
      close();
    };

    const goToday = () => {
      if (todayBlocked.value) return;
      const now = new Date();
      view.value = { y: now.getFullYear(), m: now.getMonth() };
      pick(todayStamp());
    };

    const toggle = () => {
      open.value = !open.value;
    };

    return {
      WEEKDAYS,
      open,
      popId,
      sheet,
      trigger,
      pop,
      popStyle,
      label,
      shortLabel,
      title,
      cells,
      todayBlocked,
      toggle,
      close,
      shift,
      pick,
      goToday,
    };
  },
});
</script>

<template>
  <div class="cal" :class="variant">
    <div ref="trigger" class="cal-slot">
      <slot name="trigger" :open="open" :toggle="toggle" :label="label" :pop-id="popId">
        <button
          class="pressable cal-trigger"
          :class="variant === 'pill' ? 'pill glass-thin' : 'field glass-thin'"
          type="button"
          :aria-expanded="open"
          aria-haspopup="dialog"
          :aria-controls="popId"
          :aria-label="ariaLabel || label"
          @click="toggle"
        >
          <svg class="cal-icon" viewBox="0 0 20 20" aria-hidden="true">
            <rect x="3.2" y="4.5" width="13.6" height="12.2" rx="3.2" fill="none" stroke="currentColor" stroke-width="1.5" />
            <path d="M6.2 3.2v2.8M13.8 3.2v2.8M3.2 8.2h13.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <span>{{ variant === 'pill' ? shortLabel : label }}</span>
        </button>
      </slot>
    </div>

    <Teleport to="body">
      <div v-if="open" class="cal-scrim" @mousedown="close" />
      <div
        v-if="open"
        :id="popId"
        ref="pop"
        class="cal-pop glass"
        :class="{ 'cal-pop-sheet': sheet }"
        role="dialog"
        aria-modal="true"
        aria-label="날짜 선택"
        :style="popStyle"
      >
        <div class="cal-bar">
          <button class="pressable ghost cal-nav" type="button" aria-label="이전 달" @click="shift(-1)">
            <Chevron />
          </button>
          <p class="cal-title">{{ title }}</p>
          <button class="pressable ghost cal-nav" type="button" aria-label="다음 달" @click="shift(1)">
            <Chevron dir="next" />
          </button>
        </div>
        <div class="cal-week" aria-hidden="true">
          <span v-for="day in WEEKDAYS" :key="day" class="caption">{{ day }}</span>
        </div>
        <div class="cal-grid">
          <button
            v-for="cell in cells"
            :key="cell.date"
            class="pressable cal-day"
            :class="{ on: cell.on, today: cell.today, mute: !cell.inMonth, holiday: cell.disabled }"
            type="button"
            :disabled="cell.disabled"
            :aria-pressed="cell.on"
            :aria-current="cell.today ? 'date' : undefined"
            :aria-label="`${cell.date}${cell.disabled ? ', 쉬는 날' : ''}`"
            @click="pick(cell.date)"
          >
            {{ cell.day }}
          </button>
        </div>
        <button class="pressable ghost cal-today" type="button" :disabled="todayBlocked" @click="goToday">오늘</button>
      </div>
    </Teleport>
  </div>
</template>
