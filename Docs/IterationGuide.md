# Prompts Push Tool 迭代指南

本文档提供扩展后续功能迭代时的建议流程与注意事项，确保质量与一致性。

## 1. 需求评估

1. 明确需求来源（用户反馈、业务计划、技术债务）。
2. 评估需求是否影响现有配置项、命令或聊天交互。
3. 更新需求追踪（Issue、Project Board 等）。

## 2. 设计阶段

- 编写设计草案，覆盖以下内容：
  - 新增/修改的命令、贡献点、配置项。
  - Git 同步流程是否需调整（例如支持多仓库或离线模式）。
  - UI/UX 变更（树视图、聊天输出等）。
- 在 `Docs` 目录下补充设计文档或在 README 中添加概要链接。

## 3. 开发实践

- 新增源文件放在 `src/` 目录，保持模块化与单一职责。
- 若新增配置项，更新 `package.json` 的 `contributes.configuration` 并提供默认值。
- 保持输出日志的清晰度，使用 `ExtensionLogger` 记录关键流程。
- 遵循现有代码风格：TypeScript 严格模式、稀少但精准的注释。

## 4. 测试要求

- 运行 `npm run compile` 与 `npm run test` 确保基础检查通过。
- 针对关键逻辑（如 Git 操作、聊天响应）编写/更新测试。
- 需要时可添加集成测试或在手册中补充验证步骤。

## 5. 文档更新

- 更新根目录 `README.md` 及 `Docs/` 下相关文档。
- 如涉及用户操作变化，第一时间同步 `HowToUse.md`、`BuildGuide.md`。
- 对外发布前，在 Release Notes 或 Changelog 中记录变更。

## 6. 发布流程

1. 更新 `package.json` 版本号，遵循语义化版本（`major.minor.patch`）。
2. 通过 GitHub Actions 构建新 VSIX，确认工件有效。
3. 在 GitHub Releases 或 Marketplace 发布前，准备发布说明。
4. 发布后收集反馈并记录后续迭代计划。

## 7. 回滚策略

- 发生严重问题时，可暂时关闭 GitHub Actions 或撤销发布。
- 保留上一版本 VSIX，以便用户回退。
- 在 Issue 中记录问题、原因、解决方案与跟踪计划。
