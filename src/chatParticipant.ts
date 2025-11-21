import * as vscode from 'vscode';
import { PromptRepository, PromptEntry } from './promptRepository';
import { ExtensionLogger } from './logger';

export function registerChatParticipant(
	context: vscode.ExtensionContext,
	repository: PromptRepository,
	logger: ExtensionLogger
): void {
	const chatApi = (vscode as unknown as { chat?: { createChatParticipant: (...args: any[]) => vscode.Disposable } }).chat;
	if (!chatApi?.createChatParticipant) {
		logger.warn('Chat API is not available in this environment.');
		return;
	}

	const participant = chatApi.createChatParticipant(
		'promptspushtool',
		async (request: any, _chatContext: any, response: any) => {
			if (!repository.isConfigured()) {
				response.markdown('Configure a prompts repository first using the **Prompts: Initialize Repository** command.');
				return;
			}

			try {
				const prompts = await repository.collectPromptFiles();
				if (prompts.length === 0) {
					response.markdown('The prompts repository is empty. Pull the latest prompts and try again.');
					return;
				}

				const referenced = resolveReferencedPrompts(request, prompts);
				const matches = referenced.length > 0 ? referenced : findMatches(request.prompt ?? '', prompts);

				if (matches.length === 0) {
					response.markdown('No prompts matched the request. Try mentioning a prompt by name or syncing the repository.');
					return;
				}

				const primary = matches[0];
				const content = await repository.readPrompt(primary.relativePath);

				response.markdown(`### ${primary.name}\n\n\`\`\`text\n${escapeCodeFences(content)}\n\`\`\``);

				const additional = matches.slice(1, 4);
				if (additional.length > 0) {
					const listItems = additional
						.map((entry) => `- [${entry.name}](command:promptspushtool.openPrompt?${encodeURIComponent(JSON.stringify([entry]))})`)
						.join('\n');
					response.markdown(`\n**Related prompts**\n${listItems}`);
				}
			} catch (error) {
				logger.error('Chat participant failed to serve prompt content', error);
				response.markdown('An error occurred while retrieving prompts. Check the output channel for details.');
			}
		},
		{ name: 'Prompt Catalog' }
	);

	context.subscriptions.push(participant);
}

function resolveReferencedPrompts(request: any, prompts: PromptEntry[]): PromptEntry[] {
	const references: any[] = Array.isArray(request?.references) ? request.references : [];
	const matched: PromptEntry[] = [];

	for (const reference of references) {
		const value = reference?.value;
		if (typeof value === 'string') {
			const match = findPromptByReference(value, prompts);
			if (match) {
				matched.push(match);
			}
		} else if (isUriLike(value)) {
			const match = prompts.find((entry) => entry.uri.toString() === value.toString());
			if (match) {
				matched.push(match);
			}
		}
	}

	return matched;
}

function isUriLike(value: unknown): value is vscode.Uri {
	return typeof value === 'object' && value !== null && typeof (value as vscode.Uri).scheme === 'string' && typeof (value as vscode.Uri).path === 'string';
}

function findMatches(query: string, prompts: PromptEntry[]): PromptEntry[] {
	const normalized = query.toLowerCase();
	if (!normalized.trim()) {
		return prompts.slice(0, 3);
	}

	const scored = prompts
		.map((entry) => ({
			entry,
			score: scoreEntry(normalized, entry)
		}))
		.filter((item) => item.score > 0)
		.sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name));

	return scored.slice(0, 5).map((item) => item.entry);
}

function scoreEntry(query: string, entry: PromptEntry): number {
	const name = entry.name.toLowerCase();
	const relative = entry.relativePath.toLowerCase();
	let score = 0;

	if (name.includes(query)) {
		score += 10;
	}

	const tokens = query.split(/\s+/).filter(Boolean);
	for (const token of tokens) {
		if (name.includes(token)) {
			score += 5;
		}
		if (relative.includes(token)) {
			score += 2;
		}
	}

	return score;
}

function findPromptByReference(value: string, prompts: PromptEntry[]): PromptEntry | undefined {
	const normalized = value.toLowerCase().replace(/^#+/, '');
	const candidates = [normalized, `${normalized}.md`, `${normalized}.txt`];
	return prompts.find((entry) => {
		const name = entry.name.toLowerCase();
		const relative = entry.relativePath.toLowerCase();
		return candidates.some((candidate) => name === candidate || relative === candidate);
	});
}

function escapeCodeFences(value: string): string {
	return value.replace(/```/g, '\\`\\`\\`');
}
