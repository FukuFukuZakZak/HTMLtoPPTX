(function () {
  "use strict";

  // Preview owns its document and viewport; it never edits the source or conversion frames.
  window.HtmlPreview = function ({ resolvePages, preferredDisplay, waitForImages }) {
    const surface = document.getElementById("preview-surface");
    const paper = document.getElementById("preview-page");
    const empty = document.getElementById("preview-empty");
    const status = document.getElementById("preview-status");
    const previous = document.getElementById("preview-previous");
    const next = document.getElementById("preview-next");
    const select = document.getElementById("preview-select");
    const count = document.getElementById("preview-count");
    const minus = document.getElementById("preview-minus");
    const plus = document.getElementById("preview-plus");
    const fit = document.getElementById("preview-fit");
    const percent = document.getElementById("preview-percent");
    let frame, pages = [], display = "block", index = 0, restore, generation = 0;
    let width = 0, height = 0, scale = 1, fitted = true, x = 0, y = 0, drag = null;
    let fallback = false;
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const fitScale = () => Math.min((surface.clientWidth - 32) / width, (surface.clientHeight - 32) / height, 1);

    function endDrag() {
      const id = drag?.id;
      drag = null;
      surface.classList.remove("is-panning");
      if (id != null && surface.hasPointerCapture(id)) surface.releasePointerCapture(id);
    }

    function paint() {
      const ready = width > 0 && height > 0;
      previous.disabled = !ready || index === 0;
      next.disabled = !ready || index === pages.length - 1;
      select.disabled = !ready || pages.length < 2;
      fit.disabled = !ready;
      minus.disabled = !ready || scale <= Math.min(fitScale(), 0.1) + 0.00001;
      plus.disabled = !ready || scale >= 4;
      percent.textContent = ready ? `${Math.round(scale * 100)}%` : "—";
      if (!ready) return;
      const limitX = Math.max(0, (width * scale - surface.clientWidth) / 2 + 16);
      const limitY = Math.max(0, (height * scale - surface.clientHeight) / 2 + 16);
      x = clamp(x, -limitX, limitX);
      y = clamp(y, -limitY, limitY);
      paper.style.transform = `translate(${(surface.clientWidth - width * scale) / 2 + x}px, ${(surface.clientHeight - height * scale) / 2 + y}px) scale(${scale})`;
      surface.classList.toggle("can-pan", limitX > 0 || limitY > 0);
    }

    function fitPage() {
      if (!width) return;
      endDrag();
      fitted = true;
      scale = Math.max(0.001, fitScale());
      x = y = 0;
      paint();
    }

    function zoom(factor) {
      if (!width) return;
      const old = scale;
      scale = clamp(scale * factor, Math.max(0.001, Math.min(fitScale(), 0.1)), 4);
      fitted = false;
      x *= scale / old;
      y *= scale / old;
      paint();
    }

    function showPage(value) {
      if (!pages.length) return;
      endDrag();
      restore?.();
      index = clamp(value, 0, pages.length - 1);
      const target = pages[index];
      const doc = frame.contentDocument;
      frame.style.width = "1600px";
      frame.style.height = "900px";
      const undoPage = HtmlToPptxCore.showOnlySlideForMeasurement(pages, target, display);
      const ancestors = [];
      for (let element = target.parentElement; element; element = element.parentElement) ancestors.push(element);
      const states = ancestors.map(HtmlToPptxCore.captureElementState);
      const bodyState = HtmlToPptxCore.captureElementState(doc.body);
      // Viewer wrappers often clip or center a fixed slide. Keep its layout and remove only clipping.
      for (const element of ancestors) {
        element.style.setProperty("overflow", "visible", "important");
        element.style.setProperty("clip-path", "none", "important");
      }
      let rect = target.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      if (fallback) {
        width = Math.max(width, doc.documentElement.scrollWidth, doc.body.scrollWidth);
        height = Math.max(height, doc.documentElement.scrollHeight, doc.body.scrollHeight);
      }
      // Enlarge the browsing viewport for tall/wide fixed pages before moving the page to its origin.
      frame.style.width = `${Math.max(1600, Math.ceil(width))}px`;
      frame.style.height = `${Math.max(900, Math.ceil(height))}px`;
      rect = target.getBoundingClientRect();
      if (!fallback) { width = Math.max(1, rect.width); height = Math.max(1, rect.height); }
      doc.body.style.setProperty("transform-origin", "0 0", "important");
      doc.body.style.setProperty("transform", `translate(${-rect.left}px, ${-rect.top}px)`, "important");
      restore = () => {
        HtmlToPptxCore.restoreElementState(doc.body, bodyState);
        ancestors.forEach((element, i) => HtmlToPptxCore.restoreElementState(element, states[i]));
        undoPage();
      };
      paper.style.width = `${width}px`;
      paper.style.height = `${height}px`;
      paper.hidden = false;
      select.value = String(index);
      count.textContent = `/ ${pages.length}`;
      status.textContent = fallback ? "ページ区切りを検出できないため、文書全体を表示しています。" : `${index + 1} / ${pages.length} ページ`;
      fitPage();
    }

    function documentSource(html) {
      const doc = new DOMParser().parseFromString(html, "text/html");
      // Scripts remain disabled in the sandbox. Remove navigation and focus side effects as well.
      doc.querySelectorAll("script, base, iframe, object, embed, meta[http-equiv]").forEach(element => element.remove());
      doc.querySelectorAll("[autofocus]").forEach(element => element.removeAttribute("autofocus"));
      const policy = doc.createElement("meta");
      policy.httpEquiv = "Content-Security-Policy";
      policy.content = "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
      doc.head.prepend(policy);
      return `<!doctype html>\n${doc.documentElement.outerHTML}`;
    }

    function load(html) {
      const token = ++generation;
      endDrag();
      restore = null;
      pages = [];
      width = height = 0;
      paper.hidden = true;
      frame?.remove();
      select.replaceChildren(new Option("ページ", "0"));
      count.textContent = "/ —";
      empty.hidden = Boolean(html.trim());
      status.textContent = html.trim() ? "プレビューを読み込んでいます…" : "HTMLを貼り付けると、ページ全体を表示します。";
      paint();
      if (!html.trim()) return;
      frame = document.createElement("iframe");
      const current = frame;
      frame.id = "html-preview";
      frame.title = "貼り付けたHTMLのプレビュー";
      frame.setAttribute("sandbox", "allow-same-origin");
      frame.setAttribute("referrerpolicy", "no-referrer");
      frame.setAttribute("tabindex", "-1");
      frame.setAttribute("inert", "");
      frame.style.width = "1600px";
      frame.style.height = "900px";
      frame.addEventListener("load", async () => {
        let timeout;
        try {
          const doc = current.contentDocument;
          if (!doc) throw new Error("プレビューを読み込めませんでした。");
          await Promise.race([
            Promise.all([doc.fonts?.ready, waitForImages(doc)]),
            new Promise(resolve => { timeout = setTimeout(resolve, 3000); })
          ]);
          if (token !== generation) return;
          fallback = false;
          try { pages = resolvePages(doc).elements; }
          catch { pages = [doc.body]; fallback = true; }
          display = preferredDisplay(pages);
          select.replaceChildren(...pages.map((_, i) => new Option(`${i + 1} ページ`, String(i))));
          showPage(0);
        } catch {
          if (token === generation) {
            width = height = 0;
            status.textContent = "プレビューを表示できません。HTMLを確認して貼り付け直してください。";
            paint();
          }
        } finally { clearTimeout(timeout); }
      }, { once: true });
      frame.srcdoc = documentSource(html);
      // Lay out even while the paper is being prepared, avoiding Chromium's display:none frame bug.
      paper.hidden = false;
      paper.style.width = "0px";
      paper.style.height = "0px";
      paper.append(frame);
    }

    previous.addEventListener("click", () => showPage(index - 1));
    next.addEventListener("click", () => showPage(index + 1));
    select.addEventListener("change", () => showPage(Number(select.value)));
    minus.addEventListener("click", () => zoom(1 / 1.25));
    plus.addEventListener("click", () => zoom(1.25));
    fit.addEventListener("click", fitPage);
    surface.addEventListener("pointerdown", event => {
      if (!width || event.button !== 0 || !event.isPrimary) return;
      surface.focus({ preventScroll: true });
      if (!surface.classList.contains("can-pan")) return;
      event.preventDefault();
      drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x, y };
      surface.setPointerCapture(event.pointerId);
      surface.classList.add("is-panning");
    });
    surface.addEventListener("pointermove", event => {
      if (!drag || event.pointerId !== drag.id) return;
      x = drag.x + event.clientX - drag.startX;
      y = drag.y + event.clientY - drag.startY;
      paint();
    });
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) surface.addEventListener(name, endDrag);
    surface.addEventListener("keydown", event => {
      if (event.ctrlKey || event.metaKey || event.altKey || !width) return;
      const actions = {
        "+": () => zoom(1.25), "=": () => zoom(1.25), "-": () => zoom(1 / 1.25), "0": fitPage,
        PageDown: () => showPage(index + 1), PageUp: () => showPage(index - 1),
        Home: () => showPage(0), End: () => showPage(pages.length - 1),
        ArrowLeft: () => { x += 48; paint(); }, ArrowRight: () => { x -= 48; paint(); },
        ArrowUp: () => { y += 48; paint(); }, ArrowDown: () => { y -= 48; paint(); }
      };
      if (actions[event.key]) { event.preventDefault(); actions[event.key](); }
    });
    new ResizeObserver(() => { if (fitted) fitPage(); else paint(); }).observe(surface);
    paint();
    return { load };
  };
})();
