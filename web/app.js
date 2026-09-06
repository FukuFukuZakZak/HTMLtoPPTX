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
  const fileScriptNotice = document.getElementById("file-script-notice");
  const renderHost = document.getElementById("render-host");
  const fileWorkspace = document.getElementById("file-workspace");
  const editorWorkspace = document.getElementById("editor-workspace");
  const openEditorButton = document.getElementById("open-editor-button");
  const backToFileButton = document.getElementById("back-to-file-button");
  const htmlEditor = document.getElementById("html-editor");
  let htmlPreview = document.getElementById("html-preview");
  const editorSize = document.getElementById("editor-size");
  const editorExecuteScripts = document.getElementById("editor-execute-scripts");
  const editorConvertButton = document.getElementById("editor-convert-button");
  const editorDownloadLink = document.getElementById("editor-download-link");
  const editorProgressCard = document.getElementById("editor-progress-card");
  const editorProgress = document.getElementById("editor-conversion-progress");
  const editorProgressLabel = document.getElementById("editor-progress-label");
  const editorProgressCount = document.getElementById("editor-progress-count");
  const editorProgressDetail = document.getElementById("editor-progress-detail");
  const editorCancelButton = document.getElementById("editor-cancel-button");
  const editorMessage = document.getElementById("editor-message");
  const editorScriptNotice = document.getElementById("editor-script-notice");

  const fileUi = {
    convertButton,
    downloadLink,
    executeScripts,
    progressCard,
    progress,
    progressLabel,
    progressCount,
    progressDetail,
    cancelButton,
    message,
    scriptNotice: fileScriptNotice,
    scriptSubject: "選択したHTML",
    hasExecutableScripts: false
  };
  const editorUi = {
    convertButton: editorConvertButton,
    downloadLink: editorDownloadLink,
    executeScripts: editorExecuteScripts,
    progressCard: editorProgressCard,
    progress: editorProgress,
    progressLabel: editorProgressLabel,
    progressCount: editorProgressCount,
    progressDetail: editorProgressDetail,
    cancelButton: editorCancelButton,
    message: editorMessage,
    scriptNotice: editorScriptNotice,
    scriptSubject: "入力したHTML",
    hasExecutableScripts: false
  };
  const conversionUis = [fileUi, editorUi];

  let selectedFiles = [];
  let activeJob = null;
  let downloadUrl = null;
  let previewTimer = null;
  let fileInspectionToken = 0;

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function setMessage(ui, text, isError) {
    ui.message.textContent = text;
    ui.message.classList.toggle("is-error", Boolean(isError));
  }

  function updateConversionControls() {
    convertButton.disabled = Boolean(activeJob) || selectedFiles.length === 0;
    editorConvertButton.disabled = Boolean(activeJob) || htmlEditor.value.trim().length === 0;
    executeScripts.disabled = Boolean(activeJob);
    editorExecuteScripts.disabled = Boolean(activeJob);
    openEditorButton.disabled = Boolean(activeJob);
    backToFileButton.disabled = Boolean(activeJob);
  }

  function updateScriptNotice(ui) {
    const shouldWarn = ui.hasExecutableScripts && !ui.executeScripts.checked;
    ui.scriptNotice.hidden = !shouldWarn;
    if (shouldWarn) {
      ui.scriptNotice.textContent = `${ui.scriptSubject}には、読み込み後に内容を追加する仕組みがあります。オフのままでは、メニューやグラフなどが欠ける可能性があります。`;
    }
  }

  async function inspectSelectedFilesForScripts(files) {
    const inspectionToken = ++fileInspectionToken;
    let hasExecutableScripts = false;
    for (const file of files) {
      const html = await file.text();
      if (HtmlToPptxCore.hasExecutableScripts(html)) {
        hasExecutableScripts = true;
        break;
      }
    }
    if (inspectionToken !== fileInspectionToken) return;
    fileUi.hasExecutableScripts = hasExecutableScripts;
    updateScriptNotice(fileUi);
  }

  function selectFiles(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0 || files.some((file) => !/\.html?$/i.test(file.name))) {
      setMessage(fileUi, "HTMLファイル（.html または .htm）を選択してください。", true);
      return;
    }
    clearDownload();
    selectedFiles = files;
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    fileName.textContent = files.length === 1 ? files[0].name : `${files.length}件のHTMLを選択しました`;
    fileSize.textContent = files.length === 1
      ? formatBytes(totalBytes)
      : `${formatBytes(totalBytes)} ・ ${files.map((file) => file.name).join(" / ")}`;
    fileName.title = fileName.textContent;
    fileSize.title = fileSize.textContent;
    fileRow.hidden = false;
    updateConversionControls();
    setMessage(fileUi, activeJob ? "選択したファイルは次の一括変換に使われます。" : `${files.length}件の変換準備ができました。`, false);
    fileUi.hasExecutableScripts = false;
    updateScriptNotice(fileUi);
    inspectSelectedFilesForScripts(files).catch(() => {});
  }

  fileInput.addEventListener("change", () => selectFiles(fileInput.files));

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
  dropZone.addEventListener("drop", (event) => selectFiles(event.dataTransfer.files));

  function showEditorWorkspace() {
    fileWorkspace.hidden = true;
    editorWorkspace.hidden = false;
    // Recreate the sandboxed frame after showing its workspace; Chromium can retain a blank layout after display:none.
    const visiblePreview = htmlPreview.cloneNode(false);
    htmlPreview.replaceWith(visiblePreview);
    htmlPreview = visiblePreview;
    refreshPreview();
    htmlEditor.focus();
  }

  function showFileWorkspace() {
    editorWorkspace.hidden = true;
    fileWorkspace.hidden = false;
    openEditorButton.focus();
  }

  function previewDocument(html) {
    if (!html.trim()) {
      return "<!doctype html><html lang=\"ja\"><head><meta charset=\"utf-8\"><style>body{display:grid;place-items:center;min-height:100vh;margin:0;color:#647080;background:#f8f7f2;font:16px 'Yu Gothic UI','Meiryo',sans-serif}p{padding:24px;text-align:center}</style></head><body><p>左側にHTMLコードを貼り付けると、ここに表示されます。</p></body></html>";
    }
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const policy = parsed.createElement("meta");
    policy.httpEquiv = "Content-Security-Policy";
    policy.content = "default-src 'none'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
    parsed.head.prepend(policy);
    return `<!doctype html>\n${parsed.documentElement.outerHTML}`;
  }

  function refreshPreview() {
    const html = htmlEditor.value;
    editorSize.textContent = formatBytes(new Blob([html]).size);
    // Loading srcdoc inside a hidden workspace can leave Chromium's frame without layout.
    if (!editorWorkspace.hidden) htmlPreview.srcdoc = previewDocument(html);
    document.getElementById("preview-empty").hidden = Boolean(html.trim());
    editorUi.hasExecutableScripts = HtmlToPptxCore.hasExecutableScripts(html);
    updateScriptNotice(editorUi);
    updateConversionControls();
  }

  openEditorButton.addEventListener("click", showEditorWorkspace);
  backToFileButton.addEventListener("click", showFileWorkspace);
  htmlEditor.addEventListener("input", () => {
    window.clearTimeout(previewTimer);
    if (!activeJob) {
      clearDownload();
      editorProgressCard.hidden = true;
      setMessage(editorUi, "", false);
    }
    editorSize.textContent = formatBytes(new Blob([htmlEditor.value]).size);
    updateConversionControls();
    previewTimer = window.setTimeout(refreshPreview, 350);
  });

  for (const ui of conversionUis) ui.cancelButton.addEventListener("click", () => {
    if (activeJob) activeJob.abort();
  });
  for (const ui of conversionUis) ui.executeScripts.addEventListener("change", () => updateScriptNotice(ui));

  convertButton.addEventListener("click", () => {
    startConversion(selectedFiles.slice(), executeScripts.checked, fileUi);
  });
  editorConvertButton.addEventListener("click", () => {
    const html = htmlEditor.value;
    if (!html.trim()) {
      setMessage(editorUi, "HTMLコードを貼り付けてください。", true);
      htmlEditor.focus();
      return;
    }
    const source = new File([html], "貼り付けHTML.html", { type: "text/html" });
    startConversion([source], editorExecuteScripts.checked, editorUi);
  });

  async function startConversion(sourceFiles, shouldExecuteScripts, ui) {
    if (sourceFiles.length === 0 || activeJob) return;
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
        finishJob(job, ui, "変換をキャンセルしました。", false);
      }
    };

    activeJob = job;
    clearDownload();

    updateConversionControls();
    ui.progressCard.hidden = false;
    ui.cancelButton.hidden = false;
    ui.progress.removeAttribute("value");
    ui.progressLabel.textContent = "HTMLを解析中";
    ui.progressCount.textContent = `0 / ${sourceFiles.length} ファイル`;
    ui.progressDetail.textContent = "画面はそのまま操作できます";
    setMessage(ui, "", false);

    try {
      const presentationDrafts = [];
      let totalSlides = 0;
      let hasMixedA4Orientation = false;
      for (let fileIndex = 0; fileIndex < sourceFiles.length; fileIndex += 1) {
        const sourceFile = sourceFiles[fileIndex];
        if (controller.signal.aborted) return;
        ui.progressLabel.textContent = `${sourceFile.name} を解析中`;
        ui.progressCount.textContent = `${fileIndex + 1} / ${sourceFiles.length} ファイル`;
        ui.progressDetail.textContent = "HTMLを読み取っています";

        const html = await sourceFile.text();
        if (controller.signal.aborted) return;
        let renderHtml = html;
        if (shouldExecuteScripts) {
          ui.progressLabel.textContent = `${sourceFile.name} のスクリプトを実行中`;
          ui.progressDetail.textContent = "外部通信を遮断した隔離環境でDOMを生成しています";
          renderHtml = await createScriptSnapshot(html, controller.signal);
        }
        frame = await createRenderFrame(renderHtml, controller.signal);
        const pageSet = resolveConvertiblePages(frame.contentDocument);
        const slideElements = pageSet.elements;

        const pageSlides = [];
        const slideDisplay = preferredSlideDisplay(slideElements);
        for (let slideIndex = 0; slideIndex < slideElements.length; slideIndex += 1) {
          if (controller.signal.aborted) return;
          ui.progressLabel.textContent = `${sourceFile.name}: スライド ${slideIndex + 1} / ${slideElements.length} を解析中`;
          const restore = HtmlToPptxCore.showOnlySlideForMeasurement(slideElements, slideElements[slideIndex], slideDisplay);
          try {
            await nextFrame();
            const layout = pageSet.layouts[slideIndex];
            pageSlides.push({ layout, slide: extractSlide(slideElements[slideIndex], layout) });
          } finally {
            restore();
          }
        }
        totalSlides += pageSlides.length;
        const groups = HtmlToPptxCore.groupSlidesByLayout(pageSlides);
        const groupLayoutIds = new Set(groups.map((group) => group.layout.id));
        hasMixedA4Orientation = hasMixedA4Orientation || (
          groupLayoutIds.has("a4-portrait") && groupLayoutIds.has("a4-landscape")
        );
        for (const group of groups) {
          presentationDrafts.push({
            title: sourceFile.name,
            desiredOutputName: groups.length > 1
              ? HtmlToPptxCore.layoutOutputFileName(sourceFile.name, group.layout)
              : HtmlToPptxCore.outputFileName(sourceFile.name),
            layout: group.layout,
            slides: group.slides
          });
        }
        frame.remove();
        frame = null;
      }

      const outputNames = HtmlToPptxCore.uniquePptxFileNames(presentationDrafts.map((item) => item.desiredOutputName));
      const presentations = presentationDrafts.map((item, index) => ({
        title: item.title,
        outputName: outputNames[index],
        layout: item.layout,
        slides: item.slides
      }));

      ui.progress.max = totalSlides;
      ui.progress.value = 0;
      ui.progressLabel.textContent = "PPTXへ一括変換中";
      ui.progressCount.textContent = `0 / ${totalSlides} 枚`;
      ui.progressDetail.textContent = `${presentations.length}個のPPTX・合計${totalSlides}枚を順番に変換します`;

      worker = new Worker("./converter-worker.js");
      worker.onmessage = (event) => {
        if (activeJob !== job) return;
        const data = event.data || {};
        if (data.type === "progress") {
          ui.progress.value = data.completed;
          ui.progressLabel.textContent = `${data.fileName}: スライドを変換中`;
          ui.progressCount.textContent = `${data.completed} / ${data.total} 枚`;
          ui.progressDetail.textContent = `${data.fileCompleted} / ${data.fileTotal} PPTX ・ 残り ${data.total - data.completed} 枚`;
        } else if (data.type === "packaging") {
          ui.progress.value = totalSlides;
          ui.progressLabel.textContent = "ZIPを仕上げています";
          ui.progressCount.textContent = `${presentations.length} / ${presentations.length} PPTX`;
          ui.progressDetail.textContent = "すべてのPPTXをZIPにまとめています";
        } else if (data.type === "packaging-progress") {
          ui.progressDetail.textContent = `ZIPを作成中 ${Math.round(data.percent)}%`;
        } else if (data.type === "complete") {
          prepareZipDownload(data.buffer, HtmlToPptxCore.zipOutputFileName(sourceFiles.map((file) => file.name)));
          worker.terminate();
          worker = null;
          const integrationNote = hasMixedA4Orientation
            ? " A4縦・横のPPTXはPowerPointで手動統合してください。"
            : "";
          finishJob(job, ui, `${presentations.length}件のPPTXをZIPにまとめました。［ZIPを保存］を押してください。${integrationNote}`, false);
        } else if (data.type === "error") {
          if (worker) worker.terminate();
          worker = null;
          finishJob(job, ui, data.message || "PPTXの生成に失敗しました。", true);
        }
      };
      worker.onerror = () => {
        if (activeJob !== job) return;
        if (worker) worker.terminate();
        worker = null;
        finishJob(job, ui, "変換処理を開始できませんでした。", true);
      };
      worker.postMessage({ type: "convert-batch", presentations });
    } catch (error) {
      if (!controller.signal.aborted) {
        if (frame) frame.remove();
        frame = null;
        finishJob(job, ui, error instanceof Error ? error.message : String(error), true);
      }
    }
  }

  function finishJob(job, ui, text, isError) {
    if (activeJob !== job) return;
    activeJob = null;
    updateConversionControls();
    ui.cancelButton.hidden = true;
    if (isError) {
      ui.progressLabel.textContent = "変換できませんでした";
    } else {
      ui.progressLabel.textContent = text.startsWith("変換をキャンセル") ? "キャンセルしました" : "変換完了";
    }
    ui.progressDetail.textContent = text;
    setMessage(ui, text, isError);
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
          await waitForImages(frame.contentDocument);
          materializePseudoElements(frame.contentDocument);
          await nextFrame();
          resolve(frame);
        } catch (error) {
          reject(error);
        }
      }, { once: true });
      frame.srcdoc = html;
      renderHost.appendChild(frame);
    });
  }

  async function waitForImages(document) {
    const images = Array.from(document.images);
    await Promise.allSettled(images.map(async (image) => {
      if (typeof image.decode === "function") {
        await image.decode();
        return;
      }
      if (image.complete) return;
      await new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      });
    }));
  }

  function materializePseudoElements(document) {
    const view = document.defaultView;
    const hosts = Array.from(document.body?.querySelectorAll("*") || []);
    let hasBefore = false;
    let hasAfter = false;

    for (const host of hosts) {
      const before = pseudoElementSnapshot(view, host, "::before");
      const after = pseudoElementSnapshot(view, host, "::after");
      if (!before && !after) continue;

      if (before) {
        host.setAttribute("data-html-to-pptx-before", "");
        host.insertBefore(createPseudoProxy(document, before, "before"), host.firstChild);
        hasBefore = true;
      }
      if (after) {
        host.setAttribute("data-html-to-pptx-after", "");
        host.appendChild(createPseudoProxy(document, after, "after"));
        hasAfter = true;
      }
    }

    if (!hasBefore && !hasAfter) return;
    const suppression = document.createElement("style");
    suppression.setAttribute("data-html-to-pptx-pseudo-suppression", "");
    suppression.textContent = [
      hasBefore ? "[data-html-to-pptx-before]::before{content:none!important;display:none!important}" : "",
      hasAfter ? "[data-html-to-pptx-after]::after{content:none!important;display:none!important}" : ""
    ].join("\n");
    document.head.appendChild(suppression);
  }

  function pseudoElementSnapshot(view, host, pseudo) {
    const style = view.getComputedStyle(host, pseudo);
    const content = style.content;
    if (content === "none" || content === "normal" || style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
      return null;
    }
    return {
      content: /^(["']).*\1$/.test(content) ? content.slice(1, -1) : "",
      properties: Array.from(style, (property) => [property, style.getPropertyValue(property), style.getPropertyPriority(property)])
    };
  }

  function createPseudoProxy(document, snapshot, position) {
    const proxy = document.createElement("span");
    proxy.setAttribute("data-html-to-pptx-pseudo", position);
    proxy.setAttribute("aria-hidden", "true");
    proxy.textContent = snapshot.content;
    for (const [property, value, priority] of snapshot.properties) {
      if (property !== "content") proxy.style.setProperty(property, value, priority);
    }
    return proxy;
  }

  function preferredSlideDisplay(slides) {
    for (const slide of slides) {
      const style = slide.ownerDocument.defaultView.getComputedStyle(slide);
      if (style.display !== "none" && slide.getBoundingClientRect().width > 0) return style.display;
    }
    return "block";
  }

  function elementA4Layout(element) {
    const view = element.ownerDocument.defaultView;
    const rect = element.getBoundingClientRect();
    const style = view.getComputedStyle(element);
    const width = rect.width || Number.parseFloat(style.width);
    const height = rect.height || Number.parseFloat(style.height);
    return HtmlToPptxCore.a4LayoutFromDimensions(width, height);
  }

  function authoredA4Layout(document) {
    const cssText = Array.from(document.querySelectorAll("style"), (style) => style.textContent || "").join("\n");
    return HtmlToPptxCore.a4LayoutFromCss(cssText);
  }

  function a4PageCandidates(document) {
    const body = document.body;
    if (!body) return [];
    const preferred = Array.from(body.querySelectorAll(".page, [data-page], [role='document'], main"));
    const candidates = Array.from(new Set([...body.children, ...preferred])).filter((element) => {
      const layout = elementA4Layout(element);
      return Boolean(layout);
    });
    return candidates.filter((candidate) => !candidates.some((other) => other !== candidate && candidate.contains(other)));
  }

  function resolveConvertiblePages(document) {
    const slides = Array.from(document.querySelectorAll(".slide"));
    if (slides.length > 0) {
      const layouts = slides.map((slide) => elementA4Layout(slide) || HtmlToPptxCore.PRESENTATION_LAYOUTS.wide);
      return { elements: slides, layouts };
    }

    const authored = authoredA4Layout(document);
    const candidates = a4PageCandidates(document);
    if (candidates.length > 0) {
      return { elements: candidates, layouts: candidates.map(elementA4Layout) };
    }

    if (authored && document.body) {
      const visibleChildren = Array.from(document.body.children).filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = document.defaultView.getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      });
      if (visibleChildren.length === 1) return { elements: visibleChildren, layouts: [authored] };
      const bodyLayout = elementA4Layout(document.body);
      if (bodyLayout && bodyLayout.id === authored.id) return { elements: [document.body], layouts: [authored] };
    }

    throw new Error(".slide 要素、またはA4横・A4縦と判断できるページが見つかりません。@page の size かページ要素の寸法を指定してください。");
  }

  function extractSlide(slideElement, requestedLayout) {
    const view = slideElement.ownerDocument.defaultView;
    const slideRect = slideElement.getBoundingClientRect();
    if (slideRect.width <= 0 || slideRect.height <= 0) {
      throw new Error("幅または高さが0のページ要素があります。表示可能なサイズを指定してください。");
    }

    const layout = HtmlToPptxCore.presentationLayout(requestedLayout);
    const scaleX = layout.width / slideRect.width;
    const scaleY = layout.height / slideRect.height;
    const colorReader = createColorReader(slideElement.ownerDocument);
    const shapes = [];
    const images = [];
    const texts = [];
    const claimedTextNodes = new WeakSet();
    const elements = [slideElement, ...slideElement.querySelectorAll("*")];
    const elementOrder = new Map(elements.map((element, index) => [element, index]));
    const shapeLayers = [];

    for (const element of elements) {
      const rasterRoot = element.closest("img, canvas, svg");
      if (rasterRoot && rasterRoot !== element) continue;
      const style = view.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0 || rect.width <= 0 || rect.height <= 0 || isVisuallyClipped(style, rect)) continue;

      if (element !== slideElement) {
        const elementShapes = [];
        extractElementShapes(style, rect, slideRect, scaleX, scaleY, layout, colorReader, elementShapes);
        if (elementShapes.length) shapeLayers.push({ key: shapePaintKey(element, slideElement, view, elementOrder), shapes: elementShapes });
        const image = extractElementImage(element, style, rect, slideRect, scaleX, scaleY, layout);
        if (image) images.push(image);
      }

      if (rasterRoot) continue;

      const isTableCell = ["TD", "TH"].includes(element.tagName);
      if (!isTableCell && !hasInlineText(element, view)) continue;
      const fragments = extractRenderedText(element, view, colorReader, claimedTextNodes, isTableCell, scaleX, scaleY);
      for (const extracted of fragments) {
        const metrics = HtmlToPptxCore.textMetrics(style, scaleX, scaleY);
        const runs = HtmlToPptxCore.buildTextRuns(extracted.tokens);
        const plainText = runs.map((run) => `${run.options.softBreakBefore ? "\n" : ""}${run.text}`).join("").replace(/\n+$/, "");
        if (!plainText) continue;

        const useRenderedBounds = extracted.positioned || shouldUseRenderedTextBounds(element, style, view, extracted.bounds);
        const textRect = useRenderedBounds ? extracted.bounds : rect;
        const paddingLeft = useRenderedBounds ? 0 : Number.parseFloat(style.paddingLeft) || 0;
        const paddingRight = useRenderedBounds ? 0 : Number.parseFloat(style.paddingRight) || 0;
        const paddingTop = useRenderedBounds ? 0 : Number.parseFloat(style.paddingTop) || 0;
        const paddingBottom = useRenderedBounds ? 0 : Number.parseFloat(style.paddingBottom) || 0;
        let x = (textRect.left + paddingLeft - slideRect.left) * scaleX;
        let y = (textRect.top + paddingTop - slideRect.top) * scaleY;
        let width = Math.max(1, textRect.width - paddingLeft - paddingRight) * scaleX;
        let height = Math.max(1, textRect.height - paddingTop - paddingBottom);
        const trimsTextBox = style.textBoxTrim && style.textBoxTrim !== "none";
        if (trimsTextBox && extracted.bounds) {
          y = (extracted.bounds.top - slideRect.top) * scaleY;
          height = extracted.bounds.height;
        }
        if (useRenderedBounds || style.display === "inline" || trimsTextBox) {
          const lineHeight = (extracted.lineSpacing || metrics.lineSpacing || metrics.fontSize * 1.2) / (72 * scaleY);
          // Range and inline-element rectangles describe glyphs, not line boxes.
          // Give PowerPoint the CSS line height so fit: shrink cannot collapse it.
          const extraHeight = Math.max(0, lineHeight - height);
          y -= extraHeight * scaleY / 2;
          height += extraHeight;
        }
        if (x >= layout.width || y >= layout.height || x + rect.width * scaleX <= 0 || y + rect.height * scaleY <= 0) continue;
        const alignment = extracted.positioned ? { horizontal: "left", vertical: "top" } : textBoxAlignment(style);
        if (!plainText.includes("\n")) {
          const expandedWidth = width * 1.18;
          const extraWidth = expandedWidth - width;
          if (alignment.horizontal === "right") x = Math.max(0, x - extraWidth);
          else if (alignment.horizontal === "center") x = Math.max(0, x - extraWidth / 2);
          width = Math.min(expandedWidth, layout.width - x);
        }

        texts.push({
          text: plainText,
          runs,
          x,
          y,
          w: Math.min(width, layout.width - Math.max(0, x)),
          h: Math.min(height * scaleY, layout.height - Math.max(0, y)),
          fontFace: style.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
          ...metrics,
          lineSpacing: extracted.lineSpacing || metrics.lineSpacing,
          color: colorReader(style.color, Number(style.opacity)),
          bold: Number.parseInt(style.fontWeight, 10) >= 600,
          italic: style.fontStyle === "italic",
          align: alignment.horizontal,
          valign: alignment.vertical
        });
      }
    }

    shapeLayers.sort((a, b) => {
      for (let index = 0; index < Math.min(a.key.length, b.key.length); index++) {
        if (a.key[index] !== b.key[index]) return a.key[index] - b.key[index];
      }
      return a.key.length - b.key.length;
    });
    for (const layer of shapeLayers) shapes.push(...layer.shapes);
    const slideBackground = colorReader(view.getComputedStyle(slideElement).backgroundColor, 1);
    return {
      background: HtmlToPptxCore.colorOptions(slideBackground, "FFFFFF").transparency === 100 ? "FFFFFF" : slideBackground,
      shapes,
      images,
      texts
    };
  }

  function shapePaintKey(element, slideElement, view, elementOrder) {
    const key = [];
    for (let node = element; node && node !== slideElement; node = node.parentElement) {
      const style = view.getComputedStyle(node);
      const parentDisplay = node.parentElement ? view.getComputedStyle(node.parentElement).display : "";
      const positioned = style.position && style.position !== "static";
      const zIndex = positioned || /flex|grid/.test(parentDisplay) ? Number.parseInt(style.zIndex, 10) : NaN;
      const createsContext = Number.isFinite(zIndex) || ["fixed", "sticky"].includes(style.position)
        || Number(style.opacity) < 1 || style.isolation === "isolate"
        || (style.transform && style.transform !== "none") || (style.filter && style.filter !== "none");
      if (node === element || createsContext) key.unshift(Number.isFinite(zIndex) ? zIndex : 0, elementOrder.get(node));
    }
    // A stacking context's own background precedes even its negative-z children.
    return [...key, -Infinity];
  }

  function isVisuallyClipped(style, rect) {
    const clipPath = style.clipPath || style.webkitClipPath || "none";
    const clip = style.clip || "auto";
    if (clipPath === "none" && clip === "auto") return false;
    if (rect.width <= 2 && rect.height <= 2) return true;
    return /^inset\(\s*50%(?:\s+50%){0,3}\s*\)$/i.test(clipPath)
      || /^rect\(\s*0(?:px)?(?:\s*,\s*|\s+)0(?:px)?(?:\s*,\s*|\s+)0(?:px)?(?:\s*,\s*|\s+)0(?:px)?\s*\)$/i.test(clip);
  }

  function extractElementImage(element, style, rect, slideRect, scaleX, scaleY, layout) {
    let data = "";
    let altText = element.getAttribute("aria-label") || element.getAttribute("alt") || "";

    try {
      if (element.tagName === "IMG") {
        if (!element.complete || element.naturalWidth <= 0 || element.naturalHeight <= 0) return null;
        data = rasterizeImageElement(element, style, rect);
      } else if (element.tagName === "CANVAS") {
        data = element.toDataURL("image/png");
      } else if (element.tagName === "svg") {
        const source = new XMLSerializer().serializeToString(element);
        data = `data:image/svg+xml;base64,${utf8Base64(source)}`;
        if (!altText) altText = element.querySelector("title")?.textContent || "";
      } else {
        return null;
      }
    } catch (error) {
      console.warn("画像を埋め込めなかったためスキップしました。", error);
      return null;
    }

    if (!data) return null;
    const borderLeft = Number.parseFloat(style.borderLeftWidth) || 0;
    const borderRight = Number.parseFloat(style.borderRightWidth) || 0;
    const borderTop = Number.parseFloat(style.borderTopWidth) || 0;
    const borderBottom = Number.parseFloat(style.borderBottomWidth) || 0;
    const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(style.paddingRight) || 0;
    const paddingTop = Number.parseFloat(style.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(style.paddingBottom) || 0;
    const contentRect = {
      left: rect.left + borderLeft + paddingLeft,
      top: rect.top + borderTop + paddingTop,
      right: rect.right - borderRight - paddingRight,
      bottom: rect.bottom - borderBottom - paddingBottom
    };
    const bounds = scaledBounds(contentRect, slideRect, scaleX, scaleY, layout);
    if (!bounds) return null;
    return { data, altText, ...bounds };
  }

  function rasterizeImageElement(image, style, rect) {
    const borderWidth = (Number.parseFloat(style.borderLeftWidth) || 0) + (Number.parseFloat(style.borderRightWidth) || 0);
    const borderHeight = (Number.parseFloat(style.borderTopWidth) || 0) + (Number.parseFloat(style.borderBottomWidth) || 0);
    const paddingWidth = (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0);
    const paddingHeight = (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0);
    const boxWidth = Math.max(1, rect.width - borderWidth - paddingWidth);
    const boxHeight = Math.max(1, rect.height - borderHeight - paddingHeight);
    const pixelRatio = Math.min(2, 4096 / Math.max(boxWidth, boxHeight));
    const canvas = image.ownerDocument.createElement("canvas");
    canvas.width = Math.max(1, Math.round(boxWidth * pixelRatio));
    canvas.height = Math.max(1, Math.round(boxHeight * pixelRatio));
    const context = canvas.getContext("2d");
    if (!context) return "";
    context.scale(pixelRatio, pixelRatio);

    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;
    const fit = style.objectFit || "fill";
    let drawWidth = boxWidth;
    let drawHeight = boxHeight;
    if (fit !== "fill") {
      const containScale = Math.min(boxWidth / naturalWidth, boxHeight / naturalHeight);
      const coverScale = Math.max(boxWidth / naturalWidth, boxHeight / naturalHeight);
      let imageScale = fit === "cover" ? coverScale : 1;
      if (fit === "contain") imageScale = containScale;
      if (fit === "scale-down") imageScale = Math.min(1, containScale);
      drawWidth = naturalWidth * imageScale;
      drawHeight = naturalHeight * imageScale;
    }

    const [positionX, positionY] = objectPosition(style.objectPosition);
    const drawX = (boxWidth - drawWidth) * positionX;
    const drawY = (boxHeight - drawHeight) * positionY;
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    return canvas.toDataURL("image/png");
  }

  function objectPosition(value) {
    const tokens = String(value || "50% 50%").trim().split(/\s+/);
    const ratio = (token, fallback) => {
      if (token === "left" || token === "top") return 0;
      if (token === "right" || token === "bottom") return 1;
      if (token === "center") return 0.5;
      if (token?.endsWith("%")) return Math.min(1, Math.max(0, Number.parseFloat(token) / 100));
      return fallback;
    };
    return [ratio(tokens[0], 0.5), ratio(tokens[1] || tokens[0], 0.5)];
  }

  function utf8Base64(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }

  function hasInlineText(element, view) {
    let hasDirectText = false;
    let hasBlockChild = false;

    for (const node of element.childNodes) {
      if (node.nodeType === view.Node.TEXT_NODE && node.textContent.trim()) {
        hasDirectText = true;
        continue;
      }
      if (node.nodeType !== view.Node.ELEMENT_NODE) continue;
      if (node.tagName === "BR") {
        hasDirectText = true;
        continue;
      }
      const childStyle = view.getComputedStyle(node);
      if (childStyle.display === "none" || ["absolute", "fixed"].includes(childStyle.position)) continue;
      const display = childStyle.display;
      if (display !== "contents" && !display.startsWith("inline")) hasBlockChild = true;
    }

    if (hasDirectText) return true;
    if (hasBlockChild) return false;
    return [...element.children].some((child) => {
      const childStyle = view.getComputedStyle(child);
      return childStyle.display !== "none" && !["absolute", "fixed"].includes(childStyle.position) && hasInlineText(child, view);
    });
  }

  function textBoxAlignment(style) {
    const display = style.display;
    const isGrid = display === "grid" || display === "inline-grid";
    const isFlex = display === "flex" || display === "inline-flex";
    const horizontallyCentered = (isGrid && style.justifyItems === "center")
      || (isFlex && style.justifyContent === "center");
    const verticallyCentered = (isGrid || isFlex) && style.alignItems === "center";
    return {
      horizontal: horizontallyCentered ? "center" : style.textAlign,
      vertical: verticallyCentered ? "middle" : "top"
    };
  }

  function shouldUseRenderedTextBounds(element, style, view, bounds) {
    if (!bounds) return false;
    const display = style.display;
    if (!["flex", "inline-flex", "grid", "inline-grid"].includes(display)) return false;
    const hasDirectText = [...element.childNodes].some((node) => node.nodeType === view.Node.TEXT_NODE && node.textContent.trim());
    const hasPositionedChild = [...element.children].some((child) => {
      const childDisplay = view.getComputedStyle(child).display;
      return childDisplay !== "contents" && !childDisplay.startsWith("inline");
    });
    return hasDirectText && hasPositionedChild;
  }

  function extractRenderedText(element, view, colorReader, claimedTextNodes, includeBlockDescendants, scaleX, scaleY) {
    const tokens = [];
    const lineSpacings = [];
    const layoutState = { lineRect: null, previousRect: null, bounds: null };
    let hasSeparateInlineBoxes = false;

    function pushBreak(force) {
      if (tokens.length === 0 || (!force && tokens[tokens.length - 1].break)) return;
      tokens.push({ break: true });
      layoutState.lineRect = null;
      layoutState.previousRect = null;
    }

    function visit(parent, allowBlocks) {
      for (const node of parent.childNodes) {
        if (node.nodeType === view.Node.TEXT_NODE) {
          if (claimedTextNodes.has(node)) continue;
          claimedTextNodes.add(node);
          appendTextNodeTokens(node, view, colorReader, tokens, lineSpacings, layoutState, pushBreak, scaleX, scaleY);
          continue;
        }
        if (node.nodeType !== view.Node.ELEMENT_NODE) continue;

        const childStyle = view.getComputedStyle(node);
        if (childStyle.display === "none" || childStyle.visibility === "hidden" || Number(childStyle.opacity) === 0
          || ["absolute", "fixed"].includes(childStyle.position)) continue;
        if (node.tagName === "BR") {
          claimedTextNodes.add(node);
          pushBreak(true);
          continue;
        }

        // Atomic inline boxes own their width, padding and internal alignment.
        // Extract them separately, retaining the measured position of each
        // surrounding line (including lines that wrap back below a badge).
        if (childStyle.display.startsWith("inline-")) {
          hasSeparateInlineBoxes = true;
          pushBreak();
          continue;
        }
        const isInline = childStyle.display === "contents" || childStyle.display === "inline";
        if (!isInline && !allowBlocks) continue;
        if (!isInline) pushBreak();
        visit(node, allowBlocks);
        if (!isInline) pushBreak();
      }
    }

    visit(element, includeBlockDescendants);
    const lineSpacing = lineSpacings.find((value) => Number.isFinite(value) && value > 0);
    if (!hasSeparateInlineBoxes) return [{ tokens, bounds: layoutState.bounds, lineSpacing }];

    const fragments = [];
    let fragment = { tokens: [], bounds: null, lineSpacing: 0, positioned: true };
    function finishFragment() {
      if (fragment.tokens.length && fragment.bounds) fragments.push(fragment);
      fragment = { tokens: [], bounds: null, lineSpacing: 0, positioned: true };
    }
    for (const token of tokens) {
      if (token.break) {
        finishFragment();
      } else {
        fragment.tokens.push(token);
        if (token.bounds) fragment.bounds = unionRects(fragment.bounds, token.bounds);
        fragment.lineSpacing = Math.max(fragment.lineSpacing, token.lineSpacing || 0);
      }
    }
    finishFragment();
    return fragments;
  }

  function appendTextNodeTokens(node, view, colorReader, tokens, lineSpacings, layoutState, pushBreak, scaleX, scaleY) {
    const style = view.getComputedStyle(node.parentElement);
    const rawText = node.textContent || "";
    const whiteSpace = style.whiteSpace;
    const preservesNewlines = ["pre", "pre-wrap", "pre-line", "break-spaces"].includes(whiteSpace);
    const range = node.ownerDocument.createRange();
    const metrics = HtmlToPptxCore.textMetrics(style, scaleX, scaleY);
    const options = {
      fontFace: style.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
      fontSize: metrics.fontSize,
      charSpacing: metrics.charSpacing,
      color: colorReader(style.color, Number(style.opacity)),
      bold: Number.parseInt(style.fontWeight, 10) >= 600,
      italic: style.fontStyle === "italic",
      underline: style.textDecorationLine.includes("underline"),
      lang: "ja-JP"
    };
    const spacing = metrics.lineSpacing;
    if (spacing) lineSpacings.push(spacing);

    let buffer = "";
    let bufferBounds = null;
    function flush() {
      if (buffer) tokens.push({ text: buffer, whiteSpace, options, bounds: bufferBounds, lineSpacing: spacing });
      buffer = "";
      bufferBounds = null;
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
        layoutState.bounds = unionRects(layoutState.bounds, characterRect);
        if (HtmlToPptxCore.startsNewRenderedLine(layoutState.lineRect, layoutState.previousRect, characterRect, style.direction)) {
          flush();
          pushBreak();
        }
        layoutState.lineRect = unionRects(layoutState.lineRect, characterRect);
        layoutState.previousRect = characterRect;
        bufferBounds = unionRects(bufferBounds, characterRect);
      }
      buffer += character;
    }
    flush();
  }

  function unionRects(current, next) {
    if (!current) {
      return { left: next.left, top: next.top, right: next.right, bottom: next.bottom, width: next.width, height: next.height };
    }
    const left = Math.min(current.left, next.left);
    const top = Math.min(current.top, next.top);
    const right = Math.max(current.right, next.right);
    const bottom = Math.max(current.bottom, next.bottom);
    return { left, top, right, bottom, width: right - left, height: bottom - top };
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

  function extractElementShapes(style, rect, slideRect, scaleX, scaleY, layout, colorReader, shapes) {
    const bounds = scaledBounds(rect, slideRect, scaleX, scaleY, layout);
    if (!bounds) return;
    const { x: left, y: top, w: width, h: height } = bounds;
    const right = left + width;
    const bottom = top + height;

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
      return { kind: "line", x, y, w, h, color, cssWidth: borderWidth, width: Math.max(0.25, borderWidth * scale * 72), dashType };
    });

    const uniformBorder = borders.every(Boolean) && borders.slice(1).every((border) =>
      border.color === borders[0].color && border.cssWidth === borders[0].cssWidth && border.dashType === borders[0].dashType
    );
    if (hasBackground || uniformBorder) {
      const geometry = roundedShapeGeometry(style, rect, slideRect, scaleX, scaleY, bounds);
      if (geometry.kind === "custom" && geometry.points.length < 4) return;
      const shape = {
        kind: "rect",
        x: left,
        y: top,
        w: width,
        h: height,
        color: background,
        ...geometry
      };
      if (uniformBorder) {
        shape.lineColor = borders[0].color;
        shape.lineWidth = borders.reduce((sum, border) => sum + border.width, 0) / borders.length;
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

  function roundedShapeGeometry(style, rect, slideRect, scaleX, scaleY, bounds) {
    const radii = ["TopLeft", "TopRight", "BottomRight", "BottomLeft"].map((corner) => {
      const parts = String(style[`border${corner}Radius`] || "0").split(/\s+/);
      const length = (value, size) => Math.max(0, Number.parseFloat(value) || 0) * (value.endsWith("%") ? size / 100 : 1);
      return [length(parts[0], rect.width), length(parts[1] || parts[0], rect.height)];
    });
    if (radii.every(([rx, ry]) => rx === 0 || ry === 0)) return {};
    const ratio = Math.min(1,
      rect.width / (radii[0][0] + radii[1][0]), rect.width / (radii[3][0] + radii[2][0]),
      rect.height / (radii[0][1] + radii[3][1]), rect.height / (radii[1][1] + radii[2][1]));
    for (const radius of radii) { radius[0] *= ratio; radius[1] *= ratio; }
    const clipped = rect.left < slideRect.left || rect.top < slideRect.top || rect.right > slideRect.right || rect.bottom > slideRect.bottom;
    if (!clipped && isEllipse(style, rect)) return { kind: "ellipse" };
    const uniform = radii.every(([rx, ry]) => Math.abs(rx - radii[0][0]) < 0.01 && Math.abs(ry - rx) < 0.01);
    if (!clipped && uniform) return { rounded: true, rectRadius: radii[0][0] * Math.min(scaleX, scaleY) };

    // Clipping a rounded bounding box would reshape the decoration. Clip the
    // actual contour instead; retain it as an editable native freeform shape.
    const centers = [[radii[0][0], radii[0][1]], [rect.width - radii[1][0], radii[1][1]],
      [rect.width - radii[2][0], rect.height - radii[2][1]], [radii[3][0], rect.height - radii[3][1]]];
    let points = [];
    for (let corner = 0; corner < 4; corner++) {
      for (let step = 0; step <= 24; step++) {
        const angle = Math.PI + corner * Math.PI / 2 + step * Math.PI / 48;
        points.push({
          x: (rect.left - slideRect.left + centers[corner][0] + radii[corner][0] * Math.cos(angle)) * scaleX - bounds.x,
          y: (rect.top - slideRect.top + centers[corner][1] + radii[corner][1] * Math.sin(angle)) * scaleY - bounds.y
        });
      }
    }
    for (const [axis, limit, sign] of [["x", 0, 1], ["x", bounds.w, -1], ["y", 0, 1], ["y", bounds.h, -1]]) {
      const output = [];
      for (let index = 0; index < points.length; index++) {
        const previous = points[(index + points.length - 1) % points.length];
        const current = points[index];
        const previousInside = (previous[axis] - limit) * sign >= 0;
        const currentInside = (current[axis] - limit) * sign >= 0;
        if (previousInside !== currentInside) {
          const fraction = (limit - previous[axis]) / (current[axis] - previous[axis]);
          output.push({ x: previous.x + fraction * (current.x - previous.x), y: previous.y + fraction * (current.y - previous.y) });
        }
        if (currentInside) output.push(current);
      }
      points = output;
    }
    return { kind: "custom", points: [...points, { close: true }] };
  }

  function scaledBounds(rect, slideRect, scaleX, scaleY, layout) {
    const left = Math.max(0, (rect.left - slideRect.left) * scaleX);
    const top = Math.max(0, (rect.top - slideRect.top) * scaleY);
    const right = Math.min(layout.width, (rect.right - slideRect.left) * scaleX);
    const bottom = Math.min(layout.height, (rect.bottom - slideRect.top) * scaleY);
    const width = right - left;
    const height = bottom - top;
    if (width <= 0 || height <= 0) return null;
    return { x: left, y: top, w: width, h: height };
  }

  function isEllipse(style, rect) {
    const radii = [
      style.borderTopLeftRadius,
      style.borderTopRightRadius,
      style.borderBottomRightRadius,
      style.borderBottomLeftRadius
    ];
    const allPercentage = radii.every((radius) => Number.parseFloat(radius) >= 45 && String(radius).includes("%"));
    if (allPercentage) return true;
    if (Math.abs(rect.width - rect.height) > Math.max(rect.width, rect.height) * 0.1) return false;
    const minimumSize = Math.min(rect.width, rect.height);
    return radii.every((radius) => Number.parseFloat(radius) >= minimumSize * 0.45);
  }

  function prepareZipDownload(buffer, name) {
    clearDownload();
    const blob = new Blob([buffer], { type: "application/zip" });
    downloadUrl = URL.createObjectURL(blob);
    for (const ui of conversionUis) {
      ui.downloadLink.href = downloadUrl;
      ui.downloadLink.download = name;
      ui.downloadLink.hidden = false;
    }
  }

  function clearDownload() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
    for (const ui of conversionUis) {
      ui.downloadLink.removeAttribute("href");
      ui.downloadLink.removeAttribute("download");
      ui.downloadLink.hidden = true;
    }
  }

  window.addEventListener("pagehide", clearDownload, { once: true });

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  refreshPreview();
})();
