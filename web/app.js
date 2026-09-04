(function () {
  "use strict";

  const fileInput = document.getElementById("html-file");
  const dropZone = document.getElementById("drop-zone");
  const fileRow = document.getElementById("file-row");
  const fileName = document.getElementById("file-name");
  const fileSize = document.getElementById("file-size");
  const executeScripts = document.getElementById("execute-scripts");
  const convertButton = document.getElementById("convert-button");
  const downloadLink = document.getElementById("download-link");
  const progressCard = document.getElementById("progress-card");
  const progress = document.getElementById("conversion-progress");
  const progressLabel = document.getElementById("progress-label");
  const progressCount = document.getElementById("progress-count");
  const progressDetail = document.getElementById("progress-detail");
  const cancelButton = document.getElementById("cancel-button");
  const message = document.getElementById("message");
  const renderHost = document.getElementById("render-host");

  let selectedFile = null;
  let activeJob = null;
  let downloadUrl = null;

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function setMessage(text, isError) {
    message.textContent = text;
    message.classList.toggle("is-error", Boolean(isError));
  }

  function selectFile(file) {
    if (!file || !/\.html?$/i.test(file.name)) {
      setMessage("HTMLファイル（.html または .htm）を選択してください。", true);
      return;
    }
    clearDownload();
    selectedFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatBytes(file.size);
    fileRow.hidden = false;
    convertButton.disabled = Boolean(activeJob);
    setMessage(activeJob ? "選択したファイルは次の変換に使われます。" : "変換の準備ができました。", false);
  }

  fileInput.addEventListener("change", () => selectFile(fileInput.files[0]));

  for (const eventName of ["dragenter", "dragover"]) {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add("is-dragging");
    });
  }
  for (const eventName of ["dragleave", "drop"]) {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove("is-dragging");
    });
  }
  dropZone.addEventListener("drop", (event) => selectFile(event.dataTransfer.files[0]));

  cancelButton.addEventListener("click", () => {
    if (activeJob) activeJob.abort();
  });

  convertButton.addEventListener("click", async () => {
    if (!selectedFile || activeJob) return;
    const sourceFile = selectedFile;
    const shouldExecuteScripts = executeScripts.checked;
    const controller = new AbortController();
    let worker = null;
    let frame = null;
    const job = {
      abort() {
        controller.abort();
        if (worker) worker.terminate();
        worker = null;
        if (frame) frame.remove();
        frame = null;
        finishJob(job, "変換をキャンセルしました。", false);
      }
    };

    activeJob = job;
    clearDownload();

    convertButton.disabled = true;
    executeScripts.disabled = true;
    progressCard.hidden = false;
    cancelButton.hidden = false;
    progress.removeAttribute("value");
    progressLabel.textContent = "スライドを解析中";
    progressCount.textContent = "— / — 枚";
    progressDetail.textContent = "画面はそのまま操作できます";
    setMessage("", false);

    try {
      const html = await sourceFile.text();
      if (controller.signal.aborted) return;
      let renderHtml = html;
      if (shouldExecuteScripts) {
        progressLabel.textContent = "埋め込みスクリプトを実行中";
        progressDetail.textContent = "外部通信を遮断した隔離環境でDOMを生成しています";
        renderHtml = await createScriptSnapshot(html, controller.signal);
      }
      frame = await createRenderFrame(renderHtml, controller.signal);
      const slideElements = Array.from(frame.contentDocument.querySelectorAll(".slide"));
      if (slideElements.length === 0) {
        throw new Error(".slide 要素が見つかりません。例: <section class=\"slide\" style=\"width:1280px;height:720px\">...</section>");
      }

      progress.max = slideElements.length;
      progress.value = 0;
      progressCount.textContent = `0 / ${slideElements.length} 枚`;
      const slideModels = [];
      const slideDisplay = preferredSlideDisplay(slideElements);

      for (let index = 0; index < slideElements.length; index += 1) {
        if (controller.signal.aborted) return;
        progressLabel.textContent = `スライド ${index + 1} を解析中`;
        const restore = HtmlToPptxCore.showOnlySlideForMeasurement(slideElements, slideElements[index], slideDisplay);
        try {
          await nextFrame();
          slideModels.push(extractSlide(slideElements[index]));
        } finally {
          restore();
        }
      }

      frame.remove();
      frame = null;
      progress.value = 0;
      progressLabel.textContent = "PPTXへ変換中";
      progressDetail.textContent = `${slideElements.length}枚のスライドを順番に変換します`;

      worker = new Worker("./converter-worker.js");
      worker.onmessage = (event) => {
        if (activeJob !== job) return;
        const data = event.data || {};
        if (data.type === "progress") {
          progress.value = data.completed;
          progressLabel.textContent = `スライド ${data.completed} を変換しました`;
          progressCount.textContent = `${data.completed} / ${data.total} 枚`;
          progressDetail.textContent = `残り ${data.total - data.completed} 枚`;
        } else if (data.type === "packaging") {
          progress.value = data.total;
          progressLabel.textContent = "PPTXを仕上げています";
          progressDetail.textContent = "スライド変換は完了しました";
        } else if (data.type === "complete") {
          preparePptxDownload(data.buffer, HtmlToPptxCore.outputFileName(sourceFile.name));
          worker.terminate();
          worker = null;
          finishJob(job, `${slideElements.length}枚のスライドをPPTXに変換しました。［PPTXを保存］を押してください。`, false);
        } else if (data.type === "error") {
          if (worker) worker.terminate();
          worker = null;
          finishJob(job, data.message || "PPTXの生成に失敗しました。", true);
        }
      };
      worker.onerror = () => {
        if (activeJob !== job) return;
        if (worker) worker.terminate();
        worker = null;
        finishJob(job, "変換処理を開始できませんでした。", true);
      };
      worker.postMessage({ type: "convert", slides: slideModels, title: sourceFile.name });
    } catch (error) {
      if (!controller.signal.aborted) {
        if (frame) frame.remove();
        frame = null;
        finishJob(job, error instanceof Error ? error.message : String(error), true);
      }
    }
  });

  function finishJob(job, text, isError) {
    if (activeJob !== job) return;
    activeJob = null;
    convertButton.disabled = !selectedFile;
    executeScripts.disabled = false;
    cancelButton.hidden = true;
    if (isError) {
      progressLabel.textContent = "変換できませんでした";
    } else {
      progressLabel.textContent = text.startsWith("変換をキャンセル") ? "キャンセルしました" : "変換完了";
    }
    progressDetail.textContent = text;
    setMessage(text, isError);
  }

  function createScriptSnapshot(html, signal) {
    return new Promise((resolve, reject) => {
      const token = Array.from(crypto.getRandomValues(new Uint32Array(4)), (value) => value.toString(16)).join("-");
      const snapshotType = "html-to-pptx-script-snapshot";
      const parsed = new DOMParser().parseFromString(html, "text/html");
      const policy = parsed.createElement("meta");
      policy.httpEquiv = "Content-Security-Policy";
      policy.content = [
        "default-src 'none'",
        "script-src 'unsafe-inline'",
        "style-src 'unsafe-inline'",
        "img-src data: blob:",
        "font-src data:",
        "media-src data: blob:",
        "connect-src 'none'",
        "worker-src 'none'",
        "child-src 'none'",
        "frame-src 'none'",
        "form-action 'none'",
        "base-uri 'none'"
      ].join("; ");
      parsed.head.prepend(policy);

      const bridge = parsed.createElement("script");
      bridge.textContent = `(() => {
        "use strict";
        const sendSnapshot = () => setTimeout(() => {
          window.parent.postMessage({
            type: ${JSON.stringify(snapshotType)},
            token: ${JSON.stringify(token)},
            html: document.documentElement.outerHTML
          }, ${JSON.stringify(window.location.origin)});
        }, 0);
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", sendSnapshot, { once: true });
        } else {
          sendSnapshot();
        }
      })();`;
      parsed.body.append(bridge);

      const frame = document.createElement("iframe");
      frame.setAttribute("sandbox", "allow-scripts");
      frame.title = "埋め込みスクリプト実行用の隔離領域";
      const executionHtml = `<!doctype html>\n${parsed.documentElement.outerHTML}`;
      const runnerUrl = new URL("./script-runner.html", window.location.href);
      runnerUrl.hash = new URLSearchParams({ token, parentOrigin: window.location.origin }).toString();
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error("埋め込みスクリプトの実行が完了しませんでした。スクリプト実行を外して再度お試しください。"));
      }, 5000);
      const cleanup = () => {
        window.clearTimeout(timeout);
        signal.removeEventListener("abort", onAbort);
        frame.removeEventListener("load", onLoad);
        window.removeEventListener("message", onMessage);
        frame.remove();
      };
      const onAbort = () => {
        cleanup();
        reject(new DOMException("変換をキャンセルしました", "AbortError"));
      };
      const onMessage = (event) => {
        const data = event.data;
        if (
          event.source !== frame.contentWindow ||
          event.origin !== "null" ||
          !data ||
          data.type !== snapshotType ||
          data.token !== token ||
          typeof data.html !== "string"
        ) {
          return;
        }
        cleanup();
        resolve(`<!doctype html>\n${data.html}`);
      };
      const onLoad = () => {
        // A sandboxed frame has an opaque origin, so targetOrigin cannot name it.
        // The runner validates the parent origin, window source, and one-time token.
        frame.contentWindow.postMessage({
          type: "html-to-pptx-script-run",
          token,
          html: executionHtml
        }, "*");
      };
      signal.addEventListener("abort", onAbort, { once: true });
      frame.addEventListener("load", onLoad, { once: true });
      window.addEventListener("message", onMessage);
      frame.src = runnerUrl.href;
      renderHost.appendChild(frame);
    });
  }

  function createRenderFrame(html, signal) {
    return new Promise((resolve, reject) => {
      const frame = document.createElement("iframe");
      frame.setAttribute("sandbox", "allow-same-origin");
      frame.title = "変換用HTMLレンダリング領域";
      const cleanup = () => signal.removeEventListener("abort", onAbort);
      const onAbort = () => {
        cleanup();
        frame.remove();
        reject(new DOMException("変換をキャンセルしました", "AbortError"));
      };
      signal.addEventListener("abort", onAbort, { once: true });
      frame.addEventListener("load", async () => {
        cleanup();
        try {
          if (frame.contentDocument.fonts) await frame.contentDocument.fonts.ready;
          resolve(frame);
        } catch (error) {
          reject(error);
        }
      }, { once: true });
      frame.srcdoc = html;
      renderHost.appendChild(frame);
    });
  }

  function preferredSlideDisplay(slides) {
    for (const slide of slides) {
      const style = slide.ownerDocument.defaultView.getComputedStyle(slide);
      if (style.display !== "none" && slide.getBoundingClientRect().width > 0) return style.display;
    }
    return "block";
  }

  function extractSlide(slideElement) {
    const view = slideElement.ownerDocument.defaultView;
    const slideRect = slideElement.getBoundingClientRect();
    if (slideRect.width <= 0 || slideRect.height <= 0) {
      throw new Error("幅または高さが0の .slide 要素があります。表示可能な16:9サイズを指定してください。");
    }

    const scaleX = HtmlToPptxCore.SLIDE_WIDTH_IN / slideRect.width;
    const scaleY = HtmlToPptxCore.SLIDE_HEIGHT_IN / slideRect.height;
    const colorReader = createColorReader(slideElement.ownerDocument);
    const shapes = [];
    const texts = [];
    const claimedTextNodes = new WeakSet();

    for (const element of [slideElement, ...slideElement.querySelectorAll("*")]) {
      const style = view.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0 || rect.width <= 0 || rect.height <= 0) continue;

      if (element !== slideElement) {
        extractElementShapes(style, rect, slideRect, scaleX, scaleY, colorReader, shapes);
      }

      const isTableCell = ["TD", "TH"].includes(element.tagName);
      if (!isTableCell && !hasInlineText(element, view)) continue;
      const extracted = extractRenderedText(element, view, colorReader, claimedTextNodes, isTableCell);
      const runs = HtmlToPptxCore.buildTextRuns(extracted.tokens);
      const plainText = runs.map((run) => `${run.options.softBreakBefore ? "\n" : ""}${run.text}`).join("").replace(/\n+$/, "");
      if (!plainText) continue;

      const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(style.paddingRight) || 0;
      const paddingTop = Number.parseFloat(style.paddingTop) || 0;
      const paddingBottom = Number.parseFloat(style.paddingBottom) || 0;
      const x = (rect.left + paddingLeft - slideRect.left) * scaleX;
      const y = (rect.top + paddingTop - slideRect.top) * scaleY;
      const width = Math.max(1, rect.width - paddingLeft - paddingRight);
      const height = Math.max(1, rect.height - paddingTop - paddingBottom);
      if (x >= HtmlToPptxCore.SLIDE_WIDTH_IN || y >= HtmlToPptxCore.SLIDE_HEIGHT_IN || x + rect.width * scaleX <= 0 || y + rect.height * scaleY <= 0) continue;

      texts.push({
        text: plainText,
        runs,
        x,
        y,
        w: Math.min(width * scaleX, HtmlToPptxCore.SLIDE_WIDTH_IN - Math.max(0, x)),
        h: Math.min(height * scaleY, HtmlToPptxCore.SLIDE_HEIGHT_IN - Math.max(0, y)),
        fontFace: style.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
        fontSize: Number.parseFloat(style.fontSize) * 0.75,
        lineSpacing: extracted.lineSpacing || HtmlToPptxCore.lineSpacingPoints(style.lineHeight, Number.parseFloat(style.fontSize)),
        color: colorReader(style.color, Number(style.opacity)),
        bold: Number.parseInt(style.fontWeight, 10) >= 600,
        italic: style.fontStyle === "italic",
        align: style.textAlign
      });
    }

    const slideBackground = colorReader(view.getComputedStyle(slideElement).backgroundColor, 1);
    return {
      background: HtmlToPptxCore.colorOptions(slideBackground, "FFFFFF").transparency === 100 ? "FFFFFF" : slideBackground,
      shapes,
      texts
    };
  }

  function hasInlineText(element, view) {
    for (const node of element.childNodes) {
      if (node.nodeType === view.Node.TEXT_NODE && node.textContent.trim()) return true;
      if (node.nodeType !== view.Node.ELEMENT_NODE) continue;
      if (node.tagName === "BR") return true;
      const display = view.getComputedStyle(node).display;
      if ((display === "contents" || display.startsWith("inline")) && hasInlineText(node, view)) return true;
    }
    return false;
  }

  function extractRenderedText(element, view, colorReader, claimedTextNodes, includeBlockDescendants) {
    const tokens = [];
    const lineSpacings = [];
    const layoutState = { lineTop: null };

    function pushBreak(force) {
      if (tokens.length === 0 || (!force && tokens[tokens.length - 1].break)) return;
      tokens.push({ break: true });
      layoutState.lineTop = null;
    }

    function visit(parent, allowBlocks) {
      for (const node of parent.childNodes) {
        if (node.nodeType === view.Node.TEXT_NODE) {
          if (claimedTextNodes.has(node)) continue;
          claimedTextNodes.add(node);
          appendTextNodeTokens(node, view, colorReader, tokens, lineSpacings, layoutState, pushBreak);
          continue;
        }
        if (node.nodeType !== view.Node.ELEMENT_NODE) continue;

        const childStyle = view.getComputedStyle(node);
        if (childStyle.display === "none" || childStyle.visibility === "hidden" || Number(childStyle.opacity) === 0) continue;
        if (node.tagName === "BR") {
          claimedTextNodes.add(node);
          pushBreak(true);
          continue;
        }

        const isInline = childStyle.display === "contents" || childStyle.display.startsWith("inline");
        if (!isInline && !allowBlocks) continue;
        if (!isInline) pushBreak();
        visit(node, allowBlocks);
        if (!isInline) pushBreak();
      }
    }

    visit(element, includeBlockDescendants);
    return { tokens, lineSpacing: lineSpacings.find((value) => Number.isFinite(value) && value > 0) };
  }

  function appendTextNodeTokens(node, view, colorReader, tokens, lineSpacings, layoutState, pushBreak) {
    const style = view.getComputedStyle(node.parentElement);
    const rawText = node.textContent || "";
    const whiteSpace = style.whiteSpace;
    const preservesNewlines = ["pre", "pre-wrap", "pre-line", "break-spaces"].includes(whiteSpace);
    const range = node.ownerDocument.createRange();
    const options = {
      fontFace: style.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
      fontSize: Number.parseFloat(style.fontSize) * 0.75,
      color: colorReader(style.color, Number(style.opacity)),
      bold: Number.parseInt(style.fontWeight, 10) >= 600,
      italic: style.fontStyle === "italic",
      underline: style.textDecorationLine.includes("underline"),
      lang: "ja-JP"
    };
    const spacing = HtmlToPptxCore.lineSpacingPoints(style.lineHeight, Number.parseFloat(style.fontSize));
    if (spacing) lineSpacings.push(spacing);

    let buffer = "";
    function flush() {
      if (buffer) tokens.push({ text: buffer, whiteSpace, options });
      buffer = "";
    }

    for (let index = 0; index < rawText.length; index += 1) {
      let character = rawText[index];
      if (character === "\r") continue;
      if (character === "\n" && preservesNewlines) {
        flush();
        pushBreak();
        continue;
      }
      if (character === "\n") character = " ";

      range.setStart(node, index);
      range.setEnd(node, index + 1);
      const characterRect = Array.from(range.getClientRects()).find((candidate) => candidate.width > 0 || candidate.height > 0);
      if (!characterRect && /\s/.test(character) && !["pre", "pre-wrap", "break-spaces"].includes(whiteSpace)) continue;
      if (characterRect) {
        if (layoutState.lineTop !== null && Math.abs(characterRect.top - layoutState.lineTop) > 1) {
          flush();
          pushBreak();
        }
        layoutState.lineTop = characterRect.top;
      }
      buffer += character;
    }
    flush();
  }

  function createColorReader(document) {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("CSSの色を解析できませんでした。");
    return (value, opacity) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = "rgba(0, 0, 0, 0)";
      context.fillStyle = value || "rgba(0, 0, 0, 0)";
      context.fillRect(0, 0, 1, 1);
      const pixel = context.getImageData(0, 0, 1, 1).data;
      const alpha = Math.min(1, Math.max(0, (pixel[3] / 255) * (Number.isFinite(opacity) ? opacity : 1)));
      return `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${alpha.toFixed(3)})`;
    };
  }

  function extractElementShapes(style, rect, slideRect, scaleX, scaleY, colorReader, shapes) {
    const left = Math.max(0, (rect.left - slideRect.left) * scaleX);
    const top = Math.max(0, (rect.top - slideRect.top) * scaleY);
    const right = Math.min(HtmlToPptxCore.SLIDE_WIDTH_IN, (rect.right - slideRect.left) * scaleX);
    const bottom = Math.min(HtmlToPptxCore.SLIDE_HEIGHT_IN, (rect.bottom - slideRect.top) * scaleY);
    const width = right - left;
    const height = bottom - top;
    if (width <= 0 || height <= 0) return;

    const opacity = Number.parseFloat(style.opacity);
    const background = colorReader(style.backgroundColor, opacity);
    const hasBackground = HtmlToPptxCore.colorOptions(background, "FFFFFF").transparency < 100;

    const sides = [
      ["Top", left, top, width, 0, scaleY],
      ["Right", right, top, 0, height, scaleX],
      ["Bottom", left, bottom, width, 0, scaleY],
      ["Left", left, top, 0, height, scaleX]
    ];
    const borders = sides.map(([side, x, y, w, h, scale]) => {
      const borderStyle = style[`border${side}Style`];
      const borderWidth = Number.parseFloat(style[`border${side}Width`]);
      if (borderStyle === "none" || borderStyle === "hidden" || !Number.isFinite(borderWidth) || borderWidth <= 0) return null;
      const color = colorReader(style[`border${side}Color`], opacity);
      if (HtmlToPptxCore.colorOptions(color, "000000").transparency === 100) return null;
      const dashType = borderStyle === "dotted" ? "sysDot" : borderStyle === "dashed" ? "dash" : borderStyle === "double" ? "dashDot" : "solid";
      return { kind: "line", x, y, w, h, color, width: Math.max(0.25, borderWidth * scale * 72), dashType };
    });

    const uniformBorder = borders.every(Boolean) && borders.slice(1).every((border) =>
      border.color === borders[0].color && border.width === borders[0].width && border.dashType === borders[0].dashType
    );
    if (hasBackground || uniformBorder) {
      const shape = {
        kind: "rect",
        x: left,
        y: top,
        w: width,
        h: height,
        color: background,
        rounded: Number.parseFloat(style.borderTopLeftRadius) > 0
      };
      if (uniformBorder) {
        shape.lineColor = borders[0].color;
        shape.lineWidth = borders[0].width;
        shape.dashType = borders[0].dashType;
      }
      shapes.push(shape);
    }
    if (!uniformBorder) {
      for (const border of borders) {
        if (border) shapes.push(border);
      }
    }
  }

  function preparePptxDownload(buffer, name) {
    clearDownload();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
    downloadUrl = URL.createObjectURL(blob);
    downloadLink.href = downloadUrl;
    downloadLink.download = name;
    downloadLink.hidden = false;
  }

  function clearDownload() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
    downloadLink.removeAttribute("href");
    downloadLink.removeAttribute("download");
    downloadLink.hidden = true;
  }

  window.addEventListener("pagehide", clearDownload, { once: true });

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }
})();
