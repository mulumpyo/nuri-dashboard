import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { apiProxy, publicDevServer } from "../dev-proxy";

export default defineConfig({
  envDir: "../..",
  plugins: [vue()],
  server: {
    ...publicDevServer,
    port: 5173,
    proxy: apiProxy,
  },
});
