<script setup lang="ts">
// @generated:start imports
import { computed } from "vue";
import { useFsdsMessages, withFsdsMessageDefaults } from "../../primitives/messages.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  ariaLabel?: string;
  separator?: string;
  class?: string;
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
const fsdsProps = defineProps<Props>();
const BreadcrumbsMessages = { navigationLabel: "Breadcrumb" };
const fsdsMessages = useFsdsMessages("Breadcrumbs", BreadcrumbsMessages);
const props = withFsdsMessageDefaults(fsdsProps, fsdsMessages, { ariaLabel: "navigationLabel" });
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "breadcrumbs",
  props.class,
].filter(Boolean).join(" "));
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<template>
  <nav :class="classNames" :aria-label="props.ariaLabel" :data-testid="props.dataTestid" data-fsds-component="breadcrumbs" data-fsds-box="">
    <ol :class="'breadcrumbs__list'">
      <slot />
    </ol>
  </nav>
</template>
