import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Input } from "../../packages/ds-react/src/components/Input/Input";
import { useState } from "react";

afterEach(() => vi.restoreAllMocks());
describe("React native text composition", () => {
  it.each([false, true])("retains a draft until commit with parent acceptance=%s", accepting => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frames.push(callback); return frames.length; });
    const requests = vi.fn();
    function Parent() {
      const [value, setValue] = useState("");
      return <Input ariaLabel="Composing" value={value} onChange={next => { requests(next); if (accepting) setValue(next); }} />;
    }
    render(<Parent />);
    const input = screen.getByRole("textbox", { name: "Composing" }) as HTMLInputElement;
    input.focus();
    fireEvent.input(input, { target: { value: "に" }, isComposing: true, inputType: "insertCompositionText" });
    expect(input.value).toBe("に"); expect(document.activeElement).toBe(input);
    fireEvent.compositionEnd(input);
    fireEvent.input(input, { target: { value: "日本" }, isComposing: false, inputType: "insertText" });
    expect(input.value).toBe("日本"); expect(frames).toHaveLength(1);
    act(() => frames[0](0));
    expect(input.value).toBe(accepting ? "日本" : "");
    expect(requests.mock.calls).toEqual([["に"], ["日本"]]);
    expect(document.activeElement).toBe(input);
  });
  it("disposes the native listener and pending frame on unmount", () => {
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(17);
    const cancel = vi.spyOn(window, "cancelAnimationFrame"); const request = vi.fn();
    const { unmount } = render(<Input ariaLabel="Unmounting" value="" onChange={request} />);
    const input = screen.getByRole("textbox", { name: "Unmounting" });
    fireEvent.input(input, { target: { value: "に" }, isComposing: true });
    fireEvent.compositionEnd(input); unmount();
    expect(cancel).toHaveBeenCalledWith(17); expect(request.mock.calls).toEqual([["に"]]);
  });
});
