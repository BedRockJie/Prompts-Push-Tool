import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import { GitService } from './gitService';
import { ExtensionLogger } from './logger';
import { PromptToolConfiguration } from './configuration';

export interface PromptEntry {
	name: string;
	relativePath: string;
	uri: vscode.Uri;
	type: vscode.FileType;
}

export class PromptRepository {
	private readonly repoUri: vscode.Uri;
	private config: PromptToolConfiguration;
	private readonly onDidChangeEmitter = new vscode.EventEmitter<void>();

	readonly onDidChange = this.onDidChangeEmitter.event;

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly git: GitService,
		private readonly logger: ExtensionLogger,
		initialConfig: PromptToolConfiguration
	) {
		this.config = initialConfig;
		this.repoUri = vscode.Uri.joinPath(this.context.globalStorageUri, 'prompt-repo');
	}

	updateConfiguration(config: PromptToolConfiguration): void {
		this.config = config;
	}

	get repositoryUri(): vscode.Uri {
		return this.repoUri;
	}

	get promptsRootUri(): vscode.Uri {
		return vscode.Uri.joinPath(this.repoUri, this.config.promptsFolder);
	}

	isConfigured(): boolean {
		return Boolean(this.config.repositoryUrl);
	}

	async ensureInitialized(): Promise<boolean> {
		if (!this.isConfigured()) {
			return false;
		}

		await vscode.workspace.fs.createDirectory(this.repoUri);

		const repoExists = await this.git.isRepository(this.repoUri.fsPath);

		if (repoExists) {
			const remote = await this.git.getRemoteUrl(this.repoUri.fsPath);
			if (!remote || remote !== this.config.repositoryUrl) {
				await this.resetRepositoryDirectory();
				await this.git.clone(this.config.repositoryUrl, this.repoUri.fsPath, this.config.branch);
				this.onDidChangeEmitter.fire();
			}
			return true;
		}

		const hasContent = await this.directoryHasContent(this.repoUri);
		if (hasContent) {
			await this.resetRepositoryDirectory();
		}

		await this.git.clone(this.config.repositoryUrl, this.repoUri.fsPath, this.config.branch);
		this.onDidChangeEmitter.fire();
		return true;
	}

	async pullLatest(): Promise<void> {
		if (!(await this.ensureInitialized())) {
			throw new Error('Repository URL is not configured.');
		}

		await this.git.pull(this.repoUri.fsPath, this.config.branch);
		this.onDidChangeEmitter.fire();
	}

	async listEntries(relativePath = ''): Promise<PromptEntry[]> {
		if (!(await this.ensureInitialized())) {
			return [];
		}

		const folderUri = relativePath
			? vscode.Uri.joinPath(this.promptsRootUri, relativePath)
			: this.promptsRootUri;

		try {
			const stats = await vscode.workspace.fs.stat(folderUri);
			if (stats.type !== vscode.FileType.Directory) {
				return [];
			}
		} catch (error) {
			return [];
		}

		const entries = await vscode.workspace.fs.readDirectory(folderUri);
		return entries
			.filter(([name]) => name !== '.git')
			.map(([name, fileType]) => {
				const nextRelative = relativePath ? `${relativePath}/${name}` : name;
				return {
					name,
					relativePath: nextRelative,
					uri: vscode.Uri.joinPath(this.promptsRootUri, nextRelative),
					type: fileType
				};
			})
			.sort((a, b) => {
				if (a.type !== b.type) {
					return a.type === vscode.FileType.Directory ? -1 : 1;
				}
				return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
			});
	}

	async collectPromptFiles(): Promise<PromptEntry[]> {
		const results: PromptEntry[] = [];
		await this.walkPrompts('', results);
		return results;
	}

	async readPrompt(relativePath: string): Promise<string> {
		const fileUri = vscode.Uri.joinPath(this.promptsRootUri, relativePath);
		const buffer = await vscode.workspace.fs.readFile(fileUri);
		return new TextDecoder('utf-8').decode(buffer);
	}

	private async walkPrompts(relative: string, results: PromptEntry[]): Promise<void> {
		const entries = await this.listEntries(relative);
		for (const entry of entries) {
			if (entry.type === vscode.FileType.Directory) {
				await this.walkPrompts(entry.relativePath, results);
			} else {
				results.push(entry);
			}
		}
	}

	private async directoryHasContent(uri: vscode.Uri): Promise<boolean> {
		try {
			const entries = await fs.readdir(uri.fsPath);
			return entries.length > 0;
		} catch (error) {
			return false;
		}
	}

	private async resetRepositoryDirectory(): Promise<void> {
		this.logger.warn('Resetting local repository directory.');
		await fs.rm(this.repoUri.fsPath, { recursive: true, force: true });
		await fs.mkdir(this.repoUri.fsPath, { recursive: true });
	}
}
