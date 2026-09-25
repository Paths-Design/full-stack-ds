<script lang="ts">
// @generated:start imports
import { prepareHighlightSource } from "../../primitives/highlight/tokenize.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
type CodeBlockLanguage = "bash" | "css" | "html" | "javascript" | "json" | "jsx" | "markdown" | "plaintext" | "svelte" | "tsx" | "typescript" | "vue";
type CodeBlockTokenType = "comment" | "definition" | "keyword" | "plain" | "property" | "punctuation" | "static" | "string" | "tag";
type CodeBlockToken = { kind: CodeBlockTokenType; text: string };
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
  children?: import('svelte').Snippet;
}

let { code, language, highlight = true, tokens, showLineNumbers = false, class: className, children }: Props = $props();
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "code-block",
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<pre class={classes} data-language={language} data-line-numbers={showLineNumbers} data-fsds-component="code-block" data-fsds-box=""><code class={'code-block__code'} spellcheck="false" data-language={language}>{@render children?.()}{#if !children}<span class={'code-block__source'}>{#each prepareHighlightSource(code, language, { tokens: tokens, highlight: highlight }).lines as line (line.number)}<span class="code-block__line"><span class="code-block__gutter" data-line={line.number} aria-hidden="true"></span>{#each line.tokens as token}{#if line.highlighted}<span class="code-block__token" data-token={token.kind}>{token.text}</span>{:else}{token.text}{/if}{/each}{line.ending}</span>{/each}</span>{/if}</code></pre>
