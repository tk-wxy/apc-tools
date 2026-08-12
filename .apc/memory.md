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

- **Status**: 大项目定位已确认（apc 原版 + 配套工具集）；知识库初始化完成；待配置 GitHub 大仓库并首次推送
- **Latest progress**: 固化双仓库提交协议（apc 改动推双仓、仅工具改动只推大仓）到 manifest 不变量与 decisions §2
- **Next step**: 确定大项目名 → 配置 GitHub 大仓库 → 首次提交推送（严格按双仓库协议核对）
- **Known issues**: 根仓库尚无远程 remote，首次推送需用户先建仓库并授权

## §0A Recent sessions

### Session 2026-08-13 01:30 - 大项目定位确认与双仓库协议

- 确认大项目 = apc 原版 + 配套工具集（apc-visual 为第一个工具），工具开发与 apc 优化并行
- 固化提交规则：apc 改动推双仓（apc 原仓库 + 大仓库）；仅工具改动只推大仓库
- 根仓库无 remote；apc 子模块指向 `github.com/tk-wxy/apc.git`
- 待办：起大项目名、配置 GitHub、首次推送

### Session 2026-08-13 01:00 - 工作区 git 化与知识库初始化

- 将根目录初始化为 git 仓库，`apc/` 通过 `git submodule absorbgitdirs` 转为独立子模块（指向 origin/main），未改动 apc 内容
- 按 apc init 协议创建根目录 `.apc/`：manifest、workflow、memory、rules、decisions、history、garden
- 明确项目定位：为 apc 开发可视化阅读工具（apc-visual），为深度优化 apc 本体做准备

## Pointers

- Identity, stack, structure, commands: `manifest.md`
- Scoped rules and dead ends: `rules.md`
- Decision root causes: `decisions.md`
- Older sessions: `history.md`