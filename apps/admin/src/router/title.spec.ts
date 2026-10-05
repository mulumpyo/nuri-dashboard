import { describe, expect, it } from "vitest";
import { pageTitle } from "../lib/title";

describe("admin page titles", () => {
  it("names each route for screen readers and tabs", () => {
    expect(pageTitle("/login")).toBe("누리디에스엠 | 로그인");
    expect(pageTitle("/invite/abc")).toBe("누리디에스엠 | 초대");
    expect(pageTitle("/recover/abc")).toBe("누리디에스엠 | 인증 복구");
    expect(pageTitle("/companies")).toBe("누리디에스엠 | 업체");
    expect(pageTitle("/carriers")).toBe("누리디에스엠 | 택배사");
    expect(pageTitle("/accounts")).toBe("누리디에스엠 | 계정");
    expect(pageTitle("/settings")).toBe("누리디에스엠 | 설정");
    expect(pageTitle("/settings/logs")).toBe("누리디에스엠 | 로그 기록");
    expect(pageTitle("/")).toBe("누리디에스엠 | 오늘 보낼 업체");
  });
});
