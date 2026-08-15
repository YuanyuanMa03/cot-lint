#!/usr/bin/env node
/**
 * cot-lint — find chain-of-thought leakage: prose whose vantage is the authoring
 * session rather than the repository. Findings are candidates, not verdicts; the
 * keep-rules in README.md decide what survives semantic judgment.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import process from 'node:process';

const PROSE_EXTS = new Set(['.md', '.markdown', '.mdx', '.txt', '.adoc', '.rst']);
const ALWAYS_SKIP_DIRS = new Set(['.git', 'node_modules', 'vendor']);
const MAX_FILE_BYTES = 1024 * 1024;

/**
 * One rule per taxonomy class. `skip(line)` implements the mechanical part of a
 * keep-rule; everything else is left to judgment on purpose.
 */
const RULES = [
  {
    id: 'dead-cite',
    label: 'dead design-session citation',
    hint: 'decision codes, §-refs to uncommitted drafts, phase tokens (W3/T4). Cite a committed owner by path, or restate the fact to stand alone.',
    re: /\((?:decision|audit)\s|\(B ruling|design §|plan §|design ledger|\bP-I\b|\b[WT]\d\b|§\d|设计稿/,
    skip: (line) => /\bRFC\b/i.test(line), // external standards own their §-numbering
  },
  {
    id: 'stack-pr-vantage',
    label: 'stack/PR vantage',
    hint: '"this PR adds…" narrates the change instead of the shipped mechanism. State the extension point; deferred work moves to TODO or an issue.',
    re: /\bthis (?:PR|branch|stack|commit)\b|\blater PR\b|\bprevious commit\b/i,
  },
  {
    id: 'change-narration',
    label: 'change narration',
    hint: '"used to", "no longer", "the old X" contrast with a past state. State present behavior; a fixed regression becomes "without X, Y happens".',
    // "used to <verb>" narrates a superseded habit; "is used to <verb>" is present-tense
    // passive, so auxiliary verbs exempt the match.
    re: /(?<!\bis )(?<!\bare )(?<!\bwas )(?<!\bwere )(?<!\bbe )(?<!\bbeen )(?<!\bbeing )\bused to |\bno longer\b|\bpreviously\b|\bthe old |\bwas renamed\b|\bwas moved\b|\bthis cut\b|\bcut \d|\btoday\b|旧版|老的|不再|以前|本版/i,
  },
  {
    id: 'change-narration',
    label: 'version stamp',
    hint: '"v1", "as of v2" pin prose to a superseded version. State the current behavior; version history lives in changelogs.',
    // Case-sensitive and context-gated: "as of v2", "the v1 refactor" narrate a
    // superseded state; "API v1", "schema v0", "chat v4" name current interfaces.
    re: /\b(?:as of|since|after|before|until|back in) v\d|\bv\d+ (?:refactor|rewrite|migration|cutover|era|days)\b/,
  },
  {
    id: 'review-choreography',
    label: 'review choreography',
    hint: 'who said what in which round. Keep the surviving decision as plain fact; delete who said it when.',
    re: /rejected in review|review round|\breviewer\b|as of v\d|上(一)?轮评审|评审人|评审中被/i,
  },
  {
    id: 'reviewer-addressed',
    label: 'reviewer-addressed justification',
    hint: 'a comment arguing its own correctness addresses a reviewer, not a maintainer. State the invariant that makes the code safe.',
    re: /it simply|is safe —|is safe --/i,
  },
  {
    id: 'control-flow-narration',
    label: 'control-flow narration',
    hint: '"first we X, then we Y" restates what the code shows. Delete; keep only a non-obvious contract or invariant.',
    re: /\bfirst we |\bthen we |as you can see/i,
  },
  {
    id: 'planning-residue',
    label: 'hedge / planning residue',
    hint: '"probably fine for now" defers without a marker. Promote to TODO/FIXME/XXX or restate the actual bound.',
    re: /\bprobably |\bshould be enough\b|\bshould suffice\b|\bfor now\b|\broadmap\b/i,
    skip: (line) => /^\s*(?:\/\/|\*|#|--|<!--)?\s*(?:TODO|FIXME|XXX)\b/.test(line), // a marker makes the deferral sanctioned
  },
  {
    id: 'authoring-slips',
    label: 'authoring-language slip',
    hint: 'untranslated working-language fragments left in prose of the other language. Translate or delete.',
    // A bare 端 isolated from CJK neighbors is the slip; 后端/客户端/端到端 are legitimate compounds.
    re: /(?<![\u4e00-\u9fff])端(?![\u4e00-\u9fff])|---- 私有 ----/,
  },
];

function usage() {
  return [
    'usage: cot-lint [paths...] [options]',
    '',
    'options:',
    '  --json             emit findings as a JSON array',
    '  --hidden           descend into dot-directories (e.g. .agents/)',
    '  --ext=<list>       comma-separated extra extensions to scan (e.g. ts,py)',
    '  --exclude=<text>   skip paths containing this substring (repeatable)',
    '  -h, --help         show this help',
    '',
    'exit codes: 0 clean · 1 findings · 2 usage error',
  ].join('\n');
}

function parseArgs(argv) {
  const paths = [];
  const extraExts = [];
  const excludes = [];
  let json = false;
  let hidden = false;
  for (const arg of argv) {
    if (arg === '-h' || arg === '--help') {
      process.stdout.write(usage() + '\n');
      process.exit(0);
    } else if (arg === '--json') {
      json = true;
    } else if (arg === '--hidden') {
      hidden = true;
    } else if (arg.startsWith('--ext=')) {
      for (const ext of arg.slice(6).split(',')) {
        const trimmed = ext.trim().replace(/^\./, '');
        if (trimmed) extraExts.push('.' + trimmed.toLowerCase());
      }
    } else if (arg.startsWith('--exclude=')) {
      excludes.push(arg.slice('--exclude='.length));
    } else if (arg.startsWith('-')) {
      process.stderr.write(`cot-lint: unknown option ${arg}\n\n${usage()}\n`);
      process.exit(2);
    } else {
      paths.push(arg);
    }
  }
  return { paths: paths.length ? paths : ['.'], json, hidden, extraExts, excludes };
}

function* walk(root, opts) {
  let st;
  try {
    st = statSync(root);
  } catch {
    process.stderr.write(`cot-lint: cannot stat ${root}\n`);
    process.exit(2);
  }
  if (st.isFile()) {
    yield root;
    return;
  }
  const allowed = new Set([...PROSE_EXTS, ...opts.extraExts]);
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (ALWAYS_SKIP_DIRS.has(entry.name)) continue;
        if (entry.name.startsWith('.') && !opts.hidden) continue;
        stack.push(full);
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        if (!allowed.has(ext)) continue;
        if (excluded(full, opts.excludes)) continue;
        if (statSync(full).size > MAX_FILE_BYTES) continue;
        yield full;
      }
    }
  }
}

function excluded(path, excludes) {
  return excludes.some((frag) => path.includes(frag));
}

function lintFile(file) {
  const findings = [];
  const lines = readFileSync(file, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('cot-lint-ignore')) continue; // sanctioned suppression; keep the reason next to it
    for (const rule of RULES) {
      if (rule.skip?.(line)) continue;
      const match = rule.re.exec(line);
      if (match) {
        findings.push({
          file,
          line: i + 1,
          rule: rule.id,
          match: match[0],
          label: rule.label,
          hint: rule.hint,
          excerpt: line.trim().slice(0, 100),
        });
      }
    }
  }
  return findings;
}

function humanReport(findings) {
  if (!findings.length) return 'cot-lint: clean — no chain-of-thought leakage candidates.\n';
  const lines = findings.map(
    (f) => `${f.file}:${f.line}  [cot/${f.rule}]  "${f.match}" — ${f.label}\n    ${f.excerpt}\n    ${f.hint}`,
  );
  const files = new Set(findings.map((f) => f.file)).size;
  lines.push(
    `\n${findings.length} finding(s) in ${files} file(s). Batteries over-match by design: judge each hit against the keep-rules before deleting.`,
  );
  return lines.join('\n') + '\n';
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const findings = [];
  for (const path of opts.paths) {
    for (const file of walk(path, opts)) {
      findings.push(...lintFile(file));
    }
  }
  if (opts.json) {
    process.stdout.write(JSON.stringify(findings, null, 2) + '\n');
  } else {
    process.stdout.write(humanReport(findings));
  }
  process.exit(findings.length ? 1 : 0);
}

main();
