import { pairingCode } from "./pairing";

describe("pairingCode", () => {
  it("makes a six-digit pin from crypto", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 40; i += 1) {
      const code = pairingCode();
      expect(code).toMatch(/^\d{6}$/);
      expect(Number(code)).toBeGreaterThanOrEqual(100000);
      expect(Number(code)).toBeLessThan(1000000);
      seen.add(code);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
