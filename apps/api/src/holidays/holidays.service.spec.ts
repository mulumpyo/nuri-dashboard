import { HolidaysService, restDaysOf, restDeInfoUrl, serviceKeyOf } from "./holidays.service";

describe("HolidaysService", () => {
  const config = { get: jest.fn().mockReturnValue("key") };

  it("decodes a portal encoding key once", () => {
    expect(serviceKeyOf("abc%2Fxyz%3D%3D")).toBe("abc/xyz==");
    expect(serviceKeyOf("abc/xyz==")).toBe("abc/xyz==");
    const href = restDeInfoUrl("abc%2Fxyz%3D%3D", 2026, 1).href;
    expect(href).toContain("serviceKey=abc%2Fxyz%3D%3D");
    expect(href).not.toContain("%252F");
  });

  it("keeps only official rest days", () => {
    expect(
      restDaysOf({
        response: {
          body: {
            items: {
              item: [
                { locdate: 20261003, dateName: "개천절", isHoliday: "Y" },
                { locdate: 20260717, dateName: "제헌절", isHoliday: "N" },
              ],
            },
          },
        },
      }),
    ).toEqual([{ date: "2026-10-03", name: "개천절" }]);
  });

  it("degrades when the holiday API throws", async () => {
    const repo = { upsertApi: jest.fn() };
    const service = new HolidaysService(repo as never, config as never);
    jest.spyOn(service, "fetchYear").mockRejectedValue(new Error("timeout"));
    const result = await service.sync();
    expect(result.status).toBe("degraded");
    expect(service.status().message).toMatch(/캐시/);
    expect(repo.upsertApi).not.toHaveBeenCalled();
  });

  it("stores api rows when the holiday API succeeds", async () => {
    const repo = { upsertApi: jest.fn().mockResolvedValue({}) };
    const service = new HolidaysService(repo as never, config as never);
    jest.spyOn(service, "fetchYear").mockResolvedValue([{ date: "2026-10-03", name: "개천절" }]);
    const result = await service.sync();
    expect(result.status).toBe("ok");
    expect(result.count).toBe(1);
    expect(repo.upsertApi).toHaveBeenCalledWith({ date: "2026-10-03", name: "개천절", source: "api" });
  });

  it("fetches rest days and rejects xml or bad keys", async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            response: {
              header: { resultCode: "00" },
              body: { items: { item: [{ locdate: 20261003, dateName: "개천절", isHoliday: "Y" }] }, totalCount: 1 },
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ response: { header: { resultCode: "30" }, body: {} } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "<OpenAPI_ServiceResponse/>",
      });
    const prev = global.fetch;
    global.fetch = fetchMock as typeof fetch;
    const service = new HolidaysService({} as never, { get: () => "abc%2Fxyz%3D%3D" } as never);
    await expect(service.fetchYear(2026)).resolves.toEqual([{ date: "2026-10-03", name: "개천절" }]);
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain("%252F");
    await expect(service.fetchYear(2026)).rejects.toThrow("holiday api failed");
    await expect(service.fetchYear(2026)).rejects.toThrow("holiday api failed");
    global.fetch = prev;
  });

  it("walks rest-day pages with pageNo", async () => {
    const page = (no: number, total: number, locdate: number, name: string) => ({
      ok: true,
      text: async () =>
        JSON.stringify({
          response: {
            header: { resultCode: "00" },
            body: { items: { item: [{ locdate, dateName: name, isHoliday: "Y" }] }, totalCount: total },
          },
        }),
    });
    const fetchMock = jest.fn().mockResolvedValueOnce(page(1, 101, 20260101, "신정")).mockResolvedValueOnce(page(2, 101, 20261003, "개천절"));
    const prev = global.fetch;
    global.fetch = fetchMock as typeof fetch;
    const service = new HolidaysService({} as never, { get: () => "key" } as never);
    await expect(service.fetchYear(2026)).resolves.toEqual([
      { date: "2026-01-01", name: "신정" },
      { date: "2026-10-03", name: "개천절" },
    ]);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("pageNo=1");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("pageNo=2");
    global.fetch = prev;
  });

  it("skips the network when the service key is empty", async () => {
    const repo = { upsertApi: jest.fn() };
    const empty = { get: jest.fn().mockReturnValue("") };
    const service = new HolidaysService(repo as never, empty as never);
    await expect(service.fetchYear(2026)).rejects.toThrow("HOLIDAY_KEY_MISSING");
    const result = await service.sync();
    expect(result.status).toBe("degraded");
    expect(result.message).toMatch(/키/);
    expect(repo.upsertApi).not.toHaveBeenCalled();
  });
});
