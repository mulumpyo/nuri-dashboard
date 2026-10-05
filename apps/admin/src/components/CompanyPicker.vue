<script lang="ts">
import { defineComponent, nextTick, onUnmounted, ref, watch } from "vue";
import { api } from "../api";
import { useToast } from "../lib/chrome";
import { fitListSize } from "../lib/fit-list";
import { trapTab } from "../lib/focus";
import Pager from "./Pager.vue";
import Skeleton from "./Skeleton.vue";

type Company = { id: string; name: string };
type Page = { items: Company[]; page: number; pages: number; total: number };

export default defineComponent({
  name: "CompanyPicker",
  components: { Pager, Skeleton },
  props: {
    open: { type: Boolean, default: false },
  },
  emits: ["close", "pick"],
  setup(props, { emit }) {
    const { say } = useToast();
    const card = ref<HTMLElement | null>(null);
    const viewport = ref<HTMLElement | null>(null);
    const query = ref("");
    const page = ref(1);
    const pageSize = ref(6);
    const creating = ref(false);
    const newName = ref("");
    const busy = ref(false);
    const loading = ref(false);
    const data = ref<Page>({ items: [], page: 1, pages: 1, total: 0 });
    let timer: number | undefined;
    let resizeTimer: number | undefined;
    let previous: HTMLElement | null = null;
    let viewportRo: ResizeObserver | undefined;
    let loadSeq = 0;

    const measure = () => {
      const box = viewport.value;
      if (!box || box.clientHeight <= 0) return false;
      const next = fitListSize(box, 48, 0);
      if (next === pageSize.value) return false;
      pageSize.value = next;
      return true;
    };

    const stopWatch = () => {
      viewportRo?.disconnect();
      viewportRo = undefined;
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = undefined;
    };

    const watchViewport = () => {
      stopWatch();
      viewportRo = new ResizeObserver(() => {
        if (resizeTimer) window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
          if (measure()) void load(page.value);
        }, 80);
      });
      if (viewport.value) viewportRo.observe(viewport.value);
    };

    const load = async (nextPage = page.value) => {
      const mine = ++loadSeq;
      loading.value = true;
      try {
        const result = await api.get<Page>(
          `/api/companies?q=${encodeURIComponent(query.value)}&page=${nextPage}&limit=${pageSize.value}`,
        );
        if (mine !== loadSeq) return;
        data.value = result;
        page.value = result.page;
        if (!result.items.length && result.page > 1) {
          await load(result.page - 1);
        }
      } catch {
        if (mine !== loadSeq) return;
        data.value = { items: [], page: 1, pages: 1, total: 0 };
        say("업체를 불러오지 못했어요");
      } finally {
        if (mine === loadSeq) loading.value = false;
      }
    };

    const search = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void load(1);
      }, 180);
    };

    const pick = (row: Company) => {
      emit("pick", row);
      emit("close");
    };

    const startCreate = (preset = "") => {
      creating.value = true;
      newName.value = preset || query.value.trim();
      void nextTick(() => document.getElementById("picker-new-name")?.focus());
    };

    const cancelCreate = () => {
      creating.value = false;
      newName.value = "";
      void nextTick(() => document.getElementById("picker-company-search")?.focus());
    };

    const create = async () => {
      const name = newName.value.trim();
      if (!name || busy.value) return;
      busy.value = true;
      try {
        const row = await api.post<Company>("/api/companies", { name });
        pick(row);
      } catch (err) {
        say(err instanceof Error ? err.message : "다시 시도해 주세요");
      } finally {
        busy.value = false;
      }
    };

    const dismiss = () => {
      if (busy.value) return;
      emit("close");
    };

    const back = () => {
      if (busy.value) return;
      if (creating.value) {
        cancelCreate();
        return;
      }
      emit("close");
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopImmediatePropagation();
        back();
        return;
      }
      if (event.key === "Enter" && (event.target as HTMLElement | null)?.id === "picker-company-search") {
        const first = data.value.items[0];
        if (first) {
          event.preventDefault();
          pick(first);
        }
        return;
      }
      trapTab(event, card.value);
    };

    watch(
      () => props.open,
      async (open) => {
        if (!open) {
          document.removeEventListener("keydown", onKey, true);
          stopWatch();
          previous?.focus();
          return;
        }
        previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        query.value = "";
        page.value = 1;
        creating.value = false;
        newName.value = "";
        document.addEventListener("keydown", onKey, true);
        await nextTick();
        measure();
        watchViewport();
        await load(1);
        document.getElementById("picker-company-search")?.focus();
      },
    );

    watch(creating, async (on) => {
      if (!props.open) return;
      if (on) {
        stopWatch();
        return;
      }
      await nextTick();
      measure();
      watchViewport();
      void load(page.value);
    });

    onUnmounted(() => {
      document.removeEventListener("keydown", onKey, true);
      stopWatch();
      if (timer) window.clearTimeout(timer);
    });

    return {
      card,
      viewport,
      query,
      creating,
      newName,
      busy,
      loading,
      data,
      pageSize,
      load,
      search,
      pick,
      startCreate,
      back,
      dismiss,
      create,
    };
  },
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="confirm-root" @mousedown.self="dismiss">
      <section
        ref="card"
        class="confirm-card picker-card"
        :class="{ 'picker-browse': !creating }"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="creating ? 'picker-create-title' : 'picker-title'"
      >
        <div class="picker-head">
          <button class="dialog-btn" type="button" :disabled="busy" @click="back">
            {{ creating ? "뒤로" : "취소" }}
          </button>
          <h2 :id="creating ? 'picker-create-title' : 'picker-title'" class="title">
            {{ creating ? "새로운 업체" : "업체 선택" }}
          </h2>
          <button
            v-if="creating"
            class="dialog-btn on"
            type="button"
            :disabled="busy || !newName.trim()"
            :aria-busy="busy"
            @click="create"
          >
            추가
          </button>
          <span v-else class="picker-head-end" />
        </div>

        <form v-if="creating" class="picker-create" @submit.prevent="create">
          <label class="form-field">
            <span class="caption">이름</span>
            <span class="field-shell">
              <input
                id="picker-new-name"
                v-model="newName"
                class="field"
                aria-label="업체 이름"
                placeholder="업체 이름"
                autocomplete="off"
              />
            </span>
          </label>
        </form>

        <template v-else>
          <label class="search-field">
            <svg class="search-ico" viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="8.6" cy="8.6" r="5.2" fill="none" stroke="currentColor" stroke-width="1.7" />
              <path d="M12.5 12.5 16.4 16.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
            </svg>
            <input
              id="picker-company-search"
              v-model="query"
              class="field"
              aria-label="업체 이름 검색"
              placeholder="업체 이름 검색"
              autocomplete="off"
              @input="search"
            />
          </label>
          <div ref="viewport" class="dir-swap picker-swap">
            <Skeleton v-if="loading && !data.items.length" variant="picker" :rows="pageSize" />
            <p v-else-if="!data.items.length" class="caption picker-empty">
              {{ query.trim() ? "찾는 업체가 없어요" : "아직 등록된 업체가 없어요" }}
            </p>
            <Transition v-else name="picker-swap">
              <div :key="data.page" class="picker-list" role="listbox" aria-label="업체 목록">
                <button
                  v-for="row in data.items"
                  :key="row.id"
                  class="picker-item"
                  type="button"
                  role="option"
                  :aria-label="`${row.name} 선택`"
                  @click="pick(row)"
                >
                  {{ row.name }}
                </button>
              </div>
            </Transition>
          </div>
          <div class="picker-pager">
            <Pager
              compact
              steady
              :page="data.page"
              :pages="data.pages"
              :total="data.total"
              unit="곳"
              label="업체 페이지"
              @change="load"
            />
          </div>
          <button class="picker-new" type="button" @click="startCreate()">
            {{ query.trim() && !data.items.length ? "이 이름으로 등록" : "새로운 업체" }}
          </button>
        </template>
      </section>
    </div>
  </Teleport>
</template>
