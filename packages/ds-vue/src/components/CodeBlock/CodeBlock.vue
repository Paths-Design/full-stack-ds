<script setup lang="ts">
// @generated:start imports
import { computed } from "vue";
import { prepareHighlightSource } from "../../primitives/highlight/tokenize.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export type CodeBlockLanguage = "bash" | "css" | "html" | "javascript" | "json" | "jsx" | "markdown" | "plaintext" | "svelte" | "tsx" | "typescript" | "vue";
export type CodeBlockTokenType = "comment" | "definition" | "keyword" | "plain" | "property" | "punctuation" | "static" | "string" | "tag";
export type CodeBlockToken = { kind: CodeBlockTokenType; text: string };
// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  code: string;
  language: CodeBlockLanguage;
  highlight?: boolean;
  tokens?: CodeBlockToken[];
  showLineNumbers?: boolean;
  class?: string;
  dataTestid?: string;
}
// @generated:end

// @generated:start defineProps
const props = withDefaults(defineProps<Props>(), {
  highlight: true,
  showLineNumbers: false,
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
<pre :class="classNames" :data-language="props.language" :data-line-numbers="props.showLineNumbers" :data-testid="props.dataTestid" data-fsds-component="code-block" data-fsds-box=""><code :class="'code-block__code'" spellcheck="false" :data-language="props.language"><slot /><span v-if="!$slots.default" :class="'code-block__source'"><span v-for="line in prepareHighlightSource(props.code, props.language, { tokens: props.tokens, highlight: props.highlight }).lines" :key="line.number" class="code-block__line"><span class="code-block__gutter" :data-line="line.number" aria-hidden="true"></span><template v-for="(token, tokenIndex) in line.tokens" :key="tokenIndex"><span v-if="line.highlighted" class="code-block__token" :data-token="token.kind">{{ token.text }}</span><template v-else>{{ token.text }}</template></template>{{ line.ending }}</span></span></code></pre>
</template>
