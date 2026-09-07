"use strict";
// Set NODE_PATH to the bundled Playwright packages; pass a GUI-subsystem EXE.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");
const { chromium } = require("playwright");
const JSZip = require("jszip");
const out = path.resolve(process.env.STARTUP_OUTPUT_DIR || ".tmp/startup-acceptance");
const report = { checks: [], layouts: [], errors: [] };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  await fs.mkdir(out, { recursive: true });
  const runDirectory = await fs.mkdtemp(path.join(out, "run-"));
  const config = path.join(runDirectory, "設定.json");
  const exe = path.resolve(process.argv[2]);
  const binary = await fs.readFile(exe);
  const pe = binary.readUInt32LE(0x3c);
  assert.equal(binary.readUInt16LE(pe + 24 + 68), 2, "Windows GUI subsystem");
  report.checks.push("EXE has Windows GUI subsystem");
  const proc = spawn(exe, ["--config", config], { cwd: os.tmpdir(), windowsHide: true, stdio: "ignore", env: {...process.env, HTMLTOPPTX_NO_BROWSER:"1"} });
  let info;
  for (let i = 0; i < 100; i++) {
    try { info = JSON.parse(await fs.readFile(config + ".runtime.json", "utf8")); break; } catch (_) { await sleep(50); }
  }
  assert.ok(info, "application started from unrelated working directory");
  const browser = await chromium.launch({ channel: "msedge" });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on("pageerror", err => report.errors.push(err.message));
    await page.goto(info.controlURL + "/#admin=" + info.token);
    await page.waitForFunction(() => !document.getElementById("startup-settings").hidden);
    assert.ok(!page.url().includes(info.token), "capability removed from address bar");
    await page.locator("#open-settings-button").click();
    assert.equal(await page.locator('input[name="startup-mode"]:checked').inputValue(), "standalone");
    assert.equal(await page.locator("#standalone-auto").isChecked(), true);
    await page.locator('input[name="startup-mode"][value="web"]').check();
    assert.equal(await page.locator("#web-port").inputValue(), "8080");
    await page.locator("#web-port").fill("0");
    await page.locator("#save-startup").click();
    assert.equal(await page.locator("#web-port").evaluate(el => el.validity.valid), false);
    await page.locator("#web-port").fill("18080");
    await page.locator("#save-startup").click();
    await page.waitForFunction(() => document.getElementById("startup-result").textContent.startsWith("保存しました"));
    const saved = JSON.parse(await fs.readFile(config, "utf8"));
    assert.equal(saved.mode, "web"); assert.equal(saved.webPort, 18080);
    assert.equal(JSON.parse(await fs.readFile(config+".runtime.json", "utf8")).mode, "standalone");
    report.checks.push("settings persist; current mode remains standalone; invalid fixed port rejected");
    for (const [width,height] of [[1440,900],[1280,720],[390,844]]) {
      await page.setViewportSize({width,height});
      for (const appearance of ["standard","8bit"]) {
        await page.locator(`input[name="appearance"][value="${appearance}"]`).check();
        await page.locator("#save-startup").scrollIntoViewIfNeeded();
        const bounds = await page.locator("#theme-settings").evaluate(el => { const r=el.getBoundingClientRect(); return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,sw:el.scrollWidth,cw:el.clientWidth}; });
        assert.ok(bounds.left>=0 && bounds.right<=width+1 && bounds.top>=0 && bounds.bottom<=height+1, JSON.stringify(bounds));
        assert.ok(bounds.sw<=bounds.cw+1, "dialog horizontal overflow");
        await page.screenshot({path:path.join(out,`settings-${width}-${appearance}.png`)});
        report.layouts.push({width,height,appearance});
      }
    }
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#open-settings-button").evaluate(el => el===document.activeElement), true);
    await page.reload();
    await page.locator("#open-settings-button").click();
    await page.waitForFunction(() => document.querySelector('input[name="startup-mode"]:checked').value==="web");
    report.checks.push("settings survive reload and dialog returns focus");
    await page.keyboard.press("Escape");
    await page.setViewportSize({width:1440,height:900});
    await page.locator("#open-editor-button").click();
    await page.locator("#html-editor").fill('<!doctype html><html><head><title>起動モード検証</title></head><body><section class="slide" style="width:1280px;height:720px"><h1>起動モード検証</h1></section></body></html>');
    await page.locator("#editor-convert-button").click();
    await page.locator("#editor-download-link").waitFor({state:"visible"});
    const event = page.waitForEvent("download");
    await page.locator("#editor-download-link").click();
    const download = await event;
    const zipPath=path.join(out,"startup-smoke.zip"); await download.saveAs(zipPath);
    const zip=await JSZip.loadAsync(await fs.readFile(zipPath));
    assert.ok(Object.keys(zip.files).some(name=>name.endsWith(".pptx")));
    report.checks.push("real editor conversion ZIP download");
    const guest=await browser.newPage(); await guest.goto(info.url);
    await guest.locator("#open-settings-button").click();
    assert.equal(await guest.locator("#startup-settings").isHidden(), true);
    assert.equal((await guest.request.get(info.controlURL+"/api/startup")).status(),403);
    report.checks.push("ordinary browser has no administration capability");
    assert.deepEqual(report.errors,[]);
  } finally {
    await browser.close();
    if (info) await fetch(info.controlURL+"/api/stop",{method:"POST",headers:{"X-App-Token":info.token}}).catch(()=>{});
    await sleep(300); proc.kill();
    await fs.writeFile(path.join(out,"verification.json"),JSON.stringify(report,null,2));
  }
  console.log(JSON.stringify(report));
})().catch(err=>{console.error(err);process.exitCode=1;});
