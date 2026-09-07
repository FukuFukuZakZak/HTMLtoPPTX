/* The native textarea owns text, selection, IME and history. This inert layer
 * only paints repair backgrounds and measures the rows used by the gutter. */
function EditorDisplay(textarea) {
  "use strict";
  const mirror = document.getElementById("editor-mirror");
  const gutter = document.getElementById("editor-lines");
  let snapshot = null;
  let repairs = [];
  let rendered = null;
  let dirty = true;
  let pending = 0;

  function syncScroll() {
    mirror.style.transform = `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`;
    gutter.style.transform = `translateY(${-textarea.scrollTop}px)`;
  }

  function render() {
    pending = 0;
    if (!textarea.clientWidth) return;
    const source = textarea.value;
    if (snapshot !== source) { snapshot = null; repairs = []; }
    mirror.style.width = `${textarea.clientWidth}px`;
    if (dirty || rendered !== source) {
      dirty = false;
      rendered = source;
      const rows = document.createDocumentFragment();
      const numbers = document.createDocumentFragment();
      const ranges = [...repairs].sort((a, b) => a.start - b.start);
      let offset = 0;
      let index = 0;
      for (const [lineIndex, text] of source.split("\n").entries()) {
        const row = document.createElement("div");
        row.className = "editor-source-line";
        const number = document.createElement("div");
        number.textContent = String(lineIndex + 1);
        number.dataset.line = String(lineIndex + 1);
        let cursor = offset;
        const end = offset + text.length;
        while (index < ranges.length && ranges[index].start < end) {
          const range = ranges[index++];
          row.append(source.slice(cursor, range.start));
          const mark = document.createElement("mark");
          mark.textContent = source.slice(range.start, range.end);
          mark.dataset.start = String(range.start);
          row.append(mark);
          number.classList.add("has-repair");
          cursor = range.end;
        }
        row.append(source.slice(cursor, end) || (text ? "" : "\u200b"));
        rows.append(row);
        numbers.append(number);
        offset = end + 1;
      }
      mirror.replaceChildren(rows);
      gutter.replaceChildren(numbers);
    }
    // Read all heights before writing any, avoiding per-line layout thrashing.
    const heights = Array.from(mirror.children, row => row.getBoundingClientRect().height);
    Array.from(gutter.children).forEach((number, i) => { number.style.height = `${heights[i]}px`; });
    syncScroll();
  }

  function schedule() {
    if (!pending) pending = requestAnimationFrame(render);
  }
  textarea.addEventListener("input", () => {
    snapshot = null;
    repairs = [];
    dirty = true;
    // Remove color immediately, including during composition/history input.
    mirror.querySelectorAll("mark").forEach(mark => mark.replaceWith(mark.textContent));
    schedule();
  });
  textarea.addEventListener("scroll", syncScroll, { passive: true });
  new ResizeObserver(schedule).observe(textarea);
  document.fonts.ready.then(schedule);
  document.fonts.addEventListener("loadingdone", schedule);
  schedule();

  return {
    highlight(source, changes) {
      snapshot = source;
      repairs = changes.filter(change => Number.isInteger(change.start) && source.slice(change.start, change.end) === change.text);
      dirty = true;
      render();
    },
    goTo(change) {
      if (snapshot !== textarea.value) return;
      render();
      const mark = Array.from(mirror.querySelectorAll("mark")).find(item => Number(item.dataset.start) === change.start);
      if (!mark) return;
      textarea.focus({ preventScroll: true });
      textarea.setSelectionRange(change.start, change.end);
      const top = mark.getBoundingClientRect().top - mirror.getBoundingClientRect().top;
      textarea.scrollTop = Math.max(0, top - textarea.clientHeight / 3);
      syncScroll();
    }
  };
}
