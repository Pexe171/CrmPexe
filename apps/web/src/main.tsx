import { createRoot } from "react-dom/client";
import { initMonitoring } from "./lib/monitoring";
import App from "./App.tsx";
import "./index.css";

initMonitoring();

createRoot(document.getElementById("root")!).render(<App />);
