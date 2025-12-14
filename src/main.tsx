import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initStore } from "./lib/api";

// Khởi tạo store trước khi render app
initStore().then(() => {
  // Ensure the favicon uses the ico file from public
  try {
    const existing = document.querySelector(
      "link[rel='icon']"
    ) as HTMLLinkElement | null;
    if (existing) {
      existing.href = "default/AppIcon.png";
    } else {
      const link = document.createElement("link");
      link.rel = "icon";
      link.href = "default/AppIcon.png";
      document.head.appendChild(link);
    }
  } catch (e) {
    console.warn("Could not set favicon dynamically:", e);
  }

  createRoot(document.getElementById("root")!).render(<App />);
});
