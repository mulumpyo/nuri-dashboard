import { flushPromises, mount } from "@vue/test-utils";
import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BoardResponse } from "@nuri/shared";
import App from "./App.vue";
import BoardScreen from "./BoardScreen.vue";
import PairScreen from "./PairScreen.vue";
import { BOARD_PAGE_MS } from "./page-board";
import "@nuri/ui/tokens.css";
import "@nuri/ui/glass.css";
import "@nuri/ui/cal.css";
import "./board.css";
import "./pair.css";

const display = {
  board: ref<BoardResponse | null>(null),
  code: ref("123456"),
  digits: ref(["1", "2", "3", "4", "5", "6"]),
  hint: ref("아래 코드를 어드민에 입력해 주세요"),
  paired: ref(false),
  preview: ref(false),
  asOf: ref(""),
  asOfCursor: ref("2026-10-10"),
  asOfLabel: ref("10월 10일 (토)"),
  nudgeAsOf: vi.fn(),
  applyAsOf: vi.fn(),
  onAsOfInput: vi.fn(),
  clearAsOf: vi.fn(),
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
              note: "7일건",
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
              note: "",
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
    vi.stubGlobal(
      "matchMedia",
      (query: string) =>
        ({
          matches: false,
          media: query,
          addEventListener() {},
          removeEventListener() {},
        }) as MediaQueryList,
    );
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
    display.preview.value = false;
    display.asOf.value = "";
    display.asOfCursor.value = "2026-10-10";
    display.asOfLabel.value = "10월 10일 (토)";
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
    expect(css).toMatch(/when-tag/);
    expect(css).toMatch(/when-date\.today/);
    expect(css).toMatch(/container-type:\s*inline-size/);
    expect(css).toMatch(/12cqi/);
    expect(css).toMatch(/--peek/);
    expect(css).toMatch(/scroll-padding-inline:\s*var\(--peek\)/);
    expect(css).toMatch(/overflow-y:\s*auto/);
    expect(css).toMatch(/#fa233b/);
    expect(css).toMatch(/font-weight:\s*700/);
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(css).toMatch(/board-page/);
    expect(css).toMatch(/max-height:\s*calc\(\(100% - \(8 \* var\(--slot-gap\)\)\) \/ 9\)/);
    expect(css).toMatch(/overflow:\s*hidden/);
    expect(css).toMatch(/page-in/);
    expect(css).toMatch(/--slot-gap/);
    expect(css).toMatch(/slot:has\(\.carrier\)/);
    expect(css).toMatch(/border-radius:\s*12px/);
    expect(css).toMatch(/\.asof|asof-mark/);
    expect(css).toMatch(/cal-pop|날짜 선택/);
    expect(css).toMatch(/\.when|when-date/);
    expect(css).toMatch(/entry-meta/);
    expect(css).toMatch(/note\.empty/);
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
    expect(loading.findAll(".slot")).toHaveLength(36);
    loading.unmount();

    const ready = mount(BoardScreen, {
      props: { board, flashes: { s1: true } },
    });
    expect(ready.get("[aria-label='오늘 10월 3일 (토)']").exists()).toBe(true);
    expect(ready.get("[aria-label='내일 10월 4일 (일)']").exists()).toBe(true);
    expect(ready.get(".when-date.today .when-day").text()).toBe("10월 3일");
    expect(ready.get(".when-tag.today").text()).toBe("오늘");
    expect(ready.findAll(".when-date.today .when-tag").map((n) => n.text())).toEqual(["오늘", "토"]);
    expect(ready.findAll(".col.tomorrow .when-tag").map((n) => n.text())).toEqual(["내일", "일"]);
    expect(ready.get(".entry.flash .name").text()).toBe("한빛");
    expect(ready.get(".note").text()).toBe("7일건");
    expect(ready.get(".note").classes()).not.toContain("empty");
    expect(ready.get(".when").text()).toBe("14:00");
    expect(ready.findAll(".entry .note")).toHaveLength(2);
    expect(ready.findAll(".entry .note.empty")).toHaveLength(1);
    expect(ready.findAll(".entry .when")).toHaveLength(2);
    expect(ready.findAll(".entry .when.empty")).toHaveLength(1);
    expect(ready.get(".pay.prepaid").text()).toBe("선불");
    expect(ready.get(".pay.collect").text()).toBe("착불");
    expect(ready.get(".count").text()).toBe("2건");
    expect(ready.findAll(".slot")).toHaveLength(18);
    ready.unmount();
  });

  it("rotates a full column after the dwell", async () => {
    vi.useFakeTimers();
    const many: BoardResponse = {
      ...board,
      days: [
        {
          ...board.days[0],
          carriers: [
            {
              carrierId: "c1",
              name: "한진",
              companies: Array.from({ length: 10 }, (_, i) => ({
                companyId: `co${i}`,
                shipmentId: `s${i}`,
                name: `업체${i}`,
                boxCount: 1,
                payType: "prepaid" as const,
                shipTime: null,
                note: "",
              })),
            },
          ],
        },
      ],
    };
    const wrap = mount(BoardScreen, { props: { board: many } });
    expect(wrap.text()).toContain("업체0");
    expect(wrap.text()).toContain("업체8");
    expect(wrap.text()).not.toContain("업체9");
    expect(wrap.get(".page-mark").text()).toBe("1/2");
    await vi.advanceTimersByTimeAsync(BOARD_PAGE_MS);
    expect(wrap.text()).toContain("업체9");
    expect(wrap.text()).not.toContain("업체0");
    expect(wrap.get(".page-mark").text()).toBe("2/2");
    wrap.unmount();
    vi.useRealTimers();
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
    expect(live.find("[aria-label='미리보기 오늘']").exists()).toBe(false);
    live.unmount();

    display.preview.value = true;
    display.asOf.value = "2026-10-08";
    display.asOfCursor.value = "2026-10-08";
    display.asOfLabel.value = "10월 8일 (목)";
    const preview = mount(App);
    await flushPromises();
    expect(preview.get("[aria-label='미리보기 오늘']").exists()).toBe(true);
    expect(preview.get("[aria-label='하루 전']").exists()).toBe(true);
    expect(preview.get("[aria-label='하루 후']").exists()).toBe(true);
    expect(preview.get(".asof-reset").text()).toBe("실제 오늘");
    expect(preview.get(".asof-day").attributes("aria-haspopup")).toBe("dialog");
    expect(preview.get(".asof-day").attributes("aria-label")).toBe("날짜 선택");
    preview.unmount();

    const picker = mount(App, { attachTo: document.body });
    await flushPromises();
    await picker.get(".asof-day").trigger("click");
    await flushPromises();
    expect(document.querySelector("[aria-label='날짜 선택']")).toBeTruthy();
    picker.unmount();
    display.preview.value = false;
    display.asOf.value = "";

    display.live.value = false;
    const offline = mount(App);
    await flushPromises();
    expect(offline.get(".dot.off").attributes("aria-label")).toBe("연결 끊김");
    offline.unmount();
  });
});
