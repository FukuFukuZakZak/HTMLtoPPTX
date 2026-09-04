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

  const slide = { background: "FFFFFF", shapes: [], texts: [] };
  await global.self.onmessage({
    data: {
      type: "convert-batch",
      presentations: [
        { title: "Wide", outputName: "wide.pptx", slides: [slide] },
        { title: "Portrait", outputName: "portrait.pptx", layout: { id: "a4-portrait" }, slides: [slide] },
        { title: "Landscape", outputName: "landscape.pptx", layout: { id: "a4-landscape" }, slides: [slide] }
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
    assert.equal(pptx.file("ppt/slides/slide2.xml"), null);
    if (expectedSize) {
      const presentationXml = await pptx.file("ppt/presentation.xml").async("string");
      assert.match(presentationXml, new RegExp(`<p:sldSz cx="${expectedSize[0]}" cy="${expectedSize[1]}"`));
    }
  }

  const progress = messages.filter((message) => message.type === "progress");
  assert.deepEqual(progress.map((message) => message.completed), [1, 2, 3]);
  assert.ok(messages.some((message) => message.type === "packaging"));
});
