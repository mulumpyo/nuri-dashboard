import { computed, onUnmounted, ref, watch } from "vue";
import type { BoardDay, BoardResponse, Carrier, PayType } from "@nuri/shared";
import { carrierNeedsTime, nextShipTime, PAY_TYPE_LABEL, PAY_TYPES } from "@nuri/shared";
import { api, isUnauthorized } from "../api";
import { boardTitle as titleForDay, composeLabel as dockLabel } from "./board-copy";
import { usePrompt, useToast } from "./chrome";
import { holidayDates, loadHolidays } from "./home-holidays";

const loaders = new Set<() => Promise<boolean>>();

export const registerBoardLoader = (load: () => Promise<boolean>) => {
  loaders.add(load);
  return () => {
    loaders.delete(load);
  };
};

export const reloadHomeBoard = async () => {
  let ok = false;
  for (const load of loaders) {
    if (await load()) ok = true;
  }
  return ok;
};

export const useHomeBoard = (onGone: () => Promise<unknown>) => {
  const { say } = useToast();
  const { ask } = usePrompt();
  const board = ref<BoardResponse | null>(null);
  const carriers = ref<Carrier[]>([]);
  const date = ref("");
  const from = ref("");
  const carrierId = ref("");
  const company = ref<{ id: string; name: string } | null>(null);
  const pickerOpen = ref(false);
  const payType = ref<PayType>("prepaid");
  const shipTime = ref("");
  const busy = ref(false);

  const selectedCarrier = computed(() => carriers.value.find((row) => row.id === carrierId.value));
  const needsTime = computed(() => carrierNeedsTime(selectedCarrier.value?.name ?? ""));

  const selectedDay = (): BoardDay | undefined => board.value?.days.find((day) => day.date === date.value);
  const activeDay = computed(() => selectedDay());
  const dayIndex = computed(() => board.value?.days.findIndex((day) => day.date === date.value) ?? -1);
  const canPrevDay = computed(() => dayIndex.value > 0);
  const canNextDay = computed(() => {
    const days = board.value?.days ?? [];
    return dayIndex.value >= 0 && dayIndex.value < days.length - 1;
  });
  const hasRows = computed(
    () => activeDay.value?.carriers.some((group) => group.companies.length) ?? false,
  );
  const boardTitle = computed(() => titleForDay(activeDay.value));
  const composeLabel = computed(() => {
    const day = selectedDay();
    return dockLabel({
      dayText: day?.label ?? (date.value ? date.value.slice(5) : ""),
      company: company.value?.name,
      carrier: selectedCarrier.value?.name,
      payType: payType.value,
      time: needsTime.value && shipTime.value ? shipTime.value : "",
    });
  });

  const accept = (nextBoard: BoardResponse, nextCarriers: Carrier[]) => {
    board.value = nextBoard;
    carriers.value = nextCarriers.filter((row) => row.active);
    if (!date.value || !nextBoard.days.some((day) => day.date === date.value)) {
      date.value = nextBoard.days[0]?.date ?? "";
    }
    if (!carrierId.value || !carriers.value.some((row) => row.id === carrierId.value)) {
      carrierId.value = carriers.value[0]?.id ?? "";
    }
    if (needsTime.value && !shipTime.value) shipTime.value = nextShipTime();
  };

  const load = async () => {
    try {
      const [nextBoard, nextCarriers] = await Promise.all([
        api.get<BoardResponse>(`/api/shipments/board${from.value ? `?from=${from.value}` : ""}`),
        api.get<Carrier[]>("/api/carriers"),
        loadHolidays(),
      ]);
      accept(nextBoard, nextCarriers);
      return true;
    } catch (err) {
      if (isUnauthorized(err)) await onGone();
      else say(err instanceof Error ? err.message : "보드를 불러오지 못했어요");
      return false;
    }
  };
  onUnmounted(registerBoardLoader(load));

  const canAdd = computed(
    () => Boolean(company.value && carrierId.value && (!needsTime.value || shipTime.value) && !busy.value),
  );

  const save = async () => {
    const target = company.value;
    if (!canAdd.value || !target) {
      if (!company.value) say("업체를 골라 주세요");
      else if (!carrierId.value) say("택배사를 골라 주세요");
      else if (needsTime.value && !shipTime.value) say("퀵발송은 시간을 골라 주세요");
      return;
    }
    busy.value = true;
    try {
      await api.post("/api/shipments", {
        companyId: target.id,
        companyName: target.name,
        carrierId: carrierId.value,
        shipDate: date.value,
        boxCount: 1,
        payType: payType.value,
        ...(needsTime.value ? { shipTime: shipTime.value } : {}),
      });
      say("추가했어요");
      company.value = null;
      if (!board.value?.days.some((day) => day.date === date.value)) from.value = date.value;
      await load();
    } catch (err) {
      say(err instanceof Error ? err.message : "다시 시도해 주세요");
    } finally {
      busy.value = false;
    }
  };

  const pickCompany = (row: { id: string; name: string }) => {
    company.value = row;
  };

  const patch = async (id: string, boxCount: number) => {
    if (boxCount < 1) return;
    try {
      await api.patch(`/api/shipments/${id}`, { boxCount });
      await load();
    } catch (err) {
      say(err instanceof Error ? err.message : "다시 시도해 주세요");
    }
  };

  const patchPay = async (id: string, current: PayType | undefined, next: PayType) => {
    if ((current ?? "prepaid") === next) return;
    try {
      await api.patch(`/api/shipments/${id}`, { payType: next });
      await load();
    } catch (err) {
      say(err instanceof Error ? err.message : "다시 시도해 주세요");
    }
  };

  const patchTime = async (id: string, next: string) => {
    if (!next) return;
    try {
      await api.patch(`/api/shipments/${id}`, { shipTime: next });
      await load();
    } catch (err) {
      say(err instanceof Error ? err.message : "다시 시도해 주세요");
    }
  };

  const remove = (id: string, name: string) => {
    ask({
      title: "이 발송을 삭제할까요?",
      message: `${name} 기록이 목록에서 사라져요.`,
      done: "삭제했어요",
      run: async () => {
        await api.del(`/api/shipments/${id}`);
        await load();
      },
    });
  };

  const look = (value: string) => {
    from.value = value;
    void load();
  };

  const pickDay = (value: string) => {
    date.value = value;
    if (!board.value?.days.some((day) => day.date === value)) look(value);
  };

  const stepDay = (dir: -1 | 1) => {
    const days = board.value?.days ?? [];
    const next = days[dayIndex.value + dir];
    if (!next) return;
    date.value = next.date;
  };

  watch(needsTime, (on) => {
    if (on && !shipTime.value) shipTime.value = nextShipTime();
  });

  watch(
    boardTitle,
    (title) => {
      document.title = `누리디에스엠 | ${title}`;
    },
    { immediate: true },
  );

  return {
    board,
    carriers,
    date,
    carrierId,
    company,
    pickerOpen,
    payType,
    shipTime,
    needsTime,
    PAY_TYPES,
    PAY_TYPE_LABEL,
    carrierNeedsTime,
    hasRows,
    boardTitle,
    activeDay,
    canPrevDay,
    canNextDay,
    composeLabel,
    canAdd,
    holidayDates,
    load,
    save,
    pickCompany,
    patch,
    patchPay,
    patchTime,
    remove,
    look,
    pickDay,
    stepDay,
  };
};
