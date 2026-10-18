import type { ComponentContract } from "./contract.js";
import type { BindingExpression, DomNodeIR, IterationIR, NormalizedChannelIR } from "./ir.js";

/**
 * Month-grid date selection. A `dateGrid` block names the channels and props
 * a runtime date-grid core reads; `dateGrid:` bindings read its state and
 * call its actions. The core derives the six-week grid from the visible
 * month, so the contract iterates `dateGrid:weeks` and, nested, each week's
 * `iter:item.days`.
 */
export const DATE_GRID_VALUES = ["caption", "weekdays", "weeks", "previousDisabled", "nextDisabled"] as const;
export const DATE_GRID_ACTIONS = ["previous", "next", "select", "keydown"] as const;
export type DateGridValue = typeof DATE_GRID_VALUES[number];
export type DateGridAction = typeof DATE_GRID_ACTIONS[number];
/** Runtime item type of each iterable date-grid collection. */
export const DATE_GRID_ITEM_TYPES = { weekdays: "DateGridWeekday", weeks: "DateGridWeek", days: "DateGridDay" } as const;

export interface DateGridIR {
  valueChannel: string;
  monthChannel: string;
  modeProp: string;
  localeProp: string;
  minProp?: string;
  maxProp?: string;
  disabledProp?: string;
  captionProp?: string;
}

export function parseDateGridBinding(expr: string, parse: (value: string) => BindingExpression): BindingExpression {
  const value = expr.slice("dateGrid:".length);
  if ((DATE_GRID_VALUES as readonly string[]).includes(value)) return { kind: "dateGrid", field: value as DateGridValue };
  if (value !== "select" && (DATE_GRID_ACTIONS as readonly string[]).includes(value)) return { kind: "dateGrid", action: value as DateGridAction };
  const call = value.match(/^select\((.+)\)$/);
  if (call) {
    const arg = parse(call[1]);
    if (arg.kind === "iterationLocal" && arg.local === "item" && !arg.path) return { kind: "dateGrid", action: "select", arg };
  }
  throw new Error(`DATE_GRID_BINDING_INVALID: ${expr}`);
}

/** Lower a date-grid binding against the runtime instance expression `base`. */
export function dateGridBindingExpression(binding: { field?: DateGridValue; action?: DateGridAction }, base: string, arg?: string): string {
  if (binding.field) return `${base}.state.${binding.field}`;
  return arg ? `() => ${base}.${binding.action}(${arg})` : `${base}.${binding.action}`;
}

/**
 * The JS options object a date-grid runtime is synced with, in any JS-family
 * emitter. `prop`, `value` and `setter` map contract names to the emitter's
 * runtime expressions for a prop, a channel's value and a channel's setter.
 */
export function dateGridOptions(
  grid: DateGridIR,
  prop: (name: string) => string,
  value: (channel: string) => string,
  setter: (channel: string) => string,
): string {
  const optional = (name: string | undefined) => (name === undefined ? "undefined" : prop(name));
  return `{ value: ${value(grid.valueChannel)}, month: ${value(grid.monthChannel)}, mode: ${prop(grid.modeProp)}, ` +
    `locale: ${prop(grid.localeProp)}, minDate: ${optional(grid.minProp)}, maxDate: ${optional(grid.maxProp)}, ` +
    `disabled: ${optional(grid.disabledProp)}, caption: ${optional(grid.captionProp)}, ` +
    `onValueChange: ${setter(grid.valueChannel)}, onMonthChange: ${setter(grid.monthChannel)} }`;
}

/** Static type of a date-grid value binding (`undefined` for collections and actions). */
export function dateGridValueType(binding: { field?: DateGridValue }): string | undefined {
  if (binding.field === "previousDisabled" || binding.field === "nextDisabled") return "boolean";
  if (binding.field === "caption") return "string";
  return undefined;
}

/** The item type a date-grid iteration yields, or undefined for other iterations. */
export function dateGridIterationItem(iteration: IterationIR, enclosing: IterationIR[]): string | undefined {
  const source = iteration.source;
  if (source.kind === "dateGrid" && (source.field === "weeks" || source.field === "weekdays")) return DATE_GRID_ITEM_TYPES[source.field];
  const outer = enclosing[enclosing.length - 1];
  if (source.kind === "iterationLocal" && source.local === "item" && source.path?.join(".") === "days" &&
      outer && dateGridIterationItem(outer, enclosing.slice(0, -1)) === DATE_GRID_ITEM_TYPES.weeks) {
    return DATE_GRID_ITEM_TYPES.days;
  }
  return undefined;
}

const isBinding = (value: BindingExpression | undefined, kind: string, path?: string): boolean =>
  !!value && value.kind === kind && (path === undefined || (value.kind === "iterationLocal" && value.local === "item" && value.path?.join(".") === path));

export function buildDateGridIR(contract: ComponentContract, channels: NormalizedChannelIR[], dom: DomNodeIR | undefined): DateGridIR | undefined {
  const input = contract.dateGrid;
  const fail = (reason: string): never => { throw new Error(`DATE_GRID_INVALID: ${contract.name}: ${reason}`); };
  const props = Object.values(contract.props ?? {}).flatMap((group) => group?.members ?? []);
  const prop = (name: string | undefined) => (name === undefined ? undefined : props.find((member) => member.name === name));
  const isDateRef = (name: string | undefined) => {
    const member = prop(name);
    return member?.propType?.kind === "ref" && member.propType.to === "Date";
  };

  const usages: Array<{ node: DomNodeIR; site: string; binding: BindingExpression; chain: DomNodeIR[] }> = [];
  const visit = (node: DomNodeIR, chain: DomNodeIR[]): void => {
    const sites: Array<[string, unknown]> = [
      ...Object.entries(node.bindings).map(([name, binding]): [string, unknown] => [`binding ${name}`, binding]),
      ...Object.entries(node.events).map(([name, binding]): [string, unknown] => [`event ${name}`, binding]),
      ["content", node.content],
      ["iterate.source", node.iteration?.source],
    ];
    for (const [site, binding] of sites) {
      if (typeof binding === "object" && binding !== null && "kind" in binding && binding.kind === "dateGrid") {
        usages.push({ node, site, binding: binding as BindingExpression, chain });
      }
    }
    node.children.forEach((child) => visit(child, [...chain, node]));
  };
  if (dom) visit(dom, []);
  if (!input) {
    if (usages.length > 0) fail(`dateGrid bindings (${usages[0].site}) require a dateGrid declaration`);
    return undefined;
  }

  const valueChannel = channels.find((channel) => channel.name === input.valueChannel);
  if (!valueChannel || !(valueChannel.valueType ?? "").includes("Date") || valueChannel.callbackKind === "event") {
    fail(`valueChannel "${input.valueChannel}" must name a Date-valued value channel`);
  }
  const monthChannel = channels.find((channel) => channel.name === input.monthChannel);
  if (!monthChannel || monthChannel.valueType !== "Date" || monthChannel.callbackKind === "event") {
    fail(`monthChannel "${input.monthChannel}" must name a value channel typed Date`);
  }
  if (input.monthChannel === input.valueChannel) fail("the value and month channels must differ");
  const mode = prop(input.modeProp);
  const modeType = mode?.propType?.kind === "ref" ? contract.types?.[mode.propType.to] : undefined;
  const modeValues = modeType && "values" in modeType ? [...(modeType.values as string[])].sort() : [];
  if (modeValues.join("|") !== "range|single") fail(`modeProp "${input.modeProp}" must be typed by a "single" | "range" union`);
  const locale = prop(input.localeProp);
  if (locale?.propType?.kind !== "string" || locale.translatable !== false) {
    fail(`localeProp "${input.localeProp}" must be a string prop declared translatable: false`);
  }
  for (const [field, name] of [["minProp", input.minProp], ["maxProp", input.maxProp]] as const) {
    if (name !== undefined && !isDateRef(name)) fail(`${field} "${name}" must be a Date prop`);
  }
  if (input.disabledProp !== undefined && prop(input.disabledProp)?.propType?.kind !== "boolean") {
    fail(`disabledProp "${input.disabledProp}" must be a boolean prop`);
  }
  if (input.captionProp !== undefined && prop(input.captionProp)?.propType?.kind !== "string") {
    fail(`captionProp "${input.captionProp}" must be a string prop`);
  }

  for (const { site, binding } of usages) {
    if (binding.kind !== "dateGrid") continue;
    const event = site.startsWith("event ") ? site.slice(6) : undefined;
    if (binding.action === "keydown" && event !== "keydown") fail("dateGrid:keydown must bind the keydown event");
    if ((binding.action === "previous" || binding.action === "next" || binding.action === "select") && event !== "click") {
      fail(`dateGrid:${binding.action} must bind the click event`);
    }
    if (binding.field && event) fail(`dateGrid:${binding.field} is a value, not an event handler`);
    if (site === "iterate.source" && binding.field !== "weeks" && binding.field !== "weekdays") {
      fail(`only dateGrid:weeks and dateGrid:weekdays are iterable (got dateGrid:${binding.field ?? binding.action})`);
    }
  }

  // Each iterable must name the runtime item type its emitters annotate.
  const dayNodes: Array<{ node: DomNodeIR; chain: DomNodeIR[] }> = [];
  const walk = (node: DomNodeIR, chain: DomNodeIR[], iterations: IterationIR[]): void => {
    if (node.iteration) {
      const item = dateGridIterationItem(node.iteration, iterations);
      if (item && node.iteration.itemType !== item) {
        fail(`an iteration over ${item} items must declare itemType "${item}" (got "${node.iteration.itemType ?? ""}")`);
      }
      if (item === DATE_GRID_ITEM_TYPES.days) dayNodes.push({ node, chain });
    }
    const next = node.iteration ? [...iterations, node.iteration] : iterations;
    node.children.forEach((child) => walk(child, [...chain, node], next));
  };
  if (dom) walk(dom, [], []);
  if (dayNodes.length !== 1) fail(`exactly one iteration over the week's days (iter:item.days under dateGrid:weeks) is required (got ${dayNodes.length})`);
  const [{ node: cell, chain }] = dayNodes;

  // The states block declares the selection attribute; the day cell carries it.
  const selection = Object.values(contract.states?.dimensions ?? {}).find((dimension) => dimension.category === "selection" && dimension.a11y);
  if (!selection?.a11y) fail("a selection state dimension with an a11y attribute is required");
  const { attribute, values = {} } = selection!.a11y!;
  const initial = selection!.initial ?? selection!.values[0];
  const other = selection!.values.find((value) => value !== initial);
  if (selection!.values.length !== 2 || String(values[initial]) !== "false" || other === undefined || String(values[other]) !== "true") {
    fail(`the selection dimension's ${attribute} values must map "${initial}" to "false" and "${other ?? "?"}" to "true", the selected flag's rendering`);
  }
  if (!isBinding(cell.bindings[attribute], "iterationLocal", "selected")) {
    fail(`the day cell must bind ${attribute} (states.dimensions selection a11y) to iter:item.selected`);
  }
  const subtree: DomNodeIR[] = [];
  const collect = (node: DomNodeIR) => { subtree.push(node); node.children.forEach(collect); };
  collect(cell);
  const bound = (attr: string, path: string) => subtree.some((node) => isBinding(node.bindings[attr], "iterationLocal", path));
  if (!bound("tabindex", "tabIndex")) fail("a day node must bind tabindex to iter:item.tabIndex so exactly one day is a tab stop");
  if (!bound("data-date", "key")) fail("a day node must bind data-date to iter:item.key so focus can follow keyboard moves");
  const selects = subtree.some((node) => node.events.click?.kind === "dateGrid" && node.events.click.action === "select");
  if (!selects) fail("a day node must bind click to dateGrid:select(iter:item)");
  if (!chain.some((node) => node.events.keydown?.kind === "dateGrid" && node.events.keydown.action === "keydown")) {
    fail("an ancestor of the day cells must bind keydown to dateGrid:keydown");
  }
  return { ...input };
}
