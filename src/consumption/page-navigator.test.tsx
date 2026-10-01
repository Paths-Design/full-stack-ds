import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PageNavigator } from "../../packages/ds-react/src/components/PageNavigator/PageNavigator";

describe("PageNavigator composes one accepted position with existing controls", () => {
  it("steps within bounds and commits the independent one-based field draft", () => {
    render(<PageNavigator pageCount={15} />);
    const field = screen.getByRole("spinbutton", { name: "Current page" });
    expect(field).toHaveValue(1);
    expect(field).toHaveAttribute("data-fsds-component", "input");
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(field).toHaveValue(2);
    fireEvent.change(field, { target: { value: "12" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(field).toHaveValue(12);
    fireEvent.change(field, { target: { value: "16" } });
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(field).toHaveValue(12);
    fireEvent.change(field, { target: { value: "15" } });
    fireEvent.blur(field);
    expect(field).toHaveValue(15);
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("shares choices and field through a controlled channel and waits for acknowledgement", () => {
    const onIndexChange = vi.fn();
    const props = { pages: ["Prepare", "Review", "Finish"], presentation: "pages" as const, showChoices: true, index: 0, onIndexChange };
    const { rerender } = render(<PageNavigator {...props} />);
    const root = screen.getAllByRole("group", { name: "Page navigation" })[0];
    const field = screen.getByRole("spinbutton", { name: "Current page" });
    fireEvent.change(field, { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    fireEvent.click(within(root).getByRole("button", { name: "Finish" }));
    expect(onIndexChange.mock.calls).toEqual([[2]]);
    expect(field).toHaveValue(1);
    expect(screen.getByRole("button", { name: "Prepare" })).toHaveAttribute("aria-current", "true");
    rerender(<PageNavigator {...props} index={2} />);
    expect(field).toHaveValue(3);
    expect(screen.getByRole("button", { name: "Finish" })).toHaveAttribute("aria-current", "true");
    expect(onIndexChange.mock.calls).toEqual([[2]]);
  });
});
