import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Carousel } from "../../../components/Carousel/Carousel";
import { Card } from "../../../components/Card/Card";

function Composition() {
  const [count, setCount] = useState(0);
  return <Carousel slides={["First", "Second", "Third"]} duration={null}>
    <Card><button data-content="First" onClick={() => setCount(count + 1)}>First {count}</button></Card>
    <Card><button data-content="Second">Second</button></Card>
    <Card><button data-content="Third">Third</button></Card>
  </Carousel>;
}
export function mountCarousel(target: HTMLElement) {
  createRoot(target).render(<Composition />);
}
