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


// ── splitSegments: headed/h2-adjacent sections (quick fix a444ba40) ────
// Wind-WR ratification format: `## Section` glued to `- [ ]` items with no
// blank lines, multiple sections per paragraph block.
const windWr = splitSegments(
  [
    'Purpose: the core implementation loop.',
    '',
    '## builder chain',
    '- [ ] Status report BEFORE each step',
    '- [ ] Implementation step executed',
    '',
    '## SOL / PEB / Shrapnel',
    '- [ ] hooks left intact',
    '- [ ] evidence row per milestone',
  ].join('\n'),
);
const wrTasks = windWr.filter((s) => s.type === 'tasks');
check('h2+tasks sections become interactive', wrTasks.length === 2, JSON.stringify(windWr.map((s) => s.type)));
check(
  'section headers attached to task cards',
  wrTasks[0]?.header === '## builder chain' && wrTasks[1]?.header === '## SOL / PEB / Shrapnel',
  JSON.stringify(wrTasks.map((s) => s.header)),
);
check(
  'blockIdx monotonic across section cards',
  wrTasks[0]?.blockIdx === 0 && wrTasks[1]?.blockIdx === 1,
  JSON.stringify(wrTasks.map((s) => s.blockIdx)),
);

// Multi-section GLUED in one block (no blank lines at all) — the actual bug.
const glued = splitSegments(
  ['## builder chain', '- [ ] one', '- [ ] two', '## SOL', '- [ ] three'].join('\n'),
);
const gluedTasks = glued.filter((s) => s.type === 'tasks');
check('glued no-blank-line sections split into cards', gluedTasks.length === 2, JSON.stringify(glued.map((s) => s.type)));
check('glued second card carries its own header', gluedTasks[1]?.header === '## SOL', JSON.stringify(gluedTasks.map((s) => s.header)));

// Legacy promotion-card form unchanged: bold header + radios attaches.
const promo = splitSegments('**Card `2444b14d`** — Title here\n- ( ) Approve as mapped\n- ( ) Strike');
check('bold+radio promotion card attaches', promo.length === 1 && promo[0].type === 'choices' && !!promo[0].header, JSON.stringify(promo));

// Headerless PURE task list stays interactive via the legacy fast path
// (pre-existing behaviour — only heading-glued blocks were broken).
const bare = splitSegments('- [ ] standalone item');
check('headerless pure task list still interactive (legacy)', bare.length === 1 && bare[0].type === 'tasks', JSON.stringify(bare));

// Mixed kinds inside one section degrade safely to markdown.
const mixedSection = splitSegments('**Header**\n- [ ] task line\n- ( ) radio line');
check('mixed-kind section degrades to markdown', mixedSection.every((s) => s.type === 'markdown'), JSON.stringify(mixedSection));

// ── Report ─────────────────────────────────────────────────────────────

if (failures > 0) {
  console.error(`\n${failures} decision-card check(s) FAILED.`);
  process.exit(1);
} else {
  console.log(`\nAll ${checks.length} decision-card checks passed.`);
}