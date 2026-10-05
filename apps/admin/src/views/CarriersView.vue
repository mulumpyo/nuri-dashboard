<script lang="ts">
import { computed, defineComponent, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { isDefaultCarrier, type Carrier } from "@nuri/shared";
import { api } from "../api";
import { leaveIfAuth } from "../lib/leave";
import DirPage from "../components/DirPage.vue";
import FormDialog from "../components/FormDialog.vue";
import RowDrop from "../components/RowDrop.vue";
import { useDirPage } from "../lib/use-dir-page";
import { reloadHomeBoard } from "../lib/use-home-board";
import { withJosa } from "../lib/josa";

export default defineComponent({
  name: "CarriersView",
  components: { DirPage, FormDialog, RowDrop },
  setup() {
    const router = useRouter();
    const name = ref("");
    const dir = useDirPage(46, 36);
    const rows = ref<Carrier[]>([]);

    const filtered = computed(() => {
      const term = dir.query.value.trim().toLowerCase();
      return term ? rows.value.filter((row) => row.name.toLowerCase().includes(term)) : rows.value;
    });
    const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / dir.pageSize.value)));
    const items = computed(() =>
      filtered.value.slice((dir.page.value - 1) * dir.pageSize.value, dir.page.value * dir.pageSize.value),
    );
    watch([filtered, pages], () => {
      if (dir.page.value > pages.value) dir.page.value = pages.value;
    });

    const load = async () => {
      try {
        rows.value = await api.get<Carrier[]>("/api/carriers");
      } catch (err) {
        await leaveIfAuth(err, () => router.replace("/login"), dir.say);
      } finally {
        dir.ready.value = true;
      }
    };

    const openForm = () => {
      name.value = "";
      dir.formOpen.value = true;
    };

    const add = async () => {
      if (!name.value.trim() || dir.formBusy.value) return;
      dir.formBusy.value = true;
      try {
        await api.post("/api/carriers", { name: name.value });
        name.value = "";
        dir.formOpen.value = false;
        dir.say("등록했어요");
        dir.page.value = 1;
        await load();
        await reloadHomeBoard();
      } catch (err) {
        dir.say(err instanceof Error ? err.message : "다시 시도해 주세요");
      } finally {
        dir.formBusy.value = false;
      }
    };

    const toggle = async (row: Carrier) => {
      try {
        await api.patch(`/api/carriers/${row.id}`, { active: !row.active });
        await load();
        await reloadHomeBoard();
      } catch (err) {
        dir.say(err instanceof Error ? err.message : "다시 시도해 주세요");
      }
    };

    const drop = (row: Carrier) => {
      dir.ask({
        title: "택배사를 삭제할까요?",
        message: `${withJosa(row.name, "을", "를")} 삭제하면 관련 발송도 함께 사라져요.`,
        done: "삭제했어요",
        run: async () => {
          await api.del(`/api/carriers/${row.id}`);
          await load();
          await reloadHomeBoard();
        },
      });
    };

    dir.watchViewport(() => {
      void load();
    });

    return {
      name,
      items,
      pages,
      total: computed(() => filtered.value.length),
      query: dir.query,
      page: dir.page,
      pageSize: dir.pageSize,
      ready: dir.ready,
      viewport: dir.viewport,
      formOpen: dir.formOpen,
      formBusy: dir.formBusy,
      openForm,
      add,
      toggle,
      drop,
      isDefaultCarrier,
      search: () => dir.search(() => {
        dir.page.value = 1;
      }),
    };
  },
});
</script>

<template>
  <DirPage
    title="택배사"
    search-id="carrier-filter"
    search-label="택배사 이름 검색"
    search-placeholder="택배사 이름 검색"
    action-label="택배사 등록"
    pager-label="택배사 페이지"
    :query="query"
    :page="page"
    :pages="pages"
    :total="total"
    @action="openForm"
    @search="search"
    @page="page = $event"
    @update:query="query = $event"
  >
    <div ref="viewport" class="dir-viewport">
      <div v-if="!ready" class="dir-skel-list" role="status" aria-live="polite" aria-busy="true">
        <span class="sr-only">불러오는 중</span>
        <div v-for="row in pageSize" :key="`skel-${row}`" class="dir-skel-row">
          <span class="skel dir-skel-line" />
          <span class="skel dir-skel-drop" />
        </div>
      </div>
      <p v-else-if="!items.length" class="empty">
        <strong>{{ query.trim() ? "찾는 택배사가 없어요" : "아직 등록된 택배사가 없어요" }}</strong>
        <span class="caption">{{ query.trim() ? "다른 이름으로 찾아 보세요" : "택배사 등록을 눌러 주세요" }}</span>
      </p>
      <section v-else class="dir-board" aria-labelledby="carrier-list-heading">
        <h2 id="carrier-list-heading" class="sr-only">등록된 택배사</h2>
        <div class="dir-swap">
          <Transition name="list-swap">
            <div :key="page" class="dir-sheet">
              <div class="dir-cols" aria-hidden="true">
                <span class="dir-col-name">이름</span>
              </div>
              <article
                v-for="row in items"
                :key="row.id"
                class="dir-row"
                :class="{ mute: !row.active }"
              >
                <strong>{{ row.name }}</strong>
                <span v-if="!row.active" class="dir-meta">숨김</span>
                <div class="dir-actions">
                  <button
                    class="row-drop"
                    type="button"
                    :aria-label="row.active ? `${row.name} 숨기기` : `${row.name} 표시`"
                    @click="toggle(row)"
                  >
                    {{ row.active ? "숨기기" : "표시" }}
                  </button>
                  <RowDrop v-if="!isDefaultCarrier(row.name)" @click="drop(row)" />
                </div>
              </article>
            </div>
          </Transition>
        </div>
      </section>
    </div>

    <template #dialogs>
      <FormDialog
        v-if="formOpen"
        title="택배사 등록"
        confirm-label="등록"
        :busy="formBusy"
        @cancel="formOpen = false"
        @confirm="add"
      >
        <label class="form-field">
          <span class="caption">이름</span>
          <span class="field-shell">
            <input
              id="carrier-name"
              v-model="name"
              class="field"
              aria-label="택배사 이름"
              placeholder="택배사 이름"
              autocomplete="off"
            />
          </span>
        </label>
      </FormDialog>
    </template>
  </DirPage>
</template>
