// @generated:start imports
import { describe, it, expect } from "vitest";
import type { Component } from "vue";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import Table from "../Table.vue";
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("Table — unit", () => {
  it("renders with default props", () => {
    const wrapper = mount(Table as Component, { props: {}, attrs: { "data-testid": "table" }, slots: { "default": "content" } });
    expect(wrapper.element).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    const wrapper = mount(Table as Component, { props: {}, attrs: { "data-testid": "table" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("table");
  });

  it("merges custom class", () => {
    const wrapper = mount(Table as Component, { props: {}, attrs: { "data-testid": "table", "class": "custom" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("table");
    expect(wrapper.classes()).toContain("custom");
  });

  it("forwards data-testid to the rendered element", () => {
    const wrapper = mount(Table as Component, { props: {}, attrs: { "data-testid": "table" }, slots: { "default": "content" } });
    expect(wrapper.find('[data-testid="table"]').exists()).toBe(true);
  });
});

describe("Table — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const wrapper = mount(Table as Component, { props: { "contentLabel": "Test Table" }, attrs: { "data-testid": "table" }, slots: { "default": "<tbody><tr><td>content</td></tr></tbody>" } });
    const results = await axe(wrapper.element, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
import TableBody from "../TableBody.vue";
import TableCaption from "../TableCaption.vue";
import TableCell from "../TableCell.vue";
import TableFooter from "../TableFooter.vue";
import TableHead from "../TableHead.vue";
import TableHeaderCell from "../TableHeaderCell.vue";
import TableRow from "../TableRow.vue";

// SHOWCASE-CONSUMPTION-03 A1 — the Vue cell/header SFCs own their <td>/<th>,
// so they must forward the HTML attributes a real data table needs.
describe("Table — cell attribute forwarding", () => {
  it("TableCell forwards colspan/id/style onto the <td>", () => {
    const wrapper = mount(TableCell as Component, {
      props: { colSpan: 4, id: "cell-1", style: "text-align: center" },
      slots: { default: "Section" },
    });
    expect(wrapper.element.tagName).toBe("TD");
    expect(wrapper.attributes("colspan")).toBe("4");
    expect(wrapper.attributes("id")).toBe("cell-1");
    expect(wrapper.attributes("style") ?? "").toContain("text-align");
  });

  it("TableHeaderCell forwards scope/rowspan onto the <th>", () => {
    const wrapper = mount(TableHeaderCell as Component, {
      props: { scope: "col", rowSpan: 2 },
      slots: { default: "H" },
    });
    expect(wrapper.element.tagName).toBe("TH");
    expect(wrapper.attributes("scope")).toBe("col");
    expect(wrapper.attributes("rowspan")).toBe("2");
  });

  it("omits unset attributes (no empty colspan/id)", () => {
    const wrapper = mount(TableCell as Component, { slots: { default: "x" } });
    expect(wrapper.attributes("colspan")).toBeUndefined();
    expect(wrapper.attributes("id")).toBeUndefined();
  });
});

describe("Table — compound parts", () => {
  it("mounts TableBody with tag, base class, and slot content", () => {
    const wrapper = mount(TableBody as Component, {
      slots: { default: "Table part" },
      attrs: { "data-testid": "table-tablebody" },
    });
    expect(wrapper.element.tagName.toLowerCase()).toBe("tbody");
    expect(wrapper.classes()).toContain("table__body");
    expect(wrapper.text()).toContain("Table part");
  });

  it("mounts TableCaption with tag, base class, and slot content", () => {
    const wrapper = mount(TableCaption as Component, {
      slots: { default: "Table part" },
      attrs: { "data-testid": "table-tablecaption" },
    });
    expect(wrapper.element.tagName.toLowerCase()).toBe("caption");
    expect(wrapper.classes()).toContain("table__caption");
    expect(wrapper.text()).toContain("Table part");
  });

  it("mounts TableCell with tag, base class, and slot content", () => {
    const wrapper = mount(TableCell as Component, {
      slots: { default: "Table part" },
      attrs: { "data-testid": "table-tablecell" },
    });
    expect(wrapper.element.tagName.toLowerCase()).toBe("td");
    expect(wrapper.classes()).toContain("table__cell");
    expect(wrapper.text()).toContain("Table part");
  });

  it("mounts TableFooter with tag, base class, and slot content", () => {
    const wrapper = mount(TableFooter as Component, {
      slots: { default: "Table part" },
      attrs: { "data-testid": "table-tablefooter" },
    });
    expect(wrapper.element.tagName.toLowerCase()).toBe("tfoot");
    expect(wrapper.classes()).toContain("table__footer");
    expect(wrapper.text()).toContain("Table part");
  });

  it("mounts TableHead with tag, base class, and slot content", () => {
    const wrapper = mount(TableHead as Component, {
      slots: { default: "Table part" },
      attrs: { "data-testid": "table-tablehead" },
    });
    expect(wrapper.element.tagName.toLowerCase()).toBe("thead");
    expect(wrapper.classes()).toContain("table__head");
    expect(wrapper.text()).toContain("Table part");
  });

  it("mounts TableRow with tag, base class, and slot content", () => {
    const wrapper = mount(TableRow as Component, {
      slots: { default: "Table part" },
      attrs: { "data-testid": "table-tablerow" },
    });
    expect(wrapper.element.tagName.toLowerCase()).toBe("tr");
    expect(wrapper.classes()).toContain("table__row");
    expect(wrapper.text()).toContain("Table part");
  });
});
// @custom:end
