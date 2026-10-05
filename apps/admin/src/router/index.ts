import { createRouter, createWebHistory } from "vue-router";
import { loadMe, me } from "../lib/session";
import { pageTitle } from "../lib/title";
import AccountsView from "../views/AccountsView.vue";
import CarriersView from "../views/CarriersView.vue";
import CompaniesView from "../views/CompaniesView.vue";
import HomeView from "../views/HomeView.vue";
import InviteView from "../views/InviteView.vue";
import LoginView from "../views/LoginView.vue";
import LogsView from "../views/LogsView.vue";
import SettingsView from "../views/SettingsView.vue";
import { publicPath, sessionTarget } from "./access";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: HomeView, meta: { title: pageTitle("/") } },
    { path: "/companies", component: CompaniesView, meta: { title: pageTitle("/companies") } },
    { path: "/carriers", component: CarriersView, meta: { title: pageTitle("/carriers") } },
    { path: "/accounts", component: AccountsView, meta: { title: pageTitle("/accounts") } },
    { path: "/settings", component: SettingsView, meta: { title: pageTitle("/settings") } },
    { path: "/settings/logs", component: LogsView, meta: { title: pageTitle("/settings/logs") } },
    { path: "/login", component: LoginView, meta: { title: pageTitle("/login") } },
    { path: "/invite/:token", component: InviteView, meta: { title: pageTitle("/invite") } },
    { path: "/recover/:token", component: InviteView, meta: { title: pageTitle("/recover") } },
  ],
});

router.beforeEach(async (to) => {
  if (publicPath(to.path) && to.path !== "/login") return true;
  const session = me.value ?? (await loadMe());
  const next = sessionTarget(to.path, session);
  return next === true ? true : { path: next };
});

router.afterEach((to) => {
  document.title = String(to.meta.title ?? "누리디에스엠");
});
