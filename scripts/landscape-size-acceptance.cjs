"use strict";
// NODE_PATH=<bundled Playwright packages> node scripts/landscape-size-acceptance.cjs <built-app URL>
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");
const JSZip = require("jszip");
const core = require("../web/converter-core.js");
const out = path.resolve(process.env.LANDSCAPE_OUTPUT_DIR || ".tmp/landscape-size-acceptance");
const report = { checks: [], downloads: [], layouts: [], errors: [], externalRequests: [] };
const source = (ids, title = "サイズ確認") => `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
body{margin:0}.slide{position:relative;box-sizing:border-box;background:#f2e1c0;color:#182333;overflow:hidden}
.wide{width:1280px;height:720px}.landscape{width:297mm;height:210mm}.portrait{width:210mm;height:297mm}
h1{position:absolute;left:60px;top:50px;margin:0;font:32px/1.5 'Yu Gothic UI'}
p{position:absolute;left:60px;top:130px;margin:0;font:24px/36px 'Yu Gothic UI';letter-spacing:1px}
.box{position:absolute;left:60px;top:220px;width:320px;height:140px;background:#196a75;border:3px solid #182333;border-radius:24px}
.circle{position:absolute;left:440px;top:220px;width:140px;height:140px;border-radius:50%;background:#c56740}
img{position:absolute;left:640px;top:220px;width:140px;height:140px}
</style></head><body>${ids.map((id, index) => `<section class="slide ${id}"><h1>PAGE ${index + 1} ${id}</h1><p>編集できる文字 <b>太字</b><br>比率と配置を確認</p><div class="box"></div><div class="circle"></div><img alt="三角形" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAACBUlEQVR4nO3aQVYCMRCE4YFj1BXZcwj3XtFrxIU+BGFCeibdXZlULdwm+fkWPvRUSln4hsv16/NjIds5+wIjjTEWLtfbT6oxxqIdXSzcgWLDRReLeVyx8ESJChdXLPIRxcIKIh5cRLH4xxILVT4kuFhiDTGKWGiAw4CLItYoy4+FZjLpuPJjDbTkWDBiycUlWYPEwiYmibgka4RY2AEkC5dk0cfCbhopuCSLOxY6oYjHJVnEsdCVQzAuyWKNBQcIkbgkizIW3AiE4ZIsvlhw/vBjcEkWWSyEfOwBp0gWUywE/h7kfZZk0cRC+BcDridKFkcsJH1T7neuZBHEQuqfjp1Ol6zsWMj+dxenO0hWaiwQsHK6iWTlxQINK4/7SFZSLJCx6n4rycqIBUpWfe8mWeGxQMyq4w0lKzYW6Fn1uqdkBcbCIKy63FayomJhKFb77yxZIbEwIKudN5cs/1gYltWe+0uWcywMzmrzKyTLMxYOwWrbWyTLLRYOxGrDiyRrcYmFw7GyvkuyDDtPzsr0OskyrCnWsVm1v1GyDHsfawZWjS+VLMPexJqHVct7JcuwWqzZWL19tWQZthprTlb1t0uWYa9jzcyqUkCyDHsRS6zWOkiWYf9jiVWlhmQZ9hBLrJ5330SyDPuLJVZru5WRLMN+Y4lVfT99JMuwUylFrBonWUv7vgGNfWjcxCNg4gAAAABJRU5ErkJggg=="></section>`).join("")}</body></html>`;
const mixed = source(["wide", "landscape", "portrait", "wide", "landscape"]);
const landscapeOnly = source(["landscape", "wide", "landscape"]);
const near = (a, b, tolerance = 2) => assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);

(async () => {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ channel: "msedge" });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.setDefaultTimeout(15000);
    page.on("pageerror", error => report.errors.push(error.message));
    page.on("request", request => {
      if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== new URL(process.argv[2]).origin) report.externalRequests.push(request.url());
    });
    let workerCount = 0;
    page.on("worker", () => workerCount++);
    await page.goto(process.argv[2]);
    await page.locator("#open-editor-button").click();
    const dialog = page.locator("#landscape-size-dialog");
    const checkbox = page.locator("#unify-landscape");
    const start = async html => {
      await page.locator("#html-editor").fill(html);
      await page.locator("#editor-convert-button").click();
    };
    const decide = async consent => {
      await dialog.waitFor({ state: "visible" });
      assert.equal(await checkbox.isChecked(), false, "consent resets for each HTML");
      assert.equal(await page.locator("#editor-download-link").isVisible(), false);
      await checkbox.setChecked(consent);
      await dialog.getByRole("button", { name: "続行", exact: true }).click();
    };
    const save = async (id, expected, prefix = "editor-") => {
      const link = page.locator(`#${prefix}download-link`);
      await link.waitFor({ state: "visible", timeout: 60000 }).catch(async error => {
        console.error(await page.locator(`#${prefix}progress-card`).innerText(), report.errors);
        throw error;
      });
      const pending = page.waitForEvent("download");
      await link.click();
      const download = await pending;
      const dir = path.join(out, id);
      await fs.mkdir(dir, { recursive: true });
      const zipPath = path.join(dir, download.suggestedFilename());
      await download.saveAs(zipPath);
      const zip = await JSZip.loadAsync(await fs.readFile(zipPath), { checkCRC32: true });
      const names = Object.keys(zip.files).filter(name => name.endsWith(".pptx"));
      assert.deepEqual(names, expected);
      const decks = [];
      for (const name of names) {
        const bytes = await zip.file(name).async("nodebuffer");
        await fs.writeFile(path.join(dir, name), bytes);
        const archive = await JSZip.loadAsync(bytes, { checkCRC32: true });
        const slidePaths = Object.keys(archive.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a, b) => Number(a.match(/slide(\d+)/)[1]) - Number(b.match(/slide(\d+)/)[1]));
        const slides = await Promise.all(slidePaths.map(name => archive.file(name).async("string")));
        const presentation = await archive.file("ppt/presentation.xml").async("string");
        decks.push({ name, slides, presentation });
      }
      report.downloads.push({ id, names, counts: decks.map(deck => deck.slides.length) });
      return decks;
    };

    // Cancellation also applies to the complete file batch; generation has not begun.
    await start(mixed);
    await dialog.waitFor({ state: "visible" });
    assert.equal(workerCount, 0);
    assert.equal(await checkbox.isChecked(), false);
    assert.match(await dialog.innerText(), /元のHTMLでページサイズを揃えることをおすすめ/);
    assert.match(await dialog.innerText(), /チェックせずに続行すると、元のサイズ別/);
    assert.equal(await page.evaluate(() => document.activeElement.id), "unify-landscape");
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
      // Native Edge dialogs may give browser chrome focus between Tab cycles
      // (reported as BODY); background controls must remain inert.
      assert.equal(await page.evaluate(() => document.activeElement === document.body || !!document.activeElement.closest("#landscape-size-dialog")), true);
    }
    await page.locator("#html-editor").evaluate(el => el.focus());
    assert.notEqual(await page.evaluate(() => document.activeElement.id), "html-editor");
    for (const appearance of ["standard", "8bit"]) for (const theme of ["light", "dark"]) for (const [width, height] of [[1440, 900], [390, 844]]) {
      await page.evaluate(({ appearance, theme }) => {
        document.documentElement.dataset.appearance = appearance;
        document.documentElement.dataset.theme = theme;
      }, { appearance, theme });
      await page.setViewportSize({ width, height });
      const bounds = await dialog.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= width + 1 && bounds.y + bounds.height <= height + 1);
      assert.equal(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth), true);
      await dialog.screenshot({ path: path.join(out, `dialog-${appearance}-${theme}-${width}.png`) });
      report.layouts.push({ appearance, theme, width, height });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await checkbox.check();
    await dialog.getByRole("button", { name: "キャンセル", exact: true }).click();
    await page.waitForFunction(() => !document.getElementById("editor-convert-button").disabled);
    assert.equal(await page.locator("#html-editor").inputValue(), mixed);
    assert.equal(await page.evaluate(() => document.activeElement.id), "editor-convert-button");
    assert.equal(workerCount, 0);
    await start(mixed);
    await dialog.waitFor({ state: "visible" });
    assert.equal(await checkbox.isChecked(), false);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.getElementById("editor-convert-button").disabled);
    assert.equal(await page.locator("#editor-download-link").isVisible(), false);
    assert.equal(workerCount, 0);
    report.checks.push("unchecked default, consent text, focus trap, cancel/Escape, input retained, retry reset, no worker before decision");

    await start(mixed);
    await decide(false);
    const split = await save("split", ["サイズ確認-ワイド.pptx", "サイズ確認-A4横.pptx", "サイズ確認-A4縦.pptx"]);
    await start(mixed);
    await decide(true);
    const merged = await save("merged", ["サイズ確認-ワイド.pptx", "サイズ確認-A4縦.pptx"]);
    assert.deepEqual(merged.map(deck => deck.slides.length), [4, 1]);
    assert.match(merged[0].presentation, /<p:sldSz cx="12192000" cy="6858000"/);
    const normalize = xml => xml.replace(/name="Slide \d+"/, 'name="Slide"');
    assert.equal(normalize(split[0].slides[0]), normalize(merged[0].slides[0]));
    assert.equal(normalize(split[0].slides[1]), normalize(merged[0].slides[2]));
    assert.equal(split[2].slides[0], merged[1].slides[0]);
    assert.deepEqual(merged[0].slides.map(xml => xml.match(/PAGE (\d+)/)[1]), ["1", "2", "4", "5"]);
    // Compare the actual browser-extracted objects before and after fitting.
    const geometry = xml => [...xml.matchAll(/<a:xfrm[^>]*>\s*<a:off x="(\d+)" y="(\d+)"\/>\s*<a:ext cx="(\d+)" cy="(\d+)"\/>/g)].map(match => match.slice(1).map(Number));
    const oldGeometry = geometry(split[1].slides[0]).slice(1);
    const newGeometry = geometry(merged[0].slides[1]).slice(2); // root transform + added page background
    assert.equal(oldGeometry.length, newGeometry.length);
    const fit = core.layoutFit("a4-landscape", "wide");
    oldGeometry.forEach((old, index) => old.forEach((value, axis) => near(newGeometry[index][axis], value * fit.scale + (axis === 0 ? fit.x * 914400 : axis === 1 ? fit.y * 914400 : 0))));
    const fonts = xml => [...xml.matchAll(/\bsz="(\d+)"/g)].map(match => Number(match[1]));
    const oldFonts = fonts(split[1].slides[0]), newFonts = fonts(merged[0].slides[1]);
    assert.equal(oldFonts.length, newFonts.length);
    oldFonts.forEach((value, index) => near(newFonts[index], value * fit.scale, 1));
    assert.match(merged[0].slides[1], /<p:pic>/);
    assert.match(merged[0].slides[1], /<a:prstGeom prst="ellipse"/);
    assert.doesNotMatch(merged[0].slides[1], /<p:grpSp>/);
    report.checks.push("split/merged PPTX sizes, original page order, unchanged wide/portrait XML, proportional editable text/shapes/images");

    for (const [id, ids, names] of [
      ["wide", ["wide", "wide"], ["サイズ確認.pptx"]],
      ["a4", ["landscape", "landscape"], ["サイズ確認.pptx"]],
      ["orientations", ["portrait", "landscape"], ["サイズ確認-A4縦.pptx", "サイズ確認-A4横.pptx"]]
    ]) {
      await start(source(ids));
      await save(id, names);
      assert.equal(await dialog.isVisible(), false);
    }
    await start(landscapeOnly);
    await decide(true);
    await save("landscape-only-merged", ["サイズ確認.pptx"]);

    // Script-created pages are included in detection, after the script snapshot.
    const dynamic = source(["wide"]).replace("</body>", '<script>const p=document.querySelector(".slide").cloneNode(true);p.className="slide landscape";document.body.append(p)</script></body>');
    await page.locator("#editor-execute-scripts").check();
    await start(dynamic);
    await decide(false);
    await save("dynamic", ["サイズ確認-ワイド.pptx", "サイズ確認-A4横.pptx"]);
    await page.locator("#editor-execute-scripts").uncheck();

    await page.locator("#back-to-file-button").click();
    const uploads = ["資料1.html", "資料2.html"].map(name => ({ name, mimeType: "text/html", buffer: Buffer.from(landscapeOnly) }));
    await page.locator("#html-file").setInputFiles(uploads);
    await page.locator("#convert-button").click();
    await decide(true);
    await dialog.waitFor({ state: "visible" });
    assert.equal(await page.locator("#landscape-size-file").innerText(), "資料2.html");
    await decide(false);
    await save("batch-independent", ["資料1.pptx", "資料2-A4横.pptx", "資料2-ワイド.pptx"], "");
    await page.locator("#convert-button").click();
    await decide(true);
    await dialog.waitFor({ state: "visible" });
    const beforeCancel = workerCount;
    await dialog.getByRole("button", { name: "キャンセル", exact: true }).click();
    await page.waitForFunction(() => !document.getElementById("convert-button").disabled);
    assert.equal(await page.locator("#download-link").isVisible(), false);
    assert.equal(workerCount, beforeCancel);
    report.checks.push("no popup without mixed landscape, landscape-only naming, runtime page detection, separate consent per uploaded HTML, whole-batch cancellation");
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.externalRequests, []);
    await fs.writeFile(path.join(out, "verification.json"), JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify({ checks: report.checks, downloads: report.downloads.length, layouts: report.layouts.length, errors: report.errors }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
