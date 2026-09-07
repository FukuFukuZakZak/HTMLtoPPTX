const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const core = require("./converter-core.js");

test("editor names use the document head title and decode entities without evaluating HTML", async () => {
  const { editorInputFileName: name } = await import("../src/editor-filename.mjs");
  const cases = [
    ['<title> 業務\n説明 &amp; 資料 </title>', '業務 説明 & 資料.html'],
    ['<TITLE>日本語</TITLE><title>second</title>', '日本語.html'],
    ['<title>資料.html</title>', '資料.html.html'],
    ['<title> </title><title>second</title>', '貼り付けHTML.html'],
    ['<body><h1>本文</h1></body>', '貼り付けHTML.html'],
    ['<!-- <title>fake</title> --><script>throw new Error("<title>fake</title>")</script><title>本物</title>', '本物.html'],
    ['<svg><title>SVG title</title></svg>', '貼り付けHTML.html'],
    ['<template><title>template title</title></template><title>本物</title>', '本物.html'],
    ['<noscript><title>hidden</title></noscript><title>本物</title>', '本物.html'],
    ['<body><title>body title</title></body>', '貼り付けHTML.html'],
    ['<title>&lt;b&gt;文字&lt;/b&gt;</title>', '_b_文字__b_.html'],
    ['<title>...</title>', '貼り付けHTML.html'],
    ['<title>A:/B?*|&quot;&lt;&gt;\\C. </title>', 'A__B_______C.html'],
  ];
  // Check the shipped browser bundle against the same cases, without any DOM APIs.
  const context = vm.createContext({ atob });
  vm.runInContext(fs.readFileSync("web/html-repair.js", "utf8"), context);
  for (const [html, expected] of cases) {
    assert.equal(name(html), expected, html);
    assert.equal(context.HtmlRepair.editorInputFileName(html), expected, html);
    assert.equal(core.zipOutputFileName([expected]), expected.slice(0, -5) + ".zip");
    assert.equal(core.outputFileName(expected), expected.slice(0, -5) + ".pptx");
  }
});

test("editor names remain extractable for reserved and long Unicode titles", async () => {
  const { editorInputFileName: name } = await import("../src/editor-filename.mjs");
  for (const reserved of ["CON", "con.txt", "PRN", "AUX", "NUL", "COM1", "LPT9", "COM¹", "LPT².txt"]) {
    assert.equal(name(`<title>${reserved}</title>`), `_${reserved}.html`);
  }
  assert.equal(name('<title>CONference</title>'), "CONference.html");
  for (const character of ['資', '😀']) {
    const input = name(`<title>${character.repeat(300)}</title>`);
    assert.equal(input, character.repeat(60) + ".html");
    for (const layout of ['a4-portrait', 'a4-landscape', 'wide']) {
      const output = core.layoutOutputFileName(input, layout);
      assert.ok(Buffer.byteLength(output) <= 255, output);
      assert.ok(!output.includes('\uFFFD'));
    }
  }
});
