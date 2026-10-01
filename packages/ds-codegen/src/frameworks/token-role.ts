/** A rest paint role can use a neutral slot or the default of an explicit state
 * family. Return actual declared slots; this never emits compatibility aliases. */
export function matchesTokenRole(name: string, role: string): boolean {
  const base = role.endsWith('.default') ? role.slice(0, -8) : role;
  return name.endsWith(base) || name.endsWith(`${base}.default`);
}
