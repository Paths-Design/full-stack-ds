// @generated:start imports
import { describe, it, expect } from "vitest";
import type { Component } from "vue";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import OTP from "../OTP.vue";
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("OTP — unit", () => {
  it("renders with default props", () => {
    const wrapper = mount(OTP as Component, { props: {}, attrs: { "data-testid": "otp" }, slots: { "default": "content" } });
    expect(wrapper.element).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    const wrapper = mount(OTP as Component, { props: {}, attrs: { "data-testid": "otp" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("otp");
  });

  it("merges custom class", () => {
    const wrapper = mount(OTP as Component, { props: {}, attrs: { "data-testid": "otp", "class": "custom" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("otp");
    expect(wrapper.classes()).toContain("custom");
  });

  it("forwards data-testid to the rendered element", () => {
    const wrapper = mount(OTP as Component, { props: {}, attrs: { "data-testid": "otp" }, slots: { "default": "content" } });
    expect(wrapper.find('[data-testid="otp"]').exists()).toBe(true);
  });

  it("has the correct ARIA role", () => {
    const wrapper = mount(OTP as Component, { props: {}, attrs: { "data-testid": "otp" }, slots: { "default": "content" } });
    expect(wrapper.attributes("role")).toBe("group");
  });

  it("applies mode=numeric variant class", () => {
    const wrapper = mount(OTP as Component, { props: { "mode": "numeric" }, attrs: { "data-testid": "otp" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("otp--numeric");
  });

  it("applies mode=alphanumeric variant class", () => {
    const wrapper = mount(OTP as Component, { props: { "mode": "alphanumeric" }, attrs: { "data-testid": "otp" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("otp--alphanumeric");
  });
});

describe("OTP — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const wrapper = mount(OTP as Component, { props: { "label": "Test OTP" }, attrs: { "data-testid": "otp" }, slots: { "default": "content" } });
    const results = await axe(wrapper.element, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
// CODEGEN-EMIT-LINT-HYGIENE-01: custom suites self-import their own `vi`
// (the Svelte-side convention) — the generated import set is body-derived.
import { vi } from "vitest";
import OTPGroup from "../OTPGroup.vue";
// FEAT-CHANNEL-UPDATE-OPERATIONS-01 — set-char-at-index on the OTP field's
// `input` wire. Pins the A2 behavioral claim for Vue (the second framework
// alongside React).
describe("OTP — set-char-at-index (channelUpdate setCharAt)", () => {
  it("typing in field N sets character N without overwriting the rest", async () => {
    const onChange = vi.fn();
    const wrapper = mount(OTP as Component, {
      props: { length: 4, defaultValue: "12", onChange },
    });
    const fields = wrapper.findAll("input[data-otp-index]");
    // Field index 2 receives "9": slice(0,2)="12" + "9" + slice(3)="" → "129".
    await fields[2].setValue("9");
    expect(onChange).toHaveBeenLastCalledWith("129");
  });

  it("replacing an existing character preserves surrounding positions", async () => {
    const onChange = vi.fn();
    const wrapper = mount(OTP as Component, {
      props: { length: 4, defaultValue: "1234", onChange },
    });
    const fields = wrapper.findAll("input[data-otp-index]");
    await fields[1].setValue("0"); // → "1034"
    expect(onChange).toHaveBeenLastCalledWith("1034");
  });
});

describe("OTP — compound parts", () => {
  it("mounts OTPGroup with tag, base class, and slot content", () => {
    const wrapper = mount(OTPGroup as Component, {
      slots: { default: "OTP part" },
      attrs: { "data-testid": "otp-otpgroup" },
    });
    expect(wrapper.element.tagName.toLowerCase()).toBe("div");
    expect(wrapper.classes()).toContain("otp__group");
    expect(wrapper.text()).toContain("OTP part");
  });
});
// @custom:end
