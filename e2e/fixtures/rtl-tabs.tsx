import { createRoot } from "react-dom/client";
import { createApp, h } from "vue";
import { mount } from "svelte";
import { Tabs, TabsList, TabsTab, TabsPanel } from "../../packages/ds-react/src/components/Tabs/Tabs";
import VueTabs from "../../packages/ds-vue/src/components/Tabs/Tabs.vue";
import VueTabsList from "../../packages/ds-vue/src/components/Tabs/TabsList.vue";
import VueTabsTab from "../../packages/ds-vue/src/components/Tabs/TabsTab.vue";
import VueTabsPanel from "../../packages/ds-vue/src/components/Tabs/TabsPanel.vue";
import SvelteTabsFixture from "../../packages/ds-svelte/src/components/Tabs/__tests__/TabsFixture.svelte";
import "../../packages/ds-lit/src/components/Tabs/Tabs";
import "../../packages/ds-tokens/generated/tokens.css";

type Framework = "react" | "vue" | "svelte" | "lit";

/**
 * Mounts a two-tab list without loop inside a right-to-left region. Without
 * loop, a physical arrow mapping leaves the first tab selected on ArrowLeft.
 */
export function mountFixture(framework: Framework): void {
  const region = document.createElement("section");
  region.setAttribute("aria-label", `${framework} right-to-left tabs`);
  region.dir = "rtl";
  document.body.append(region);

  if (framework === "react") {
    createRoot(region).render(
      <Tabs defaultValue="a" loop={false}>
        <TabsList>
          <TabsTab value="a">Tab A</TabsTab>
          <TabsTab value="b">Tab B</TabsTab>
        </TabsList>
        <TabsPanel value="a">Panel A content</TabsPanel>
        <TabsPanel value="b">Panel B content</TabsPanel>
      </Tabs>,
    );
  } else if (framework === "vue") {
    createApp({
      render: () =>
        h(VueTabs, { defaultValue: "a", loop: false }, {
          default: () => [
            h(VueTabsList, null, {
              default: () => [
                h(VueTabsTab, { value: "a" }, { default: () => "Tab A" }),
                h(VueTabsTab, { value: "b" }, { default: () => "Tab B" }),
              ],
            }),
            h(VueTabsPanel, { value: "a" }, { default: () => "Panel A content" }),
            h(VueTabsPanel, { value: "b" }, { default: () => "Panel B content" }),
          ],
        }),
    }).mount(region);
  } else if (framework === "svelte") {
    mount(SvelteTabsFixture, { target: region, props: { defaultValue: "a", loop: false } });
  } else {
    // Properties are set before the tree connects, as the Lit unit tests do,
    // so the behavior reads defaultValue and loop when it starts.
    type LitTabsElement = HTMLElement & { value?: string; defaultValue?: string; loop?: boolean };
    const element = (tag: string, props: Partial<LitTabsElement>, text?: string): LitTabsElement => {
      const node = Object.assign(document.createElement(tag), props) as LitTabsElement;
      if (text) node.textContent = text;
      return node;
    };
    const tabs = element("fsds-tabs", { defaultValue: "a", loop: false });
    const list = element("fsds-tabs-list", {});
    list.append(element("fsds-tabs-tab", { value: "a" }, "Tab A"), element("fsds-tabs-tab", { value: "b" }, "Tab B"));
    tabs.append(
      list,
      element("fsds-tabs-panel", { value: "a" }, "Panel A content"),
      element("fsds-tabs-panel", { value: "b" }, "Panel B content"),
    );
    region.append(tabs);
  }
}
