<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "Chevron",
  props: {
    dir: { type: String, default: "prev" },
  },
});
</script>

<template>
  <svg class="chev" :class="dir" viewBox="0 0 12 20" aria-hidden="true">
    <path
      d="M10 2 2 10l8 8"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
