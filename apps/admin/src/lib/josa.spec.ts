import { describe, expect, it } from "vitest";
import { withJosa } from "./josa";

describe("withJosa", () => {
  it("picks 을 when the last syllable has a batchim", () => {
    expect(withJosa("한진", "을", "를")).toBe("한진을");
  });

  it("picks 를 when the last syllable is open", () => {
    expect(withJosa("로젠택배", "을", "를")).toBe("로젠택배를");
  });
});
