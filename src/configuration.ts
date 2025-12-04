import * as vscode from 'vscode';

const section = 'promptspushtool';

export interface PromptTemplateFileConfig {
	source: string;
	target?: string;
}

export interface PromptTemplateConfig {
	name: string;
	description?: string;
	destination?: string;
	files: PromptTemplateFileConfig[];
}

export interface PromptToolConfiguration {
	repositoryUrl: string;
	branch: string;
	promptsFolder: string;
	autoPullOnActivate: boolean;
	templates: PromptTemplateConfig[];
}

export function getConfiguration(): PromptToolConfiguration {
	const config = vscode.workspace.getConfiguration(section);
	return {
		repositoryUrl: config.get<string>('repositoryUrl', '').trim(),
		branch: config.get<string>('branch', 'main').trim() || 'main',
		promptsFolder: normalizeFolder(config.get<string>('promptsFolder', 'prompts')),
		autoPullOnActivate: config.get<boolean>('autoPullOnActivate', true),
		templates: normalizeTemplates(config.get('templates', []))
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
	const normalized = normalizeRelativePath(input);
	return normalized || 'prompts';
}

function normalizeTemplates(value: unknown): PromptTemplateConfig[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const templates: PromptTemplateConfig[] = [];
	for (const candidate of value) {
		const normalized = normalizeTemplate(candidate);
		if (normalized) {
			templates.push(normalized);
		}
	}
	return templates;
}

function normalizeTemplate(raw: unknown): PromptTemplateConfig | undefined {
	if (!raw || typeof raw !== 'object') {
		return undefined;
	}

	const nameValue = (raw as { [key: string]: unknown }).name;
	if (typeof nameValue !== 'string') {
		return undefined;
	}
	const name = nameValue.trim();
	if (!name) {
		return undefined;
	}

	const descriptionValue = (raw as { [key: string]: unknown }).description;
	const description =
		typeof descriptionValue === 'string' && descriptionValue.trim() ? descriptionValue.trim() : undefined;

	const destination = normalizeRelativeInput((raw as { [key: string]: unknown }).destination);

	const filesValue = (raw as { [key: string]: unknown }).files;
	if (!Array.isArray(filesValue)) {
		return undefined;
	}

	const files = filesValue
		.map((file) => normalizeTemplateFile(file))
		.filter((file): file is PromptTemplateFileConfig => Boolean(file));

	if (files.length === 0) {
		return undefined;
	}

	return {
		name,
		description,
		destination,
		files
	};
}

function normalizeTemplateFile(raw: unknown): PromptTemplateFileConfig | undefined {
	if (!raw || typeof raw !== 'object') {
		return undefined;
	}

	const source = normalizeRelativeInput((raw as { [key: string]: unknown }).source);
	if (!source) {
		return undefined;
	}

	const target = normalizeRelativeInput((raw as { [key: string]: unknown }).target);

	return target ? { source, target } : { source };
}

function normalizeRelativeInput(raw: unknown): string | undefined {
	if (typeof raw !== 'string') {
		return undefined;
	}
	const normalized = normalizeRelativePath(raw);
	return normalized || undefined;
}

function normalizeRelativePath(input: string): string {
	const trimmed = input.trim();
	if (!trimmed) {
		return '';
	}

	return trimmed
		.replace(/\\+/g, '/')
		.replace(/^\/+/, '')
		.replace(/\/+$/, '')
		.replace(/\/{2,}/g, '/');
}
