import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const entrySource = `
import React, { useState } from "react";
import { AppRegistry, Text } from "react-native";
import { Button, Icon } from "@full-stack-ds/react-native";
import { Stack } from "@full-stack-ds/react-native/primitives";
import { FsdsThemeProvider } from "@full-stack-ds/react-native/tokens";
import { resolveIcon } from "@full-stack-ds/iconography";
import Svg, { Path } from "react-native-svg";
const alarm = resolveIcon("alarm", 24);
if (!alarm || alarm.paths.length === 0) throw new Error("Installed iconography did not resolve alarm");
function PackedConsumer() {
  const [count, setCount] = useState(0);
  return <FsdsThemeProvider value={{ brand: "consumer", tokens: { "color.example": "#123456" } }}>
    <Stack layout="stack" variant="vertical">
      <Button variant="primary" size="large" ariaLabel="Packed action" onClick={() => setCount(value => value + 1)}>Packed action</Button>
      <Icon name="alarm" size="lg" decorative={false} ariaLabel="Packed alarm" />
      <Svg width={24} height={24} viewBox={alarm.viewBox}>
        {alarm.paths.map((path, index) => <Path key={index} d={path.d} fill={path.fill} stroke={path.stroke} strokeWidth={path.strokeWidth} />)}
      </Svg>
      <Text>{count}</Text>
    </Stack>
  </FsdsThemeProvider>;
}
AppRegistry.registerComponent("FsdsPackedConsumer", () => PackedConsumer);
`;
const slash = value => value.replaceAll("\\", "/");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");

/** Standard native bundler consumption; does not execute or render a native app. */
export async function verifyNativeBundles({ repo, consumer, evidence }) {
  // Metro forks inherit execArgv; eval would recursively execute this launcher.
  assert.ok(!process.execArgv.some(arg => /^(?:-e|-p|--eval|--print)(?:=|$)/.test(arg)),
    "NATIVE_METRO_FILE_ENTRY: invoke the saved release verifier file; Metro workers inherit inline evaluation flags");
  repo = realpathSync(repo);
  consumer = realpathSync(consumer);
  const rootRequire = createRequire(join(repo, "package.json"));
  const configRequire = createRequire(rootRequire.resolve("@react-native/metro-config/package.json"));
  const { getDefaultConfig, mergeConfig } = rootRequire("@react-native/metro-config");
  const Metro = configRequire("metro");
  for (const name of ["react-native", "iconography"]) {
    const directory = join(consumer, "node_modules/@full-stack-ds", name);
    assert.equal(realpathSync(directory), directory, name + " must be installed from its tarball");
  }
  const nativeRoot = realpathSync(join(consumer, "node_modules/react-native"));
  // The application entry uses the same Babel runtime as its pinned RN peer.
  const nativeRequire = createRequire(join(nativeRoot, "package.json"));
  const babelRuntimeRoot = realpathSync(dirname(nativeRequire.resolve("@babel/runtime/package.json")));
  const babelRuntimeTarget = join(consumer, "node_modules/@babel/runtime");
  mkdirSync(dirname(babelRuntimeTarget), { recursive: true });
  if (!existsSync(babelRuntimeTarget)) symlinkSync(babelRuntimeRoot, babelRuntimeTarget, "dir");
  assert.equal(realpathSync(babelRuntimeTarget), babelRuntimeRoot);
  const svgRoot = realpathSync(join(consumer, "node_modules/react-native-svg"));
  const reactRoot = realpathSync(join(consumer, "node_modules/react"));
  const manifestAt = directory => JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));
  const tools = {
    node: process.version,
    reactNative: manifestAt(nativeRoot).version, react: manifestAt(reactRoot).version,
    reactNativeSvg: manifestAt(svgRoot).version, metro: configRequire("metro/package.json").version,
    metroConfig: rootRequire("@react-native/metro-config/package.json").version,
    babelPreset: rootRequire("@react-native/babel-preset/package.json").version,
    babelRuntime: manifestAt(babelRuntimeRoot).version,
    nativeRoot, svgRoot, reactRoot, babelRuntimeRoot,
  };
  assert.equal(tools.reactNative, tools.metroConfig, "Metro configuration must match the pinned React Native peer");
  assert.equal(tools.reactNative, tools.babelPreset, "Babel preset must match the pinned React Native peer");
  writeFileSync(join(evidence, "native-tools.json"), JSON.stringify(tools, null, 2));
  const babelConfig = `module.exports = { presets: [${JSON.stringify(rootRequire.resolve("@react-native/babel-preset"))}] };\n`;
  const babelFile = join(consumer, "babel.config.cjs");
  if (existsSync(babelFile)) assert.equal(readFileSync(babelFile, "utf8"), babelConfig, "Consumer Babel configuration differs");
  writeFileSync(babelFile, babelConfig);
  const entry = join(consumer, "native-consumer.tsx");
  writeFileSync(entry, entrySource);
  const requiredFiles = [
    "react-native/src/index.ts", "react-native/src/components/Button/Button.tsx", "react-native/src/components/Icon/Icon.tsx",
    "react-native/src/primitives/index.ts", "react-native/src/primitives/stack.tsx", "react-native/src/primitives/glyph.tsx",
    "react-native/src/tokens/index.tsx", "iconography/index.mjs",
  ];
  const requiredPaths = requiredFiles.map(file => slash(join(consumer, "node_modules/@full-stack-ds", file)));
  const observations = [];
  for (const platform of ["ios", "android"]) {
    console.log(`Installed React Native: building production ${platform} Metro bundle`);
    const metroLog = join(evidence, `native-${platform}-metro.log`);
    writeFileSync(metroLog, "");
    let progressBucket = -1;
    const modules = new Set();
    const bundleFile = join(evidence, `native-${platform}.bundle.js`);
    const mapFile = join(evidence, `native-${platform}.bundle.map`);
    const observation = { platform, tools };
    const config = mergeConfig(getDefaultConfig(consumer), {
      // Metro's CLI loader adds projectRoot to watchFolders; mirror that API setup.
      projectRoot: consumer, watchFolders: [consumer, realpathSync(join(repo, "node_modules"))],
      maxWorkers: 2, resetCache: true, resolver: { useWatchman: false },
      reporter: { update(event) {
        if (event.type === "bundle_transform_progressed") {
          const bucket = Math.floor(event.transformedFileCount / 100);
          if (bucket === progressBucket) return;
          progressBucket = bucket;
        }
        appendFileSync(metroLog, JSON.stringify({ time: new Date().toISOString(), type: event.type,
          transformedFileCount: event.transformedFileCount, totalFileCount: event.totalFileCount,
          message: event.message ?? event.chunk, error: event.error?.stack ?? event.error?.message,
        }) + "\n");
      } },
      serializer: { experimentalSerializerHook(graph) {
        for (const file of graph.dependencies.keys()) modules.add(slash(file));
      } },
    });
    // Keep standard extensions, conditions, transformer and polyfills; no aliases.
    assert.equal(config.resolver.resolveRequest, null);
    assert.deepEqual(config.resolver.extraNodeModules, {});
    try {
      const result = await Metro.runBuild(config, { entry, platform, dev: false, minify: true, sourceMap: true,
        sourceMapUrl: `native-${platform}.bundle.map`, bundleOut: bundleFile, sourceMapOut: mapFile,
      });
      assert.ok(result.code.length > 0, platform + ": Metro returned no code");
      assert.ok(existsSync(bundleFile) && existsSync(mapFile), platform + ": bundle or map missing");
      const map = JSON.parse(readFileSync(mapFile, "utf8"));
      assert.ok(Array.isArray(map.sources) && map.sources.length > 0);
      const sources = map.sources.map(source => slash(String(source)));
      for (const file of [...modules, ...sources]) {
        assert.ok(!/\/packages\/ds-(?:react-native|iconography)\//.test("/" + file), platform + ": workspace FSDS source reached Metro: " + file);
        assert.ok(!/(?:^|\/)(?:__tests__|__mocks__)(?:\/|$)|(?:^|\/)test-react-native(?:-svg)?\.tsx$/.test(file), platform + ": mock/test source reached Metro: " + file);
      }
      for (const file of modules) if (file.includes("/node_modules/@full-stack-ds/")) assert.ok(file.startsWith(slash(join(consumer, "node_modules/@full-stack-ds")) + "/"), platform + ": FSDS module escaped installed consumer: " + file);
      for (const required of requiredPaths) assert.ok(modules.has(required), platform + ": required installed module missing: " + required);
      assert.ok([...modules].some(file => file.startsWith(slash(svgRoot) + "/")), platform + ": real react-native-svg was not compiled");
      assert.ok([...modules].some(file => file.startsWith(slash(nativeRoot) + "/")), platform + ": real React Native was not compiled");
      for (const file of requiredFiles.filter(file => !file.endsWith("/index.ts"))) {
        const suffix = "/node_modules/@full-stack-ds/" + file;
        assert.ok(sources.some(source => ("/" + source).endsWith(suffix)), platform + ": source-map witness missing: " + file);
      }
      Object.assign(observation, { passed: true, moduleCount: modules.size, sourceCount: sources.length,
        bundleSha256: hash(readFileSync(bundleFile)), mapSha256: hash(readFileSync(mapFile)), modules: [...modules].sort(), sources,
      });
      observations.push(observation);
      console.log(`Installed React Native: production ${platform} Metro bundle verified`);
    } catch (error) { observation.error = error.stack ?? String(error); throw error; }
    finally {
      writeFileSync(join(evidence, `native-${platform}.json`), JSON.stringify(observation, null, 2));
    }
  }
  assert.equal(observations.length, 2);
  return observations;
}
