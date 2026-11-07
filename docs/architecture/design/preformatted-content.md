---
doc_id: REF-PREFORMATTED-CONTENT-001
authority: reference
status: active
title: Preformatted content
owner: "@darianrosebrook"
updated: 2026-11-05
---

# Preformatted content

`CODEBLOCK-PREFORMATTED-WHITESPACE-01` repairs a browser finding where Vue and
Angular CodeBlock previews had extra space around a single line of code.
Their generated template indentation was preserved as text by the `pre` host.
At the observed default styling, the block measured 160px high instead of
React's 55px despite identical 16px padding and 21px line height. Svelte and Lit
also added outer spaces and a newline, with less visible impact.

The existing contract already supplies the required fact: a `pre` element.
Vue, Angular, Svelte, and Lit emit its subtree compactly, including conditional
and iteration wrappers. The context follows descendants and does not depend
on the component name. Interpolated content is unchanged; trimming source or
compensating with padding would destroy or obscure the intended semantics.
React's JSX realization already avoids the formatting text in this case.

`packages/ds-codegen/src/frameworks/preformatted-whitespace.test.ts` exercises
an unrelated nested preformatted fixture with conditional iteration.
`e2e/codeblock-whitespace.spec.ts` checks raw text content and single-line
geometry across all Web frameworks, then changes the supplied code with
highlighting on and off. It includes tabs, blank lines, leading spaces,
trailing newlines, markup-like text, and empty content. Normalized text matchers
would conceal the original error, so the regression uses exact text equality.
The original Vue and Angular output fails that regression; the repaired output
passes. Screenshots remain in ignored test output.

This repair covers declared HTML preformatted context. It does not infer
whitespace behavior from arbitrary consumer CSS or establish native code-view
rendering parity. No token values or component style declarations change.
