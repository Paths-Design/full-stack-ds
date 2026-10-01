import { createApp, h, ref } from "vue";
import Carousel from "../../../components/Carousel/Carousel.vue";
import Card from "../../../components/Card/Card.vue";

export function mountCarousel(target: HTMLElement) {
  createApp({
    setup() {
      const count = ref(0);
      return () => h(Carousel, { slides: ["First", "Second", "Third"], duration: null }, () =>
        ["First", "Second", "Third"].map(label => h(Card, {}, () =>
          h("button", { "data-content": label, onClick: () => count.value++ },
            label === "First" ? `First ${count.value}` : label))));
    },
  }).mount(target);
}
