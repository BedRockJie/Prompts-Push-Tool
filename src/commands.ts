import * as vscode from 'vscode';
import { PromptRepository, PromptEntry } from './promptRepository';
import { PromptTreeDataProvider, PromptTreeItem } from './promptTreeDataProvider';
import { ExtensionLogger } from './logger';
import { getConfiguration, PromptTemplateConfig, updateConfiguration } from './configuration';

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
					const baseSegments = destination.subfolderSegments ?? [];
					const targetSegments = [...baseSegments, ...relativeSegments];
					const targetFileUri = vscode.Uri.joinPath(destination.uri, ...targetSegments);

					const parentSegments = targetSegments.slice(0, -1);
					const parentUri = parentSegments.length
						? vscode.Uri.joinPath(destination.uri, ...parentSegments)
						: destination.uri;
					await vscode.workspace.fs.createDirectory(parentUri);

					const destinationDisplay = [destination.label, ...baseSegments].filter(Boolean).join('/');
					const fullDisplayPath = destinationDisplay
						? `${workspaceFolder.name}/${destinationDisplay}/${entry.relativePath}`
						: `${workspaceFolder.name}/${entry.relativePath}`;

					let shouldWrite = true;
					try {
						await vscode.workspace.fs.stat(targetFileUri);
						const choice = await vscode.window.showWarningMessage(
							`Prompt already exists at ${fullDisplayPath}. Overwrite?`,
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
					vscode.window.showInformationMessage(`Prompt synced to ${fullDisplayPath}.`);
				}
			);
		}),

		vscode.commands.registerCommand('promptspushtool.applyTemplateToWorkspace', async () => {
			if (!repository.isConfigured()) {
				vscode.window.showWarningMessage('Configure a repository URL first.');
				return;
			}

			const config = getConfiguration();
			if (!config.templates.length) {
				vscode.window.showInformationMessage('Define templates under settings (promptspushtool.templates) before applying them.');
				return;
			}

			const pick = await vscode.window.showQuickPick(
				config.templates.map((template) => ({
					label: template.name,
					description: template.description ?? `${template.files.length} files`,
					template
				})),
				{ placeHolder: '选择要应用的模板' }
			);
			if (!pick) {
				return;
			}

			const workspaceFolder = await pickWorkspaceFolder();
			if (!workspaceFolder) {
				vscode.window.showWarningMessage('Open a workspace folder to sync templates.');
				return;
			}

			let destination: DestinationContext;
			if (pick.template.destination) {
				const templateSegments = splitSegments(pick.template.destination);
				const display = templateSegments.length
					? `${workspaceFolder.name}/${pick.template.destination}`
					: workspaceFolder.name;
				destination = {
					uri: workspaceFolder.uri,
					label: display,
					baseSegments: templateSegments
				};
			} else {
				const destinationPick = await pickDestinationFolder(workspaceFolder);
				if (!destinationPick) {
					return;
				}
				const baseSegments = destinationPick.subfolderSegments ?? [];
				const labelParts = [workspaceFolder.name, destinationPick.label, ...baseSegments].filter(Boolean);
				destination = {
					uri: destinationPick.uri,
					label: labelParts.join('/'),
					baseSegments
				};
			}

			let summary: TemplateCopySummary | undefined;
			try {
				summary = await vscode.window.withProgress(
					{
						location: vscode.ProgressLocation.Notification,
						title: `应用模板 ${pick.template.name}`
					},
					async () => {
						await repository.ensureInitialized();
						return applyTemplateFiles(pick.template, repository, destination, logger);
					}
				);
			} catch (error) {
				if (error instanceof TemplateApplyCancelled) {
					return;
				}
				logger.error('Failed to apply template', error);
				vscode.window.showErrorMessage('应用模板失败，请查看输出。');
				return;
			}

			if (!summary) {
				return;
			}

			const message = `模板 "${pick.template.name}" 应用完成：复制 ${summary.copied}，跳过 ${summary.skipped}，失败 ${summary.failed}。`;
			if (summary.failed > 0) {
				vscode.window.showWarningMessage(`${message} 详情请查看输出窗口。`);
			} else {
				vscode.window.showInformationMessage(message);
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
	subfolderSegments: string[];
}

async function pickDestinationFolder(folder: vscode.WorkspaceFolder): Promise<DestinationPick | undefined> {
	const destinations: Array<{ label: string; description: string; subfolderSegments: string[] }> = [
		{ label: '.vscode', description: 'Sync prompt into .vscode/prompts', subfolderSegments: ['prompts'] },
		{ label: '.cursor', description: 'Sync prompt into .cursor/rules', subfolderSegments: ['rules'] }
	];

	const options: DestinationPick[] = destinations.map((destination) => ({
		label: destination.label,
		description: destination.description,
		uri: vscode.Uri.joinPath(folder.uri, destination.label),
		subfolderSegments: destination.subfolderSegments
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

interface DestinationContext {
	uri: vscode.Uri;
	label: string;
	baseSegments: string[];
}

interface TemplateCopySummary {
	copied: number;
	skipped: number;
	failed: number;
}

type OverwriteMode = 'ask' | 'overwriteAll' | 'skipAll';

async function applyTemplateFiles(
	template: PromptTemplateConfig,
	repository: PromptRepository,
	destination: DestinationContext,
	logger: ExtensionLogger
): Promise<TemplateCopySummary> {
	const summary: TemplateCopySummary = { copied: 0, skipped: 0, failed: 0 };
	let overwriteMode: OverwriteMode = 'ask';

	for (const file of template.files) {
		const sourcePath = file.source;
		const relativeTarget = file.target ?? file.source;
		const relativeSegments = splitSegments(relativeTarget);
		if (!relativeSegments.length) {
			summary.skipped += 1;
			continue;
		}

		const targetSegments = [...destination.baseSegments, ...relativeSegments];
		const targetUri = vscode.Uri.joinPath(destination.uri, ...targetSegments);
		const parentSegments = targetSegments.slice(0, -1);
		const parentUri = parentSegments.length ? vscode.Uri.joinPath(destination.uri, ...parentSegments) : destination.uri;
		await vscode.workspace.fs.createDirectory(parentUri);

		const displayPath = destination.label
			? `${destination.label}/${relativeSegments.join('/')}`
			: relativeSegments.join('/');

		let shouldWrite = true;
		let exists = false;
		try {
			await vscode.workspace.fs.stat(targetUri);
			exists = true;
		} catch (error) {
			exists = false;
		}

		if (exists) {
			if (overwriteMode === 'overwriteAll') {
				shouldWrite = true;
			} else if (overwriteMode === 'skipAll') {
				shouldWrite = false;
			} else {
				const choice = await vscode.window.showWarningMessage(
					`${displayPath} 已存在，是否覆盖？`,
					{ modal: true },
					'Overwrite',
					'Overwrite All',
					'Skip',
					'Skip All',
					'Cancel'
				);
				switch (choice) {
					case 'Overwrite':
						shouldWrite = true;
						break;
					case 'Overwrite All':
						shouldWrite = true;
						overwriteMode = 'overwriteAll';
						break;
					case 'Skip':
						shouldWrite = false;
						break;
					case 'Skip All':
						shouldWrite = false;
						overwriteMode = 'skipAll';
						break;
					case 'Cancel':
					default:
						throw new TemplateApplyCancelled();
				}
			}
		}

		if (!shouldWrite) {
			summary.skipped += 1;
			continue;
		}

		let content: string;
		try {
			content = await repository.readPrompt(sourcePath);
		} catch (error) {
			logger.error(`Failed to read template source "${sourcePath}"`, error);
			summary.failed += 1;
			continue;
		}

		try {
			const encoded = new TextEncoder().encode(content);
			await vscode.workspace.fs.writeFile(targetUri, encoded);
			summary.copied += 1;
		} catch (error) {
			logger.error(`Failed to write template target "${displayPath}"`, error);
			summary.failed += 1;
		}
	}

	return summary;
}

class TemplateApplyCancelled extends Error {
	constructor() {
		super('Template application cancelled by user.');
	}
}

function splitSegments(value: string | undefined): string[] {
	if (!value) {
		return [];
	}
	return value
		.split(/[\\/]/)
		.map((segment) => segment.trim())
		.filter((segment) => Boolean(segment));
}
