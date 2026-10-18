import { describe, expect, it } from "vitest";
import { corpusIR } from "../corpus-fixtures.js";
import { generateReactComponentSource } from "./component-source.js";

const STACK_IMPORT = "../../primitives";

describe("CODEGEN-EMIT-LINT-HYGIENE-01: react root destructure + import hygiene", () => {
  it("Avatar renames its unreferenced intercepted prop and drops its unused ReactNode import", () => {
    const src = generateReactComponentSource(corpusIR("Avatar"), STACK_IMPORT);

    expect(src).toContain("priority: _priority,");
    // Referenced props stay plain.
    expect(src).toMatch(/^ {2}src,$/m);
    expect(src).toMatch(/^ {2}name,$/m);
    expect(src).toMatch(/^ {2}initials,$/m);
    // Interception machinery intact.
    expect(src).toContain('"data-testid": testId,');
    expect(src).toContain("...rest");
    // ReactNode is referenced nowhere in Avatar's emitted text.
    expect(src).not.toContain("ReactNode");
  });

  it("Button renames title but leaves referenced defaulted props untouched", () => {
    const src = generateReactComponentSource(corpusIR("Button"), STACK_IMPORT);

    expect(src).toContain("title: _title,");
    expect(src).toContain('type = "button",');
    expect(src).toContain('size = "medium",');
    // Button's props interface keeps ReactNode (children).
    expect(src).toContain("ReactNode");
  });

  it("Field renames unreferenced props and its unreferenced hook-result bindings", () => {
    const src = generateReactComponentSource(corpusIR("Field"), STACK_IMPORT);

    expect(src).toContain("id: _id,");
    expect(src).toContain("name: _name,");
    expect(src).toContain("const { value: _value, setValue: _setValue } = useField({");
  });

  it("Calendar renames unreferenced props and its unreferenced hook-result value", () => {
    const src = generateReactComponentSource(corpusIR("Calendar"), STACK_IMPORT);

    expect(src).toContain("minDate: _minDate,");
    expect(src).toContain('locale: _locale = "en-US",');
    expect(src).toMatch(/const \{[^}]*value: _value[^}]*\} = useCalendar\(/);
  });

  it("calibration regression: Image's aspectRatio is referenced via === and stays plain", () => {
    const src = generateReactComponentSource(corpusIR("Image"), STACK_IMPORT);

    expect(src).not.toContain("aspectRatio: _aspectRatio");
    expect(src).toMatch(/aspectRatio === /);
  });

  it("calibration regression: ShowMore's ternary-referenced prop stays plain", () => {
    const src = generateReactComponentSource(corpusIR("ShowMore"), STACK_IMPORT);

    expect(src).not.toContain("showLessLabel: _showLessLabel");
  });
});
