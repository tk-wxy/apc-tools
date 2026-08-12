# Project Manifest

> High trust after initialization and user confirmation.

## Mission

- **Name**: APC 开发工作区（APC knowledge base visualizer）
- **Positioning**: 为 APC 框架开发可视化阅读工具（apc-visual），并持续优化 APC 本体
- **Goals**:
  - 为 apc-visual 阅读工具提供稳定、动态的知识库可视化浏览能力
  - 以工具开发为切入点，深度理解并优化 APC 框架本体
  - 沉淀 APC 开发过程中的规则、决策与状态
- **Non-goals**:
  - 不修改 `apc/` 子模块内的框架核心文件（保持其独立仓库纯净）
  - 不改变 APC 框架的语义与协议

## Locked stack

- Node.js >= 14（apc-visual 运行环境）
- 原生 HTML/CSS/JavaScript（无构建步骤，纯静态前端）
- 动态 API + SSE 热更新（服务器读取知识库）
- Markdown 作为知识库存储格式
- Python（参考 tools/ 下的 `check_apc.py` 结构检查）

## Architecture invariants

Changing an invariant requires a recorded root cause in
`decisions.md` and user confirmation.

- `apc/` 子模块保持独立 git 仓库，根仓库不得覆盖其内容
- apc-visual 通过 API（`/api/meta`、`/api/content`）+ SSE（`/events`）动态读取知识库，不做静态构建
- 知识库内容以 `.apc/` 为单一事实来源（source of truth）
- 外层工作区与 apc 框架本身通过"子模块边界"隔离，避免提示词注入

## High-risk zones

- `apc/` 子模块边界（根仓库操作不得影响其内部 git 状态）
- 知识库 Markdown 结构解析（manifest/rules/decisions/memory 的格式依赖）
- SSE 热更新与文件变化检测
- 入口文件路由（AGENTS.md 等必须正确指向根目录 `.apc/`）

## Project structure

```text
d:\dev\apc-md\          ← 根 git 仓库（开发工作区）
├── apc\                ← APC 框架核心（独立 git 子模块，只读引用）
├── apc-visual\         ← 知识库可视化阅读工具（本工作区产物）
├── .apc\               ← 本工作区知识库（manifest/rules/decisions/memory...）
├── .gitignore
├── .gitmodules
├── README.md           ← 项目根说明
└── 参考1.md            ← apc.md v2.0 架构设计（优化方向参考）
```

## Common commands

- 启动阅读工具：`node apc-visual/server.js`（或 `apc-visual/start.bat`）
- 打开浏览器：`start http://localhost:3000`
- 推送 apc 子模块：`cd apc && git push origin main`
- 结构检查：`python apc/tools/check_apc.py`
- 提交根仓库：`git add . && git commit`

## Editing

After initialization, change this file only for fundamental project
changes. Record the decision first. Entry files remain generic routes.