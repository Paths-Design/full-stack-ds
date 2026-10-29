# @full-stack-ds/angular

Full Stack DS components for angular.

Install the framework peer dependencies declared in package.json and @full-stack-ds/tokens. Component props and public data types are exported from the package root.

```ts
import { Component } from '@angular/core';
import { ButtonComponent } from '@full-stack-ds/angular';
import '@full-stack-ds/tokens/tokens.css';
import '@full-stack-ds/angular/styles.css';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [ButtonComponent],
  template: '<fsds-button>Continue</fsds-button>',
})
export class Example {}
```

The library ships partial Angular compilation for the standard Angular linker. Use a compatible Angular compiler and build pipeline.

Component-specific semantics, composition examples, and supported behavior are documented in the [repository](https://github.com/Paths-Design/full-stack-ds). A package build alone does not establish accessibility or native device compatibility for every component.

## License

MIT, copyright DesignPaths, LLC. The bundled THIRD_PARTY_NOTICES preserves the Lucide and Feather notices applicable to adapted icon geometry.
