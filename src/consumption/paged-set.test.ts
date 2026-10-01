import { describe, expect, it, vi } from "vitest";
import { createPagedSet as react } from "../../packages/ds-react/src/primitives/paging";
import { createPagedSet as vue } from "../../packages/ds-vue/src/primitives/paging";
import { createPagedSet as svelte } from "../../packages/ds-svelte/src/primitives/paging";
import { createPagedSet as angular } from "../../packages/ds-angular/src/primitives/paging";
import { createPagedSet as lit } from "../../packages/ds-lit/src/primitives/paging";
import { createPagedSet as native } from "../../packages/ds-react-native/src/primitives/paging";

for (const [name, create] of Object.entries({ react, vue, svelte, angular, lit, native })) {
  describe(`${name} finite ordered-set policy`, () => {
    it("allows a later user intent to retry a request that the owner did not accept", async () => {
      const model = create(); const onIndexChange = vi.fn();
      model.sync({ index: 0, items: ["First", "Second"], onIndexChange });
      model.next(); model.next();
      expect(onIndexChange.mock.calls).toEqual([[1]]);
      await Promise.resolve();
      model.next();
      expect(onIndexChange.mock.calls).toEqual([[1], [1]]);
      expect(model.state.ordinal).toBe("1");
    });

    it("requests bounded integer positions and waits for accepted state", () => {
      const model = create();
      const onIndexChange = vi.fn();
      const options = { index: 0, items: [], count: 15, onIndexChange };
      model.sync(options);
      model.previous(); model.request(-1); model.request(15); model.request(1.5); model.request(NaN);
      expect(onIndexChange).not.toHaveBeenCalled();
      model.next(); model.next();
      expect(onIndexChange.mock.calls).toEqual([[1]]);
      expect(model.state.ordinal).toBe("1");
      model.sync({ ...options, index: 1 });
      expect(model.state.ordinal).toBe("2");
      model.next();
      expect(onIndexChange.mock.calls).toEqual([[1], [2]]);
      model.sync({ ...options, index: 14 });
      expect(model.state.nextDisabled).toBe(true);
      model.next();
      expect(onIndexChange.mock.calls).toEqual([[1], [2]]);
    });

    it("keeps a multi-digit draft independent of the accepted index until commit", () => {
      const model = create(); const onIndexChange = vi.fn();
      const options = { index: 4, items: [], count: 15, onIndexChange };
      model.sync(options);
      model.edit("1"); model.sync(options); model.edit("12");
      expect(model.state).toMatchObject({ ordinal: "5", draft: "12" });
      expect(onIndexChange).not.toHaveBeenCalled();
      model.commit(); model.commit();
      expect(onIndexChange.mock.calls).toEqual([[11]]);
      expect(model.state.draft).toBe("5");
      model.sync({ ...options, index: 11 });
      expect(model.state).toMatchObject({ ordinal: "12", draft: "12" });
      for (const invalid of ["", "0", "16", "1.5", "1e1", "-1", "9007199254740993"]) {
        model.edit(invalid); model.commit();
        expect(model.state.draft).toBe("12");
      }
      expect(onIndexChange.mock.calls).toEqual([[11]]);
      model.edit("3"); model.cancel();
      expect(model.state.draft).toBe("12");
    });

    it("fails closed for empty, invalid, mismatched and disabled sets", () => {
      const model = create(); const onIndexChange = vi.fn();
      for (const options of [
        { index: 0, items: [] }, { index: 0, items: [], count: -1 },
        { index: 0, items: [], count: 1.5 }, { index: 0, items: ["A"], count: 2 },
        { index: -1, items: ["A", "B"] }, { index: 2, items: ["A", "B"] },
        { index: 0, items: ["A", "B"], disabled: true },
      ]) {
        model.sync({ ...options, onIndexChange });
        expect(model.state).toMatchObject({ disabled: true, previousDisabled: true, nextDisabled: true });
        model.next(); model.request(1); model.edit("2"); model.commit();
      }
      expect(onIndexChange).not.toHaveBeenCalled();
    });

    it("keeps completion and progress unchanged when projecting or requesting a location", () => {
      const items = Object.freeze([Object.freeze({ label: "Prepare", completed: true, progress: 100 }), Object.freeze({ label: "Review", completed: false, progress: 25 })]);
      const model = create(); const onIndexChange = vi.fn();
      model.sync({ index: 1, items, onIndexChange });
      expect(model.state).toMatchObject({ index: 1, ordinal: "2", count: 2 });
      expect(items.map(item => [item.completed, item.progress])).toEqual([[true, 100], [false, 25]]);
      expect(onIndexChange).not.toHaveBeenCalled();
      model.request(0);
      expect(onIndexChange).toHaveBeenCalledWith(0);
      expect(model.state.index).toBe(1);
      expect(items.map(item => [item.completed, item.progress])).toEqual([[true, 100], [false, 25]]);
    });
  });
}
