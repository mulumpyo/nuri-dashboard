<script lang="ts">
import { defineComponent, nextTick, onMounted, onUnmounted, ref } from "vue";
import { trapTab } from "../lib/focus";

export default defineComponent({
  name: "ConfirmDialog",
  props: {
    title: { type: String, required: true },
    message: { type: String, default: "" },
    confirmLabel: { type: String, default: "삭제" },
    danger: { type: Boolean, default: true },
    busy: { type: Boolean, default: false },
  },
  emits: ["cancel", "confirm"],
  setup(props, { emit }) {
    const card = ref<HTMLElement | null>(null);
    let previous: HTMLElement | null = null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !props.busy) {
        event.stopImmediatePropagation();
        emit("cancel");
        return;
      }
      trapTab(event, card.value);
    };
    const onBackdrop = () => {
      if (!props.busy) emit("cancel");
    };
    onMounted(() => {
      previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      document.addEventListener("keydown", onKey, true);
      void nextTick(() => document.getElementById("confirm-cancel")?.focus());
    });
    onUnmounted(() => {
      document.removeEventListener("keydown", onKey, true);
      previous?.focus();
    });
    return { card, onBackdrop };
  },
});
</script>

<template>
  <Teleport to="body">
    <div class="confirm-root" @mousedown.self="onBackdrop">
      <section
        ref="card"
        class="confirm-card glass"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        :aria-describedby="message ? 'confirm-desc' : undefined"
      >
        <h2 id="confirm-title" class="title">{{ title }}</h2>
        <p v-if="message" id="confirm-desc" class="caption">{{ message }}</p>
        <div class="row confirm-actions">
          <button
            id="confirm-cancel"
            class="dialog-btn"
            type="button"
            :disabled="busy"
            @click="$emit('cancel')"
          >
            취소
          </button>
          <button
            class="dialog-btn on"
            :class="{ danger }"
            type="button"
            :disabled="busy"
            :aria-busy="busy"
            @click="$emit('confirm')"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
