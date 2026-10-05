import { flushPromises, mount } from "@vue/test-utils";
import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BoardResponse } from "@nuri/shared";
import App from "./App.vue";
import BoardScreen from "./BoardScreen.vue";
import PairScreen from "./PairScreen.vue";
import "@nuri/ui/tokens.css";
import "@nuri/ui/glass.css";
import "./board.css";
import "./pair.css";

const display = {
  board: ref<BoardResponse | null>(null),
  code: ref("123456"),
  digits: ref(["1", "2", "3", "4", "5", "6"]),
  hint: ref("아래 코드를 어드민에 입력해 주세요"),
  paired: ref(false),
  live: ref(false),
  liveHint: ref(""),
  flashes: ref<Record<string, boolean>>({}),
  slide: ref(false),
  tag: ref(""),
  copyCode: vi.fn(),
};

vi.mock("./use-display", () => ({
  useDisplay: () => display,
}));

const board: BoardResponse = {
  from: "2026-10-03",
  timezone: "Asia/Seoul",
  days: [
    {
      date: "2026-10-03",
      label: "오늘",
      isToday: true,
      isTomorrow: false,
      carriers: [
        {
          carrierId: "c1",
          name: "한진",
          companies: [
            {
              companyId: "co1",
              shipmentId: "s1",
              name: "한빛",
              boxCount: 2,
              payType: "prepaid",
              shipTime: "14:00",
            },
          ],
        },
      ],
    },
    {
      date: "2026-10-04",
      label: "내일",
      isToday: false,
      isTomorrow: true,
      carriers: [
        {
          carrierId: "c1",
          name: "한진",
          companies: [
            {
              companyId: "co2",
              shipmentId: "s2",
              name: "샛별",
              boxCount: 1,
              payType: "collect",
              shipTime: null,
            },
          ],
        },
      ],
    },
  ],
};

const cssText = () =>
  [...document.styleSheets]
    .flatMap((sheet) => {
      try {
        return [...sheet.cssRules].map((rule) => rule.cssText);
      } catch {
        return [];
      }
    })
    .join("\n");

describe("dashboard a11y render", () => {
  beforeEach(() => {
    if (!globalThis.ResizeObserver) {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as typeof ResizeObserver;
    }
    display.board.value = null;
    display.code.value = "123456";
    display.digits.value = ["1", "2", "3", "4", "5", "6"];
    display.hint.value = "아래 코드를 어드민에 입력해 주세요";
    display.paired.value = false;
    display.live.value = false;
    display.liveHint.value = "";
    display.flashes.value = {};
    display.slide.value = false;
    display.tag.value = "";
    display.copyCode.mockReset();
    document.title = "";
  });

  it("loads board and pair tokens without color alone", () => {
    const css = cssText();
    expect(css).toMatch(/skel-shine/);
    expect(css).toMatch(/\.label\.today|label\.today/);
    expect(css).toMatch(/font-weight:\s*700/);
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(css).toMatch(/\.group \+ \.group|group \+ \.group/);
    expect(css).toMatch(/border-top/);
    expect(css).toMatch(/\.when|when-date/);
    expect(css).toMatch(/\.pay\.prepaid|pay\.prepaid/);
    expect(css).toMatch(/\.pay\.collect|pay\.collect/);
    expect(css).toMatch(/\.pair-card|pair-card/);
  });

  it("names pairing without relying on the code color", async () => {
    const wrap = mount(PairScreen, {
      props: {
        hint: "아래 코드를 어드민에 입력해 주세요",
        code: "123456",
        digits: ["1", "2", "3", "4", "5", "6"],
      },
    });
    expect(wrap.get("#main").classes()).toContain("pair");
    expect(wrap.get("h1").text()).toBe("화면 연결");
    expect(wrap.get("[role='group']").attributes("aria-label")).toBe("승인 코드 123456");
    expect(wrap.findAll(".code-cell")).toHaveLength(6);
    await wrap.get(".code").trigger("copy");
    expect(wrap.emitted("copy")).toHaveLength(1);
    wrap.unmount();
  });

  it("names the board, loading state, pay type, and ship time", () => {
    const loading = mount(BoardScreen, { props: { board: null } });
    expect(loading.get("#main").attributes("aria-busy")).toBe("true");
    expect(loading.get("[role='status']").text()).toContain("불러오는 중");
    expect(loading.get("h1").text()).toBe("발송 보드");
    loading.unmount();

    const ready = mount(BoardScreen, {
      props: { board, flashes: { s1: true } },
    });
    expect(ready.get("[aria-label='오늘 10월 3일']").exists()).toBe(true);
    expect(ready.get("[aria-label='내일 10월 4일']").exists()).toBe(true);
    expect(ready.get(".label.today").text()).toBe("오늘");
    expect(ready.get(".when-date.today").text()).toContain("(오늘)");
    expect(ready.get(".entry.flash .name").text()).toBe("한빛");
    expect(ready.get(".when").text()).toBe("14:00");
    expect(ready.get(".pay.prepaid").text()).toBe("선불");
    expect(ready.get(".pay.collect").text()).toBe("착불");
    expect(ready.get(".count").text()).toBe("2건");
    ready.unmount();
  });

  it("renders skip, live status, and titles for both screens", async () => {
    const pair = mount(App);
    await flushPromises();
    expect(pair.get(".skip").attributes("href")).toBe("#main");
    expect(pair.get(".skip").text()).toContain("본문");
    expect(pair.get(".dot").attributes("aria-label")).toBe("연결 대기");
    expect(pair.get("[aria-live='polite']").exists()).toBe(true);
    expect(pair.get("[aria-label='승인 코드 123456']").exists()).toBe(true);
    expect(document.title).toBe("누리디에스엠 | 화면 연결");
    pair.unmount();

    display.paired.value = true;
    display.live.value = true;
    display.liveHint.value = "발송 정보가 바뀌었어요";
    display.tag.value = "3E21";
    display.board.value = board;
    const live = mount(App);
    await flushPromises();
    expect(live.get(".dot").attributes("aria-label")).toBe("실시간 연결됨");
    expect(live.get(".device-tag").text()).toBe("3E21");
    expect(live.get("[aria-label='화면 3E21']").exists()).toBe(true);
    expect(live.get("[aria-live='polite']").text()).toContain("발송 정보가 바뀌었어요");
    expect(live.get("h1").text()).toBe("발송 보드");
    expect(document.title).toBe("누리디에스엠 | 발송 보드");
    live.unmount();

    display.live.value = false;
    const offline = mount(App);
    await flushPromises();
    expect(offline.get(".dot.off").attributes("aria-label")).toBe("연결 끊김");
    offline.unmount();
  });
});
