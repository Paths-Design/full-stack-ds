import { describe, it, expect } from "vitest";
import { extractReadVars, readCssVarsFor } from "./css-read-proof";

describe("extractReadVars", () => {
  it("excludes disconnected aliases and comments, but follows rooted aliases", () => {
    expect(extractReadVars('.a { --fsds-dead: var(--fsds-other); /* width: var(--fsds-fake) */ --fsds-live: var(--fsds-base); width: var(--fsds-live); }'))
      .toEqual(new Set(["--fsds-live", "--fsds-base"]));
  });
  it("captures var reads with and without fallbacks", () => {
    const css = `
      .a { gap: var(--fsds-button-size-gap, 8px); }
      .b { color: var(--fsds-semantic-color-foreground-primary); }
    `;
    expect(extractReadVars(css)).toEqual(
      new Set([
        "--fsds-button-size-gap",
        "--fsds-semantic-color-foreground-primary",
      ]),
    );
  });

  it("ignores non-fsds vars, declarations, and duplicates", () => {
    const css = `
      :root { --fsds-box-model-gap: 8px; --other: 1px; }
      .a { gap: var(--fsds-box-model-gap, 8px); }
      .b { gap: var(--fsds-box-model-gap); }
      .c { color: var(--not-fsds-x); }
    `;
    // A declaration (--fsds-box-model-gap: 8px) is a WRITE, not a read —
    // only var() occurrences count.
    expect(extractReadVars(css)).toEqual(new Set(["--fsds-box-model-gap"]));
  });

  it("tolerates whitespace inside var()", () => {
    expect(extractReadVars(".a { gap: var(  --fsds-x-y , 1px ); }")).toEqual(
      new Set(["--fsds-x-y"]),
    );
  });
});

describe("readCssVarsFor — corpus ground truth", () => {
  it("Button reads its default gap and the shared box override", () => {
    const reads = readCssVarsFor("Button");
    expect(reads).not.toBeNull();
    expect(reads!.has("--fsds-button-size-gap")).toBe(true);
    expect(reads!.has("--fsds-box-model-gap")).toBe(true);
  });

  it("aggregates every css file of a component (multi-file surfaces)", () => {
    // Tabs.css is a single file, but the glob covers <Name>/*.css — any
    // component with several css files must union their reads.
    const reads = readCssVarsFor("Tabs");
    expect(reads).not.toBeNull();
    expect(reads!.has("--fsds-tabs-spacing-gap")).toBe(true);
    expect(reads!.has("--fsds-box-model-gap")).toBe(true);
  });

  it("does not expose native-only or compile-time tokens as Web controls", () => {
    expect(readCssVarsFor("Accordion")!.has("--fsds-accordion-border-width")).toBe(false);
    expect(readCssVarsFor("Toast")!.has("--fsds-toast-timing-auto-dismiss")).toBe(false);
  });

  it("returns null for an unknown component (no proof source, not empty proof)", () => {
    expect(readCssVarsFor("NotAComponent")).toBeNull();
  });
});
