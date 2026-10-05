import { mount, flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.vue";
import CompanyPicker from "./components/CompanyPicker.vue";
import ConfirmDialog from "./components/ConfirmDialog.vue";
import DatePicker from "./components/DatePicker.vue";
import DirPage from "./components/DirPage.vue";
import FormDialog from "./components/FormDialog.vue";
import PageHead from "./components/PageHead.vue";
import Pager from "./components/Pager.vue";
import RowDrop from "./components/RowDrop.vue";
import Skeleton from "./components/Skeleton.vue";
import TimePicker from "./components/TimePicker.vue";
import TotpEnroll from "./components/TotpEnroll.vue";
import AccountsView from "./views/AccountsView.vue";
import CarriersView from "./views/CarriersView.vue";
import CompaniesView from "./views/CompaniesView.vue";
import HomeView from "./views/HomeView.vue";
import InviteView from "./views/InviteView.vue";
import LoginView from "./views/LoginView.vue";
import LogsView from "./views/LogsView.vue";
import SettingsView from "./views/SettingsView.vue";

vi.mock("./api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock("@nuri/shared/sse", () => ({
  connectEvents: () => () => undefined,
}));

import "./app.css";
import { api } from "./api";
import { scanNames } from "./lib/a11y-scan";
import { resetHolidays } from "./lib/home-holidays";
import { me } from "./lib/session";

const board = {
  days: [
    {
      date: "2026-10-03",
      label: "오늘",
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

const memoryRouter = async (path = "/") => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<main id=\"main\">ok</main>" } },
      { path: "/login", component: LoginView },
      { path: "/invite/:token", component: InviteView },
      { path: "/recover/:token", component: InviteView },
      { path: "/companies", component: { template: "<main id=\"main\">업체</main>" } },
      { path: "/carriers", component: { template: "<main id=\"main\">택배사</main>" } },
      { path: "/accounts", component: { template: "<main id=\"main\">계정</main>" } },
      { path: "/settings", component: SettingsView },
      { path: "/settings/logs", component: LogsView },
    ],
  });
  await router.push(path);
  await router.isReady();
  return router;
};

const mountView = async (component: object, router: Router) =>
  mount(component, { global: { plugins: [router] } });

describe("admin a11y render", () => {
  beforeEach(() => {
    me.value = null;
    resetHolidays();
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.get).mockImplementation(async (path: string) => {
      if (path.includes("/shipments/board")) return board;
      if (path.includes("/carriers")) return [{ id: "c1", name: "한진", active: true }];
      if (path.includes("/holidays/status")) return { syncedAt: null };
      if (path.includes("/holidays")) return [];
      if (path.includes("/devices")) return [{ id: "3f1c0a8e-2d4b-4f1a-9c2e-7b6d5a4c3e21", name: "디스플레이" }];
      if (path.includes("/auth/users")) return [];
      if (path.includes("/auth/activity")) {
        return {
          items: [
            {
              at: "2026-10-05T00:00:00.000Z",
              actor: "소유자",
              talk: "한빛 업체를 지웠어요",
              requestId: "r1",
              ok: true,
              email: "owner@nuri.test",
              kind: "work",
              detail: "한빛",
            },
            {
              at: "2026-10-05T00:01:00.000Z",
              actor: "소유자",
              talk: "한빛 업체를 지웠어요 · 실패",
              requestId: "r2",
              ok: false,
              email: "owner@nuri.test",
              kind: "work",
              detail: "한빛",
            },
          ],
          page: 1,
          pages: 1,
          total: 1,
        };
      }
      if (path.includes("/auth/me")) return { kind: "admin", totpRequired: false, canManageTotp: true, canManageUsers: true };
      if (path.includes("/auth/invite") || path.includes("/auth/recovery")) return { status: "ok" };
      if (path.includes("/auth/security")) return { totpRequired: false };
      if (path.includes("/companies")) return { items: [{ id: "co1", name: "한빛" }], page: 1, pages: 1, total: 1 };
      return {};
    });
  });

  it("loads home and directory layout tokens", () => {
    const cssText = [...document.styleSheets]
      .flatMap((sheet) => {
        try {
          return [...sheet.cssRules].map((rule) => rule.cssText);
        } catch {
          return [];
        }
      })
      .join("\n");
    expect(cssText).toMatch(/--card-w:\s*148px/);
    expect(cssText).toMatch(/--page-x:\s*10px/);
    expect(cssText).toMatch(/--dir-gutter:\s*10px/);
  });

  it("renders a skip link and live toast host", async () => {
    const router = await memoryRouter();
    const wrap = mount(App, { global: { plugins: [router] } });
    const skip = wrap.get(".skip");
    expect(skip.attributes("href")).toBe("#main");
    expect(skip.text()).toContain("본문");
  });

  it("labels login and invite fields", async () => {
    vi.mocked(api.post).mockResolvedValue({ mode: "password", email: "a@b.c" });
    const login = await mountView(LoginView, await memoryRouter("/login"));
    await flushPromises();
    expect(login.get("#main").exists()).toBe(true);
    expect(login.get("#login-email").attributes("aria-label")).toBe("이메일 주소");
    expect(login.find(".auth-sub").exists()).toBe(false);
    await login.get("#login-email").setValue("a@b.c");
    await login.get("button.wide").trigger("click");
    await flushPromises();
    expect(login.get("#login-password").attributes("aria-label")).toBe("비밀번호");
    expect(login.get("[aria-label='이메일 다시 입력']").exists()).toBe(true);
    await login.get(".auth-sub").trigger("click");
    await flushPromises();
    expect(login.get("[role='alert']").text()).toContain("비밀번호");

    const invite = await mountView(InviteView, await memoryRouter("/invite/tok"));
    await flushPromises();
    expect(invite.get("#invite-password").attributes("aria-label")).toBe("비밀번호");

    vi.mocked(api.get).mockImplementation(async (path: string) => {
      if (path.includes("/auth/invite")) return { status: "expired" };
      if (path.includes("/auth/security")) return { totpRequired: false };
      return {};
    });
    const expired = await mountView(InviteView, await memoryRouter("/invite/old"));
    await flushPromises();
    expect(expired.get(".title").text()).toBe("초대가 만료됐어요");
    expect(expired.text()).toContain("다시 초대해");
    expect(expired.find("#invite-password").exists()).toBe(false);

    vi.mocked(api.get).mockImplementation(async (path: string) => {
      if (path.includes("/auth/recovery")) return { status: "expired" };
      if (path.includes("/auth/security")) return { totpRequired: false };
      return {};
    });
    const stale = await mountView(InviteView, await memoryRouter("/recover/old"));
    await flushPromises();
    expect(stale.get(".title").text()).toBe("비밀번호 링크가 만료됐어요");
    expect(stale.text()).toContain("다시 받아");
    expect(stale.find("#invite-password").exists()).toBe(false);
  });

  it("names the home board, settings, and directory", async () => {
    const router = await memoryRouter();
    const home = await mountView(HomeView, router);
    await flushPromises();
    expect(home.get("#list-heading").exists()).toBe(true);
    expect(home.get("[aria-label='어제']").exists()).toBe(true);
    expect(home.get("[aria-label='내일']").exists()).toBe(true);
    expect(home.get("[aria-label='날짜 선택']").exists()).toBe(true);
    expect(home.get("[aria-label='결제 구분']").exists()).toBe(true);
    expect(home.get("[aria-label='한빛 삭제']").exists()).toBe(true);
    expect(home.get("[role='list']").exists()).toBe(true);
    expect(home.get("[aria-label='업체 선택']").exists()).toBe(true);
    expect(home.get("[aria-label='택배사 선택']").exists()).toBe(true);
    expect(home.find("[aria-controls='dock-fields']").exists()).toBe(false);
    expect(home.get("[aria-label='발송 등록']").text()).toBe("등록");
    expect(home.get(".card-grid .company-card").exists()).toBe(true);
    expect(home.get(".card-grid .company-card strong").attributes("title")).toBe("한빛");
    expect(scanNames(home.element)).toEqual([]);
    home.unmount();

    const appHome = mount(App, { global: { plugins: [router] } });
    await flushPromises();
    expect(appHome.get("[aria-current='page']").text()).toBe("홈");
    expect(appHome.text()).toContain("계정");
    expect(appHome.findAll("header button").some((btn) => btn.text() === "설정")).toBe(true);
    appHome.unmount();

    const settingsRouter = await memoryRouter("/settings");
    const settings = mount(SettingsView, {
      global: { plugins: [settingsRouter] },
      attachTo: document.body,
    });
    await flushPromises();
    expect(settings.get("#settings-title").text()).toBe("설정");
    expect(settings.get(".set-tag").text()).toBe("3E21");
    expect(settings.get("[aria-label='화면 연결']").exists()).toBe(true);
    expect(settings.get("[aria-label='3E21 끊기']").exists()).toBe(true);
    expect(settings.get("#set-log-title").text()).toBe("로그 기록");
    expect(settings.get("[aria-label='로그 보기']").text()).toContain("로그 보기");
    expect(settings.get("#holiday-name").attributes("aria-label")).toBe("이름");
    expect(settings.get("#holiday-date").attributes("aria-label")).toBe("날짜 선택");
    expect(settings.text()).toContain("인증 앱");
    await settings.get("[aria-label='화면 연결']").trigger("click");
    await flushPromises();
    expect(document.querySelector("#pair-code")?.getAttribute("aria-label")).toBe("화면 코드 6자리");
    settings.unmount();

    const logs = await mountView(LogsView, await memoryRouter("/settings/logs"));
    await flushPromises();
    expect(logs.get(".page-head").classes()).toContain("has-back");
    expect(logs.get(".page-head").element.firstElementChild?.getAttribute("aria-label")).toBe("설정으로");
    expect(logs.get("#logs-title").text()).toBe("로그 기록");
    expect(logs.get("[aria-label='설정으로']").exists()).toBe(true);
    expect(logs.get("[aria-label='설정으로']").text().trim()).toBe("");
    expect(logs.get("[aria-label='로그 종류']").exists()).toBe(true);
    expect(logs.get("#logs-panel").attributes("role")).toBe("tabpanel");
    expect(logs.get("[aria-controls='logs-panel']").exists()).toBe(true);
    expect(logs.get("#log-filter").attributes("aria-label")).toBe("로그 검색");
    expect(vi.mocked(api.get).mock.calls.some(([path]) => String(path).includes("/api/auth/activity") && String(path).includes("limit="))).toBe(
      true,
    );
    expect(logs.text()).toContain("한빛 업체를 지웠어요");
    expect(logs.text()).toContain("한빛 업체를 지웠어요 · 실패");
    expect(logs.text()).toContain("owner@nuri.test");
    logs.unmount();

    const appSettings = mount(App, { global: { plugins: [settingsRouter] } });
    await flushPromises();
    expect(appSettings.get("[aria-current='page']").text()).toBe("설정");
    expect(appSettings.text()).toContain("홈");
    appSettings.unmount();

    const dir = mount(DirPage, {
      props: {
        title: "업체",
        searchId: "company-q",
        searchLabel: "업체 이름 검색",
        searchPlaceholder: "업체",
        actionLabel: "업체 등록",
        pagerLabel: "업체 페이지",
        total: 2,
        pages: 1,
      },
      global: { plugins: [router] },
    });
    expect(dir.get("#main").exists()).toBe(true);
    expect(dir.get("#company-q").attributes("aria-label")).toBe("업체 이름 검색");
    expect(dir.get(".title").text()).toBe("업체");
    dir.unmount();

    const companies = await mountView(CompaniesView, router);
    await flushPromises();
    expect(companies.get("#company-filter").attributes("aria-label")).toBe("업체 이름 검색");
    expect(companies.get(".dir-add").text()).toBe("업체 등록");
    expect(companies.get("[aria-label='한빛 수정']").exists()).toBe(true);
    expect(companies.get(".dir-viewport").exists()).toBe(true);
    companies.unmount();
    const carriers = await mountView(CarriersView, router);
    await flushPromises();
    expect(carriers.get("#carrier-filter").attributes("aria-label")).toBe("택배사 이름 검색");
    expect(carriers.get(".dir-add").text()).toBe("택배사 등록");
    carriers.unmount();
    const accounts = mount(AccountsView, { global: { plugins: [router] }, attachTo: document.body });
    await flushPromises();
    expect(accounts.get("#account-filter").attributes("aria-label")).toBe("계정 검색");
    expect(accounts.get(".dir-add").text()).toBe("계정 초대");
    vi.mocked(api.post).mockResolvedValue({
      status: "queued",
      link: "http://localhost/invite/secret-token",
      resent: false,
    });
    const vm = accounts.vm as unknown as { email: string; invite: () => Promise<void> };
    vm.email = "guest@nuri.test";
    await vm.invite();
    await flushPromises();
    expect(document.body.textContent).not.toContain("/invite/");
    expect(document.body.textContent).not.toContain("secret-token");
    accounts.unmount();
  });

  it("hides the accounts menu for invited admins", async () => {
    vi.mocked(api.get).mockImplementation(async (path: string) => {
      if (path.includes("/shipments/board")) return board;
      if (path.includes("/carriers")) return [{ id: "c1", name: "한진", active: true }];
      if (path.includes("/holidays")) return [];
      if (path.includes("/auth/me")) return { kind: "admin", canManageUsers: false };
      return {};
    });
    const invitedRouter = await memoryRouter();
    const invited = mount(App, { global: { plugins: [invitedRouter] } });
    await flushPromises();
    expect(invited.text()).not.toContain("계정");
    invited.unmount();
  });

  it("renders shared dialogs and pickers", async () => {
    const router = await memoryRouter();
    const confirm = mount(ConfirmDialog, {
      props: { title: "이 발송을 삭제할까요?", message: "기록이 사라져요" },
      attachTo: document.body,
    });
    const dialog = document.querySelector("[role='alertdialog']");
    expect(dialog?.getAttribute("aria-labelledby")).toBe("confirm-title");
    expect(dialog?.getAttribute("aria-describedby")).toBe("confirm-desc");
    confirm.unmount();

    const form = mount(FormDialog, {
      props: { title: "업체 등록" },
      attachTo: document.body,
    });
    expect(document.querySelector("[role='dialog'][aria-labelledby='form-title']")).toBeTruthy();
    form.unmount();

    const picker = mount(DatePicker, { props: { modelValue: "2026-10-03" } });
    expect(picker.get("[aria-haspopup='dialog']").exists()).toBe(true);

    const time = mount(TimePicker, { props: { modelValue: "14:00" }, attachTo: document.body });
    await time.get("button").trigger("click");
    expect(document.querySelector("[aria-label='발송 시간']")).toBeTruthy();
    time.unmount();

    const companies = mount(CompanyPicker, {
      props: { open: true },
      global: { plugins: [router] },
      attachTo: document.body,
    });
    await flushPromises();
    expect(document.querySelector("[aria-label='업체 이름 검색']")).toBeTruthy();
    expect(document.querySelector("[aria-label='업체 페이지']")).toBeTruthy();
    companies.unmount();

    const totp = mount(TotpEnroll, { props: { enroll: true, qr: "data:image/png;base64,xx", secret: "ABCD" } });
    expect(totp.get("img").attributes("alt")).toBe("인증 앱 QR");
    expect(totp.get("#totp-code").attributes("aria-label")).toBe("인증 번호 6자리");

    const skel = mount(Skeleton, { props: { variant: "list", rows: 2 } });
    expect(skel.get("[role='status']").attributes("aria-busy")).toBe("true");

    const head = mount(PageHead, { props: { title: "업체" } });
    expect(head.get(".title").text()).toBe("업체");

    const pager = mount(Pager, { props: { page: 1, pages: 2, label: "업체 페이지" } });
    expect(pager.get("[aria-label='이전 페이지']").exists()).toBe(true);
    expect(pager.get("[aria-label='다음 페이지']").exists()).toBe(true);

    expect(mount(RowDrop).get("[aria-label='삭제']").exists()).toBe(true);
  });
});
