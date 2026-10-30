import { LitElement, html } from "lit";
import "../../../packages/ds-lit/src/components/Input/Input";
class TextParent extends LitElement {
  private accepted = "alpha";
  private accepting = false;
  onRequest: (value: string) => void = () => {};
  setValue(next: string) { this.accepted = next; this.requestUpdate(); }
  setAccepting(next: boolean) { this.accepting = next; }
  protected override render() {
    return html`<fsds-input type="text" ariaLabel="Same mounted input" .value=${this.accepted}
      .onChange=${(next: string) => { this.onRequest(next); if (this.accepting) this.setValue(next); }}></fsds-input>`;
  }
}
if (!customElements.get("fsds-text-parent")) customElements.define("fsds-text-parent", TextParent);
export function mountParent(target: HTMLElement, onRequest: (value: string) => void) {
  const parent = document.createElement("fsds-text-parent") as TextParent;
  parent.onRequest = onRequest; target.append(parent); return parent;
}
