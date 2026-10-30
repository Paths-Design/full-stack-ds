# @full-stack-ds/lit

Full Stack DS components for lit.

Install the framework peer dependencies declared in package.json and @full-stack-ds/tokens. Component props and public data types are exported from the package root.

```ts
import '@full-stack-ds/lit';
import '@full-stack-ds/tokens/tokens.css';

document.querySelector('#app')!.innerHTML = '<fsds-button>Continue</fsds-button>';
```

Lit components register their custom elements when imported and carry component styles inside shadow roots. Global token CSS inherits through those roots.

Component-specific semantics, composition examples, and supported behavior are documented in the [repository](https://github.com/Paths-Design/full-stack-ds). A package build alone does not establish accessibility or native device compatibility for every component.

## License

MIT, copyright DesignPaths, LLC. The bundled THIRD_PARTY_NOTICES preserves the Lucide and Feather notices applicable to adapted icon geometry.
