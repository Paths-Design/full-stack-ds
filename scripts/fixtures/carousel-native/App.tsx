import { useEffect, useRef, useState, type RefObject } from 'react';
import { AccessibilityInfo, Button, Platform, Text, View } from 'react-native';
import { useSequence, SequenceChildren } from '../../../packages/ds-react-native/src/primitives/useSequence';
import { BudgetProgress } from '../../../packages/ds-react-native/src/primitives/budget-progress';

const labels = ['First', 'Second', 'Third'];
const buildIdentity = '__FSDS_NATIVE_BUILD_ID__';
const profile = { durationMs: 250, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', referenceWidth: 320, minMultiplier: 0.5, maxMultiplier: 2 };
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
type Frame = { x: number; y: number; width: number; height: number };
const measure = (ref: RefObject<View | null>) => new Promise<Frame>((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Native measurement timed out')), 3000);
  if (!ref.current) { clearTimeout(timeout); reject(new Error('Missing native view')); return; }
  ref.current.measureInWindow((x, y, width, height) => { clearTimeout(timeout); resolve({ x, y, width, height }); });
});

/** On-device actor over the production sequence primitive. Measurements come
 * back from native views, not the unit suite's Animated boundary replacement.
 * Generated Carousel styling/control binding is a separate witness.
 */
export default function NativeCarouselWitness() {
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState('Waiting for native layout');
  const [ready, setReady] = useState(false);
  const first = useRef<View | null>(null);
  const second = useRef<View | null>(null);
  const third = useRef<View | null>(null);
  const started = useRef(false);
  const sequence = useSequence({ index, labels, autoPlay: false, durationMs: 1000, onIndexChange: setIndex }, [
    <View key="first" ref={first} collapsable={false} style={{ height: 160, backgroundColor: '#2463ba', padding: 24 }}><Text style={{ color: 'white', fontSize: 24 }}>First slide</Text></View>,
    <View key="second" ref={second} collapsable={false} style={{ height: 160, backgroundColor: '#116b4b', padding: 24 }}><Text style={{ color: 'white', fontSize: 24 }}>Second slide</Text></View>,
    <View key="third" ref={third} collapsable={false} style={{ height: 160, backgroundColor: '#7c3bb5', padding: 24 }}><Text style={{ color: 'white', fontSize: 24 }}>Third slide</Text></View>,
  ], profile);
  const latest = useRef(sequence);
  latest.current = sequence;
  useEffect(() => {
    if (!ready || !sequence.valid || started.current) return;
    started.current = true;
    let alive = true;
    void (async () => {
      const reducedMotion = await AccessibilityInfo.isReduceMotionEnabled();
      await wait(700);
      if (!alive) return;
      setStatus('Measuring native movement');
      const baseline = await measure(first);
      const startedAt = performance.now();
      latest.current.next();
      await wait(64);
      const early = { first: await measure(first), second: await measure(second), at: performance.now() - startedAt };
      await wait(70);
      const middle = { first: await measure(first), second: await measure(second), at: performance.now() - startedAt };
      await wait(240);
      const settled = await measure(second);
      const result = { kind: 'native-sequence-movement', buildIdentity, platform: Platform.OS, reducedMotion, baseline, early, middle, settled, index: latest.current.index, profile };
      await fetch('http://127.0.0.1:5210/receipt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result) });
      if (alive) setStatus('Native measurements delivered');
    })().catch(async error => {
      if (alive) setStatus(String(error));
      await fetch('http://127.0.0.1:5210/receipt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: String(error) }) }).catch(() => {});
    });
    return () => { alive = false; };
  }, [ready, sequence.valid]);
  return <View style={{ flex: 1, backgroundColor: '#f5f5f5', alignItems: 'center', paddingTop: 100 }}>
    <Text style={{ fontSize: 22, marginBottom: 24 }}>Sequence primitive witness</Text>
    <View style={{ width: 320 }} onLayout={() => setReady(true)}><SequenceChildren sequence={sequence} labels={labels} /></View>
    <View style={{ flexDirection: 'row', marginTop: 20 }}><Button title="Previous" onPress={sequence.previous} /><Button title="Next" onPress={sequence.next} /></View>
    <Text accessibilityLabel="Current slide">Slide {index + 1}</Text>
    <Text style={{ marginTop: 20 }}>{status}</Text>
    <Text style={{ marginTop: 24 }}>Native progress projection samples</Text>
    {[0, 0.25, 0.5, 0.75, 1].map(elapsed => <View key={elapsed} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 }}>
      <Text style={{ width: 40 }}>{elapsed * 100}%</Text>
      <BudgetProgress effect="elapsed-width" elapsed={elapsed} reducedMotion={false} steps={10} width={120} height={8} thickness={3} color="#2463ba" trackColor="#cccccc" />
      <BudgetProgress effect="elapsed-ring" elapsed={elapsed} reducedMotion={false} steps={10} width={32} height={32} thickness={3} color="#2463ba" trackColor="#cccccc" />
    </View>)}
  </View>;
}
