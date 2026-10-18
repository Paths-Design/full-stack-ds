// @generated:start imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Text } from "../Text";

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

describe("Text — unit", () => {
  it("renders with default props", () => {
    render(<Text data-testid="text"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Text data-testid="text"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text");
  });

  it("merges custom className", () => {
    render(<Text data-testid="text" className="custom"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text", "custom");
  });

  it("applies variant=display variant class", () => {
    render(<Text data-testid="text" variant="display"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text--display");
  });

  it("applies variant=headline variant class", () => {
    render(<Text data-testid="text" variant="headline"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text--headline");
  });

  it("applies variant=title variant class", () => {
    render(<Text data-testid="text" variant="title"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text--title");
  });

  it("applies variant=body variant class", () => {
    render(<Text data-testid="text" variant="body"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text--body");
  });

  it("applies variant=caption variant class", () => {
    render(<Text data-testid="text" variant="caption"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text--caption");
  });

  it("applies variant=overline variant class", () => {
    render(<Text data-testid="text" variant="overline"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text--overline");
  });

  it("applies variant=code variant class", () => {
    render(<Text data-testid="text" variant="code"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text--code");
  });

  it("applies size=xs variant class", () => {
    render(<Text data-testid="text" size="xs"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text--xs");
  });

  it("applies size=sm variant class", () => {
    render(<Text data-testid="text" size="sm"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text--sm");
  });

  it("applies size=md variant class", () => {
    render(<Text data-testid="text" size="md"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text--md");
  });

  it("applies size=lg variant class", () => {
    render(<Text data-testid="text" size="lg"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text--lg");
  });

  it("applies size=xl variant class", () => {
    render(<Text data-testid="text" size="xl"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text--xl");
  });

  it("applies size=2xl variant class", () => {
    render(<Text data-testid="text" size="2xl"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text--2xl");
  });

  it("applies size=3xl variant class", () => {
    render(<Text data-testid="text" size="3xl"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text--3xl");
  });

  it("applies weight=light variant class", () => {
    render(<Text data-testid="text" weight="light"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text--light");
  });

  it("applies weight=normal variant class", () => {
    render(<Text data-testid="text" weight="normal"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text--normal");
  });

  it("applies weight=medium variant class", () => {
    render(<Text data-testid="text" weight="medium"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text--medium");
  });

  it("applies weight=semibold variant class", () => {
    render(<Text data-testid="text" weight="semibold"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text--semibold");
  });

  it("applies weight=bold variant class", () => {
    render(<Text data-testid="text" weight="bold"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text--bold");
  });

  it("applies align=left variant class", () => {
    render(<Text data-testid="text" align="left"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text--left");
  });

  it("applies align=center variant class", () => {
    render(<Text data-testid="text" align="center"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text--center");
  });

  it("applies align=right variant class", () => {
    render(<Text data-testid="text" align="right"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text--right");
  });

  it("applies align=justify variant class", () => {
    render(<Text data-testid="text" align="justify"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text--justify");
  });

  it("applies transform=none variant class", () => {
    render(<Text data-testid="text" transform="none"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text--none");
  });

  it("applies transform=uppercase variant class", () => {
    render(<Text data-testid="text" transform="uppercase"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text--uppercase");
  });

  it("applies transform=lowercase variant class", () => {
    render(<Text data-testid="text" transform="lowercase"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text--lowercase");
  });

  it("applies transform=capitalize variant class", () => {
    render(<Text data-testid="text" transform="capitalize"><span>content</span></Text>);
    expect(screen.getByTestId("text")).toHaveClass("text--capitalize");
  });
});

describe("Text — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Text><span>content</span></Text></>);
    const component = baseElement.querySelector('[data-fsds-component="text"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
