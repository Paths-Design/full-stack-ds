/**
 * Phase-2 surface smoke (SHOWCASE-CHROME-T2-01): renders the four new
 * surfaces against a minimal bundle and asserts the load-bearing structure —
 * the palette's dialog + entries, Settings' persisted-pref controls, the
 * Activity feed's Postcards + Calendar, and the About dialog's markdown.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CommandPalette } from "../components/CommandPalette";
import { AboutDialog } from "../components/AboutDialog";
import { SettingsView } from "./SettingsView";
import { ActivityView } from "./ActivityView";
import type { ActivityEvent, Bundle } from "../types/data";

const EVENTS: ActivityEvent[] = [
  {
    id: "commit:abc",
    kind: "commit",
    title: "feat(x): did a thing",
    author: "darianrosebrook",
    timestamp: "2026-08-17T10:00:00.000Z",
    stats: { commits: 1, replies: 0, reposts: 0 },
  },
  {
    id: "spec:EXAMPLE-01",
    kind: "spec",
    title: "Example spec",
    author: "caws",
    timestamp: "2026-08-16T10:00:00.000Z",
    stats: { commits: 1, replies: 0, reposts: 0 },
  },
];

const bundle = {
  components: [],
  primitives: [],
  schema: {},
  tokensCss: "",
  foundationTokens: [],
  brandTokens: [],
  activity: EVENTS,
  generatedAt: 0,
} as unknown as Bundle;

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("CommandPalette", () => {
  it("renders closed as nothing, open as a dialog with static entries", () => {
    const { rerender } = render(
      <CommandPalette bundle={bundle} open={false} onOpenChange={() => {}} />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(<CommandPalette bundle={bundle} open onOpenChange={() => {}} />);
    // The DS Dialog renders a nested pair of role=dialog nodes (portal root
    // + modal) — assert the modal itself.
    expect(screen.getAllByRole("dialog", { name: "Command palette" }).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Filter destinations")).toBeDefined();
    // Static destinations include the two phase-3 views.
    expect(screen.getByRole("link", { name: /Settings/ })).toBeDefined();
    expect(screen.getByRole("link", { name: /Activity/ })).toBeDefined();
  });
});

describe("SettingsView", () => {
  it("renders the pref controls: framework select, toggles, group checkboxes, reset gate", () => {
    render(<SettingsView />);
    expect(screen.getByRole("heading", { name: "Settings" })).toBeDefined();
    expect(screen.getAllByRole("switch").length).toBe(2);
    expect(screen.getAllByRole("checkbox").length).toBe(9);
    expect(screen.getByRole("button", { name: /Reset all preferences/ })).toBeDefined();
  });
});

describe("ActivityView", () => {
  it("shares an accepted page with Pagination while owning the feed projection", () => {
    const activity = Array.from({ length: 13 }, (_, index) => ({ ...EVENTS[0], id: `event-${index}`, title: `Entry ${index + 1}` }));
    render(<ActivityView bundle={{ ...bundle, activity }} />);
    expect(screen.getAllByRole("article")).toHaveLength(12);
    expect(screen.queryByText("Entry 13")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("Entry 13")).toBeDefined();
    expect(screen.queryByText("Entry 1")).toBeNull();
    expect(screen.getByRole("button", { name: "2" })).toHaveAttribute("aria-current", "true");
  });
  it("renders real feed data as Postcards with an activity Calendar", () => {
    render(<ActivityView bundle={bundle} />);
    expect(screen.getByRole("heading", { name: "Activity" })).toBeDefined();
    const articles = screen.getAllByRole("article");
    expect(articles.length).toBe(2);
    expect(screen.getByText(/feat\(x\): did a thing/)).toBeDefined();
    expect(screen.getByLabelText(/Days with recorded activity/)).toBeDefined();
  });
});

describe("AboutDialog", () => {
  it("renders open with markdown content and the figure", () => {
    render(<AboutDialog open onOpenChange={() => {}} />);
    expect(screen.getAllByRole("dialog", { name: "About Full-Stack DS" }).length).toBeGreaterThan(0);
    expect(screen.getByText("The components are the demo; the claim is the project")).toBeDefined();
    expect(screen.getAllByRole("img").length).toBeGreaterThanOrEqual(2);
  });
});
