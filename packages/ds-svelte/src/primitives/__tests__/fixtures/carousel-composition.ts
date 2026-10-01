import { mount } from "svelte";
import Composition from "./CarouselComposition.svelte";
export function mountCarousel(target: HTMLElement) { mount(Composition, { target }); }
