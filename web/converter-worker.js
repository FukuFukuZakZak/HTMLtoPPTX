"use strict";

importScripts("./vendor/pptxgen.bundle.js", "./vendor/jszip.min.js", "./converter-core.js");

self.onmessage = async function (event) {
  if (!event.data || event.data.type !== "convert-batch") return;

  try {
    const presentations = Array.isArray(event.data.presentations) ? event.data.presentations : [];
    if (presentations.length === 0) throw new Error("変換するHTMLがありません。");
    const validated = presentations.map((presentation) => ({
      title: presentation.title,
      outputName: presentation.outputName,
      layout: HtmlToPptxCore.presentationLayout(presentation.layout),
      slides: HtmlToPptxCore.validateSlides(presentation.slides)
    }));
    const total = validated.reduce((sum, presentation) => sum + presentation.slides.length, 0);
    const zip = new JSZip();
    let completed = 0;

    for (let fileIndex = 0; fileIndex < validated.length; fileIndex += 1) {
      const presentation = validated[fileIndex];
      const pptx = new PptxGenJS();
      if (presentation.layout.id === "wide") {
        pptx.layout = presentation.layout.name;
      } else {
        pptx.defineLayout({
          name: presentation.layout.name,
          width: presentation.layout.width,
          height: presentation.layout.height
        });
        pptx.layout = presentation.layout.name;
      }
      pptx.author = "HTML → PowerPoint Converter";
      pptx.subject = "HTMLから変換したプレゼンテーション";
      pptx.title = presentation.title || "Presentation";
      pptx.lang = "ja-JP";

      for (const model of presentation.slides) {
        const slide = pptx.addSlide();
        slide.background = { color: model.background };

        for (const item of model.shapes) {
          const shapeType = item.kind === "line" ? pptx.ShapeType.line : item.rounded ? pptx.ShapeType.roundRect : pptx.ShapeType.rect;
          slide.addShape(shapeType, HtmlToPptxCore.shapeOptions(item));
        }

        for (const item of model.texts) {
          const content = HtmlToPptxCore.richTextContent(item);
          if ((Array.isArray(content) && content.length > 0) || (!Array.isArray(content) && content)) {
            slide.addText(content, HtmlToPptxCore.textOptions(item));
          }
        }

        completed += 1;
        self.postMessage({
          type: "progress",
          completed,
          total,
          fileCompleted: fileIndex + 1,
          fileTotal: validated.length,
          fileName: presentation.outputName
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const pptxBuffer = await pptx.write({ outputType: "arraybuffer" });
      zip.file(presentation.outputName, pptxBuffer);
    }

    self.postMessage({ type: "packaging", total });
    const buffer = await zip.generateAsync({ type: "arraybuffer", streamFiles: true }, (metadata) => {
      self.postMessage({ type: "packaging-progress", percent: metadata.percent });
    });
    self.postMessage({ type: "complete", buffer }, [buffer]);
  } catch (error) {
    self.postMessage({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
