import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Read a row below the fixture's text, requiring the same clipped viewport
 * throughout. Duplicate video frames are allowed; a snap has no mixed rows.
 */
export function inspectRows(rows, width, left, span, fps = 60) {
  const frameSize = width * 3;
  const near = (offset, color) => color.every((channel, i) => Math.abs(rows[offset + i] - channel) <= 12);
  const frames = [];
  for (let frame = 0; frame < rows.length / frameSize; frame++) {
    const colors = [];
    for (let x = left; x < left + span; x++) {
      const offset = frame * frameSize + x * 3;
      colors.push(near(offset, [36, 99, 186]) ? 'blue' : near(offset, [17, 107, 75]) ? 'green' : 'other');
    }
    const blue = colors.filter(color => color === 'blue').length;
    const green = colors.filter(color => color === 'green').length;
    const edge = colors.indexOf('green');
    const contiguous = blue + green >= span - 4 && colors.slice(0, edge).every(color => color !== 'green') && colors.slice(edge).every(color => color !== 'blue');
    frames.push({ frame, atMs: frame * 1000 / fps, blue, green, edge, contiguous });
  }
  // Search past app-launch transitions. A witness needs stable endpoints and
  // multiple distinct intermediate positions, all inside the fixed viewport.
  for (let start = 1; start < frames.length; start++) {
    if (frames[start - 1].blue < span - 4 || frames[start].green < 4 || frames[start].blue < 4) continue;
    const motion = [];
    let prior = span;
    for (let i = start; i < Math.min(start + fps, frames.length); i++) {
      const sample = frames[i];
      if (!sample.contiguous || sample.edge > prior + 2) break;
      if (sample.green >= span - 4) {
        const positions = new Set(motion.map(frame => frame.edge));
        if (positions.size >= 3 && frames[i + 1]?.green >= span - 4) return { start: frames[start - 1], motion, settled: sample };
        break;
      }
      if (sample.green < 4) break;
      prior = sample.edge;
      if (sample.blue >= 4) motion.push(sample);
    }
  }
  throw new Error('No bounded leftward transition with three distinct painted intermediate positions');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [video, geometry, output] = process.argv.slice(2);
  if (!video || !geometry || !output) throw new Error('Usage: node scripts/native-carousel-pixels.mjs VIDEO GEOMETRY_RECEIPT OUTPUT');
  const receipt = JSON.parse(readFileSync(geometry, 'utf8'));
  const { baseline } = receipt.result;
  // This authored fixture centers a 320-point viewport. Normalize simulator
  // display pixels to that logical coordinate space before sampling its row.
  const width = Math.round(baseline.x * 2 + baseline.width);
  const row = Math.round(baseline.y + baseline.height * 0.75);
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', video, '-vf', `fps=60,scale=${width}:-1,crop=${width}:1:0:${row}`, '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1'], { maxBuffer: 64 * 1024 * 1024 });
  let observations, failure;
  try { observations = inspectRows(raw, width, Math.round(baseline.x), Math.round(baseline.width)); }
  catch (error) { failure = String(error); }
  const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
  const result = { verdict: failure ? 'fail' : 'pass', failure, observations, videoHash: hash(video), geometryHash: hash(geometry), built: receipt.built,
    boundary: 'Painted directional motion in a supplied recording of the authored iOS primitive fixture. Caller must associate recording and build; this analyzer does not attest capture provenance, exact timing, generated Carousel, other platforms, or accessibility.' };
  writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  if (failure) process.exitCode = 1;
}
