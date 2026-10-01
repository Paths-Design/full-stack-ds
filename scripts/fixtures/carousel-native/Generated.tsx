import { useEffect, useRef, useState, type RefObject } from 'react';
import { AccessibilityInfo, Platform, Text, View } from 'react-native';
import { Carousel } from '../../../packages/ds-react-native/src/components/Carousel/Carousel';

const buildIdentity = '__FSDS_NATIVE_BUILD_ID__';
const labels = ['First', 'Second', 'Third'];
const profile = { durationMs: 250, referenceWidth: 320 };
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
type Frame = { x: number; y: number; width: number; height: number };
const measure = (ref: RefObject<View | null>) => new Promise<Frame>((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Native measurement timed out')), 3000);
  if (!ref.current) { clearTimeout(timeout); reject(new Error('Missing generated content')); return; }
  ref.current.measureInWindow((x, y, width, height) => { clearTimeout(timeout); resolve({ x, y, width, height }); });
});

/** Real generated component, its composed Pagination, and its own advance clock.
 * The actor accepts the component's request; it never invokes a primitive.
 */
export default function GeneratedCarouselWitness() {
  const [index, setIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [status, setStatus] = useState('Waiting for generated content');
  const first = useRef<View | null>(null);
  const second = useRef<View | null>(null);
  const accepted = useRef({ index: 0, at: 0 });
  useEffect(() => {
    let alive = true;
    void (async () => {
      const reducedMotion = await AccessibilityInfo.isReduceMotionEnabled();
      await wait(700);
      if (!alive) return;
      const baseline = await measure(first);
      setStatus('Waiting for generated autoplay');
      setAutoPlay(true);
      const deadline = performance.now() + 4000;
      while (alive && accepted.current.index === 0 && performance.now() < deadline) await wait(8);
      if (!alive) return;
      if (accepted.current.index !== 1) throw new Error('Generated autoplay did not request the next slide');
      const startedAt = accepted.current.at;
      await wait(48);
      const early = { first: await measure(first), second: await measure(second), at: performance.now() - startedAt };
      await wait(60);
      const middle = { first: await measure(first), second: await measure(second), at: performance.now() - startedAt };
      await wait(250);
      const settled = await measure(second);
      setAutoPlay(false);
      const result = { kind: 'generated-carousel-movement', buildIdentity, platform: Platform.OS, reducedMotion,
        baseline, early, middle, settled, index: accepted.current.index, profile };
      await fetch('http://127.0.0.1:5210/receipt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result) });
      if (alive) setStatus('Generated movement measurements delivered');
    })().catch(async error => {
      if (alive) setStatus(String(error));
      await fetch('http://127.0.0.1:5210/receipt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: String(error) }) }).catch(() => {});
    });
    return () => { alive = false; };
  }, []);
  return <View style={{ flex: 1, backgroundColor: '#f5f5f5', alignItems: 'center', paddingTop: 100 }}>
    <Text style={{ fontSize: 22, marginBottom: 24 }}>Generated Carousel witness</Text>
    <Carousel slides={labels} index={index} onIndexChange={next => { accepted.current = { index: next, at: performance.now() }; setIndex(next); }} autoPlay={autoPlay} duration={1000} style={{ width: 320 }}>
      <View key="first" ref={first} collapsable={false} style={{ height: 160, backgroundColor: '#2463ba', padding: 24 }}><Text style={{ color: 'white', fontSize: 24 }}>First slide</Text></View>
      <View key="second" ref={second} collapsable={false} style={{ height: 160, backgroundColor: '#116b4b', padding: 24 }}><Text style={{ color: 'white', fontSize: 24 }}>Second slide</Text></View>
      <View key="third" style={{ height: 160, backgroundColor: '#7c3bb5', padding: 24 }}><Text style={{ color: 'white', fontSize: 24 }}>Third slide</Text></View>
    </Carousel>
    <Text accessibilityLabel="Current slide">Slide {index + 1}</Text>
    <Text style={{ marginTop: 20 }}>{status}</Text>
  </View>;
}
