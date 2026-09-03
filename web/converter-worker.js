"use strict";

importScripts("./vendor/pptxgen.bundle.js", "./converter-core.js");

self.onmessage = async function (event) {
  if (!event.data || event.data.type !== "convert") return;

  try {
    const slides = HtmlToPptxCore.validateSlides(event.data.slides);
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    pptx.author = "HTML → PowerPoint Converter";
    pptx.subject = "HTMLから変換したプレゼンテーション";
    pptx.title = event.data.title || "Presentation";
    pptx.lang = "ja-JP";

    for (let index = 0; index < slides.length; index += 1) {
      const model = slides[index];
      const slide = pptx.addSlide();
      slide.background = { color: model.background };

      for (const item of model.texts) {
        if (item.text) slide.addText(item.text, HtmlToPptxCore.textOptions(item));
      }

      self.postMessage({ type: "progress", completed: index + 1, total: slides.length });
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    self.postMessage({ type: "packaging", total: slides.length });
    const buffer = await pptx.write({ outputType: "arraybuffer" });
    self.postMessage({ type: "complete", buffer }, [buffer]);
  } catch (error) {
    self.postMessage({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
