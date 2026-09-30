import { StrictMode, useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog } from "../../../components/Dialog/Dialog";
import { PortalTargetProvider } from "../usePortal";

function Consumer({ initialFocus, returnFocus, modal = true, target }: {
  initialFocus?: string; returnFocus?: string; modal?: boolean; target?: Element;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const dialog = open && (
    <Dialog open onOpenChange={setOpen} initialFocus={initialFocus}
      returnFocus={returnFocus} modal={modal} slots={{ title: "Edit profile" }}>
      <button disabled>Disabled</button>
      <input id="profile-name" aria-label="Profile name" value={value}
        onChange={event => setValue(event.target.value)} />
      <button>Save changes</button>
      <button hidden>Hidden action</button>
    </Dialog>
  );
  return <>
    <button onClick={() => setOpen(true)}>Open profile</button>
    <button id="alternate-return">Alternate return</button>
    {target ? <PortalTargetProvider target={target}>{dialog}</PortalTargetProvider> : dialog}
  </>;
}

describe("focus through the public Dialog and portal lifecycle", () => {
  it("keeps initial focus on the connected panel after a conditional StrictMode mount", async () => {
    const user = userEvent.setup();
    render(<StrictMode><Consumer /></StrictMode>);
    await user.click(screen.getByRole("button", { name: "Open profile" }));
    const close = screen.getByRole("button", { name: "Close dialog" });
    expect(close).toHaveFocus();
    expect(close.isConnected).toBe(true);
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Save changes" })).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Open profile" })).toHaveFocus();
  });

  it.each(["#profile-name", "profile-name"])("honors initialFocus=%s and preserves focus while typing", async initialFocus => {
    const user = userEvent.setup();
    render(<Consumer initialFocus={initialFocus} />);
    await user.click(screen.getByRole("button", { name: "Open profile" }));
    const input = screen.getByRole("textbox", { name: "Profile name" });
    expect(input).toHaveFocus();
    await user.type(input, "Ada");
    expect(input).toHaveValue("Ada");
    expect(input).toHaveFocus();
  });

  it.each(["#missing", "["])("falls back safely for initialFocus=%s", async initialFocus => {
    const user = userEvent.setup();
    render(<Consumer initialFocus={initialFocus} />);
    await user.click(screen.getByRole("button", { name: "Open profile" }));
    expect(screen.getByRole("button", { name: "Close dialog" })).toHaveFocus();
  });

  it("can focus static dialog content selected by the consumer", async () => {
    const user = userEvent.setup();
    render(<Consumer initialFocus=".dialog__title" />);
    await user.click(screen.getByRole("button", { name: "Open profile" }));
    expect(screen.getByRole("heading", { name: "Edit profile" })).toHaveFocus();
  });

  it("restores an explicit return selector after close", async () => {
    const user = userEvent.setup();
    render(<Consumer returnFocus="#alternate-return" />);
    await user.click(screen.getByRole("button", { name: "Open profile" }));
    await user.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(screen.getByRole("button", { name: "Alternate return" })).toHaveFocus();
  });

  it("honors the composed portal destination without losing focus", async () => {
    const user = userEvent.setup();
    const target = document.createElement("section");
    document.body.append(target);
    const mounted = render(<Consumer target={target} initialFocus="#profile-name" />);
    await user.click(screen.getByRole("button", { name: "Open profile" }));
    const input = screen.getByRole("textbox", { name: "Profile name" });
    expect(target.contains(input)).toBe(true);
    expect(input).toHaveFocus();
    mounted.unmount();
    target.remove();
  });

  it("follows a changed portal destination while keeping the original return target", async () => {
    const user = userEvent.setup();
    const first = document.createElement("section");
    const second = document.createElement("section");
    document.body.append(first, second);
    const mounted = render(<Consumer target={first} initialFocus="#profile-name" />);
    const launcher = screen.getByRole("button", { name: "Open profile" });
    await user.click(launcher);
    await user.type(screen.getByRole("textbox", { name: "Profile name" }), "Ada");
    mounted.rerender(<Consumer target={second} initialFocus="#profile-name" />);
    const input = screen.getByRole("textbox", { name: "Profile name" });
    expect(second.contains(input)).toBe(true);
    expect(input).toHaveFocus();
    expect(input).toHaveValue("Ada");
    await user.keyboard("{Escape}");
    expect(launcher).toHaveFocus();
    mounted.unmount();
    first.remove();
    second.remove();
  });

  it("leaves focus on the launcher when the surface is non-modal", async () => {
    const user = userEvent.setup();
    render(<Consumer modal={false} initialFocus="#profile-name" />);
    const launcher = screen.getByRole("button", { name: "Open profile" });
    await user.click(launcher);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(launcher).toHaveFocus();
  });
});
