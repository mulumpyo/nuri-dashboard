import { addDays, kstDate } from "../domain/calendar";
import { ShipmentsService } from "./shipments.service";

describe("ShipmentsService", () => {
  const repo = {
    searchCompanies: jest.fn(),
    findCompany: jest.fn(),
    findCompanyByName: jest.fn(),
    increment: jest.fn(),
    updateCount: jest.fn(),
    find: jest.fn(),
    updatePayType: jest.fn(),
    updateShipTime: jest.fn(),
    updateNote: jest.fn(),
    remove: jest.fn(),
    inRange: jest.fn(),
  };
  const carriers = { find: jest.fn(), list: jest.fn() };
  const holidays = { list: jest.fn() };
  const events = { publish: jest.fn() };
  const service = () => new ShipmentsService(repo as never, carriers as never, holidays as never, events as never);

  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("lets 퀵발송 skip a time", async () => {
    carriers.find.mockResolvedValue({ id: "q", name: "서울퀵" });
    repo.findCompany.mockResolvedValue({ id: "c", name: "한빛" });
    repo.increment.mockResolvedValue({ id: "s1", shipDate: "2026-10-05" });
    await service().add({ companyId: "c", carrierId: "q", shipDate: "2026-10-05", boxCount: 1 });
    expect(repo.increment).toHaveBeenCalledWith(expect.objectContaining({ shipTime: null, note: "" }));
  });

  it("keeps different notes on separate rows", async () => {
    carriers.find.mockResolvedValue({ id: "cj", name: "CJ" });
    repo.findCompany.mockResolvedValue({ id: "c", name: "한빛" });
    repo.increment.mockResolvedValue({ id: "s2", shipDate: "2026-10-05" });
    await service().add({
      companyId: "c",
      carrierId: "cj",
      shipDate: "2026-10-05",
      boxCount: 1,
      note: " 추가발송건 ",
    });
    expect(repo.increment).toHaveBeenCalledWith(expect.objectContaining({ note: "추가발송건" }));
  });

  it("clips a memo to 40 letters", async () => {
    carriers.find.mockResolvedValue({ id: "cj", name: "CJ" });
    repo.findCompany.mockResolvedValue({ id: "c", name: "한빛" });
    repo.increment.mockResolvedValue({ id: "s3", shipDate: "2026-10-05" });
    await service().add({
      companyId: "c",
      carrierId: "cj",
      shipDate: "2026-10-05",
      boxCount: 1,
      note: "가".repeat(41),
    });
    expect(repo.increment).toHaveBeenCalledWith(expect.objectContaining({ note: "가".repeat(40) }));
  });

  it("adds and tells the board", async () => {
    carriers.find.mockResolvedValue({ id: "cj", name: "대한통운" });
    repo.findCompany.mockResolvedValue({ id: "c", name: "한빛" });
    repo.increment.mockResolvedValue({ id: "s1", shipDate: "2026-10-05" });
    await service().add({ companyId: "c", carrierId: "cj", shipDate: "2026-10-05", boxCount: 1 });
    expect(events.publish).toHaveBeenCalledWith({ type: "shipment.changed", date: "2026-10-05", shipmentId: "s1" });
  });

  it("renames a memo", async () => {
    repo.find.mockResolvedValue({ id: "s1", note: "7일건", shipDate: "2026-10-05" });
    repo.updateNote.mockResolvedValue({ id: "s1", note: "추가발송건", shipDate: "2026-10-05" });
    await service().patch("s1", { note: " 추가발송건 " });
    expect(repo.updateNote).toHaveBeenCalledWith("s1", "추가발송건");
  });

  it("skips a memo write when the text did not change", async () => {
    repo.find.mockResolvedValue({ id: "s1", note: "7일건", shipDate: "2026-10-05" });
    await service().patch("s1", { note: " 7일건 " });
    expect(repo.updateNote).not.toHaveBeenCalled();
  });

  it("rejects a pay type that already exists that day", async () => {
    repo.find.mockResolvedValue({ id: "s1", payType: "prepaid", carrierId: "cj", shipDate: "2026-10-05" });
    repo.updatePayType.mockRejectedValue(new Error("unique"));
    await expect(service().patch("s1", { payType: "collect" })).rejects.toMatchObject({ code: "PAY_TYPE_EXISTS" });
  });

  it("marks tomorrow as today plus one", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-10-07T12:00:00+09:00"));
    holidays.list.mockResolvedValue([]);
    carriers.list.mockResolvedValue([{ id: "cj", name: "대한통운", active: true }]);
    repo.inRange.mockResolvedValue([]);
    const board = await service().board();
    const today = kstDate();
    expect(today).toBe("2026-10-07");
    expect(board.days.find((day) => day.isToday)?.date).toBe(today);
    expect(board.days.find((day) => day.isTomorrow)?.date).toBe(addDays(today, 1));
  });

  it("puts 경기택배 first on the board", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-10-07T12:00:00+09:00"));
    holidays.list.mockResolvedValue([]);
    carriers.list.mockResolvedValue([
      { id: "cj", name: "CJ", active: true },
      { id: "qk", name: "퀵발송", active: true },
      { id: "gg", name: "경기택배", active: true },
    ]);
    repo.inRange.mockResolvedValue([]);
    const board = await service().board();
    expect(board.days[0]?.carriers.map((row) => row.name)).toEqual(["경기택배", "CJ", "퀵발송"]);
  });

  it("can treat another day as today", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-10-07T12:00:00+09:00"));
    holidays.list.mockResolvedValue([]);
    carriers.list.mockResolvedValue([{ id: "cj", name: "대한통운", active: true }]);
    repo.inRange.mockResolvedValue([]);
    const board = await service().board(undefined, "2026-10-08");
    expect(board.from).toBe("2026-10-08");
    expect(board.days.find((day) => day.isToday)?.date).toBe("2026-10-08");
    expect(board.days.find((day) => day.isTomorrow)?.date).toBe("2026-10-09");
    expect(board.days.find((day) => day.isToday)?.label).toBe("오늘");
  });
});
