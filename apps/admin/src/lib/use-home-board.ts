import { computed, onUnmounted, ref, watch } from "vue";
import type { BoardDay, BoardResponse, Carrier, PayType } from "@nuri/shared";
import { carrierNeedsTime, LEAD_CARRIER, PAY_TYPE_LABEL, PAY_TYPES, pinLeadCarrier } from "@nuri/shared";
import { api, isUnauthorized } from "../api";
import { boardTitle as titleForDay, composeLabel as dockLabel } from "./board-copy";
import { usePrompt, useToast } from "./chrome";
import { kstToday, shiftBusinessDay } from "./day";
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
  const note = ref("");
  const noteForm = ref<{ id: string; name: string; from: string } | null>(null);
  const noteDraft = ref("");
  const noteBusy = ref(false);
  const busy = ref(false);

  const selectedCarrier = computed(() => carriers.value.find((row) => row.id === carrierId.value));
  const needsTime = computed(() => carrierNeedsTime(selectedCarrier.value?.name ?? ""));

  const selectedDay = (): BoardDay | undefined => board.value?.days.find((day) => day.date === date.value);
  const activeDay = computed(() => selectedDay());
  const canPrevDay = computed(() => {
    if (!date.value) return false;
    const prev = shiftBusinessDay(date.value, -1, holidayDates.value);
    return Boolean(prev && prev >= kstToday());
  });
  const canNextDay = computed(() => Boolean(date.value && shiftBusinessDay(date.value, 1, holidayDates.value)));
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
      note: note.value,
    });
  });

  const accept = (nextBoard: BoardResponse, nextCarriers: Carrier[]) => {
    board.value = nextBoard;
    carriers.value = pinLeadCarrier(nextCarriers.filter((row) => row.active));
    if (!date.value || !nextBoard.days.some((day) => day.date === date.value)) {
      date.value = nextBoard.days[0]?.date ?? "";
    }
    if (!carrierId.value || !carriers.value.some((row) => row.id === carrierId.value)) {
      carrierId.value =
        carriers.value.find((row) => row.name === LEAD_CARRIER)?.id ?? carriers.value[0]?.id ?? "";
    }
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

  const canAdd = computed(() => Boolean(company.value && carrierId.value && !busy.value));

  const save = async () => {
    const target = company.value;
    if (!canAdd.value || !target) {
      if (!company.value) say("업체를 골라 주세요");
      else if (!carrierId.value) say("택배사를 골라 주세요");
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
        note: note.value.trim(),
        ...(needsTime.value && shipTime.value ? { shipTime: shipTime.value } : {}),
      });
      say("추가했어요");
      company.value = null;
      note.value = "";
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

  const editNote = (row: { shipmentId: string; name: string; note?: string }) => {
    const from = row.note ?? "";
    noteForm.value = { id: row.shipmentId, name: row.name, from };
    noteDraft.value = from;
  };

  const closeNote = () => {
    if (noteBusy.value) return;
    noteForm.value = null;
  };

  const saveNote = async () => {
    const form = noteForm.value;
    if (!form || noteBusy.value) return;
    const next = noteDraft.value.trim().slice(0, 40);
    if (next === form.from) {
      noteForm.value = null;
      return;
    }
    noteBusy.value = true;
    try {
      const saved = await api.patch<{ id: string }>(`/api/shipments/${form.id}`, { note: next });
      if (saved.id !== form.id) say("같은 메모가 있어 수량을 합쳤어요");
      noteForm.value = null;
      await load();
    } catch (err) {
      say(err instanceof Error ? err.message : "다시 시도해 주세요");
    } finally {
      noteBusy.value = false;
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
    if (!date.value) return;
    const next = shiftBusinessDay(date.value, dir, holidayDates.value);
    if (!next) return;
    if (dir < 0 && next < kstToday()) return;
    pickDay(next);
  };

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
    note,
    noteForm,
    noteDraft,
    noteBusy,
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
    editNote,
    closeNote,
    saveNote,
    remove,
    look,
    pickDay,
    stepDay,
  };
};
