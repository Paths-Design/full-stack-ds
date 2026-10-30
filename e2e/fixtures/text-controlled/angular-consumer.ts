export async function mountParent(target: HTMLElement, onRequest: (value: string) => void) {
  // Resolve through the preview's import map so parent and compiled child use
  // the same Angular runtime. Only this test parent is JIT-compiled.
  const corePath = "@angular/core";
  const platformPath = "@angular/platform-browser";
  const inputPath = "/preview/angular/src/components/Input/Input.component.js";
  const { Component, signal, provideZonelessChangeDetection } = await import(/* @vite-ignore */ corePath);
  const { bootstrapApplication } = await import(/* @vite-ignore */ platformPath);
  const { InputComponent } = await import(/* @vite-ignore */ inputPath);
  let destroyOwner = () => {};
  class Parent {
    value = signal("alpha");
    accepting = false;
    destroying = false;
    onChange = (next: string) => { onRequest(next); if (this.destroying) destroyOwner(); else if (this.accepting) this.value.set(next); };
    setValue(next: string) { this.value.set(next); }
    setAccepting(next: boolean) { this.accepting = next; }
    setDestroying(next: boolean) { this.destroying = next; }
  }
  Component({ selector: "fsds-text-parent-angular", standalone: true, imports: [InputComponent],
    template: '<fsds-input type="text" ariaLabel="Same mounted input" [value]="value()" [onChange]="onChange" />',
  })(Parent);
  target.append(document.createElement("fsds-text-parent-angular"));
  const app = await bootstrapApplication(Parent, { providers: [provideZonelessChangeDetection()] });
  destroyOwner = () => app.destroy();
  return app.components[0].instance;
}
