import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { OpenAPI } from "./client";

OpenAPI.BASE = 'http://localhost:8765';

async function enableMocking() {
  if (!import.meta.env.DEV) {
    return;
  }
 
  const { worker } = await import('./mocks/browser');
 
  return worker.start();
}

enableMocking().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
