import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Cargo.toml owns the toolchain minimum and exact renderer revision. Both native
// entry points select that toolchain and verify Cargo's resolved source graph.
export function gpuiRuntime(root) {
  const manifest = readFileSync(join(root, 'packages/ds-gpui/Cargo.toml'), 'utf8');
  const toolchain = manifest.match(/^rust-version = "([\d.]+)"$/m)?.[1];
  const revision = manifest.match(/^gpui = \{ git = "https:\/\/github.com\/zed-industries\/zed", rev = "([a-f0-9]{40})"/m)?.[1];
  if (!toolchain || !revision) throw new Error('GPUI_RUNTIME_PIN_REQUIRED');
  const cargo = [`+${toolchain}`];
  // Keep Metal's Clang module products in writable, disposable project scratch.
  const metalCache = process.env.CLANG_MODULE_CACHE_PATH || join(root, 'tmp/gpui-metal-cache');
  mkdirSync(metalCache, { recursive: true });
  const env = { ...process.env, CLANG_MODULE_CACHE_PATH: metalCache };
  const compiler = spawnSync('rustc', [`+${toolchain}`, '-vV'], { encoding: 'utf8' });
  const host = compiler.stdout?.match(/^host: (.+)$/m)?.[1];
  if (compiler.error || compiler.status !== 0 || !host) throw new Error('GPUI_TOOLCHAIN_REQUIRED');
  const resolved = spawnSync('cargo', [...cargo, 'metadata', '--locked', '--format-version=1', '--filter-platform', host, '--manifest-path', 'packages/ds-gpui/Cargo.toml'], {
    cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  });
  if (resolved.error || resolved.status !== 0) throw new Error(`GPUI_RUNTIME_METADATA_FAILED: ${resolved.stderr || resolved.error?.message}`);
  const metadata = JSON.parse(resolved.stdout);
  const packages = metadata.packages;
  const renderer = ['gpui', 'gpui_platform', 'gpui_macos'].map(name => {
    const matches = packages.filter(pkg => pkg.name === name);
    const expected = `git+https://github.com/zed-industries/zed?rev=${revision}#${revision}`;
    if (matches.length !== 1 || matches[0].source !== expected) throw new Error(`GPUI_RUNTIME_SOURCE_MISMATCH: ${name}`);
    const features = metadata.resolve.nodes.find(node => node.id === matches[0].id)?.features ?? [];
    if (name === 'gpui_macos' && !features.includes('font-kit')) throw new Error('GPUI_NATIVE_FONT_BACKEND_REQUIRED');
    return { name, version: matches[0].version, source: matches[0].source, features };
  });
  return { cargo, toolchain, revision, renderer, env };
}
