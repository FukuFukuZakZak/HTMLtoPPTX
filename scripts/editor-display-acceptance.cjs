"use strict";
// NODE_PATH=<bundled runtime modules> node scripts/editor-display-acceptance.cjs <EXE URL>
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");
const out = path.resolve(".tmp/issue11");
const report = { layouts: [], checks: [], errors: [], network: [] };
(async () => {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ channel: "msedge" });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on("pageerror", e => report.errors.push(e.message));
    page.on("request", r => { if (/^https?:/.test(r.url()) && !r.url().startsWith(process.argv[2])) report.network.push(r.url()); });
    const editor = page.locator("#html-editor");
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const open = async () => { await page.goto(process.argv[2]); await page.locator("#open-editor-button").click(); };
    await open();
    const source = ["<section>", ...Array.from({ length: 304 }, (_, i) => i === 299 ? "  <div>300行付近の補正対象😀" : i % 17 === 0 ? `  <!-- ${"長い折り返し日本語😀 abc\t".repeat(12)} -->` : i % 13 === 0 ? "" : `  <p>本文 ${i + 2}</p>`), "</section>", ""].join("\n");
    await editor.fill(source);
    await page.locator("#repair-html-button").click();
    const repaired = await editor.inputValue();
    assert.notEqual(repaired, source);
    await settle();
    const labels = await page.locator(".repair-location").allTextContents();
    assert.ok(labels.some(text => /301行目/.test(text)), labels.join());
    for (const appearance of ["standard", "8bit"]) {
      for (const theme of ["light", "dark"]) {
        for (const viewport of [{ width:1920,height:1080 },{ width:1280,height:720 }]) {
          await page.setViewportSize(viewport);
          await page.evaluate(({appearance,theme}) => { document.documentElement.dataset.appearance = appearance; document.documentElement.dataset.theme = theme; }, {appearance,theme});
          await page.locator(".repair-location").first().click();
          await settle();
          const geometry = await page.evaluate(() => {
            const input = document.getElementById("html-editor");
            const mirror = document.getElementById("editor-mirror");
            const numbers = Array.from(document.getElementById("editor-lines").children);
            const rows = Array.from(mirror.children);
            const top = input.getBoundingClientRect().top;
            return { count: rows.length, numbers: numbers.map(e => e.textContent), maxDelta: Math.max(...rows.map((e,i) => Math.abs(e.getBoundingClientRect().top - numbers[i].getBoundingClientRect().top))), heightDelta: Math.abs(input.scrollHeight - mirror.offsetHeight), markTop: mirror.querySelector("mark").getBoundingClientRect().top - top, inputHeight: input.clientHeight, scrollTop: input.scrollTop, selected: input.value.slice(input.selectionStart,input.selectionEnd), hidden: mirror.parentElement.getAttribute("aria-hidden"), pageOverflow: document.documentElement.scrollHeight - innerHeight };
          });
          assert.equal(geometry.count, repaired.split("\n").length);
          assert.equal(geometry.numbers[300], "301");
          assert.ok(geometry.maxDelta < 1, JSON.stringify(geometry));
          assert.ok(geometry.heightDelta < 2, JSON.stringify(geometry));
          assert.ok(geometry.markTop >= 0 && geometry.markTop < geometry.inputHeight, JSON.stringify(geometry));
          assert.equal(geometry.selected, "</div>");
          assert.equal(geometry.hidden, "true");
          assert.ok(geometry.pageOverflow <= 1, JSON.stringify(geometry));
          report.layouts.push({appearance,theme,...viewport,...geometry,numbers:undefined});
          await page.screenshot({ path: path.join(out, `${appearance}-${theme}-${viewport.width}.png`) });
        }
      }
    }
    // Scrolling both ways, EOF blank line and continuation rows remain aligned.
    for (const position of [0, 200, 1800, 1e9]) {
      await editor.evaluate((e,y) => {e.scrollTop=y;}, position);
      await settle();
      assert.ok(await page.evaluate(() => Math.abs(document.querySelector(".editor-source-line").getBoundingClientRect().top-document.querySelector("#editor-lines > div").getBoundingClientRect().top)<1));
    }
    await page.locator("#repair-html-button").click(); // No-op must preserve current highlights.
    assert.equal(await editor.inputValue(), repaired);
    assert.ok(await page.locator("#editor-mirror mark").count() > 0);
    // Fresh native paste history, selection/copy and composition via Chromium input protocol.
    await open();
    await editor.focus();
    const broken = "<section>\n  <div>日本語😀";
    await page.keyboard.insertText(broken);
    await page.locator("#repair-html-button").click();
    const fixed = await editor.inputValue();
    assert.equal(await page.locator("#editor-mirror mark").count(), 2);
    await page.locator(".repair-location").last().click();
    assert.equal(await editor.evaluate(e => e.value.slice(e.selectionStart,e.selectionEnd)), "</section>");
    for (let i=0;i<20;i++) {
      await page.keyboard.press("Control+z");
      assert.equal(await editor.inputValue(), broken);
      await settle();
      assert.equal(await page.locator("#editor-mirror mark").count(), 0);
      await page.keyboard.press("Control+y");
      assert.equal(await editor.inputValue(), fixed);
    }
    await page.keyboard.press("Control+z");
    await page.keyboard.press("Control+z");
    assert.equal(await editor.inputValue(), "");
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.imeSetComposition", {text:"にほんご",selectionStart:4,selectionEnd:4});
    assert.equal(await page.locator("#repair-html-button").isDisabled(), true);
    await cdp.send("Input.insertText", {text:"日本語"});
    assert.equal(await editor.inputValue(), "日本語");
    assert.equal(await page.locator("#repair-html-button").isEnabled(), true);
    await settle();
    assert.equal(await page.locator("#editor-mirror").textContent(), "日本語");
    await editor.fill('```html\n<section>\n  <div>本文\n```');
    await page.locator("#repair-html-button").click();
    assert.equal(await page.locator("#editor-mirror mark").count(),2);
    assert.match(await page.locator("#repair-report").textContent(), /コード枠を除去/);
    await page.locator(".repair-location").first().click();
    await page.keyboard.insertText("変更");
    await settle();
    assert.equal(await page.locator("#editor-mirror mark").count(),0);
    await editor.fill('<div><span>あいまい</div>');
    await page.locator("#repair-html-button").click();
    assert.equal(await editor.inputValue(),'<div><span>あいまい</div>');
    assert.equal(await page.locator("#editor-mirror mark").count(),0);
    for (const width of [1280, 1440]) {
      await page.setViewportSize({width,height:900});
      await editor.fill(`<section><div>${"長い本文😀\t".repeat(100)}\n\n`);
      await page.locator("#repair-html-button").click();
      await settle();
      assert.equal(await page.locator("#editor-mirror mark").count(),2);
      assert.ok(await editor.evaluate(e => Math.abs(e.scrollHeight-Math.max(e.clientHeight,document.getElementById("editor-mirror").offsetHeight))<2));
      await page.locator(".repair-location").last().click();
      assert.equal(await editor.evaluate(e=>e.value.slice(e.selectionStart,e.selectionEnd)),"</section>");
    }
    // Source-looking scripts/HTML remain text nodes in the host document.
    await editor.fill('<script>window.editorInjected=true</script>\n<img src="https://invalid.example/inject">');
    await settle();
    assert.equal(await page.evaluate(() => Boolean(window.editorInjected)),false);
    assert.equal(await page.locator("#editor-mirror script, #editor-mirror img").count(),0);
    await open();
    const long = Array.from({length:5000},(_,i)=>`<!-- ${i} ${"長い本文 ".repeat(10)} -->`).join("\n");
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.evaluate(text => navigator.clipboard.writeText(text), long);
    await editor.focus();
    const start = Date.now();
    await page.keyboard.press("Control+v");
    await settle();
    report.longInputMs = Date.now()-start;
    assert.equal(await editor.inputValue(),long);
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Control+c");
    assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g,"\n"),long);
    assert.equal(await page.locator("#editor-lines > div").count(),5000);
    assert.ok(report.longInputMs < 5000, `5000 lines took ${report.longInputMs}ms`);
    report.checks.push("307 logical lines with wrapping, tabs, blanks and EOF", "8 viewport/theme combinations and scroll alignment", "repair selection/navigation and inert highlights", "20 native undo/redo cycles and separate paste history", "Chromium Japanese composition/commit", "same-offset tags, fence removal, no-op, manual edit and warnings", "5000-line native clipboard paste/copy and responsiveness");
    assert.deepEqual(report.errors,[]);
    assert.deepEqual(report.network,[]);
    await fs.writeFile(path.join(out,"verification.json"), JSON.stringify(report,null,2));
    console.log(JSON.stringify({layouts:report.layouts.length,checks:report.checks,longInputMs:report.longInputMs,errors:report.errors}));
  } finally { await browser.close(); }
})().catch(e=>{console.error(e.message.slice(0,700));process.exitCode=1;});
