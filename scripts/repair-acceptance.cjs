"use strict";

// Windows Edge, against the compiled application. Run repair-mutations.mjs first.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { chromium } = require("playwright");
const JSZip = require("jszip");
const output = path.resolve(process.env.REPAIR_OUTPUT_DIR || ".tmp/html-repair");
const report = { browser: "Windows Edge", history: [], geometry: [], downloads: [], layouts: [], errors: [] };
const hash = value => createHash("sha256").update(value).digest("hex");

(async () => {
  const mutations = JSON.parse(await fs.readFile(path.join(output, "mutation-report.json"), "utf8"));
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, colorScheme: "light" });
  page.on("pageerror", error => report.errors.push(error.message));
  const source = file => fs.readFile(path.join(output, file), "utf8");
  const editor = page.locator("#html-editor");
  const repair = page.locator("#repair-html-button");
  async function open() {
    await page.goto(process.argv[2]);
    await page.locator("#open-editor-button").click();
  }
  try {
    await open();
    assert.equal(await repair.isDisabled(), true);
    const cases = mutations.cases.filter(item => item.category === "repaired-original-tree");
    const historyCases = [
      { id: "EOF", damaged: '<section class="slide"><h1>見出し</h1><div>本文', repaired: '<section class="slide"><h1>見出し</h1><div>本文</div></section>' },
      ...await Promise.all([0, 1].map(async sourceIndex => {
        const item = cases.find(item => item.sourceIndex === sourceIndex && item.kind === "multiple-ends" && item.changes.length >= 2);
        assert.ok(item, "Multi-tag repair required for each source");
        return { id: item.id, damaged: await source(item.damagedFile), repaired: await source(item.repairedFile) };
      }))
    ];
    for (const item of historyCases) {
      await open(); // A fresh document guarantees an empty native history.
      await editor.focus();
      await page.keyboard.insertText(item.damaged); // One native insertion, as with pasted text.
      await repair.click();
      assert.equal(await editor.inputValue(), item.repaired, `${item.id}: apply`);
      await page.evaluate(() => {
        window.historyInputCount = 0;
        document.getElementById("html-editor").addEventListener("input", () => window.historyInputCount++);
      });
      for (let cycle = 0; cycle < 50; cycle++) {
        await page.keyboard.press("Control+z");
        assert.equal(await editor.inputValue(), item.damaged, `${item.id}: undo ${cycle}`);
        await page.keyboard.press("Control+y");
        assert.equal(await editor.inputValue(), item.repaired, `${item.id}: redo ${cycle}`);
      }
      assert.equal(await page.evaluate(() => window.historyInputCount), 100, "No recursive input/history events");
      await repair.click(); // No-op must not append history or swallow keyboard focus.
      await page.keyboard.press("Control+z");
      assert.equal(await editor.inputValue(), item.damaged);
      await page.keyboard.press("Control+z");
      assert.equal(await editor.inputValue(), "", "Second undo removes the initial paste separately");
      await page.keyboard.press("Control+y");
      assert.equal(await editor.inputValue(), item.damaged);
      await page.keyboard.press("Control+y");
      assert.equal(await editor.inputValue(), item.repaired);
      await page.keyboard.press("Control+z");
      await page.keyboard.press("Control+End");
      await page.keyboard.insertText("\n<!-- 新しい編集 -->");
      const edited = await editor.inputValue();
      await page.keyboard.press("Control+y");
      assert.equal(await editor.inputValue(), edited, "New editing discards the redo branch");
      await page.locator("#back-to-file-button").click();
      await page.locator("#open-editor-button").click();
      assert.equal(await editor.inputValue(), edited);
      await page.keyboard.press("Control+z");
      assert.equal(await editor.inputValue(), item.damaged, "Navigation retains native history");
      report.history.push({ case: item.id, cycles: 50, inputEvents: 100, pasteSeparate: true, noOpSeparate: true, redoBranchDiscarded: true, navigation: true });
    }
    await editor.dispatchEvent("compositionstart");
    assert.equal(await repair.isDisabled(), true);
    await editor.dispatchEvent("compositionend");
    assert.equal(await repair.isEnabled(), true);
    report.compositionGuard = true;

    // Verify the shipped browser bundle against every generated damaged input.
    for (const item of mutations.cases) {
      const damaged = await source(item.damagedFile);
      const actual = await page.evaluate(value => HtmlRepair.repairHtml(value).html, damaged);
      assert.equal(actual, await source(item.repairedFile), `Bundle parity: ${item.id}`);
    }
    report.bundleCases = mutations.cases.length;

    // Compare browser layout and text with ALL slide sections visible. Scripts
    // stay disabled, matching preview. CSP prevents original external assets.
    const measurePage = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await measurePage.goto(process.argv[2]);
    async function geometry(html) {
      return measurePage.evaluate(async html => {
        const frame = document.createElement("iframe");
        frame.setAttribute("sandbox", "allow-same-origin");
        frame.style.cssText = "position:fixed;left:0;top:0;width:1280px;height:720px;border:0;z-index:9999;background:white";
        const parsed = new DOMParser().parseFromString(html, "text/html");
        const policy = parsed.createElement("meta");
        policy.httpEquiv = "Content-Security-Policy";
        policy.content = "default-src 'none'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:;";
        parsed.head.prepend(policy);
        const loaded = new Promise(resolve => frame.addEventListener("load", resolve, { once: true }));
        frame.srcdoc = '<!doctype html>' + parsed.documentElement.outerHTML;
        document.body.append(frame);
        await loaded;
        const doc = frame.contentDocument;
        await doc.fonts.ready;
        for (const slide of doc.querySelectorAll(".slide")) slide.style.display = "block";
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const round = number => Math.round(number * 100) / 100;
        const rect = node => Array.from(node.getClientRects()).map(r => [r.x, r.y, r.width, r.height].map(round));
        const elements = Array.from(doc.body.querySelectorAll("*")).filter(el => !["SCRIPT", "STYLE"].includes(el.tagName)).map(el => {
          const style = frame.contentWindow.getComputedStyle(el);
          return [el.tagName, el.id, el.className, rect(el), style.fontFamily, style.fontSize, style.fontWeight, style.color, style.backgroundColor];
        });
        const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
        const texts = [];
        for (let node; (node = walker.nextNode());) {
          if (!node.textContent.trim() || node.parentElement.closest("script,style")) continue;
          const range = doc.createRange(); range.selectNodeContents(node);
          texts.push([node.textContent.trim().replace(/\s+/g, " "), rect(range)]);
        }
        frame.remove();
        return { elements, texts };
      }, html);
    }
    const references = await Promise.all(mutations.sources.map(item => source(item.file)));
    const geometries = [];
    for (const html of references) geometries.push(await geometry(html));
    for (const item of cases) {
      const actual = await geometry(await source(item.repairedFile));
      assert.deepEqual(actual, geometries[item.sourceIndex], `Browser geometry: ${item.id}`);
      report.geometry.push(item.id);
    }
    await measurePage.close();
    console.log(`Bundle parity: ${report.bundleCases}; browser geometry: ${report.geometry.length}; native history: 150 cycles passed`);

    async function convert(html, name) {
      await editor.fill(html);
      await page.locator("#editor-convert-button").click();
      assert.equal(await repair.isDisabled(), true);
      await page.locator("#editor-download-link").waitFor({ state: "visible", timeout: 60000 });
      const pending = page.waitForEvent("download");
      await page.locator("#editor-download-link").click();
      const download = await pending;
      const file = path.join(output, `${name}.zip`);
      await download.saveAs(file);
      const archive = await JSZip.loadAsync(await fs.readFile(file), { checkCRC32: true });
      const slides = [];
      for (const pptxFile of Object.values(archive.files).filter(f => /\.pptx$/.test(f.name))) {
        const pptx = await JSZip.loadAsync(await pptxFile.async("nodebuffer"), { checkCRC32: true });
        for (const xml of Object.values(pptx.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f.name)).sort((a,b) => a.name.localeCompare(b.name, "en", { numeric: true }))) slides.push(await xml.async("string"));
      }
      assert.ok(slides.length);
      report.downloads.push({ name, slides: slides.length, sha256: hash(await fs.readFile(file)) });
      return slides;
    }
    for (const [sourceIndex, original] of references.entries()) {
      const expected = await convert(original, `original-${sourceIndex + 1}`);
      const item = historyCases[sourceIndex + 1];
      await editor.fill(item.damaged);
      await repair.click();
      assert.equal(await editor.inputValue(), item.repaired);
      await page.frameLocator("#html-preview").locator("body").waitFor({ state: "visible" });
      const actual = await convert(await editor.inputValue(), `repaired-${item.id}`);
      assert.deepEqual(actual, expected, `Exact PPTX slide XML: ${item.id}`);
    }
    // Include the user's script-enabled conversion path without editing any JS.
    await page.locator("#editor-execute-scripts").check();
    const scriptedOriginal = await convert(references[1], "original-2-scripts");
    const scriptedRepair = await convert(historyCases[2].repaired, "repaired-2-scripts");
    assert.deepEqual(scriptedRepair, scriptedOriginal, "Script-enabled PPTX slide XML");
    await page.locator("#editor-execute-scripts").uncheck();

    for (const appearance of ["standard", "8bit"]) {
      await page.locator("#open-settings-button").click();
      await page.locator(`input[name="appearance"][value="${appearance}"]`).check();
      await page.keyboard.press("Escape");
      for (const theme of ["light", "dark"]) {
        await page.locator(`.theme-switch label:has(input[value="${theme}"])`).click();
        for (const [width, height] of [[1920, 1080], [1280, 720], [390, 844]]) {
          await page.setViewportSize({ width, height });
          await editor.fill(historyCases[1].damaged);
          await repair.click();
          const layout = await page.evaluate(() => ({
            width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight,
            controls: ["repair-html-button", "repair-report", "html-editor", "editor-convert-button"].map(id => { const r = document.getElementById(id).getBoundingClientRect(); return { id, x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom }; })
          }));
          assert.ok(layout.scrollWidth <= width, "No horizontal overflow");
          if (width > 390) {
            assert.ok(layout.scrollHeight <= height, "No desktop page scroll");
            for (const r of layout.controls) assert.ok(r.x >= 0 && r.y >= 0 && r.right <= width && r.bottom <= height && r.height > 0, `Repair control visible: ${JSON.stringify(r)}`);
          }
          report.layouts.push({ appearance, theme, ...layout });
          if (width === 1920) await page.screenshot({ path: path.join(output, `repair-${appearance}-${theme}.png`) });
        }
      }
    }
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } finally {
    await fs.writeFile(path.join(output, "browser-report.json"), JSON.stringify(report, null, 2));
    await browser.close();
  }
  console.log(JSON.stringify({ passed: report.passed, history: report.history, geometry: report.geometry.length, downloads: report.downloads, layouts: report.layouts.length, errors: report.errors }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
