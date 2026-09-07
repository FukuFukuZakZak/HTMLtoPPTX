"use strict";
// NODE_PATH=<bundled Playwright packages> node scripts/filename-acceptance.cjs <built-app URL>
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");
const JSZip = require("jszip");
const out = path.resolve(process.env.FILENAME_OUTPUT_DIR || ".tmp/issue10");
const report = { downloads: [], checks: [], errors: [], network: [] };
const single = '<style>body{margin:0}.slide{width:1280px;height:720px;background:white}h1{margin:0;padding:60px}</style><section class="slide"><h1>業務説明資料</h1></section>';
const mixed = '<style>body{margin:0}.page{box-sizing:border-box;margin:20px;background:white}.portrait{width:210mm;height:297mm}.landscape{width:297mm;height:210mm}</style><div class="page portrait"><h1>A4縦</h1></div><div class="page landscape"><h1>A4横</h1></div>';
const html = (head, body = single) => `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;

(async () => {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ channel: "msedge" });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on("pageerror", error => report.errors.push(error.message));
    page.on("request", request => {
      if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== new URL(process.argv[2]).origin) report.network.push(request.url());
    });
    await page.goto(process.argv[2]);
    await page.locator("#open-editor-button").click();
    const convert = async (id, source, zipName, pptxNames, upload = false, scripts = false) => {
      if (upload) {
        await page.locator("#back-to-file-button").click();
        await page.locator('#html-file').setInputFiles({ name: "元ファイル.html", mimeType: "text/html", buffer: Buffer.from(source) });
      } else {
        await page.locator("#html-editor").fill(source);
        await page.locator("#editor-execute-scripts").setChecked(scripts);
      }
      const prefix = upload ? "" : "editor-";
      await page.locator(`#${prefix}convert-button`).click();
      await page.locator(`#${prefix}download-link`).waitFor({ state: "visible", timeout: 60000 });
      const pending = page.waitForEvent("download");
      await page.locator(`#${prefix}download-link`).click();
      const download = await pending;
      assert.equal(download.suggestedFilename(), zipName, id);
      const directory = path.join(out, id);
      await fs.mkdir(directory, { recursive: true });
      const target = path.join(directory, zipName);
      await download.saveAs(target);
      const zip = await JSZip.loadAsync(await fs.readFile(target), { checkCRC32: true });
      const names = Object.keys(zip.files).filter(name => name.endsWith(".pptx"));
      assert.deepEqual(names, pptxNames, id);
      const slides = [];
      for (const name of names) {
        const buffer = await zip.file(name).async("nodebuffer");
        // Write actual names to verify Windows extraction, including reserved names.
        await fs.writeFile(path.join(directory, name), buffer);
        const pptx = await JSZip.loadAsync(buffer, { checkCRC32: true });
        for (const file of Object.values(pptx.files).filter(file => /^ppt\/slides\/slide\d+\.xml$/.test(file.name))) slides.push(await file.async("string"));
      }
      if (!upload) assert.equal(await page.locator("#html-editor").inputValue(), source);
      report.downloads.push({ id, zipName, names, slides: slides.length });
      return slides;
    };
    const baseline = await convert("untitled", html(""), "貼り付けHTML.zip", ["貼り付けHTML.pptx"]);
    for (const [id, head, stem] of [
      ["japanese", "<title> 業務\n説明 &amp; 資料 </title>", "業務 説明 & 資料"],
      ["blank", "<title> \n </title>", "貼り付けHTML"],
      ["unsafe", "<title>資料:説明/確認?. </title>", "資料_説明_確認_"],
      ["reserved", "<title>CON.txt</title>", "_CON.txt"],
      ["long", `<title>${"😀".repeat(100)}</title>`, "😀".repeat(60)],
    ]) {
      assert.deepEqual(await convert(id, html(head), `${stem}.zip`, [`${stem}.pptx`]), baseline, `${id}: slide XML changed`);
    }
    const mixedSlides = await convert("mixed", html("<title>混在資料</title>", mixed), "混在資料.zip", ["混在資料-A4縦.pptx", "混在資料-A4横.pptx"]);
    assert.equal(mixedSlides.length, 2);
    const scriptHead = '<title>元タイトル</title><script>document.title="実行後タイトル"</script>';
    assert.deepEqual(await convert("scripts", html(scriptHead), "元タイトル.zip", ["元タイトル.pptx"], false, true), baseline);
    await page.screenshot({ path: path.join(out, "editor-result.png") });
    assert.deepEqual(await convert("file-upload", html("<title>別タイトル</title>"), "元ファイル.zip", ["元ファイル.pptx"], true), baseline);
    report.checks.push("title/fallback/safe/Unicode names saved and extracted", "title does not change slide XML or editor input", "mixed A4 suffixes retained", "script-mutated title does not rename output", "file-upload name unchanged");
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.network, []);
    await fs.writeFile(path.join(out, "verification.json"), JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify({ downloads: report.downloads.length, checks: report.checks, errors: report.errors, externalRequests: report.network.length }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
