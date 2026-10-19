/**
 * The JavaScript an html template body evaluates: the code of each `${…}`
 * hole, with quoted strings and the static text of nested templates removed.
 * A reference test over this text sees identifiers only, so markup such as
 * `<tr role="row">` never counts as a use of a local named `row`.
 */
export function templateExpressionCode(body: string): string {
  let code = "";
  let i = 0;
  while (i < body.length) {
    if (body[i] === "\\") {
      i += 2;
    } else if (body[i] === "$" && body[i + 1] === "{") {
      const hole = readHole(body, i + 2);
      code += `${hole.code} `;
      i = hole.end + 1;
    } else {
      i += 1;
    }
  }
  return code;
}

/** Read one `${…}` hole starting after its `${`; `end` is its closing brace. */
function readHole(source: string, start: number): { code: string; end: number } {
  let code = "";
  let depth = 0;
  let i = start;
  while (i < source.length) {
    const char = source[i];
    if (char === '"' || char === "'") {
      i += 1;
      while (i < source.length && source[i] !== char) i += source[i] === "\\" ? 2 : 1;
      i += 1;
      code += " ";
    } else if (char === "`") {
      i += 1;
      while (i < source.length && source[i] !== "`") {
        if (source[i] === "\\") {
          i += 2;
        } else if (source[i] === "$" && source[i + 1] === "{") {
          const hole = readHole(source, i + 2);
          code += ` ${hole.code} `;
          i = hole.end + 1;
        } else {
          i += 1;
        }
      }
      i += 1;
    } else if (char === "}" && depth === 0) {
      return { code, end: i };
    } else {
      if (char === "{") depth += 1;
      if (char === "}") depth -= 1;
      code += char;
      i += 1;
    }
  }
  return { code, end: i };
}
