import { PAIRING_TTL_SEC } from "../domain/constants";
import { DevicesService } from "./devices.service";

describe("DevicesService", () => {
  const repo = { create: jest.fn(), list: jest.fn(), revoke: jest.fn() };
  const tokens = {
    createCode: jest.fn(),
    savePairing: jest.fn(),
    getPairing: jest.fn(),
    dropPairing: jest.fn(),
    dropDevice: jest.fn(),
  };
  const auth = { issuePair: jest.fn() };
  const events = { publish: jest.fn() };
  const service = () => new DevicesService(repo as never, tokens as never, auth as never, events as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("issues a 6-digit pairing code", async () => {
    tokens.createCode.mockReturnValue("123456");
    await expect(service().requestCode()).resolves.toEqual({ code: "123456", expiresIn: PAIRING_TTL_SEC });
    expect(tokens.savePairing).toHaveBeenCalledWith("123456", expect.stringContaining("pending"), PAIRING_TTL_SEC);
  });

  it("does not claim before approve", async () => {
    tokens.getPairing.mockResolvedValue(JSON.stringify({ status: "pending" }));
    await expect(service().claim("123456", {} as never, "http://x")).rejects.toMatchObject({ code: "PAIR_PENDING" });
    expect(auth.issuePair).not.toHaveBeenCalled();
  });

  it("revokes and tells the board", async () => {
    repo.revoke.mockResolvedValue({ id: "d1" });
    await expect(service().revoke("d1")).resolves.toEqual({ status: "ok" });
    expect(tokens.dropDevice).toHaveBeenCalledWith("d1");
    expect(events.publish).toHaveBeenCalledWith({ type: "device.revoked", deviceId: "d1" });
  });
});
