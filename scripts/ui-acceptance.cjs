"use strict";

// Run against the built app: NODE_PATH=<Playwright packages> node scripts/ui-acceptance.cjs <URL>.
// BROWSER_PATH can override the installed Edge binary; no production dependency is added.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");
const JSZip = require("jszip");

const outputDir = path.resolve(process.env.UI_OUTPUT_DIR || ".tmp/ui-acceptance");
const appearance = process.env.UI_APPEARANCE || "standard";
const viewports = [[1920, 1080], [1920, 950], [1536, 864], [1280, 720]];
const sample = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0}.slide{position:relative;width:1600px;height:900px;background:#fff;color:#182333}
h1{position:absolute;left:100px;top:80px;font:48px 'Yu Gothic UI'}
@media(prefers-color-scheme:dark){.slide{background:#000;color:#fff}}
</style></head><body><section class="slide"><h1>テーマに依存しない変換</h1></section>
<script>document.querySelector('h1').textContent += '・追加表示';</script></body></html>`;
const payload = { name: "操作確認.html", mimeType: "text/html", buffer: Buffer.from(sample) };
const report = { layouts: [], themes: [], downloads: [], contrast: [], checks: [] };

async function selectTheme(page, theme) {
  await page.locator(`.theme-switch label:has(input[value="${theme}"])`).click();
  assert.equal(await page.locator(`input[name="theme"][value="${theme}"]`).isChecked(), true);
}

async function assertFits(page, state, selectors) {
  const measurement = await page.evaluate((selectors) => {
    const root = document.documentElement;
    return {
      width: innerWidth, height: innerHeight, scrollWidth: root.scrollWidth, scrollHeight: root.scrollHeight,
      panels: Array.from(document.querySelectorAll('#file-workspace:not([hidden]) .file-grid > section')).map(element => {
        const rect = element.getBoundingClientRect();
        const parent = element.parentElement.getBoundingClientRect();
        return { name: element.className, bottom: rect.bottom, parentBottom: parent.bottom, right: rect.right, parentRight: parent.right };
      }),
      controls: selectors.map(selector => {
        const element = document.querySelector(selector);
        const rect = element.getBoundingClientRect();
        return { selector, top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, height: rect.height };
      })
    };
  }, selectors);
  report.layouts.push({ state, ...measurement });
  assert.ok(measurement.scrollWidth <= measurement.width, `${state}: horizontal scroll ${JSON.stringify(measurement)}`);
  assert.ok(measurement.scrollHeight <= measurement.height, `${state}: vertical scroll ${JSON.stringify(measurement)}`);
  for (const panel of measurement.panels) {
    assert.ok(panel.bottom <= panel.parentBottom + 1 && panel.right <= panel.parentRight + 1,
      `${state}: panel escapes its form ${JSON.stringify(panel)}`);
  }
  for (const rect of measurement.controls) {
    assert.ok(rect.height > 0 && rect.top >= 0 && rect.bottom <= measurement.height && rect.left >= 0 && rect.right <= measurement.width,
      `${state}: control outside viewport ${JSON.stringify(rect)}`);
  }
}

async function checkContrast(page, theme) {
  const pairs = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    const color = variable => {
      const probe = document.createElement("span");
      probe.style.color = style.getPropertyValue(variable);
      document.body.append(probe);
      const rgb = getComputedStyle(probe).color.match(/[\d.]+/g).slice(0, 3).map(Number);
      probe.remove();
      return rgb;
    };
    return [["--ink", "--surface"], ["--muted", "--surface"], ["--muted", "--canvas"],
      ["--ink", "--input"], ["--muted", "--input"], ["--accent-ink", "--accent"],
      ["--disabled-ink", "--disabled-bg"], ["--warning", "--warning-bg"],
      ["--success", "--success-bg"], ["--error", "--error-bg"],
      ["--accent", "--surface"], ["--accent", "--accent-soft"],
      ["--muted", "--surface-subtle"], ["--ink", "--canvas"]]
      .map(([fg, bg]) => ({ fg, bg, foreground: color(fg), background: color(bg) }));
  });
  const luminance = rgb => rgb.map(c => c / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
  for (const pair of pairs) {
    const values = [luminance(pair.foreground), luminance(pair.background)].sort((a, b) => b - a);
    const ratio = (values[0] + 0.05) / (values[1] + 0.05);
    report.contrast.push({ theme, fg: pair.fg, bg: pair.bg, ratio: Number(ratio.toFixed(2)) });
    assert.ok(ratio >= 4.5, `${theme}: low contrast ${pair.fg}/${pair.bg}: ${ratio}`);
  }
}

async function saveDownload(page, selector, name) {
  const pending = page.waitForEvent("download");
  await page.locator(selector).click();
  const download = await pending;
  const target = path.join(outputDir, name);
  await download.saveAs(target);
  const zip = await JSZip.loadAsync(await fs.readFile(target));
  const presentations = Object.values(zip.files).filter(file => /\.pptx$/i.test(file.name));
  assert.ok(presentations.length > 0);
  const slides = [];
  for (const presentation of presentations) {
    const pptx = await JSZip.loadAsync(await presentation.async("nodebuffer"));
    for (const file of Object.values(pptx.files).filter(file => /^ppt\/slides\/slide\d+\.xml$/.test(file.name))) {
      slides.push(await file.async("string"));
    }
  }
  report.downloads.push({ name, presentations: presentations.map(file => file.name), slides: slides.length });
  return slides;
}

(async () => {
  assert.ok(process.argv[2], "Provide the running app URL");
  await fs.mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto(process.argv[2]);
    assert.equal(await page.locator('input[name="theme"][value="system"]').isChecked(), true);
    await page.locator("#open-settings-button").click();
    assert.equal(await page.locator("#theme-settings").evaluate(el => el.matches(":modal")), true);
    assert.equal(await page.locator("#close-settings-button").evaluate(el => el === document.activeElement), true);
    await page.locator('input[name="appearance"][value="standard"]').focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator("html").getAttribute("data-appearance"), "8bit");
    if (appearance === "standard") await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#open-settings-button").evaluate(el => el === document.activeElement), true);
    await page.reload();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator("html").getAttribute("data-appearance"), appearance);
    if (appearance === "8bit") assert.equal(await page.evaluate(() => document.fonts.check('16px "DotGothic16"')), true);
    report.checks.push("Settings modal, keyboard appearance choice, Escape/focus return and reload persistence");
    assert.equal(await page.locator("#execute-scripts").isChecked(), false);
    assert.equal(await page.locator("#editor-execute-scripts").isChecked(), false);
    const fileControls = ["#open-settings-button", "#intro-title", ".intro-note", "#drop-zone", "#open-editor-button", "#execute-scripts", "#convert-button"];
    const editorControls = ["#open-settings-button", "#back-to-file-button", "#editor-execute-scripts", "#editor-convert-button", "#html-editor"];
    for (const theme of ["light", "dark"]) {
      await selectTheme(page, theme);
      await checkContrast(page, theme);
      await page.locator("#open-settings-button").click();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(outputDir, `settings-${theme}.png`) });
      await page.locator("#close-settings-button").click();
      for (const [width, height] of viewports) {
        await page.setViewportSize({ width, height });
        await page.reload();
        await page.evaluate(() => document.fonts.ready);
        await assertFits(page, `file-empty-${theme}`, fileControls);
        if (height === 1080) await page.screenshot({ path: path.join(outputDir, `home-${theme}.png`) });
        await page.locator("#html-file").setInputFiles(payload);
        await page.locator("#file-script-notice").waitFor({ state: "visible" });
        await assertFits(page, `file-script-notice-${theme}`, fileControls);
        await page.locator("#convert-button").click();
        await assertFits(page, `file-converting-${theme}`, [...fileControls, "#cancel-button"]);
        await page.locator("#download-link").waitFor({ state: "visible", timeout: 30000 });
        await assertFits(page, `file-complete-${theme}`, [...fileControls, "#download-link", "#progress-card", "#message"]);
        if (height === 1080) await page.screenshot({ path: path.join(outputDir, `file-${theme}.png`) });
        if (height === 720) await page.screenshot({ path: path.join(outputDir, `file-compact-${theme}.png`) });
        await page.locator("#open-editor-button").click();
        await page.locator("#html-editor").fill(sample);
        await page.locator("#editor-script-notice").waitFor({ state: "visible" });
        await assertFits(page, `editor-script-notice-${theme}`, editorControls);
        const previewHeading = page.frameLocator("#html-preview").locator("h1");
        await previewHeading.waitFor({ state: "visible" });
        assert.ok(!(await previewHeading.innerText()).includes("追加表示"));
        const previewBounds = await previewHeading.boundingBox();
        assert.ok(previewBounds.width > 0 && previewBounds.height > 0, "Preview content has no rendered area");
        await page.locator("#editor-convert-button").click();
        await assertFits(page, `editor-converting-${theme}`, [...editorControls, "#editor-cancel-button"]);
        await page.locator("#editor-download-link").waitFor({ state: "visible", timeout: 30000 });
        await assertFits(page, `editor-complete-${theme}`, [...editorControls, "#editor-download-link", "#editor-message"]);
        if (height === 720) await page.screenshot({ path: path.join(outputDir, `editor-compact-${theme}.png`) });
        if (height === 1080) {
          const slides = await saveDownload(page, "#editor-download-link", `editor-${theme}.zip`);
          if (theme === "light") report.referenceSlides = slides;
          else assert.deepEqual(slides, report.referenceSlides, "App theme changed converted slide XML");
          await page.screenshot({ path: path.join(outputDir, `editor-${theme}.png`) });
        }
        await page.locator("#back-to-file-button").click();
      }
      report.themes.push(theme);
    }

    await selectTheme(page, "system");
    await page.emulateMedia({ colorScheme: "light" });
    const lightCanvas = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.emulateMedia({ colorScheme: "dark" });
    const darkCanvas = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    assert.notEqual(lightCanvas, darkCanvas, "System theme did not react without reloading");
    await selectTheme(page, "light");
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), lightCanvas);
    await page.reload();
    assert.equal(await page.locator('input[name="theme"][value="light"]').isChecked(), true);
    await page.locator('input[name="theme"][value="light"]').focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator('input[name="theme"][value="dark"]').isChecked(), true);
    report.checks.push("System changes live; explicit theme survives reload and OS override; keyboard radio navigation");

    await page.setViewportSize({ width: 1920, height: 950 });
    await page.locator("#html-file").setInputFiles([path.resolve("testdata/multi-slide.html"), path.resolve("testdata/mixed-a4.html")]);
    await page.locator("#convert-button").click();
    await page.locator("#download-link").waitFor({ state: "visible", timeout: 30000 });
    await assertFits(page, "mixed-a4-complete", [...fileControls, "#download-link", "#message"]);
    await saveDownload(page, "#download-link", "batch-mixed-a4.zip");
    assert.equal(report.downloads.at(-1).presentations.length, 3);
    assert.match(await page.locator("#message").innerText(), /縦・横のページは別々のPPTX/);
    await page.locator("#open-editor-button").click();
    await page.locator("#html-editor").fill(sample);
    await page.locator("#editor-execute-scripts").check();
    await page.locator("#editor-convert-button").click();
    await page.locator("#editor-download-link").waitFor({ state: "visible", timeout: 30000 });
    const runtimeSlides = await saveDownload(page, "#editor-download-link", "editor-scripts-on.zip");
    assert.ok(runtimeSlides.join("").includes("追加表示"));
    await page.locator("#editor-convert-button").click();
    await page.locator("#editor-cancel-button").click();
    assert.match(await page.locator("#editor-message").innerText(), /キャンセル/);
    assert.equal(await page.locator("#editor-convert-button").isEnabled(), true);
    await page.locator("#back-to-file-button").click();
    await page.locator("#open-editor-button").click();
    assert.equal(await page.locator("#html-editor").inputValue(), sample);
    await page.frameLocator("#html-preview").locator("h1").waitFor({ state: "visible" });
    await page.locator("#html-editor").fill("");
    await page.locator("#preview-empty").waitFor({ state: "visible" });
    await page.locator("#html-editor").fill(sample);
    await page.frameLocator("#html-preview").locator("h1").waitFor({ state: "visible" });
    report.checks.push("Batch/mixed A4 ZIP, scripts on/off, cancel/retry controls, editor content preserved across back navigation");
    report.checks.push("Preview renders after opening, back navigation, and clearing/re-entering HTML");

    for (const workspace of ["#editor-workspace", "#file-workspace"]) {
      if (workspace === "#file-workspace") await page.locator("#back-to-file-button").click();
      for (const summary of await page.locator(`${workspace} details > summary`).all()) {
        await summary.click();
        assert.ok(await summary.evaluate(element => element.parentElement.open));
        await summary.click();
      }
    }
    await page.locator("#html-file").setInputFiles(path.resolve("testdata/no-slide.html"));
    await page.locator("#convert-button").click();
    await page.locator("#message.is-error").waitFor({ state: "visible" });
    await assertFits(page, "file-error", fileControls);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(outputDir, "mobile-file.png"), fullPage: true });
    await page.locator("#open-editor-button").click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(outputDir, "mobile-editor.png"), fullPage: true });
    await page.locator("#open-settings-button").click();
    const settingsBounds = await page.locator("#theme-settings").boundingBox();
    assert.ok(settingsBounds.x >= 0 && settingsBounds.x + settingsBounds.width <= 390);
    await page.keyboard.press("Escape");
    report.checks.push("Expandable help in both modes, error feedback, mobile without horizontal overflow");

    const blocked = await browser.newPage();
    await blocked.addInitScript(() => Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Blocked", "SecurityError"); } }));
    await blocked.goto(process.argv[2]);
    await selectTheme(blocked, "dark");
    await blocked.locator("#open-settings-button").click();
    await blocked.locator('input[name="appearance"][value="8bit"]').check();
    await blocked.locator("#close-settings-button").click();
    assert.equal(await blocked.locator("html").getAttribute("data-appearance"), "8bit");
    assert.equal(await blocked.locator("#open-editor-button").isEnabled(), true);
    await blocked.close();
    report.checks.push("Theme controls work when browser storage is blocked");
    assert.deepEqual(errors, []);
    delete report.referenceSlides;
    console.log(JSON.stringify({ layouts: report.layouts.length, downloads: report.downloads, checks: report.checks, minContrast: Math.min(...report.contrast.map(x => x.ratio)), errors }, null, 2));
  } finally {
    delete report.referenceSlides;
    await fs.writeFile(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
