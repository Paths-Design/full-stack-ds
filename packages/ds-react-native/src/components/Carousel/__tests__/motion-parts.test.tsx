import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { createElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { MotionPart, MotionPartScope, MotionPartsProvider } from "../../../primitives/motion-parts";
import { BudgetProgress } from "../../../primitives/budget-progress";

describe("native composed motion parts", () => {
  let tree: ReactTestRenderer;
  afterEach(async () => { if (tree) await act(async () => tree.unmount()); });
  const sample = { effect: "elapsed-width" as const, elapsed: 0.4, reducedMotion: false, steps: 10, visible: true, activeIndex: 1 };
  const style = { width: 32, height: 8, backgroundColor: "#123456" };
  function Receiver({ nested = false }: { nested?: boolean }) {
    return <MotionPartScope>{parts => <>
      {[0, 1].map(index => <MotionPart key={index} projection={parts.fill} index={index} style={style}>{createElement("fallback", { index })}</MotionPart>)}
      {nested ? <Receiver /> : null}
    </>}</MotionPartScope>;
  }
  it("delivers the active sample once and clears it before nested and sibling consumers", async () => {
    await act(async () => { tree = create(<><MotionPartsProvider value={{ fill: sample }}><Receiver nested /></MotionPartsProvider><Receiver /></>); });
    expect(tree.root.findAllByType(BudgetProgress)).toHaveLength(1);
    expect(tree.root.findByType(BudgetProgress).props).toMatchObject({ elapsed: 0.4, width: 32, height: 8, color: "#123456" });
    expect(tree.root.findAll(node => String(node.type) === "fallback").map(node => node.props.index)).toEqual([0, 1, 0, 1]);
  });
  it("repaints changed samples and removes disabled projections without a clock", async () => {
    const render = (visible: boolean, elapsed: number) => <MotionPartsProvider value={{ fill: { ...sample, visible, elapsed } }}><Receiver /></MotionPartsProvider>;
    await act(async () => { tree = create(render(true, 0.4)); });
    await act(async () => tree.update(render(true, 0.7)));
    expect(tree.root.findByType(BudgetProgress).props.elapsed).toBe(0.7);
    await act(async () => tree.update(render(false, 0.7)));
    expect(tree.root.findAllByType(BudgetProgress)).toHaveLength(0);
    expect(tree.root.findAll(node => String(node.type) === "fallback")).toHaveLength(0);
  });
});
