import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PropsTable } from "./PropsTable";
import type { ComponentContract } from "../../types/data";

const carousel = JSON.parse(
  readFileSync(resolve(__dirname, "../../../packages/ds-contracts/components/Carousel/Carousel.contract.json"), "utf8"),
) as ComponentContract;

function defaultCell(prop: string): string {
  const row = screen.getByText(prop, { selector: "code" }).closest("tr");
  if (!row) throw new Error(`no row for ${prop}`);
  return row.querySelectorAll("td")[2].textContent ?? "";
}

describe("PropsTable defaults", () => {
  it("shows a message-defaulted prop's contract text and its message key", () => {
    render(<PropsTable members={carousel.props!.styled!.members!} messages={carousel.messages} />);
    expect(defaultCell("label")).toBe('"Featured content" message:regionLabel');
  });

  it("shows a literal default unchanged", () => {
    render(<PropsTable members={carousel.props!.styled!.members!} messages={carousel.messages} />);
    const literal = carousel.props!.styled!.members!.find((m) => m.default !== undefined && m.defaultMessage === undefined);
    expect(literal).toBeDefined();
    expect(defaultCell(literal!.name)).toBe(JSON.stringify(literal!.default));
  });
});
