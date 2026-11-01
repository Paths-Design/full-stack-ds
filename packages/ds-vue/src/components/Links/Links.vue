<script setup lang="ts">
// @generated:start imports
import { computed } from "vue";
import { canActivateInteraction, isActivationDisabled } from "../../primitives/interaction.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type LinkTarget = "_self" | "_blank" | "_parent" | "_top";
export type LinkSize = "small" | "medium" | "large";
export type LinkActivationEvent = { readonly defaultPrevented: boolean; preventDefault(): void };
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  href?: string;
  target?: LinkTarget;
  rel?: string;
  size?: LinkSize;
  disabled?: boolean;
  onClick?: (event: LinkActivationEvent) => void;
  class?: string;
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<Props>(), {
  disabled: undefined,
});
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "links",
  props.size ? `links--${props.size}` : null,
  props.disabled ? "links--disabled" : null,
  props.class,
].filter(Boolean).join(" "));
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<template>
  <a :class="classNames" v-bind="$attrs" role="link" tabindex="0" @click="(e: MouseEvent) => { if (canActivateInteraction(e, false, isActivationDisabled(props.disabled))) (props.onClick)?.(e); }" :href="isActivationDisabled(props.disabled) ? undefined : props.href" :target="props.target" :rel="props.rel" :aria-disabled="props.disabled" :data-testid="props.dataTestid" data-fsds-component="links" data-fsds-box="">
    <slot />
  </a>
</template>
