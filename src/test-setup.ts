import "@testing-library/jest-dom/vitest";
import { expect } from "vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { adoptDocumentStorage } from "./test-support/document-storage";

// Vitest's jsdom environment exposes its JSDOM instance as `jsdom`.
const dom = (globalThis as { jsdom?: { window: Window } }).jsdom;
if (dom) adoptDocumentStorage(globalThis, dom.window);

// vitest-axe has broken type exports — import at runtime only
// eslint-disable-next-line @typescript-eslint/no-require-imports
const matchers = require("vitest-axe/matchers");
expect.extend(matchers);

afterEach(() => {
  cleanup();
});
