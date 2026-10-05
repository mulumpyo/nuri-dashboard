import { CompaniesService } from "./companies.service";

describe("CompaniesService", () => {
  const repo = {
    findByName: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    list: jest.fn(),
  };
  const events = { publish: jest.fn() };
  const service = () => new CompaniesService(repo as never, events as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("refuses a duplicate name", async () => {
    repo.findByName.mockResolvedValue({ id: "c1", name: "한빛" });
    await expect(service().create("한빛")).rejects.toMatchObject({ code: "COMPANY_EXISTS" });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("renames and tells the board", async () => {
    repo.findByName.mockResolvedValue(null);
    repo.update.mockResolvedValue({ id: "c1", name: "한빛물류" });
    await expect(service().update("c1", "한빛물류")).resolves.toEqual({ id: "c1", name: "한빛물류" });
    expect(events.publish).toHaveBeenCalledWith({ type: "shipment.changed" });
  });

  it("asks for ids before bulk delete", async () => {
    await expect(service().removeMany([])).rejects.toMatchObject({ code: "COMPANY_IDS_REQUIRED" });
  });

  it("sends only the clamped page to the repo", async () => {
    repo.list.mockResolvedValue({ items: [], page: 1, pages: 1, total: 0, limit: 20 });
    await service().list("한빛", 0, 80);
    expect(repo.list).toHaveBeenCalledWith("한빛", 1, 50);
  });
});
