const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const JSZip = require("jszip");
const PptxGenJS = require("pptxgenjs");
const core = require("./converter-core.js");

test("HTML filename becomes a safe PPTX filename", () => {
  assert.equal(core.outputFileName("meeting.HTML"), "meeting.pptx");
  assert.equal(core.outputFileName("bad:name.html"), "bad_name.pptx");
  assert.equal(core.outputFileName(""), "presentation.pptx");
});

test("executable scripts are distinguished from static data scripts", () => {
  assert.equal(core.hasExecutableScripts("<script>document.body.append('menu')</script>"), true);
  assert.equal(core.hasExecutableScripts('<script type="">document.body.append("menu")</script>'), true);
  assert.equal(core.hasExecutableScripts("<script type=\"module\">document.body.append('chart')</script>"), true);
  assert.equal(core.hasExecutableScripts("<script type=\"application/ld+json\">{}</script>"), false);
  assert.equal(core.hasExecutableScripts("<main>static content</main>"), false);
});

test("the actual AI guideline training HTML is detected as dynamic content", (t) => {
  const fixture = path.join(__dirname, "..", "test-data", "香南市生成AIガイドライン研修_投影スライド案_文字多め版.html");
  if (!fs.existsSync(fixture)) {
    t.skip("user-owned test-data fixture is not present in this checkout");
    return;
  }
  const html = fs.readFileSync(fixture, "utf8");
  assert.equal(core.hasExecutableScripts(html), true);
  assert.match(html, /document\.querySelectorAll\('\[id\^="agenda-"\]'\)/);
});

test("PPTX filenames stay unique inside a case-insensitive ZIP", () => {
  assert.deepEqual(
    core.uniqueOutputFileNames(["meeting.html", "meeting.htm", "MEETING.HTML", "notes.html"]),
    ["meeting.pptx", "meeting (2).pptx", "MEETING (3).pptx", "notes.pptx"]
  );
});

test("mixed A4 layouts get orientation-specific unique PPTX filenames", () => {
  assert.equal(core.layoutOutputFileName("report.html", "a4-portrait"), "report-A4縦.pptx");
  assert.equal(core.layoutOutputFileName("report.html", "a4-landscape"), "report-A4横.pptx");
  assert.deepEqual(
    core.uniquePptxFileNames(["report-A4縦.pptx", "REPORT-A4縦.pptx", "report-A4横.pptx"]),
    ["report-A4縦.pptx", "REPORT-A4縦 (2).pptx", "report-A4横.pptx"]
  );
});

test("slides are grouped by page layout while preserving order", () => {
  const groups = core.groupSlidesByLayout([
    { layout: "a4-portrait", slide: { id: 1 } },
    { layout: "a4-landscape", slide: { id: 2 } },
    { layout: "a4-portrait", slide: { id: 3 } }
  ]);
  assert.deepEqual(groups.map((group) => group.layout.id), ["a4-portrait", "a4-landscape"]);
  assert.deepEqual(groups[0].slides.map((slide) => slide.id), [1, 3]);
  assert.deepEqual(groups[1].slides.map((slide) => slide.id), [2]);
});

test("ZIP filename describes single and multiple HTML batches", () => {
  assert.equal(core.zipOutputFileName(["meeting.html"]), "meeting.zip");
  assert.equal(core.zipOutputFileName(["one.html", "two.html"]), "html-to-pptx-2-files.zip");
  assert.equal(core.zipOutputFileName([]), "html-to-pptx-1-files.zip");
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

test("CSS line height becomes exact PowerPoint point spacing", () => {
  assert.equal(core.lineSpacingPoints("32px", 20), 24);
  assert.equal(core.lineSpacingPoints("150%", 20), 22.5);
  assert.equal(core.lineSpacingPoints("1.5", 20), 22.5);
  assert.equal(core.lineSpacingPoints("normal", 20), undefined);
});

test("A4 page size is detected from CSS and rendered dimensions", () => {
  assert.equal(core.a4LayoutFromCss("@page { size: A4 portrait; margin: 0; }").id, "a4-portrait");
  assert.equal(core.a4LayoutFromCss("@page report { size: landscape A4; }").id, "a4-landscape");
  assert.equal(core.a4LayoutFromCss("@page { size: 210mm 297mm; }").id, "a4-portrait");
  assert.equal(core.a4LayoutFromCss("@page { size: 11.69in 8.27in; }").id, "a4-landscape");
  assert.equal(core.a4LayoutFromDimensions(1122.5, 793.7).id, "a4-landscape");
  assert.equal(core.a4LayoutFromDimensions(793.7, 1122.5).id, "a4-portrait");
  assert.equal(core.a4LayoutFromDimensions(1280, 720), null);
});

test("presentation layout falls back to the existing widescreen size", () => {
  assert.equal(core.presentationLayout().id, "wide");
  assert.equal(core.presentationLayout({ id: "a4-portrait" }).width, 210 / 25.4);
  assert.equal(core.presentationLayout({ id: "unknown" }).height, core.SLIDE_HEIGHT_IN);
});

test("rich text runs preserve hard and repeated line breaks", () => {
  const runs = core.buildTextRuns([
    { text: "  first  ", whiteSpace: "normal", options: { bold: true } },
    { break: true },
    { break: true },
    { text: "second", whiteSpace: "normal", options: { italic: true } }
  ]);
  assert.deepEqual(runs, [
    { text: "first", options: { bold: true } },
    { text: "", options: { softBreakBefore: true } },
    { text: "second", options: { italic: true, softBreakBefore: true } }
  ]);
});

test("slide measurement state restores class style and hidden attributes", () => {
  function fakeElement(attributes) {
    const values = new Map(Object.entries(attributes));
    return {
      getAttribute: (name) => values.has(name) ? values.get(name) : null,
      setAttribute: (name, value) => values.set(name, String(value)),
      removeAttribute: (name) => values.delete(name),
      style: {
        setProperty(name, value, priority) {
          values.set("style", `${name}:${value}${priority ? ` !${priority}` : ""}`);
        }
      },
      attributes: values
    };
  }

  const first = fakeElement({ class: "slide active", style: "display:flex" });
  const second = fakeElement({ class: "slide", style: "display:none;color:red", hidden: "" });
  const restore = core.showOnlySlideForMeasurement([first, second], second, "flex");
  assert.match(first.getAttribute("style"), /display:none/);
  assert.match(second.getAttribute("style"), /display:flex/);
  assert.equal(second.getAttribute("hidden"), null);
  restore();
  assert.equal(first.getAttribute("class"), "slide active");
  assert.equal(first.getAttribute("style"), "display:flex");
  assert.equal(first.getAttribute("hidden"), null);
  assert.equal(second.getAttribute("class"), "slide");
  assert.equal(second.getAttribute("style"), "display:none;color:red");
  assert.equal(second.getAttribute("hidden"), "");
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

test("text options preserve supported vertical alignment", () => {
  assert.equal(core.textOptions({ valign: "middle" }).valign, "middle");
  assert.equal(core.textOptions({ valign: "unsupported" }).valign, "top");
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

test("PptxGenJS writes rich text breaks without nested group shapes", async () => {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  const slide = pptx.addSlide();
  const item = {
    x: 1,
    y: 1,
    w: 5,
    h: 2,
    lineSpacing: 18,
    runs: [
      { text: "first", options: { bold: true } },
      { text: "second", options: { italic: true, softBreakBefore: true } }
    ]
  };
  slide.addText(core.richTextContent(item), core.textOptions(item));

  const output = await pptx.write({ outputType: "nodebuffer" });
  const zip = await JSZip.loadAsync(output);
  const slideXml = await zip.file("ppt/slides/slide1.xml").async("string");
  assert.match(slideXml, /<a:br\/>/);
  assert.match(slideXml, /<a:spcPts val="1800"\/>/);
  assert.doesNotMatch(slideXml, /<p:grpSp(?:\s|>)/);
});

test("slide validation preserves every slide in order", () => {
  const slides = core.validateSlides([
    { background: "rgb(255, 255, 255)", images: [{ data: "data:image/png;base64,AA==" }], texts: [{ text: "one" }] },
    { background: "rgb(0, 0, 0)", texts: [{ text: "two" }] }
  ]);
  assert.equal(slides.length, 2);
  assert.equal(slides[0].texts[0].text, "one");
  assert.equal(slides[1].texts[0].text, "two");
  assert.deepEqual(slides[0].shapes, []);
  assert.equal(slides[0].images.length, 1);
  assert.deepEqual(slides[1].images, []);
});

test("an empty slide list gives an actionable error", () => {
  assert.throws(() => core.validateSlides([]), /.slide 要素、またはA4横・A4縦/);
});
