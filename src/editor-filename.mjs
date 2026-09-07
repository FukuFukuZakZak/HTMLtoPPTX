import { parse } from "parse5";

const HTML_NS = "http://www.w3.org/1999/xhtml";

/** Name only the editor's virtual input; parsing never executes or fetches HTML. */
export function editorInputFileName(source) {
  const document = parse(source);
  const child = (node, name) => node?.childNodes?.find(item => item.tagName === name && item.namespaceURI === HTML_NS);
  const title = child(child(child(document, "html"), "head"), "title");
  let stem = (title?.childNodes || []).filter(node => node.nodeName === "#text").map(node => node.value).join("")
    .replace(/\s+/gu, " ").trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, "_");
  // 60 Unicode code points leave room for the existing A4 suffix and extension,
  // even when every character uses four UTF-8 bytes. Never split a surrogate pair.
  stem = Array.from(stem).slice(0, 60).join("").replace(/[. ]+$/g, "");
  if (!stem) stem = "貼り付けHTML";
  if (/^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(stem)) stem = `_${stem}`;
  return `${stem}.html`;
}
