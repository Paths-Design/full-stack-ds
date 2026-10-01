import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ComponentIR } from "../../ir.js";
import { assertFigmaComponentDescriptorV1 } from "./descriptor.js";
import {
  buildFigmaStackPrimitiveDescriptor,
  createFigmaEmitter,
  toFigmaComponentDescriptor,
} from "./factory.js";
import { assertFigmaStackPrimitiveDescriptorV1 } from "./primitive.js";

function fixtureIR(): ComponentIR {
  return {
    name: "Button",
    cssPrefix: "button",
    root: { element: "button", effectiveRole: "button" },
    parts: [
      {
        name: "root",
        semanticElement: "button",
        nativeTag: "button",
        isCompound: false,
        isRootOnly: true,
      },
    ],
    styledProps: [
      {
        name: "variant",
        safeName: "variant",
        type: "'primary' | 'secondary'",
        typeRefs: [],
        required: false,
        description: "Visual treatment.",
        defaultExpr: "primary",
      },
    ],
    variants: { variant: ["primary", "secondary"] },
    states: { boolean: [], enum: {} },
    classRecipe: { base: "button" },
    cssBlocks: [".button {}"],
    keyframes: [],
    behavior: {
      normalizedChannels: {},
      normalizedDismissalTriggers: [],
      normalizedEvents: {},
      form: null,
      focus: null,
      portal: null,
    },
    surface: null,
    motion: { sequence: null, countdown: null, loops: [], transitions: [], honorsReducedMotion: true, reducedMotion: null },
  } as unknown as ComponentIR;
}

describe("Figma descriptor schema", () => {
  it("accepts descriptors emitted from governed ComponentIR", () => {
    const descriptor = toFigmaComponentDescriptor(fixtureIR());
    assertFigmaComponentDescriptorV1(descriptor);
    expect(descriptor).toMatchObject({
      schemaVersion: 1,
      source: "@full-stack-ds/codegen/frameworks/figma",
      component: {
        name: "Button",
        cssPrefix: "button",
        rootElement: "button",
        effectiveRole: "button",
      },
      figma: {
        intendedUse: "figma-library-materialization",
        documentationFrame: "Button / Documentation",
        componentSetName: "Button",
        propertySource: "IR styledProps + variants + states + behavior",
      },
    });
  });

  it("rejects malformed or ungoverned descriptors", () => {
    expect(() =>
      assertFigmaComponentDescriptorV1({
        schemaVersion: 1,
        source: "hand-authored",
        component: { name: "Button" },
      }),
    ).toThrow(/source is not governed/);
  });
  it("accepts older v1 metadata but refuses executable motion claims", () => {
    const descriptor = toFigmaComponentDescriptor(fixtureIR());
    expect(() => assertFigmaComponentDescriptorV1({ ...descriptor, motion: undefined })).not.toThrow();
    expect(() => assertFigmaComponentDescriptorV1({ ...descriptor, motion: { ...descriptor.motion, realization: "sequence-budget" } })).toThrow(/descriptor-only/);
    expect(() => assertFigmaComponentDescriptorV1({ ...descriptor, motion: { realization: "descriptor-only" } })).toThrow(/MotionIR metadata/);
  });
});

describe("createFigmaEmitter", () => {
  it("emits deterministic descriptor and README transfer artifacts", () => {
    const emitter = createFigmaEmitter();
    const files = emitter.emitComponent(fixtureIR(), {
      componentsRoot: "/tmp/components",
      contractsRoot: "/tmp/contracts",
    });

    expect(files.map((file) => file.relativePath)).toEqual([
      "Button/Button.figma.json",
      "Button/README.md",
    ]);
    expect(files[0]!.preservable).toBe(false);
    // READMEs are emitted without region markers, so they are regen-owned
    // wholesale (FIX-CODEGEN-PRESERVABLE-MARKER-INVARIANT-01).
    expect(files[1]!.preservable).toBe(false);
    expect(JSON.parse(files[0]!.contents)).toEqual(toFigmaComponentDescriptor(fixtureIR()));
    expect(files[1]!.contents).toContain("transfer artifact, not the source of truth");
  });

  it("emits a JSON descriptor registry barrel without primitives by default", () => {
    const barrel = createFigmaEmitter().emitBarrel(["Button", "Input"]);
    expect(barrel).toContain('import Button from "./Button/Button.figma.json" with { type: "json" };');
    expect(barrel).toContain('import Input from "./Input/Input.figma.json" with { type: "json" };');
    expect(barrel).toContain('"Button": Button');
    expect(barrel).toContain('export type FigmaComponentName = keyof typeof figmaComponentRegistry;');
    expect(barrel).toContain('export const figmaPrimitiveRegistry = {} as const;');
    expect(barrel).not.toContain('import Stack');
  });

  it("includes Stack in the barrel when the primitive descriptor exists on disk", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "figma-barrel-"));
    const componentsRoot = path.join(root, "components");
    fs.mkdirSync(componentsRoot, { recursive: true });
    fs.mkdirSync(path.join(componentsRoot, "Button"));
    fs.writeFileSync(path.join(componentsRoot, "Button", "Button.figma.json"), "{}\n");
    const primitivesRoot = path.join(root, "primitives", "Stack");
    fs.mkdirSync(primitivesRoot, { recursive: true });
    fs.writeFileSync(path.join(primitivesRoot, "Stack.figma.json"), "{}\n");

    const barrel = createFigmaEmitter().emitBarrel(["Button"], componentsRoot);
    expect(barrel).toContain('import Stack from "../primitives/Stack/Stack.figma.json" with { type: "json" };');
    expect(barrel).toContain('export const figmaPrimitiveRegistry = {\n  "Stack": Stack,\n} as const;');
    expect(barrel).toContain('export type FigmaPrimitiveName = keyof typeof figmaPrimitiveRegistry;');
  });

  it("discovers only component directories with matching figma descriptors", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "figma-emitter-"));
    fs.mkdirSync(path.join(root, "Button"));
    fs.writeFileSync(path.join(root, "Button", "Button.figma.json"), "{}\n");
    fs.mkdirSync(path.join(root, "Input"));
    fs.writeFileSync(path.join(root, "Input", "README.md"), "partial\n");

    expect(createFigmaEmitter().discoverComponentIds(root)).toEqual(["Button"]);
  });
});

describe("buildFigmaStackPrimitiveDescriptor", () => {
  it("derives a governed Stack descriptor from the primitive contract", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "figma-primitive-"));
    const primitivesDir = path.join(root, "primitives");
    fs.mkdirSync(primitivesDir, { recursive: true });
    fs.writeFileSync(
      path.join(primitivesDir, "Stack.primitive.json"),
      JSON.stringify({
        name: "Stack",
        description: "Polymorphic layout shell.",
        props: [
          { name: "as", kind: "elementType", default: "div" },
          { name: "variant", kind: "layoutVariant", default: "vertical" },
        ],
      }),
    );

    const { relativePath, contents } = buildFigmaStackPrimitiveDescriptor(root);
    expect(relativePath).toBe("primitives/Stack/Stack.figma.json");
    const descriptor = JSON.parse(contents);
    assertFigmaStackPrimitiveDescriptorV1(descriptor);
    expect(descriptor).toMatchObject({
      schemaVersion: 1,
      source: "@full-stack-ds/codegen/frameworks/figma",
      primitive: { kind: "stack", name: "Stack" },
      variants: { variant: ["vertical", "horizontal"] },
      figma: {
        intendedUse: "figma-library-materialization",
        componentSetName: "Stack",
        propertySource: "primitive contract Stack.variant",
      },
    });
  });

  it("rejects a contract missing the variant prop", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "figma-primitive-bad-"));
    const primitivesDir = path.join(root, "primitives");
    fs.mkdirSync(primitivesDir, { recursive: true });
    fs.writeFileSync(
      path.join(primitivesDir, "Stack.primitive.json"),
      JSON.stringify({ name: "Stack", props: [{ name: "as", kind: "elementType" }] }),
    );

    expect(() => buildFigmaStackPrimitiveDescriptor(root)).toThrow(/variant.*layoutVariant/);
  });

  it("rejects a non-Stack primitive contract", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "figma-primitive-wrong-"));
    const primitivesDir = path.join(root, "primitives");
    fs.mkdirSync(primitivesDir, { recursive: true });
    fs.writeFileSync(
      path.join(primitivesDir, "Stack.primitive.json"),
      JSON.stringify({ name: "Box", props: [] }),
    );

    expect(() => buildFigmaStackPrimitiveDescriptor(root)).toThrow(/name: "Stack"/);
  });
});
