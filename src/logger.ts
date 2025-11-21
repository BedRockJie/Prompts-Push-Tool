import * as vscode from 'vscode';

export class ExtensionLogger {
	private readonly channel: vscode.OutputChannel;

	constructor(channelName = 'Prompts Push Tool') {
		this.channel = vscode.window.createOutputChannel(channelName);
	}

	dispose(): void {
		this.channel.dispose();
	}

	info(message: string): void {
		this.write('INFO', message);
	}

	warn(message: string): void {
		this.write('WARN', message);
	}

	error(message: string, error?: unknown): void {
		const errorSuffix = error instanceof Error ? `\n${error.name}: ${error.message}` : '';
		this.write('ERROR', `${message}${errorSuffix}`);
	}

	private write(level: 'INFO' | 'WARN' | 'ERROR', message: string): void {
		const timestamp = new Date().toISOString();
		this.channel.appendLine(`[${timestamp}] [${level}] ${message}`);
	}
}
