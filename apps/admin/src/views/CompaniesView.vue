<script lang="ts">
import { computed, defineComponent, ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "../api";
import { leaveIfAuth } from "../lib/leave";
import DirPage from "../components/DirPage.vue";
import FormDialog from "../components/FormDialog.vue";
import RowDrop from "../components/RowDrop.vue";
import { useDirPage } from "../lib/use-dir-page";
import { withJosa } from "../lib/josa";

type Company = { id: string; name: string };
type Page = { items: Company[]; page: number; pages: number; total: number };
type Bulk = { deleted: number };

export default defineComponent({
  name: "CompaniesView",
  components: { DirPage, FormDialog, RowDrop },
  setup() {
    const router = useRouter();
    const name = ref("");
    const editing = ref<Company | null>(null);
    const dir = useDirPage(46, 88);
    const data = ref<Page>({ items: [], page: 1, pages: 1, total: 0 });
    const selected = ref<string[]>([]);
    let loadSeq = 0;

    const picked = (id: string) => selected.value.includes(id);
    const pageIds = computed(() => data.value.items.map((row) => row.id));
    const allOnPage = computed(
      () => pageIds.value.length > 0 && pageIds.value.every((id) => selected.value.includes(id)),
    );
    const someOnPage = computed(() => pageIds.value.some((id) => selected.value.includes(id)));

    const load = async (nextPage = dir.page.value) => {
      const mine = ++loadSeq;
      try {
        const page = await api.get<Page>(
          `/api/companies?q=${encodeURIComponent(dir.query.value)}&page=${nextPage}&limit=${dir.pageSize.value}`,
        );
        if (mine !== loadSeq) return;
        data.value = page;
        dir.page.value = page.page;
        if (!page.items.length && page.page > 1) {
          await load(page.page - 1);
        }
      } catch (err) {
        if (mine !== loadSeq) return;
        await leaveIfAuth(err, () => router.replace("/login"), dir.say);
      } finally {
        if (mine === loadSeq) dir.ready.value = true;
      }
    };

    const openForm = () => {
      editing.value = null;
      name.value = "";
      dir.formOpen.value = true;
    };

    const openEdit = (row: Company) => {
      editing.value = row;
      name.value = row.name;
      dir.formOpen.value = true;
    };

    const closeForm = () => {
      dir.formOpen.value = false;
      editing.value = null;
    };

    const save = async () => {
      if (!name.value.trim() || dir.formBusy.value) return;
      dir.formBusy.value = true;
      const draft = name.value;
      const current = editing.value;
      try {
        if (current) await api.patch(`/api/companies/${current.id}`, { name: draft });
        else await api.post("/api/companies", { name: draft });
        name.value = "";
        editing.value = null;
        dir.formOpen.value = false;
        dir.say(current ? "수정했어요" : "등록했어요");
        await load(current ? dir.page.value : 1);
      } catch (err) {
        dir.say(err instanceof Error ? err.message : "다시 시도해 주세요");
      } finally {
        dir.formBusy.value = false;
      }
    };

    const toggle = (id: string) => {
      selected.value = picked(id) ? selected.value.filter((row) => row !== id) : [...selected.value, id];
    };

    const toggleAll = () => {
      if (allOnPage.value) {
        const drop = new Set(pageIds.value);
        selected.value = selected.value.filter((id) => !drop.has(id));
        return;
      }
      selected.value = [...new Set([...selected.value, ...pageIds.value])];
    };

    const drop = (row: Company) => {
      dir.ask({
        title: "업체를 삭제할까요?",
        message: `${withJosa(row.name, "을", "를")} 삭제하면 관련 발송도 함께 사라져요.`,
        done: "삭제했어요",
        run: async () => {
          await api.del(`/api/companies/${row.id}`);
          selected.value = selected.value.filter((id) => id !== row.id);
          await load();
        },
      });
    };

    const dropSelected = () => {
      if (!selected.value.length) return;
      const count = selected.value.length;
      dir.ask({
        title: "선택한 업체를 삭제할까요?",
        message: `${count}곳이 목록에서 빠져요. 관련 발송도 함께 사라져요.`,
        run: async () => {
          const result = await api.post<Bulk>("/api/companies/bulk-delete", { ids: selected.value });
          selected.value = [];
          await load();
          dir.say(result.deleted > 1 ? `${result.deleted}곳을 지웠어요` : "삭제했어요");
        },
      });
    };

    dir.watchViewport(() => {
      void load(dir.ready.value ? dir.page.value : 1);
    });

    return {
      name,
      editing,
      data,
      selected,
      allOnPage,
      someOnPage,
      picked,
      load,
      openForm,
      openEdit,
      closeForm,
      save,
      toggle,
      toggleAll,
      drop,
      dropSelected,
      query: dir.query,
      formOpen: dir.formOpen,
      formBusy: dir.formBusy,
      ready: dir.ready,
      viewport: dir.viewport,
      pageSize: dir.pageSize,
      search: () => dir.search(() => void load(1)),
    };
  },
});
</script>

<template>
  <DirPage
    title="업체"
    search-id="company-filter"
    search-label="업체 이름 검색"
    search-placeholder="업체 이름 검색"
    action-label="업체 등록"
    pager-label="업체 페이지"
    :query="query"
    :page="data.page"
    :pages="data.pages"
    :total="data.total"
    @action="openForm"
    @search="search"
    @page="load"
    @update:query="query = $event"
  >
    <div ref="viewport" class="dir-viewport">
      <div v-if="!ready" class="dir-skel-list" role="status" aria-live="polite" aria-busy="true">
        <span class="sr-only">불러오는 중</span>
        <div class="dir-skel-head">
          <span class="skel dir-skel-tick" />
          <span class="skel dir-skel-line" />
        </div>
        <div v-for="row in pageSize" :key="`skel-${row}`" class="dir-skel-row">
          <span class="skel dir-skel-tick" />
          <span class="skel dir-skel-line" />
          <span class="skel dir-skel-drop" />
        </div>
      </div>
      <p v-else-if="!data.items.length" class="empty">
        <strong>{{ query.trim() ? "찾는 업체가 없어요" : "아직 등록된 업체가 없어요" }}</strong>
        <span class="caption">{{ query.trim() ? "다른 이름으로 찾아 보세요" : "업체 등록을 눌러 주세요" }}</span>
      </p>
      <section v-else class="dir-board" aria-labelledby="company-list-heading">
        <h2 id="company-list-heading" class="sr-only">등록된 업체</h2>
        <div class="dir-sheet">
          <div class="dir-tools">
            <label class="check">
              <input
                class="sr-only"
                type="checkbox"
                :checked="allOnPage"
                :indeterminate.prop="someOnPage && !allOnPage"
                aria-label="이 페이지 전체 선택"
                @change="toggleAll"
              />
              <span class="tick" aria-hidden="true" />
              전체 선택
            </label>
            <button
              v-if="selected.length"
              class="ghost dir-bulk"
              type="button"
              @click="dropSelected"
            >
              {{ selected.length > 1 ? `${selected.length}곳 삭제` : "삭제" }}
            </button>
          </div>
          <div class="dir-cols" aria-hidden="true">
            <span class="dir-col-name">이름</span>
          </div>
          <div class="dir-swap">
            <Transition name="list-swap">
              <div :key="data.page" class="dir-swap-page">
                <article v-for="row in data.items" :key="row.id" class="dir-row" :class="{ on: picked(row.id) }">
                  <label class="check">
                    <input
                      class="sr-only"
                      type="checkbox"
                      :checked="picked(row.id)"
                      :aria-label="`${row.name} 선택`"
                      @change="toggle(row.id)"
                    />
                    <span class="tick" aria-hidden="true" />
                    <strong>{{ row.name }}</strong>
                  </label>
                  <div class="dir-actions">
                    <button class="row-edit" type="button" :aria-label="`${row.name} 수정`" @click="openEdit(row)">
                      수정
                    </button>
                    <RowDrop @click="drop(row)" />
                  </div>
                </article>
              </div>
            </Transition>
          </div>
        </div>
      </section>
    </div>

    <template #dialogs>
      <FormDialog
        v-if="formOpen"
        :title="editing ? '업체 수정' : '업체 등록'"
        :confirm-label="editing ? '저장' : '등록'"
        :busy="formBusy"
        @cancel="closeForm"
        @confirm="save"
      >
        <label class="form-field">
          <span class="caption">이름</span>
          <span class="field-shell">
            <input
              id="company-name"
              v-model="name"
              class="field"
              aria-label="업체 이름"
              placeholder="업체 이름"
              autocomplete="off"
            />
          </span>
        </label>
      </FormDialog>
    </template>
  </DirPage>
</template>
