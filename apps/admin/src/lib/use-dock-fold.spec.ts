import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dockFoldQuery, dockLandscapeQuery, useDockFold } from "./use-dock-fold";

const Harness = defineComponent({
  setup() {
    return useDockFold();
  },
  template: `<p>{{ foldable ? (folded ? "펼치기" : "접기") : "고정" }}</p><button type="button" @click="toggle">go</button>`,
});

const mockMedia = (state: { phone: boolean; landscape: boolean }) => {
  const listen = () => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    return {
      listeners,
      addEventListener: (_: string, fn: (event: MediaQueryListEvent) => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: (event: MediaQueryListEvent) => void) => listeners.delete(fn),
      notify(matches: boolean) {
        listeners.forEach((fn) => fn({ matches } as MediaQueryListEvent));
      },
    };
  };
  const width = { matches: state.phone, media: dockFoldQuery, ...listen() };
  const land = { matches: state.landscape, media: dockLandscapeQuery, ...listen() };
  vi.stubGlobal("matchMedia", (query: string) => (String(query).includes("orientation") ? land : width));
  return {
    turn(next: { phone?: boolean; landscape?: boolean }) {
      if (next.phone !== undefined) {
        width.matches = next.phone;
        width.notify(next.phone);
      }
      if (next.landscape !== undefined) {
        land.matches = next.landscape;
        land.notify(next.landscape);
      }
    },
  };
};

describe("useDockFold", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts folded in landscape and opens on toggle", async () => {
    mockMedia({ phone: true, landscape: true });
    const view = mount(Harness);
    await flushPromises();
    expect(view.get("p").text()).toBe("펼치기");
    await view.get("button").trigger("click");
    expect(view.get("p").text()).toBe("접기");
    view.unmount();
  });

  it("starts open in portrait and can fold", async () => {
    mockMedia({ phone: true, landscape: false });
    const view = mount(Harness);
    await flushPromises();
    expect(view.get("p").text()).toBe("접기");
    await view.get("button").trigger("click");
    expect(view.get("p").text()).toBe("펼치기");
    view.unmount();
  });

  it("stays fixed on a wide screen", async () => {
    mockMedia({ phone: false, landscape: false });
    const view = mount(Harness);
    await flushPromises();
    expect(view.get("p").text()).toBe("고정");
    await view.get("button").trigger("click");
    expect(view.get("p").text()).toBe("고정");
    view.unmount();
  });

  it("folds when the phone turns sideways", async () => {
    const media = mockMedia({ phone: true, landscape: false });
    const view = mount(Harness);
    await flushPromises();
    expect(view.get("p").text()).toBe("접기");
    media.turn({ landscape: true });
    await nextTick();
    expect(view.get("p").text()).toBe("펼치기");
    view.unmount();
  });
});
