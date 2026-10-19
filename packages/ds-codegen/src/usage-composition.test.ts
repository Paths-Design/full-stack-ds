/**
 * Tests for the required-slot usage obligations
 * (FEAT-SLOT-REQUIRED-USAGE-BINDING-01, ownership corrected by
 * FIX-SLOT-REQUIRED-OWNERSHIP-01).
 *
 * `findRequiredRegionViolations` preserves the OWNING OCCURRENCE when
 * resolving supplied regions: a nested component root is a new ownership
 * context and part-ref delivery requires the enclosing occurrence's
 * component to match. `deriveRequiredRegionObligations` narrows
 * slots[].required to consumer-supplied regions. Synthetic fixtures
 * exercise the ownership rules independently of the corpus; the corpus
 * sweep itself lives in src/lib/render-usage.test.tsx.
 */
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "./contract.js";
import { loadCorpusContract } from "./frameworks/corpus-fixtures.js";
import {
  findRequiredRegionViolations,
  deriveRequiredRegionObligations,
  deriveUsageComposition,
  type RequiredRegionObligation,
} from "./usage-composition.js";

function obligationsFor(
  map: Record<string, string[]>,
): (component: string) => RequiredRegionObligation[] {
  return (component) =>
    (map[component] ?? []).map((region) => ({ component, region }));
}

describe("findRequiredRegionViolations — occurrence ownership", () => {
  const cardActions = obligationsFor({ Card: ["actions"] });

  it("accepts a valid nested pair where both occurrences supply their own region", () => {
    const frame = {
      "fsds.Card": {
        props: {
          children: [
            { "fsds.Card.actions": { props: { children: "Outer go" } } },
            {
              "fsds.Card": {
                props: {
                  children: [{ "fsds.Card.actions": { props: { children: "Inner go" } } }],
                },
              },
            },
          ],
        },
      },
    };
    expect(findRequiredRegionViolations(frame, cardActions)).toEqual([]);
  });

  it("reports the OUTER occurrence when only the inner occurrence supplies (the ownership false-pass counterexample)", () => {
    const frame = {
      "fsds.Card": {
        props: {
          children: [
            {
              "fsds.Card": {
                props: {
                  children: [{ "fsds.Card.actions": { props: { children: "Inner go" } } }],
                },
              },
            },
          ],
        },
      },
    };
    const violations = findRequiredRegionViolations(frame, cardActions);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toEqual({
      component: "Card",
      path: "/fsds.Card",
      region: "actions",
      supplied: [],
    });
  });

  it("does not let a part ref under a DIFFERENT component supply that component's occurrence", () => {
    // fsds.Card.actions inside a Field renders an orphan subcomponent element;
    // it delivers to no Card occurrence. The Card obligation (were a full Card
    // present) and the Field obligations are both un-discharged by it.
    const frame = {
      "fsds.Card": {
        props: {
          children: [
            { "fsds.Field": { props: { children: [{ "fsds.Card.actions": { props: { children: "x" } } }] } } },
          ],
        },
      },
    };
    const violations = findRequiredRegionViolations(frame, cardActions);
    expect(violations).toHaveLength(1);
    expect(violations[0].path).toBe("/fsds.Card");
    expect(violations[0].supplied).toEqual([]); // the Field-held part ref delivered nothing
  });

  it("checks obligated occurrences nested inside OTHER components' frames", () => {
    const fieldControl = obligationsFor({ Field: ["control"] });
    const frame = {
      "fsds.Card": {
        props: {
          children: [{ "fsds.Field": { props: { name: "x" } } }],
        },
      },
    };
    const violations = findRequiredRegionViolations(frame, fieldControl);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      component: "Field",
      region: "control",
      path: "/fsds.Card/children[0]/fsds.Field",
    });
  });

  it("treats slot-map content as its own ownership context (Field nested in Field's control content)", () => {
    const fieldControl = obligationsFor({ Field: ["control"] });
    const frame = {
      "fsds.Field": {
        props: { name: "outer" },
        slots: {
          control: {
            "fsds.Field": { props: { name: "inner" } }, // inner Field supplies nothing
          },
        },
      },
    };
    const violations = findRequiredRegionViolations(frame, fieldControl);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      component: "Field",
      region: "control",
      path: "/fsds.Field/slots/control/fsds.Field",
    });
  });
});

describe("findRequiredRegionViolations — dialect basics", () => {
  it("accepts node-level slots-map supply (Field dialect)", () => {
    const frame = {
      "fsds.Field": {
        props: { name: "email" },
        slots: {
          label: { "fsds.Label": { props: { children: "Email" } } },
          control: { "fsds.Input": { props: { type: "email" } } },
        },
      },
    };
    expect(findRequiredRegionViolations(frame, obligationsFor({ Field: ["control"] }))).toEqual([]);
  });

  it("accepts part-suffixed child supply (Card dialect) and reports absence with the supplied set", () => {
    const obligations = obligationsFor({ Card: ["actions"] });
    const frame = {
      "fsds.Card": {
        props: {
          children: [
            { "fsds.Card.header": { props: { children: "Title" } } },
            { "fsds.Card.actions": { props: { children: "Go" } } },
          ],
        },
      },
    };
    expect(findRequiredRegionViolations(frame, obligations)).toEqual([]);

    const missing = {
      "fsds.Card": {
        props: { children: [{ "fsds.Card.header": { props: { children: "Title" } } }] },
      },
    };
    expect(findRequiredRegionViolations(missing, obligations)).toEqual([
      { component: "Card", path: "/fsds.Card", region: "actions", supplied: ["header"] },
    ]);
  });

  it("does not count empty slot entries as supplied", () => {
    const frame = {
      "fsds.Test": { props: {}, slots: { control: null, help: "", error: false } },
    };
    expect(findRequiredRegionViolations(frame, obligationsFor({ Test: ["control"] }))).toEqual([
      { component: "Test", path: "/fsds.Test", region: "control", supplied: [] },
    ]);
  });

  it("ignores non-fsds keys and non-object garbage without throwing", () => {
    const none = obligationsFor({ Test: ["control"] });
    expect(findRequiredRegionViolations({ plain: { props: { slots: { x: 1 } } } }, none)).toEqual([]);
    expect(findRequiredRegionViolations(null, none)).toEqual([]);
    expect(findRequiredRegionViolations([1, 2, 3], none)).toEqual([]);
  });
});

describe("deriveRequiredRegionObligations — narrowing", () => {
  const base = {
    name: "Test",
    layer: "compound",
    anatomy: { parts: ["root"] },
  } as Partial<ComponentContract>;

  it("obligates a required:true named slot region rendered by anatomy.dom", () => {
    const contract = {
      ...base,
      anatomy: {
        parts: ["root", "control", "help"],
        dom: { tag: "div", part: "root", children: [{ tag: "slot", name: "control" }] },
      },
      slots: { control: { required: true }, help: { required: false } },
    } as unknown as ComponentContract;
    expect(deriveRequiredRegionObligations(contract)).toEqual([
      { component: "Test", region: "control" },
    ]);
  });

  it("excludes component-owned required anchors (the anchor-presence sense)", () => {
    const contract = {
      ...base,
      slots: { input: { required: true } },
    } as ComponentContract;
    expect(deriveRequiredRegionObligations(contract)).toEqual([]);
  });

  it("excludes the root host anchor even though the corpus marks it required", () => {
    const contract = {
      ...base,
      slots: { root: { required: true }, control: { required: false } },
    } as unknown as ComponentContract;
    expect(deriveRequiredRegionObligations(contract)).toEqual([]);
  });

  it("returns nothing for a contract with no slots declaration", () => {
    expect(deriveRequiredRegionObligations(base as ComponentContract)).toEqual([]);
  });

  it("obligates a subcomponent:true region (the Card.actions mutant shape)", () => {
    const contract = {
      ...base,
      anatomy: {
        parts: ["root", "actions"],
        details: { actions: { subcomponent: true } },
      },
      slots: { actions: { required: true } },
    } as unknown as ComponentContract;
    expect(deriveRequiredRegionObligations(contract)).toEqual([
      { component: "Test", region: "actions" },
    ]);
  });
});

describe("deriveUsageComposition — JSON date materialization", () => {
  it("materializes Date props, and Date-valued unions by the value's shape (Calendar)", () => {
    const { propMaterializers } = deriveUsageComposition(loadCorpusContract("Calendar"));
    expect(propMaterializers).toMatchObject({
      month: "date",
      defaultMonth: "date",
      minDate: "date",
      maxDate: "date",
      value: "date-union",
      defaultValue: "date-union",
    });
    // A string-or-array union (Select's selection) holds option values, not dates.
    expect(deriveUsageComposition(loadCorpusContract("Select")).propMaterializers).toEqual({});
  });
});
