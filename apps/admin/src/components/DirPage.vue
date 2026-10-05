<script lang="ts">
import { defineComponent } from "vue";
import PageHead from "./PageHead.vue";
import Pager from "./Pager.vue";

export default defineComponent({
  name: "DirPage",
  components: { PageHead, Pager },
  props: {
    title: { type: String, required: true },
    query: { type: String, default: "" },
    searchId: { type: String, required: true },
    searchLabel: { type: String, required: true },
    searchPlaceholder: { type: String, required: true },
    actionLabel: { type: String, required: true },
    note: { type: String, default: "" },
    page: { type: Number, default: 1 },
    pages: { type: Number, default: 1 },
    total: { type: Number, default: 0 },
    unit: { type: String, default: "곳" },
    pagerLabel: { type: String, required: true },
  },
  emits: ["action", "search", "page", "update:query"],
});
</script>

<template>
  <main id="main" class="wrap plain dir-page">
    <div class="dir-toolbar">
      <PageHead :title="title" />
      <label class="search-field">
        <svg class="search-ico" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="8.6" cy="8.6" r="5.2" fill="none" stroke="currentColor" stroke-width="1.7" />
          <path d="M12.5 12.5 16.4 16.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
        </svg>
        <input
          :id="searchId"
          :value="query"
          class="field"
          :aria-label="searchLabel"
          :placeholder="searchPlaceholder"
          autocomplete="off"
          @input="
            $emit('update:query', ($event.target as HTMLInputElement).value);
            $emit('search');
          "
        />
      </label>
      <button class="pressable dir-add" type="button" @click="$emit('action')">{{ actionLabel }}</button>
    </div>
    <p v-if="note" class="caption break">{{ note }}</p>

    <slot />

    <div class="dir-pager">
      <Pager
        v-if="total"
        :page="page"
        :pages="pages"
        :total="total"
        :unit="unit"
        :label="pagerLabel"
        @change="$emit('page', $event)"
      />
    </div>

    <slot name="dialogs" />
  </main>
</template>
