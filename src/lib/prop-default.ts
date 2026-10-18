import type { ComponentContract, PropMember } from "../types/data";

/**
 * The value a prop renders with when the consumer passes none: its literal
 * `default`, or, for a message-defaulted string prop, the contract message's
 * default text (what the component shows when no catalog translates it).
 */
export function propDefault(
  member: Pick<PropMember, "default" | "defaultMessage">,
  messages: ComponentContract["messages"],
): unknown {
  if (member.default !== undefined) return member.default;
  if (member.defaultMessage !== undefined) return messages?.[member.defaultMessage]?.defaultMessage;
  return undefined;
}
