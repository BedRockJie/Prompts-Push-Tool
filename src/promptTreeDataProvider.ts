import * as vscode from 'vscode';
import { PromptEntry, PromptRepository } from './promptRepository';

export class PromptTreeItem extends vscode.TreeItem {
	constructor(public readonly entry: PromptEntry) {
		super(entry.name, entry.type === vscode.FileType.Directory
			? vscode.TreeItemCollapsibleState.Collapsed
			: vscode.TreeItemCollapsibleState.None);

		this.resourceUri = entry.uri;
		this.contextValue = entry.type === vscode.FileType.Directory ? 'promptFolder' : 'promptFile';

		if (entry.type !== vscode.FileType.Directory) {
			this.command = {
				command: 'promptspushtool.openPrompt',
				title: 'Open Prompt',
				arguments: [this]
			};
		}
	}
}

export class PromptTreeDataProvider implements vscode.TreeDataProvider<PromptTreeItem> {
	private readonly _onDidChangeTreeData = new vscode.EventEmitter<PromptTreeItem | undefined>();

	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	constructor(private readonly repository: PromptRepository) {}

	refresh(): void {
		this._onDidChangeTreeData.fire(undefined);
	}

	getTreeItem(element: PromptTreeItem): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: PromptTreeItem): Promise<PromptTreeItem[]> {
		const target = element?.entry.type === vscode.FileType.Directory ? element.entry.relativePath : '';
		const entries = await this.repository.listEntries(target);
		return entries.map((entry) => new PromptTreeItem(entry));
	}
}
