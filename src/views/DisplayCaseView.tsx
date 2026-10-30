import {
  Component,
  createElement,
  useState,
  type ComponentProps,
  type ErrorInfo,
  type ReactNode,
} from "react";
import * as DS from "@full-stack-ds/react";
import { defaultPropsFromContract, childLabel } from "../runtime/demos";
import { resolveRootComponent } from "../lib/usage-registry";
import placeholderUrl from "../assets/placeholder.svg";
import profileImageUrl from "../assets/darian-profile.webp";
import type { Bundle, ComponentBundle } from "../types/data";

interface DisplayCaseViewProps {
  bundle: Bundle;
}

type VariantCase = {
  id: string;
  label: string;
  props: Record<string, unknown>;
};

type ButtonSampleProps = ComponentProps<typeof DS.Button> & {
  sampleKind?: "icon-only" | "loading" | "disabled";
};

type DialogSampleProps = ComponentProps<typeof DS.Dialog> & {
  sampleKind?: "confirmation" | "form";
};

type TextFieldSampleProps = ComponentProps<typeof DS.TextField> & {
  sampleKind?: "default" | "validation-error" | "disabled";
};

const CATEGORY_ORDER = [
  "action",
  "input",
  "surface",
  "feedback",
  "display",
  "glyph",
  "structure",
  "unknown",
];

export function DisplayCaseView({ bundle }: DisplayCaseViewProps) {
  const groups = groupComponents(bundle.components);

  return (
    <div className="display-case-page">
      <DS.Stack as="header" variant="horizontal" className="display-case-header stack-gap-07">
        <div>
          <p className="display-case-kicker">Internal visual audit</p>
          <h1 className="display-case-title">Display Case</h1>
        </div>
        <DS.Stack as="dl" variant="horizontal" className="display-case-stats stack-gap-06" aria-label="Display case summary">
          <div>
            <dt>Components</dt>
            <dd>{bundle.components.length}</dd>
          </div>
          <div>
            <dt>Families</dt>
            <dd>{groups.length}</dd>
          </div>
        </DS.Stack>
      </DS.Stack>

      <div className="display-case-groups">
        {groups.map((group) => (
          <section className="display-case-family" key={group.category}>
            <DS.Stack variant="horizontal" className="display-case-family-header stack-gap-05">
              <h2>{formatLabel(group.category)}</h2>
              <span>{group.components.length}</span>
            </DS.Stack>
            <div className="display-case-grid">
              {group.components.map((component) => (
                <ComponentTile component={component} key={component.name} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function ComponentTile({ component }: { component: ComponentBundle }) {
  const cases = variantCases(component);

  return (
    <article className="display-case-tile">
      <DS.Stack variant="horizontal" className="display-case-tile-header stack-gap-05">
        <div>
          <h3>{component.name}</h3>
          <p>{component.contract.layer}</p>
        </div>
        <span>{caseCountLabel(cases.length)}</span>
      </DS.Stack>

      <div className="display-case-samples">
        {cases.map((variantCase) => (
          <section className="display-case-sample" key={variantCase.id}>
            <div className="display-case-sample-label">{variantCase.label}</div>
            <div className="display-case-stage">
              <SampleBoundary componentName={component.name} caseLabel={variantCase.label}>
                {renderComponentSample(component, variantCase.props)}
              </SampleBoundary>
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}

function renderComponentSample(
  component: ComponentBundle,
  overrideProps: Record<string, unknown>,
): ReactNode {
  const Root = resolveRootComponent(`fsds.${component.name}`);
  if (!Root) {
    return <code className="display-case-fallback">Missing React export</code>;
  }

  const props = {
    ...sampleProps(component),
    ...overrideProps,
  };

  if (component.name === "Table") {
    return renderTableSample(props);
  }

  const richSample = renderRichSample(component.name, props);
  if (richSample) {
    return richSample;
  }

  const child = childLabel(component);
  return child ? createElement(Root, props, child) : createElement(Root, props);
}

function renderTableSample(props: Record<string, unknown>) {
  return (
    <DS.Table {...props} ariaLabel="Display case table">
      <DS.TableCaption>Quarterly usage</DS.TableCaption>
      <DS.TableHead>
        <DS.TableRow>
          <DS.TableHeaderCell scope="col">Metric</DS.TableHeaderCell>
          <DS.TableHeaderCell scope="col">Value</DS.TableHeaderCell>
        </DS.TableRow>
      </DS.TableHead>
      <DS.TableBody>
        <DS.TableRow>
          <DS.TableCell>Active users</DS.TableCell>
          <DS.TableCell>12,480</DS.TableCell>
        </DS.TableRow>
      </DS.TableBody>
    </DS.Table>
  );
}

function renderRichSample(name: string, props: Record<string, unknown>): ReactNode | null {
  switch (name) {
    case "Accordion":
      return (
        <DS.Accordion {...props} defaultValue="tokens">
          <span className="display-case-copy-strong">Token decisions</span>
          <span className="display-case-copy-muted">
            Spacing, elevation, and states stay visible across variants.
          </span>
        </DS.Accordion>
      );
    case "Button":
      return renderButtonSample(props);
    case "Breadcrumbs":
      return (
        <DS.Breadcrumbs {...props} ariaLabel="Display case breadcrumbs">
          <li><a href="#/tokens">Tokens</a></li>
          <li><a href="#/component/Button/design">Button</a></li>
          <li aria-current="page">Variants</li>
        </DS.Breadcrumbs>
      );
    case "Card":
      return (
        <DS.Card {...props}>
          <DS.CardHeader>
            <span className="display-case-copy-strong">Release readiness</span>
            <DS.Badge intent="success" variant="status">Live</DS.Badge>
          </DS.CardHeader>
          <DS.CardContent>
            <DS.CardDescription>
              Component output, contract coverage, and visual states are ready for review.
            </DS.CardDescription>
          </DS.CardContent>
          <DS.CardFooter>
            <DS.Button size="small" variant="secondary">Inspect</DS.Button>
            <DS.Button size="small" variant="primary">Approve</DS.Button>
          </DS.CardFooter>
        </DS.Card>
      );
    case "Dialog":
      return renderDialogSample(props);
    case "Field":
      // Field is a composer: each region is a named slot hosting a real
      // primitive (Label, Input), not raw children. The control slot holds a
      // single Input — its border is the only border (no wrapper double-ring).
      return (
        <DS.Field
          {...props}
          name="workspace"
          slots={{
            label: "Workspace name",
            control: (
              <DS.Input name="workspace" placeholder="Acme Design Systems" />
            ),
            help: "Shown to everyone you invite to this workspace.",
          }}
        />
      );
    case "ProfileFlag":
      // ProfileFlag renders its children as the identity surface; supply a
      // real Avatar (with a bundled photo we own) plus the display name so the
      // demo shows an actual face instead of an empty wrapper.
      return (
        <DS.ProfileFlag {...props}>
          <DS.Avatar src={profileImageUrl} name="Darian Rosebrook" />
          <span className="display-case-copy-strong">Darian Rosebrook</span>
        </DS.ProfileFlag>
      );
    case "List":
      if (props.as === "dl") {
        return (
          <DS.List {...props} as="dl">
            <dt>Primitive</dt>
            <dd>Stack</dd>
            <dt>Target</dt>
            <dd>React</dd>
          </DS.List>
        );
      }
      return (
        <DS.List {...props}>
          <li>Contract declares the visual axis.</li>
          <li>Stack carries the layout primitive.</li>
          <li>Generated output stays inspectable.</li>
        </DS.List>
      );
    case "NavList":
      return (
        <DS.NavList {...props} ariaLabel="Display case navigation">
          <DS.NavListItem><a href="#/architecture">Architecture</a></DS.NavListItem>
          <DS.NavListItem><a href="#/tokens" aria-current="page">Tokens</a></DS.NavListItem>
          <DS.NavListItem><a href="#/component/Button/design">Components</a></DS.NavListItem>
        </DS.NavList>
      );
    case "Shuttle":
      return (
        <DS.Shuttle
          {...props}
          ariaLabel="Assign reviewers"
          options={["Design lead", "Accessibility reviewer", "Platform owner", "Content designer", "Research partner"]}
          defaultValue={["Design lead", "Accessibility reviewer"]}
        />
      );
    case "Tabs":
      return (
        <DS.Tabs {...props} defaultValue="contract" idBase="display-case-tabs">
          <DS.TabsList>
            <DS.TabsTab value="contract">Contract</DS.TabsTab>
            <DS.TabsTab value="tokens">Tokens</DS.TabsTab>
            <DS.TabsTab value="runtime">Runtime</DS.TabsTab>
          </DS.TabsList>
          <DS.TabsPanel value="contract">
            Semantic props, children, and state channels.
          </DS.TabsPanel>
          <DS.TabsPanel value="tokens">Resolved visual tokens.</DS.TabsPanel>
          <DS.TabsPanel value="runtime">Generated React output.</DS.TabsPanel>
        </DS.Tabs>
      );
    case "TextField":
      return renderTextFieldSample(props);
    case "Tooltip":
      return (
        <DS.Tooltip {...props}>
          <DS.Tooltip.Trigger>Inspect hint</DS.Tooltip.Trigger>
          <DS.Tooltip.Content>Contracts map to live component structure.</DS.Tooltip.Content>
        </DS.Tooltip>
      );
    case "Walkthrough":
      return (
        <DS.Walkthrough
          {...props}
          defaultIndex={1}
          steps={[
            { anchor: "#contract", title: "Read the contract" },
            { anchor: "#tokens", title: "Check tokens" },
            { anchor: "#runtime", title: "Verify output" },
          ]}
          slots={{
            title: "Check tokens",
            description: "Review spacing, state, and child content before approving output.",
          }}
        />
      );
  }

  return null;
}

function renderButtonSample(props: Record<string, unknown>) {
  const { sampleKind, ...buttonProps } = props as ButtonSampleProps;

  if (sampleKind === "icon-only") {
    return (
      <DS.Button
        {...buttonProps}
        ariaLabel="Close preview panel"
        size="small"
        variant="ghost"
      >
        <DS.Icon name="x" size="sm" />
      </DS.Button>
    );
  }

  if (sampleKind === "loading") {
    return (
      <DS.Button {...buttonProps} loading>
        Saving changes
      </DS.Button>
    );
  }

  if (sampleKind === "disabled") {
    return (
      <DS.Button {...buttonProps} disabled title="Resolve validation issues first">
        Publish changes
      </DS.Button>
    );
  }

  const variant = buttonProps.variant;
  const label =
    variant === "destructive" ? "Delete workspace" :
    variant === "secondary" ? "View details" :
    variant === "tertiary" ? "Learn more" :
    variant === "ghost" ? "Dismiss" :
    variant === "outline" ? "Export report" :
    "Save changes";

  return <DS.Button {...buttonProps}>{label}</DS.Button>;
}

function renderDialogSample(props: Record<string, unknown>) {
  return <DisplayCaseDialogSample {...(props as DialogSampleProps)} />;
}

function DisplayCaseDialogSample({
  sampleKind,
  ...dialogProps
}: DialogSampleProps) {
  const [open, setOpen] = useState(false);
  const isForm = sampleKind === "form";
  const title = isForm ? "Edit profile" : "Delete workspace";

  return (
    <>
      <DS.Button
        size="small"
        variant={isForm ? "primary" : "destructive"}
        onClick={() => setOpen(true)}
      >
        {isForm ? "Open edit profile dialog" : "Open delete workspace dialog"}
      </DS.Button>
      <DS.Dialog
        {...dialogProps}
        open={open}
        onOpenChange={setOpen}
        aria-label={title}
        slots={{
          title,
        }}
      >
        {isForm ? (
          <div className="display-case-copy-stack">
            <DS.Field
              name="display-name"
              required
              slots={{
                label: "Display name",
                control: (
                  <DS.Input
                    name="display-name"
                    defaultValue="Darian Rosebrook"
                  />
                ),
                help: "Shown in shared review comments and approvals.",
              }}
            />
            <DS.Stack variant="horizontal" className="display-case-dialog-actions stack-gap-03">
              <DS.Button size="small" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </DS.Button>
              <DS.Button size="small" variant="primary" onClick={() => setOpen(false)}>
                Save profile
              </DS.Button>
            </DS.Stack>
          </div>
        ) : (
          <div className="display-case-copy-stack">
            <p className="display-case-copy-muted">
              This removes generated artifacts, review notes, and runtime
              snapshots for this workspace. The action cannot be undone.
            </p>
            <DS.Stack variant="horizontal" className="display-case-dialog-actions stack-gap-03">
              <DS.Button size="small" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </DS.Button>
              <DS.Button size="small" variant="destructive" onClick={() => setOpen(false)}>
                Delete workspace
              </DS.Button>
            </DS.Stack>
          </div>
        )}
      </DS.Dialog>
    </>
  );
}

function renderTextFieldSample(props: Record<string, unknown>) {
  const { sampleKind = "default", ...textFieldProps } = props as TextFieldSampleProps;
  const invalid = sampleKind === "validation-error";
  const disabled = sampleKind === "disabled";

  return (
    <DS.TextField
      {...textFieldProps}
      name={invalid ? "password" : "email"}
      type={invalid ? "password" : "email"}
      defaultValue={invalid ? "short" : "reviewer@example.com"}
      invalid={invalid}
      disabled={disabled}
      required={!disabled}
      slots={{
        label: invalid ? "Password" : "Reviewer email",
        description: disabled
          ? "Invitations are locked after the review enters approval."
          : "Use a work email so audit notifications reach the right person.",
        error: invalid ? "Password must be at least 12 characters." : undefined,
      }}
    />
  );
}

function sampleProps(component: ComponentBundle): Record<string, unknown> {
  const props = defaultPropsFromContract(component) as Record<string, unknown>;

  switch (component.name) {
    case "TextField":
      props.name = "email";
      props.type = "email";
      break;
    case "Input":
      props.name = "email";
      props.type = "email";
      props.placeholder = "you@example.com";
      break;
    case "Checkbox":
      props.name = "terms";
      props.value = "accepted";
      break;
    case "Switch":
      props.name = "notifications";
      break;
    case "ToggleSwitch":
      props.ariaLabel = "Enable notifications";
      break;
    case "Progress":
      props.value = 64;
      props.label = "Upload progress";
      break;
    case "Spinner":
      props.label = "Loading";
      break;
    case "Image":
      props.src = placeholderUrl;
      props.alt = "Decorative placeholder";
      props.width = 240;
      props.height = 135;
      break;
    case "Avatar":
      props.name = "Jordan Rivera";
      break;
    case "Select":
      props.defaultOpen = false;
      break;
  }

  return props;
}

function variantCases(component: ComponentBundle): VariantCase[] {
  const cases: VariantCase[] = [
    {
      id: "default",
      label: "default",
      props: {},
    },
  ];

  const variants = component.contract.variants ?? {};
  for (const [axis, values] of Object.entries(variants)) {
    for (const value of values) {
      cases.push({
        id: `${axis}-${value}`,
        label: `${axis}=${value}`,
        props: { [axis]: value },
      });
    }
  }

  if (component.name === "Button") {
    cases.push(
      {
        id: "icon-only",
        label: "icon-only close",
        props: { sampleKind: "icon-only" },
      },
      {
        id: "loading",
        label: "loading",
        props: { sampleKind: "loading" },
      },
      {
        id: "disabled",
        label: "disabled",
        props: { sampleKind: "disabled" },
      },
    );
  }

  if (component.name === "Dialog") {
    cases.push({
      id: "form",
      label: "form content",
      props: { sampleKind: "form", size: "lg" },
    });
  }

  if (component.name === "TextField") {
    cases.push(
      {
        id: "validation-error",
        label: "validation error",
        props: { sampleKind: "validation-error" },
      },
      {
        id: "disabled",
        label: "disabled",
        props: { sampleKind: "disabled" },
      },
    );
  }

  return cases;
}

function groupComponents(components: ComponentBundle[]) {
  const byCategory = new Map<string, ComponentBundle[]>();
  for (const component of components) {
    const category = component.contract.category ?? "unknown";
    const bucket = byCategory.get(category) ?? [];
    bucket.push(component);
    byCategory.set(category, bucket);
  }

  return Array.from(byCategory.entries())
    .sort(([a], [b]) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      return (ai === -1 ? CATEGORY_ORDER.length : ai) -
        (bi === -1 ? CATEGORY_ORDER.length : bi);
    })
    .map(([category, grouped]) => ({
      category,
      components: grouped.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

function formatLabel(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function caseCountLabel(count: number): string {
  return count === 1 ? "1 sample" : `${count} samples`;
}

class SampleBoundary extends Component<
  { componentName: string; caseLabel: string; children: ReactNode },
  { message: string | null }
> {
  state = { message: null };

  static getDerivedStateFromError(error: unknown) {
    return {
      message: error instanceof Error ? error.message : "Render failed",
    };
  }

  componentDidCatch(_error: unknown, _info: ErrorInfo) {
    // The display case is an audit surface: one broken component sample should
    // stay visible as evidence instead of taking down the whole grid.
  }

  render() {
    if (this.state.message) {
      return (
        <code className="display-case-fallback">
          {this.props.componentName} / {this.props.caseLabel}: {this.state.message}
        </code>
      );
    }
    return this.props.children;
  }
}
