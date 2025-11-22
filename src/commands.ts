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

		vscode.commands.registerCommand('promptspushtool.syncPromptToWorkspace', async (item?: PromptTreeItem | PromptEntry) => {
			const entry = resolveEntry(item);
			if (!entry) {
				return;
			}

			if (entry.type !== vscode.FileType.File) {
				vscode.window.showInformationMessage('Select a prompt file to sync.');
				return;
			}

			const workspaceFolder = await pickWorkspaceFolder();
			if (!workspaceFolder) {
				vscode.window.showWarningMessage('Open a workspace folder to sync prompts.');
				return;
			}

			const destination = await pickDestinationFolder(workspaceFolder);
			if (!destination) {
				return;
			}

			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: 'Syncing prompt to workspace'
				},
				async () => {
					const relativeSegments = entry.relativePath.split(/[\\/]/).filter(Boolean);
					const targetSegments = ['prompts', ...relativeSegments];
					const targetFileUri = vscode.Uri.joinPath(destination.uri, ...targetSegments);

					const parentSegments = targetSegments.slice(0, -1);
					const parentUri = parentSegments.length
						? vscode.Uri.joinPath(destination.uri, ...parentSegments)
						: destination.uri;
					await vscode.workspace.fs.createDirectory(parentUri);

					let shouldWrite = true;
					try {
						await vscode.workspace.fs.stat(targetFileUri);
						const choice = await vscode.window.showWarningMessage(
							`Prompt already exists at ${workspaceFolder.name}/${destination.label}/prompts/${entry.relativePath}. Overwrite?`,
							{ modal: true },
							'Overwrite',
							'Cancel'
						);
						shouldWrite = choice === 'Overwrite';
					} catch (error) {
						shouldWrite = true;
					}

					if (!shouldWrite) {
						return;
					}

					const content = await repository.readPrompt(entry.relativePath);
					const encoded = new TextEncoder().encode(content);
					await vscode.workspace.fs.writeFile(targetFileUri, encoded);
					vscode.window.showInformationMessage(
						`Prompt synced to ${workspaceFolder.name}/${destination.label}/prompts/${entry.relativePath}.`
					);
				}
			);
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

async function pickWorkspaceFolder(): Promise<vscode.WorkspaceFolder | undefined> {
	const folders = vscode.workspace.workspaceFolders;
	if (!folders || folders.length === 0) {
		return undefined;
	}

	if (folders.length === 1) {
		return folders[0];
	}

	const selection = await vscode.window.showQuickPick(
		folders.map((folder) => ({
			label: folder.name,
			description: folder.uri.fsPath,
			folder
		})),
		{ placeHolder: 'Select a workspace folder for syncing prompts' }
	);

	return selection?.folder;
}

interface DestinationPick extends vscode.QuickPickItem {
	uri: vscode.Uri;
	label: string;
}

async function pickDestinationFolder(folder: vscode.WorkspaceFolder): Promise<DestinationPick | undefined> {
	const options: DestinationPick[] = ['.vscode', '.cursor'].map((name) => ({
		label: name,
		description: `Sync prompt into ${name} directory`,
		uri: vscode.Uri.joinPath(folder.uri, name)
	}));

	if (options.length === 1) {
		return options[0];
	}

	return vscode.window.showQuickPick(options, {
		placeHolder: 'Choose the destination directory'
	});
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
