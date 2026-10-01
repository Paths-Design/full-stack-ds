import type { ComponentBundle, DomNode, Framework } from "../types/data";

/** Inline the stylesheet closure of the authored component composition. */
export function compositionCss(components: readonly ComponentBundle[], name: string, framework: Framework): string {
  const byName = new Map(components.map(component => [component.name, component]));
  const visited = new Set<string>();
  const styles: string[] = [];
  const visit = (name: string) => {
    if (visited.has(name)) return;
    const component = byName.get(name);
    if (!component) throw new Error(`Preview composition requires component ${name}`);
    visited.add(name);
    const anatomy = component.contract.anatomy;
    const walk = (node: DomNode) => {
      if (node.componentRef) visit(node.componentRef.replace(/^fsds\./, ""));
      node.children?.forEach(walk);
    };
    if (anatomy && !Array.isArray(anatomy) && anatomy.dom) walk(anatomy.dom);
    const css = component.sources[framework]?.css?.code;
    if (css) styles.push(css);
  };
  visit(name);
  return styles.join("\n");
}
