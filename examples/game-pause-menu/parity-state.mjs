/** Complete capture visibility, independent of startup defaults or prior captures. */
export function captureIconVisibility(icons, capture = {}) {
  const hidden = capture.hiddenIcons === undefined ? [] : capture.hiddenIcons;
  if (!Array.isArray(hidden) || hidden.some((id) => typeof id !== 'string')) {
    throw new Error('capture hiddenIcons must be an array of icon ids');
  }
  const ids = new Set(icons.map((icon) => icon.id));
  for (const id of hidden) {
    if (!ids.has(id)) throw new Error(`capture hiddenIcons references unknown icon ${id}`);
  }
  return icons.map((icon) => ({ id: icon.id, visible: !hidden.includes(icon.id) }));
}

/** Every map switch gets its own track and thumb probes in either map capture. */
export function mapSwitchProbes(layout, icons, state) {
  const capture = layout.captures[state];
  if (!capture) throw new Error(`unknown capture state ${state}`);
  if (capture.activeTab !== 'map') return [];
  const rows = layout.map.iconRows;
  const control = layout.switch;
  return captureIconVisibility(icons, capture).flatMap(({ id, visible }, index) => {
    const x = rows.switchX;
    const y = rows.firstY + index * rows.rowH + rows.switchY;
    const thumbX = visible ? control.checkedThumbOffset : control.inset;
    const stateName = visible ? 'ON' : 'OFF';
    return [
      [x + control.width / 2, y + control.height / 2,
        visible ? control.onTrack : control.offTrack, `${id} ${stateName} switch track`],
      [x + thumbX + control.thumb / 2, y + control.height / 2,
        visible ? control.onThumb : control.offThumb, `${id} ${stateName} switch thumb`],
    ];
  });
}

/** The checker and its regression tests use the same colour comparison. */
export function compareColorProbe(probe, actual, colors, tolerance) {
  const [x, y, expectedName, description] = probe;
  const expected = /^#[\da-f]{6}$/i.test(expectedName) ? expectedName : colors[expectedName];
  if (!/^#[\da-f]{6}$/i.test(expected ?? '')) throw new Error(`unknown colour key ${expectedName}`);
  const rgb = [1, 3, 5].map((offset) => parseInt(expected.slice(offset, offset + 2), 16));
  const delta = Math.max(...rgb.map((channel, index) => Math.abs(channel - actual[index])));
  return { x, y, expected, actual: `rgb(${actual.join(',')})`, delta, description, matches: delta <= tolerance };
}

/** Resolve the complete marker-popover content from its selected fixture icon. */
export function mapPopoverParts(layout, icons, state) {
  const capture = layout.captures[state];
  if (!capture) throw new Error(`unknown capture state ${state}`);
  if (!capture.popover) return [];
  const icon = icons.find((item) => item.id === capture.popover);
  if (!icon) throw new Error(`unknown popover icon ${capture.popover}`);
  const popover = layout.map.popover;
  const content = popover.content;
  const template = content.meta.template;
  if (!template.includes('{sector}') || !template.includes('{distanceKm}')) {
    throw new Error('popover metadata must bind sector and distanceKm');
  }
  const meta = template.replaceAll('{sector}', icon.sector)
    .replaceAll('{distanceKm}', Number(icon.distanceKm).toFixed(1));
  if (/[{}]/.test(meta)) throw new Error('popover metadata has an unknown placeholder');
  const values = {
    title: icon.label, status: icon.status, meta, body: icon.detail,
    reward: icon.reward, action: popover.action, cancel: popover.cancel,
  };
  return Object.entries(values).map(([id, text]) => {
    const part = content[id];
    const rect = part.rect;
    if (rect.x < 0 || rect.y < 0 || rect.w <= 0 || rect.h <= 0
      || rect.x + rect.w > popover.w || rect.y + rect.h > popover.h) {
      throw new Error(`popover ${id} rectangle must fit inside its surface`);
    }
    if (!(part.type in layout.type) || !(part.color in layout.colors)) {
      throw new Error(`popover ${id} references unknown typography or colour`);
    }
    return { id, text, color: part.color, weight: part.weight, fontSize: layout.type[part.type],
      x: popover.x + rect.x, y: popover.y + rect.y, w: rect.w, h: rect.h };
  });
}

/** Every required text part gets a capture-specific foreground crop. */
export function mapPopoverTypographyProbes(layout, icons, state) {
  return mapPopoverParts(layout, icons, state).map((part) => ({
    state, id: `popover-${part.id}`, color: part.color,
    x: part.x, y: part.y, w: part.w, h: part.h, text: part.text,
  }));
}

/** Pin the overlay frame and the distinctive status/action/cancel arrangement. */
export function mapPopoverColorProbes(layout, icons, state) {
  if (!mapPopoverParts(layout, icons, state).length) return [];
  const popover = layout.map.popover;
  const content = popover.content;
  const status = content.status.rect;
  const action = content.action.rect;
  const cancel = content.cancel.rect;
  return [
    [popover.x + 2, popover.y + 1, content.accent, 'popover top accent'],
    [popover.x + 2, popover.y + popover.h - 2, content.background, 'popover background'],
    [popover.x + status.x + 3, popover.y + status.y + 3, content.status.background, 'popover status badge background'],
    [popover.x + action.x + 3, popover.y + action.y + 3, 'signal', 'popover primary action position'],
    [popover.x + cancel.x, popover.y + cancel.y + cancel.h / 2, 'ruleStrong', 'popover close left border position'],
  ];
}

/** The preview reports the selected language and authored background label. */
export function subtitlePreview(layout, settings, state) {
  const capture = layout.captures[state];
  if (!capture) throw new Error(`unknown capture state ${state}`);
  if (capture.activeTab !== 'settings' || capture.remapModal) return null;
  const audio = settings.audio;
  const language = capture.subtitleLanguage ?? audio.subtitleLanguage.value;
  const backgroundId = capture.subtitleBackground ?? audio.subtitleBackground.value;
  const background = audio.subtitleBackground.options.find((option) => option.id === backgroundId);
  if (!background) throw new Error(`unknown subtitle background ${backgroundId}`);
  const preview = layout.settings.preview;
  const meta = preview.content.meta;
  if (!meta.template.includes('{language}') || !meta.template.includes('{background}')
    || meta.case !== 'upper' || meta.align !== 'right') {
    throw new Error('subtitle metadata must bind language and background with upper case and right alignment');
  }
  const tag = meta.template.replaceAll('{language}', language).replaceAll('{background}', background.label).toUpperCase();
  if (/[{}]/.test(tag)) throw new Error('subtitle metadata has an unknown placeholder');
  const luminance = (hex) => {
    const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
      .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const ground = luminance(background.value);
  const contrast = (key) => {
    const ink = luminance(layout.colors[key]);
    return (Math.max(ground, ink) + 0.05) / (Math.min(ground, ink) + 0.05);
  };
  const color = contrast('ink') > contrast('boneBright') ? 'ink' : 'boneBright';
  const values = { line: audio.previewLine, meta: tag };
  const parts = Object.entries(values).map(([id, text]) => {
    const part = preview.content[id];
    const rect = part.rect;
    if (rect.x < 0 || rect.y < 0 || rect.w <= 0 || rect.h <= 0
      || rect.x + rect.w > preview.w || rect.y + rect.h > preview.h) {
      throw new Error(`subtitle ${id} rectangle must fit inside its preview`);
    }
    return { id: `subtitle-preview-${id}`, state, text, color,
      x: preview.x + rect.x, y: preview.y + rect.y, w: rect.w, h: rect.h,
      fontSize: layout.type[part.type], weight: part.weight };
  });
  return { parts, background: background.value };
}

export function subtitlePreviewTypographyProbes(layout, settings, state) {
  return subtitlePreview(layout, settings, state)?.parts ?? [];
}

export function subtitlePreviewColorProbes(layout, settings, state) {
  const resolved = subtitlePreview(layout, settings, state);
  if (!resolved) return [];
  const rect = layout.settings.preview;
  return [[rect.x + 3, rect.y + 3, resolved.background, 'subtitle preview selected background']];
}

/**
 * Measure sparse opaque text on a uniform background in an RGB crop.
 * The foreground is contract input; the modal RGB background is an observation,
 * with numeric RGB order breaking ties. It does not establish intended paint.
 * Fuzz bounds orthogonal color residual relative to each pixel's projected
 * foreground contrast. A fixed 50% coverage contour bounds the result; ink integrates
 * accepted coverage inside that contour's box. Coordinates are crop-local.
 */
export function measureTextCoverage({ rgb, width, height, foreground, colorFuzz = 0.30 }) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)
    || width <= 0 || height <= 0 || width > Number.MAX_SAFE_INTEGER / height / 3) {
    throw new RangeError('text crop dimensions must be positive, safely representable integers');
  }
  if (!(rgb instanceof Uint8Array) || rgb.length !== width * height * 3) {
    throw new TypeError('text crop must contain exactly width * height * 3 RGB bytes');
  }
  if ((!Array.isArray(foreground) && !(foreground instanceof Uint8Array))
    || foreground.length !== 3
    || !Array.from(foreground).every((value) => Number.isInteger(value) && value >= 0 && value <= 255)) {
    throw new TypeError('text foreground must contain three RGB bytes');
  }
  if (!Number.isFinite(colorFuzz) || colorFuzz < 0 || colorFuzz > 1) {
    throw new RangeError('text color fuzz must be a finite fraction between zero and one');
  }

  const frequencies = new Map();
  let modal = 0;
  let modalCount = 0;
  for (let offset = 0; offset < rgb.length; offset += 3) {
    const key = rgb[offset] * 65536 + rgb[offset + 1] * 256 + rgb[offset + 2];
    const count = (frequencies.get(key) ?? 0) + 1;
    frequencies.set(key, count);
    if (count > modalCount || (count === modalCount && key < modal)) {
      modal = key;
      modalCount = count;
    }
  }
  const background = [modal >>> 16, (modal >>> 8) & 255, modal & 255];
  const vector = Array.from(foreground, (channel, index) => channel - background[index]);
  const contrastSquared = vector.reduce((sum, channel) => sum + channel * channel, 0);
  if (contrastSquared === 0) return null;

  const residualLimitSquared = colorFuzz * colorFuzz * contrastSquared;
  const coverages = new Float64Array(width * height);
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let index = 0; index < coverages.length; index++) {
    const offset = index * 3;
    const delta = [rgb[offset] - background[0], rgb[offset + 1] - background[1], rgb[offset + 2] - background[2]];
    const projection = delta.reduce((sum, channel, axis) => sum + channel * vector[axis], 0) / contrastSquared;
    const residualSquared = delta.reduce((sum, channel, axis) => sum + (channel - projection * vector[axis]) ** 2, 0);
    // A cone preserves hue rejection when an unrelated color is antialiased.
    if (projection <= 0 || residualSquared > residualLimitSquared * projection * projection + 1e-9) continue;
    const coverage = Math.min(1, Math.max(0, projection));
    coverages[index] = coverage;
    if (coverage < 0.5) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
  if (right < left) return null;
  let ink = 0;
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) ink += coverages[y * width + x];
  }
  const w = right - left + 1;
  const h = bottom - top + 1;
  return { x: left, y: top, w, h, ink: ink / (w * h), background };
}
