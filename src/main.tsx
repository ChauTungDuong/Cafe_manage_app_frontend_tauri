import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initStore } from "./lib/api";

// App icon moved to `public/default` — use public path so Vite serves it directly
const appIcon = "/default/AppIcon.png";

// Khởi tạo store trước khi render app
initStore().then(() => {
  // Ensure the favicon uses the bundled asset path provided by Vite
  try {
    const existing = document.querySelector(
      "link[rel='icon']"
    ) as HTMLLinkElement | null;
    if (existing) {
      existing.href = appIcon;
    } else {
      const link = document.createElement("link");
      link.rel = "icon";
      link.href = appIcon;
      document.head.appendChild(link);
    }
  } catch (e) {
    console.warn("Could not set favicon dynamically:", e);
  }

  createRoot(document.getElementById("root")!).render(<App />);
});
