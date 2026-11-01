import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

for (const mode of ["template", "library"] as const) {
  test(`Lit ${mode} native table composition`, async ({ page }, info) => {
    await page.goto("/preview/lit/Table");
    await page.locator("body[data-fsds-ready]").waitFor();
    await page.evaluate(async mode => {
      const fixture = await import("/e2e/fixtures/lit-table-consumer.ts");
      const host = mode === "template" ? fixture.mountTemplateProbe() : await fixture.mountLibrary();
      host.dataset.tableConsumer = "";
    }, mode);
    const facts = await page.locator("[data-table-consumer]").evaluate(host => {
      const table = host.shadowRoot!.querySelector("table")!;
      return {
        rows: table.rows.length,
        cells: Array.from(table.rows, row => row.cells.length),
        shadow: host.shadowRoot!.innerHTML,
        light: host.innerHTML,
        text: table.textContent,
      };
    });
    await writeFile(info.outputPath("native-table.json"), JSON.stringify(facts, null, 2));
    await page.screenshot({ path: info.outputPath("Table.png") });
    expect(facts.rows).toBe(4);
    expect(facts.cells).toEqual([2, 2, 2, 1]);
    const table = page.getByRole("table", { name: "Orders", exact: true });
    await expect(table.getByRole("columnheader")).toHaveText(["Team", "Seats"]);
    await expect(table.getByRole("rowheader")).toHaveText(["Team A", "Team B"]);
    await writeFile(info.outputPath("accessibility.yml"), await table.ariaSnapshot());
    const cdp = await page.context().newCDPSession(page);
    const ax = await cdp.send("Accessibility.getFullAXTree");
    await writeFile(info.outputPath("chromium-accessibility.json"), JSON.stringify(ax, null, 2));
    const axTable = ax.nodes.find(node => !node.ignored && node.role?.value === "table" && node.name?.value === "Orders");
    expect(axTable).toBeDefined();
    const nodes = new Map(ax.nodes.map(node => [node.nodeId, node]));
    const descendants = ax.nodes.filter(node => {
      let parent = node.parentId;
      while (parent) {
        if (parent === axTable!.nodeId) return !node.ignored;
        parent = nodes.get(parent)?.parentId;
      }
      return false;
    });
    expect(descendants.filter(node => node.role?.value === "row")).toHaveLength(4);
    expect(descendants.filter(node => node.role?.value === "columnheader").map(node => node.name?.value)).toEqual(["Team", "Seats"]);
    expect(descendants.filter(node => node.role?.value === "rowheader").map(node => node.name?.value)).toEqual(["Team A", "Team B"]);
    await table.getByRole("button", { name: "Edit A" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("body")).toHaveAttribute("data-activations", "1");
    if (mode === "library") {
      const geometry = await table.evaluate(element => {
        const table = element as HTMLTableElement;
        const header = table.tHead!.rows[0].cells;
        const body = table.tBodies[0].rows[0].cells;
        return {
          header: Array.from(header, cell => cell.getBoundingClientRect().toJSON()),
          body: Array.from(body, cell => cell.getBoundingClientRect().toJSON()),
          padding: getComputedStyle(body[1]).paddingLeft,
          cellBackground: getComputedStyle(body[1]).backgroundColor,
          weight: getComputedStyle(header[0]).fontWeight,
          footerSpan: table.tFoot!.rows[0].cells[0].colSpan,
          rowClass: table.tBodies[0].rows[0].className,
        };
      });
      await writeFile(info.outputPath("column-geometry.json"), JSON.stringify(geometry, null, 2));
      expect(geometry.padding).toBe("13px");
      expect(geometry.cellBackground).toBe("rgb(238, 245, 255)");
      expect(geometry.weight).toBe("700");
      expect(geometry.footerSpan).toBe(2);
      expect(geometry.rowClass).toBe("table__row consumer-row");
      for (const column of [0, 1]) {
        expect(geometry.header[column].width).toBeGreaterThan(0);
        expect(Math.abs(geometry.header[column].left - geometry.body[column].left)).toBeLessThan(0.5);
        expect(Math.abs(geometry.header[column].width - geometry.body[column].width)).toBeLessThan(0.5);
      }
    }
    await expect(table.getByRole("button", { name: "Edit A" })).toBeFocused();
    await page.evaluate(async mode => {
      const fixture = await import("/e2e/fixtures/lit-table-consumer.ts");
      if (mode === "library") await fixture.updateLibrary(["a", "b"]);
      else fixture.updateTemplateProbe(["a", "b"]);
    }, mode);
    await expect(table.getByRole("button", { name: "Edit A" })).toBeFocused();
    await table.getByRole("button", { name: "Edit A" }).evaluate(button => {
      (window as unknown as { focusedCell: Element }).focusedCell = button;
    });
    await page.evaluate(async mode => {
      const fixture = await import("/e2e/fixtures/lit-table-consumer.ts");
      if (mode === "library") await fixture.updateLibrary(["b", "a"]);
      else fixture.updateTemplateProbe(["b", "a"]);
    }, mode);
    await expect(table.getByRole("rowheader")).toHaveText(["Team B", "Team A"]);
    const focus = await table.getByRole("button", { name: "Edit A" }).evaluate(button => ({
      sameNode: button === (window as unknown as { focusedCell: Element }).focusedCell,
      focused: button.getRootNode() instanceof ShadowRoot && (button.getRootNode() as ShadowRoot).activeElement === button,
    }));
    await writeFile(info.outputPath("reorder-focus.json"), JSON.stringify(focus, null, 2));
    expect(focus.sameNode).toBe(true);
    await page.getByRole("button", { name: "Before table", exact: true }).focus();
    await page.keyboard.press("Tab");
    if (mode === "library") {
      await expect(page.locator("[data-table-consumer]").getByRole("region", { name: "Table content", exact: true })).toBeFocused();
      await page.keyboard.press("Tab");
    }
    await expect(table.getByRole("button", { name: "Edit A" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("body")).toHaveAttribute("data-activations", "2");
    await page.evaluate(async mode => {
      const fixture = await import("/e2e/fixtures/lit-table-consumer.ts");
      if (mode === "library") await fixture.updateLibrary([]);
      else fixture.updateTemplateProbe([]);
    }, mode);
    await expect(table.getByRole("row")).toHaveCount(2);
    await expect(table.getByRole("rowheader")).toHaveCount(0);
    await expect(table.getByRole("button", { name: "Edit A" })).toHaveCount(0);
  });
}
