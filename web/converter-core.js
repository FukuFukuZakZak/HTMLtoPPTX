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

  function outputFileName(inputName) {
    const baseName = String(inputName || "presentation")
      .replace(/\.(html?|xhtml)$/i, "")
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
      .trim();
    return `${baseName || "presentation"}.pptx`;
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

  function textOptions(item) {
    return {
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
      valign: "top",
      margin: 0,
      breakLine: false,
      fit: "shrink"
    };
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
      throw new Error(".slide 要素が見つかりません。HTML内に class=\"slide\" を追加してください。");
    }
    return slides.map((slide) => ({
      background: hexColor(slide.background, "FFFFFF"),
      shapes: Array.isArray(slide.shapes) ? slide.shapes : [],
      texts: Array.isArray(slide.texts) ? slide.texts : []
    }));
  }

  return { SLIDE_WIDTH_IN, SLIDE_HEIGHT_IN, outputFileName, hexColor, colorOptions, textOptions, shapeOptions, validateSlides };
});
