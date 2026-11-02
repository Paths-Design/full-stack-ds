# @full-stack-ds/vue

Node 22.19 or later is required for Node tooling and package consumption. Browser runtime requirements follow the framework peers. ESM imports and synchronous CommonJS requires share one ESM implementation and its providers and contexts.

Full Stack DS components for vue.

Install the framework peer dependencies declared in package.json and @full-stack-ds/tokens. Component props and public data types are exported from the package root.

```vue
<script setup lang="ts">
import { Button } from '@full-stack-ds/vue';
import '@full-stack-ds/tokens/tokens.css';
import '@full-stack-ds/vue/styles.css';
</script>

<template><Button>Continue</Button></template>
```



Component-specific semantics, composition examples, and supported behavior are documented in the [repository](https://github.com/Paths-Design/full-stack-ds). A package build alone does not establish accessibility or native device compatibility for every component.

## License

MIT, copyright DesignPaths, LLC. The bundled THIRD_PARTY_NOTICES preserves the Lucide and Feather notices applicable to adapted icon geometry.
