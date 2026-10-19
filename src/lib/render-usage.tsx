/**
 * Render a usage-JSONL tree as live React. Walks the structured composition
 * and instantiates real components from `@full-stack-ds/react`.
 *
 * Trust assumption: the codegen's `--check-usage` validator has already
 * verified that every `fsds.<Name>` ref resolves, every prop key matches the
 * target contract, and every slot key matches an anatomy part. So the
 * renderer can be optimistic. When something does fail (e.g. dev edit before
 * re-validate), we render a small fallback in place rather than crashing.
 *
 * Region resolution derives from the target contract's anatomy DOM:
 *   1. Named DOM slots become entries in the generated `slots` object.
 *   2. Compound anatomy parts become compound child components when the root
 *      exposes ordinary children.
 *   3. Other anatomy regions become ordinary children only when the contract
 *      exposes a children placeholder.
 *   4. Regions without a consumer path fail visibly; usage validation rejects
 *      the same shape before it reaches a generated bundle.
 *
 * Children handling:
 *   - String → text node.
 *   - Tree node → recursive render.
 *   - Array → mapped recursively, strings stay text, nodes recurse.
 */
import type { ReactNode } from "react";
import { createElement, Fragment } from "react";
import { resolveUsageComponent, resolveSlot } from "./usage-registry";
import type {
  UsageCompositionIR,
  UsageNodeBody,
  UsagePropValue,
  UsageTreeNode,
} from "../types/data";

export interface UsageRenderOptions {
  /** Consumer controller values and callbacks, applied to this root only. */
  rootProps?: Record<string, unknown>;
  /** Bundled contract/IR authority for authored composition paths. */
  resolveComposition?: (rootRef: string) => UsageCompositionIR | undefined;
}

/**
 * Bundled-asset seam for usage examples. A usage.jsonl is JSON, so it cannot
 * `import` a bundled asset to get Vite's hashed URL. Instead an example may
 * reference a file under `src/assets/` with the sentinel `@asset/<filename>`
 * (e.g. `"src": "@asset/darian-profile.webp"`); `resolveAssetSrc` swaps it for
 * the build-resolved URL. This keeps curated examples pointed at real images we
 * own rather than dead `https://example.com/...` URLs that 404 at runtime.
 */
const BUNDLED_ASSETS = import.meta.glob<string>("../assets/*", {
  eager: true,
  query: "?url",
  import: "default",
});

const ASSET_SENTINEL = "@asset/";

function resolveAssetSrc(value: string): string {
  if (!value.startsWith(ASSET_SENTINEL)) return value;
  const file = value.slice(ASSET_SENTINEL.length);
  const url = BUNDLED_ASSETS[`../assets/${file}`];
  if (!url) {
    // Fail visible-but-soft: keep the sentinel so the broken-image is obviously
    // a missing asset, not a silent empty src.
    if (import.meta.env?.DEV) {
      console.warn(
        `[render-usage] usage example references unknown bundled asset "${value}". ` +
          `Available: ${Object.keys(BUNDLED_ASSETS).join(", ")}`,
      );
    }
    return value;
  }
  return url;
}

export function renderUsageTree(
  node: UsageTreeNode,
  options: UsageRenderOptions = {},
  key?: string | number,
): ReactNode {
  const entries = Object.entries(node);
  if (entries.length !== 1) {
    return <UsageFallback message={`tree node must have exactly one fsds.* ref, got ${entries.length}`} />;
  }
  const [ref, body] = entries[0];
  const resolved = resolveUsageComponent(ref);
  if (!resolved) {
    return <UsageFallback message={`unknown component ref: ${ref}`} />;
  }
  return renderResolved(
    ref,
    resolved.rootRef,
    resolved.part,
    resolved.Component,
    body,
    { ...options, rootProps: undefined },
    key,
    options.rootProps,
  );
}

function renderResolved(
  ref: string,
  rootRef: string,
  part: string | null,
  Component: React.ComponentType<Record<string, unknown>>,
  body: UsageNodeBody,
  options: UsageRenderOptions,
  key?: string | number,
  rootProps?: Record<string, unknown>,
): ReactNode {
  const props: Record<string, unknown> = {};
  const surface = options.resolveComposition?.(rootRef);

  // Props pass through as-is, except `children` which may carry sub-trees.
  if (body.props) {
    for (const [propName, value] of Object.entries(body.props)) {
      props[propName] = propName === "children"
        ? materializeChildren(value, options)
        : materializeProp(
            value,
            options,
            part === null ? surface?.propMaterializers[propName] : undefined,
          );
    }
  }

  // A sidecar's `slots` keys name semantic anatomy regions. The contract — not
  // a component-name switch in this renderer — determines their React delivery:
  //   1. Named contract DOM slot -> generated `slots={{ name: content }}` prop.
  //   2. Generated compound surface -> compound child component.
  //   3. Contract children placeholder -> ordinary children.
  //   4. No admitted path -> visible fallback (the validator rejects this too).
  const namedSlots: Record<string, ReactNode> = {};
  const slotChildren: ReactNode[] = [];
  if (body.slots) {
    for (const [slotName, child] of Object.entries(body.slots)) {
      const childNode: ReactNode =
        typeof child === "string"
          ? child
          : renderUsageTree(child, options, slotName);

      if (surface?.namedSlots.includes(slotName)) {
        namedSlots[slotName] = childNode;
        continue;
      }

      const SlotComponent = surface?.subcomponents.some(
        (candidate) => candidate.part === slotName,
      )
        ? resolveSlot(rootRef, slotName)
        : null;
      if (SlotComponent && surface?.acceptsChildren) {
        slotChildren.push(
          createElement(SlotComponent, { key: slotName }, childNode),
        );
      } else {
        slotChildren.push(
          <UsageFallback
            key={slotName}
            message={
              surface
                ? `${ref} region "${slotName}" has no consumer delivery path`
                : `composition IR unavailable for ${ref} region "${slotName}"`
            }
          />,
        );
      }
    }
  }

  if (Object.keys(namedSlots).length > 0) {
    props.slots = namedSlots;
  }

  // Authored props.children and region-derived children are both content.
  // Preserve both; region content precedes the label/content authored as the
  // ordinary children value (e.g. Chip icon before Chip text).
  const authoredChildren = props.children as ReactNode;
  if (slotChildren.length > 0 && authoredChildren !== undefined) {
    props.children = [...slotChildren, authoredChildren];
  } else if (slotChildren.length > 0) {
    props.children = slotChildren;
  }
  return createElement(Component, { ...props, ...rootProps, key });
}

function materializeProp(
  value: UsagePropValue,
  options: UsageRenderOptions,
  materializer?: "date" | "date-array" | "date-union",
): unknown {
  const toDate = (item: unknown) => (typeof item === "string" ? new Date(item) : item);
  if (materializer === "date") return toDate(value);
  if (materializer === "date-array") {
    return Array.isArray(value) ? value.map(toDate) : value;
  }
  if (materializer === "date-union") {
    return Array.isArray(value) ? value.map(toDate) : toDate(value);
  }
  if (typeof value === "string") {
    return resolveAssetSrc(value);
  }
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => materializeProp(item, options));
  }
  if (isUsageTreeNode(value)) {
    return renderUsageTree(value, options);
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      materializeProp(child, options),
    ]),
  );
}

function materializeChildren(
  value: UsagePropValue,
  options: UsageRenderOptions,
): ReactNode {
  if (value === null || value === undefined) return null;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value as ReactNode;
  }
  if (Array.isArray(value)) {
    return value.map((item, i) => {
      if (
        typeof item === "string" ||
        typeof item === "number" ||
        typeof item === "boolean"
      ) {
        return <Fragment key={i}>{item}</Fragment>;
      }
      return isUsageTreeNode(item)
        ? renderUsageTree(item, options, i)
        : <UsageFallback key={i} message="children objects must be fsds.* tree nodes" />;
    });
  }
  return isUsageTreeNode(value)
    ? renderUsageTree(value, options)
    : <UsageFallback message="children objects must be fsds.* tree nodes" />;
}

function isUsageTreeNode(value: unknown): value is UsageTreeNode {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length === 1 && keys[0].startsWith("fsds.");
}

function UsageFallback({ message }: { message: string }) {
  return (
    <code
      style={{
        display: "inline-block",
        padding: "var(--fsds-core-spacing-size-04) var(--fsds-core-spacing-size-05)",
        border: "1px dashed var(--fsds-semantic-color-border-danger, #c00)",
        color: "var(--fsds-semantic-color-foreground-danger, #c00)",
        fontSize: "0.85em",
      }}
    >
      [usage fallback] {message}
    </code>
  );
}
