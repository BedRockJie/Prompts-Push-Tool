# Prompts Push Tool

Prompts Push Tool keeps a shared prompt catalog in sync with a Git repository, surfaces files through an Explorer tree, and exposes those prompts inside the VS Code chat experience.

## Features

- Clone or update a remote repository of prompt files into the extension's private storage.
- Browse prompts from a dedicated **Shared Prompts** tree view with quick access commands.
- Open prompts directly from the tree view and copy their contents with one click.
- Sync any prompt into the active workspace's `.vscode/prompts` or `.cursor/prompts` folder for downstream tools.
- Apply customizable templates that copy multiple prompt files into opinionated workspace locations with a single command.
- Reference prompts in chat by name (`#prompt-name`) and stream their contents directly into a chat response.

## Getting Started

1. Run **Prompts: Initialize Repository** from the Command Palette and provide the Git URL for your shared prompts.
2. (Optional) Adjust the branch or prompts folder under **Settings ▸ Extensions ▸ Prompts Push Tool**.
3. Open the **Shared Prompts** view in the Explorer to verify the catalog and pull updates with **Prompts: Pull Latest**.

## Commands

- `Prompts: Initialize Repository` – clone or reconfigure the Git source of shared prompts.
- `Prompts: Pull Latest` – fetch and fast-forward to the newest prompt revisions.
- `Prompts: Open` – open a prompt file in an editor tab by double-clicking a tree item or invoking the command manually.
- `Prompts: Copy Content` – place the prompt contents on the clipboard.
- `Prompts: Sync To Workspace` – copy a prompt into `.vscode/prompts` or `.cursor/prompts` inside the selected workspace folder.
- `Prompts: Apply Template` – copy a pre-defined group of prompt files into the current workspace.
- `Prompts: Reveal Folder` – show the local prompts folder in the operating system file explorer.

## Settings

- `promptspushtool.repositoryUrl` – Git remote containing shared prompts.
- `promptspushtool.branch` – branch that holds the prompts (default `main`).
- `promptspushtool.promptsFolder` – path within the repository that contains prompt files (default `prompts`; set `/` or `.` to treat the repo root as the prompts folder).
- `promptspushtool.autoPullOnActivate` – automatically pull the latest prompts when the extension activates.
- `promptspushtool.templates` – declarative template definitions that batch copy prompts into workspaces.

## Chat Integration

Mention a prompt by name or reference (`#prompt-name`) inside a chat request directed to `@promptspushtool`. The extension searches the catalog, returns the closest match, and streams the prompt into the conversation.

## Troubleshooting

- Ensure Git is installed and available on the system `PATH` so the extension can clone and pull repositories.
- The extension stores prompts under the VS Code global storage directory. Re-run **Prompts: Initialize Repository** to reset the local cache.

## Extended Documentation

更多中文说明、使用指引与构建步骤，参见 `Docs/` 目录：

- `Docs/README.zh.md` – 中文概览
- `Docs/HowToUse.md` – 使用指南
- `Docs/BuildGuide.md` – 构建 & 打包
- `Docs/IterationGuide.md` – 迭代开发指南
