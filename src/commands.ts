import * as vscode from 'vscode';
import { PromptRepository, PromptEntry } from './promptRepository';
import { PromptTreeDataProvider, PromptTreeItem } from './promptTreeDataProvider';
import { ExtensionLogger } from './logger';
import { getConfiguration, updateConfiguration } from './configuration';

export function registerCommands(
	context: vscode.ExtensionContext,
	repository: PromptRepository,
	tree: PromptTreeDataProvider,
	logger: ExtensionLogger
): void {
	context.subscriptions.push(
		vscode.commands.registerCommand('promptspushtool.initializeRepository', async () => {
			const config = getConfiguration();

			let repositoryUrl = config.repositoryUrl;
			if (!repositoryUrl) {
				repositoryUrl = await vscode.window.showInputBox({
					prompt: 'Enter the Git URL that hosts your shared prompts',
					ignoreFocusOut: true
				}) || '';
			}

			repositoryUrl = repositoryUrl.trim();
			if (!repositoryUrl) {
				return;
			}

			await updateConfiguration('repositoryUrl', repositoryUrl);
			repository.updateConfiguration(getConfiguration());

			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: 'Initializing prompt repository'
				},
				async () => {
					await repository.ensureInitialized();
					await repository.pullLatest().catch((error) => {
						logger.warn(`Initial pull failed: ${(error as Error).message}`);
					});
				}
			);

			tree.refresh();
			vscode.window.showInformationMessage('Prompt repository is ready.');
		}),

		vscode.commands.registerCommand('promptspushtool.pullLatestPrompts', async () => {
			if (!repository.isConfigured()) {
				vscode.window.showWarningMessage('Configure a repository URL first.');
				return;
			}

			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: 'Pulling latest prompts'
				},
				async () => {
					await repository.pullLatest();
				}
			);

			tree.refresh();
			vscode.window.showInformationMessage('Prompts updated.');
		}),

		vscode.commands.registerCommand('promptspushtool.openPrompt', async (item?: PromptTreeItem | PromptEntry) => {
			const entry = resolveEntry(item);
			if (!entry) {
				return;
			}

			try {
				const document = await vscode.workspace.openTextDocument(entry.uri);
				await vscode.window.showTextDocument(document, { preview: true });
			} catch (error) {
				logger.error('Failed to open prompt', error);
				vscode.window.showErrorMessage('Unable to open prompt file.');
			}
		}),

		vscode.commands.registerCommand('promptspushtool.copyPromptContent', async (item?: PromptTreeItem | PromptEntry) => {
			const entry = resolveEntry(item);
			if (!entry) {
				return;
			}

			try {
				const content = await repository.readPrompt(entry.relativePath);
				await vscode.env.clipboard.writeText(content);
				vscode.window.showInformationMessage('Prompt copied to clipboard.');
			} catch (error) {
				logger.error('Failed to copy prompt content', error);
				vscode.window.showErrorMessage('Unable to copy prompt content.');
			}
		}),

		vscode.commands.registerCommand('promptspushtool.showPromptsFolder', async () => {
			if (!(await repository.ensureInitialized())) {
				vscode.window.showWarningMessage('Initialize the prompt repository first.');
				return;
			}

			await vscode.commands.executeCommand('revealFileInOS', repository.promptsRootUri);
		})
	);
}

function resolveEntry(item?: PromptTreeItem | PromptEntry): PromptEntry | undefined {
	if (!item) {
		return undefined;
	}

	if ('entry' in item) {
		return item.entry;
	}

	const candidate = item as PromptEntry & { uri: PromptEntry['uri'] | vscode.Uri | any };
	const uri = candidate.uri instanceof vscode.Uri ? candidate.uri : vscode.Uri.from(candidate.uri as any);
	return { ...candidate, uri };
}
