/**
 * Conformance: decision-card parsing + agreement-reply construction.
 *
 * Guards the Part 1 enhancement (dad332e3): splitSegments must recognize
 * checkbox (multi-select) and radio (single-choice) blocks, and
 * buildSelectionBody must emit a deterministic, parseable "Agreed selection:"
 * reply for each mode — including the "Other" free-text escape hatch.
 *
 * Loads the REAL module (via Vite's SSR loader, same as comment-persistence.mjs)
 * and exercises the pure exported functions only — no React rendering, no
 * network.
 *
 * Run: node tests/decision-cards.mjs   (or: npm test)
 * No test framework or new dependencies required.
 */

import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;
const checks = [];
function check(name, cond, detail) {
  checks.push({ name, pass: !!cond, detail });
  if (!cond) {
    failures++;
    console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    console.log(`✓ ${name}`);
  }
}

const server = await createServer({
  root,
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom',
});
const mod = await server.ssrLoadModule('/src/components/InteractiveMarkdown.tsx');
const { splitSegments, buildSelectionBody, isOtherItem } = mod;
await server.close();

// ── splitSegments ──────────────────────────────────────────────────────

const segs = splitSegments(
  [
    'Some prose first.',
    '',
    '- [ ] alpha',
    '- [x] beta',
    '',
    '- ( ) option one',
    '- (x) option two',
    '',
    'Trailing prose.',
  ].join('\n'),
);

const taskSeg = segs.find((s) => s.type === 'tasks');
check('tasks block parsed', !!taskSeg, JSON.stringify(segs));
check('tasks block carries items', taskSeg?.items?.length === 2, JSON.stringify(taskSeg));
check('task checked marker preserved', taskSeg && taskSeg.items[1].initiallyChecked === true);

const choiceSeg = segs.find((s) => s.type === 'choices');
check('choices (radio) block parsed', !!choiceSeg, JSON.stringify(segs));
check('choice initiallySelected', choiceSeg && choiceSeg.items[1].initiallySelected === true);

// Mixed markers in one block → NOT interactive (all-or-nothing per block)
const mixed = splitSegments('- [ ] a\n- ( ) b');
check('mixed block falls back to markdown', mixed.length === 1 && mixed[0].type === 'markdown',
  JSON.stringify(mixed));

// Prose with neither marker → plain markdown
const prose = splitSegments('Hello\n\nWorld');
check('prose stays markdown', prose.every((s) => s.type === 'markdown'));

// ── isOtherItem ────────────────────────────────────────────────────────
check('Other detected', isOtherItem('Other'));
check('Other-colon detected', isOtherItem('Other: write your own'));
check('other (lowercase) detected', isOtherItem('other'));
check('"Otherwise" not detected', !isOtherItem('Otherwise'));

// ── buildSelectionBody: checkbox mode ──────────────────────────────────

const cbSrc = ['- [ ] aaa', '- [ ] bbb'].join('\n');
const cbReply = buildSelectionBody(cbSrc, 'src1', { 'src1:0:0': true }, {}, {});
check('checkbox reply header', cbReply.startsWith('**Agreed selection:**'), cbReply);
check('checkbox reply mirrors toggle', cbReply.includes('- [x] aaa') && cbReply.includes('- [ ] bbb'), cbReply);

// WYSIWYG rule: untouched items keep their original marker
const untouched = buildSelectionBody('- [x] keep', 'src1', {}, {}, {});
check('checkbox untouched keeps [x]', untouched.includes('- [x] keep'), untouched);

// ── buildSelectionBody: checkbox mode with Other text ─────────────────

const cbOther = buildSelectionBody('- [ ] Other', 's', { 's:0:0': true }, {}, { 'other:s:0:0': 'custom answer' });
check('checkbox Other text appended', cbOther.includes('- [x] Other: custom answer'), cbOther);

// ── buildSelectionBody: radio mode ─────────────────────────────────────

const radioSrc = ['- ( ) one', '- ( ) two', '- ( ) three'].join('\n');
const radioReply = buildSelectionBody(radioSrc, 's2', {}, { 's2:0': 1 }, {});
check('radio body starts with header', radioReply.startsWith('**Agreed selection:**'));
check('radio selection marked (x)', radioReply.includes('- (x) two'), radioReply);
check('radio others stay ( )', radioReply.includes('- ( ) one') && radioReply.includes('- ( ) three'), radioReply);

// Radio with initial (x) and no user touch — initial preserved
const radioInitial = buildSelectionBody('- ( ) a\n- (x) b', 's3', {}, {}, {});
check('radio initial selection preserved', radioInitial.includes('- (x) b'), radioInitial);

// ── buildSelectionBody: radio with Other ───────────────────────────────

const radioOther = buildSelectionBody('- ( ) a\n- ( ) Other', 's4', {}, { 's4:0': 1 }, { 'other:s4:0:1': 'something else' });
check('radio Other appended to selection', radioOther.includes('- (x) Other: something else'), radioOther);

// ── buildSelectionBody: multiple blocks emit in order ──────────────────

const multi = [
  'section one',
  '',
  '- [ ] item1',
  '',
  'section two',
  '',
  '- ( ) opt1',
  '- (x) opt2',
].join('\n');
const multiReply = buildSelectionBody(multi, 'm', { 'm:0:0': true }, {}, {});
check('both blocks re-emitted', multiReply.includes('- [x] item1') && multiReply.includes('- (x) opt2'), multiReply);
check('prose sections not re-emitted', !multiReply.includes('section one'), multiReply);

// ── Report ─────────────────────────────────────────────────────────────

if (failures > 0) {
  console.error(`\n${failures} decision-card check(s) FAILED.`);
  process.exit(1);
} else {
  console.log(`\nAll ${checks.length} decision-card checks passed.`);
}