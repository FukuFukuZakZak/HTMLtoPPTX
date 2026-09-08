"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const JSZip = require("jszip");
const core = require("./converter-core.js");

const pages = (...ids) => ids.map((layout, index) => ({ layout, slide: { background: "F2E1C0", shapes: [], images: [], texts: [{ text: `page ${index}`, x: 1, y: 1, w: 4, h: 1, fontSize: 24 }] } }));
const near = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

test("only differing landscape sizes require a decision", () => {
  for (const ids of [[], ["wide"], ["a4-landscape", "a4-landscape"], ["wide", "wide"], ["a4-portrait", "wide"], ["a4-portrait", "a4-landscape"]]) {
    assert.equal(core.hasMixedLandscapeSizes(pages(...ids)), false, ids.join(","));
  }
  assert.equal(core.hasMixedLandscapeSizes(pages("wide", "a4-landscape")), true);
  assert.equal(core.hasMixedLandscapeSizes(pages("a4-portrait", "a4-landscape", "wide")), true);
});

test("landscape grouping needs explicit consent, preserves source/order and separates portrait", () => {
  const input = pages("a4-landscape", "a4-portrait", "wide", "a4-landscape", "wide");
  const original = structuredClone(input);
  const split = core.groupSlidesByLayout(input);
  for (const consent of [false, undefined, null, "true", 1]) assert.deepEqual(core.groupSlidesByLayout(input, consent), split);
  assert.deepEqual(split.map(group => group.layout.id), ["a4-landscape", "a4-portrait", "wide"]);
  const merged = core.groupSlidesByLayout(input, true);
  assert.deepEqual(merged.map(group => group.layout.id), ["wide", "a4-portrait"]);
  assert.deepEqual(merged[0].slides.map(slide => slide.texts[0].text), ["page 0", "page 2", "page 3", "page 4"]);
  assert.equal(merged[0].slides[0].sourceLayout.id, "a4-landscape");
  assert.equal(merged[0].slides[1], input[2].slide);
  assert.equal(merged[1].slides[0], input[1].slide);
  assert.deepEqual(input, original);
});

test("proportional fitting scales geometry, typography, outlines, radii and local contours together", () => {
  const from = core.presentationLayout("a4-landscape");
  const to = core.presentationLayout("wide");
  const fit = core.layoutFit(from, to);
  near(fit.scale, 7.5 / (210 / 25.4));
  near(fit.y, 0);
  near(fit.x * 2 + from.width * fit.scale, to.width);
  const source = { x: 1, y: 2, w: 3, h: 4, fontSize: 24, lineSpacing: 36, charSpacing: -0.75, rectRadius: 0.2, line: { width: 2, color: "AABBCC" }, points: [{ x: 1, y: 2 }, { close: true }] };
  const saved = structuredClone(source);
  const result = core.fitPptxOptions(source, fit);
  near(result.x, fit.x + fit.scale);
  for (const key of ["y", "w", "h", "fontSize", "lineSpacing", "charSpacing", "rectRadius"]) near(result[key], source[key] * fit.scale);
  near(result.line.width, 2 * fit.scale);
  near(result.points[0].x, fit.scale);
  near(result.points[0].y, 2 * fit.scale);
  assert.deepEqual(result.points[1], { close: true });
  assert.deepEqual(source, saved);
  assert.equal(core.fitPptxOptions(source, core.layoutFit(to, to)), source);
});

test("real worker produces editable merged output and unchanged unaffected content", async () => {
  const messages = [];
  const context = { importScripts() {}, PptxGenJS: require("pptxgenjs"), JSZip, HtmlToPptxCore: core, setTimeout, self: { postMessage: message => messages.push(message) } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "converter-worker.js"), "utf8"), context);
  const input = pages("wide", "a4-landscape", "a4-portrait", "wide");
  input[1].slide.shapes = [
    { kind: "ellipse", x: 1, y: 2, w: 1, h: 1, color: "FF0000", lineColor: "000000", lineWidth: 2 },
    { kind: "custom", x: 3, y: 2, w: 2, h: 1, color: "008000", points: [{ x: 0, y: 0 }, { x: 2, y: 1 }, { x: 0, y: 1 }, { close: true }] },
    { rounded: true, rectRadius: 0.2, x: 1, y: 4, w: 2, h: 1, color: "FFFFFF" }
  ];
  input[1].slide.images = [{ data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XwV+AAAAAElFTkSuQmCC", x: 5, y: 2, w: 1, h: 1 }];
  input[1].slide.texts[0].runs = [{ text: "Editable", options: { fontSize: 24, charSpacing: -0.75, bold: true } }];
  input[1].slide.texts[0].lineSpacing = 36;
  const groups = [...core.groupSlidesByLayout(input), ...core.groupSlidesByLayout(input, true)];
  await context.self.onmessage({ data: { type: "convert-batch", presentations: groups.map((group, index) => ({ ...group, outputName: `${index}.pptx` })) } });
  assert.equal(messages.find(message => message.type === "error"), undefined);
  const zip = await JSZip.loadAsync(messages.find(message => message.type === "complete").buffer, { checkCRC32: true });
  const decks = await Promise.all(groups.map((_, index) => zip.file(`${index}.pptx`).async("nodebuffer").then(buffer => JSZip.loadAsync(buffer, { checkCRC32: true }))));
  const xml = (deck, index) => deck.file(`ppt/slides/slide${index}.xml`).async("string");
  assert.equal(await xml(decks[0], 1), await xml(decks[3], 1));
  assert.equal((await xml(decks[0], 2)).replace('name="Slide 2"', 'name="Slide 3"'), await xml(decks[3], 3));
  assert.equal(await xml(decks[2], 1), await xml(decks[4], 1));
  assert.match(await decks[3].file("ppt/presentation.xml").async("string"), /<p:sldSz cx="12192000" cy="6858000"/);
  const merged = await xml(decks[3], 2);
  assert.match(merged, /<a:t>Editable<\/a:t>/);
  assert.match(merged, /<p:pic>/);
  assert.match(merged, /<a:prstGeom prst="ellipse"/);
  assert.match(merged, /<a:custGeom>/);
  assert.doesNotMatch(merged, /<p:grpSp>/);
  const fit = core.layoutFit("a4-landscape", "wide");
  assert.match(merged, new RegExp(`sz="${Math.round(2400 * fit.scale)}"`));
  assert.match(merged, new RegExp(`<a:lnSpc><a:spcPts val="${Math.round(3600 * fit.scale)}"`));
  assert.match(merged, new RegExp(`<a:off x="${Math.round((fit.x + fit.scale) * 914400)}" y="${Math.round(2 * fit.scale * 914400)}"`));
  assert.match(merged, new RegExp(`<a:ln w="${Math.round(2 * fit.scale * 12700)}"`));
  assert.match(merged, /<a:srgbClr val="F2E1C0"/);
  assert.match(merged, /<a:gd name="adj" fmla="val 20000"/);
});
