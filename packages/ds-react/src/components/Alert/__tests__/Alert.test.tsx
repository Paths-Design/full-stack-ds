// @generated:start imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Alert } from "../Alert";

declare module "vitest" {
  interface Assertion<T> {
    // The positional T keeps this augmentation mergeable with vitest's
    // own Assertion<T = any> declaration (TS2428 fires on any rename);
    // the expected param references it so it is never an unused type param.
    toHaveNoViolations(expected?: T): void;
  }
}
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("Alert — unit", () => {
  it("renders with default props", () => {
    render(<Alert data-testid="alert"><span>content</span></Alert>);
    expect(screen.getByTestId("alert")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Alert data-testid="alert"><span>content</span></Alert>);
    expect(screen.getByTestId("alert")).toHaveClass("alert");
  });

  it("merges custom className", () => {
    render(<Alert data-testid="alert" className="custom"><span>content</span></Alert>);
    expect(screen.getByTestId("alert")).toHaveClass("alert", "custom");
  });

  it("has the correct ARIA role", () => {
    render(<Alert data-testid="alert"><span>content</span></Alert>);
    expect(screen.getByTestId("alert")).toHaveAttribute("role", "alert");
  });

  it("applies intent=info variant class", () => {
    render(<Alert data-testid="alert" intent="info"><span>content</span></Alert>);
    expect(screen.getByTestId("alert")).toHaveClass("alert--info");
  });

  it("applies intent=success variant class", () => {
    render(<Alert data-testid="alert" intent="success"><span>content</span></Alert>);
    expect(screen.getByTestId("alert")).toHaveClass("alert--success");
  });

  it("applies intent=warning variant class", () => {
    render(<Alert data-testid="alert" intent="warning"><span>content</span></Alert>);
    expect(screen.getByTestId("alert")).toHaveClass("alert--warning");
  });

  it("applies intent=danger variant class", () => {
    render(<Alert data-testid="alert" intent="danger"><span>content</span></Alert>);
    expect(screen.getByTestId("alert")).toHaveClass("alert--danger");
  });

  it("applies level=inline variant class", () => {
    render(<Alert data-testid="alert" level="inline"><span>content</span></Alert>);
    expect(screen.getByTestId("alert")).toHaveClass("alert--inline");
  });

  it("applies level=section variant class", () => {
    render(<Alert data-testid="alert" level="section"><span>content</span></Alert>);
    expect(screen.getByTestId("alert")).toHaveClass("alert--section");
  });

  it("applies level=page variant class", () => {
    render(<Alert data-testid="alert" level="page"><span>content</span></Alert>);
    expect(screen.getByTestId("alert")).toHaveClass("alert--page");
  });
});

describe("Alert — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Alert aria-label="Test Alert"><span>content</span></Alert></>);
    const component = baseElement.querySelector('[data-fsds-component="alert"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
// CODEGEN-RECURSIVE-COMPOSITION-01: Alert's dismiss control is composed
// by-reference as the Button primitive (componentRef: fsds.Button). These
// tests prove the composition behaves like the former raw <button>: the
// click event reaches `onDismiss` and the `aria-label` binding reaches the
// composed Button's accessible name — i.e. behavior + a11y survive the
// composition boundary.
import { fireEvent } from "@testing-library/react";

describe("Alert — dismiss control composed via Button", () => {
  it("forwards click on the composed Button to onDismiss", () => {
    let dismissed = 0;
    render(
      <Alert
        dismissible
        dismissLabel="Dismiss alert"
        onDismiss={() => {
          dismissed += 1;
        }}
      >
        content
      </Alert>,
    );
    const dismiss = screen.getByRole("button", { name: "Dismiss alert" });
    fireEvent.click(dismiss);
    expect(dismissed).toBe(1);
  });

  it("forwards aria-label to the composed Button's accessible name", () => {
    render(
      <Alert dismissible dismissLabel="Close notice" onDismiss={() => {}}>
        content
      </Alert>,
    );
    // getByRole with an accessible-name filter fails if the label did not
    // reach the composed Button — the cross-boundary a11y proof.
    expect(
      screen.getByRole("button", { name: "Close notice" }),
    ).toBeInTheDocument();
  });
});
// @custom:end
