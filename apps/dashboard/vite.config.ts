import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { apiProxy, publicDevServer } from "../dev-proxy";
import { displaySlash } from "./src/display-slash";

export default defineConfig({
  envDir: "../..",
  base: "/display/",
  plugins: [displaySlash(), vue()],
  server: {
    ...publicDevServer,
    port: 5174,
    proxy: apiProxy,
  },
});
