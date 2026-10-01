import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "../../packages/ds-react/src/components/Pagination/Pagination";
import { Carousel } from "../../packages/ds-react/src/components/Carousel/Carousel";

describe("Pagination selection ownership", () => {
  it("selects an ordinal independently of repeated display labels", () => {
    render(<Pagination pages={["Page", "Page", "Page"]} defaultIndex={1} />);
    const buttons = screen.getAllByRole("button", { name: "Page" });
    expect(buttons[1]).toHaveAttribute("aria-current", "true");
    fireEvent.click(buttons[2]);
    expect(buttons[2]).toHaveAttribute("aria-current", "true");
    expect(buttons[1]).toHaveAttribute("aria-current", "false");
  });

  it("requests a controlled position once and waits for acknowledgement", () => {
    const onIndexChange = vi.fn();
    const { rerender } = render(<Pagination pages={["1", "2", "3"]} presentation="pages" index={0} onIndexChange={onIndexChange} />);
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    expect(onIndexChange.mock.calls).toEqual([[2]]);
    expect(screen.getByRole("button", { name: "1" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "3" })).toHaveAttribute("aria-current", "false");
    rerender(<Pagination pages={["1", "2", "3"]} presentation="pages" index={2} onIndexChange={onIndexChange} />);
    expect(screen.getByRole("button", { name: "3" })).toHaveAttribute("aria-current", "true");
    expect(onIndexChange.mock.calls).toEqual([[2]]);
  });

  it("leaves an empty collection empty and honors the content owner's disabled state", () => {
    const onIndexChange = vi.fn();
    const { rerender } = render(<Pagination pages={[]} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    rerender(<Pagination pages={["Profile", "Confirm"]} disabled onIndexChange={onIndexChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
    expect(onIndexChange).not.toHaveBeenCalled();
  });
});

describe("Carousel composes the Pagination selection request", () => {
  const labels = ["First", "Second", "Third"];
  const content = [<article key="first">First content</article>, <article key="second">Second content</article>, <article key="third">Third content</article>];

  it("routes a picker through the sequence once and keeps the accepted position authoritative", () => {
    const onIndexChange = vi.fn();
    const { rerender } = render(<Carousel slides={labels} duration={null} index={0} onIndexChange={onIndexChange}>{content}</Carousel>);
    const picker = screen.getByRole("group", { name: "Choose slide" });
    expect(picker).toHaveAttribute("data-fsds-component", "pagination");
    fireEvent.click(screen.getByRole("button", { name: "Third" }));
    expect(onIndexChange.mock.calls).toEqual([[2]]);
    expect(screen.getByRole("button", { name: "First" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByText("First content")).toBeVisible();
    expect(screen.getByText("Third content")).not.toBeVisible();
    rerender(<Carousel slides={labels} duration={null} index={2} onIndexChange={onIndexChange}>{content}</Carousel>);
    expect(screen.getByRole("button", { name: "Third" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByText("Third content")).toBeVisible();
    expect(onIndexChange.mock.calls).toEqual([[2]]);
  });

  it("refuses composed picker requests when labels and content do not match", () => {
    const onIndexChange = vi.fn();
    render(<Carousel slides={labels} duration={null} onIndexChange={onIndexChange}><article>Only child</article></Carousel>);
    fireEvent.click(screen.getByRole("button", { name: "Third" }));
    expect(onIndexChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "First" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Next slide" })).toBeDisabled();
  });
});
