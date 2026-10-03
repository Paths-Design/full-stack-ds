import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, copyFileSync, createReadStream, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gpuiRuntime } from './gpui-runtime.mjs';

// Package our compiled consumer as a macOS app so normal app tools can open it.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (process.platform !== 'darwin') {
  console.error('The GPUI gallery launcher currently supports macOS only.');
  process.exit(1);
}
const runtime = gpuiRuntime(root);
const build = spawnSync('cargo', [...runtime.cargo,
  'build', '--locked', '--manifest-path', 'packages/ds-gpui/Cargo.toml',
  '--example', 'component_gallery', '--message-format=json-render-diagnostics',
], { cwd: root, env: runtime.env, stdio: ['inherit', 'pipe', 'inherit'], encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

const artifacts = build.stdout.trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
const executable = artifacts.find((artifact) =>
  artifact.reason === 'compiler-artifact'
  && artifact.target?.name === 'component_gallery'
  && artifact.executable)?.executable;
if (!executable) throw new Error('Cargo did not report the component gallery executable.');
const galleryDir = process.env.FSDS_GPUI_GALLERY_DIR
  ? resolve(root, process.env.FSDS_GPUI_GALLERY_DIR)
  : join(root, 'tmp/gpui-gallery');
// A probe has a separate app identity so it can be inspected beside an existing gallery.
const probe = process.argv.includes('--probe');
const hash = createHash('sha256');
for await (const bytes of createReadStream(executable)) hash.update(bytes);
const executableHash = hash.digest('hex');
const appExecutable = probe ? `Full Stack DS GPUI Probe ${executableHash.slice(0, 8)}` : 'Full Stack DS GPUI';
const app = join(galleryDir, `${appExecutable}.app`);
const contents = join(app, 'Contents');
mkdirSync(join(contents, 'MacOS'), { recursive: true });
copyFileSync(executable, join(contents, 'MacOS', appExecutable));
chmodSync(join(contents, 'MacOS', appExecutable), 0o755);
writeFileSync(join(contents, 'Info.plist'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>design.fullstackds.gpui-gallery${probe ? `.render-probe.${executableHash.slice(0, 8)}` : ''}</string>
<key>CFBundleName</key><string>${appExecutable}</string>
<key>CFBundleDisplayName</key><string>${appExecutable}</string>
<key>CFBundleExecutable</key><string>${appExecutable}</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleVersion</key><string>1</string>
<key>CFBundleShortVersionString</key><string>0.1.0</string>
<key>NSHighResolutionCapable</key><true/>
</dict></plist>
`);
writeFileSync(join(contents, 'build-receipt.json'), JSON.stringify({ executableSha256: executableHash, sourceExecutable: executable, toolchain: runtime.toolchain, renderer: runtime.renderer }, null, 2));
console.log(app);
if (!process.argv.includes('--prepare-only')) {
  const launch = spawnSync('open', ['-n', '-a', app], { stdio: 'inherit' });
  if (launch.error) throw launch.error;
  process.exit(launch.status ?? 1);
}
