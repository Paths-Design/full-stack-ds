// @generated:start imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Postcard, type PostcardAuthor, type PostcardStats } from "../Postcard";

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

describe("Postcard — unit", () => {
  it("renders with default props", () => {
    render(<Postcard data-testid="postcard" postId={"placeholder"} author={{} as PostcardAuthor} timestamp={"placeholder"} stats={{} as PostcardStats}><span>content</span></Postcard>);
    expect(screen.getByTestId("postcard")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Postcard data-testid="postcard" postId={"placeholder"} author={{} as PostcardAuthor} timestamp={"placeholder"} stats={{} as PostcardStats}><span>content</span></Postcard>);
    expect(screen.getByTestId("postcard")).toHaveClass("postcard");
  });

  it("merges custom className", () => {
    render(<Postcard data-testid="postcard" postId={"placeholder"} author={{} as PostcardAuthor} timestamp={"placeholder"} stats={{} as PostcardStats} className="custom"><span>content</span></Postcard>);
    expect(screen.getByTestId("postcard")).toHaveClass("postcard", "custom");
  });

  it("applies type=image variant class", () => {
    render(<Postcard data-testid="postcard" postId={"placeholder"} author={{} as PostcardAuthor} timestamp={"placeholder"} stats={{} as PostcardStats} type="image"><span>content</span></Postcard>);
    expect(screen.getByTestId("postcard")).toHaveClass("postcard--image");
  });

  it("applies type=video variant class", () => {
    render(<Postcard data-testid="postcard" postId={"placeholder"} author={{} as PostcardAuthor} timestamp={"placeholder"} stats={{} as PostcardStats} type="video"><span>content</span></Postcard>);
    expect(screen.getByTestId("postcard")).toHaveClass("postcard--video");
  });

  it("applies type=audio variant class", () => {
    render(<Postcard data-testid="postcard" postId={"placeholder"} author={{} as PostcardAuthor} timestamp={"placeholder"} stats={{} as PostcardStats} type="audio"><span>content</span></Postcard>);
    expect(screen.getByTestId("postcard")).toHaveClass("postcard--audio");
  });
});

describe("Postcard — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Postcard aria-label="Test Postcard" postId={"placeholder"} author={{} as PostcardAuthor} timestamp={"placeholder"} stats={{} as PostcardStats}><span>content</span></Postcard></>);
    const component = baseElement.querySelector('[data-fsds-component="postcard"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
