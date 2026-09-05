"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const JSZip = require("jszip");
const PptxGenJS = require("pptxgenjs");
const core = require("./converter-core.js");

// Exercise the production extractor with deterministic browser measurements.
// The test-only export avoids adding a public/debug API to the converter UI.
const context = {
  HtmlToPptxCore: core,
  Blob,
  document: { getElementById: () => ({ value: "", addEventListener() {} }) },
  window: { addEventListener() {} }
};
const appSource = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
vm.runInNewContext(appSource.replace(/\}\)\(\);\s*$/, "globalThis.extractSlideForTest = extractSlide;\n})();"), context);

function rect(left, top, width, height) {
  return { left, top, width, height, right: left + width, bottom: top + height };
}

function scene(factor = 1, layoutId = "wide") {
  const layout = core.presentationLayout(layoutId);
  const view = {
    Node: { ELEMENT_NODE: 1, TEXT_NODE: 3 },
    getComputedStyle: (element) => element.style
  };
  const document = {
    defaultView: view,
    createRange() {
      let node;
      let offset;
      return {
        setStart(value, index) { node = value; offset = index; },
        setEnd() {},
        getClientRects: () => node.rects[offset] ? [node.rects[offset]] : []
      };
    },
    createElement() {
      const canvasContext = {
        clearRect() {}, fillRect() {},
        getImageData() { return { data: [0, 0, 0, this.fillStyle === "transparent" ? 0 : 255] }; }
      };
      return { getContext: () => canvasContext };
    }
  };
  function element(tag, bounds, style = {}, children = []) {
    const result = {
      nodeType: 1, tagName: tag, ownerDocument: document, childNodes: children,
      style: {
        display: "block", visibility: "visible", opacity: "1", direction: "ltr",
        fontFamily: "Meiryo", fontSize: `${32 * factor}px`, fontWeight: "400",
        fontStyle: "normal", textDecorationLine: "none", lineHeight: `${40 * factor}px`,
        letterSpacing: `${2 * factor}px`, whiteSpace: "normal", textAlign: "left",
        backgroundColor: "transparent", color: "rgb(0, 0, 0)", ...style
      },
      get children() { return this.childNodes.filter((node) => node.nodeType === 1); },
      getBoundingClientRect: () => rect(...bounds.map((value) => value * factor)),
      closest: () => null,
      getAttribute: () => null,
      querySelectorAll() { return this.children.flatMap((child) => [child, ...child.querySelectorAll()]); }
    };
    children.forEach((node) => { node.parentElement = result; });
    return result;
  }
  function text(value, left, top, size = 32) {
    return {
      nodeType: 3, textContent: value, ownerDocument: document,
      rects: Array.from(value, (_, index) => rect((left + index * size) * factor, top * factor, size * factor, size * factor))
    };
  }
  const root = element("SECTION", [0, 0, layout.width * 96, layout.height * 96]);
  function paragraph(children, style = {}) {
    const p = element("P", [96, 80, 640, 160], style, children);
    root.childNodes.push(p);
    p.parentElement = root;
    return p;
  }
  return { root, text, element, paragraph };
}

function extract(fixture, layout = "wide") {
  return context.extractSlideForTest(fixture.root, layout);
}

function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 0.0001, `${actual} should equal ${expected}`);
}

test("equivalent HTML at different resolutions keeps text and box proportions in every page layout", () => {
  for (const layout of ["wide", "a4-portrait", "a4-landscape"]) {
    let reference;
    for (const factor of [0.5, 1, 1.5, 2]) {
      const fixture = scene(factor, layout);
      fixture.paragraph([fixture.text("日本語の見出し", 96, 100)]);
      const item = extract(fixture, layout).texts[0];
      close(item.fontSize, 24);
      close(item.lineSpacing, 30);
      close(item.charSpacing, 1.5);
      close(item.runs[0].options.fontSize, 24);
      close(item.runs[0].options.charSpacing, 1.5);
      if (reference) {
        for (const key of ["x", "y", "w", "h"]) close(item[key], reference[key]);
      }
      reference = item;
    }
  }
});

test("mixed inline font sizes remain on one line and real wrapping stays intact", () => {
  const fixture = scene();
  const emphasis = fixture.element("STRONG", [160, 88, 96, 48], {
    display: "inline", fontSize: "48px", fontWeight: "700", letterSpacing: "-1px"
  }, [fixture.text("強調", 160, 88, 48)]);
  fixture.paragraph([
    fixture.text("通常", 96, 100), emphasis,
    fixture.text("続き", 256, 100), fixture.text("次行", 96, 140)
  ]);
  const item = extract(fixture).texts[0];
  assert.equal(item.text, "通常強調続き\n次行");
  assert.equal(item.runs.filter((run) => run.options.softBreakBefore).length, 1);
  const run = item.runs.find((entry) => entry.text === "強調");
  assert.equal(run.options.fontSize, 36);
  assert.equal(run.options.charSpacing, -0.75);
  assert.equal(run.options.bold, true);
});

test("explicit repeated breaks and preformatted newlines survive line measurement", () => {
  const fixture = scene();
  const br = () => fixture.element("BR", [0, 0, 0, 0], { display: "inline" });
  fixture.paragraph([fixture.text("前", 96, 100), br(), br(), fixture.text("後", 96, 100)]);
  fixture.paragraph([fixture.text("甲\n乙", 96, 100)], { whiteSpace: "pre-wrap" });
  const model = extract(fixture);
  assert.equal(model.texts[0].text, "前\n\n後");
  assert.equal(model.texts[1].text, "甲\n乙");
});

test("overlapping lines caused by tight line-height are recognized in both directions", () => {
  const previous = rect(160, 100, 32, 32);
  const next = rect(96, 116, 32, 32);
  assert.equal(core.startsNewRenderedLine(rect(96, 100, 96, 32), previous, next, "ltr"), true);
  assert.equal(core.startsNewRenderedLine(rect(96, 100, 96, 32), rect(96, 100, 32, 32), rect(160, 116, 32, 32), "rtl"), true);
  assert.equal(core.startsNewRenderedLine(previous, previous, rect(192, 100.4, 32, 32), "ltr"), false);
});

test("normal character spacing and automatic line-height are not turned into invalid numbers", () => {
  const metrics = core.textMetrics({ fontSize: "20px", letterSpacing: "normal", lineHeight: "normal" });
  close(metrics.fontSize, 15);
  assert.equal(metrics.charSpacing, 0);
  assert.equal(metrics.lineSpacing, undefined);
});

test("PPTX retains measured font sizes, line spacing and positive/negative letter spacing as editable text", async () => {
  const fixture = scene(2);
  const emphasis = fixture.element("STRONG", [160, 88, 96, 48], {
    display: "inline", fontSize: "96px", fontWeight: "700", letterSpacing: "-2px"
  }, [fixture.text("強調", 160, 88, 48)]);
  fixture.paragraph([fixture.text("通常", 96, 100), emphasis, fixture.text("次行", 96, 140)]);
  const item = extract(fixture).texts[0];
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.addSlide().addText(core.richTextContent(item), core.textOptions(item));
  const zip = await JSZip.loadAsync(await pptx.write({ outputType: "nodebuffer" }));
  const xml = await zip.file("ppt/slides/slide1.xml").async("string");
  assert.match(xml, /<a:spcPts val="3000"\/>/);
  assert.match(xml, /sz="2400"/);
  assert.match(xml, /sz="3600"/);
  assert.match(xml, /spc="150"/);
  assert.match(xml, /spc="-75"/);
  assert.equal((xml.match(/<a:br\/>/g) || []).length, 1);
  assert.match(xml, /<a:t>強調<\/a:t>/);
  assert.doesNotMatch(xml, /<p:pic>|<p:grpSp(?:\s|>)/);
});
