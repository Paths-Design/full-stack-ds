import type { ComponentContract } from "./contract.js";
import type { BindingExpression, DomNodeIR, IterationIR, NormalizedChannelIR } from "./ir.js";

/**
 * Dual-listbox transfer. A `transfer` block names the value channel (the ids
 * in the selected list, in transfer order) and the options prop (every
 * candidate id, in display order) a runtime transfer-list core reads;
 * `transfer:` bindings read its state and call its actions. The core derives
 * the available list (options outside the value) and the selected list, so
 * the contract iterates `transfer:available` and `transfer:selected`.
 */
export const TRANSFER_VALUES = ["available", "selected", "addDisabled", "removeDisabled"] as const;
export const TRANSFER_ACTIONS = ["add", "remove", "keydown", "toggle"] as const;
export type TransferValue = typeof TRANSFER_VALUES[number];
export type TransferAction = typeof TRANSFER_ACTIONS[number];
/** Runtime item type of both transfer-list collections. */
export const TRANSFER_ITEM_TYPE = "TransferListItem";
export const TRANSFER_SIDES = ["available", "selected"] as const;

export interface TransferIR {
  valueChannel: string;
  optionsProp: string;
}

export function parseTransferBinding(expr: string, parse: (value: string) => BindingExpression): BindingExpression {
  const value = expr.slice("transfer:".length);
  if ((TRANSFER_VALUES as readonly string[]).includes(value)) return { kind: "transfer", field: value as TransferValue };
  if (value !== "toggle" && (TRANSFER_ACTIONS as readonly string[]).includes(value)) return { kind: "transfer", action: value as TransferAction };
  const call = value.match(/^toggle\((.+)\)$/);
  if (call) {
    const arg = parse(call[1]);
    if (arg.kind === "iterationLocal" && arg.local === "item" && !arg.path) return { kind: "transfer", action: "toggle", arg };
  }
  throw new Error(`TRANSFER_BINDING_INVALID: ${expr}`);
}

/** Lower a transfer binding against the runtime instance expression `base`. */
export function transferBindingExpression(binding: { field?: TransferValue; action?: TransferAction }, base: string, arg?: string): string {
  if (binding.field) return `${base}.state.${binding.field}`;
  return arg ? `() => ${base}.${binding.action}(${arg})` : `${base}.${binding.action}`;
}

/**
 * The JS options object a transfer-list runtime is synced with, in any
 * JS-family emitter. `prop`, `value` and `setter` map contract names to the
 * emitter's runtime expressions for a prop, a channel's value and a channel's
 * setter.
 */
export function transferOptions(
  transfer: TransferIR,
  prop: (name: string) => string,
  value: (channel: string) => string,
  setter: (channel: string) => string,
): string {
  return `{ options: ${prop(transfer.optionsProp)} ?? [], value: ${value(transfer.valueChannel)} ?? [], ` +
    `onValueChange: ${setter(transfer.valueChannel)} }`;
}

/** Static type of a transfer value binding (`undefined` for collections and actions). */
export function transferValueType(binding: { field?: TransferValue }): string | undefined {
  return binding.field === "addDisabled" || binding.field === "removeDisabled" ? "boolean" : undefined;
}

/** The item type a transfer iteration yields, or undefined for other iterations. */
export function transferIterationItem(iteration: IterationIR): string | undefined {
  const source = iteration.source;
  return source.kind === "transfer" && (source.field === "available" || source.field === "selected") ? TRANSFER_ITEM_TYPE : undefined;
}

const isItemBinding = (value: BindingExpression | undefined, path: string): boolean =>
  !!value && value.kind === "iterationLocal" && value.local === "item" && value.path?.join(".") === path;

/** Tags the browser makes focusable or activatable on their own. */
const FOCUSABLE_TAGS = new Set(["a", "button", "input", "select", "textarea", "summary", "details"]);
const isInteractive = (node: DomNodeIR): boolean =>
  node.componentRef !== undefined || FOCUSABLE_TAGS.has(node.tag) ||
  "tabindex" in node.attrs || "tabindex" in node.bindings || Object.keys(node.events).length > 0;

export function buildTransferIR(contract: ComponentContract, channels: NormalizedChannelIR[], dom: DomNodeIR | undefined): TransferIR | undefined {
  const input = contract.transfer;
  const fail = (reason: string): never => { throw new Error(`TRANSFER_INVALID: ${contract.name}: ${reason}`); };

  const usages: Array<{ node: DomNodeIR; site: string; binding: BindingExpression }> = [];
  const visit = (node: DomNodeIR): void => {
    const sites: Array<[string, unknown]> = [
      ...Object.entries(node.bindings).map(([name, binding]): [string, unknown] => [`binding ${name}`, binding]),
      ...Object.entries(node.events).map(([name, binding]): [string, unknown] => [`event ${name}`, binding]),
      ["content", node.content],
      ["iterate.source", node.iteration?.source],
    ];
    for (const [site, binding] of sites) {
      if (typeof binding === "object" && binding !== null && "kind" in binding && binding.kind === "transfer") {
        usages.push({ node, site, binding: binding as BindingExpression });
      }
    }
    node.children.forEach(visit);
  };
  if (dom) visit(dom);
  if (!input) {
    if (usages.length > 0) fail(`transfer bindings (${usages[0].site}) require a transfer declaration`);
    return undefined;
  }

  const valueChannel = channels.find((channel) => channel.name === input.valueChannel);
  if (!valueChannel || valueChannel.valueType !== "string[]" || valueChannel.callbackKind === "event") {
    fail(`valueChannel "${input.valueChannel}" must name a value channel typed string[]`);
  }
  const props = Object.values(contract.props ?? {}).flatMap((group) => group?.members ?? []);
  const options = props.find((member) => member.name === input.optionsProp)?.propType;
  if (options?.kind !== "array" || options.items?.kind !== "string") fail(`optionsProp "${input.optionsProp}" must be an array of strings`);

  for (const { site, binding } of usages) {
    if (binding.kind !== "transfer") continue;
    const event = site.startsWith("event ") ? site.slice(6) : undefined;
    if (binding.action === "keydown" && event !== "keydown") fail("transfer:keydown must bind the keydown event");
    if ((binding.action === "add" || binding.action === "remove" || binding.action === "toggle") && event !== "click") {
      fail(`transfer:${binding.action} must bind the click event`);
    }
    if (binding.field && event) fail(`transfer:${binding.field} is a value, not an event handler`);
    if (site === "iterate.source" && binding.field !== "available" && binding.field !== "selected") {
      fail(`only transfer:available and transfer:selected are iterable (got transfer:${binding.field ?? binding.action})`);
    }
  }

  // The states block declares the mark attribute; every option carries it.
  const mark = Object.values(contract.states?.dimensions ?? {}).find((dimension) => dimension.category === "selection" && dimension.a11y);
  if (!mark?.a11y) fail("a selection state dimension with an a11y attribute is required for the transfer mark");
  const { attribute, values = {} } = mark!.a11y!;
  const initial = mark!.initial ?? mark!.values[0];
  const marked = mark!.values.find((value) => value !== initial);
  if (mark!.values.length !== 2 || String(values[initial]) !== "false" || marked === undefined || String(values[marked]) !== "true") {
    fail(`the selection dimension's ${attribute} values must map "${initial}" to "false" and "${marked ?? "?"}" to "true", the mark's rendering`);
  }

  // Each side is one listbox that iterates its collection, carries the side
  // the runtime reads, and hands its key presses to the runtime.
  const lists = new Map<string, DomNodeIR>();
  const walk = (node: DomNodeIR, parent: DomNodeIR | undefined): void => {
    if (node.iteration && transferIterationItem(node.iteration)) {
      const source = node.iteration.source as { kind: "transfer"; field: string };
      if (node.iteration.itemType !== TRANSFER_ITEM_TYPE) {
        fail(`the transfer:${source.field} iteration must declare itemType "${TRANSFER_ITEM_TYPE}" (got "${node.iteration.itemType ?? ""}")`);
      }
      if (lists.has(source.field)) fail(`transfer:${source.field} is iterated more than once`);
      if (!parent) fail(`the transfer:${source.field} options need an enclosing listbox`);
      lists.set(source.field, parent!);
      // The listbox pattern: the option is the control, one tab stop per
      // list, its mark announced with the focus.
      if (node.attrs.role !== "option") fail(`the transfer:${source.field} items must declare role="option"`);
      if (!isItemBinding(node.bindings[attribute], "marked")) fail(`the transfer:${source.field} items must bind ${attribute} to iter:item.marked`);
      if (!isItemBinding(node.bindings.tabindex, "tabIndex")) fail(`the transfer:${source.field} items must bind tabindex to iter:item.tabIndex`);
      if (!isItemBinding(node.bindings["data-value"], "key")) fail(`the transfer:${source.field} items must bind data-value to iter:item.key`);
      if (node.events.click?.kind !== "transfer" || node.events.click.action !== "toggle") {
        fail(`the transfer:${source.field} items must bind click to transfer:toggle(iter:item)`);
      }
      const descendants: DomNodeIR[] = [];
      const collect = (child: DomNodeIR) => { descendants.push(child); child.children.forEach(collect); };
      node.children.forEach(collect);
      const nested = descendants.find(isInteractive);
      if (nested) fail(`the transfer:${source.field} items must contain no focusable or interactive element (found <${nested.tag}>)`);
    }
    node.children.forEach((child) => walk(child, node));
  };
  if (dom) walk(dom, undefined);
  for (const side of TRANSFER_SIDES) {
    const list = lists.get(side);
    if (!list) fail(`transfer:${side} must be iterated`);
    if (list!.attrs.role !== "listbox") fail(`the ${side} options' parent must declare role="listbox"`);
    if (list!.attrs["data-side"] !== side) fail(`the ${side} listbox must declare data-side="${side}"`);
    if (list!.attrs["aria-multiselectable"] !== "true") fail(`the ${side} listbox must declare aria-multiselectable="true"; several options can be marked`);
    if (list!.events.keydown?.kind !== "transfer" || list!.events.keydown.action !== "keydown") {
      fail(`the ${side} listbox must bind keydown to transfer:keydown`);
    }
  }
  return { ...input };
}
