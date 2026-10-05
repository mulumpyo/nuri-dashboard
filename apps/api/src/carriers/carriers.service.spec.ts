import { CarriersService } from "./carriers.service";

describe("CarriersService", () => {
  const repo = { list: jest.fn(), find: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn() };
  const events = { publish: jest.fn() };
  const service = () => new CarriersService(repo as never, events as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("trims the name and tells the board", async () => {
    repo.create.mockResolvedValue({ id: "1", name: "한진" });
    await service().create({ name: " 한진 " });
    expect(repo.create).toHaveBeenCalledWith({ name: "한진", sortOrder: 99, active: true });
    expect(events.publish).toHaveBeenCalledWith({ type: "shipment.changed" });
  });

  it("refuses a missing update", async () => {
    repo.update.mockResolvedValue(undefined);
    await expect(service().update("x", { active: false })).rejects.toMatchObject({ code: "CARRIER_NOT_FOUND" });
  });

  it("refuses a missing delete", async () => {
    repo.remove.mockResolvedValue(undefined);
    await expect(service().remove("x")).rejects.toMatchObject({ code: "CARRIER_NOT_FOUND" });
  });
});
