const test = require("node:test");
const assert = require("node:assert/strict");
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

test("slide validation preserves every slide in order", () => {
  const slides = core.validateSlides([
    { background: "rgb(255, 255, 255)", texts: [{ text: "one" }] },
    { background: "rgb(0, 0, 0)", texts: [{ text: "two" }] }
  ]);
  assert.equal(slides.length, 2);
  assert.equal(slides[0].texts[0].text, "one");
  assert.equal(slides[1].texts[0].text, "two");
});

test("an empty slide list gives an actionable error", () => {
  assert.throws(() => core.validateSlides([]), /\.slide 要素が見つかりません/);
});
