// Real rendered pixels and trusted hit testing after fresh loads and resizes.
// Run against flagged Chrome with CAT_URL, CHROME_PATH and optional HEADED=1.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const output = fileURLToPath(new URL("../../../../test-results/typing-cat-resize/", import.meta.url));
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: !process.env.HEADED,
  args: ["--enable-features=CanvasDrawElement", "--enable-experimental-web-platform-features"],
});
const url = process.env.CAT_URL ?? "http://localhost:5188/cat.html";
const report = { url, browser: browser.version(), checks: [] };
let failures = 0;
function check(name, pass, evidence) {
  report.checks.push({ name, pass, evidence });
  if (!pass) failures++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name} ${JSON.stringify(evidence)}`);
}
const sizes = [[1440, 900], [1200, 800], [1000, 600], [800, 1000], [390, 844], [1920, 1080], [1440, 900]];
async function pixels(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const canvas = document.querySelector("canvas");
    const gl = canvas.getContext("webgl2");
    const timer = setTimeout(() => reject(new Error("No canvas paint within 5 seconds")), 5000);
    // Read after rendering, before the compositor clears the drawing buffer.
    canvas.addEventListener("paint", () => {
      clearTimeout(timer);
      resolve([...document.querySelectorAll("iframe")].map((frame) => {
        const point = (x, y) => window.__typingCat.screenPoint(frame, frame.offsetWidth * x, frame.offsetHeight * y);
        const p = point(0.5, 0.8);
        const rgba = new Uint8Array(4);
        gl.readPixels(Math.floor(p.x * canvas.width / canvas.clientWidth),
          canvas.height - 1 - Math.floor(p.y * canvas.height / canvas.clientHeight),
          1, 1, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
        return { id: frame.id, point: p, rgba: [...rgba],
          corners: [[0, 0], [1, 0], [1, 1], [0, 1]].map(([x, y]) => point(x, y)),
          uploads: window.__typingCat.uploads()[frame.id] };
      }));
    }, { once: true });
    canvas.requestPaint();
  }));
}
try {
  for (const deviceScaleFactor of [1, 2]) {
    const page = await browser.newPage({ deviceScaleFactor, colorScheme: "light" });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const mode of ["fresh", "resize"]) {
      for (const [width, height] of sizes) {
        await page.setViewportSize({ width, height });
        if (mode === "fresh") {
          await page.goto(url);
          await page.waitForSelector("html[data-cat-ready]");
        }
        await page.waitForTimeout(400);
        const label = `${mode}-${width}x${height}-dpr${deviceScaleFactor}`;
        const screens = await pixels(page);
        report.path = await page.evaluate(() => document.documentElement.dataset.catReady);
        const inside = (screen) => screen.corners.every((p) => p.x >= 0 && p.x < width && p.y >= 0 && p.y < height);
        for (const screen of screens) {
          check(`${label} ${screen.id} visible site background`, inside(screen) && screen.rgba[3] === 255 && screen.rgba.slice(0, 3).every((v) => v > 220), screen);
        }
        await page.screenshot({ path: `${output}/${label}.png` });
        // Distinct fresh colours detect stale, transparent or wrong-device textures.
        const colours = [[231, 57, 89], [41, 173, 91], [49, 101, 223]];
        await page.evaluate((colours) => {
          [...document.querySelectorAll("iframe")].forEach((frame, i) => {
            const marker = frame.contentDocument.createElement("div");
            marker.id = "resize-pixel-witness";
            marker.style.cssText = `position:fixed;inset:0;z-index:2147483647;pointer-events:none;background:rgb(${colours[i].join(",")})`;
            frame.contentDocument.body.append(marker);
          });
        }, colours);
        await page.waitForTimeout(150);
        const coloured = await pixels(page);
        coloured.forEach((screen, i) => check(`${label} ${screen.id} fresh snapshot`,
          screen.rgba[3] === 255 && colours[i].every((v, c) => Math.abs(v - screen.rgba[c]) <= 2), screen.rgba));
        await page.evaluate(() => document.querySelectorAll("iframe").forEach((frame) => frame.contentDocument.getElementById("resize-pixel-witness").remove()));
        for (const screen of screens) {
          // Rendering failure is already recorded; avoid off-window mouse clicks.
          if (!inside(screen)) continue;
          for (const route of ["Stats", "Draft"]) {
            const p = await page.evaluate(({ id, route }) => {
              const f = document.getElementById(id);
              const a = [...f.contentDocument.querySelectorAll("a")].find((a) => a.textContent.trim() === route);
              const r = a.getBoundingClientRect();
              return window.__typingCat.screenPoint(f, r.x + r.width / 2, r.y + r.height / 2);
            }, { id: screen.id, route });
            await page.mouse.click(p.x, p.y);
            await page.waitForTimeout(100);
            const hash = await page.evaluate((id) => document.getElementById(id).contentWindow.location.hash, screen.id);
            check(`${label} ${screen.id} ${route} hit testing`, hash === `#/${route.toLowerCase()}`, { hash });
          }
        }
      }
    }
    check(`dpr${deviceScaleFactor} no uncaught page errors`, errors.length === 0, errors);
    await page.close();
  }
} finally {
  writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
if (failures) process.exitCode = 1;
