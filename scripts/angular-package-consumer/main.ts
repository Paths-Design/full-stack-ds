import { Component, enableProdMode, provideZonelessChangeDetection, signal } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { ButtonComponent } from "@full-stack-ds/angular";
import "@full-stack-ds/angular/styles.css";

@Component({
  selector: "packed-consumer", standalone: true, imports: [ButtonComponent],
  template: `<fsds-button variant="primary" size="large" [disabled]="disabled()" ariaLabel="Packed consumer action" [onClick]="activate">Packed action</fsds-button>
    <button id="toggle-disabled" (click)="disabled.set(!disabled())">Toggle disabled</button>
    <output id="click-count">{{ count() }}</output>`,
})
class PackedConsumer {
  readonly count = signal(0);
  readonly disabled = signal(false);
  readonly activate = () => this.count.update((value) => value + 1);
}

enableProdMode();
bootstrapApplication(PackedConsumer, { providers: [provideZonelessChangeDetection()] })
  .catch((error) => { console.error(error); throw error; });
