import type { ComponentContract } from "./contract.js";
import type { DomNodeIR, NormalizedChannelIR } from "./ir.js";

export const PAGED_VALUES = ["index", "count", "ordinal", "draft", "disabled", "previousDisabled", "nextDisabled"] as const;
export const PAGED_ACTIONS = ["request", "previous", "next", "edit", "commit", "commitOnEnter", "cancel"] as const;
export type PagedValue = typeof PAGED_VALUES[number];
export type PagedAction = typeof PAGED_ACTIONS[number];
export interface PagedSetIR { channel: string; itemsProp: string; countProp?: string; disabledProp?: string }

/** A content-neutral collection policy, independent of rendered parts. */
export function buildPagedSetIR(contract: ComponentContract, channels: NormalizedChannelIR[], dom: DomNodeIR | undefined): PagedSetIR | undefined {
  const input = contract.pagedSet;
  const fail = (reason: string): never => { throw new Error(`PAGED_SET_INVALID: ${contract.name}: ${reason}`); };
  const props = Object.values(contract.props ?? {}).flatMap(group => group?.members ?? []);
  if (input) {
    const channel = channels.find(channel => channel.name === input.channel);
    if (channel?.valueType !== "number" || channel.callbackKind !== "value") fail("requires a numeric value channel");
    if (!props.some(prop => prop.name === input.itemsProp && prop.propType?.kind === "array")) fail("itemsProp must name an array");
    for (const [name, kind] of [[input.countProp, "number"], [input.disabledProp, "boolean"]]) {
      if (name && !props.some(prop => prop.name === name && (prop.type === kind || prop.propType?.kind === kind))) fail(`${name} must be ${kind}`);
    }
    if (contract.sequence?.channel === input.channel) fail("a sequence and paged set cannot both own the same request channel");
  }
  const inspect = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if ("kind" in value && value.kind === "paged" && !input) fail("paged bindings require a pagedSet declaration");
    for (const child of Object.values(value)) inspect(child);
  };
  if (dom) inspect(dom);
  const visit = (node: DomNodeIR): void => {
    for (const [event, binding] of Object.entries(node.events)) {
      if (binding.kind !== "paged") continue;
      if ((binding.action === "edit" || binding.action === "request" && !binding.arg) && !node.componentRef) fail("value-payload actions require a typed component callback");
      if (binding.action === "commitOnEnter" && event !== "keydown") fail("commitOnEnter requires keydown");
    }
    node.children.forEach(visit);
  };
  if (dom) visit(dom);
  return input ? { ...input } : undefined;
}

export function pagedBindingExpression(binding: { field?: PagedValue; action?: PagedAction; arg?: unknown }, base: string, arg?: string): string {
  if (binding.field) return `${base}.state.${binding.field}`;
  return binding.arg ? `() => ${base}.${binding.action}(${arg})` : `${base}.${binding.action}`;
}
