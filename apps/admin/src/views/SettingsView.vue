<script lang="ts">
import { defineComponent, onActivated, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { deviceTag } from "@nuri/shared";
import { api } from "../api";
import Chevron from "../components/Chevron.vue";
import DatePicker from "@nuri/ui/DatePicker.vue";
import FormDialog from "../components/FormDialog.vue";
import PageHead from "../components/PageHead.vue";
import { overlay } from "../lib/chrome";
import { trapTab } from "../lib/focus";
import { clearMe } from "../lib/session";
import { useHomeSettings } from "../lib/use-home-settings";

export default defineComponent({
  name: "SettingsView",
  components: { Chevron, DatePicker, FormDialog, PageHead },
  setup() {
    const router = useRouter();
    const settings = useHomeSettings();
    const pairOpen = ref(false);
    const holidayOpen = ref(false);
    const holidayCard = ref<HTMLElement | null>(null);

    const openPair = () => {
      settings.pairCode.value = "";
      pairOpen.value = true;
    };

    const closePair = () => {
      if (settings.pairBusy.value) return;
      pairOpen.value = false;
      settings.pairCode.value = "";
    };

    const confirmPair = async () => {
      if (await settings.approve()) pairOpen.value = false;
    };

    const openLogs = () => {
      void router.push("/settings/logs");
    };

    const openPreview = () => {
      window.location.assign("/display/");
    };

    const logout = async () => {
      await api.post("/api/auth/logout").catch(() => undefined);
      clearMe();
      await router.replace("/login");
    };

    watch([pairOpen, holidayOpen], ([pair, list]) => {
      overlay.sheet = pair || list;
    });

    const onSheetKey = (event: KeyboardEvent) => {
      if (holidayOpen.value) {
        if (event.key === "Escape") {
          holidayOpen.value = false;
          return;
        }
        trapTab(event, holidayCard.value);
        return;
      }
    };

    let skipActivate = true;
    onMounted(async () => {
      if (!(await settings.load())) {
        await router.replace("/login");
        return;
      }
      await settings.loadSettings();
      document.addEventListener("keydown", onSheetKey, true);
    });
    onActivated(() => {
      if (skipActivate) {
        skipActivate = false;
        return;
      }
      void settings.loadSettings();
    });

    onUnmounted(() => {
      document.removeEventListener("keydown", onSheetKey, true);
      overlay.sheet = false;
    });

    return {
      ...settings,
      pairOpen,
      holidayOpen,
      holidayCard,
      openPair,
      closePair,
      confirmPair,
      openLogs,
      openPreview,
      logout,
      deviceTag,
    };
  },
});
</script>

<template>
  <main id="main" class="wrap plain set-page">
    <PageHead title="설정" title-id="settings-title" />

    <section class="set-group" aria-labelledby="set-tv-title">
      <div class="set-head">
        <h3 id="set-tv-title">TV 화면</h3>
        <div class="set-actions">
          <a
            v-if="me?.bootstrap"
            class="set-action"
            href="/display/"
            aria-label="디스플레이 미리보기"
            @click.prevent="openPreview"
          >미리보기</a>
          <button class="set-action" type="button" aria-label="화면 연결" @click="openPair">연결</button>
        </div>
      </div>
      <div class="set-card">
        <p v-if="!devices.length" class="set-row set-empty">연결된 화면이 없어요</p>
        <div v-for="device in devices" :key="device.id" class="set-row">
          <div class="set-copy">
            <strong class="set-tag tabular" :aria-label="`화면 ${deviceTag(device.id)}`">{{
              deviceTag(device.id)
            }}</strong>
            <span class="set-sub">디스플레이</span>
          </div>
          <button
            class="set-danger"
            type="button"
            :aria-label="`${deviceTag(device.id)} 끊기`"
            @click="revoke(device.id, deviceTag(device.id))"
          >
            끊기
          </button>
        </div>
      </div>
    </section>

    <section class="set-group" aria-labelledby="set-off-title">
      <div class="set-head">
        <h3 id="set-off-title">쉬는 날</h3>
        <button class="set-action" type="button" @click="syncHolidays">불러오기</button>
      </div>
      <p v-if="holidaySync?.status === 'degraded'" class="set-foot">
        {{ holidaySync.message ?? "가져오지 못했어요" }}
      </p>
      <div class="set-card">
        <div class="set-row">
          <span class="set-label">날짜</span>
          <DatePicker v-model="holidayDate" placeholder="날짜 선택" :disabled-dates="holidayDates">
            <template #trigger="{ open, toggle, label, popId }">
              <button
                id="holiday-date"
                class="set-value"
                type="button"
                :aria-expanded="open"
                aria-haspopup="dialog"
                :aria-controls="popId"
                aria-label="날짜 선택"
                @click="toggle"
              >
                {{ label }}
              </button>
            </template>
          </DatePicker>
        </div>
        <div class="set-row set-compose">
          <label class="set-label" for="holiday-name">이름</label>
          <input
            id="holiday-name"
            v-model="holidayName"
            class="set-field"
            aria-label="이름"
            placeholder="이름"
            autocomplete="off"
            @keyup.enter="addHoliday"
          />
          <button
            class="set-action"
            type="button"
            :disabled="!holidayDate || !holidayName.trim()"
            @click="addHoliday"
          >
            추가
          </button>
        </div>
      </div>
      <div v-if="holidayPreview.length" class="set-card">
        <div v-for="row in holidayPreview" :key="row.date" class="set-row">
          <div class="set-copy">
            <strong>{{ row.name }}</strong>
            <span class="set-sub tabular">{{ formatHoliday(row.date) }}</span>
          </div>
          <button class="set-danger" type="button" :aria-label="`${row.name} 삭제`" @click="dropHoliday(row.date, row.name)">
            삭제
          </button>
        </div>
        <button v-if="holidayMore" class="set-row set-more" type="button" @click="holidayOpen = true">
          <span>더보기</span>
          <span class="set-more-meta">
            <span class="set-sub tabular">{{ holidayMore }}일</span>
            <Chevron dir="next" />
          </span>
        </button>
      </div>
    </section>

    <section v-if="me?.canManageUsers" class="set-group" aria-labelledby="set-log-title">
      <h3 id="set-log-title">로그 기록</h3>
      <div class="set-card">
        <button class="set-row set-nav" type="button" aria-label="로그 보기" @click="openLogs">
          <span>로그 보기</span>
          <span class="set-more-meta">
            <Chevron dir="next" />
          </span>
        </button>
      </div>
    </section>

    <section v-if="me?.canManageTotp" class="set-group" aria-labelledby="set-login-title">
      <h3 id="set-login-title">로그인</h3>
      <div class="set-card">
        <div class="set-row">
          <span id="totp-label" class="set-label">인증 앱</span>
          <button
            class="set-switch"
            type="button"
            role="switch"
            :aria-checked="Boolean(me.totpRequired)"
            aria-labelledby="totp-label"
            @click="toggleTotp"
          />
        </div>
      </div>
    </section>

    <section class="set-group" aria-labelledby="set-me-title">
      <h3 id="set-me-title">내 계정</h3>
      <div class="set-card">
        <button class="set-row set-out" type="button" @click="logout">로그아웃</button>
      </div>
      <p v-if="me?.email" class="set-foot">{{ me.email }}</p>
    </section>

    <Teleport to="body">
      <div v-if="holidayOpen" class="confirm-root" @mousedown.self="holidayOpen = false">
        <section
          ref="holidayCard"
          class="confirm-card picker-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="holiday-list-title"
        >
          <div class="picker-head">
            <button class="dialog-btn" type="button" aria-label="쉬는 날 닫기" @click="holidayOpen = false">닫기</button>
            <h2 id="holiday-list-title" class="title">쉬는 날</h2>
            <span class="picker-head-end" />
          </div>
          <div class="set-card set-holiday-list">
            <div v-for="row in sortedHolidays" :key="row.date" class="set-row">
              <div class="set-copy">
                <strong>{{ row.name }}</strong>
                <span class="set-sub tabular">{{ formatHoliday(row.date) }}</span>
              </div>
              <button
                class="set-danger"
                type="button"
                :aria-label="`${row.name} 삭제`"
                @click="dropHoliday(row.date, row.name)"
              >
                삭제
              </button>
            </div>
          </div>
        </section>
      </div>
    </Teleport>

    <FormDialog
      v-if="pairOpen"
      title="화면 연결"
      confirm-label="연결"
      :busy="pairBusy"
      @cancel="closePair"
      @confirm="confirmPair"
    >
      <label class="form-field">
        <span class="caption">화면 코드</span>
        <span class="field-shell">
          <input
            id="pair-code"
            v-model="pairCode"
            class="field"
            inputmode="numeric"
            maxlength="6"
            autocomplete="off"
            enterkeyhint="done"
            aria-label="화면 코드 6자리"
            placeholder="6자리"
            @input="pairCode = pairCode.replace(/\D/g, '').slice(0, 6)"
          />
        </span>
      </label>
    </FormDialog>
  </main>
</template>
