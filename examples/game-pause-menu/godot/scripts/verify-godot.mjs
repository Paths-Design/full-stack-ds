#!/usr/bin/env node
/** Bound the documented headless scene outside the engine's own watchdog. */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const lane = fileURLToPath(new URL("..", import.meta.url));
const editor = process.env.GODOT ?? "/Applications/Godot.app/Contents/MacOS/Godot";
const timeoutMs = Number(process.env.FSDS_PAUSE_GODOT_TIMEOUT_MS ?? "150000");

function fail(message) {
  console.error(`Godot verification FAILED: ${message}`);
  process.exitCode = 1;
}

function validate(output) {
  const lines = output.split(/\r?\n/).map((line) => line.trim());
  // Engine failures are diagnostic records. The same words inside a fixture
  // rejection message or TEST_PASS description do not identify a script fault.
  if (lines.some((line) => /^(?:SCRIPT\s+ERROR\b|parse[\s_-]*error\s*:|ERROR:\s+Failed\s+to\s+load\s+script\b)/i.test(line))) {
    throw new Error("script/parse error output");
  }
  const counts = {};
  for (const name of ["TOTAL", "PASSED", "FAILED"]) {
    const prefix = `TESTS_${name}`;
    const summaries = lines.filter((line) => line === prefix || line.startsWith(`${prefix} `));
    if (summaries.length !== 1) throw new Error(`expected one ${prefix} counter`);
    const match = summaries[0].match(new RegExp(`^${prefix} ([0-9]+)$`));
    const value = match ? Number(match[1]) : NaN;
    if (!Number.isSafeInteger(value)) throw new Error(`invalid ${prefix} counter`);
    counts[name] = value;
  }
  if (counts.TOTAL === 0 || counts.TOTAL !== counts.PASSED + counts.FAILED || counts.FAILED !== 0) {
    throw new Error("test counters must be nonzero, consistent and all passing");
  }
  if (lines.filter((line) => /^TEST_PASS .+/.test(line)).length !== counts.PASSED ||
      lines.filter((line) => /^TEST_FAIL .+/.test(line)).length !== counts.FAILED) {
    throw new Error("per-check markers disagree with test counters");
  }
  if (lines.filter((line) => line === "TESTS_OK").length !== 1) {
    throw new Error("expected one TESTS_OK marker");
  }
  return counts.TOTAL;
}

if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
  fail("FSDS_PAUSE_GODOT_TIMEOUT_MS must be a positive integer");
} else {
  const run = spawnSync(editor, ["--headless", "--path", resolve(lane), "res://tests/test_main.tscn"], {
    encoding: "utf8",
    timeout: timeoutMs,
    // Kill only the process this invocation spawned, even if parsing prevented
    // the in-scene watchdog from starting or the child ignores SIGTERM.
    killSignal: "SIGKILL",
    maxBuffer: 16 * 1024 * 1024,
  });
  const stdout = run.stdout ?? "";
  const stderr = run.stderr ?? "";
  process.stdout.write(stdout);
  process.stderr.write(stderr);
  if (run.error) {
    fail(run.error.code === "ETIMEDOUT" ? `spawned process ${run.pid} timed out after ${timeoutMs}ms` : run.error.message);
  } else if (run.status !== 0) {
    fail(`spawned process exited ${run.status ?? run.signal}`);
  } else {
    try {
      const total = validate(`${stdout}\n${stderr}`);
      console.log(`Godot verification passed: ${total} checks, zero failures.`);
    } catch (error) {
      fail(error.message);
    }
  }
}
