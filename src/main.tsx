import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initStore } from "./lib/api";

// Khởi tạo store trước khi render app
initStore().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
