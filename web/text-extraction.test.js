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

test("negative-z decorations stay behind content within their own stacking context", () => {
  const fixture = scene();
  const background = { backgroundColor: "rgb(0, 0, 0)" };
  const decoration = fixture.element("SPAN", [20, 20, 100, 100], { ...background, position: "absolute", zIndex: "-1" });
  const card = fixture.element("DIV", [40, 40, 100, 100], background);
  const nestedDecoration = fixture.element("SPAN", [80, 80, 100, 100], { ...background, position: "absolute", zIndex: "-2" });
  const nestedContext = fixture.element("DIV", [60, 60, 200, 200], { ...background, isolation: "isolate" }, [nestedDecoration]);
  fixture.root.childNodes.push(card, nestedContext, decoration);
  for (const child of fixture.root.children) child.parentElement = fixture.root;
  const shapes = extract(fixture).shapes;
  assert.deepEqual(Array.from(shapes, (shape) => Math.round(shape.x * 96)), [20, 40, 60, 80]);
});

test("uniform rounded borders remain one outline despite slight A4 axis scaling differences", () => {
  const fixture = scene(1, "a4-portrait");
  fixture.root.getBoundingClientRect = () => rect(0, 0, 793.6875, 1122.515625);
  const style = { backgroundColor: "rgb(0, 0, 0)" };
  for (const side of ["Top", "Right", "Bottom", "Left"]) {
    style[`border${side}Width`] = "3px";
    style[`border${side}Style`] = "solid";
    style[`border${side}Color`] = "rgb(0, 0, 0)";
  }
  for (const corner of ["TopLeft", "TopRight", "BottomRight", "BottomLeft"]) style[`border${corner}Radius`] = "24px";
  fixture.root.childNodes.push(fixture.element("DIV", [96, 80, 640, 160], style));
  const shapes = extract(fixture, "a4-portrait").shapes;
  assert.equal(shapes.length, 1);
  assert.equal(shapes[0].rounded, true);
  close(shapes[0].rectRadius, 0.25);
  assert.ok(shapes[0].lineWidth > 2.2 && shapes[0].lineWidth < 2.3);
});

test("partly off-page rounded decoration clips its contour without becoming a rectangle", () => {
  const fixture = scene();
  const style = { backgroundColor: "rgb(0, 0, 0)", borderTopLeftRadius: "0", borderTopRightRadius: "58%", borderBottomRightRadius: "45%", borderBottomLeftRadius: "0" };
  fixture.root.childNodes.push(fixture.element("SPAN", [-100, 600, 300, 240], style));
  const [shape] = extract(fixture).shapes;
  assert.equal(shape.kind, "custom");
  assert.ok(shape.points.length > 10);
  assert.deepEqual(Object.keys(shape.points.at(-1)), ["close"]);
  const points = shape.points.slice(0, -1);
  for (const point of points) {
    assert.ok(point.x >= -1e-8 && point.x <= shape.w + 1e-8);
    assert.ok(point.y >= -1e-8 && point.y <= shape.h + 1e-8);
  }
  assert.ok(!points.some((point) => Math.abs(point.x - shape.w) < 1e-8 && Math.abs(point.y) < 1e-8));
  const emptyCorner = scene();
  const circle = { backgroundColor: "rgb(0, 0, 0)" };
  for (const corner of ["TopLeft", "TopRight", "BottomRight", "BottomLeft"]) circle[`border${corner}Radius`] = "50%";
  emptyCorner.root.childNodes.push(emptyCorner.element("SPAN", [-190, -190, 200, 200], circle));
  assert.equal(extract(emptyCorner).shapes.length, 0);
});

test("an absolute checkbox does not steal the line box from a bold-only list item", () => {
  const fixture = scene();
  const checkbox = fixture.element("SPAN", [76, 84, 14, 14], { position: "absolute" }, []);
  const bold = fixture.element("B", [96, 92, 224, 28], {
    display: "inline", fontWeight: "700"
  }, [fixture.text("機密情報を含まない", 96, 92, 28)]);
  const li = fixture.element("LI", [96, 80, 640, 40], {}, [checkbox, bold]);
  fixture.root.childNodes.push(li);
  const [item] = extract(fixture).texts;
  assert.equal(item.text, "機密情報を含まない");
  close(item.y, 80 / 96);
  close(item.h, 40 / 96);
  assert.ok(item.h * 72 + 1e-6 >= item.lineSpacing);
  assert.equal(item.runs[0].options.bold, true);
});

test("inline-block badges retain padding while adjacent wrapped text uses its measured positions", () => {
  const fixture = scene();
  const badge = fixture.element("SPAN", [96, 80, 84, 40], {
    display: "inline-block", paddingLeft: "10px", paddingRight: "10px"
  }, [fixture.text("不可", 106, 84)]);
  const emphasis = fixture.element("B", [212, 84, 64, 32], {
    display: "inline", fontWeight: "700"
  }, [fixture.text("本文", 212, 84)]);
  fixture.paragraph([badge, emphasis, fixture.text("続き", 276, 84), fixture.text("次行", 96, 124)]);
  const items = extract(fixture).texts;
  assert.equal(items.length, 3);
  const label = items.find((item) => item.text === "不可");
  const first = items.find((item) => item.text === "本文続き");
  const second = items.find((item) => item.text === "次行");
  close(label.x, 106 / 96);
  close(first.x, 212 / 96);
  close(second.x, 96 / 96);
  close(second.y - first.y, 40 / 96);
  assert.ok(first.h * 72 + 1e-6 >= first.lineSpacing);
  assert.equal(first.runs[0].options.bold, true);
  assert.equal(first.runs[1].options.bold, false);
});

test("fixed-width metadata and table badges are not flattened into surrounding text", () => {
  const fixture = scene();
  const label = fixture.element("B", [96, 80, 192, 40], {
    display: "inline-block", fontWeight: "700"
  }, [fixture.text("対象", 96, 84)]);
  fixture.paragraph([label, fixture.text("全職員", 288, 84)]);
  const badge = fixture.element("SPAN", [106, 290, 180, 40], {
    display: "inline-block", paddingLeft: "10px", paddingRight: "10px"
  }, [fixture.text("機密性3A", 116, 294)]);
  const td = fixture.element("TD", [96, 280, 240, 60], {
    paddingLeft: "10px", paddingTop: "10px"
  }, [badge]);
  fixture.root.childNodes.push(td);
  const items = extract(fixture).texts;
  assert.equal(items.length, 3);
  close(items.find((item) => item.text === "全職員").x, 288 / 96);
  close(items.find((item) => item.text === "機密性3A").x, 116 / 96);
});

test("CSS text-box trimming keeps readable font size inside a full PowerPoint line box", () => {
  const fixture = scene();
  const p = fixture.element("P", [96, 96, 480, 20], {
    textBoxTrim: "trim-both", paddingTop: "4px", paddingBottom: "4px"
  }, [fixture.text("香南市からのお知らせ", 96, 88)]);
  fixture.root.childNodes.push(p);
  const [item] = extract(fixture).texts;
  close(item.fontSize, 24);
  close(item.h, 40 / 96);
  close(item.y, 84 / 96);
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
