<script lang="ts">
import { computed, defineComponent, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { api } from "../api";
import { leaveIfAuth } from "../lib/leave";
import DirPage from "../components/DirPage.vue";
import FormDialog from "../components/FormDialog.vue";
import RowDrop from "../components/RowDrop.vue";
import { loadMe, me } from "../lib/session";
import { useDirPage } from "../lib/use-dir-page";
import { withJosa } from "../lib/josa";

type Account = { id: string; email: string; role: string; bootstrap?: boolean };

export default defineComponent({
  name: "AccountsView",
  components: { DirPage, FormDialog, RowDrop },
  setup() {
    const router = useRouter();
    const email = ref("");
    const rows = ref<Account[]>([]);
    const dir = useDirPage(46, 36);

    const filtered = computed(() => {
      const term = dir.query.value.trim().toLowerCase();
      if (!term) return rows.value;
      return rows.value.filter((row) => row.email.toLowerCase().includes(term));
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
        const session = me.value ?? (await loadMe());
        if (!session?.canManageUsers) {
          await router.replace("/");
          return;
        }
        rows.value = await api.get<Account[]>("/api/auth/users");
      } catch (err) {
        await leaveIfAuth(err, () => router.replace("/login"), dir.say);
      } finally {
        dir.ready.value = true;
      }
    };

    const openForm = () => {
      email.value = "";
      dir.formOpen.value = true;
    };

    const invite = async () => {
      if (!email.value.trim() || dir.formBusy.value) return;
      dir.formBusy.value = true;
      try {
        const sent = await api.post<{ status?: string; resent?: boolean }>("/api/auth/invites", {
          email: email.value,
        });
        email.value = "";
        dir.formOpen.value = false;
        dir.say(sent.resent ? "초대 메일을 다시 보냈어요" : "초대 메일을 보냈어요");
        await load();
      } catch (err) {
        dir.say(err instanceof Error ? err.message : "초대를 보내지 못했어요");
      } finally {
        dir.formBusy.value = false;
      }
    };

    const drop = (row: Account) => {
      dir.ask({
        title: "계정을 삭제할까요?",
        message: `${withJosa(row.email, "이", "가")} 더 이상 로그인할 수 없어요.`,
        done: "삭제했어요",
        run: async () => {
          await api.del(`/api/auth/users/${row.id}`);
          await load();
        },
      });
    };

    dir.watchViewport(() => {
      void load();
    });

    return {
      me,
      email,
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
      invite,
      drop,
      search: () => dir.search(() => {
        dir.page.value = 1;
      }),
    };
  },
});
</script>

<template>
  <DirPage
    title="계정"
    search-id="account-filter"
    search-label="계정 검색"
    search-placeholder="이메일 검색"
    action-label="계정 초대"
    unit="명"
    pager-label="계정 페이지"
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
        <div v-for="row in pageSize" :key="`skel-${row}`" class="dir-skel-row dir-row-stack">
          <span class="skel dir-skel-line" />
          <span class="skel dir-skel-drop" />
        </div>
      </div>
      <p v-else-if="!items.length" class="empty">
        <strong>{{ query.trim() ? "찾는 계정이 없어요" : "아직 등록된 계정이 없어요" }}</strong>
        <span class="caption">{{ query.trim() ? "다른 이메일로 찾아 보세요" : "계정 초대를 눌러 주세요" }}</span>
      </p>
      <section v-else class="dir-board" aria-labelledby="account-list-heading">
        <h2 id="account-list-heading" class="sr-only">등록된 계정</h2>
        <div class="dir-swap">
          <Transition name="list-swap">
            <div :key="page" class="dir-sheet">
              <div class="dir-cols" aria-hidden="true">
                <span class="dir-col-name">이메일</span>
              </div>
              <article v-for="row in items" :key="row.id" class="dir-row dir-row-stack">
                <div class="dir-copy">
                  <strong>{{ row.email }}</strong>
                </div>
                <span v-if="row.bootstrap || row.id === me?.id" class="caption dir-meta">
                  {{ row.bootstrap ? "부트스트랩" : "나" }}
                </span>
                <RowDrop v-else-if="me?.canManageUsers" @click="drop(row)" />
              </article>
            </div>
          </Transition>
        </div>
      </section>
    </div>

    <template #dialogs>
      <FormDialog
        v-if="formOpen"
        title="계정 초대"
        confirm-label="초대"
        :busy="formBusy"
        @cancel="formOpen = false"
        @confirm="invite"
      >
        <label class="form-field">
          <span class="caption">이메일</span>
          <span class="field-shell">
            <input
              id="invite-email"
              v-model="email"
              class="field"
              type="email"
              inputmode="email"
              autocomplete="email"
              aria-label="이메일 주소"
              placeholder="이메일 주소"
            />
          </span>
        </label>
      </FormDialog>
    </template>
  </DirPage>
</template>
