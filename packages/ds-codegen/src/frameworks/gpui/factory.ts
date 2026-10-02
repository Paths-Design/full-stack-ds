import fs from "node:fs";
import path from "node:path";
import type { FrameworkEmitter } from "../../emitter.js";
import type { ComponentIR, DomNodeIR } from "../../ir.js";

function snake(name: string): string {
  const result = name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
  if (!/^[a-z][a-z0-9_]*$/.test(result) || ["self", "super", "crate", "type", "mod", "fn", "match", "default", "new", "request_change"].includes(result)) {
    throw new Error(`GPUI_UNSUPPORTED_IDENTIFIER: ${name}`);
  }
  return result;
}

function booleanDefault(ir: ComponentIR, name: string | undefined): string {
  const expr = ir.styledProps.find(p => p.name === name)?.defaultExpr ?? "false";
  if (expr !== "true" && expr !== "false") throw new Error(`GPUI_UNSUPPORTED_DEFAULT: ${ir.name}.${name}`);
  return expr;
}

/** Source fact: normalized Boolean form-control and channel bindings.
 * Applies by: value model, commit semantic, callback kind and invoking part.
 * Removable when: GPUI gains a broader admitted control substrate.
 * This pilot collapses anatomy into a pointer-operated Boolean affordance.
 */
export function gpuiPlan(ir: ComponentIR) {
  const control = ir.formControl;
  if (!control || control.valueModel !== "boolean" || !["change", "activation"].includes(control.commit) || ir.surface || ir.interaction || ir.compositeControl || ir.motion.sequence) {
    throw new Error(`GPUI_UNSUPPORTED_SHAPE: ${ir.name}`);
  }
  const channel = control.channel;
  if (channel.valueType !== "boolean" || channel.callbackKind !== "value" || channel.enabledByProp || ir.behavior.normalizedChannels.length !== 1) {
    throw new Error(`GPUI_UNSUPPORTED_CHANNEL: ${ir.name}`);
  }
  const nodes: DomNodeIR[] = [];
  const walk = (node: DomNodeIR) => { nodes.push(node); node.children.forEach(walk); };
  if (ir.dom) walk(ir.dom);
  const host = nodes.find(node => node.part === control.part.name);
  const disabled = host?.bindings.disabled;
  if (disabled && (disabled.kind !== "prop" || disabled.path?.length)) throw new Error(`GPUI_UNSUPPORTED_DISABLED_BINDING: ${ir.name}`);
  const disabledProp = disabled?.kind === "prop" ? disabled.prop : undefined;
  const realized = new Set([channel.valueProp, channel.defaultValueProp, channel.changeHandlerProp, disabledProp]);
  // These known pilot omissions stay visible in each generated receipt. A new
  // prop requires review rather than silently joining the unsupported set.
  const omitted = new Set(["size", "name", "value", "ariaLabel", "ariaDescribedby", "idBase"]);
  for (const prop of ir.styledProps) {
    if (!realized.has(prop.name) && !omitted.has(prop.name)) throw new Error(`GPUI_UNSUPPORTED_PROP: ${ir.name}.${prop.name}`);
  }
  const valueMethod = snake(channel.valueProp);
  const defaultMethod = channel.defaultValueProp ? snake(channel.defaultValueProp) : undefined;
  const disabledMethod = disabledProp ? snake(disabledProp) : undefined;
  const methods = [valueMethod, defaultMethod, disabledMethod].filter(Boolean);
  if (new Set(methods).size !== methods.length) throw new Error(`GPUI_IDENTIFIER_COLLISION: ${ir.name}`);
  if (!/^[A-Z][A-Za-z0-9]*$/.test(ir.name)) throw new Error(`GPUI_UNSUPPORTED_IDENTIFIER: ${ir.name}`);
  return {
    channel, part: control.part.name, valueMethod, defaultMethod, disabledMethod,
    defaultValue: booleanDefault(ir, channel.defaultValueProp),
    disabledDefault: booleanDefault(ir, disabledProp),
    excludedProps: ir.styledProps.filter(p => !realized.has(p.name)).map(p => p.name),
  };
}

export function createGpuiEmitter(): FrameworkEmitter {
  return {
    id: "gpui",
    discoverComponentIds: root => fs.existsSync(root) ? fs.readdirSync(root).filter(name => fs.existsSync(path.join(root, name, `${name}.rs`))).sort() : [],
    emitComponent(ir) {
      const plan = gpuiPlan(ir);
      const q = JSON.stringify;
      // Source fact: GPUI Render/Entity/EventEmitter API and Rust module grammar.
      // Applies by: the admitted Boolean control plan. Removable when: API changes.
      const source = `// Generated from ${ir.name} contract IR. Do not hand-edit.
use gpui::{prelude::*, div, Context, EventEmitter, SharedString, Window};
use crate::control::{BooleanState, ChangeRequest};

pub struct ${ir.name} {
    pub state: BooleanState,
    pub label: SharedString,
}

impl Default for ${ir.name} {
    fn default() -> Self {
        let mut state = BooleanState::new(${plan.defaultValue});
        state.disabled = ${plan.disabledDefault};
        Self { state, label: SharedString::default() }
    }
}

impl ${ir.name} {
    pub const CHANNEL: &'static str = ${q(plan.channel.name)};
    pub const CHANGE_HANDLER: &'static str = ${q(plan.channel.changeHandlerProp)};
    pub const CONTROL_PART: &'static str = ${q(plan.part)};

    pub fn ${plan.valueMethod}(mut self, value: Option<bool>) -> Self {
        self.state.controlled = value;
        self
    }
${plan.defaultMethod ? `
    /// Initialize before attaching the view to an Entity.
    pub fn ${plan.defaultMethod}(mut self, value: bool) -> Self {
        let controlled = self.state.controlled;
        let disabled = self.state.disabled;
        self.state = BooleanState::new(value);
        self.state.controlled = controlled;
        self.state.disabled = disabled;
        self
    }
` : ""}${plan.disabledMethod ? `
    pub fn ${plan.disabledMethod}(mut self, value: bool) -> Self {
        self.state.disabled = value;
        self
    }
` : ""}
    pub fn request_change(&mut self) -> Option<ChangeRequest> {
        self.state.request_toggle().map(|value| ChangeRequest {
            channel: Self::CHANNEL, handler: Self::CHANGE_HANDLER, value,
        })
    }
}

impl EventEmitter<ChangeRequest> for ${ir.name} {}

impl Render for ${ir.name} {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        div().id(${q(ir.cssPrefix)}).flex().gap_2()
            .child(self.label.clone())
            .child(if self.state.value() { "●" } else { "○" })
            .on_click(cx.listener(|this, _, _, cx| {
                if let Some(request) = this.request_change() {
                    cx.emit(request);
                    cx.notify();
                }
            }))
    }
}
`;
      return [
        { relativePath: `${ir.name}/${ir.name}.rs`, contents: source },
        { relativePath: `${ir.name}/capabilities.json`, contents: JSON.stringify({
          operation: "boolean-control", channel: plan.channel, controlPart: plan.part,
          excludedProps: plan.excludedProps,
          omissions: ["keyboard", "accessibility", "form-submission", "field-association", "compound-anatomy", "tokens", "variants", "motion"],
          presentation: "consumer-supplied visible label and Boolean indicator; no token projection",
          proof: "requires-real-gpui-compile-and-policy-tests; no-rendered-runtime-admission",
        }, null, 2) + "\n" },
      ];
    },
    emitTests: () => [],
    emitBarrel: names => names.slice().sort().map(name => `#[path = "${name}/${name}.rs"]\nmod ${snake(name)};\npub use ${snake(name)}::${name};`).join("\n") + "\n",
  };
}
