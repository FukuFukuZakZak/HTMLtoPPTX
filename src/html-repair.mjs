import { Parser } from "parse5";
export { editorInputFileName } from "./editor-filename.mjs";

const VOID = new Set("area base br col embed hr img input link meta param source track wbr".split(" "));
const OPTIONAL = new Set("html head body p li dt dd rt rp optgroup option colgroup thead tbody tfoot tr td th".split(" "));
const RAW = new Set("script style textarea title xmp iframe noembed noframes plaintext".split(" "));
const SPECIAL = new Set("svg math template pre".split(" "));
// Inline/text-formatting boundaries cannot be recovered from missing markup:
// e.g. <b>Label body</div> gives no clue where bold should end.
const STRUCTURAL = new Set("div section article main header footer aside nav ul ol dl h1 h2 h3 h4 h5 h6 table caption form fieldset legend figure figcaption blockquote details summary address center dialog menu".split(" "));
const IGNORED_ERRORS = new Set(["missing-doctype", "non-conforming-doctype", "open-elements-left-after-eof", "closing-of-element-with-open-child-elements"]);
const HTML_NS = "http://www.w3.org/1999/xhtml";
export const MAX_LENGTH = 2_000_000;

// Use the HTML tokenizer's real source positions: '<' in CSS, JS, comments or
// quoted attributes must never become a tag. Parser also manages raw-text modes.
class SourceParser extends Parser {
  tokens = [];
  onStartTag(token) {
    super.onStartTag(token);
    this.tokens.push({ name: token.tagName, end: false, selfClosing: token.ackSelfClosing, ...token.location });
  }
  onEndTag(token) {
    this.tokens.push({ name: token.tagName, end: true, ...token.location });
    super.onEndTag(token);
  }
}

function inspect(source) {
  const errors = [];
  const parser = new SourceParser({ sourceCodeLocationInfo: true, scriptingEnabled: true, onParseError: error => errors.push(error) });
  parser.tokenizer.write(source, true);
  const optionalEnds = new Map();
  const protectedRanges = [];
  const pending = [parser.document];
  while (pending.length) {
    const node = pending.pop();
    const loc = node.sourceCodeLocation;
    if (loc?.startTag) {
      if (OPTIONAL.has(node.tagName) && !loc.endTag) optionalEnds.set(loc.startOffset, loc.endOffset);
      if (SPECIAL.has(node.tagName) || node.namespaceURI !== HTML_NS) {
        protectedRanges.push([loc.startOffset, loc.endOffset, node.tagName]);
        if (!loc.endTag && !source.slice(loc.startTag.startOffset, loc.startTag.endOffset).endsWith("/>")) {
          errors.push({ code: "unclosed-protected-element", startLine: loc.startLine, startOffset: loc.startOffset });
        }
      }
      if (RAW.has(node.tagName) && !loc.endTag) errors.push({ code: "unclosed-raw-text", startLine: loc.startLine });
    }
    pending.push(...(node.childNodes || []));
    if (node.content) pending.push(node.content);
  }
  // Table insertion modes may reprocess the same end token through onEndTag.
  // Each source tag must be counted once, in source order.
  const tokens = [...new Map(parser.tokens.filter(token => Number.isInteger(token.startOffset)).map(token => [`${token.startOffset}:${token.end}`, token])).values()].sort((a, b) => a.startOffset - b.startOffset);
  return { tokens, optionalEnds, protectedRanges, errors };
}

function lineIndent(source, token) {
  const start = source.lastIndexOf("\n", token.startOffset - 1) + 1;
  const prefix = source.slice(start, token.startOffset);
  return /^[\t ]*$/.test(prefix) ? prefix.replace(/\t/g, "    ").length : null;
}

/** Source-preserving suggestions, not reconstruction of missing content. */
export function repairHtml(original) {
  const result = { html: original, changes: [], warnings: [], blocked: false };
  if (!original.trim()) return result;
  if (original.length > MAX_LENGTH) {
    result.blocked = true;
    result.warnings.push("HTMLが大きいため簡易補正の対象外です（上限200万文字）。");
    return result;
  }
  let source = original;
  // Only remove a complete, standalone Markdown wrapper. Preserve its contents.
  const fence = /^(\s*)(`{3,}|~{3,})(?:html)?[\t ]*\r?\n([\s\S]*?)\r?\n\2[\t ]*(\s*)$/i.exec(source);
  if (fence) source = fence[1] + fence[3] + fence[4];
  const parsed = inspect(source);
  const warn = message => { if (!result.warnings.includes(message)) result.warnings.push(message); };
  const unsafe = parsed.errors.filter(error => !IGNORED_ERRORS.has(error.code) && error.code !== "end-tag-without-matching-open-element");
  if (unsafe.length) {
    result.blocked = true;
    for (const error of unsafe.slice(0, 6)) warn(`${error.startLine || 1}行目付近：タグ・属性・コメントの区切りを確認してください。簡易補正では変更しません。`);
    return result;
  }

  const counts = new Map();
  const protectedAt = offset => parsed.protectedRanges.some(([start, end]) => start <= offset && offset < end);
  const tokens = parsed.tokens.filter(token => !protectedAt(token.startOffset));
  for (const token of tokens) {
    if (!VOID.has(token.name) && !OPTIONAL.has(token.name) && !token.selfClosing) {
      counts.set(token.name, (counts.get(token.name) || 0) + (token.end ? -1 : 1));
    }
  }
  const stack = [];
  const insertions = new Map();
  const close = (node, offset, reason) => {
    if (OPTIONAL.has(node.name)) return;
    if (!STRUCTURAL.has(node.name)) {
      warn(`${node.startLine}行目付近：<${node.name}>の閉じ位置を特定できません。文字の装飾範囲などを確認してください。`);
      return;
    }
    if ((counts.get(node.name) || 0) <= 0) {
      warn(`${node.startLine}行目付近：<${node.name}>の入れ子を確認してください。`);
      return;
    }
    counts.set(node.name, counts.get(node.name) - 1);
    // Keep indentation/newlines outside the closed element; never reformat source.
    while (offset > node.endOffset && /\s/.test(source[offset - 1])) offset--;
    insertions.set(offset, (insertions.get(offset) || "") + `</${node.name}>`);
    result.changes.push({ line: node.startLine, tag: node.name, reason, offset, text: `</${node.name}>` });
  };
  for (const token of tokens) {
    // Honor legal optional ends using the standards parser's actual boundaries.
    const implied = stack.findIndex(node => parsed.optionalEnds.has(node.startOffset) && parsed.optionalEnds.get(node.startOffset) <= token.startOffset);
    if (implied >= 0) {
      while (stack.length > implied) close(stack.pop(), token.startOffset, "親要素の区切りで補完");
    }
    if (!token.end) {
      const indent = lineIndent(source, token);
      // Indentation is a hint only, and only used for tag names with a real
      // deficit. Balanced markup, minified nesting, and raw/foreign text stay intact.
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (indent === null || top.indent === null || token.startLine <= top.endLine || indent > top.indent || OPTIONAL.has(top.name) || (counts.get(top.name) || 0) <= 0) break;
        close(stack.pop(), token.startOffset, "改行・字下げから閉じ位置を推定");
      }
      if (!VOID.has(token.name) && !token.selfClosing) stack.push({ ...token, indent });
      continue;
    }
    const index = stack.findLastIndex(node => node.name === token.name);
    if (index < 0) {
      if (!VOID.has(token.name)) warn(`${token.startLine}行目付近：</${token.name}>に対応する開始タグを確認してください。`);
      continue;
    }
    while (stack.length - 1 > index) close(stack.pop(), token.startOffset, "親の閉じタグの前で補完");
    stack.pop();
  }
  while (stack.length) close(stack.pop(), source.length, "文末で補完（表示を確認）");
  for (const error of parsed.errors) {
    if (error.code === "end-tag-without-matching-open-element") warn(`${error.startLine}行目付近：開始タグの不足や閉じタグの順序を確認してください。`);
  }
  if (parsed.errors.some(error => error.code !== "missing-doctype" && protectedAt(error.startOffset))) {
    warn("SVG・数式・テンプレート・整形済みテキスト内は補正対象外です。表示を確認してください。");
  }
  // Ambiguous crossing tags/attributes may invalidate otherwise plausible edits.
  if (result.warnings.length) {
    result.changes = [];
    result.blocked = true;
    return result;
  }
  let repaired = source;
  for (const [offset, text] of [...insertions].sort((a, b) => b[0] - a[0])) repaired = repaired.slice(0, offset) + text + repaired.slice(offset);
  // Stable ordering matches concatenation of tags inserted at the same offset.
  // Offsets are UTF-16 indices, just like textarea selectionStart/selectionEnd.
  let added = 0;
  let cursor = 0;
  let finalLine = 1;
  for (const change of [...result.changes].sort((a, b) => a.offset - b.offset)) {
    finalLine += (source.slice(cursor, change.offset).match(/\r\n|\r|\n/g) || []).length;
    cursor = change.offset;
    change.start = change.offset + added;
    change.end = change.start + change.text.length;
    change.finalLine = finalLine;
    added += change.text.length;
  }
  if (fence) result.changes.unshift({ line: 1, reason: "HTMLを囲むコード枠を除去", tag: null });
  result.html = repaired;
  return result;
}
