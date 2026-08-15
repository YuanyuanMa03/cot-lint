---
name: cot-trim
description: Use when auditing or fixing chain-of-thought leakage — AI-session residue in docs, comments, JSDoc, READMEs, or commit messages: dead design-session citations such as (decision N) or design §4, PR/stack vantage ("this PR adds"), change narration ("used to", "no longer", "v1"), review choreography, reviewer-addressed justifications, control-flow narration, unmarked hedges, or authoring-language slips. Pairs with the cot-lint CLI for detection; this skill owns the semantic judgment and the rewrite.
---

# Trimming Chain-of-Thought Leakage

Chain-of-thought leakage is prose whose vantage is the authoring session rather than the repository: it cites artifacts only that session could see, narrates the change instead of the state, or argues with a reviewer who has left. The fix is never deletion alone when a passage carries factual clauses — restate each so it stands at HEAD, then delete the transcript around it. **This skill is guidance, not a script.**

## The one test

For every suspect passage ask: **could a reader at HEAD, with no access to any session transcript, PR thread, or uncommitted draft, resolve every reference and verify every claim?**

- If no — restate the surviving facts from the repository's vantage and delete the rest.
- If yes — it is not leakage, however historical it sounds. On current-state surfaces (READMEs, docs, JSDoc) a resolvable change story is still change narration; restate the present behavior instead.

## Workflow

1. Detect: run `cot-lint --json` over the requested scope. The CLI over-matches by design; its output is a candidate list, not a verdict.
2. Judge every hit against the one test and the keep-rules below. Read the surrounding passage, not just the line.
3. Fix owner-first: generated files → fix the source or generator, then regenerate; bilingual pairs → update the counterpart; model-visible strings → wording is behavior, change them through the owning test/snapshot, never silently reword.
4. Before deleting anything, enumerate the passage's propositions (actor, action, condition, timing, modality, negative guarantee, ownership, failure mode, consequence). Keep every factual clause; drop adjectives, repetition, and narration only when each fact survives elsewhere or was never load-bearing.
5. Re-run `cot-lint` on the scope and confirm only sanctioned keeps remain (issue refs, markers with reasons, `cot-lint-ignore` lines that still justify themselves).

## Taxonomy

1. **Dead design-session citations** — `(decision 7)`, `design §4.7`, phase tokens (`T4`, `W3`), "the design ledger". Cite a committed owner by name and path, or delete the citation and restate its factual clause to stand alone.
2. **Stack and PR vantage** — "this PR adds", "a later PR in this stack", "the previous commit". State the shipped mechanism or the extension point; deferred work moves to a `TODO` marker or an issue reference.
3. **Change narration and version stamps** — "used to", "no longer", "the old X", "v1", "today". State the present behavior; a fixed regression becomes a present-tense counterfactual ("without X, Y happens"), never repo history.
4. **Review choreography** — "Rejected in review:", "the reviewer confirmed", round attributions. Keep the surviving decision and rationale as plain fact; delete who said it when.
5. **Reviewer-addressed justification** — "the cast is safe — it simply…". A comment arguing its own correctness addresses a reviewer, not a maintainer. State the invariant that makes the code safe, or delete the comment if the code shows it.
6. **Control-flow narration** — "first we X, then we Y", test walkthroughs. Delete; keep only a non-obvious contract or invariant.
7. **Hedges and planning residue** — "probably fine for now", "should be enough". Promote to `TODO`/`FIXME`/`XXX` or restate the actual bound; delete the hedge.
8. **Authoring-language slips** — untranslated working-language fragments in prose whose language is otherwise the other one. Translate or delete.

## Keep-rules (do not delete these)

Unaided pattern-matching fails in both directions: deleting durable references and keeping dead ones. Apply as written:

- **Issue references** — `#1470`, `TODO(name):` resolve at HEAD; keep them anywhere.
- **Merged-PR and issue citations inside design notes and postmortems** — sanctioned evidence on surfaces whose genre is the change story.
- **Suppression justifications** — `eslint-disable … -- reason`, coverage-ignore reasons are required prose; fix a false reason, never delete it.
- **Counterfactual-present regression pins** — "without X, Y happens", "a naive X would…".
- **Measured bounds** — "(measured: 512 nests ≈ 0.15s)"; the word "measured" is load-bearing provenance.
- **Runtime old/new states** — "the old connection drains before the new one accepts" is lifecycle, not change history.
- **External references that resolve outside the repo by design** — standards sections (RFC 9110 §10.1.5), Figma frame names; the §-ban covers uncommitted internal drafts only.
- **Project voice and genre forms** — "we" as project voice; an alternatives-considered section.

## Overcorrection traps

A trim that flips an obligation into an endorsement, promotes a hypothetical to a shipped feature, deletes a true fact, or drops provenance is worse than the leakage. When two defensible rewrites remain, prefer the one that preserves every factual clause; treat the other as a loss.
