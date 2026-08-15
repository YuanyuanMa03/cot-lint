# cot-lint

English | [中文](README.zh.md)

**Lint your repo for chain-of-thought leakage — the session-transcript residue AI assistants leave in docs, comments, and JSDoc.**

Your coding agent writes great code and leaks its thinking everywhere around it:

```diff
- // This PR adds a retry loop (decision 7) so the diff stays reviewable.
- // The manager used to serialize writes itself; it no longer does after v1.
- // The cast is safe — it simply narrows the union. Probably fine for now.
+ // Retries transient provider failures up to 3 times with jittered backoff.
+ // The shared coordinator serializes writes per session.
+ // The cast narrows a union already validated at the loader boundary.
```

None of the left column is wrong about the code. It is wrong about its **reader**: it argues with a reviewer who has left, cites a design session nobody can open, and narrates a change instead of stating behavior.

## The one test

> Could a reader at HEAD — with no access to any session transcript, PR thread, or uncommitted draft — resolve every reference and verify every claim?

If no, that passage is chain-of-thought leakage. `cot-lint` finds it.

## Quick start

```sh
npx cot-lint                 # scan the repo (Markdown and prose files)
npx cot-lint --json          # machine-readable findings for CI or agents
npx cot-lint --ext ts,py     # also scan source files line-by-line
npx cot-lint --hidden        # descend into dot-directories such as .agents/
```

Zero dependencies. Node ≥ 20. Exit codes: `0` clean · `1` findings · `2` usage error — drop it straight into CI.

## What it detects

| Class | Example |
| --- | --- |
| dead design-session citation | `(decision 7)`, `design §4.7`, phase tokens `W3`/`T4`, `设计稿` |
| stack/PR vantage | "this PR adds…", "a later PR in this stack" |
| change narration / version stamps | "used to", "no longer", "the old X", "the v1 refactor", "today", `旧版`/`不再` |
| review choreography | "Rejected in review:", "the reviewer confirmed", `上一轮评审` |
| reviewer-addressed justification | "the cast is safe — it simply…" |
| control-flow narration | "first we X, then we Y", "as you can see" |
| hedge / planning residue | "probably fine for now", "should be enough" |
| authoring-language slip | untranslated working-language fragments in the other language |

English and Chinese batteries are both built in.

## What it deliberately does not flag

The keep-rules are half the tool. A zero-treatment linter that deletes `RFC 9110 §10.1.5`, a load-bearing `TODO(alice):`, or "the old connection drains before the new one accepts" (runtime lifecycle, not change history) does more damage than the leakage. So `cot-lint` mechanically exempts:

- issue references and marked `TODO`/`FIXME`/`XXX` deferrals,
- `§`-references on lines that cite an external standard such as an RFC,
- lines carrying a `cot-lint-ignore` suppression — keep the reason next to it.

**Batteries over-match by design.** Every finding is a candidate, not a verdict; the [keep-rules and rewrite method](skill/SKILL.md) decide what survives.

## Fixing, not just finding

The repo ships [`cot-trim`](skills/cot-trim/SKILL.md), an agent skill that pairs with the CLI: it runs `cot-lint --json`, judges every hit against the one test, enumerates the passage's propositions before deleting anything, and fixes owner-first (generated files via their source, model-visible strings via their owning snapshot).

Install it where your agent looks for skills:

- **DeepSeek Harness**: `dsh plugin add cot-lint` (or `github:YuanyuanMa03/cot-lint`) — the `cot-trim` skill loads through the plugin's skill provider.
- **Claude Code / generic agents**: copy `skills/cot-trim/` into your skills directory (`~/.claude/skills/`, `.agents/skills/`, or wherever your agent looks).

## How this differs from "AI slop" style linters

Style-slop detectors flag prose that *sounds like* AI (word choices, em-dash habits). `cot-lint` flags prose whose *vantage is the authoring session* — references and narration that only make sense if you were there. Human-written docs can leak (copy-pasted PR descriptions do); AI-written docs can be clean. Different failure class, different tool.

## Origin

The taxonomy, keep-rules, and battery approach are distilled from the engineering standards of [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (MIT) — specifically its prose-hygiene practice for agent-written repositories — generalized here to work with any repo and any coding agent. See their [`CONTRIBUTING.md`](https://github.com/deepseek-ai/deepseek-harness/blob/master/CONTRIBUTING.md) for the project's stance on community ecosystem work.

## License

[MIT](LICENSE)
