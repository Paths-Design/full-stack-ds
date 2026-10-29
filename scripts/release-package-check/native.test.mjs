import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

for (const flag of ["-e", "--eval"]) test(`rejects ${flag} before starting a recursive Metro worker`, () => {
  const source = `import { verifyNativeBundles } from ${JSON.stringify(new URL("./native.mjs", import.meta.url).href)};
await verifyNativeBundles({ repo: '/missing-native-probe', consumer: '/missing-consumer', evidence: '/missing-evidence' });`;
  const result = spawnSync(process.execPath, ["--input-type=module", flag, source], { encoding: "utf8", timeout: 10000 });
  assert.equal(result.status, 1);
  assert.equal(result.error, undefined);
  assert.match(result.stderr, /NATIVE_METRO_FILE_ENTRY:/);
  assert.doesNotMatch(result.stderr, /ENOENT/);
});
