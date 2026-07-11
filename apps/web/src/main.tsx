import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "leaflet/dist/leaflet.css";
import App from "./App";
import { AuthServiceProvider } from "./auth";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthServiceProvider>
      <App />
    </AuthServiceProvider>
  </StrictMode>,
);
