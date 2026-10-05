import { computed, ref } from "vue";
import type { HolidaySync } from "@nuri/shared";
import { api } from "../api";
import { parseDay } from "./day";
import { usePrompt, useToast } from "./chrome";
import { holidays, holidayDates, loadHolidays } from "./home-holidays";
import { loadMe, me } from "./session";
import { reloadHomeBoard } from "./use-home-board";
import type { Device, HomeMe } from "./home-types";

export const useHomeSettings = () => {
  const { say } = useToast();
  const { ask } = usePrompt();
  const pairCode = ref("");
  const pairBusy = ref(false);
  const holidaySync = ref<HolidaySync | null>(null);
  const holidayDate = ref("");
  const holidayName = ref("");
  const holidayPeek = 4;
  const devices = ref<Device[]>([]);

  const sortedHolidays = computed(() =>
    [...holidays.value].sort((a, b) => a.date.localeCompare(b.date)),
  );
  const holidayPreview = computed(() => sortedHolidays.value.slice(0, holidayPeek));
  const holidayMore = computed(() => Math.max(0, sortedHolidays.value.length - holidayPeek));

  const load = async () => {
    try {
      const session = me.value ?? (await loadMe());
      if (!session || session.kind === "device") return false;
      await loadHolidays();
      return true;
    } catch {
      return false;
    }
  };

  const loadSettings = async () => {
    try {
      const [, sync, list] = await Promise.all([
        loadHolidays(true),
        api.get<HolidaySync>("/api/holidays/status"),
        api.get<Device[]>("/api/devices"),
      ]);
      holidaySync.value = sync;
      devices.value = list.filter((row) => !row.revokedAt);
    } catch (err) {
      say(err instanceof Error ? err.message : "설정을 불러오지 못했어요");
    }
  };

  const approve = async () => {
    const code = pairCode.value.replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) {
      say("화면 코드 6자리를 넣어 주세요");
      return false;
    }
    if (pairBusy.value) return false;
    pairBusy.value = true;
    try {
      await api.post("/api/devices/approve", { code });
      pairCode.value = "";
      say("디스플레이를 연결했어요");
      await loadSettings();
      return true;
    } catch (err) {
      say(err instanceof Error ? err.message : "코드를 다시 확인해 주세요");
      return false;
    } finally {
      pairBusy.value = false;
    }
  };

  const revoke = (id: string, name: string) => {
    ask({
      title: "연결을 끊을까요?",
      message: `${name} 화면은 다시 승인해야 볼 수 있어요.`,
      confirmLabel: "끊기",
      done: "연결을 끊었어요",
      run: async () => {
        await api.post(`/api/devices/${id}/revoke`);
        await loadSettings();
      },
    });
  };

  const addHoliday = async () => {
    if (!holidayDate.value || !holidayName.value.trim()) return;
    const date = holidayDate.value;
    try {
      await api.post("/api/holidays", { date, name: holidayName.value });
      holidayDate.value = "";
      holidayName.value = "";
      await loadSettings();
      await reloadHomeBoard();
      say("공휴일을 추가했어요");
    } catch (err) {
      say(err instanceof Error ? err.message : "공휴일을 넣지 못했어요");
    }
  };

  const dropHoliday = (day: string, name: string) => {
    ask({
      title: "공휴일을 삭제할까요?",
      message: `${day} ${name}이 달력에서 빠져요.`,
      done: "삭제했어요",
      run: async () => {
        await api.del(`/api/holidays/${day}`);
        await loadSettings();
        await reloadHomeBoard();
      },
    });
  };

  const syncHolidays = async () => {
    try {
      const result = await api.post<HolidaySync>("/api/holidays/sync");
      holidaySync.value = result;
      await loadSettings();
      await reloadHomeBoard();
      if (result.status === "degraded") {
        say(result.message ?? "가져오지 못했어요");
        return;
      }
      say(result.count ? `${result.count}일을 가져왔어요` : "가져왔어요");
    } catch (err) {
      say(err instanceof Error ? err.message : "가져오지 못했어요");
    }
  };

  const toggleTotp = async () => {
    if (!me.value?.canManageTotp) return;
    try {
      const saved = await api.patch<Pick<HomeMe, "totpRequired" | "canManageTotp">>("/api/auth/security", {
        totpRequired: !me.value.totpRequired,
      });
      me.value = { ...me.value, totpRequired: saved.totpRequired, canManageTotp: saved.canManageTotp };
      say(saved.totpRequired ? "이제 인증 앱으로 로그인해요" : "이제 비밀번호로 로그인해요");
    } catch (err) {
      say(err instanceof Error ? err.message : "설정을 바꾸지 못했어요");
    }
  };

  const formatHoliday = (value: string) =>
    new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(parseDay(value));

  return {
    me,
    pairCode,
    pairBusy,
    holidays,
    sortedHolidays,
    holidayPreview,
    holidayMore,
    holidaySync,
    holidayDate,
    holidayName,
    devices,
    holidayDates,
    load,
    loadSettings,
    approve,
    revoke,
    addHoliday,
    dropHoliday,
    syncHolidays,
    toggleTotp,
    formatHoliday,
  };
};
