import assert from "node:assert/strict";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { parse } from "parse5";
import { repairHtml } from "../src/html-repair.mjs";

const output = path.resolve(process.env.REPAIR_OUTPUT_DIR || ".tmp/html-repair");
const input = path.resolve("test-data");
const seed = 20260906;
let state = seed;
const random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
const hash = value => createHash("sha256").update(value).digest("hex");
const shuffle = items => { const copy = items.slice(); for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; };

function fingerprint(source) {
  const walk = node => {
    if (node.nodeName === "#comment" || node.nodeName === "#documentType") return null;
    if (node.nodeName === "#text") return node.value.trim().replace(/\s+/g, " ") || null;
    return [node.nodeName, (node.attrs || []).map(a => [a.name, a.value]).sort(), [...(node.childNodes || []), ...(node.content ? [node.content] : [])].map(walk).filter(value => value !== null)];
  };
  return JSON.stringify(walk(parse(source)));
}

await mkdir(path.join(output, "cases"), { recursive: true });
const report = { seed, input, output, fingerprint: "HTML tree/attributes/text, ignoring whitespace-only nodes and normalizing text whitespace; browser geometry checked separately", sources: [], cases: [], totals: {} };
for (const [sourceIndex, name] of (await readdir(input)).filter(name => /\.html?$/i.test(name)).sort().entries()) {
  const bytes = await readFile(path.join(input, name));
  const original = bytes.toString("utf8");
  const originalFile = `source-${sourceIndex + 1}.html`;
  await writeFile(path.join(output, originalFile), bytes);
  assert.equal(repairHtml(original).html, original, `Valid original must not change: ${name}`);
  assert.equal(repairHtml(original).blocked, false, `Valid original must not be reported as broken: ${name}`);
  const sourceHash = hash(bytes);
  report.sources.push({ name, file: originalFile, sha256: sourceHash });
  const locations = [];
  const pending = [parse(original, { sourceCodeLocationInfo: true })];
  while (pending.length) {
    const node = pending.pop();
    if (node.sourceCodeLocation?.startTag) {
      for (const side of ["startTag", "endTag"]) {
        const loc = node.sourceCodeLocation[side];
        if (loc) locations.push({ name: node.tagName, side, start: loc.startOffset, end: loc.endOffset, line: loc.startLine });
      }
    }
    pending.push(...(node.childNodes || []));
    if (node.content) pending.push(node.content);
  }
  const ends = locations.filter(loc => loc.side === "endTag");
  // All closing tags, in seeded random order, plus random starts and multi-tag damage.
  const jobs = shuffle(ends).map(loc => ({ kind: "single-end", removed: [loc] }));
  jobs.push(...shuffle(locations.filter(loc => loc.side === "startTag")).slice(0, 40).map(loc => ({ kind: "single-start", removed: [loc] })));
  for (let i = 0; i < 24; i++) jobs.push({ kind: "multiple-ends", removed: shuffle(ends).slice(0, 2 + Math.floor(random() * 3)) });
  const expected = fingerprint(original);
  for (const [index, job] of jobs.entries()) {
    let damaged = original;
    for (const loc of job.removed.slice().sort((a, b) => b.start - a.start)) damaged = damaged.slice(0, loc.start) + damaged.slice(loc.end);
    const result = repairHtml(damaged);
    const second = repairHtml(result.html);
    assert.equal(second.html, result.html, `Repair must reach a fixed point: ${name} ${index} ${JSON.stringify(job)}`);
    const restored = fingerprint(result.html) === expected;
    const changed = result.html !== damaged;
    const category = result.blocked ? "warning-only" : changed ? restored ? "repaired-original-tree" : "repaired-needs-visual-review" : restored ? "browser-already-recovers" : "no-supported-repair";
    report.totals[category] = (report.totals[category] || 0) + 1;
    const id = `${sourceIndex + 1}-${String(index + 1).padStart(3, "0")}`;
    const damagedFile = `cases/${id}-damaged.html`;
    const repairedFile = `cases/${id}-repaired.html`;
    await writeFile(path.join(output, damagedFile), damaged);
    await writeFile(path.join(output, repairedFile), result.html);
    report.cases.push({ id, sourceIndex, ...job, damagedFile, repairedFile, category, changed, restored, changes: result.changes, warnings: result.warnings });
  }
  assert.equal(hash(await readFile(path.join(input, name))), sourceHash, "Source files must be untouched");
}
assert.ok(report.sources.length >= 2, "Expected the two supplied HTMLs");
await writeFile(path.join(output, "mutation-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ sources: report.sources, seed, cases: report.cases.length, totals: report.totals, output }, null, 2));
assert.ok(report.totals["repaired-original-tree"] > 50, "At least 50 real damaged inputs must recover their original tree");
assert.equal(report.totals["repaired-needs-visual-review"] || 0, 0, "Every applied repair in the supplied corpus must recover its original tree");
