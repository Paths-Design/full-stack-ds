import { LitElement, html } from "lit";
import "../../../components/Carousel/Carousel.js";
import "../../../components/Card/Card.js";

class Composition extends LitElement {
  static properties = { count: { state: true } };
  count = 0;
  override createRenderRoot() { return this; }
  override render() {
    return html`<fsds-carousel .slides=${["First", "Second", "Third"]} .duration=${null}>
      <fsds-card><button data-content="First" @click=${() => this.count++}>First ${this.count}</button></fsds-card>
      <fsds-card><button data-content="Second">Second</button></fsds-card>
      <fsds-card><button data-content="Third">Third</button></fsds-card>
    </fsds-carousel>`;
  }
}
customElements.define("carousel-composition", Composition);
export function mountCarousel(target: HTMLElement) { target.append(new Composition()); }
