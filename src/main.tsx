import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "@/app/App";
import minerImage from "@/assets/miner.png";
import "@/styles/globals.css";
import "@/styles/theme.css";

registerSW({ immediate: true });
setAppFavicon(minerImage);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

function setAppFavicon(href: string) {
  let favicon = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!favicon) {
    favicon = document.createElement("link");
    favicon.rel = "icon";
    document.head.appendChild(favicon);
  }
  favicon.type = "image/png";
  favicon.href = href;
}
