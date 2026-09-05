"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const JSZip = require("jszip");

test("worker creates one PPTX per presentation inside one ZIP", async () => {
  const messages = [];
  global.importScripts = () => {};
  global.PptxGenJS = require("pptxgenjs");
  global.JSZip = JSZip;
  global.HtmlToPptxCore = require("./converter-core.js");
  global.self = {
    postMessage(message) {
      messages.push(message);
    }
  };

  const workerPath = path.resolve(__dirname, "converter-worker.js");
  delete require.cache[workerPath];
  require(workerPath);

  const slide = {
    background: "FFFFFF",
    shapes: [
      { kind: "ellipse", x: 1, y: 1, w: 1, h: 1, color: "008F80" },
      { kind: "custom", x: 3, y: 1, w: 1, h: 1, color: "008F80", points: [{ x: 0, y: 0 }, { x: 1, y: 0.5 }, { x: 0, y: 1 }, { close: true }] },
      { kind: "rect", rounded: true, rectRadius: 0.2, x: 4, y: 1, w: 2, h: 1, color: "008F80" }
    ],
    images: [{
      data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XwV+AAAAAElFTkSuQmCC",
      x: 2,
      y: 1,
      w: 1,
      h: 1,
      altText: "sample image"
    }],
    texts: []
  };
  await global.self.onmessage({
    data: {
      type: "convert-batch",
      presentations: [
        { title: "Wide", outputName: "wide.pptx", slides: [slide] },
        { title: "Portrait", outputName: "portrait.pptx", layout: { id: "a4-portrait" }, slides: [slide, slide] },
        { title: "Landscape", outputName: "landscape.pptx", layout: { id: "a4-landscape" }, slides: [slide, slide, slide] }
      ]
    }
  });

  const error = messages.find((message) => message.type === "error");
  assert.equal(error, undefined);
  const complete = messages.find((message) => message.type === "complete");
  assert.ok(complete && complete.buffer instanceof ArrayBuffer);

  const archive = await JSZip.loadAsync(complete.buffer);
  assert.deepEqual(
    Object.keys(archive.files).filter((name) => name.endsWith(".pptx")).sort(),
    ["landscape.pptx", "portrait.pptx", "wide.pptx"]
  );

  const expectedSizes = {
    "wide.pptx": null,
    "portrait.pptx": [7560000, 10692000],
    "landscape.pptx": [10692000, 7560000]
  };
  for (const [name, expectedSize] of Object.entries(expectedSizes)) {
    const pptx = await JSZip.loadAsync(await archive.file(name).async("arraybuffer"));
    assert.ok(pptx.file("ppt/presentation.xml"));
    assert.ok(pptx.file("ppt/slides/slide1.xml"));
    const expectedCount = name === "wide.pptx" ? 1 : name === "portrait.pptx" ? 2 : 3;
    assert.ok(pptx.file(`ppt/slides/slide${expectedCount}.xml`));
    assert.equal(pptx.file(`ppt/slides/slide${expectedCount + 1}.xml`), null);
    const contentTypes = await pptx.file("[Content_Types].xml").async("string");
    for (const [, partName] of contentTypes.matchAll(/<Override PartName="\/([^"]+)"/g)) {
      assert.ok(pptx.file(partName), `${name} declares a missing part: ${partName}`);
    }
    assert.match(contentTypes, /PartName="\/ppt\/slideMasters\/slideMaster1.xml"/);
    const slideXml = await pptx.file("ppt/slides/slide1.xml").async("string");
    assert.match(slideXml, /<a:prstGeom prst="ellipse"/);
    assert.match(slideXml, /<a:custGeom>/);
    assert.match(slideXml, /<a:pt x="914400" y="457200"/);
    assert.match(slideXml, /<a:gd name="adj" fmla="val 20000"/);
    assert.match(slideXml, /<p:pic>/);
    assert.ok(Object.keys(pptx.files).some((path) => path.startsWith("ppt/media/image-")));
    if (expectedSize) {
      const presentationXml = await pptx.file("ppt/presentation.xml").async("string");
      assert.match(presentationXml, new RegExp(`<p:sldSz cx="${expectedSize[0]}" cy="${expectedSize[1]}"`));
    }
  }

  const progress = messages.filter((message) => message.type === "progress");
  assert.deepEqual(progress.map((message) => message.completed), [1, 2, 3, 4, 5, 6]);
  assert.ok(messages.some((message) => message.type === "packaging"));
});
