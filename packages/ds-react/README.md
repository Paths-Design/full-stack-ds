# @full-stack-ds/react

Full Stack DS components for react.

Install the framework peer dependencies declared in package.json and @full-stack-ds/tokens. Component props and public data types are exported from the package root.

```tsx
import { Button } from '@full-stack-ds/react';
import '@full-stack-ds/tokens/tokens.css';
import '@full-stack-ds/react/styles.css';

export function Example() {
  return <Button onClick={() => console.log('Activated')}>Continue</Button>;
}
```



Component-specific semantics, composition examples, and supported behavior are documented in the [repository](https://github.com/Paths-Design/full-stack-ds). A package build alone does not establish accessibility or native device compatibility for every component.

## License

MIT, copyright DesignPaths, LLC. The bundled THIRD_PARTY_NOTICES preserves the Lucide and Feather notices applicable to adapted icon geometry.
