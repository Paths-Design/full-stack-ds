import { describe, expect, it } from "vitest";
import { corpusIR } from "../corpus-fixtures.js";
import { generateAngularComponentSource } from "./component-source.js";

function quotedSource(tag: string) {
  const ir = structuredClone(corpusIR("Blockquote"));
  ir.name = "QuotedPassage";
  ir.dom!.tag = tag;
  ir.parts.find(part => part.name === "root")!.nativeTag = tag;
  return generateAngularComponentSource(ir);
}

describe("Angular quotation metadata", () => {
  it.each(["blockquote", "q"])("uses an omittable cite attribute on native %s hosts", tag => {
    const source = quotedSource(tag);
    expect(source).toContain(`template: \`<${tag} `);
    expect(source).toContain('[attr.cite]="cite"');
    expect(source).not.toContain('[cite]="cite"');
  });
});
