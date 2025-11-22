# Prompts Push Tool 简介

Prompts Push Tool 是一款 VS Code 扩展，用于从 Git 仓库同步共享提示词，并通过侧边树视图与聊天参与者提供统一的访问体验。

## 主要功能

- **Git 同步**：克隆并拉取远程提示词仓库，支持自定义分支与子目录。
- **树视图浏览**：在 Explorer 视图中以层级结构展示提示词文件，支持快速打开与复制。
- **工作区同步**：一键将单个提示词写入当前工作区的 `.vscode` 或 `.cursor` 目录，便于其他工具复用。
- **聊天集成**：在 VS Code Chat 中通过 `@promptspushtool` 直接引用或检索提示词。
- **命令集合**：提供初始化、拉取、打开、复制以及定位提示词目录的一系列命令。

## 目录结构

```
Docs/                —— 文档目录
  README.zh.md       —— 本说明
  HowToUse.md        —— 使用指南
  BuildGuide.md      —— 构建与打包说明
  IterationGuide.md  —— 迭代开发指南
media/               —— 资源文件（图标等）
src/                 —— 扩展源码
```

## 相关链接

- 使用说明：参见 `Docs/HowToUse.md`
- 构建方法：参见 `Docs/BuildGuide.md`
- 迭代指南：参见 `Docs/IterationGuide.md`
