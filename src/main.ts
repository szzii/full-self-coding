#!/usr/bin/env bun

import { Command } from 'commander';
import analyzeCodebase from "./analyzer";
import { TaskSolverManager } from "./taskSolverManager";
import { createConfig, type Config } from './config';
import { readConfigWithEnv } from './configReader';
import { getGitRemoteUrls } from './utils/git';
import { CodeCommitter } from './codeCommitter';
import { WorkflowOrchestrator } from './workflowOrchestrator';
import { ZentaoIntegration } from './integrations/zentaoIntegration';
import fs from 'fs';
import { getYYMMDDHHMMSS } from './utils/getDateAndTime';

import type { Task } from './task';

// Global configuration accessible throughout the application
export let appConfig: Config;

/**
 * Load configuration
 */
function loadConfig(configFilePath?: string): Config {
	let config: Config;

	if (configFilePath) {
		try {
			const configFileContent = fs.readFileSync(configFilePath, 'utf-8');
			const userConfig = JSON.parse(configFileContent);
			config = createConfig(userConfig);
			console.log(`Loaded configuration from ${configFilePath}`);
		} catch (error) {
			console.error(`Error loading or parsing config file at ${configFilePath}:`, error);
			process.exit(1);
		}
	} else {
		try {
			config = readConfigWithEnv();
			console.log('Loaded configuration from ~/.config/full-self-coding/config.json');
		} catch (error) {
			console.error('Error loading configuration:', error);
			process.exit(1);
		}
	}

	appConfig = config;
	return config;
}

/**
 * Run workflow mode
 */
async function runWorkflowMode(options: {
	config?: string;
	autoApprove?: boolean;
	dryRun?: boolean;
}): Promise<void> {
	console.log('🚀 Full Self Coding - Workflow Mode\n');

	// Load config
	const config = loadConfig(options.config);

	// Check workflow is enabled
	if (!config.workflow?.enabled) {
		console.error('错误: 工作流模式未启用。请在配置文件中设置 workflow.enabled = true');
		process.exit(1);
	}

	// Override autoApprove if specified
	if (options.autoApprove !== undefined) {
		config.workflow.autoApprove = options.autoApprove;
	}

	// Dry run mode
	if (options.dryRun) {
		console.log('⚠️  Dry Run模式：将模拟执行，不会实际创建Issue或MR\n');
	}

	try {
		// Create orchestrator
		const orchestrator = new WorkflowOrchestrator(config);

		// Execute workflow
		const contexts = await orchestrator.execute();

		console.log(`\n✅ 工作流执行完成，处理了 ${contexts.length} 个需求`);
	} catch (error: any) {
		console.error('\n❌ 工作流执行失败:', error.message);
		process.exit(1);
	}
}

/**
 * Run analyze mode (original behavior)
 */
async function runAnalyzeMode(options: {
	config?: string;
}): Promise<void> {
	console.log('🚀 Full Self Coding - Analyze Mode\n');

	// Load config
	const config = loadConfig(options.config);

	// Log key configuration details
	console.log('Configuration loaded:');
	console.log(`  Agent Type: ${config.agentType}`);
	console.log(`  Max Docker Containers: ${config.maxDockerContainers}`);
	console.log(`  Docker Image: ${config.dockerImageRef}`);
	console.log(`  Work Style: ${config.workStyle}`);

	let gitRemoteUrl: string;
	try {
		const { fetchUrl } = await getGitRemoteUrls(config.useGithubSSH);
		gitRemoteUrl = fetchUrl || '';
		if (!gitRemoteUrl) {
			throw new Error("Could not determine git remote URL.");
		}
		console.log(`Detected Git remote URL: ${gitRemoteUrl}`);
	} catch (error) {
		console.error("Error getting git remote URL:", error);
		process.exit(1);
	}

	// Step 1: analyze the codebase and get tasks
	const tasks: Task[] = await analyzeCodebase(config, gitRemoteUrl);

	// Step 2: execute tasks based on analysis
	const taskSolverManager = new TaskSolverManager(config, gitRemoteUrl);
	for (const task of tasks) {
		taskSolverManager.addTask(task);
	}
	await taskSolverManager.start();

	const allTaskReports = taskSolverManager.getReports();

	// Step 3: do code commit
	const codeCommitter = new CodeCommitter(allTaskReports);
	await codeCommitter.commitAllChanges();

	// Step 4: save the final report
	const yymmddhhmmss = getYYMMDDHHMMSS();
	const logDir = process.env.HOME + "/Library/Logs/full-self-coding";

	if (!fs.existsSync(logDir)) {
		fs.mkdirSync(logDir, { recursive: true });
	}

	const reportPath = logDir + "/finalReport_" + yymmddhhmmss + ".txt";
	fs.writeFileSync(reportPath, JSON.stringify(allTaskReports, null, 2));

	console.log(`Final report saved to "${reportPath}"`);
}

/**
 * Main entry point with CLI commands
 */
async function main(): Promise<void> {
	const program = new Command();

	program
		.name('full-self-coding')
		.description('AI-powered automated software engineering tool')
		.version('1.0.1');

	// Default command (analyze mode)
	program
		.command('analyze', { isDefault: true })
		.description('Analyze codebase and execute tasks (default mode)')
		.option('-c, --config <path>', 'Path to configuration file')
		.action(async (options) => {
			await runAnalyzeMode(options);
		});

	// Workflow command
	program
		.command('workflow')
		.description('Run requirement-driven workflow mode')
		.option('-c, --config <path>', 'Path to configuration file')
		.option('--auto-approve', 'Automatically approve without user confirmation')
		.option('--dry-run', 'Simulate execution without creating issues or MRs')
		.action(async (options) => {
			await runWorkflowMode(options);
		});

	// Parse arguments
	await program.parseAsync(process.argv);
}

// Call the main function if this file is run directly
if (import.meta.main) {
	main().catch(console.error);
}
