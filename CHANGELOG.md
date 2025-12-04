# Change Log

All notable changes to the "promptspushtool" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- Added a Quick Pick fallback for **Prompts: Sync To Workspace** so the command works from the Command Palette even without a tree selection.
- Forced **Prompts: Apply Template** into the Command Palette via `menus.commandPalette` so it is always discoverable even if VS Code hides uncategorized commands.
- Allowed `promptspushtool.promptsFolder` to be set to `/` or `.` to treat the repository root as the prompt source directory, fixing template lookups for root-level prompts.

## [0.0.3] - 2025-12-04

- Added the **Prompts: Apply Template** command plus a tree-view toolbar button for one-click template application.
- Introduced the `promptspushtool.templates` setting so teams can declare template destinations and file mappings.
- Documented the template workflow across README and Docs/HowToUse, and marked the TODO entry as complete.

## [0.0.2] - 2025-11-22

- Added workspace sync command that copies prompts into `.vscode/prompts` or `.cursor/prompts` inside the current workspace.
- Documented the new sync workflow and clarified that prompts open on double-click in the tree.
- Declared the extension icon, repository URL, and MIT license to satisfy Marketplace validation.

## [0.0.1] - 2025-11-22

- Added Git-backed prompt synchronization with configurable repository settings.
- Introduced Shared Prompts tree view with open, copy, and reveal commands.
- Registered chat participant to stream prompt content directly into conversations.