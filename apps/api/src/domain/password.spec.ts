import { passwordIssue } from "@nuri/shared";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("accepts the same password and rejects a wrong one", async () => {
    const stored = await hashPassword("nuri-pass-1");
    expect(await verifyPassword("nuri-pass-1", stored)).toBe(true);
    expect(await verifyPassword("nuri-pass-2", stored)).toBe(false);
    expect(stored).toMatch(/^[a-f0-9]{32}:[a-f0-9]{64}$/);
  });

  it("explains mix rules in Korean", () => {
    expect(passwordIssue("1234567")).toBe("비밀번호는 8자 이상이어야 해요");
    expect(passwordIssue("abcdefgh")).toBe("문자와 숫자를 함께 넣어 주세요");
    expect(passwordIssue("nuri-pass-1")).toBe("");
  });
});
