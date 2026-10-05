<script lang="ts">
import { computed, defineComponent, ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "../api";
import PageHead from "../components/PageHead.vue";
import Pager from "../components/Pager.vue";
import { leaveIfAuth } from "../lib/leave";
import { loadMe, me } from "../lib/session";
import { useDirPage } from "../lib/use-dir-page";

type LogKind = "work" | "login";

type LogItem = {
  at: string;
  actor: string;
  talk: string;
  requestId: string;
  ok: boolean;
  email: string;
  kind: LogKind;
  detail: string;
};

type LogPage = {
  items: LogItem[];
  page: number;
  pages: number;
  total: number;
};

export default defineComponent({
  name: "LogsView",
  components: { PageHead, Pager },
  setup() {
    const router = useRouter();
    const dir = useDirPage(64, 0);
    const kind = ref<LogKind>("work");
    const pages = ref(1);
    const total = ref(0);
    const items = ref<LogItem[]>([]);
    let seq = 0;

    const empty = computed(() =>
      dir.query.value.trim()
        ? kind.value === "login"
          ? "찾는 로그인 기록이 없어요"
          : "찾는 작업 기록이 없어요"
        : kind.value === "login"
          ? "아직 로그인 기록이 없어요"
          : "아직 작업 기록이 없어요",
    );

    const load = async (nextPage = dir.page.value) => {
      const session = me.value ?? (await loadMe());
      if (!session?.canManageUsers) {
        await router.replace("/settings");
        return;
      }
      const ticket = ++seq;
      try {
        const next = await api.get<LogPage>(
          `/api/auth/activity?kind=${kind.value}&q=${encodeURIComponent(dir.query.value.trim())}&page=${nextPage}&limit=${dir.pageSize.value}`,
        );
        if (ticket !== seq) return;
        items.value = next.items;
        dir.page.value = next.page;
        pages.value = next.pages;
        total.value = next.total;
        if (!next.items.length && next.page > 1) {
          await load(next.page - 1);
        }
      } catch (err) {
        if (ticket !== seq) return;
        await leaveIfAuth(err, () => router.replace("/login"), dir.say);
      } finally {
        if (ticket === seq) dir.ready.value = true;
      }
    };

    const pickKind = (next: LogKind) => {
      if (kind.value === next) return;
      kind.value = next;
      dir.page.value = 1;
      void load(1);
    };

    const search = () => {
      dir.page.value = 1;
      dir.search(() => void load(1));
    };

    const formatWhen = (value: string) =>
      new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value));

    const headline = (row: LogItem) => row.talk;

    const meta = (row: LogItem) => {
      const who = row.email && !row.talk.includes(row.email) ? row.email : "";
      const extra = row.detail && !row.talk.includes(row.detail) ? row.detail : "";
      return [who, extra, row.actor, formatWhen(row.at)].filter(Boolean).join(" · ");
    };

    dir.watchViewport(() => {
      void load(dir.ready.value ? dir.page.value : 1);
    });

    return {
      kind,
      query: dir.query,
      page: dir.page,
      pages,
      total,
      items,
      ready: dir.ready,
      viewport: dir.viewport,
      empty,
      pickKind,
      search,
      headline,
      meta,
      goBack: () => router.push("/settings"),
      goPage: (next: number) => {
        dir.page.value = next;
        void load(next);
      },
    };
  },
});
</script>

<template>
  <main id="main" class="wrap plain set-page set-logs">
    <PageHead
      title="로그 기록"
      title-id="logs-title"
      back-to="/settings"
      back-label="설정"
      @back="goBack"
    />

    <section class="set-group" aria-labelledby="logs-title">
      <div class="set-card">
        <div class="seg set-tabs" role="tablist" aria-label="로그 종류">
          <button
            class="seg-item pressable"
            :class="{ on: kind === 'work' }"
            type="button"
            role="tab"
            :aria-selected="kind === 'work'"
            aria-controls="logs-panel"
            :tabindex="kind === 'work' ? 0 : -1"
            @click="pickKind('work')"
          >
            <span v-if="kind === 'work'" class="highlight" aria-hidden="true" />
            <span class="seg-label">작업</span>
          </button>
          <button
            class="seg-item pressable"
            :class="{ on: kind === 'login' }"
            type="button"
            role="tab"
            :aria-selected="kind === 'login'"
            aria-controls="logs-panel"
            :tabindex="kind === 'login' ? 0 : -1"
            @click="pickKind('login')"
          >
            <span v-if="kind === 'login'" class="highlight" aria-hidden="true" />
            <span class="seg-label">로그인</span>
          </button>
        </div>
      </div>
    </section>

    <section class="set-group" aria-label="로그 검색">
      <div class="set-card">
        <label class="set-row">
          <span class="sr-only">로그 검색</span>
          <input
            id="log-filter"
            v-model="query"
            class="set-field set-search"
            type="search"
            enterkeyhint="search"
            aria-label="로그 검색"
            placeholder="이메일, 이름, 내용"
            @input="search"
            @keydown.enter.prevent="search"
          />
        </label>
      </div>
    </section>

    <section
      id="logs-panel"
      ref="viewport"
      class="set-group logs-well"
      role="tabpanel"
      :aria-label="kind === 'login' ? '로그인 기록' : '작업 기록'"
    >
      <div class="set-card">
        <p v-if="!ready" class="set-row set-empty" role="status" aria-live="polite">불러오는 중</p>
        <p v-else-if="!items.length" class="set-row set-empty">{{ empty }}</p>
        <article v-for="row in items" :key="row.requestId + row.at" class="set-row set-log">
          <div class="set-copy">
            <strong>{{ headline(row) }}</strong>
            <span class="set-sub">{{ meta(row) }}</span>
          </div>
        </article>
      </div>
    </section>

    <div class="logs-pager">
      <Pager
        v-if="ready && total"
        :page="page"
        :pages="pages"
        :total="total"
        unit="건"
        label="로그 페이지"
        compact
        @change="goPage"
      />
    </div>
  </main>
</template>
