# Decisions

> High trust within recorded scope when evidence is traceable.
> Append adopted or user-confirmed decisions, not brainstorms.
> Keep superseded decisions and point to their replacement.

## Index

- §1 根目录 git 化与 apc 子模块化 - 根目录独立仓库，apc 保留为子模块
- §2 双仓库提交协议 - apc 有改动推双仓；仅工具改动只推大仓

## Details

### §1 根目录 git 化与 apc 子模块化

- **Final approach**: 根目录初始化为 git 仓库，`apc/` 通过 `git submodule absorbgitdirs` 转为独立子模块（git 目录迁移至 `.git/modules/apc`）
- **Scope**: 根工作区 / apc 子模块边界
- **Evidence and root cause**: apc 原为独立仓库且包含提示词框架，若直接并入根仓库会丢失其独立发布/推送能力；子模块化保留 apc 的 origin 远程与历史，同时让根仓库管理工具代码
- **Rejected alternatives**: 1) 将 apc 并入根仓库（丧失独立推送、污染框架）；2) 仅删除 apc 的 .git（丢失历史与远程）
- **Decided / last verified**: 2026-08-13 / 2026-08-13
- **Status**: active

### §2 双仓库提交协议

- **Final approach**: 每次提交推送前先分析改动归属，按规则决定推送目标
  - apc 有改动 → 推进 apc 原仓库，同时推进大仓库（子模块指针同步更新）
  - 仅工具/大仓库改动 → 只推进大仓库
- **Scope**: 整个大项目（根仓库 + apc 子模块）
- **Evidence and root cause**: apc 作为原版框架需独立发布演进；大项目聚合 apc + 工具。若不区分推送目标，会污染 apc 原版或遗漏大仓库同步
- **Rejected alternatives**: 1) 全部改动只推大仓库（apc 原版失去独立演进）；2) 全部改动只推 apc（工具代码无处聚合）
- **Decided / last verified**: 2026-08-13 / 2026-08-13
- **Status**: active
