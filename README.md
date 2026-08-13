# apc-tools —— APC 框架工具集

> 以 [apc](apc/) 原版框架为核心，开发配套知识工具（首个工具：apc-visual 知识库可视化阅读器），并持续优化 apc 本体。

## 这是什么

**apc（AI Project Context）** 是一套基于 Markdown 的记忆系统，帮助 AI Agent 停止在会话与模型之间重复解释、重复调试。它不依赖守护进程、数据库或账号，仅使用「提示词 + 本地文档」为 Agent 提供持久、可审查的项目交接协议。

**本仓库（apc-tools）** 是 apc 的配套工具开发工作区：

- `apc/`：apc 框架核心，以 git 子模块只读引入，保持独立演进
- `apc-visual/`：知识库可视化阅读工具（本工作区首个产物）
- `.apc/`：本工作区自身的知识库（遵循 apc 协议）

> 通过「子模块边界」隔离工具开发与 apc 框架本体，避免提示词注入；通过双仓库提交协议保持 apc 原版纯净、独立发布。

## 目录

- [仓库结构](#仓库结构)
- [核心架构](#核心架构)
- [apc-visual 功能](#apc-visual-功能)
- [工作原理](#工作原理)
- [核心设计](#核心设计)
- [快速开始](#快速开始)
- [开发路线图](#开发路线图)
- [常见问题](#常见问题)

## 仓库结构

```text
.
├── apc/                # apc 框架核心（git 子模块，只读引用，独立仓库）
│   ├── README.md           # 英文说明
│   ├── README.zh-CN.md     # 中文说明
│   ├── docs/               # 文档（如 INSTALL.md）
│   ├── examples/           # 示例项目
│   └── tools/              # 辅助工具（如 check_apc.py）
├── apc-visual/         # APC 知识库可视化阅读工具
│   ├── server.js           # Node 服务器（动态 API + SSE 热更新 + 文件监听）
│   ├── index.html          # 前端入口
│   ├── main.js             # 前端主逻辑（目录切换 + 热编辑）
│   ├── content.js          # 内容渲染
│   ├── markdown.js         # Markdown 解析
│   ├── data.js             # 数据层
│   ├── styles.css          # 样式
│   └── start.bat           # Windows 一键启动脚本
├── .apc/               # 本工作区知识库（遵循 apc 协议）
│   ├── manifest.md         # 项目锚点（使命/技术栈/不变量/高风险区）
│   ├── workflow.md         # 开发协议（开发流程源）
│   ├── rules.md            # 有证据的规则与死路
│   ├── decisions.md        # 已采纳决策与根因
│   ├── memory.md           # 当前状态与最近会话
│   ├── history.md          # 归档
│   └── garden.md           # 知识库维护
├── AGENTS.md            # Agent 入口（路由到根目录 .apc/）
├── 参考1.md             # apc v2.0 架构设计（优化方向参考）
└── README.md            # 本文件
```

## 核心架构

### 双层隔离

```text
apc/ 子模块（只读）   ──  apc 框架本体，独立 git 仓库，独立演进
apc-tools 工作区     ──  配套工具 + 自身 .apc 知识库
```

### apc-visual 运行架构

apc-visual 不做静态构建，通过动态 API 实时读取知识库：

```text
浏览器页面
   │  Fetch：/api/meta、/api/content、/api/dirs
   ▼
Node 服务器（server.js）
   │  读取 .apc/ 目录 Markdown
   │  文件变更 → SSE 推送（/events）
   ▼
浏览器自动热更新
```

### 双仓库提交协议

提交前必须先分析改动归属，此规则不可出错，每次提交推送前必须核对：

| 改动归属 | 提交动作 |
| --- | --- |
| apc 框架有改动 | 推进 apc 原仓库（`apc/`），同时推进大仓库 |
| 仅工具 / 大仓库改动 | 只推进大仓库 |

## apc-visual 功能

- 📚 **知识库目录切换**：顶部选择器切换不同项目知识库，支持输入项目路径（含 `.apc`）
- 🌲 **文件浏览器**：树形结构浏览 `.apc/` 下所有知识文件
- 🕸️ **结构图**：展示知识库文件的信任关系（高信任 / 低信任 / 取证用）
- 📝 **热编辑**：浏览器中直接编辑 Markdown 并保存到磁盘
- ⚡ **SSE 热更新**：知识库文件变更实时推送，无需手动刷新
- 🌓 **主题切换**：浅色 / 深色 / 跟随系统

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

### 接入 apc 框架

- 新项目接入：[安装说明](./apc/docs/INSTALL.md)
- 查看示例：[`examples/notch/`](./apc/examples/notch/)
- 详细文档：[apc 中文说明](./apc/README.zh-CN.md)

### 使用 apc-visual

**环境要求**：Node.js ≥ 14

```bash
# 方式一：直接启动
node apc-visual/server.js

# 方式二：Windows 一键启动
apc-visual/start.bat
```

启动后访问 <http://localhost:3000> 即可浏览知识库。

### 本工作区日常命令

| 命令 | 说明 |
| --- | --- |
| `node apc-visual/server.js` | 启动阅读工具（或 `apc-visual/start.bat`） |
| `start http://localhost:3000` | 打开浏览器访问知识库 |
| `python apc/tools/check_apc.py` | 知识库结构检查 |
| `cd apc && git push origin main` | 推送 apc 子模块（推 `apc.md.git`） |
| `git push origin master` | 推送大仓库（按双仓库协议核对是否需双仓推送） |

## 开发路线图

当前在持续优化 apc 本体，方向参考 [`参考1.md`](./参考1.md)（apc v2.0 架构设计）：

- **两级存储**：L1 内存（纯 Prompt 索引）+ L2 外存（Python 管道接管）
- **存根保护**：通过 `.apcignore` 屏蔽大文件真身，用 stub 生成器暴露结构存根，防止 Token 暴涨
- **受控读取**：物理限制单次读取行数，强制先检索定位、再局部读取
- **受控写入**：限制单条记忆字符数，高密度摘要写入，防止日志/代码块注入
- **记忆 GC**：超阈值自动归档已解决的历史记录，保持主记忆文件稳定在低 Token 区间（约 1,000~2,000 Token）

## 常见问题

### 端口 3000 被占用

```bash
netstat -ano | findstr :3000   # 查找占用 3000 端口的进程 PID
taskkill /PID <PID> /F          # 终止旧进程后重新启动
```

## 参与开发

作为 apc 的继续开发者，通过用户提出的建议，结合思考不断优化 apc，使其逐步贴近「低 Token、高密度、可审查」的目标。