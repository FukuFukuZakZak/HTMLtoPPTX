"use strict";

importScripts("./vendor/pptxgen.bundle.js", "./vendor/jszip.min.js", "./converter-core.js");

async function removeMissingMasterOverrides(buffer) {
  // PptxGenJS 4.0.1 declares a master for every slide but writes only the
  // actual master parts. Remove only those stale declarations; leave real
  // masters, relationships, media and slide content untouched.
  const archive = await JSZip.loadAsync(buffer);
  const contentTypes = archive.file("[Content_Types].xml");
  const xml = await contentTypes.async("string");
  const corrected = xml.replace(
    /<Override PartName="\/(ppt\/slideMasters\/slideMaster\d+\.xml)" ContentType="application\/vnd\.openxmlformats-officedocument\.presentationml\.slideMaster\+xml"\s*\/>/g,
    (declaration, part) => archive.file(part) ? declaration : ""
  );
  if (corrected === xml) return buffer;
  archive.file("[Content_Types].xml", corrected);
  return archive.generateAsync({ type: "arraybuffer" });
}

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
        const sourceLayout = model.sourceLayout || presentation.layout;
        const fit = HtmlToPptxCore.layoutFit(sourceLayout, presentation.layout);
        const fitted = sourceLayout.id !== presentation.layout.id;
        slide.background = { color: fitted ? "FFFFFF" : model.background };
        if (fitted) {
          slide.addShape(pptx.ShapeType.rect, {
            x: fit.x, y: fit.y, w: sourceLayout.width * fit.scale, h: sourceLayout.height * fit.scale,
            fill: { color: model.background }, line: { transparency: 100 }
          });
        }

        for (const item of model.shapes) {
          const shapeType = item.kind === "custom"
            ? pptx.ShapeType.custGeom
            : item.kind === "line"
            ? pptx.ShapeType.line
            : item.kind === "ellipse"
              ? pptx.ShapeType.ellipse
              : item.rounded
                ? pptx.ShapeType.roundRect
                : pptx.ShapeType.rect;
          slide.addShape(shapeType, HtmlToPptxCore.fitPptxOptions(HtmlToPptxCore.shapeOptions(item), fit));
        }

        for (const item of model.images) {
          if (!item.data) continue;
          slide.addImage(HtmlToPptxCore.fitPptxOptions({
            data: item.data,
            x: Math.max(0, Number(item.x) || 0),
            y: Math.max(0, Number(item.y) || 0),
            w: Math.max(0, Number(item.w) || 0),
            h: Math.max(0, Number(item.h) || 0),
            altText: item.altText || ""
          }, fit));
        }

        for (const item of model.texts) {
          const content = HtmlToPptxCore.richTextContent(item);
          if ((Array.isArray(content) && content.length > 0) || (!Array.isArray(content) && content)) {
            const fittedContent = Array.isArray(content)
              ? content.map((run) => ({ ...run, options: HtmlToPptxCore.fitPptxOptions(run.options, fit) }))
              : content;
            slide.addText(fittedContent, HtmlToPptxCore.fitPptxOptions(HtmlToPptxCore.textOptions(item), fit));
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
      zip.file(presentation.outputName, await removeMissingMasterOverrides(pptxBuffer));
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
