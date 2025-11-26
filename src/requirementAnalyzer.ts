/**
 * 需求分析器模块
 *
 * 使用AI分析需求内容，提取关键信息，评估复杂度和优先级
 */

import type { Config, ProjectInfo } from './config';
import type { ZentaoRequirement, ZentaoBug } from './integrations/zentaoIntegration';
import { DockerInstance } from './dockerInstance';
import { SWEAgentType } from './config';
import { claudeCodeCommands } from './SWEAgent/claudeCodeCommands';
import { geminiCodeCommands } from './SWEAgent/geminiCodeCommands';

/**
 * 需求信息接口
 */
export interface RequirementInfo {
  source: 'zentao-requirement' | 'zentao-bug' | 'wechat';
  sourceId: string;
  type: 'feature' | 'bug' | 'optimization' | 'refactor' | 'documentation';
  title: string;
  description: string;
  rawContent: string;

  // AI分析结果
  analysis: {
    mainGoal: string;             // 主要目标
    technicalStack: string[];     // 涉及技术栈
    affectedModules: string[];    // 影响的模块
    estimatedComplexity: 'low' | 'medium' | 'high';
    suggestedProjects: string[];  // 推荐项目
    suggestedBranches: string[];  // 推荐分支
    keywords: string[];           // 关键词
    implementationSteps?: string[]; // 实现步骤建议
  };

  priority: number;
  createdAt: Date;
}

/**
 * 需求分析器类
 */
export class RequirementAnalyzer {
  private config: Config;
  private projects: ProjectInfo[];

  constructor(config: Config, projects: ProjectInfo[] = []) {
    this.config = config;
    this.projects = projects;
  }

  /**
   * 分析禅道需求
   */
  async analyzeZentaoRequirement(req: ZentaoRequirement): Promise<RequirementInfo> {
    const rawContent = this.formatZentaoRequirement(req);

    // 使用AI分析需求
    const analysis = await this.analyzeWithAI(rawContent, 'requirement', req.title);

    return {
      source: 'zentao-requirement',
      sourceId: `zentao-req-${req.id}`,
      type: this.determineType(req.category, analysis),
      title: req.title,
      description: req.description,
      rawContent,
      analysis,
      priority: req.priority,
      createdAt: req.createdAt,
    };
  }

  /**
   * 分析禅道Bug
   */
  async analyzeZentaoBug(bug: ZentaoBug): Promise<RequirementInfo> {
    const rawContent = this.formatZentaoBug(bug);

    // 使用AI分析Bug
    const analysis = await this.analyzeWithAI(rawContent, 'bug', bug.title);

    return {
      source: 'zentao-bug',
      sourceId: `zentao-bug-${bug.id}`,
      type: 'bug',
      title: bug.title,
      description: bug.description,
      rawContent,
      analysis,
      priority: bug.pri,
      createdAt: bug.createdAt,
    };
  }

  /**
   * 批量分析
   */
  async analyzeBatch(
    requirements: ZentaoRequirement[] = [],
    bugs: ZentaoBug[] = []
  ): Promise<RequirementInfo[]> {
    const results: RequirementInfo[] = [];

    // 分析需求
    for (const req of requirements) {
      try {
        const info = await this.analyzeZentaoRequirement(req);
        results.push(info);
      } catch (error: any) {
        console.error(`分析需求 ${req.id} 失败:`, error.message);
      }
    }

    // 分析Bug
    for (const bug of bugs) {
      try {
        const info = await this.analyzeZentaoBug(bug);
        results.push(info);
      } catch (error: any) {
        console.error(`分析Bug ${bug.id} 失败:`, error.message);
      }
    }

    return results;
  }

  /**
   * 使用AI分析需求内容
   */
  private async analyzeWithAI(
    content: string,
    contentType: 'requirement' | 'bug',
    title: string
  ): Promise<RequirementInfo['analysis']> {
    const prompt = this.buildAnalysisPrompt(content, contentType);

    try {
      // 使用Docker容器运行AI分析
      const result = await this.runAIAnalysis(prompt);
      return this.parseAnalysisResult(result);
    } catch (error: any) {
      console.error('AI分析失败，使用回退分析:', error.message);
      // 回退到简单分析
      return this.fallbackAnalysis(content, title);
    }
  }

  /**
   * 构建分析prompt
   */
  private buildAnalysisPrompt(content: string, contentType: string): string {
    const projectsInfo = this.projects.length > 0
      ? `\n\n可用项目列表：\n${this.projects.map(p => `- ${p.name}: ${p.description || ''} [技术栈: ${p.technicalStack?.join(', ') || 'unknown'}]`).join('\n')}`
      : '';

    return `你是一个专业的软件需求分析师。请分析以下${contentType === 'bug' ? 'Bug' : '需求'}，并提取关键信息。

${content}
${projectsInfo}

请以JSON格式返回分析结果，格式如下：
{
  "mainGoal": "用一句话描述主要目标",
  "technicalStack": ["涉及的技术栈1", "技术栈2"],
  "affectedModules": ["影响的模块1", "模块2"],
  "estimatedComplexity": "low|medium|high",
  "suggestedProjects": ["推荐的项目名称1", "项目名称2"],
  "suggestedBranches": ["推荐的分支名1", "分支名2"],
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "implementationSteps": ["实现步骤1", "步骤2", "步骤3"]
}

注意：
1. 如果有可用项目列表，请根据项目的技术栈和描述来推荐最合适的项目
2. 分支名建议使用常见的命名规范，如 main, develop, feature/xxx
3. 复杂度评估：low=简单修改（<100行代码），medium=中等改动（100-500行），high=大规模改动（>500行）
4. 关键词要精炼，有助于后续搜索和匹配
5. 只返回JSON，不要有其他说明文字`;
  }

  /**
   * 运行AI分析
   */
  private async runAIAnalysis(prompt: string): Promise<string> {
    // 创建临时Docker容器运行AI agent
    const docker = new DockerInstance(
      this.config.dockerImageRef || 'node:latest',
      `requirement-analyzer-${Date.now()}`,
      this.config
    );

    try {
      // 启动容器
      await docker.startContainer(
        this.config.dockerImageRef || 'node:latest',
        `requirement-analyzer-${Date.now()}`
      );

      // 根据agent类型生成命令
      const commands = this.generateAnalysisCommands(prompt);

      // 运行分析
      const result = await docker.runCommands(
        commands,
        (this.config.dockerTimeoutSeconds || 300) * 1000
      );

      if (!result.success) {
        throw new Error(`AI分析失败: ${result.error || '未知错误'}`);
      }

      return result.stdout;
    } finally {
      // 关闭容器
      await docker.shutdownContainer();
    }
  }

  /**
   * 生成分析命令
   */
  private generateAnalysisCommands(prompt: string): string[] {
    const agentType = this.config.agentType || SWEAgentType.CLAUDE_CODE;

    // 创建临时文件保存prompt
    const commands: string[] = [
      `cat > /tmp/analysis-prompt.txt << 'EOFPROMPT'\n${prompt}\nEOFPROMPT`,
    ];

    if (agentType === SWEAgentType.CLAUDE_CODE) {
      // Claude Code方式
      commands.push(...claudeCodeCommands(
        this.config,
        'Analyze the requirement in /tmp/analysis-prompt.txt and output the JSON result'
      ));
    } else if (agentType === SWEAgentType.GEMINI_CLI) {
      // Gemini CLI方式
      commands.push(...geminiCodeCommands(
        this.config,
        'Analyze the requirement in /tmp/analysis-prompt.txt and output the JSON result'
      ));
    } else {
      throw new Error(`不支持的agent类型: ${agentType}`);
    }

    return commands;
  }

  /**
   * 解析AI分析结果
   */
  private parseAnalysisResult(result: string): RequirementInfo['analysis'] {
    try {
      // 尝试提取JSON
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('无法从AI响应中提取JSON');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        mainGoal: parsed.mainGoal || '',
        technicalStack: Array.isArray(parsed.technicalStack) ? parsed.technicalStack : [],
        affectedModules: Array.isArray(parsed.affectedModules) ? parsed.affectedModules : [],
        estimatedComplexity: parsed.estimatedComplexity || 'medium',
        suggestedProjects: Array.isArray(parsed.suggestedProjects) ? parsed.suggestedProjects : [],
        suggestedBranches: Array.isArray(parsed.suggestedBranches) ? parsed.suggestedBranches : ['main'],
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        implementationSteps: Array.isArray(parsed.implementationSteps) ? parsed.implementationSteps : undefined,
      };
    } catch (error: any) {
      throw new Error(`解析AI分析结果失败: ${error.message}`);
    }
  }

  /**
   * 回退分析（当AI分析失败时）
   */
  private fallbackAnalysis(content: string, title: string): RequirementInfo['analysis'] {
    // 简单的关键词提取
    const keywords = this.extractKeywords(content);

    // 基于关键词推测技术栈
    const technicalStack = this.guessTechnicalStack(content);

    // 基于内容长度估计复杂度
    const complexity = content.length < 200 ? 'low'
      : content.length < 1000 ? 'medium'
      : 'high';

    return {
      mainGoal: title,
      technicalStack,
      affectedModules: [],
      estimatedComplexity: complexity,
      suggestedProjects: this.matchProjectsByKeywords(keywords),
      suggestedBranches: ['develop', 'main'],
      keywords,
      implementationSteps: undefined,
    };
  }

  /**
   * 提取关键词
   */
  private extractKeywords(content: string): string[] {
    // 简单的关键词提取逻辑
    const words = content
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);

    // 去重并取前10个
    return Array.from(new Set(words)).slice(0, 10);
  }

  /**
   * 推测技术栈
   */
  private guessTechnicalStack(content: string): string[] {
    const stacks: string[] = [];
    const lower = content.toLowerCase();

    const stackKeywords: Record<string, string[]> = {
      'TypeScript': ['typescript', 'ts', '.ts'],
      'JavaScript': ['javascript', 'js', '.js'],
      'React': ['react', 'jsx', 'tsx'],
      'Vue': ['vue', 'vue.js'],
      'Node.js': ['node', 'nodejs', 'express'],
      'Python': ['python', 'py', 'django', 'flask'],
      'Java': ['java', 'spring', 'springboot'],
      'Go': ['golang', 'go'],
      'Docker': ['docker', 'container'],
      'Kubernetes': ['k8s', 'kubernetes'],
    };

    for (const [stack, keywords] of Object.entries(stackKeywords)) {
      if (keywords.some(keyword => lower.includes(keyword))) {
        stacks.push(stack);
      }
    }

    return stacks;
  }

  /**
   * 根据关键词匹配项目
   */
  private matchProjectsByKeywords(keywords: string[]): string[] {
    const matches: Array<{ name: string; score: number }> = [];

    for (const project of this.projects) {
      let score = 0;

      // 检查项目名称
      if (keywords.some(k => project.name.toLowerCase().includes(k))) {
        score += 3;
      }

      // 检查项目描述
      if (project.description) {
        if (keywords.some(k => project.description!.toLowerCase().includes(k))) {
          score += 2;
        }
      }

      // 检查技术栈
      if (project.technicalStack) {
        for (const tech of project.technicalStack) {
          if (keywords.some(k => tech.toLowerCase().includes(k))) {
            score += 1;
          }
        }
      }

      if (score > 0) {
        matches.push({ name: project.name, score });
      }
    }

    // 按分数排序并返回项目名称
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(m => m.name);
  }

  /**
   * 格式化禅道需求
   */
  private formatZentaoRequirement(req: ZentaoRequirement): string {
    return `# 需求：${req.title}

**ID**: ${req.id}
**状态**: ${req.status}
**优先级**: ${req.priority} (1=最高, 4=最低)
**产品**: ${req.product}
**分类**: ${req.category}
**阶段**: ${req.stage}
**指派给**: ${req.assignedTo}
**创建时间**: ${req.createdAt.toISOString()}

## 需求描述
${req.description}

${req.spec ? `## 详细规格\n${req.spec}` : ''}

${req.verify ? `## 验收标准\n${req.verify}` : ''}

${req.estimate ? `## 预计工时\n${req.estimate} 小时` : ''}`;
  }

  /**
   * 格式化禅道Bug
   */
  private formatZentaoBug(bug: ZentaoBug): string {
    return `# Bug：${bug.title}

**ID**: ${bug.id}
**状态**: ${bug.status}
**严重程度**: ${bug.severity} (1=致命, 4=轻微)
**优先级**: ${bug.pri}
**产品**: ${bug.product}
**模块**: ${bug.module}
**类型**: ${bug.type}
**指派给**: ${bug.assignedTo}
**创建时间**: ${bug.createdAt.toISOString()}

## Bug描述
${bug.description}

## 重现步骤
${bug.steps}

## 环境信息
- 操作系统: ${bug.os}
- 浏览器: ${bug.browser}`;
  }

  /**
   * 确定需求类型
   */
  private determineType(category: string, analysis: RequirementInfo['analysis']): RequirementInfo['type'] {
    const categoryLower = category.toLowerCase();

    if (categoryLower.includes('bug') || categoryLower.includes('缺陷')) {
      return 'bug';
    }

    if (categoryLower.includes('优化') || categoryLower.includes('性能')) {
      return 'optimization';
    }

    if (categoryLower.includes('重构') || categoryLower.includes('refactor')) {
      return 'refactor';
    }

    if (categoryLower.includes('文档') || categoryLower.includes('document')) {
      return 'documentation';
    }

    // 根据分析结果的关键词进一步判断
    const keywords = analysis.keywords.join(' ').toLowerCase();
    if (keywords.includes('文档') || keywords.includes('doc')) {
      return 'documentation';
    }

    return 'feature';
  }
}
