<script setup lang="ts">
// @generated:start imports
import { computed } from "vue";
import { tokenizeCode } from "../../primitives/highlight/tokenize.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type CodeBlockLanguage = "bash" | "css" | "html" | "javascript" | "json" | "jsx" | "markdown" | "plaintext" | "svelte" | "tsx" | "typescript" | "vue";
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  code: string;
  language: CodeBlockLanguage;
  highlight?: boolean;
  class?: string;
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
const props = withDefaults(defineProps<Props>(), {
  highlight: true,
});
// @generated:end

// @generated:start classes
const classNames = computed(() => [
  "code-block",
  props.class,
].filter(Boolean).join(" "));
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<template>
<pre :class="classNames" :data-language="props.language" :data-testid="props.dataTestid" data-fsds-component="code-block" data-fsds-box=""><code :class="'code-block__code'" spellcheck="false" :data-language="props.language"><slot /><span v-if="!$slots.default" :class="'code-block__source'"><template v-if="props.highlight"><span v-for="(token, tokenIndex) in tokenizeCode(props.code, props.language)" :key="tokenIndex" class="code-block__token" :data-token="token.kind">{{ token.text }}</span></template><template v-else>{{ props.code }}</template></span></code></pre>
</template>
