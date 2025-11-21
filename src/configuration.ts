import * as vscode from 'vscode';

const section = 'promptspushtool';

export interface PromptToolConfiguration {
	repositoryUrl: string;
	branch: string;
	promptsFolder: string;
	autoPullOnActivate: boolean;
}

export function getConfiguration(): PromptToolConfiguration {
	const config = vscode.workspace.getConfiguration(section);
	return {
		repositoryUrl: config.get<string>('repositoryUrl', '').trim(),
		branch: config.get<string>('branch', 'main').trim() || 'main',
		promptsFolder: normalizeFolder(config.get<string>('promptsFolder', 'prompts')),
		autoPullOnActivate: config.get<boolean>('autoPullOnActivate', true)
	};
}

export async function updateConfiguration<K extends keyof PromptToolConfiguration>(
	key: K,
	value: PromptToolConfiguration[K],
	target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Workspace
): Promise<void> {
	const config = vscode.workspace.getConfiguration(section);
	await config.update(key, value, target);
}

function normalizeFolder(input: string): string {
	const trimmed = input.trim();
	if (!trimmed) {
		return 'prompts';
	}
	return trimmed.replace(/^\/+/, '').replace(/\\+/g, '/').replace(/^\/+/, '');
}
