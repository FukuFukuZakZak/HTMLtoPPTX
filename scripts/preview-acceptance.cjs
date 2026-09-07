"use strict";
// NODE_PATH=<bundled Playwright packages> node scripts/preview-acceptance.cjs <built-app URL>
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");
const JSZip = require("jszip");
const out = path.resolve(process.env.PREVIEW_OUTPUT_DIR || ".tmp/preview");
const report = { pages: [], layouts: [], checks: [], errors: [], network: [] };
const sample = `<!doctype html><html><head><style>body{margin:0}.slide{position:relative;width:1280px;height:720px;background:#fff;display:none;font:40px sans-serif}.slide:first-child{display:block}.corner{position:absolute;width:35px;height:35px;background:#e34e31}.tl{left:0;top:0}.tr{right:0;top:0}.bl{left:0;bottom:0}.br{right:0;bottom:0}h1{margin:0;padding:80px}</style></head><body>${[1,2,3].map(i=>`<section class="slide"><h1>確認ページ ${i}</h1><i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i></section>`).join("")}<script>document.body.dataset.executed='yes'</script></body></html>`;
const mixed = `<!doctype html><style>body{margin:0}.page{box-sizing:border-box;margin:20px;background:white;border:4px solid #267080}.portrait{width:210mm;height:297mm}.landscape{width:297mm;height:210mm}</style><div class="page portrait"><h1>A4縦</h1></div><div class="page landscape"><h1>A4横</h1></div>`;

(async () => {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ channel: "msedge" });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on("pageerror", error => report.errors.push(error.message));
    page.on("request", request => { if (/^https?:/.test(request.url()) && !request.url().startsWith(process.argv[2])) report.network.push(request.url()); });
    await page.goto(process.argv[2]);
    await page.locator("#open-editor-button").click();
    const load = async html => {
      const old = await page.locator("#html-preview").count() ? await page.locator("#html-preview").elementHandle() : null;
      await page.locator("#html-editor").fill(html);
      if (old) await page.waitForFunction(element => !element.isConnected, old);
      await page.waitForFunction(() => !document.getElementById("preview-fit").disabled);
    };
    const fits = async label => {
      const result = await page.evaluate(() => {
        const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { left:r.left, top:r.top, right:r.right, bottom:r.bottom, width:r.width, height:r.height }; };
        const doc = document.getElementById("html-preview").contentDocument;
        return { paper: rect("#preview-page"), surface: rect("#preview-surface"), viewport: [innerWidth,innerHeight], scale: document.getElementById("preview-percent").textContent, page: document.getElementById("preview-status").textContent,
          bounds: Array.from(doc.querySelectorAll(".slide,.page")).filter(e => getComputedStyle(e).display !== "none").map(e => { const r=e.getBoundingClientRect(); return {left:r.left,top:r.top,width:r.width,height:r.height}; }) };
      });
      assert.ok(result.paper.width > 0 && result.paper.height > 0, label);
      for (const side of ["left","top"]) assert.ok(result.paper[side] >= result.surface[side] - 1, `${label}: ${side} ${JSON.stringify(result)}`);
      for (const side of ["right","bottom"]) assert.ok(result.paper[side] <= result.surface[side] + 1, `${label}: ${side} ${JSON.stringify(result)}`);
      for (const r of result.bounds) assert.ok(Math.abs(r.left) < 1 && Math.abs(r.top) < 1, `${label}: page origin ${JSON.stringify(result)}`);
      report.pages.push({label,...result});
    };
    await load(sample);
    assert.equal(await page.locator("#preview-select option").count(), 3);
    assert.equal(await page.locator("#preview-previous").isDisabled(), true);
    await fits("static page 1");
    assert.equal(await page.locator("#html-preview").getAttribute("sandbox"), "allow-same-origin");
    assert.equal(await page.frameLocator("#html-preview").locator("script").count(), 0);
    assert.equal(await page.frameLocator("#html-preview").locator("body").getAttribute("data-executed"), null);
    await page.locator("#preview-next").click();
    await fits("static page 2");
    await page.locator("#preview-select").selectOption("2");
    await fits("static page 3");
    assert.equal(await page.locator("#preview-next").isDisabled(), true);
    await page.locator("#preview-surface").focus();
    await page.keyboard.press("Home");
    assert.equal(await page.locator("#preview-select").inputValue(), "0");
    await page.keyboard.press("PageDown");
    assert.equal(await page.locator("#preview-select").inputValue(), "1");
    for (let i=0;i<6;i++) await page.locator("#preview-plus").click();
    const before = await page.locator("#preview-page").boundingBox();
    const surface = await page.locator("#preview-surface").boundingBox();
    await page.mouse.move(surface.x+surface.width/2,surface.y+surface.height/2);
    await page.mouse.down();
    await page.mouse.move(surface.x+surface.width/2+90,surface.y+surface.height/2+60,{steps:8});
    await page.mouse.up();
    const after = await page.locator("#preview-page").boundingBox();
    assert.ok(after.x > before.x+70 && after.y > before.y+40,"drag pans both axes");
    assert.ok(!(await page.locator("#preview-surface").getAttribute("class")).includes("is-panning"));
    await page.keyboard.press("ArrowLeft");
    assert.ok((await page.locator("#preview-page").boundingBox()).x > after.x,"keyboard pans");
    await page.keyboard.press("0");
    await fits("reset after pan");
    assert.equal(await page.locator("#html-editor").inputValue(),sample);
    report.checks.push("page controls and direct selection; keyboard navigation, zoom and pan; pointer capture released; input unchanged");
    await page.locator("#preview-plus").click();
    const zoomBeforeResize = await page.locator("#preview-percent").textContent();
    await page.setViewportSize({width:1536,height:864});
    await page.waitForFunction(() => document.querySelector('#preview-surface').clientWidth > 700);
    assert.equal(await page.locator("#preview-percent").textContent(),zoomBeforeResize,"manual zoom survives resize");
    await page.locator("#preview-fit").click();

    for (const appearance of ["standard","8bit"]) {
      for (const theme of ["light","dark"]) {
        await page.evaluate(({appearance,theme})=>{document.documentElement.dataset.appearance=appearance;document.documentElement.dataset.theme=theme;},{appearance,theme});
        for (const [width,height] of [[1920,1080],[1536,864],[1280,720],[390,844]]) {
          await page.setViewportSize({width,height});
          await page.locator("#preview-fit").click();
          await fits(`${appearance}/${theme}/${width}`);
          const geometry=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,toolbar:document.querySelector('.preview-controls').getBoundingClientRect().toJSON()}));
          assert.ok(geometry.scrollWidth<=width,JSON.stringify(geometry));
          if(width>500) assert.ok(geometry.scrollHeight<=height,JSON.stringify(geometry));
          report.layouts.push({appearance,theme,...geometry});
        }
      }
    }
    await page.setViewportSize({width:1440,height:900});
    await page.evaluate(()=>{document.documentElement.dataset.appearance="standard";document.documentElement.dataset.theme="light";});
    await load(mixed);
    assert.equal(await page.locator("#preview-select option").count(),2);
    await fits("A4 portrait");
    await page.locator("#preview-next").click();
    await fits("A4 landscape");

    for (const name of (await fs.readdir("test-data")).filter(name=>name.endsWith(".html"))) {
      await load(await fs.readFile(path.join("test-data",name),"utf8"));
      const total=await page.locator("#preview-select option").count();
      for (let i=0;i<total;i++) { await page.locator("#preview-select").selectOption(String(i),{force:true}); await fits(`${name}/${i+1}`); }
      await page.locator("#preview-previous").click({force:true});
      await page.evaluate(()=>{window.scrollTo(0,0);document.getElementById('html-editor').scrollTop=0;});
      await page.screenshot({path:path.join(out,name.includes("スマホ")?"preview-a4.png":"preview-training.png")});
    }
    await load('<h1>通常のHTML</h1><p style="height:2000px">長い文書</p>');
    assert.match(await page.locator("#preview-status").textContent(),/文書全体/);
    await fits("unpaged document fallback");
    await load(sample);
    await page.locator("#html-editor").focus();
    await page.keyboard.press("Control+End");
    await page.keyboard.type("x");
    await page.keyboard.press("Control+z");
    assert.equal(await page.locator("#html-editor").inputValue(),sample);
    await page.keyboard.press("Control+y");
    assert.ok((await page.locator("#html-editor").inputValue()).endsWith("x"));
    await page.keyboard.press("Control+z");
    const damaged='<style>.slide{width:1280px;height:720px}</style><section class="slide"><div>補正確認';
    await load(damaged);
    await page.locator("#repair-html-button").click();
    await page.locator("#repair-report").waitFor({state:"visible"});
    assert.ok((await page.locator("#html-editor").inputValue()).includes("</section>"));
    await page.waitForFunction(()=>!document.getElementById("preview-fit").disabled);
    await fits("repaired HTML");
    await load('<meta http-equiv="refresh" content="0;url=https://example.invalid/"><section class="slide" style="width:1280px;height:720px" onclick="parent.__previewExecuted=true">制限確認</section><script>parent.__previewExecuted=true</script>');
    assert.equal(await page.frameLocator('#html-preview').locator('meta[http-equiv="refresh"]').count(),0);
    assert.equal(await page.evaluate(()=>window.__previewExecuted),undefined);
    await load(sample);
    report.checks.push("manual zoom survives resize; native Undo/Redo and repair update preview; script/refresh navigation stays blocked");
    await page.locator("#back-to-file-button").click();
    await page.locator("#open-editor-button").click();
    await page.waitForFunction(()=>!document.getElementById("preview-fit").disabled);
    await fits("return to editor");
    assert.equal(await page.locator("#html-editor").inputValue(),sample);

    const download = async name => {
      await page.locator("#editor-convert-button").click();
      await page.locator("#editor-download-link").waitFor({state:"visible",timeout:60000});
      const pending=page.waitForEvent("download");
      await page.locator("#editor-download-link").click();
      const file=await pending;
      const target=path.join(out,name);
      await file.saveAs(target);
      const zip=await JSZip.loadAsync(await fs.readFile(target));
      const pptx=await JSZip.loadAsync(await Object.values(zip.files).find(f=>f.name.endsWith('.pptx')).async('nodebuffer'));
      return Promise.all(Object.values(pptx.files).filter(f=>/^ppt\/slides\/slide\d+\.xml$/.test(f.name)).map(f=>f.async('string')));
    };
    const original=await download("before-preview-controls.zip");
    await page.locator("#preview-select").selectOption("2");
    for(let i=0;i<5;i++) await page.locator("#preview-plus").click();
    await page.locator("#preview-surface").focus();
    await page.keyboard.press("ArrowDown");
    assert.deepEqual(await download("after-preview-controls.zip"),original);
    report.checks.push("three-slide PPTX XML identical before/after page selection, zoom and pan");
    await page.locator("#preview-fit").click();
    await page.screenshot({path:path.join(out,"preview-controls.png")});
    await load(await fs.readFile('deliverables/Howtouse/操作練習.html','utf8'));
    await page.evaluate(()=>{window.scrollTo(0,0);document.getElementById('html-editor').scrollTop=0;});
    await page.screenshot({path:path.join(out,"manual-03-preview.png")});
    const marked=await page.locator('.preview-pane').boundingBox();
    await fs.writeFile(path.join(out,'manual-preview-mark.json'),JSON.stringify({selector:'.preview-pane',...marked},null,2));
    await page.locator("#html-editor").fill("");
    await page.waitForFunction(()=>document.getElementById("preview-fit").disabled);
    assert.equal(await page.locator("#preview-empty").isVisible(),true);
    assert.equal(await page.locator("#preview-next").isDisabled(),true);
    assert.deepEqual(report.errors,[]);
    assert.deepEqual(report.network,[]);
    report.checks.push("empty state resets; no page errors or external requests");
    console.log(JSON.stringify({pages:report.pages.length,layouts:report.layouts.length,checks:report.checks},null,2));
  } finally {
    await fs.writeFile(path.join(out,"verification.json"),JSON.stringify(report,null,2));
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
