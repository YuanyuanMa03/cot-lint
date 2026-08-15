import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(root, 'src', 'cli.js');

function run(args) {
  try {
    const stdout = execFileSync('node', [cli, ...args], { encoding: 'utf8' });
    return { code: 0, stdout };
  } catch (err) {
    return { code: err.status, stdout: err.stdout?.toString() ?? '' };
  }
}

// The leaky fixture must surface every taxonomy class.
const leaky = run(['--json', join(root, 'test', 'fixtures', 'leaky.md')]);
assert.equal(leaky.code, 1, 'leaky fixture must exit 1');
const found = JSON.parse(leaky.stdout);
const ruleIds = new Set(found.map((f) => f.rule));
const expected = [
  'dead-cite',
  'stack-pr-vantage',
  'change-narration',
  'review-choreography',
  'reviewer-addressed',
  'control-flow-narration',
  'planning-residue',
  'authoring-slips',
];
for (const id of expected) {
  assert.ok(ruleIds.has(id), `expected a ${id} finding, got: ${[...ruleIds].join(', ')}`);
}
assert.ok(found.some((f) => f.line > 0 && f.excerpt.length > 0), 'findings carry line numbers and excerpts');

// The clean fixture must stay clean: keep-rules and ignores hold.
const clean = run(['--json', join(root, 'test', 'fixtures', 'clean.md')]);
assert.equal(clean.code, 0, `clean fixture must exit 0, got: ${clean.stdout}`);
assert.equal(JSON.parse(clean.stdout).length, 0, 'clean fixture must have zero findings');

// Human report renders and exits 1; help exits 0.
const human = run([join(root, 'test', 'fixtures', 'leaky.md')]);
assert.equal(human.code, 1);
assert.match(human.stdout, /cot\/dead-cite/);
const help = run(['--help']);
assert.equal(help.code, 0);
assert.match(help.stdout, /usage: cot-lint/);

console.log(`smoke: ${expected.length} classes detected on leaky fixture, 0 findings on clean fixture — ok`);
