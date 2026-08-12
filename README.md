# apc —— 为 AI Agent 提供持久项目上下文

> 一个基于 Markdown 的记忆系统，帮助 AI Agent 停止在会话和模型之间重复解释、重复调试。

apc 由一组结构化的 Markdown 文件组成，作为提示词框架，为 AI Agent 提供持久、可审查的项目交接协议。它不依赖守护进程、数据库或账号，仅使用提示词 + 本地文档。

**本仓库是 apc 的开发工作区**：作为 apc 的开发者，我们在外层目录开发知识库阅读工具（`apc-visual/`），为后续深度优化 apc 本体做准备。`apc/` 作为只读子模块引入，避免开发时提示词注入。

## 仓库结构

```text
apc/            # apc 框架核心（git 子模块，只读引用，独立仓库）
├── README.md          # 英文说明
├── README.zh-CN.md    # 中文说明
├── docs/              # 文档（如 INSTALL.md）
├── examples/          # 示例项目
└── tools/             # 辅助工具
apc-visual/     # APC 知识库可视化阅读工具（本工作区产物）
├── server.js          # Node 服务器（动态 API + SSE 热更新）
├── index.html         # 前端入口
├── main.js / content.js / markdown.js / data.js   # 前端逻辑
└── styles.css         # 样式
.apc/           # 本工作区知识库（遵循 apc 协议）
├── manifest.md        # 项目锚点（使命/栈/不变量/高风险区）
├── workflow.md        # 开发协议（开发流程源）
├── rules.md           # 有证据的规则与死路
├── decisions.md       # 已采纳决策与根因
├── memory.md          # 当前状态与最近会话
├── history.md         # 归档
└── garden.md          # 知识库维护
README.md       # 本文件（项目根说明）
参考1.md        # apc.md v2.0 架构设计（优化方向参考）
```

## 工作原理

apc 的运行分为两个阶段：

### 1. 初始化阶段

根据用户需求与项目现状（如有参考），将原始的 apc 初始化为适配当前项目的正常形态：

- 占位内容被替换为项目相关内容
- 一次性文件（如 `init.md`）在完成后被清除
- 随后正式接入开发流

### 2. 运行阶段

各大 Agent 通过 apc 框架辅助进行开发：

- Agent 根据提示词自动参阅相关文档
- 期间会更新 apc 文档，沉淀有价值的知识与状态变化

## 核心设计

apc 致力于通过以下理念提升开发效率：

- **渐进式读取**：冷启动只读高价值索引和状态路标，具体细节按需加载
- **受控记忆**：规范 Agent 的读写行为，控制 Token 消耗，防止上下文膨胀
- **证据优先**：规则与决策记录适用范围、证据与验证状态，而非盲目信任

## 快速开始

- 新项目接入：[安装说明](./apc/docs/INSTALL.md)
- 查看示例：[`examples/notch/`](./apc/examples/notch/)
- 详细文档：[apc 中文说明](./apc/README.zh-CN.md)

## 本工作区使用

1. **初始化知识库**：本仓库已按 apc init 协议在根目录创建 `.apc/`（manifest/workflow/memory/rules/decisions/history/garden）
2. **启动阅读工具**：`node apc-visual/server.js` 后访问 `http://localhost:3000`
3. **Agent 入口**：`AGENTS.md` 路由到根目录 `.apc/`，按 `.apc/workflow.md` 执行开发协议
4. **维护 apc 子模块**：进入 `apc/` 内独立操作（`git push origin main` 等），根仓库操作不影响其内部

## 目标与方向

apc 尝试利用提示词 + 本地文档提高 Agent 开发效率、降低重复理解成本、减少不必要开销。目前仍在持续努力中。

## 参与开发

作为 apc 的继续开发者，通过用户提出的建议，结合思考不断优化 apc，使其逐步贴近上述目标。