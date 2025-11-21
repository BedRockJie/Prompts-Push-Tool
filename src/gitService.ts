import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ExtensionLogger } from './logger';

interface RunGitOptions {
	cwd?: string;
}

export class GitService {
	private gitVerified = false;

	constructor(private readonly logger: ExtensionLogger) {}

	async ensureGitAvailable(): Promise<void> {
		if (this.gitVerified) {
			return;
		}

		try {
			await this.runGit(['--version']);
			this.gitVerified = true;
		} catch (error) {
			throw new Error('Git is required but could not be found in PATH.');
		}
	}

	async clone(repositoryUrl: string, targetPath: string, branch: string): Promise<void> {
		await this.ensureGitAvailable();
		await fs.rm(targetPath, { recursive: true, force: true }).catch(() => undefined);
		await fs.mkdir(path.dirname(targetPath), { recursive: true });

		this.logger.info(`Cloning ${repositoryUrl} (${branch}) into ${targetPath}`);
		await this.runGit(['clone', '--depth', '1', '--branch', branch, repositoryUrl, targetPath]);
	}

	async pull(targetPath: string, branch: string): Promise<void> {
		await this.ensureGitAvailable();
		this.logger.info(`Fetching latest prompts for branch ${branch}`);
		await this.runGit(['fetch', 'origin', branch], { cwd: targetPath });
		await this.runGit(['checkout', branch], { cwd: targetPath });
		await this.runGit(['pull', '--ff-only', 'origin', branch], { cwd: targetPath });
	}

	async isRepository(folder: string): Promise<boolean> {
		try {
			await this.runGit(['rev-parse', '--is-inside-work-tree'], { cwd: folder });
			return true;
		} catch (error) {
			return false;
		}
	}

	async getRemoteUrl(folder: string): Promise<string | undefined> {
		try {
			const result = await this.runGit(['config', '--get', 'remote.origin.url'], { cwd: folder });
			return result.stdout.trim();
		} catch (error) {
			return undefined;
		}
	}

	private runGit(args: string[], options: RunGitOptions = {}): Promise<{ stdout: string; stderr: string }> {
		return new Promise((resolve, reject) => {
			const child = spawn('git', args, {
				cwd: options.cwd,
				env: process.env,
				shell: false,
				windowsHide: true
			});

			let stdout = '';
			let stderr = '';

			child.stdout?.on('data', (chunk) => {
				stdout += chunk.toString();
			});

			child.stderr?.on('data', (chunk) => {
				stderr += chunk.toString();
			});

			child.on('error', (error) => {
				reject(error);
			});

			child.on('close', (code) => {
				if (code === 0) {
					resolve({ stdout, stderr });
				} else {
					const message = stderr || stdout || `Git exited with code ${code}`;
					reject(new Error(message));
				}
			});
		});
	}
}
