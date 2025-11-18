import type { Task } from './task';
import { type Config, SWEAgentType } from './config';
import { DockerInstance, DockerRunStatus } from './dockerInstance';
import { analyzerPrompt } from './prompts/analyzerPrompt';
import { getCodingStyle } from './codingStyle';
import { getWorkStyleDescription, WorkStyle } from './workStyle';
import { trimJSONObjectArray } from './utils/trimJSON';
import { getClaudeCommand } from './SWEAgent/claudeCodeCommands';

/**
 * Analyzes the codebase and generates a list of tasks to be executed
 * @returns Promise<Task[]> Array of tasks identified from the codebase analysis
 */
export async function analyzeCodebase(
    config: Config, 
    gitRemoteUrl: string, 
    shutdownContainer: boolean = true,
    extraComandsBeforeAnalysis?: string
): Promise<Task[]> {

    const docker = new DockerInstance();
    let containerName: string | undefined;
    let tasks: Task[] = [];

    try {
        const dockerImageRef = config.dockerImageRef || 'node:latest';

        // the name of container = "analyzer-container" + date-and-time-in-yymmddhhmmss
        const containerName = `analyzer-container-${Date.now().toString().substring(2, 14)}`;
        await docker.startContainer(dockerImageRef, containerName);

        const allCommands: string[] = [];

        // 0. Create the fsc directory and prompt.txt
        // 0.1 run docker command that create /app folder
        await docker.runCommands(['mkdir', '-p', '/app']);

        // 0.2 get the prompt
        const workStyleDescription = await getWorkStyleDescription(config.workStyle || WorkStyle.DEFAULT, { customLabel: config.customizedWorkStyle });
        const codingStyleDescription = getCodingStyle(config.codingStyleLevel || 0);
        const prompt = analyzerPrompt(workStyleDescription, codingStyleDescription, config);

        // 0.3 send the file to /app/codeAnalyzerPrompt.txt
        await docker.copyFileToContainer(prompt, '/app/codeAnalyzerPrompt.txt');
        // step 0 done

        // // 0.4 copy all files related to git to the container
        // // 0.4.1 create ~/.ssh folder in the container
        // await docker.runCommands(['mkdir', '-p', '/root/.ssh']);
        // // 0.4.2 copy all files in ~/.ssh to ~/.ssh (/root/.ssh) in the container
        // await docker.copyFilesToContainer('~/.ssh', '/root/.ssh');
        // // 0.4.3 read ~/.gitconfig on local machine using fs
        // const fs = await import('fs');
        // const dotGitConfigFileText = await fs.promises.readFile('~/.gitconfig', 'utf8');
        // // 0.4.4 copy ~/.gitconfig to ~/.gitconfig (/root/.gitconfig) in the container
        // await docker.copyFileToContainer(dotGitConfigFileText, '/root/.gitconfig');


        // 1. Clone the source code repository
        allCommands.push(`git clone ${gitRemoteUrl} /app/repo`);

        // 2. Setup necessary tools (curl, nodejs, npm)
        allCommands.push("apt-get update");
        allCommands.push("apt-get install -y curl");
        allCommands.push("curl -fsSL https://deb.nodesource.com/setup_20.x | bash -");
        allCommands.push("apt-get install -y nodejs");

        // 3. Install gemini-cli globally if agent type is GEMINI_CLI
        if (config.agentType === SWEAgentType.GEMINI_CLI) {
            allCommands.push(`npm install -g @google/gemini-cli`);
        }
        else if (config.agentType=== SWEAgentType.CLAUDE_CODE) {
            allCommands.push(`npm install -g @anthropic-ai/claude-code`);
        }   



        if (config.agentType === SWEAgentType.GEMINI_CLI) {
            // 5. Prepare API key export and gemini command
            let geminiCommand = `gemini -p "all the task descriptions are located at /app/codeAnalyzerPrompt.txt, please read and execute" --yolo`;
            let apiKeyExportCommand: string | undefined;

            if (config.googleGeminiApiKey && config.googleGeminiAPIKeyExportNeeded) {
                apiKeyExportCommand = `export GEMINI_API_KEY=${config.googleGeminiApiKey}`;
            } else if (config.anthropicAPIKey && config.anthropicAPIKeyExportNeeded) {
                apiKeyExportCommand = `export ANTHROPIC_API_KEY=${config.anthropicAPIKey}`;
            } else if (config.openAICodexApiKey && config.openAICodexAPIKeyExportNeeded) {
                apiKeyExportCommand = `export OPENAI_API_KEY=${config.openAICodexApiKey}`;
            }

            if (apiKeyExportCommand) {
                geminiCommand = `${apiKeyExportCommand} && ${geminiCommand}`;
            }

            if (extraComandsBeforeAnalysis) {
                allCommands.push(extraComandsBeforeAnalysis);
            }
            allCommands.push(geminiCommand);
        }
        else if (config.agentType === SWEAgentType.CLAUDE_CODE) {
            allCommands.push(getClaudeCommand(config, true));
        }
        else if (config.agentType === SWEAgentType.CODEX) {
            throw new Error("SWEAgentType.CODEX is not implemented yet for analyzeCodebase");
        }

        console.log("Commands to run in Docker:");
        for (const command of allCommands) {
            console.log(command);
        }

        // Execute all commands in a single run
        const dockerResult = await docker.runCommands(
            allCommands,
            config.dockerTimeoutSeconds? config.dockerTimeoutSeconds : 0
        );

        if (dockerResult.status !== DockerRunStatus.SUCCESS) {
            console.error("Docker command execution failed:", dockerResult.error);
            throw new Error(`Docker command execution failed: ${dockerResult.error || dockerResult.output}`);
        }

        // 6. Read the generated tasks.json
        const readTasksCommand = `cat /app/tasks.json`;
        const readTasksResult = await docker.runCommands(
            [readTasksCommand],
            config.dockerTimeoutSeconds? config.dockerTimeoutSeconds : 0
        );

        if (readTasksResult.status !== DockerRunStatus.SUCCESS) {
            console.error("Failed to read tasks.json from Docker:", readTasksResult.error);
            throw new Error(`Failed to read tasks.json from Docker: ${readTasksResult.error || readTasksResult.output}`);
        }

        try {
            const outputTasksInString = trimJSONObjectArray(readTasksResult.output);
            console.log("***Output tasks in string:\n\n", outputTasksInString);
            tasks = JSON.parse(outputTasksInString);
        } catch (error) {
            console.error("Error parsing tasks.json:", error);
            throw new Error(`Error parsing tasks.json: ${error}`);
        }
    } finally {
        if (shutdownContainer) {
            await docker.shutdownContainer();
        }
    }
    return tasks;
}
export default analyzeCodebase;
