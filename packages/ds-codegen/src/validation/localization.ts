/**
 * Localization gate: user-facing text must enter a component through the
 * contract `messages` block, never as an English literal.
 *
 * Every route a literal used to take is refused here, so a regression fails
 * `generate:check` instead of shipping untranslatable text:
 *
 *   - L10N_LITERAL_TEXT_ATTRIBUTE — a text-bearing attribute (`aria-label`,
 *     `aria-roledescription`, `aria-valuetext`, `aria-description`,
 *     `aria-placeholder`, `title`, `placeholder`, `alt`) authored in `attrs`
 *     with letter-bearing text, or bound to an expression that renders a
 *     letter-bearing literal; also any DOM `properties` binding that does.
 *   - L10N_LITERAL_CONTENT — element content whose expression renders a
 *     letter-bearing literal.
 *
 * Bindings are read with the IR's parser, so a literal counts wherever it
 * sits in the expression: `literal:` or unprefixed text, a `conditional:`
 * arm, a `selectionLabel` fallback, a value-map value or fallback.
 *   - L10N_LITERAL_PROP_DEFAULT — a string prop whose literal default holds
 *     letters. Use `defaultMessage`, or `translatable: false` when the default
 *     is not user-facing (a locale tag, an icon name).
 *   - L10N_LITERAL_INSTANCE_ATTRIBUTE — a letter-bearing static attr, or a
 *     `literal:` binding, on a `componentRef` node that feeds a translatable
 *     string prop of the referenced component. Needs the contract corpus;
 *     skipped without it.
 *
 * Letters are any Unicode letter, so the gate is not English-specific.
 * Message references themselves are validated by the IR (`validateMessages`).
 */

import type { ComponentContract, ContractDomNode, ContractValueMapBinding, StyledPropMember } from "../contract.js";
import { getPropMembers } from "../contract.js";
import { parseBindingExpression } from "../ir.js";
import { visitBinding } from "../messages.js";
import type { ValidationIssue } from "../validate.js";

export const TEXT_BEARING_ATTRIBUTES: ReadonlySet<string> = new Set([
  "aria-label",
  "aria-roledescription",
  "aria-valuetext",
  "aria-description",
  "aria-placeholder",
  "title",
  "placeholder",
  "alt",
]);

const LETTER = /\p{L}/u;

function hasLetters(text: string): boolean {
  return LETTER.test(text);
}

/**
 * Letter-bearing literal text a binding would render. The binding is read
 * with the IR's own parser, so every literal operand counts wherever it
 * sits: a `literal:` or unprefixed string, a `conditional:` arm, a
 * `selectionLabel` fallback, or a value-map value or fallback.
 */
function literalTexts(value: string | ContractValueMapBinding): string[] {
  if (typeof value !== "string") {
    const arms = [...Object.values(value.values ?? {}), ...(value.fallback === undefined ? [] : [value.fallback])];
    return [...literalTexts(value.source), ...arms.filter(hasLetters)];
  }
  let expr;
  try {
    expr = parseBindingExpression(value);
  } catch {
    return []; // malformed: the IR build reports it
  }
  const out: string[] = [];
  visitBinding(expr, (e) => {
    if (e.kind === "literal" && hasLetters(e.value)) out.push(e.value);
  });
  return out;
}

function isStringProp(member: StyledPropMember): boolean {
  if (member.propType) return member.propType.kind === "string";
  return typeof member.type === "string" && /^string(\s*\|\s*(undefined|null))*$/.test(member.type.trim());
}

function translatableStringProp(member: StyledPropMember | undefined): boolean {
  return member !== undefined && isStringProp(member) && member.translatable !== false;
}

export function validateLocalization(
  contract: ComponentContract,
  allContracts?: ReadonlyMap<string, ComponentContract>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const advice = "declare it in the messages block and reference it with message:<key>";

  const walk = (node: ContractDomNode, pointer: string) => {
    for (const [name, value] of Object.entries(node.attrs ?? {})) {
      if (TEXT_BEARING_ATTRIBUTES.has(name) && typeof value === "string" && hasLetters(value)) {
        issues.push({
          pointer: `${pointer}/attrs/${name}`,
          message: `[L10N_LITERAL_TEXT_ATTRIBUTE] "${name}" carries literal text "${value}"; ${advice}`,
        });
      }
    }
    for (const [name, value] of Object.entries(node.bindings ?? {})) {
      if (!TEXT_BEARING_ATTRIBUTES.has(name)) continue;
      for (const text of literalTexts(value)) {
        issues.push({
          pointer: `${pointer}/bindings/${name}`,
          message: `[L10N_LITERAL_TEXT_ATTRIBUTE] "${name}" binds literal text "${text}"; ${advice}`,
        });
      }
    }
    // DOM properties hold property-only facts (`indeterminate`); none carries text.
    for (const [name, value] of Object.entries(node.properties ?? {})) {
      for (const text of literalTexts(value)) {
        issues.push({
          pointer: `${pointer}/properties/${name}`,
          message: `[L10N_LITERAL_TEXT_ATTRIBUTE] property "${name}" binds literal text "${text}"; ${advice}`,
        });
      }
    }
    if (typeof node.content === "string") {
      for (const text of literalTexts(node.content)) {
        issues.push({
          pointer: `${pointer}/content`,
          message: `[L10N_LITERAL_CONTENT] content renders literal text "${text}"; ${advice}`,
        });
      }
    }
    if (node.componentRef && allContracts) {
      const target = allContracts.get(node.componentRef.replace(/^fsds\./, ""));
      if (target) {
        const targetProps = new Map(getPropMembers(target).map((m) => [m.name, m]));
        for (const [name, value] of Object.entries(node.attrs ?? {})) {
          if (TEXT_BEARING_ATTRIBUTES.has(name)) continue;
          if (typeof value === "string" && hasLetters(value) && translatableStringProp(targetProps.get(name))) {
            issues.push({
              pointer: `${pointer}/attrs/${name}`,
              message:
                `[L10N_LITERAL_INSTANCE_ATTRIBUTE] "${name}" passes literal text "${value}" to ` +
                `${target.name}'s translatable prop; ${advice}`,
            });
          }
        }
        for (const [name, value] of Object.entries(node.bindings ?? {})) {
          if (TEXT_BEARING_ATTRIBUTES.has(name)) continue;
          if (!translatableStringProp(targetProps.get(name))) continue;
          for (const text of literalTexts(value)) {
            issues.push({
              pointer: `${pointer}/bindings/${name}`,
              message:
                `[L10N_LITERAL_INSTANCE_ATTRIBUTE] "${name}" binds literal text "${text}" to ` +
                `${target.name}'s translatable prop; ${advice}`,
            });
          }
        }
      }
    }
    (node.children ?? []).forEach((child, index) => walk(child, `${pointer}/children/${index}`));
  };
  if (contract.anatomy && !Array.isArray(contract.anatomy) && contract.anatomy.dom) {
    walk(contract.anatomy.dom, "/anatomy/dom");
  }

  for (const [bucket, group] of Object.entries(contract.props ?? {})) {
    for (const [index, member] of (group?.members ?? []).entries()) {
      if (typeof member.default === "string" && hasLetters(member.default) && translatableStringProp(member)) {
        issues.push({
          pointer: `/props/${bucket}/members/${index}/default`,
          message:
            `[L10N_LITERAL_PROP_DEFAULT] prop "${member.name}" defaults to literal text "${member.default}"; ` +
            `use defaultMessage, or translatable: false when the default is not user-facing`,
        });
      }
    }
  }
  return issues;
}
