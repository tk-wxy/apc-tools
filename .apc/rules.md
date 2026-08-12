# Scoped Rules and Dead Ends

> High trust only while evidence, scope, environment, and status match.
> Record reproduced or authoritative constraints, never hunches.

Keep invalidated entries with strikethrough and the reason/date.

## Index

Scan this table and dead ends at startup. Open full rules only when
relevant or high-risk.

| ID | Summary | Section | High-risk |
|---|---|---|---|
| R1 | 不修改 apc/ 子模块框架核心 | Core | yes |

## Rules

### Core

- [x] R1: 根仓库操作不得修改 `apc/` 子模块内的框架核心文件（保持其独立仓库纯净，指向 origin/main）
  - Scope: 整个工作区 / apc 子模块边界
  - Evidence: 用户明确要求"注意不要更改 apc"；git submodule absorbgitdirs 已验证子模块独立
  - Last verified: 2026-08-13
  - Status: active

### {{HIGH_RISK_AREAS}}

- [Add a rule only after evidence exists.]

## Dead Ends

- [failed route] -> [failure reason]
  - Scope: [module/platform/version]
  - Evidence: [test/log/source/reference]
  - Last verified: [YYYY-MM-DD]
  - Status: active

## Symptom Lookup

- [symptom] -> check R[id]