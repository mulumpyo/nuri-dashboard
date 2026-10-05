<script lang="ts">
import { defineComponent, type PropType } from "vue";
import { useSlidingPill } from "../lib/use-sliding-pill";

type Option = { id: string; label: string };

export default defineComponent({
  name: "SegControl",
  props: {
    modelValue: { type: String, required: true },
    options: { type: Array as PropType<Option[]>, required: true },
    label: { type: String, required: true },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const pill = useSlidingPill(() => props.options.findIndex((item) => item.id === props.modelValue));
    const pick = (id: string) => {
      if (id === props.modelValue) return;
      emit("update:modelValue", id);
    };

    return {
      rail: pill.rail,
      buttons: pill.buttons,
      pillOn: pill.pillOn,
      ready: pill.ready,
      pillStyle: pill.pillStyle,
      pick,
    };
  },
});
</script>

<template>
  <div ref="rail" class="seg" role="group" :aria-label="label">
    <span
      class="nav-pill seg-pill"
      :class="{ on: pillOn, ready }"
      :style="pillStyle()"
      aria-hidden="true"
    />
    <button
      v-for="item in options"
      :key="item.id"
      ref="buttons"
      class="seg-item pressable"
      :class="{ on: modelValue === item.id }"
      type="button"
      :aria-pressed="modelValue === item.id"
      @click="pick(item.id)"
    >
      <span class="seg-label">{{ item.label }}</span>
    </button>
  </div>
</template>
