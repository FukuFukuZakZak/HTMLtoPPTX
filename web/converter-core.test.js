const test = require("node:test");
const assert = require("node:assert/strict");
const PptxGenJS = require("pptxgenjs");
const core = require("./converter-core.js");

test("HTML filename becomes a safe PPTX filename", () => {
  assert.equal(core.outputFileName("meeting.HTML"), "meeting.pptx");
  assert.equal(core.outputFileName("bad:name.html"), "bad_name.pptx");
  assert.equal(core.outputFileName(""), "presentation.pptx");
});

test("RGB colors are converted to PowerPoint hex colors", () => {
  assert.equal(core.hexColor("rgb(207, 85, 47)", "000000"), "CF552F");
  assert.equal(core.hexColor("transparent", "FFFFFF"), "FFFFFF");
});

test("RGBA alpha becomes PowerPoint transparency", () => {
  assert.deepEqual(core.colorOptions("rgba(207, 85, 47, 0.25)", "000000"), {
    color: "CF552F",
    transparency: 75
  });
});

test("shape options preserve editable fills and borders", () => {
  assert.deepEqual(core.shapeOptions({ kind: "rect", x: 1, y: 2, w: 3, h: 4, color: "rgba(47, 124, 128, 0.5)" }), {
    x: 1,
    y: 2,
    w: 3,
    h: 4,
    fill: { color: "2F7C80", transparency: 50 },
    line: { color: "FFFFFF", transparency: 100 }
  });
  assert.equal(core.shapeOptions({ kind: "line", color: "rgb(207, 85, 47)", width: 1.5, dashType: "dash" }).line.dashType, "dash");
  assert.deepEqual(core.shapeOptions({
    kind: "rect",
    color: "rgba(255, 255, 255, 0)",
    lineColor: "rgb(47, 124, 128)",
    lineWidth: 2
  }).line, { color: "2F7C80", transparency: 0, width: 2, dashType: "solid" });
});

test("PptxGenJS writes extracted fills and borders into OOXML", async () => {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  const slide = pptx.addSlide();
  slide.addShape(pptx.ShapeType.rect, core.shapeOptions({ kind: "rect", x: 1, y: 1, w: 3, h: 2, color: "rgba(47, 124, 128, 0.5)" }));
  slide.addShape(pptx.ShapeType.line, core.shapeOptions({ kind: "line", x: 1, y: 3, w: 3, h: 0, color: "rgb(207, 85, 47)", width: 1.5, dashType: "dash" }));

  const output = await pptx.write({ outputType: "nodebuffer" });
  const packageText = output.toString("latin1");
  assert.match(packageText, /2F7C80/);
  assert.match(packageText, /CF552F/);
  assert.match(packageText, /prstDash/);
});

test("slide validation preserves every slide in order", () => {
  const slides = core.validateSlides([
    { background: "rgb(255, 255, 255)", texts: [{ text: "one" }] },
    { background: "rgb(0, 0, 0)", texts: [{ text: "two" }] }
  ]);
  assert.equal(slides.length, 2);
  assert.equal(slides[0].texts[0].text, "one");
  assert.equal(slides[1].texts[0].text, "two");
  assert.deepEqual(slides[0].shapes, []);
});

test("an empty slide list gives an actionable error", () => {
  assert.throws(() => core.validateSlides([]), /\.slide 要素が見つかりません/);
});
