import { mount } from "svelte";

// Token graph first (custom properties on :root), then the concatenated
// component styles the package exposes, then lane chrome.
import "@full-stack-ds/tokens/tokens.css";
import "@full-stack-ds/svelte/styles.css";
import "./app.css";

import App from "./App.svelte";

const target = document.getElementById("app");
if (!target) throw new Error("missing #app mount target");

export default mount(App, { target });
