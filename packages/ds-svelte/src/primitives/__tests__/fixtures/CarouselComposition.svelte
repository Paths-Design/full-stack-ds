<script lang="ts">
  import Carousel from "../../../components/Carousel/Carousel.svelte";
  import Card from "../../../components/Card/Card.svelte";
  let count = $state(0);
</script>
<Carousel slides={["First", "Second", "Third"]} duration={null}>
  <Card><button data-content="First" onclick={() => count++}>First {count}</button></Card>
  <Card><button data-content="Second">Second</button></Card>
  <Card><button data-content="Third">Third</button></Card>
</Carousel>
