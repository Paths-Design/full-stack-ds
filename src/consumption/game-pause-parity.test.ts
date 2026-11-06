// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import layout from "../../examples/game-pause-menu/fixtures/parity-layout.json";
import fixture from "../../examples/game-pause-menu/fixtures/map-icons.json";
import settings from "../../examples/game-pause-menu/fixtures/settings.json";
import { captureIconVisibility, compareColorProbe, mapSwitchProbes, mapPopoverParts, mapPopoverColorProbes, mapPopoverTypographyProbes, subtitlePreview, subtitlePreviewTypographyProbes, subtitlePreviewColorProbes, measureTextCoverage, typographyPairComparisons } from "../../examples/game-pause-menu/parity-state.mjs";

const rgb = (hex: string) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));

describe("pause-menu capture state ratchet", () => {
  it("replaces fixture defaults with the complete map capture filter", () => {
    expect(fixture.icons.find((icon) => icon.id === "rover-07")?.visible).toBe(false);
    const expected = fixture.icons.map((icon) => ({ id: icon.id, visible: icon.id !== "weather-06" }));
    for (const state of ["map", "map-popover"] as const) {
      expect(captureIconVisibility(fixture.icons, layout.captures[state])).toEqual(expected);
    }
    const allVisible = fixture.icons.map((icon) => ({ id: icon.id, visible: true }));
    expect(captureIconVisibility(fixture.icons, {})).toEqual(allVisible);
    expect(captureIconVisibility(fixture.icons, { hiddenIcons: [] })).toEqual(allVisible);
    expect(() => captureIconVisibility(fixture.icons, { hiddenIcons: ["unknown"] })).toThrow("unknown icon unknown");
    expect(() => captureIconVisibility(fixture.icons, { hiddenIcons: null })).toThrow("must be an array");
  });

  for (const state of ["map", "map-popover"]) {
    it(`${state} probes every switch and rejects every inverted track state`, () => {
      const probes = mapSwitchProbes(layout, fixture.icons, state);
      expect(probes).toHaveLength(fixture.icons.length * 2);
      for (const [index, icon] of fixture.icons.entries()) {
        const visible = icon.id !== "weather-06";
        const track = probes[index * 2];
        const thumb = probes[index * 2 + 1];
        expect(track).toEqual([
          1208, 248 + index * 48, visible ? "signal" : "graphite",
          `${icon.id} ${visible ? "ON" : "OFF"} switch track`,
        ]);
        expect(thumb[2]).toBe(visible ? "onSignal" : "boneBright");
        const expectedColor = layout.colors[track[2] as keyof typeof layout.colors];
        expect(compareColorProbe(track, rgb(expectedColor), layout.colors, 18).matches).toBe(true);
        const wrongColor = visible ? layout.colors.graphite : layout.colors.signal;
        expect(compareColorProbe(track, rgb(wrongColor), layout.colors, 18).matches).toBe(false);
      }
      const rover = probes.find((probe: [number, number, string, string]) => probe[3] === "rover-07 ON switch track");
      expect(rover).toEqual([1208, 536, "signal", "rover-07 ON switch track"]);
      expect(compareColorProbe(rover, rgb(layout.colors.graphite), layout.colors, 18)).toMatchObject({ matches: false, delta: 193 });
    });
  }

  it("has no map switch probes for other tabs and fails an unknown capture", () => {
    expect(mapSwitchProbes(layout, fixture.icons, "settings")).toEqual([]);
    expect(() => mapSwitchProbes(layout, fixture.icons, "missing")).toThrow("unknown capture state missing");
  });

  it("keeps the canonical and embedded layout authorities byte-identical", () => {
    const canonical = readFileSync(new URL("../../examples/game-pause-menu/fixtures/parity-layout.json", import.meta.url), "utf8");
    for (const embedded of ["gpui/fixtures/parity-layout.json", "godot/fixtures/parity-layout.json", "unity/Assets/PauseMenu/Resources/Fixtures/parity-layout.json"]) {
      expect(readFileSync(new URL(`../../examples/game-pause-menu/${embedded}`, import.meta.url), "utf8")).toBe(canonical);
    }
  });

  it("preserves every required icon field in the shared popover composition", () => {
    const icon = fixture.icons.find((item) => item.id === "beacon-05")!;
    const parts = mapPopoverParts(layout, fixture.icons, "map-popover");
    expect(parts.map((part: { id: string; text: string }) => [part.id, part.text])).toEqual([
      ["title", icon.label], ["status", icon.status], ["meta", "HECATE FLATS · 11.2 KM"],
      ["body", icon.detail], ["reward", icon.reward], ["action", "SET AS NAV TARGET"], ["cancel", "CLOSE"],
    ]);
    expect(parts.map((part: { x: number; y: number; w: number; h: number }) => [part.x, part.y, part.w, part.h])).toEqual([
      [408, 286, 328, 28], [408, 320, 84, 18], [504, 322, 232, 16],
      [408, 350, 328, 88], [408, 446, 328, 14], [408, 466, 220, 28], [636, 466, 100, 28],
    ]);
    const typography = mapPopoverTypographyProbes(layout, fixture.icons, "map-popover");
    expect(typography.map((part: { id: string }) => part.id)).toEqual([
      "popover-title", "popover-status", "popover-meta", "popover-body", "popover-reward", "popover-action", "popover-cancel",
    ]);
    const probes = mapPopoverColorProbes(layout, fixture.icons, "map-popover");
    const close = probes.find((probe: [number, number, string, string]) => probe[3] === "popover close left border position");
    expect(close).toEqual([636, 480, "ruleStrong", "popover close left border position"]);
    expect(compareColorProbe(close, rgb(layout.colors.charcoal), layout.colors, 18).matches).toBe(false);
    expect(mapPopoverParts(layout, fixture.icons, "map")).toEqual([]);
  });

  it("uses the selected icon and rejects popover rectangles outside the surface", () => {
    const other = structuredClone(layout);
    other.captures["map-popover"].popover = "relay-01";
    const parts = mapPopoverParts(other, fixture.icons, "map-popover");
    expect(parts[0].text).toBe("RELAY TOWER 01");
    expect(parts[2].text).toBe("ARES BASIN · 4.8 KM");
    other.map.popover.content.body.rect.w = 999;
    expect(() => mapPopoverParts(other, fixture.icons, "map-popover")).toThrow("body rectangle must fit");
    const missingField = structuredClone(layout);
    missingField.map.popover.content.meta.template = "{sector}";
    expect(() => mapPopoverParts(missingField, fixture.icons, "map-popover")).toThrow("must bind sector and distanceKm");
  });

  it("probes both preview selections with unchanged body and complete metadata", () => {
    for (const [state, metadata, color] of [["settings", "ENGLISH · CHARCOAL", "boneBright"], ["settings-subtitle", "FRANÇAIS · SIGNAL", "ink"]]) {
      const parts = subtitlePreviewTypographyProbes(layout, settings, state);
      expect(parts.map((part: { text: string }) => part.text)).toEqual([settings.audio.previewLine, metadata]);
      expect(parts.map((part: { x: number; y: number; w: number; h: number }) => [part.x, part.y, part.w, part.h])).toEqual([[672, 700, 390, 14], [1064, 700, 168, 14]]);
      expect(parts.map((part: { color: string; fontSize: number; weight: number }) => [part.color, part.fontSize, part.weight])).toEqual([[color, 10, 400], [color, 10, 700]]);
      const probe = subtitlePreviewColorProbes(layout, settings, state)[0];
      expect(compareColorProbe(probe, rgb(subtitlePreview(layout, settings, state).background), layout.colors, 18).matches).toBe(true);
    }
    expect(subtitlePreviewTypographyProbes(layout, settings, "settings-remap-modal")).toEqual([]);
  });

  it("uses authored labels and Unicode language metadata and rejects lost fields", () => {
    const source = structuredClone(settings);
    source.audio.subtitleBackground.options.find((option) => option.id === "signal")!.label = "Warm signal";
    const spanish = structuredClone(layout);
    spanish.captures["settings-subtitle"].subtitleLanguage = "Español";
    expect(subtitlePreview(spanish, source, "settings-subtitle").parts[1].text).toBe("ESPAÑOL · WARM SIGNAL");
    spanish.settings.preview.content.meta.template = "{language}";
    expect(() => subtitlePreview(spanish, source, "settings-subtitle")).toThrow("must bind language and background");
  });
});

describe("pause-menu contrast-relative typography measurement", () => {
  it("rejects opposite deviations that each agree with an anchor but not with each other", () => {
    const boxes = [["gpui", 49], ["unity", 45], ["godot", 53]].map(([lane, x]) => ({
      lane, bbox: { x, y: 10, w: 20, h: 8, ink: 0.5 },
    }));
    const comparisons = typographyPairComparisons(boxes, { x: 4, y: 4, w: 6, h: 5, ink: 0.25 });
    expect(comparisons.map(({ first, other, bad }: { first: { lane: string }; other: { lane: string }; bad: [string, number][] }) =>
      [first.lane, other.lane, bad])).toEqual([
      ["gpui", "unity", []], ["gpui", "godot", []], ["unity", "godot", [["x", 8]]],
    ]);
    const reordered = typographyPairComparisons([boxes[1], boxes[0], boxes[2]], { x: 4, y: 4, w: 6, h: 5, ink: 0.25 });
    expect(reordered.filter(({ bad }: { bad: unknown[] }) => bad.length)).toHaveLength(1);
  });

  const raster = (coverage: number[][], background = [0, 0, 0], foreground = [200, 200, 200]) => ({
    width: coverage[0].length,
    height: coverage.length,
    foreground,
    rgb: Uint8Array.from(coverage.flatMap((row) => row.flatMap((alpha) =>
      foreground.map((channel, index) => Math.round(background[index] + alpha * (channel - background[index])))))),
  });
  const antialias = [
    [0.25, 0, 0, 0, 0],
    [0, 0.5, 0.25, 0.5, 0],
    [0, 0.75, 1, 0.75, 0],
    [0, 0.5, 0.25, 0.5, 0],
    [0, 0, 0, 0, 0],
  ];

  it("returns no text for a blank low-contrast crop, including foreground-colored crops", () => {
    // The old absolute foreground fuzz included this entire dark background.
    const blank = raster(Array.from({ length: 4 }, () => Array(8).fill(0)), [25, 25, 23], [75, 74, 68]);
    expect(measureTextCoverage(blank)).toBeNull();
    expect(measureTextCoverage(raster([[1, 1], [1, 1]]))).toBeNull();
  });

  it("infers the background and preserves bounds and coverage through contrast inversion", () => {
    const light = measureTextCoverage(raster(antialias));
    const dark = measureTextCoverage(raster(antialias, [200, 200, 200], [0, 0, 0]));
    expect(light).toEqual({ x: 1, y: 1, w: 3, h: 3, ink: 5 / 9, background: [0, 0, 0] });
    expect(dark).toEqual({ ...light, background: [200, 200, 200] });
    const typedForeground = raster(antialias, [200, 200, 200], [0, 0, 0]);
    expect(measureTextCoverage({ ...typedForeground, foreground: Uint8Array.from(typedForeground.foreground) })).toEqual(dark);
  });

  it("integrates antialias coverage inside the fixed 50-percent contour", () => {
    const measured = measureTextCoverage(raster(antialias));
    // The 25% fringe at (0,0) cannot enlarge the contour; the two 25% cells
    // inside the box contribute their coverage rather than becoming full ink.
    expect(measured).toMatchObject({ x: 1, y: 1, w: 3, h: 3 });
    expect(measured!.ink).toBeCloseTo(5 / 9, 12);
    expect(measureTextCoverage(raster([[0, 0, 0], [0, 0.25, 0], [0, 0, 0]]))).toBeNull();
  });

  it("distinguishes thin and heavy glyphs with identical bounds across the existing 25-percent limit", () => {
    const thin = raster([
      [0, 0, 0, 0, 0], [0, 1, 0, 1, 0], [0, 0, 0.5, 0, 0],
      [0, 1, 0, 1, 0], [0, 0, 0, 0, 0],
    ]);
    const heavy = raster([
      [0, 0, 0, 0, 0], [0, 1, 1, 1, 0], [0, 1, 1, 1, 0],
      [0, 1, 1, 1, 0], [0, 0, 0, 0, 0],
    ]);
    const a = measureTextCoverage(thin)!;
    const b = measureTextCoverage(heavy)!;
    expect([a.x, a.y, a.w, a.h]).toEqual([b.x, b.y, b.w, b.h]);
    expect(a.ink).toBe(0.5);
    expect(b.ink).toBe(1);
    expect(Math.abs(a.ink - b.ink) / Math.max(a.ink, b.ink)).toBeGreaterThan(0.25);
  });

  it("excludes off-axis colors both outside and inside the glyph bounds", () => {
    const clean = raster([
      [0, 0, 0, 0, 0], [0, 1, 0, 1, 0], [0, 0, 0, 0, 0],
      [0, 1, 0, 1, 0], [0, 0, 0, 0, 0],
    ]);
    const noisy = { ...clean, rgb: clean.rgb.slice() };
    noisy.rgb.set([255, 255, 0], 0);
    noisy.rgb.set([255, 255, 0], (2 * clean.width + 2) * 3);
    expect(measureTextCoverage(noisy)).toEqual(measureTextCoverage(clean));
    expect(measureTextCoverage({ ...noisy, colorFuzz: 1 })).toMatchObject({ x: 0, y: 0, w: 4, h: 4 });
  });

  it("rejects unrelated antialiased colors by angular deviation", () => {
    const clean = raster(antialias, [200, 200, 200], [0, 0, 0]);
    const noisy = { ...clean, rgb: clean.rgb.slice() };
    // This unrelated edge has projection .6 and residual^2 7200. A fixed
    // radius admits it (10800), while the projected radius excludes it (3888).
    noisy.rgb.set([140, 20, 80], 4 * 3);
    const expected = { x: 1, y: 1, w: 3, h: 3, ink: 5 / 9, background: [200, 200, 200] };
    expect(measureTextCoverage(clean)).toEqual(expected);
    expect(measureTextCoverage(noisy)).toEqual(expected);
    expect(measureTextCoverage({ ...noisy, colorFuzz: 0.4 })).toEqual(expected);
    expect(measureTextCoverage({ ...noisy, colorFuzz: 0.5 })).toMatchObject({ x: 1, y: 0, w: 4, h: 4 });
  });

  it("clamps collinear samples to the foreground/background coverage interval", () => {
    const crop = raster([[0, 0, 0], [0, 1, 0], [0, 0, 0]], [100, 100, 100]);
    crop.rgb.set([255, 255, 255], 12);
    crop.rgb.set([0, 0, 0], 0);
    expect(measureTextCoverage(crop)).toEqual({ x: 1, y: 1, w: 1, h: 1, ink: 1, background: [100, 100, 100] });
  });

  it("breaks modal RGB ties independently of pixel order", () => {
    expect(measureTextCoverage(raster([[0, 0, 1, 1]]))).toEqual({ x: 2, y: 0, w: 2, h: 1, ink: 1, background: [0, 0, 0] });
    expect(measureTextCoverage(raster([[1, 1, 0, 0]]))).toEqual({ x: 0, y: 0, w: 2, h: 1, ink: 1, background: [0, 0, 0] });
  });

  it("rejects malformed dimensions, byte buffers, foregrounds and fuzz", () => {
    const crop = raster([[0, 0, 0], [0, 1, 0], [0, 0, 0]]);
    for (const size of [0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => measureTextCoverage({ ...crop, width: size })).toThrow("dimensions");
      expect(() => measureTextCoverage({ ...crop, height: size })).toThrow("dimensions");
    }
    expect(() => measureTextCoverage({ ...crop, width: Number.MAX_SAFE_INTEGER, height: 2 })).toThrow("dimensions");
    for (const bytes of [[], new Uint16Array(crop.rgb), crop.rgb.slice(1)]) {
      expect(() => measureTextCoverage({ ...crop, rgb: bytes })).toThrow("RGB bytes");
    }
    for (const foreground of [[], [1, 2], [0, 0, 256], [-1, 0, 0], [0, NaN, 0], [0, 0.5, 0]]) {
      expect(() => measureTextCoverage({ ...crop, foreground })).toThrow("foreground");
    }
    for (const colorFuzz of [-0.1, 1.1, NaN, Infinity]) {
      expect(() => measureTextCoverage({ ...crop, colorFuzz })).toThrow("fuzz");
    }
  });
});
