import type { ComponentIR } from "../../ir.js";
import { emitNonReactTypeAliases } from "../../non-react-types.js";
import { renderSections } from "../../preserve.js";

// These props use Svelte-native types and instance bindings rather than contract aliases.
export const SVELTE_SKIP_PROPS = new Set(["class", "style", "className", "children"]);

export function sveltePublicTypeAliases(ir: ComponentIR): string[] {
  return emitNonReactTypeAliases({
    ...ir,
    styledProps: ir.styledProps.filter((prop) => !SVELTE_SKIP_PROPS.has(prop.name)),
  });
}

export function emitSveltePublicTypeModule(ir: ComponentIR): string {
  const body = sveltePublicTypeAliases(ir).join("\n");
  if (!body) return "";
  return [
    '<script module lang="ts">',
    renderSections([{ kind: "generated", id: "publicTypes", body }], "line"),
    "</script>",
    "",
    "",
  ].join("\n");
}
