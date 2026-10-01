import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const host = join(root, 'tmp/native-carousel-host');
const generated = process.argv.includes('--generated');
const proof = join(root, generated ? 'tmp/native-carousel-generated-proof' : 'tmp/native-carousel-proof');
const fixture = join(root, `scripts/fixtures/carousel-native/${generated ? 'Generated' : 'App'}.tsx`);
const runtime = join(root, 'packages/ds-react-native/src');
const iconography = join(root, 'packages/ds-iconography');
const ruby = process.env.FSDS_RUBY_BINARY ?? '/opt/homebrew/opt/ruby@3.3/bin/ruby';
const run = (command, args, cwd = host, env = {}) => execFileSync(command, args, { cwd, stdio: 'inherit', env: { ...process.env, ...env } });
const shellQuote = value => `'${value.replaceAll("'", "'\\''")}'`;
const hashFile = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const appBundle = join(proof, 'build/Build/Products/Release-iphonesimulator/FsdsCarouselWitness.app/main.jsbundle');
function inputs() {
  const paths = generated ? readdirSync(runtime, { recursive: true }).filter(path => /\.tsx?$/.test(String(path))).map(String).sort() : ['primitives/useSequence.tsx', 'primitives/sequence-budget.ts', 'primitives/sequence-motion.tsx', 'primitives/budget-progress.tsx'];
  const hashes = Object.fromEntries([...paths.map(path => join(runtime, path)), fixture,
    fileURLToPath(import.meta.url), join(iconography, 'index.mjs'),
    join(root, 'packages/ds-react-native/package.json'), join(root, 'pnpm-lock.yaml'),
    join(host, 'package.json'),
  ].map(path => [path, hashFile(path)]));
  return { generated, hashes, identity: createHash('sha256').update(JSON.stringify(hashes)).digest('hex') };
}
mkdirSync(proof, { recursive: true });

function prepare() {
  const manifestPath = join(host, 'package.json');
  // End pnpm option parsing before the CLI's own --version option.
  if (!existsSync(manifestPath)) run('corepack', ['pnpm', 'dlx', '--', '@react-native-community/cli@20.2.0', 'init', 'FsdsCarouselWitness', '--version', '0.85.3', '--directory', host, '--skip-install', '--install-pods', 'false', '--skip-git-init'], root);
  if (!existsSync(manifestPath)) throw new Error(`React Native CLI exited without creating ${manifestPath}; host initialization did not complete`);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.packageManager = 'pnpm@10.14.0';
  manifest.dependencies['react-native-svg'] = '15.15.5';
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  const prepared = inputs();
  writeFileSync(join(host, 'App.tsx'), readFileSync(fixture, 'utf8').replace('../../../packages/ds-react-native/src/primitives/useSequence', 'fsds-sequence-under-test').replace('../../../packages/ds-react-native/src/primitives/budget-progress', 'fsds-budget-progress-under-test').replace('../../../packages/ds-react-native/src/components/Carousel/Carousel', 'fsds-carousel-under-test').replace('../../../packages/ds-react-native/src/components/Icon/Icon', 'fsds-icon-under-test').replace('__FSDS_NATIVE_BUILD_ID__', prepared.identity));
  writeFileSync(join(proof, 'prepared-inputs.json'), JSON.stringify(prepared, null, 2));
  writeFileSync(join(host, 'metro.config.js'), `const path = require('node:path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const runtime = ${JSON.stringify(runtime)};
const iconography = ${JSON.stringify(iconography)};
module.exports = mergeConfig(getDefaultConfig(__dirname), {
  watchFolders: [runtime, iconography],
  resolver: {
    nodeModulesPaths: [path.join(__dirname, 'node_modules')],
    disableHierarchicalLookup: true,
    resolveRequest(context, name, platform) {
      if (name === '@full-stack-ds/iconography') return {type: 'sourceFile', filePath: path.join(iconography, 'index.mjs')};
      if (name === 'fsds-icon-under-test') return {type: 'sourceFile', filePath: path.join(runtime, 'components/Icon/Icon.tsx')};
      if (name === 'fsds-carousel-under-test') return {type: 'sourceFile', filePath: path.join(runtime, 'components/Carousel/Carousel.tsx')};
      if (name === 'fsds-sequence-under-test') return {type: 'sourceFile', filePath: path.join(runtime, 'primitives/useSequence.tsx')};
      if (name === 'fsds-budget-progress-under-test') return {type: 'sourceFile', filePath: path.join(runtime, 'primitives/budget-progress.tsx')};
      return context.resolveRequest(context, name, platform);
    }
  }
});
`);
  writeFileSync(join(host, 'ios/.xcode.env.local'), `export NODE_BINARY=${shellQuote(process.execPath)}\n`);
  run('corepack', ['pnpm', 'install', '--ignore-workspace', '--node-linker=hoisted']);
  if (!existsSync(ruby)) throw new Error('Set FSDS_RUBY_BINARY to an installed Ruby 3.3 binary');
  const bundle = join(dirname(ruby), 'bundle');
  const env = { BUNDLE_PATH: join(host, 'vendor/bundle') };
  run(ruby, [bundle, 'install'], host, env);
  run(ruby, [bundle, 'exec', 'pod', 'install'], join(host, 'ios'), env);
}

function receive() {
  const built = JSON.parse(readFileSync(join(proof, 'built-inputs.json'), 'utf8'));
  if (built.identity !== inputs().identity || built.bundleHash !== hashFile(appBundle)) throw new Error('Native source or bundle changed; prepare and build again');
  const server = createServer((request, response) => {
    if (request.method !== 'POST' || request.url !== '/receipt') { response.writeHead(404).end(); return; }
    let body = '';
    request.on('data', chunk => { body += chunk; if (body.length > 100_000) request.destroy(); });
    request.on('end', () => {
      let result;
      let failure;
      try {
        result = JSON.parse(body);
        if (result.error) throw new Error(result.error);
        if (result.buildIdentity !== built.identity) throw new Error('Native receipt is from a different source build');
        const { baseline, early, middle, settled } = result;
        if (result.platform !== 'ios' || result.kind !== (generated ? 'generated-carousel-movement' : 'native-sequence-movement')) throw new Error('Unexpected native producer');
        if (result.reducedMotion) throw new Error('Spatial probe inconclusive: OS reduced motion is enabled');
        if (!(middle.at < result.profile.durationMs)) throw new Error('Spatial probe inconclusive: native measurement arrived after the movement budget');
        for (const frame of [baseline, early.first, early.second, middle.first, middle.second, settled]) {
          if (![frame.x, frame.y, frame.width, frame.height].every(Number.isFinite) || Math.abs(frame.width - 320) > 1) throw new Error('Native view measurement missing or wrong width');
        }
        if (Math.abs(settled.x - baseline.x) > 1 || result.index !== 1) throw new Error('Incoming native content did not settle at the active origin');
      } catch (error) { failure = String(error); }
      const receipt = { observedAt: new Date().toISOString(), built, result, verdict: failure ? 'fail' : 'pass', failure,
        boundary: `Native layout and final index in the ${generated ? 'generated Carousel with composed Pagination' : 'sequence primitive'} fixture. measureInWindow does not establish native-driver presentation movement; inspect a recording with native-carousel-pixels.mjs. No other-platform, countdown presentation or accessibility parity claim.` };
      writeFileSync(join(proof, 'native-geometry.json'), JSON.stringify(receipt, null, 2) + '\n');
      response.writeHead(200, { Connection: 'close' }).end('recorded');
      console.log(JSON.stringify(receipt, null, 2));
      clearTimeout(timeout);
      server.close();
      process.exitCode = failure ? 1 : 0;
    });
  });
  const timeout = setTimeout(() => { console.error('No native receipt received'); server.close(); process.exitCode = 1; }, 180_000);
  server.listen(5210, '127.0.0.1', () => console.log('Waiting for native geometry on 127.0.0.1:5210'));
}

switch (process.argv[2]) {
  case 'prepare': prepare(); break;
  case 'build': {
    const prepared = JSON.parse(readFileSync(join(proof, 'prepared-inputs.json'), 'utf8'));
    if (prepared.identity !== inputs().identity) throw new Error('Native source changed; prepare again');
    run('xcodebuild', ['-workspace', 'FsdsCarouselWitness.xcworkspace', '-scheme', 'FsdsCarouselWitness', '-configuration', 'Release', '-sdk', 'iphonesimulator', '-destination', 'generic/platform=iOS Simulator', '-derivedDataPath', join(proof, 'build'), '-jobs', '2', 'ARCHS=arm64', 'ONLY_ACTIVE_ARCH=YES', 'CODE_SIGNING_ALLOWED=NO'], join(host, 'ios'));
    if (prepared.identity !== inputs().identity) throw new Error('Native source changed during the build');
    writeFileSync(join(proof, 'built-inputs.json'), JSON.stringify({ ...prepared, bundleHash: hashFile(appBundle) }, null, 2));
    break;
  }
  case 'receive': receive(); break;
  default: throw new Error('Usage: node scripts/react-native-carousel-host.mjs prepare|build|receive [--generated]');
}
