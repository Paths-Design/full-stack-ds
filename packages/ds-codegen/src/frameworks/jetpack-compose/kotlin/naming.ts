/** kotlin/naming.ts — extracted from component-source.ts under
 * CODEGEN-NATIVE-EMITTER-SPLIT-01 (verbatim move; generated output
 * byte-identical). See component-source.ts for the dispatch order. */


/** Kotlin hard keywords that cannot appear as package-name segments. */
export const KOTLIN_HARD_KEYWORDS = new Set([
  "as", "break", "class", "continue", "do", "else", "false", "for", "fun",
  "if", "in", "interface", "is", "null", "object", "package", "return",
  "super", "this", "throw", "true", "try", "typealias", "typeof", "val",
  "var", "when", "while",
]);

export function packageSegment(name: string): string {
  const segment = name.replace(/([a-z0-9])([A-Z])/g, "$1$2").toLowerCase();
  return KOTLIN_HARD_KEYWORDS.has(segment) ? `${segment}component` : segment;
}

/**
 * Kotlin parameter-name escape: hard keywords are backtick-quoted
 * (`` `as` ``), so a contract axis named `as`/`in`/`is` can still lower to
 * a composable parameter.
 */
export function kotlinParamName(name: string): string {
  return KOTLIN_HARD_KEYWORDS.has(name) ? `\`${name}\`` : name;
}

export function pascalCase(value: string): string {
  return value
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Kotlin enum-entry identifier: pascalCase plus a digit-leading guard —
 * "2xl" must not emit as an enum member (identifier starting with a digit
 * is a syntax error). Prefixes "N" so TextSize.2xl -> TextSize.N2xl.
 */
export function kotlinEnumName(value: string): string {
  const pascal = pascalCase(value);
  return /^[0-9]/.test(pascal) ? `N${pascal}` : pascal;
}
