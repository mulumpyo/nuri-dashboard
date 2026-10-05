import { describe, expect, it } from "vitest";
import { displaySlashTo } from "./display-slash";

describe("displaySlashTo", () => {
  it("sends /display to /display/", () => {
    expect(displaySlashTo("/display")).toBe("/display/");
    expect(displaySlashTo("/display?x=1")).toBe("/display/?x=1");
  });

  it("leaves slashed and other paths alone", () => {
    expect(displaySlashTo("/display/")).toBeNull();
    expect(displaySlashTo("/display/index.html")).toBeNull();
    expect(displaySlashTo("/")).toBeNull();
  });
});
