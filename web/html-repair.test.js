const test = require("node:test");
const assert = require("node:assert/strict");
const repair = async source => (await import("../src/html-repair.mjs")).repairHtml(source);

test("repair ranges point to final inserted tags after fences, same-offset edits and Unicode", async () => {
  for (const source of [
    '<div><section>日本語😀\n',
    '```html\r\n<section>\r\n  <div>😀\r\n  <div>次</div>\r\n</section>\r\n```',
    '<section>\n  <div>one\n  <div>two\n</section>',
    '<div>\r<section>本文\r',
    '~~~html\n<div>本文</div>\n~~~',
  ]) {
    const result = await repair(source);
    assert.equal(result.blocked, false);
    const ranges = result.changes.filter(change => change.tag).sort((a, b) => a.start - b.start);
    let previous = 0;
    for (const change of ranges) {
      assert.equal(result.html.slice(change.start, change.end), change.text);
      assert.ok(change.start >= previous);
      assert.equal(change.finalLine, 1 + (result.html.slice(0, change.start).match(/\r\n|\r|\n/g) || []).length);
      previous = change.end;
    }
    let restored = result.html;
    for (const change of [...ranges].reverse()) restored = restored.slice(0, change.start) + restored.slice(change.end);
    const expected = source.replace(/^(\s*)(`{3,}|~{3,})(?:html)?[\t ]*\r?\n([\s\S]*?)\r?\n\2[\t ]*(\s*)$/i, '$1$3$4');
    assert.equal(restored, expected);
  }
  const result = await repair('<div>\n  <section>\n本文');
  assert.deepEqual(result.changes.map(change => change.finalLine), [3, 3]);
  assert.deepEqual(result.changes.map(change => change.line), [2, 1]);
});

test("repair closes ordinary tags at ancestor boundaries and EOF without reformatting", async () => {
  assert.equal((await repair('<section id="s"><div>日本語 &amp; 本文</section>')).html, '<section id="s"><div>日本語 &amp; 本文</div></section>');
  assert.equal((await repair('<div><section>本文\n')).html, '<div><section>本文</section></div>\n');
});

test("repair uses indentation only for unbalanced tag names", async () => {
  const broken = '<section>\n  <div>one\n  <div>two</div>\n</section>';
  assert.equal((await repair(broken)).html, '<section>\n  <div>one</div>\n  <div>two</div>\n</section>');
  const valid = '<section>\n<div>\n<div>nested</div>\n</div>\n</section>';
  assert.equal((await repair(valid)).html, valid);
});

test("valid optional ends, void elements, foreign content and raw text remain unchanged", async () => {
  for (const source of ['<ul><li>A<li>B</ul>', '<p>A<p>B', '<table><tr><td>A<td>B</table>', '<div><br><img src="x"></div>', '<svg viewBox="0 0 1 1"><path d="M0 0"/></svg>', '<script>const s="<div>"; if (1 < 2) {}</script><style>.x::after{content:"<span>"}</style>', '<div data-text="<tag>"><!-- <div> --></div>']) {
    const result = await repair(source);
    assert.equal(result.html, source);
    assert.equal(result.blocked, false, JSON.stringify(result));
  }
});

test("unfinished raw text, attributes, comments, and crossed tags are warning-only", async () => {
  for (const source of ['<style>p{color:red}<div>body</div>', '<script>const x=1;', '<div class="oops>body', '<!-- unfinished <div>', '<b><i>x</b></i>', '<section>text</div></section>', '<div><b>label body</div>', '<div><span>text</div>']) {
    const result = await repair(source);
    assert.equal(result.html, source);
    assert.equal(result.blocked, true, source);
    assert.equal(result.changes.length, 0);
  }
});

test("complete Markdown fence removal preserves contents; prose is never discarded", async () => {
  assert.equal((await repair('```html\n<div>日本語</div>\n```')).html, '<div>日本語</div>');
  assert.equal((await repair('~~~html\n<div>日本語</div>\n~~~')).html, '<div>日本語</div>');
  const prose = '説明です。\n```html\n<div>日本語</div>\n```';
  assert.equal((await repair(prose)).html, prose);
});

test("repeated repair is idempotent and independent of history", async () => {
  for (const source of ['<section><div>本文</section>', '<div><b>text', '```html\n<div>text\n```']) {
    const first = await repair(source);
    const second = await repair(first.html);
    assert.equal(second.html, first.html);
    assert.equal(second.changes.length, 0);
    assert.deepEqual(await repair(source), first);
  }
});

test("oversized input is unchanged with a useful diagnostic", async () => {
  const source = '<div>' + 'x'.repeat(2_000_000);
  const result = await repair(source);
  assert.equal(result.html, source);
  assert.equal(result.blocked, true);
});

test("table token reprocessing and protected regions do not block ordinary repairs", async () => {
  const table = '<table><tr><th>A</th></tr><tr><td>B</td></tr></table>';
  assert.equal((await repair(table)).blocked, false);
  const source = '<svg><path d="M0 0"/></svg><section><div>text</section>';
  assert.equal((await repair(source)).html, '<svg><path d="M0 0"/></svg><section><div>text</div></section>');
  for (const source of ['<svg><path d="M0 0"/></body>', '<pre>text', '<template><div></div>']) assert.equal((await repair(source)).blocked, true);
});
