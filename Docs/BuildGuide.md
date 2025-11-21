# Prompts Push Tool 构建与打包说明

本文档介绍如何在本地构建项目、执行测试以及打包生成 VSIX 安装包。

## 1. 环境准备

- Node.js 18 或以上版本。
- npm 9 或以上版本（随 Node.js 安装）。
- Git（用于克隆测试仓库与执行扩展功能）。

## 2. 安装依赖

```bash
npm install
```

## 3. 编译与检查

```bash
# 类型检查 + ESLint + esbuild 打包
npm run compile

# 仅运行类型检查	npm run check-types
# 仅运行 ESLint     npm run lint
```

## 4. 执行测试

```bash
npm run test
```

命令会自动下载 VS Code 测试宿主、编译测试代码并运行示例测试。

## 5. 本地调试

- 在 VS Code 中按 `F5`，选择 **Run Extension**。
- 调试器会启动 watch 任务，并打开 Extension Development Host 供交互调试。

## 6. 打包 VSIX

项目已经集成 vsce 打包工作流，可手动执行：

```bash
npx @vscode/vsce package
```

命令将生成 `promptspushtool-<版本号>.vsix`，可供安装或发布。

## 7. 自动化构建

项目已提供 GitHub Actions 工作流（见 `.github/workflows/package.yml`），将自动执行安装、构建与打包，并在流水线中产出 VSIX 工件。
