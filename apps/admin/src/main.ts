import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import "@nuri/ui/tokens.css";
import "@nuri/ui/glass.css";
import "./app.css";

createApp(App).use(router).mount("#app");
