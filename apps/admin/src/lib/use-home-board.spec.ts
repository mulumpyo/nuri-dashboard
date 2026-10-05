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

  it("picks a company without posting", async () => {
    const home = run();
    await home.load();
    home.pickCompany({ id: "co1", name: "한빛" });
    expect(home.company.value?.name).toBe("한빛");
    expect(home.canAdd.value).toBe(true);
    expect(api.post).not.toHaveBeenCalled();
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
    }));
  });
});
