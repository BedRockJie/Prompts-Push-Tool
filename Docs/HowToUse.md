# Prompts Push Tool 使用指南

本文档说明如何在 VS Code 中安装、配置并高效使用 Prompts Push Tool 扩展。

## 1. 安装扩展

### 通过 VSIX 安装
1. 进入项目根目录。
2. 确认存在 `promptspushtool-*.vsix` 文件（若无，参考 `BuildGuide.md` 打包）。
3. 在 VS Code 中运行命令：`Extensions: Install from VSIX...`，选择打包生成的 VSIX 文件。

### 通过 VS Code Marketplace（未来）
- 当扩展发布到 Marketplace 后，可直接搜索 “Prompts Push Tool” 并安装。

## 2. 首次配置

1. 打开命令面板（`Ctrl+Shift+P` 或 `Cmd+Shift+P`）。
2. 执行 **Prompts: Initialize Repository**。
3. 在提示框中填入共享提示词仓库的 Git URL，例如：
   - HTTPS：`https://github.com/example/shared-prompts.git`
   - SSH：`git@github.com:example/shared-prompts.git`
4. 如果仓库默认分支不是 `main`，请在设置中搜索 `prompts push tool`，将 `promptspushtool.branch` 改为实际分支名（如 `master`）。
5. 若提示词不在仓库根目录，可在设置中调整 `promptspushtool.promptsFolder`。

## 3. 常用命令

| 命令 | 作用 |
| ---- | ---- |
| **Prompts: Initialize Repository** | 初始化或重新配置提示词仓库。 |
| **Prompts: Pull Latest** | 拉取最新提示词。 |
| **Prompts: Open** | 在编辑器中打开当前选中的提示词（支持双击树项）。 |
| **Prompts: Copy Content** | 将提示词内容复制到剪贴板。 |
| **Prompts: Sync To Workspace** | 将提示词保存到当前工作区的 `.vscode/prompts` 或 `.cursor/prompts` 中。 |
| **Prompts: Reveal Folder** | 在系统文件管理器中打开本地缓存目录。 |

可在命令面板或 Shared Prompts 树视图的右键菜单中执行这些命令。

## 4. Shared Prompts 树视图

- 在 Explorer 面板中找到 **Shared Prompts**。
- 双击即可打开提示词；右侧提供“复制内容”“同步到工作区”等快捷按钮。
- 同步操作会根据你的选择写入 `.vscode/prompts/...` 或 `.cursor/prompts/...`，可在需要时覆盖已存在的文件。
- 支持多层目录结构，按名称排序并优先展示文件夹。

## 5. VS Code Chat 集成

1. 打开 Chat 面板。
2. 输入 `@promptspushtool` 唤起扩展的聊天参与者。
3. 可以直接描述需求，或使用 `#提示词名称` 进行引用。
4. 扩展将返回匹配的提示词内容，并附带相关提示词的快捷链接。

## 6. 常见问题

- **无法克隆仓库**：确认本地已安装 Git，必要时配置代理或凭据。
- **提示词未出现**：检查 `promptspushtool.promptsFolder` 设置是否指向正确目录，并执行 Pull 命令。
- **聊天参与者不可见**：需要 VS Code Insider 或支持 Chat 功能的版本，且扩展成功加载。

如需更多帮助，请查看 `Docs/README.zh.md` 或提交 Issue。