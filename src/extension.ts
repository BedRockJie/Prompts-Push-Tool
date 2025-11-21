// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ExtensionLogger } from './logger';
import { getConfiguration } from './configuration';
import { GitService } from './gitService';
import { PromptRepository } from './promptRepository';
import { PromptTreeDataProvider } from './promptTreeDataProvider';
import { registerCommands } from './commands';
import { registerChatParticipant } from './chatParticipant';

export async function activate(context: vscode.ExtensionContext) {
	const logger = new ExtensionLogger();
	context.subscriptions.push({ dispose: () => logger.dispose() });

	const initialConfig = getConfiguration();
	const gitService = new GitService(logger);
	const repository = new PromptRepository(context, gitService, logger, initialConfig);
	const treeProvider = new PromptTreeDataProvider(repository);

	context.subscriptions.push(
		vscode.window.registerTreeDataProvider('promptspushtool.promptsExplorer', treeProvider)
	);

	registerCommands(context, repository, treeProvider, logger);
	registerChatParticipant(context, repository, logger);

	context.subscriptions.push(repository.onDidChange(() => treeProvider.refresh()));

	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration('promptspushtool')) {
				repository.updateConfiguration(getConfiguration());
				void (async () => {
					try {
						await repository.ensureInitialized();
						treeProvider.refresh();
					} catch (error) {
						logger.warn(`Failed to reinitialize prompts after configuration change: ${(error as Error).message}`);
					}
				})();
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('promptspushtool.helloWorld', () => {
			vscode.window.showInformationMessage('Prompts Push Tool is ready. Use the Shared Prompts view to browse synchronized content.');
		})
	);

	if (!repository.isConfigured()) {
		logger.info('No prompts repository configured yet.');
		return;
	}

	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Window,
			title: 'Syncing shared prompts'
		},
		async () => {
			const config = getConfiguration();
			await repository.ensureInitialized();
			if (config.autoPullOnActivate) {
				try {
					await repository.pullLatest();
				} catch (error) {
					logger.warn(`Automatic pull failed: ${(error as Error).message}`);
				}
			}
		}
	);

	treeProvider.refresh();
}

export function deactivate() {}
