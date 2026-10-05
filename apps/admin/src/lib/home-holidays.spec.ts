import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../api", () => ({
  api: { get: vi.fn() },
}));

import { api } from "../api";
import { holidays, loadHolidays, resetHolidays } from "./home-holidays";

describe("home holidays", () => {
  beforeEach(() => {
    resetHolidays();
    vi.mocked(api.get).mockReset();
  });

  it("fetches once when two callers load together", async () => {
    vi.mocked(api.get).mockResolvedValue([{ date: "2026-10-03", name: "개천절", source: "api" }]);
    const [a, b] = await Promise.all([loadHolidays(), loadHolidays()]);
    expect(a).toEqual(b);
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(holidays.value).toHaveLength(1);
    await loadHolidays();
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it("refetches when forced after a mutation", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce([{ date: "2026-10-03", name: "개천절", source: "api" }])
      .mockResolvedValueOnce([]);
    await loadHolidays();
    await loadHolidays(true);
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(holidays.value).toEqual([]);
  });
});
