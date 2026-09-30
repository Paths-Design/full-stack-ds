import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Establish the token layer order before any component stylesheet loads.
import "@full-stack-ds/tokens/tokens.css";
import "./styles/app.css";
import { App } from "./app";

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
