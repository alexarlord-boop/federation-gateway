import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const savedTheme = localStorage.getItem('ui_theme');
if (savedTheme) {
  document.documentElement.classList.add(savedTheme);
}

createRoot(document.getElementById("root")!).render(<App />);
