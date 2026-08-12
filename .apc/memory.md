# Current State

> Low trust: use this as a lead and verify against source or execution.

Rules:

- `§0` always contains exactly the four bullets below; overwrite it.
- Never put a session changelog in `§0`.
- Keep at most three `§0A` sessions; move older entries whole to
  `history.md`.
- Identity belongs in `manifest.md`, constraints in `rules.md`, and
  root causes in `decisions.md`.

## §0 Snapshot

- **Status**: 初始化完成；apc-visual 阅读工具基础版已就绪，待深化
- **Latest progress**: 根仓库 git 化完成，`apc/` 转为独立子模块；`.apc/` 知识库已按 apc init 协议初始化
- **Next step**: 评估并深化 apc-visual 阅读工具（对照参考1.md 的受控记忆/低 Token 设计）
- **Known issues**: 无（尚未深入工具验证）

## §0A Recent sessions

### Session 2026-08-13 01:00 - 工作区 git 化与知识库初始化

- 将根目录初始化为 git 仓库，`apc/` 通过 `git submodule absorbgitdirs` 转为独立子模块（指向 origin/main），未改动 apc 内容
- 按 apc init 协议创建根目录 `.apc/`：manifest、workflow、memory、rules、decisions、history、garden
- 明确项目定位：为 apc 开发可视化阅读工具（apc-visual），为深度优化 apc 本体做准备
- 下一步：评估 apc-visual 现状，对照参考1.md v2.0 设计深化阅读工具

## Pointers

- Identity, stack, structure, commands: `manifest.md`
- Scoped rules and dead ends: `rules.md`
- Decision root causes: `decisions.md`
- Older sessions: `history.md`