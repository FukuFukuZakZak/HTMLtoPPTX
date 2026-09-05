(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.HtmlToPptxCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SLIDE_WIDTH_IN = 13.333;
  const SLIDE_HEIGHT_IN = 7.5;
  const A4_SHORT_EDGE_IN = 210 / 25.4;
  const A4_LONG_EDGE_IN = 297 / 25.4;
  const PRESENTATION_LAYOUTS = Object.freeze({
    wide: Object.freeze({ id: "wide", name: "LAYOUT_WIDE", width: SLIDE_WIDTH_IN, height: SLIDE_HEIGHT_IN }),
    "a4-landscape": Object.freeze({ id: "a4-landscape", name: "HTML_A4_LANDSCAPE", width: A4_LONG_EDGE_IN, height: A4_SHORT_EDGE_IN }),
    "a4-portrait": Object.freeze({ id: "a4-portrait", name: "HTML_A4_PORTRAIT", width: A4_SHORT_EDGE_IN, height: A4_LONG_EDGE_IN })
  });

  function presentationLayout(layout) {
    const id = typeof layout === "string" ? layout : layout && layout.id;
    return PRESENTATION_LAYOUTS[id] || PRESENTATION_LAYOUTS.wide;
  }

  function hasExecutableScripts(html) {
    const openingTag = /<script\b([^>]*)>/gi;
    let match;
    while ((match = openingTag.exec(String(html || ""))) !== null) {
      const typeAttribute = match[1].match(/\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i);
      if (!typeAttribute) return true;
      const type = String(typeAttribute[1] || typeAttribute[2] || typeAttribute[3] || "")
        .split(";", 1)[0]
        .trim()
        .toLowerCase();
      if (!type || type === "module" || /^(?:text|application)\/(?:java|ecma)script$/.test(type)) return true;
    }
    return false;
  }

  function a4LayoutFromDimensions(width, height, tolerance) {
    const measuredWidth = Number(width);
    const measuredHeight = Number(height);
    if (!Number.isFinite(measuredWidth) || !Number.isFinite(measuredHeight) || measuredWidth <= 0 || measuredHeight <= 0) return null;
    const actualRatio = Math.max(measuredWidth, measuredHeight) / Math.min(measuredWidth, measuredHeight);
    const a4Ratio = A4_LONG_EDGE_IN / A4_SHORT_EDGE_IN;
    const allowedDifference = Number.isFinite(Number(tolerance)) ? Math.max(0, Number(tolerance)) : 0.03;
    if (Math.abs(actualRatio / a4Ratio - 1) > allowedDifference) return null;
    return measuredWidth > measuredHeight ? PRESENTATION_LAYOUTS["a4-landscape"] : PRESENTATION_LAYOUTS["a4-portrait"];
  }

  function cssLengthInches(value) {
    const match = String(value || "").trim().match(/^([0-9]*\.?[0-9]+)\s*(mm|cm|in|pt|px)$/i);
    if (!match) return null;
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    const factors = { mm: 1 / 25.4, cm: 1 / 2.54, in: 1, pt: 1 / 72, px: 1 / 96 };
    return amount * factors[unit];
  }

  function a4LayoutFromCss(cssText) {
    const blocks = String(cssText || "").match(/@page(?:\s+[^{}]+)?\s*\{[^{}]*\}/gi) || [];
    for (const block of blocks) {
      const sizeMatch = block.match(/(?:^|[;{])\s*size\s*:\s*([^;}]+)/i);
      if (!sizeMatch) continue;
      const size = sizeMatch[1].trim();
      if (/\ba4\b/i.test(size)) {
        return /\blandscape\b/i.test(size) ? PRESENTATION_LAYOUTS["a4-landscape"] : PRESENTATION_LAYOUTS["a4-portrait"];
      }
      const lengths = size.match(/[0-9]*\.?[0-9]+\s*(?:mm|cm|in|pt|px)\b/gi) || [];
      if (lengths.length >= 2) {
        const width = cssLengthInches(lengths[0]);
        const height = cssLengthInches(lengths[1]);
        const layout = a4LayoutFromDimensions(width, height, 0.015);
        if (layout) return layout;
      }
    }
    return null;
  }

  function outputFileName(inputName) {
    const baseName = String(inputName || "presentation")
      .replace(/\.(html?|xhtml)$/i, "")
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
      .trim();
    return `${baseName || "presentation"}.pptx`;
  }

  function layoutOutputFileName(inputName, layout) {
    const baseName = outputFileName(inputName).slice(0, -".pptx".length);
    const resolved = presentationLayout(layout);
    const labels = {
      "a4-portrait": "A4縦",
      "a4-landscape": "A4横",
      wide: "ワイド"
    };
    return `${baseName}-${labels[resolved.id] || resolved.id}.pptx`;
  }

  function uniquePptxFileNames(outputNames) {
    const used = new Set();
    return Array.from(outputNames || [], (outputName) => {
      const sanitized = String(outputName || "presentation.pptx")
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
        .trim();
      const desired = /\.pptx$/i.test(sanitized) ? sanitized : `${sanitized || "presentation"}.pptx`;
      const baseName = desired.slice(0, -".pptx".length);
      let candidate = desired;
      let suffix = 2;
      while (used.has(candidate.toLowerCase())) {
        candidate = `${baseName} (${suffix}).pptx`;
        suffix += 1;
      }
      used.add(candidate.toLowerCase());
      return candidate;
    });
  }

  function uniqueOutputFileNames(inputNames) {
    return uniquePptxFileNames(Array.from(inputNames || [], outputFileName));
  }

  function groupSlidesByLayout(pageSlides) {
    const groups = new Map();
    for (const pageSlide of Array.from(pageSlides || [])) {
      const layout = presentationLayout(pageSlide && pageSlide.layout);
      if (!groups.has(layout.id)) groups.set(layout.id, { layout, slides: [] });
      groups.get(layout.id).slides.push(pageSlide && pageSlide.slide);
    }
    return Array.from(groups.values());
  }

  function zipOutputFileName(inputNames) {
    const names = Array.from(inputNames || []);
    if (names.length === 1) {
      return `${outputFileName(names[0]).slice(0, -".pptx".length)}.zip`;
    }
    return `html-to-pptx-${Math.max(1, names.length)}-files.zip`;
  }

  function hexColor(value, fallback) {
    const hex = String(value || "").trim().match(/^#?([0-9a-f]{6})$/i);
    if (hex) return hex[1].toUpperCase();
    const match = String(value || "").match(/rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/i);
    if (!match) return fallback;
    return match.slice(1, 4).map((part) => Number(part).toString(16).padStart(2, "0")).join("").toUpperCase();
  }

  function colorOptions(value, fallback) {
    const match = String(value || "").match(/rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)(?:\D+([\d.]+))?/i);
    const alpha = match && match[4] !== undefined ? Math.min(1, Math.max(0, Number(match[4]))) : 1;
    return {
      color: hexColor(value, fallback),
      transparency: Math.round((1 - alpha) * 100)
    };
  }

  function finiteNumber(value, fallback) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
  }

  function lineSpacingPoints(lineHeight, fontSizePixels) {
    const value = String(lineHeight || "").trim().toLowerCase();
    if (!value || value === "normal") return undefined;

    const fontSize = Math.max(0, finiteNumber(fontSizePixels, 0));
    const amount = Number.parseFloat(value);
    if (!Number.isFinite(amount)) return undefined;
    if (value.endsWith("px")) return Math.max(0.1, amount * 0.75);
    if (value.endsWith("pt")) return Math.max(0.1, amount);
    if (value.endsWith("%")) return Math.max(0.1, fontSize * amount / 100 * 0.75);

    return fontSize > 0 ? Math.max(0.1, fontSize * amount * 0.75) : undefined;
  }

  // CSS coordinates are pixels; slide coordinates are inches. Text must use
  // the same measured scale as its box, including high-resolution HTML pages.
  function textMetrics(style, scaleX = 1 / 96, scaleY = 1 / 96) {
    const fontSizePixels = finiteNumber(Number.parseFloat(style.fontSize), 16);
    const lineSpacing = lineSpacingPoints(style.lineHeight, fontSizePixels);
    return {
      fontSize: fontSizePixels * scaleY * 72,
      lineSpacing: lineSpacing === undefined ? undefined : lineSpacing * scaleY * 96,
      charSpacing: finiteNumber(Number.parseFloat(style.letterSpacing), 0) * scaleX * 72
    };
  }

  function startsNewRenderedLine(lineRect, previousRect, nextRect, direction) {
    if (!lineRect || !previousRect) return false;
    // Different font sizes on a shared baseline have different top edges.
    // Their vertical bands still overlap; a genuinely separate line does not.
    if (nextRect.top >= lineRect.bottom - 1 || nextRect.bottom <= lineRect.top + 1) return true;
    // Tight line-height can make successive lines overlap. A return toward
    // the line start with an equal-height glyph distinguishes this from an
    // inline font-size change (for both LTR and RTL text).
    const returnsToStart = direction === "rtl"
      ? nextRect.right > previousRect.right + 1
      : nextRect.left < previousRect.left - 1;
    return returnsToStart && Math.abs(nextRect.height - previousRect.height) <= 1 &&
      nextRect.top > previousRect.top + 1;
  }

  function normalizeText(value, whiteSpace) {
    const text = String(value || "").replace(/\r\n?/g, "\n");
    const mode = String(whiteSpace || "normal").toLowerCase();
    if (["pre", "pre-wrap", "break-spaces"].includes(mode)) return text;
    if (mode === "pre-line") {
      return text.split("\n").map((line) => line.replace(/[\t\f\v ]+/g, " ")).join("\n");
    }
    return text.replace(/\s+/g, " ");
  }

  function sameRunOptions(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  function buildTextRuns(tokens) {
    const runs = [];
    let pendingBreaks = 0;
    for (const token of Array.isArray(tokens) ? tokens : []) {
      if (token && token.break) {
        const previous = runs[runs.length - 1];
        if (previous && !previous.preserve) previous.text = previous.text.replace(/ +$/, "");
        pendingBreaks += 1;
        continue;
      }

      const preserve = ["pre", "pre-wrap", "break-spaces"].includes(String(token && token.whiteSpace || "").toLowerCase());
      const text = normalizeText(token && token.text, token && token.whiteSpace);
      if (!text) continue;
      const options = Object.assign({}, token && token.options);
      while (pendingBreaks > 1) {
        runs.push({ text: "", options: { softBreakBefore: true } });
        pendingBreaks -= 1;
      }
      if (pendingBreaks === 1) options.softBreakBefore = true;
      pendingBreaks = 0;
      const previous = runs[runs.length - 1];
      if (previous && !options.softBreakBefore && sameRunOptions(previous.options, options)) {
        previous.text += text;
        previous.preserve = previous.preserve || preserve;
      } else {
        runs.push({ text, options, preserve });
      }
    }

    while (runs.length && !runs[0].preserve) {
      runs[0].text = runs[0].text.replace(/^ +/, "");
      if (runs[0].text || runs[0].options.softBreakBefore) break;
      runs.shift();
    }
    while (runs.length && !runs[runs.length - 1].preserve) {
      const last = runs[runs.length - 1];
      last.text = last.text.replace(/ +$/, "");
      if (last.text || last.options.softBreakBefore) break;
      runs.pop();
    }
    return runs.map(({ text, options }) => ({ text, options }));
  }

  function richTextContent(item) {
    if (!Array.isArray(item && item.runs) || item.runs.length === 0) return String(item && item.text || "");
    return item.runs.map((run) => {
      const options = Object.assign({}, run.options);
      if (options.color) options.color = hexColor(options.color, "182333");
      if (options.fontSize !== undefined) options.fontSize = Math.max(1, finiteNumber(options.fontSize, 12));
      options.bold = Boolean(options.bold);
      options.italic = Boolean(options.italic);
      options.breakLine = Boolean(options.breakLine);
      options.softBreakBefore = Boolean(options.softBreakBefore);
      return { text: String(run.text || ""), options };
    });
  }

  function captureElementState(element) {
    return {
      classAttribute: element.getAttribute("class"),
      styleAttribute: element.getAttribute("style"),
      hiddenAttribute: element.getAttribute("hidden")
    };
  }

  function restoreElementState(element, state) {
    for (const [name, value] of [
      ["class", state.classAttribute],
      ["style", state.styleAttribute],
      ["hidden", state.hiddenAttribute]
    ]) {
      if (value === null) element.removeAttribute(name);
      else element.setAttribute(name, value);
    }
  }

  function showOnlySlideForMeasurement(slides, target, display) {
    const states = slides.map((slide) => captureElementState(slide));
    slides.forEach((slide) => {
      if (slide === target) {
        slide.removeAttribute("hidden");
        slide.style.setProperty("display", display || "block", "important");
      } else {
        slide.style.setProperty("display", "none", "important");
      }
    });
    return () => slides.forEach((slide, index) => restoreElementState(slide, states[index]));
  }

  function textOptions(item) {
    const options = {
      x: Math.max(0, finiteNumber(item.x, 0)),
      y: Math.max(0, finiteNumber(item.y, 0)),
      w: Math.max(0.01, finiteNumber(item.w, 0.01)),
      h: Math.max(0.01, finiteNumber(item.h, 0.01)),
      fontFace: item.fontFace || "Arial",
      fontSize: Math.max(1, finiteNumber(item.fontSize, 12)),
      color: hexColor(item.color, "182333"),
      bold: Boolean(item.bold),
      italic: Boolean(item.italic),
      align: ["left", "center", "right", "justify"].includes(item.align) ? item.align : "left",
      valign: ["top", "middle", "bottom"].includes(item.valign) ? item.valign : "top",
      margin: 0,
      fit: "shrink"
    };
    const lineSpacing = finiteNumber(item.lineSpacing, 0);
    if (lineSpacing > 0) options.lineSpacing = lineSpacing;
    if (Number.isFinite(item.charSpacing)) options.charSpacing = item.charSpacing;
    return options;
  }

  function shapeOptions(item) {
    const options = {
      x: Math.max(0, finiteNumber(item.x, 0)),
      y: Math.max(0, finiteNumber(item.y, 0)),
      w: Math.max(0, finiteNumber(item.w, 0)),
      h: Math.max(0, finiteNumber(item.h, 0))
    };

    if (item.kind === "line") {
      const lineColor = colorOptions(item.color, "000000");
      options.line = {
        color: lineColor.color,
        transparency: lineColor.transparency,
        width: Math.max(0.25, finiteNumber(item.width, 0.75)),
        dashType: ["solid", "dash", "sysDot", "dashDot"].includes(item.dashType) ? item.dashType : "solid"
      };
      return options;
    }

    const fillColor = colorOptions(item.color, "FFFFFF");
    options.fill = fillColor;
    if (item.lineColor) {
      const lineColor = colorOptions(item.lineColor, "000000");
      options.line = {
        color: lineColor.color,
        transparency: lineColor.transparency,
        width: Math.max(0.25, finiteNumber(item.lineWidth, 0.75)),
        dashType: ["solid", "dash", "sysDot", "dashDot"].includes(item.dashType) ? item.dashType : "solid"
      };
    } else {
      options.line = { color: "FFFFFF", transparency: 100 };
    }
    return options;
  }

  function validateSlides(slides) {
    if (!Array.isArray(slides) || slides.length === 0) {
      throw new Error("変換するページがありません。.slide 要素、またはA4横・A4縦のページを指定してください。");
    }
    return slides.map((slide) => ({
      background: hexColor(slide.background, "FFFFFF"),
      shapes: Array.isArray(slide.shapes) ? slide.shapes : [],
      images: Array.isArray(slide.images) ? slide.images : [],
      texts: Array.isArray(slide.texts) ? slide.texts : []
    }));
  }

  return {
    SLIDE_WIDTH_IN,
    SLIDE_HEIGHT_IN,
    PRESENTATION_LAYOUTS,
    presentationLayout,
    hasExecutableScripts,
    a4LayoutFromDimensions,
    a4LayoutFromCss,
    outputFileName,
    layoutOutputFileName,
    uniquePptxFileNames,
    uniqueOutputFileNames,
    groupSlidesByLayout,
    zipOutputFileName,
    hexColor,
    colorOptions,
    lineSpacingPoints,
    textMetrics,
    startsNewRenderedLine,
    normalizeText,
    buildTextRuns,
    richTextContent,
    captureElementState,
    restoreElementState,
    showOnlySlideForMeasurement,
    textOptions,
    shapeOptions,
    validateSlides
  };
});
