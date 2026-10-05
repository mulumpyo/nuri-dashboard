import { OPENAPI_OPS } from "./openapi";

describe("OPENAPI_OPS", () => {
  it("lists unique snake_case operation ids", () => {
    expect(new Set(OPENAPI_OPS).size).toBe(OPENAPI_OPS.length);
    expect(OPENAPI_OPS.every((id) => /^[a-z]+_[a-z_]+$/.test(id))).toBe(true);
  });
});
