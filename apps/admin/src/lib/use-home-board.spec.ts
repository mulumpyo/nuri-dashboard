import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const say = vi.hoisted(() => vi.fn());

vi.mock("../api", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
  isUnauthorized: () => false,
}));
vi.mock("./chrome", () => ({
  useToast: () => ({ say }),
  usePrompt: () => ({ ask: vi.fn() }),
}));
vi.mock("./home-holidays", () => ({
  holidayDates: { value: [] },
  loadHolidays: vi.fn().mockResolvedValue([]),
}));

import { api } from "../api";
import { useHomeBoard } from "./use-home-board";

const board = {
  days: [
    {
      date: "2026-10-03",
      label: "오늘",
      isToday: true,
      carriers: [{ carrierId: "c1", name: "한진", companies: [] }],
    },
  ],
};

describe("useHomeBoard", () => {
  beforeEach(() => {
    say.mockReset();
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.get).mockImplementation(async (path: string) => {
      if (path.includes("/shipments/board")) return board;
      if (path.includes("/carriers")) return [{ id: "c1", name: "한진", active: true }];
      return [];
    });
  });

  const run = () => {
    let home!: ReturnType<typeof useHomeBoard>;
    mount(
      defineComponent({
        setup() {
          home = useHomeBoard(async () => undefined);
          return () => null;
        },
      }),
    );
    return home;
  };

  it("pins 경기택배 first and selects it", async () => {
    vi.mocked(api.get).mockImplementation(async (path: string) => {
      if (path.includes("/shipments/board")) return board;
      if (path.includes("/carriers")) {
        return [
          { id: "cj", name: "CJ", active: true },
          { id: "qk", name: "퀵발송", active: true },
          { id: "gg", name: "경기택배", active: true },
        ];
      }
      return [];
    });
    const home = run();
    await home.load();
    expect(home.carriers.value.map((row) => row.name)).toEqual(["경기택배", "CJ", "퀵발송"]);
    expect(home.carrierId.value).toBe("gg");
  });

  it("picks a company without posting", async () => {
    const home = run();
    await home.load();
    home.pickCompany({ id: "co1", name: "한빛" });
    expect(home.company.value?.name).toBe("한빛");
    expect(home.canAdd.value).toBe(true);
    expect(api.post).not.toHaveBeenCalled();
  });

  it("steps past the loaded board window", async () => {
    const home = run();
    await home.load();
    expect(home.date.value).toBe("2026-10-03");
    expect(home.canNextDay.value).toBe(true);
    home.stepDay(1);
    expect(home.date.value).toBe("2026-10-05");
    expect(vi.mocked(api.get).mock.calls.some(([path]) => String(path).includes("from=2026-10-05"))).toBe(true);
  });

  it("registers only after save", async () => {
    const home = run();
    await home.load();
    await home.save();
    expect(say).toHaveBeenCalledWith("업체를 골라 주세요");
    expect(api.post).not.toHaveBeenCalled();
    home.pickCompany({ id: "co1", name: "한빛" });
    await home.save();
    expect(api.post).toHaveBeenCalledWith("/api/shipments", expect.objectContaining({
      companyId: "co1",
      companyName: "한빛",
      carrierId: "c1",
      payType: "prepaid",
      note: "",
    }));
  });

  it("registers 퀵발송 without a time and sends a memo", async () => {
    vi.mocked(api.get).mockImplementation(async (path: string) => {
      if (path.includes("/shipments/board")) return board;
      if (path.includes("/carriers")) return [{ id: "q1", name: "퀵발송", active: true }];
      return [];
    });
    const home = run();
    await home.load();
    home.pickCompany({ id: "co1", name: "한빛" });
    home.note.value = "7일건";
    expect(home.needsTime.value).toBe(true);
    expect(home.shipTime.value).toBe("");
    expect(home.canAdd.value).toBe(true);
    await home.save();
    expect(api.post).toHaveBeenCalledWith("/api/shipments", expect.objectContaining({
      carrierId: "q1",
      note: "7일건",
    }));
    expect(vi.mocked(api.post).mock.calls[0]?.[1]).not.toHaveProperty("shipTime");
    expect(home.note.value).toBe("");
  });

  it("saves a memo from the card and toasts a merge", async () => {
    vi.mocked(api.patch).mockReset();
    vi.mocked(api.patch).mockResolvedValueOnce({ id: "s9" });
    const home = run();
    await home.load();
    home.editNote({ shipmentId: "s1", name: "한빛", note: "7일건" });
    expect(home.noteForm.value?.from).toBe("7일건");
    home.noteDraft.value = "추가발송건";
    await home.saveNote();
    expect(api.patch).toHaveBeenCalledWith("/api/shipments/s1", { note: "추가발송건" });
    expect(say).toHaveBeenCalledWith("같은 메모가 있어 수량을 합쳤어요");
    expect(home.noteForm.value).toBeNull();
  });

  it("skips a memo write when the text did not change", async () => {
    vi.mocked(api.patch).mockReset();
    const home = run();
    await home.load();
    home.editNote({ shipmentId: "s1", name: "한빛", note: "7일건" });
    home.noteDraft.value = " 7일건 ";
    await home.saveNote();
    expect(api.patch).not.toHaveBeenCalled();
    expect(home.noteForm.value).toBeNull();
  });
});
