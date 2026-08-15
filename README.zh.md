# cot-lint

[English](README.md) | 中文

**扫描仓库中的"思维链泄漏"——AI 助手留在文档、注释、JSDoc 里的会话残留。**

你的 coding agent 代码写得很好，但会把"思考过程"漏得到处都是：

```diff
- // This PR adds a retry loop (decision 7) so the diff stays reviewable.
- // The manager used to serialize writes itself; it no longer does after v1.
- // The cast is safe — it simply narrows the union. Probably fine for now.
+ // Retries transient provider failures up to 3 times with jittered backoff.
+ // The shared coordinator serializes writes per session.
+ // The cast narrows a union already validated at the loader boundary.
```

左边一列对代码的描述并没有错，错的是**读者设定**：它在和一个早已离开的评审者争论，引用一个谁都打不开的设计会话，叙述一次变更而不是陈述行为。

## 唯一测试

> 站在 HEAD 上的读者——没有任何会话记录、PR 讨论或未提交草稿——能否解析其中每一个引用、验证每一个断言？

不能，就是思维链泄漏。`cot-lint` 负责把它找出来。

## 快速开始

```sh
npx cot-lint                 # 扫描整个仓库（Markdown 等文本文件）
npx cot-lint --json          # 输出 JSON，供 CI 或 agent 消费
npx cot-lint --ext ts,py     # 同时逐行扫描源码文件
npx cot-lint --hidden        # 进入 .agents/ 等点开头目录
```

零依赖，Node ≥ 20。退出码：`0` 干净 · `1` 有发现 · `2` 用法错误——可直接接入 CI。

## 检测什么

| 类别 | 示例 |
| --- | --- |
| 死掉的设计会话引用 | `(decision 7)`、`design §4.7`、阶段代号 `W3`/`T4`、`设计稿` |
| PR/堆叠视角 | "this PR adds…"、"a later PR in this stack" |
| 变更叙述 / 版本印记 | "used to"、"no longer"、"the old X"、"the v1 refactor"、"today"、`旧版`/`不再` |
| 评审编排 | "Rejected in review:"、"the reviewer confirmed"、`上一轮评审` |
| 对评审者的辩解 | "the cast is safe — it simply…" |
| 控制流复述 | "first we X, then we Y"、"as you can see" |
| 含糊保留 | "probably fine for now"、"should be enough" |
| 母语滑移 | 另一种语言的行文里混入未翻译的工作语言碎片 |

中英两套检测电池内置。

## 刻意不标记什么

保留规则是这台工具的另一半。一个无差别处理的 linter 如果删掉 `RFC 9110 §10.1.5`、删掉承重的 `TODO(alice):`、或者删掉 "the old connection drains before the new one accepts"（运行时生命周期，不是变更历史），破坏比泄漏本身更大。所以 `cot-lint` 机械豁免：

- issue 引用和带标记的 `TODO`/`FIXME`/`XXX` 递延；
- 同一行引用了 RFC 等外部标准的 `§` 引用；
- 带 `cot-lint-ignore` 抑制标记的行——请把理由写在标记旁边。

**电池默认过度匹配。** 每条 finding 是候选而非判决；[保留规则与改写方法](skill/SKILL.md)决定什么能活下来。

## 不止发现，还要修复

仓库内置 [`cot-trim`](skill/SKILL.md) agent skill，与 CLI 配合使用：它运行 `cot-lint --json`，用"唯一测试"逐条判断，删除前先枚举段落里的全部命题，并按属主优先修复（生成文件改源头、模型可见字符串走所属快照）。把它复制进你的 agent skills 目录即可——DeepSeek Harness 用 `.agents/skills/`，Claude Code 用 `~/.claude/skills/`，或你的 agent 约定的位置。

## 与"AI 文风检测器"的区别

文风检测器标记的是*听起来像 AI* 的散文（用词习惯、破折号癖好）。`cot-lint` 标记的是*视角属于作者会话*的散文——只有身临其境才说得通的引用和叙述。人写的文档也会泄漏（复制粘贴 PR 描述就会）；AI 写的文档也可以很干净。失败类别不同，工具不同。

## 来源

分类法、保留规则和电池方法提炼自 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（MIT）的工程规范——具体说是它针对 agent 写作仓库的散文卫生实践——在此泛化为任何仓库、任何 coding agent 可用。其[社区生态立场](https://github.com/deepseek-ai/deepseek-harness/blob/master/CONTRIBUTING.zh.md)见官方 CONTRIBUTING。

## 许可

[MIT](LICENSE)
