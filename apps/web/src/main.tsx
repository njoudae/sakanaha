import "./observability/instrument";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthServiceProvider } from "./auth";
import { captureApplicationError, scheduleObservabilityInitialization } from "./observability";
import "./styles/globals.css";

scheduleObservabilityInitialization();

createRoot(document.getElementById("root")!, {
  onRecoverableError(error) {
    captureApplicationError(error, "react_recoverable_error");
  },
}).render(
  <StrictMode>
    <AuthServiceProvider>
      <App />
    </AuthServiceProvider>
  </StrictMode>,
);
