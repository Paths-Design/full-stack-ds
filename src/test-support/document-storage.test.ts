import { describe, expect, it } from "vitest";
import { adoptDocumentStorage } from "./document-storage";

const documentWindow = (globalThis as { jsdom?: { window: Window } }).jsdom!
  .window;

// Mirrors Node 25's global: storage keys are configurable accessors returning
// objects without Storage methods.
function nodeStyleGlobal() {
  const reads: string[] = [];
  const target = {};
  for (const key of ["localStorage", "sessionStorage"]) {
    Object.defineProperty(target, key, {
      get() {
        reads.push(key);
        return {};
      },
      configurable: true,
      enumerable: true,
    });
  }
  return { target, reads };
}

describe("adoptDocumentStorage", () => {
  it("replaces Node-defined storage accessors with the document window's Storage", () => {
    const { target, reads } = nodeStyleGlobal();

    adoptDocumentStorage(target, documentWindow);

    expect(Reflect.get(target, "localStorage")).toBe(
      documentWindow.localStorage,
    );
    expect(Reflect.get(target, "sessionStorage")).toBe(
      documentWindow.sessionStorage,
    );
    expect(reads).toEqual([]);
  });

  it("is applied to the test environment's globals by the shared setup", () => {
    expect(globalThis.localStorage).toBe(documentWindow.localStorage);
    expect(globalThis.sessionStorage).toBe(documentWindow.sessionStorage);
    localStorage.setItem("fsds-probe", "1");
    expect(documentWindow.localStorage.getItem("fsds-probe")).toBe("1");
    localStorage.clear();
    expect(documentWindow.localStorage.length).toBe(0);
  });
});
