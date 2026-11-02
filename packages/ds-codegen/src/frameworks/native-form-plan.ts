/**
 * Native text-input and associated-label facts shared by the engine targets.
 * The contract and normalized IR select these shapes; component names do not.
 */
import type { ComponentIR, DomNodeIR } from "../ir.js";

export interface NativeTextInputPlan {
  kind: "text-input";
  part: string;
  channel: string;
  valueProp: string;
  defaultValueProp?: string;
  changeHandlerProp: string;
  placeholderProp?: string;
  disabledProp?: string;
  invalidProp?: string;
  requiredProp?: string;
  typeProp?: string;
  nameProp?: string;
  ariaLabelProp?: string;
  ariaLabelledbyProp?: string;
}

export interface NativeAssociatedLabelPlan {
  kind: "associated-label";
  part: string;
  targetProp: string;
  formProp?: string;
}

export type NativeFormPlan = NativeTextInputPlan | NativeAssociatedLabelPlan;

function formError(ir: ComponentIR, message: string): never {
  throw new Error(`NATIVE_FORM_UNSUPPORTED: ${ir.name} ${message}`);
}

function partNode(root: DomNodeIR, part: string): DomNodeIR[] {
  return [root, ...root.children.flatMap(child => partNode(child, part))].filter(node => node.part === part);
}

function propBinding(ir: ComponentIR, node: DomNodeIR, attribute: string): string | undefined {
  const binding = node.bindings[attribute];
  if (binding === undefined) return undefined;
  if (binding.kind !== "prop" || binding.path?.length) {
    formError(ir, `${attribute} must bind directly to a declared prop`);
  }
  return binding.prop;
}

function optionalProp(ir: ComponentIR, node: DomNodeIR, attribute: string, key: string): Record<string, string> {
  const prop = propBinding(ir, node, attribute);
  return prop === undefined ? {} : { [key]: prop };
}

export function nativeFormPlan(ir: ComponentIR): NativeFormPlan | undefined {
  const form = ir.formControl;
  if (form?.valueModel === "text") {
    // Composite fields can declare a text channel on a nested input. Their
    // existing shell lowerings own that anatomy; this plan claims root hosts.
    if (!ir.dom || ir.dom.part !== form.part.name || !["input", "textarea"].includes(ir.dom.tag)) return undefined;
    if (form.commit !== "input") formError(ir, "text input needs an input commit");
    const matches = partNode(ir.dom, form.part.name);
    if (matches.length !== 1 || !["input", "textarea"].includes(matches[0]!.tag)) {
      formError(ir, `text part ${form.part.name} needs one native input host`);
    }
    const node = matches[0]!;
    const value = node.bindings.value;
    if (value?.kind !== "channel" || value.channel !== form.channel.name || value.field !== "value") {
      formError(ir, `text part ${form.part.name} must bind its value to channel ${form.channel.name}`);
    }
    const channel = form.channel;
    return {
      kind: "text-input",
      part: form.part.name,
      channel: channel.name,
      valueProp: channel.valueProp,
      ...(channel.defaultValueProp ? { defaultValueProp: channel.defaultValueProp } : {}),
      changeHandlerProp: channel.changeHandlerProp,
      ...optionalProp(ir, node, "placeholder", "placeholderProp"),
      ...optionalProp(ir, node, "disabled", "disabledProp"),
      ...optionalProp(ir, node, "aria-invalid", "invalidProp"),
      ...optionalProp(ir, node, "required", "requiredProp"),
      ...optionalProp(ir, node, "type", "typeProp"),
      ...optionalProp(ir, node, "name", "nameProp"),
      ...optionalProp(ir, node, "aria-label", "ariaLabelProp"),
      ...optionalProp(ir, node, "aria-labelledby", "ariaLabelledbyProp"),
    };
  }
  if (form || !ir.dom || ir.dom.tag !== "label") return undefined;
  const targetProp = propBinding(ir, ir.dom, "htmlFor");
  if (!targetProp) return undefined;
  if (ir.dom.children.length !== 1 || ir.dom.children[0]!.tag !== "children") {
    formError(ir, "associated label needs one consumer content insertion");
  }
  const formProp = propBinding(ir, ir.dom, "form");
  return { kind: "associated-label", part: ir.dom.part ?? "root", targetProp, ...(formProp ? { formProp } : {}) };
}
