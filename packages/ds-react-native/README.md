# @full-stack-ds/react-native

Full Stack DS components for react-native.

This package ships JavaScript and TypeScript declarations for a React Native bundler. Install the declared React, React Native, and react-native-svg peers. Components, primitives, and the token provider share one runtime context through the package's root, `/primitives`, and `/tokens` exports.

```tsx
import { Button } from '@full-stack-ds/react-native';

export function Example() {
  return <Button onClick={() => console.log('Activated')}>Continue</Button>;
}
```



Component-specific semantics, composition examples, and supported behavior are documented in the [repository](https://github.com/Paths-Design/full-stack-ds). A package build alone does not establish accessibility or native device compatibility for every component.

## License

MIT, copyright DesignPaths, LLC. The bundled THIRD_PARTY_NOTICES preserves the Lucide and Feather notices applicable to adapted icon geometry.
