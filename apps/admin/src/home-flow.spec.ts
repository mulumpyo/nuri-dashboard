import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
  isUnauthorized: () => false,
}));
vi.mock("@nuri/shared/sse", () => ({
  connectEvents: () => () => undefined,
}));

import { api } from "./api";
import HomeView from "./views/HomeView.vue";
import { resetHolidays } from "./lib/home-holidays";

const board = {
  days: [
    {
      date: "2026-10-03",
      label: "오늘",
      isToday: true,
      carriers: [
        {
          carrierId: "c1",
          name: "한진",
          companies: [{ shipmentId: "s1", name: "한빛", boxCount: 1, payType: "prepaid" as const }],
        },
      ],
    },
  ],
};

describe("home register flow", () => {
  beforeEach(() => {
    resetHolidays();
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.get).mockImplementation(async (path: string) => {
      if (path.includes("/shipments/board")) return board;
      if (path.includes("/carriers")) return [{ id: "c1", name: "한진", active: true }];
      if (path.includes("/holidays")) return [];
      return [];
    });
    vi.mocked(api.post).mockResolvedValue({ id: "s2" });
  });

  it("keeps register disabled until a company is picked, then posts", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/", component: HomeView }],
    });
    await router.push("/");
    await router.isReady();
    const home = mount(HomeView, { global: { plugins: [router] } });
    await flushPromises();
    const add = home.get("[aria-label='발송 등록']");
    expect((add.element as HTMLButtonElement).disabled).toBe(true);
    await add.trigger("click");
    expect(api.post).not.toHaveBeenCalled();

    const pick = home.getComponent({ name: "CompanyPicker" });
    pick.vm.$emit("pick", { id: "co1", name: "한빛" });
    await flushPromises();
    expect((home.get("[aria-label='발송 등록']").element as HTMLButtonElement).disabled).toBe(false);
    await home.get("[aria-label='발송 등록']").trigger("click");
    await flushPromises();
    expect(api.post).toHaveBeenCalledWith("/api/shipments", expect.objectContaining({
      companyId: "co1",
      companyName: "한빛",
    }));
    home.unmount();
  });

  it("lets a phone fold the register form", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: String(query).includes("max-width"),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/", component: HomeView }],
    });
    await router.push("/");
    await router.isReady();
    const home = mount(HomeView, { global: { plugins: [router] } });
    await flushPromises();
    const fold = home.get("[aria-controls='dock-fields']");
    expect(fold.attributes("aria-expanded")).toBe("true");
    expect(fold.text()).toContain("접기");
    expect(home.get("[aria-label='발송 등록']").exists()).toBe(true);
    await fold.trigger("click");
    expect(fold.attributes("aria-expanded")).toBe("false");
    expect(fold.text()).toContain("발송 등록");
    expect(fold.text()).toContain("펼치기");
    expect(home.find("[aria-label='발송 등록']").exists()).toBe(false);
    home.unmount();
    vi.unstubAllGlobals();
  });
});
