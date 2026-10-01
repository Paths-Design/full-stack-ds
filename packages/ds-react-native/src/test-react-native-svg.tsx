import { createElement, type ReactNode } from "react";

// Host boundary only. Native drawing requires the separate simulator witness.
export default function Svg({ children, ...props }: Record<string, unknown> & { children?: ReactNode }) {
  return createElement("Svg", props, children);
}
export function Path(props: Record<string, unknown>) {
  return createElement("Path", props);
}
