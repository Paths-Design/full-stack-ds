import type { ComponentIR } from "../../../ir.js";
// Shared native emission-class substrate: the radio-collection facts are
// pure IR extraction (dom role, compositeControl, iteration, member
// bindings, defined-type alias) and live there once for both native
// targets (FEAT-COMPOSE-RADIO-ADMISSION-01).
import { radioGroupFacts } from "../../native-emission-class.js";

/** Native radio collection: identity, label, disabled state and writes all come from IR. */
export function emitNativeRadioGroup(ir: ComponentIR, exportName: string): string | undefined {
  const facts = radioGroupFacts(ir);
  if (!facts) return undefined;
  const {
    optionsProp,
    itemType: type,
    members,
    valueMember,
    labelMember,
    disabledMember,
    helpMember,
    disabledOptional,
    channel,
    defaultValueProp: defaultValue,
    labelProp,
    orientation,
  } = facts;
  const hasOrientation = orientation !== undefined;

  const params = [
    `${optionsProp}: [${type}]`,
    `${channel.valueProp}: Binding<String>? = nil`,
    ...(defaultValue ? [`${defaultValue}: String = ""`] : []),
    `${channel.changeHandlerProp}: ((String) -> Void)? = nil`,
    ...(labelProp ? [`${labelProp}: String = ""`] : []),
    ...(hasOrientation ? [`orientation: ${orientation.typeName} = .${orientation.defaultMember}`] : []),
  ];
  const lines = ["// @generated:start component", `public struct ${type} {`];
  for (const field of members) lines.push(`    public let ${field.name}: ${field.type}${field.optional ? "?" : ""}`);
  lines.push(`    public init(${members.map((field) => `${field.name}: ${field.type}${field.optional ? "? = nil" : ""}`).join(", ")}) {`);
  for (const field of members) lines.push(`        self.${field.name} = ${field.name}`);
  lines.push("    }", "}", "", "/// Native single-choice Picker; web form names have no SwiftUI transport meaning.",
    `public struct ${exportName}: View {`, `    private let ${optionsProp}: [${type}]`,
    "    @ControllableState private var selection: ControllableValue<String>");
  if (labelProp) lines.push(`    private let ${labelProp}: String`);
  if (hasOrientation) lines.push(`    private let orientation: ${orientation.typeName}`);
  lines.push("", `    public init(${params.join(", ")}) {`, `        self.${optionsProp} = ${optionsProp}`,
    `        self._selection = ControllableState(controlled: ${channel.valueProp}, defaultValue: ${defaultValue ?? '""'}, onChange: ${channel.changeHandlerProp})`);
  if (labelProp) lines.push(`        self.${labelProp} = ${labelProp}`);
  if (hasOrientation) lines.push("        self.orientation = orientation");
  lines.push("    }", "", "    private var choices: some View {",
    `        SwiftUI.Picker(${labelProp ?? '""'}, selection: selection.binding()) {`,
    `            ForEach(${optionsProp}, id: \\.${valueMember}) { item in`,
    `                SwiftUI.Text(verbatim: item.${labelMember}).tag(item.${valueMember})`);
  if (disabledMember) lines.push(`                    .disabled(item.${disabledMember}${disabledOptional ? " ?? false" : ""})`);
  if (helpMember) {
    const optional = members.find((entry) => entry.name === helpMember)?.optional;
    lines.push(`                    .help(item.${helpMember}${optional ? ' ?? ""' : ""})`);
  }
  lines.push("            }", "        }", "        .pickerStyle(.radioGroup)", "    }", "", "    public var body: some View {");
  if (hasOrientation) lines.push("        if orientation == .horizontal {", "            choices.horizontalRadioGroupLayout()", "        } else {", "            choices", "        }");
  else lines.push("        choices");
  lines.push("    }", "}", "// @generated:end");
  return lines.join("\n");
}
