import type { Config, SWEAgentType } from "./config";
import type { Task, TaskResult } from "./task";
import { TaskStatus } from "./task";
import { DockerInstance, DockerRunStatus } from "./dockerInstance";
import { taskSolverCommands } from "./SWEAgent/SWEAgentTaskSolverCommands";
import { trimJSONSingleObject } from "./utils/trimJSON";
import { taskSolverPrompt } from "./prompts/taskSolverPrompt";
export class TaskSolver {
    private config: Config;
    private task: Task;
    private taskResult: TaskResult;
    private agentType: SWEAgentType;
    private gitURL: string;
    private dockerInstance: DockerInstance;
    private dockerContainerName: string;

    constructor(config: Config, task: Task, agentType: SWEAgentType, gitURL: string) {
        this.config = config;
        this.task = task;
        this.taskResult = {
            ...task,
            status: TaskStatus.NOT_STARTED,
            report: '',
            completedAt: 0,
        };
        this.agentType = agentType;
        this.gitURL = gitURL;
        this.dockerInstance = new DockerInstance();
        this.dockerContainerName = "";

        this.agentType = this.config.agentType;
    }

    /**
     * Solves the task and returns the result
     */
    async solve(shutdown: boolean = true){

      const imageRef = this.config.dockerImageRef || "node:latest";
      console.log(`task solver is now solving task ${this.task.ID}`);
      this.dockerContainerName = await this.dockerInstance.startContainer(imageRef, this.task.ID);


      // // copy all files related to git to the container
      // // create ~/.ssh folder in the container
      // await this.dockerInstance.runCommands(['mkdir', '-p', '/root/.ssh']);
      // // copy all files in ~/.ssh to ~/.ssh (/root/.ssh) in the container
      // await this.dockerInstance.copyFilesToContainer('~/.ssh', '/root/.ssh');
      // // read ~/.gitconfig on local machine using fs  
      // const fs = await import('fs');
      // const dotGitConfigFileText = await fs.promises.readFile('~/.gitconfig', 'utf8');
      // // copy ~/.gitconfig to ~/.gitconfig (/root/.gitconfig) in the container
      // await this.dockerInstance.copyFileToContainer(dotGitConfigFileText, '/root/.gitconfig');


      // first get the task prompt and save/copy to the docker container
      const taskPrompt = taskSolverPrompt(this.task, this.config);
      
      // save the task prompt to the docker container
      await this.dockerInstance.runCommands([
        "mkdir -p /app"
      ], this.config.dockerTimeoutSeconds? this.config.dockerTimeoutSeconds : 0);
      await this.dockerInstance.copyFileToContainer(taskPrompt, "/app/taskSolverPrompt.txt");

      // get the command
      const commandArray = taskSolverCommands(this.agentType, this.config, this.task, this.gitURL);

      // split the commandArray, the first N-1 commands to run using dockerInstance.runCommands
      // the last command to run using dockerInstance.runCommandAsync
      const lastCommand = commandArray.pop();

      // run the first N-1 commands
      // const dockerResult = await this.dockerInstance.runCommands(commandArray, this.config.dockerTimeoutSeconds? this.config.dockerTimeoutSeconds : 0);

      for (const eachCommand of commandArray) {
        const dockerResult = await this.dockerInstance.runCommandAsync(eachCommand, this.config.dockerTimeoutSeconds? this.config.dockerTimeoutSeconds : 0);
        if (dockerResult.status !== DockerRunStatus.SUCCESS) {
          console.error(`Docker run failed with status ${dockerResult.status}`);
          throw new Error(`Docker run failed with status ${dockerResult.status}`);
        }
      }

      let finalOutputOfTaskSolverCommand = null;

      // run the last command asynchronously
      if (lastCommand) {
        finalOutputOfTaskSolverCommand = await this.dockerInstance.runCommandAsync(lastCommand, this.config.dockerTimeoutSeconds? this.config.dockerTimeoutSeconds : 0);
      }
      else {
        throw new Error("Last command for running task solver is undefined.");
      }

      // parse the output of the last command
      if (finalOutputOfTaskSolverCommand.status !== DockerRunStatus.SUCCESS) {
        console.error(`Docker run task solver command failed with status ${finalOutputOfTaskSolverCommand.status}`);
        throw new Error(`Docker run task solver command failed with status ${finalOutputOfTaskSolverCommand.status}`);
      }

      // // parse the output
      // if (dockerResult.status !== DockerRunStatus.SUCCESS) {
      //   console.error(`Docker run failed with status ${dockerResult.status}`);
      //   throw new Error(`Docker run failed with status ${dockerResult.status}`);
      // }

      // console.log("All commands executed successfully.");
      // console.log(dockerResult.output);

      // read the generated final report from /app/finalReport.json
      const readFinalReportCommand = `node /app/diff/run.js && cat /app/finalReport.json`;

      const finalReportResult = await this.dockerInstance.runCommands([readFinalReportCommand], this.config.dockerTimeoutSeconds? this.config.dockerTimeoutSeconds : 0);

      if (finalReportResult.status !== DockerRunStatus.SUCCESS) {
        console.error(`Docker run failed with status ${finalReportResult.status}`);
      }
      
      /**
       * parse the output, here is an example:
       *
        {
            "taskId": "the task ID",
            "title": "the task title",
            "description": "the task description",
            "status": "success" | "skipped" | "failed",
            "report": "A very detailed report of the task execution."
        }
       */
      try {

        /**
         * Read the final report from the container
         */
        const finalReport = JSON.parse(trimJSONSingleObject(finalReportResult.output));
        const { taskId, title, description, status,  report } = finalReport;
        this.taskResult = {
          ...this.taskResult,
          title,
          description,
          status: status === "success" ? TaskStatus.SUCCESS : status === "skipped" ? TaskStatus.SKIPPED : TaskStatus.FAILURE,
          report,
          completedAt: Date.now(),
        };

        /**
         * Read the git diff from the container via file /app/git_diff.txt
         * and parse it as JSON
         */
        if (status === "success") {
          console.log("Start to read git diff from container...");
          const gitDiffResult = await this.dockerInstance.copyFileFromContainer("/app/git_diff.txt");
          this.taskResult.gitDiff = gitDiffResult;
          console.log("Git diff read successfully.");
        }

        // the last step, output "done" to "/app/done.txt"
        await this.dockerInstance.runCommands([
          "echo \"done\" > /app/done.txt"
        ], this.config.dockerTimeoutSeconds? this.config.dockerTimeoutSeconds : 0);
      } catch (error) {
        console.error(`Failed to parse final report: ${error}`);
        throw new Error(`Failed to parse final report: ${error}`);
      }
      finally {
        if (shutdown) {
          await this.dockerInstance.shutdownContainer();
        }
      }
    }

    /**
     * Returns the result of the task solving process
     */
    getResult(){
      return this.taskResult;
    }
}