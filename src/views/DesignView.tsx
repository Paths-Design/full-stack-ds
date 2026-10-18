import { stateDimensionsOf } from "../types/data";
import type { ComponentBundle } from "../types/data";
import { Breadcrumbs, Stack } from "@full-stack-ds/react";
import { Anatomy } from "./sections/Anatomy";
import { PropsTable } from "./sections/PropsTable";
import { VariantsMatrix } from "./sections/VariantsMatrix";
import { StatesGrid } from "./sections/StatesGrid";
import { A11yPanel } from "./sections/A11yPanel";
import { UsageExamples } from "./sections/UsageExamples";
import { A2UIDescriptorPanel } from "./sections/A2UIDescriptorPanel";
import { EvidencePanel } from "./sections/EvidencePanel";
import { ComponentViewTabs } from "./ComponentViewTabs";

interface DesignViewProps {
  component: ComponentBundle;
  /** Live prop overrides from the Properties tab; drive rendered examples. */
  propOverrides?: Record<string, unknown>;
  /** Live token overrides from the Properties tab; re-skin the variant previews. */
  tokenOverrides?: Record<string, string>;
}

export function DesignView({
  component,
  propOverrides,
  tokenOverrides,
}: DesignViewProps) {
  const hasUsage = component.usage.length > 0;
  const showVariantMatrix = shouldShowVariantMatrix(component);

  return (
    <div className="page">
      <p className="page-eyebrow">
        {(component.contract.layer ?? "component").toUpperCase()}
      </p>
      <Breadcrumbs ariaLabel="Component context">
        <li>
          <a href="#/">Components</a>
        </li>
        <li>{component.contract.layer}</li>
        <li aria-current="page">{component.name}</li>
      </Breadcrumbs>
      <h1 className="page-title">{component.name}</h1>
      <p className="page-lede">
        {component.contract.description ?? "Component contract."}
      </p>

      <ComponentViewTabs componentName={component.name} activeTab="design" />

      {hasUsage ? (
        <section className="section">
          <Stack as="header" variant="horizontal" className="section-header stack-gap-06">
            <h2 className="section-title">Examples</h2>
            <span className="section-meta">
              {component.name}.usage.jsonl · rendered with @full-stack-ds/react
            </span>
          </Stack>
          <UsageExamples
            component={component}
            propOverrides={propOverrides}
            tokenOverrides={tokenOverrides}
          />
        </section>
      ) : (
        <section className="section">
          <div
            className="muted"
            style={{
              padding: "var(--fsds-core-spacing-size-08)",
              textAlign: "center",
            }}
          >
            No usage examples curated yet for {component.name}.
          </div>
        </section>
      )}

      {component.contract.anatomy && (
        <section className="section">
          <Stack as="header" variant="horizontal" className="section-header stack-gap-06">
            <h2 className="section-title">Anatomy</h2>
            <span className="section-meta">contract.anatomy</span>
          </Stack>
          <Anatomy contract={component.contract} />
        </section>
      )}

      {showVariantMatrix && component.contract.variants && Object.keys(component.contract.variants).length > 0 && (
        <section className="section">
          <Stack as="header" variant="horizontal" className="section-header stack-gap-06">
            <h2 className="section-title">Variants</h2>
            <span className="section-meta">contract.variants</span>
          </Stack>
          <VariantsMatrix
            component={component}
            tokenOverrides={tokenOverrides}
          />
        </section>
      )}

      {stateDimensionsOf(component.contract).length > 0 && (
        <section className="section">
          <Stack as="header" variant="horizontal" className="section-header stack-gap-06">
            <h2 className="section-title">States</h2>
            <span className="section-meta">contract.states</span>
          </Stack>
          <StatesGrid contract={component.contract} />
        </section>
      )}

      {component.contract.props?.styled?.members && (
        <section className="section">
          <Stack as="header" variant="horizontal" className="section-header stack-gap-06">
            <h2 className="section-title">Props</h2>
            <span className="section-meta">contract.props.styled.members</span>
          </Stack>
          <PropsTable
            members={component.contract.props.styled.members}
            messages={component.contract.messages}
          />
        </section>
      )}

      {component.contract.a11y && (
        <section className="section">
          <Stack as="header" variant="horizontal" className="section-header stack-gap-06">
            <h2 className="section-title">Accessibility</h2>
            <span className="section-meta">contract.a11y</span>
          </Stack>
          <A11yPanel a11y={component.contract.a11y} />
        </section>
      )}

      <section className="section">
        <Stack as="header" variant="horizontal" className="section-header stack-gap-06">
          <h2 className="section-title">A2UI descriptor</h2>
          <span className="section-meta">deriveA2UIDescriptor(contract)</span>
        </Stack>
        <A2UIDescriptorPanel contract={component.contract} />
      </section>

      <section className="section">
        <Stack as="header" variant="horizontal" className="section-header stack-gap-06">
          <h2 className="section-title">Evidence &amp; residuals</h2>
          <span className="section-meta">bundle-derivable facts</span>
        </Stack>
        <EvidencePanel component={component} />
      </section>
    </div>
  );
}

function shouldShowVariantMatrix(_component: ComponentBundle) {
  return false;
}
