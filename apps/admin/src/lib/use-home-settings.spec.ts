import { beforeEach, describe, expect, it, vi } from "vitest";

const say = vi.hoisted(() => vi.fn());

vi.mock("../api", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}));
vi.mock("./chrome", () => ({
  useToast: () => ({ say }),
  usePrompt: () => ({ ask: vi.fn() }),
}));
vi.mock("./home-holidays", () => ({
  holidays: { value: [] },
  holidayDates: { value: [] },
  loadHolidays: vi.fn().mockResolvedValue([]),
}));
vi.mock("./session", () => ({
  me: { value: { canManageTotp: true, totpRequired: false, kind: "admin" } },
  loadMe: vi.fn(),
}));
vi.mock("./use-home-board", () => ({
  reloadHomeBoard: vi.fn(),
}));

import { api } from "../api";
import { useHomeSettings } from "./use-home-settings";

describe("useHomeSettings", () => {
  beforeEach(() => {
    say.mockReset();
    vi.mocked(api.post).mockReset();
  });

  it("toasts when adding a holiday fails", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("막혔어요"));
    const settings = useHomeSettings();
    settings.holidayDate.value = "2026-10-09";
    settings.holidayName.value = "창립";
    await settings.addHoliday();
    expect(say).toHaveBeenCalledWith("막혔어요");
  });

  it("toasts when holiday sync fails", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("가져오지 못했어요"));
    const settings = useHomeSettings();
    await settings.syncHolidays();
    expect(say).toHaveBeenCalledWith("가져오지 못했어요");
  });
});
