<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "Skeleton",
  props: {
    variant: { type: String, default: "list" },
    rows: { type: Number, default: 5 },
  },
});
</script>

<template>
  <div class="skel-wrap" :class="`skel-${variant}`" role="status" aria-live="polite" aria-busy="true">
    <span class="sr-only">불러오는 중</span>
    <template v-if="variant === 'board'">
      <p class="skel skel-label" />
      <div class="card-grid">
        <article v-for="row in rows" :key="`board-${row}`" class="item company-card skel-card">
          <div class="skel-copy">
            <span class="skel skel-title" />
            <span class="skel skel-sub" />
          </div>
          <span class="skel skel-chip" />
        </article>
      </div>
    </template>
    <template v-else-if="variant === 'pills'">
      <span v-for="row in rows" :key="`pill-${row}`" class="skel skel-pill" />
    </template>
    <template v-else-if="variant === 'picker'">
      <span v-for="row in rows" :key="`pick-${row}`" class="skel skel-pick" />
    </template>
    <template v-else>
      <article v-for="row in rows" :key="`list-${row}`" class="item glass skel-card">
        <div class="skel-copy">
          <span class="skel skel-title" />
        </div>
        <span class="skel skel-meta" />
      </article>
    </template>
  </div>
</template>
