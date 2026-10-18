// Token graph first, then the generated Lit elements (importing the package
// registers every fsds-* custom element), then lane chrome.
import "@full-stack-ds/tokens/tokens.css";
import "@full-stack-ds/lit";
import "./app.css";

import "./app.js";
import "./stations/entrance-station.js";
import "./stations/stagger-station.js";
import "./stations/scramble-station.js";
import "./stations/part-takeover-station.js";
import "./stations/glyph-loop-station.js";

const host = document.getElementById("app");
if (!host) throw new Error("missing #app mount target");
host.append(document.createElement("ml-app"));
