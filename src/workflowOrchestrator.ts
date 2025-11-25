/**
 * 工作流编排器模块
 *
 * 串联整个需求驱动开发的完整流程，管理状态机转换
 */

import ora from 'ora';
import type { Config, ProjectInfo, WorkflowConfig } from './config';
import { ZentaoIntegration, type ZentaoRequirement, type ZentaoBug } from './integrations/zentaoIntegration';
import { RequirementAnalyzer, type RequirementInfo } from './requirementAnalyzer';
import { ProjectMatcher, type BranchInfo } from './projectMatcher';
import { PromptOptimizer, type OptimizedPrompt } from './promptOptimizer';
import { IssueManager, type Issue } from './issueManager';
import { TaskSolver } from './taskSolver';
import { DockerInstance } from './dockerInstance';
import type { TaskResult } from './task';

/**
 * 工作流状态
 */
export type WorkflowState =
  | 'collecting'      // 采集需求
  | 'analyzing'       // 分析需求
  | 'matching'        // 匹配项目
  | 'optimizing'      // 优化prompt
  | 'creating_issue'  // 创建issue
  | 'executing'       // 执行任务
  | 'creating_mr'     // 创建MR
  | 'completed'       // 完成
  | 'failed'          // 失败
  | 'skipped';        // 跳过

/**
 * 工作流上下文
 */
export interface WorkflowContext {
  state: WorkflowState;
  requirement?: RequirementInfo;
  project?: ProjectInfo;
  branch?: BranchInfo;
  optimizedPrompt?: OptimizedPrompt;
  issue?: Issue;
  taskResult?: TaskResult;
  mergeRequest?: {
    iid: number;
    webUrl: string;
  };
  error?: Error;
  startTime: Date;
  endTime?: Date;
}

/**
 * 工作流编排器类
 */
export class WorkflowOrchestrator {
  private config: Config;
  private workflowConfig: WorkflowConfig;
  private zentao?: ZentaoIntegration;
  private issueManager: IssueManager;
  private requirementAnalyzer: RequirementAnalyzer;
  private projectMatcher: ProjectMatcher;
  private promptOptimizer: PromptOptimizer;

  constructor(config: Config) {
    this.config = config;

    // 工作流配置
    this.workflowConfig = config.workflow || {
      enabled: false,
      autoApprove: false,
      autoClose: true,
    };

    // 初始化集成
    if (config.zentao) {
      this.zentao = new ZentaoIntegration(config.zentao);
    }

    if (!config.issuePlatform) {
      throw new Error('需要配置issuePlatform才能使用工作流模式');
    }

    this.issueManager = new IssueManager(config.issuePlatform);

    // 初始化核心模块
    this.requirementAnalyzer = new RequirementAnalyzer(
      config,
      config.projects || []
    );

    this.projectMatcher = new ProjectMatcher(
      config,
      config.projects || []
    );

    this.promptOptimizer = new PromptOptimizer(config);
  }

  /**
   * 执行完整工作流
   */
  async execute(options?: {
    zentaoRequirements?: ZentaoRequirement[];
    zentaoBugs?: ZentaoBug[];
  }): Promise<WorkflowContext[]> {
    const spinner = ora('启动工作流...').start();

    try {
      // 1. 采集需求
      spinner.text = '📥 采集需求...';
      const requirements = await this.collectRequirements(options);

      if (requirements.length === 0) {
        spinner.warn('未找到需要处理的需求');
        return [];
      }

      spinner.succeed(`✓ 采集到 ${requirements.length} 个需求`);

      // 2. 分析需求
      spinner.start('🔍 分析需求...');
      const analyzedRequirements = await this.analyzeRequirements(requirements);
      spinner.succeed(`✓ 分析完成，共 ${analyzedRequirements.length} 个需求`);

      // 3. 处理每个需求
      const contexts: WorkflowContext[] = [];

      for (let i = 0; i < analyzedRequirements.length; i++) {
        const requirement = analyzedRequirements[i];

        console.log(`\n${'='.repeat(80)}`);
        console.log(`处理需求 ${i + 1}/${analyzedRequirements.length}: ${requirement.title}`);
        console.log('='.repeat(80));

        const context = await this.processRequirement(requirement);
        contexts.push(context);

        // 显示结果
        this.printContextSummary(context);
      }

      // 生成最终报告
      console.log('\n' + '='.repeat(80));
      console.log('📊 工作流执行完成');
      console.log('='.repeat(80));
      this.printFinalReport(contexts);

      return contexts;
    } catch (error: any) {
      spinner.fail(`工作流执行失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 处理单个需求的完整流程
   */
  async processRequirement(requirement: RequirementInfo): Promise<WorkflowContext> {
    const context: WorkflowContext = {
      state: 'analyzing',
      requirement,
      startTime: new Date(),
    };

    try {
      // 1. 匹配项目和分支
      context.state = 'matching';
      const spinner = ora('🔗 匹配项目和分支...').start();

      const matches = await this.projectMatcher.matchRequirement(requirement);

      let selection: { project: ProjectInfo; branch: BranchInfo } | null = null;

      if (this.workflowConfig.autoApprove) {
        // 自动批准模式
        selection = await this.projectMatcher.autoApprove(requirement);
      } else {
        // 交互式选择
        spinner.stop();
        selection = await this.projectMatcher.interactiveSelect(requirement, matches);
      }

      if (!selection) {
        context.state = 'skipped';
        context.endTime = new Date();
        spinner.warn('⏭ 跳过此需求');
        return context;
      }

      context.project = selection.project;
      context.branch = selection.branch;

      spinner.succeed(`✓ 已选择: ${selection.project.name} / ${selection.branch.name}`);

      // 2. 优化prompt
      context.state = 'optimizing';
      spinner.start('✨ 优化prompt...').render();

      context.optimizedPrompt = await this.promptOptimizer.optimizeRequirement(
        requirement,
        selection.project,
        selection.branch
      );

      spinner.succeed('✓ Prompt已优化');

      // 3. 创建Issue
      context.state = 'creating_issue';
      spinner.start('📝 创建GitLab Issue...').render();

      const projectId = this.issueManager.extractProjectId(selection.project.gitUrl);

      context.issue = await this.issueManager.createIssueFromRequirement(
        projectId,
        requirement,
        context.optimizedPrompt.sections.codebaseContext
      );

      spinner.succeed(`✓ Issue已创建: ${context.issue.webUrl}`);

      // 4. 执行任务
      context.state = 'executing';
      spinner.start('🚀 Docker Agent执行任务...').render();

      context.taskResult = await this.executeTask(
        context.optimizedPrompt,
        selection.project,
        selection.branch,
        context.issue
      );

      if (!context.taskResult.success) {
        throw new Error(`任务执行失败: ${context.taskResult.error || '未知错误'}`);
      }

      spinner.succeed('✓ 任务执行完成');

      // 5. 创建Merge Request
      context.state = 'creating_mr';
      spinner.start('🔀 创建Merge Request...').render();

      const sourceBranch = context.taskResult.branchName || `fix/issue-${context.issue.iid}`;
      const targetBranch = selection.branch.name;

      const mr = await this.issueManager.createMergeRequest(projectId, {
        sourceBranch,
        targetBranch,
        title: `解决 #${context.issue.iid}: ${requirement.title}`,
        description: this.buildMRDescription(context),
        removeSourceBranch: true,
        labels: context.issue.labels,
      });

      context.mergeRequest = {
        iid: mr.iid,
        webUrl: mr.webUrl,
      };

      spinner.succeed(`✓ Merge Request已创建: ${mr.webUrl}`);

      // 6. 关联Issue和MR
      await this.issueManager.linkIssueToMergeRequest(
        projectId,
        context.issue.iid,
        mr.iid
      );

      // 7. 添加执行报告到Issue
      await this.issueManager.addComment(
        projectId,
        context.issue.iid,
        this.buildExecutionReport(context)
      );

      // 8. 如果配置了自动关闭，关闭Issue
      if (this.workflowConfig.autoClose) {
        await this.issueManager.addComment(
          projectId,
          context.issue.iid,
          '✅ 任务已完成，MR已创建，Issue将自动关闭'
        );
      }

      context.state = 'completed';
      context.endTime = new Date();

      return context;
    } catch (error: any) {
      context.state = 'failed';
      context.error = error;
      context.endTime = new Date();

      // 如果Issue已创建，添加错误信息
      if (context.issue && context.project) {
        try {
          const projectId = this.issueManager.extractProjectId(context.project.gitUrl);
          await this.issueManager.addComment(
            projectId,
            context.issue.iid,
            `❌ 任务执行失败:\n\`\`\`\n${error.message}\n\`\`\``
          );
        } catch (commentError) {
          console.error('添加错误评论失败:', commentError);
        }
      }

      return context;
    }
  }

  /**
   * 采集需求
   */
  private async collectRequirements(options?: {
    zentaoRequirements?: ZentaoRequirement[];
    zentaoBugs?: ZentaoBug[];
  }): Promise<Array<ZentaoRequirement | ZentaoBug>> {
    const items: Array<ZentaoRequirement | ZentaoBug> = [];

    // 从参数获取
    if (options?.zentaoRequirements) {
      items.push(...options.zentaoRequirements);
    }

    if (options?.zentaoBugs) {
      items.push(...options.zentaoBugs);
    }

    // 如果没有提供，从禅道获取
    if (items.length === 0 && this.zentao) {
      // 获取活跃的需求
      const requirements = await this.zentao.fetchRequirements({
        status: ['active'],
      });
      items.push(...requirements);

      // 获取活跃的Bug
      const bugs = await this.zentao.fetchBugs({
        status: ['active'],
      });
      items.push(...bugs);
    }

    return items;
  }

  /**
   * 分析需求
   */
  private async analyzeRequirements(
    items: Array<ZentaoRequirement | ZentaoBug>
  ): Promise<RequirementInfo[]> {
    const requirements: ZentaoRequirement[] = [];
    const bugs: ZentaoBug[] = [];

    for (const item of items) {
      if ('severity' in item) {
        bugs.push(item);
      } else {
        requirements.push(item);
      }
    }

    return this.requirementAnalyzer.analyzeBatch(requirements, bugs);
  }

  /**
   * 执行任务
   */
  private async executeTask(
    prompt: OptimizedPrompt,
    project: ProjectInfo,
    branch: BranchInfo,
    issue: Issue
  ): Promise<TaskResult> {
    // 创建Task对象
    const task = {
      id: `workflow-${issue.iid}`,
      description: prompt.title,
      priority: 1,
      estimatedComplexity: prompt.metadata.complexity,
      files: [],
      dependencies: [],
    };

    // 使用TaskSolver执行任务
    const taskSolver = new TaskSolver(
      task,
      this.config,
      project.gitUrl,
      branch.name
    );

    // 传递优化后的prompt作为任务指令
    const result = await taskSolver.solve(prompt.formats.markdown);

    return result;
  }

  /**
   * 构建MR描述
   */
  private buildMRDescription(context: WorkflowContext): string {
    let desc = `## 🎯 解决的问题\n\n`;
    desc += `解决 Issue #${context.issue!.iid}\n\n`;
    desc += `${context.requirement!.analysis.mainGoal}\n\n`;

    desc += `## 📝 变更说明\n\n`;
    if (context.taskResult?.changes) {
      desc += `${context.taskResult.changes}\n\n`;
    } else {
      desc += `详见提交记录\n\n`;
    }

    desc += `## ✅ 验收标准\n\n`;
    context.optimizedPrompt!.sections.acceptanceCriteria.forEach(criterion => {
      desc += `- [ ] ${criterion}\n`;
    });
    desc += '\n';

    desc += `## 📊 元信息\n\n`;
    desc += `- **复杂度**: ${context.optimizedPrompt!.metadata.complexity}\n`;
    desc += `- **预估代码行数**: ${context.optimizedPrompt!.metadata.estimatedLOC}\n`;
    desc += `- **需求来源**: ${context.requirement!.source}\n\n`;

    desc += `---\n\n`;
    desc += `🤖 此MR由AI Agent自动生成\n`;

    return desc;
  }

  /**
   * 构建执行报告
   */
  private buildExecutionReport(context: WorkflowContext): string {
    const duration = context.endTime
      ? Math.round((context.endTime.getTime() - context.startTime.getTime()) / 1000)
      : 0;

    let report = `## 🤖 AI Agent执行报告\n\n`;
    report += `**执行状态**: ${context.state === 'completed' ? '✅ 成功' : '❌ 失败'}\n`;
    report += `**执行时间**: ${duration}秒\n`;
    report += `**项目**: ${context.project!.name}\n`;
    report += `**分支**: ${context.branch!.name}\n\n`;

    if (context.mergeRequest) {
      report += `**Merge Request**: !${context.mergeRequest.iid}\n`;
      report += `**MR链接**: ${context.mergeRequest.webUrl}\n\n`;
    }

    if (context.taskResult) {
      report += `### 执行结果\n\n`;
      report += `- **成功**: ${context.taskResult.success ? '是' : '否'}\n`;

      if (context.taskResult.filesChanged) {
        report += `- **修改文件数**: ${context.taskResult.filesChanged.length}\n`;
      }

      if (context.taskResult.error) {
        report += `- **错误信息**: ${context.taskResult.error}\n`;
      }
    }

    return report;
  }

  /**
   * 打印上下文摘要
   */
  private printContextSummary(context: WorkflowContext): void {
    const duration = context.endTime
      ? Math.round((context.endTime.getTime() - context.startTime.getTime()) / 1000)
      : 0;

    console.log('\n📋 执行摘要:');
    console.log(`  状态: ${this.getStateEmoji(context.state)} ${context.state}`);
    console.log(`  耗时: ${duration}秒`);

    if (context.project) {
      console.log(`  项目: ${context.project.name}`);
    }

    if (context.issue) {
      console.log(`  Issue: ${context.issue.webUrl}`);
    }

    if (context.mergeRequest) {
      console.log(`  MR: ${context.mergeRequest.webUrl}`);
    }

    if (context.error) {
      console.log(`  错误: ${context.error.message}`);
    }
  }

  /**
   * 打印最终报告
   */
  private printFinalReport(contexts: WorkflowContext[]): void {
    const completed = contexts.filter(c => c.state === 'completed').length;
    const failed = contexts.filter(c => c.state === 'failed').length;
    const skipped = contexts.filter(c => c.state === 'skipped').length;

    console.log(`\n总计: ${contexts.length} 个需求`);
    console.log(`  ✅ 成功: ${completed}`);
    console.log(`  ❌ 失败: ${failed}`);
    console.log(`  ⏭  跳过: ${skipped}`);

    const totalDuration = contexts.reduce((sum, c) => {
      if (c.endTime) {
        return sum + (c.endTime.getTime() - c.startTime.getTime()) / 1000;
      }
      return sum;
    }, 0);

    console.log(`  ⏱  总耗时: ${Math.round(totalDuration)}秒`);

    // 列出所有创建的MR
    const mrs = contexts.filter(c => c.mergeRequest);
    if (mrs.length > 0) {
      console.log(`\n🔀 创建的Merge Requests:`);
      mrs.forEach(c => {
        console.log(`  - ${c.requirement!.title}`);
        console.log(`    ${c.mergeRequest!.webUrl}`);
      });
    }
  }

  /**
   * 获取状态emoji
   */
  private getStateEmoji(state: WorkflowState): string {
    const emojis: Record<WorkflowState, string> = {
      collecting: '📥',
      analyzing: '🔍',
      matching: '🔗',
      optimizing: '✨',
      creating_issue: '📝',
      executing: '🚀',
      creating_mr: '🔀',
      completed: '✅',
      failed: '❌',
      skipped: '⏭',
    };
    return emojis[state] || '❓';
  }
}
