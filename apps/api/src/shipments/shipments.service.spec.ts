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
    remove: jest.fn(),
    inRange: jest.fn(),
  };
  const carriers = { find: jest.fn(), list: jest.fn() };
  const holidays = { list: jest.fn() };
  const events = { publish: jest.fn() };
  const service = () => new ShipmentsService(repo as never, carriers as never, holidays as never, events as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requires time for 퀵발송", async () => {
    carriers.find.mockResolvedValue({ id: "q", name: "서울퀵" });
    repo.findCompany.mockResolvedValue({ id: "c", name: "한빛" });
    await expect(
      service().add({ companyId: "c", carrierId: "q", shipDate: "2026-10-05", boxCount: 1 }),
    ).rejects.toMatchObject({ code: "TIME_REQUIRED" });
    expect(repo.increment).not.toHaveBeenCalled();
  });

  it("adds and tells the board", async () => {
    carriers.find.mockResolvedValue({ id: "cj", name: "대한통운" });
    repo.findCompany.mockResolvedValue({ id: "c", name: "한빛" });
    repo.increment.mockResolvedValue({ id: "s1", shipDate: "2026-10-05" });
    await service().add({ companyId: "c", carrierId: "cj", shipDate: "2026-10-05", boxCount: 1 });
    expect(events.publish).toHaveBeenCalledWith({ type: "shipment.changed", date: "2026-10-05", shipmentId: "s1" });
  });

  it("rejects a pay type that already exists that day", async () => {
    repo.find.mockResolvedValue({ id: "s1", payType: "prepaid", carrierId: "cj", shipDate: "2026-10-05" });
    repo.updatePayType.mockRejectedValue(new Error("unique"));
    await expect(service().patch("s1", { payType: "collect" })).rejects.toMatchObject({ code: "PAY_TYPE_EXISTS" });
  });

  it("marks tomorrow as today plus one", async () => {
    holidays.list.mockResolvedValue([]);
    carriers.list.mockResolvedValue([{ id: "cj", name: "대한통운", active: true }]);
    repo.inRange.mockResolvedValue([]);
    const board = await service().board();
    const today = kstDate();
    expect(board.days.find((day) => day.isToday)?.date).toBe(today);
    expect(board.days.find((day) => day.isTomorrow)?.date).toBe(addDays(today, 1));
  });
});
