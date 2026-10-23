export function generateReactNativeBarrel(
  componentNames: string[],
  _componentsRoot?: string,
): string {
  const lines: string[] = [];
  for (const name of componentNames.sort()) {
    lines.push(`export { ${name} } from "./${name}/${name}";`);
    lines.push(`export type { ${name}Props } from "./${name}/${name}";`);
    lines.push(`export type * from "./${name}/${name}";`);
  }
  lines.push("");
  return lines.join("\n");
}
