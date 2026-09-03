(function () {
  "use strict";

  const fileInput = document.getElementById("html-file");
  const dropZone = document.getElementById("drop-zone");
  const fileRow = document.getElementById("file-row");
  const fileName = document.getElementById("file-name");
  const fileSize = document.getElementById("file-size");
  const convertButton = document.getElementById("convert-button");
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
    const controller = new AbortController();
    let worker = null;
    let frame = null;

    activeJob = {
      abort() {
        controller.abort();
        if (worker) worker.terminate();
        if (frame) frame.remove();
        finishJob("変換をキャンセルしました。", false);
      }
    };

    convertButton.disabled = true;
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
      frame = await createRenderFrame(html, controller.signal);
      const slideElements = Array.from(frame.contentDocument.querySelectorAll(".slide"));
      if (slideElements.length === 0) {
        throw new Error(".slide 要素が見つかりません。HTML内に class=\"slide\" を追加してください。");
      }

      progress.max = slideElements.length;
      progress.value = 0;
      progressCount.textContent = `0 / ${slideElements.length} 枚`;
      const slideModels = [];

      for (let index = 0; index < slideElements.length; index += 1) {
        if (controller.signal.aborted) return;
        progressLabel.textContent = `スライド ${index + 1} を解析中`;
        slideModels.push(extractSlide(slideElements[index]));
        await nextFrame();
      }

      frame.remove();
      frame = null;
      progress.value = 0;
      progressLabel.textContent = "PPTXへ変換中";
      progressDetail.textContent = `${slideElements.length}枚のスライドを順番に変換します`;

      worker = new Worker("./converter-worker.js");
      worker.onmessage = (event) => {
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
          downloadPptx(data.buffer, HtmlToPptxCore.outputFileName(sourceFile.name));
          worker.terminate();
          worker = null;
          finishJob(`${slideElements.length}枚のスライドをPPTXに変換しました。`, false);
        } else if (data.type === "error") {
          if (worker) worker.terminate();
          worker = null;
          finishJob(data.message || "PPTXの生成に失敗しました。", true);
        }
      };
      worker.onerror = () => {
        if (worker) worker.terminate();
        worker = null;
        finishJob("変換処理を開始できませんでした。", true);
      };
      worker.postMessage({ type: "convert", slides: slideModels, title: sourceFile.name });
    } catch (error) {
      if (!controller.signal.aborted) {
        if (frame) frame.remove();
        finishJob(error instanceof Error ? error.message : String(error), true);
      }
    }
  });

  function finishJob(text, isError) {
    activeJob = null;
    convertButton.disabled = !selectedFile;
    cancelButton.hidden = true;
    if (isError) {
      progressLabel.textContent = "変換できませんでした";
    } else {
      progressLabel.textContent = text.startsWith("変換をキャンセル") ? "キャンセルしました" : "変換完了";
    }
    progressDetail.textContent = text;
    setMessage(text, isError);
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

  function extractSlide(slideElement) {
    const view = slideElement.ownerDocument.defaultView;
    const slideRect = slideElement.getBoundingClientRect();
    if (slideRect.width <= 0 || slideRect.height <= 0) {
      throw new Error("幅または高さが0の .slide 要素があります。表示可能な16:9サイズを指定してください。");
    }

    const scaleX = HtmlToPptxCore.SLIDE_WIDTH_IN / slideRect.width;
    const scaleY = HtmlToPptxCore.SLIDE_HEIGHT_IN / slideRect.height;
    const texts = [];

    for (const element of [slideElement, ...slideElement.querySelectorAll("*")]) {
      const directText = Array.from(element.childNodes)
        .filter((node) => node.nodeType === view.Node.TEXT_NODE)
        .map((node) => node.textContent)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (!directText) continue;

      const style = view.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0 || rect.width <= 0 || rect.height <= 0) continue;

      const x = (rect.left - slideRect.left) * scaleX;
      const y = (rect.top - slideRect.top) * scaleY;
      if (x >= HtmlToPptxCore.SLIDE_WIDTH_IN || y >= HtmlToPptxCore.SLIDE_HEIGHT_IN || x + rect.width * scaleX <= 0 || y + rect.height * scaleY <= 0) continue;

      texts.push({
        text: directText,
        x,
        y,
        w: Math.min(rect.width * scaleX, HtmlToPptxCore.SLIDE_WIDTH_IN - Math.max(0, x)),
        h: Math.min(rect.height * scaleY, HtmlToPptxCore.SLIDE_HEIGHT_IN - Math.max(0, y)),
        fontFace: style.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
        fontSize: Number.parseFloat(style.fontSize) * 0.75,
        color: style.color,
        bold: Number.parseInt(style.fontWeight, 10) >= 600,
        italic: style.fontStyle === "italic",
        align: style.textAlign
      });
    }

    return { background: view.getComputedStyle(slideElement).backgroundColor, texts };
  }

  function downloadPptx(buffer, name) {
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }
})();
