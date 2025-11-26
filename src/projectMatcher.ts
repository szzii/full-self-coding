/**
 * 项目匹配器模块
 *
 * 根据需求分析结果，智能匹配项目和分支，并提供交互式选择界面
 */

import inquirer from 'inquirer';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { Config, ProjectInfo } from './config';
import type { RequirementInfo } from './requirementAnalyzer';

const execAsync = promisify(exec);

/**
 * 分支信息接口
 */
export interface BranchInfo {
  name: string;
  isLocal: boolean;
  isRemote: boolean;
  lastCommit: {
    hash: string;
    message: string;
    author: string;
    date: Date;
  };
}

/**
 * 匹配结果接口
 */
export interface MatchResult {
  project: ProjectInfo;
  branch: BranchInfo;
  matchScore: number;  // 0-100
  matchReasons: string[];
}

/**
 * 项目匹配器类
 */
export class ProjectMatcher {
  private config: Config;
  private projects: ProjectInfo[];

  constructor(config: Config, projects: ProjectInfo[] = []) {
    this.config = config;
    this.projects = projects;

    if (this.projects.length === 0 && config.projects) {
      this.projects = config.projects;
    }
  }

  /**
   * 枚举所有项目
   */
  async listAllProjects(): Promise<ProjectInfo[]> {
    return this.projects;
  }

  /**
   * 枚举指定项目的所有分支
   */
  async listBranches(project: ProjectInfo): Promise<BranchInfo[]> {
    try {
      // 进入项目目录
      const cwd = project.path;

      // 获取所有分支（本地和远程）
      const { stdout: branchList } = await execAsync(
        'git branch -a --format="%(refname:short)|%(objectname:short)|%(authorname)|%(authordate:iso8601)|%(subject)"',
        { cwd }
      );

      const branches: BranchInfo[] = [];
      const branchMap = new Map<string, BranchInfo>();

      for (const line of branchList.trim().split('\n')) {
        if (!line) continue;

        const [fullName, hash, author, date, message] = line.split('|');
        let branchName = fullName.trim();
        let isLocal = true;
        let isRemote = false;

        // 处理远程分支
        if (branchName.startsWith('origin/')) {
          branchName = branchName.replace('origin/', '');
          isRemote = true;
          isLocal = false;
        }

        // 跳过HEAD
        if (branchName === 'HEAD' || branchName.includes('HEAD ->')) {
          continue;
        }

        // 检查是否已经存在
        const existing = branchMap.get(branchName);
        if (existing) {
          // 更新标记（同时本地和远程存在）
          existing.isLocal = existing.isLocal || isLocal;
          existing.isRemote = existing.isRemote || isRemote;
        } else {
          const branchInfo: BranchInfo = {
            name: branchName,
            isLocal,
            isRemote,
            lastCommit: {
              hash: hash?.trim() || '',
              message: message?.trim() || '',
              author: author?.trim() || '',
              date: date ? new Date(date.trim()) : new Date(),
            },
          };
          branchMap.set(branchName, branchInfo);
        }
      }

      return Array.from(branchMap.values());
    } catch (error: any) {
      console.error(`获取项目 ${project.name} 的分支列表失败:`, error.message);
      return [];
    }
  }

  /**
   * 智能匹配项目和分支
   */
  async matchRequirement(requirement: RequirementInfo): Promise<MatchResult[]> {
    const matches: MatchResult[] = [];

    for (const project of this.projects) {
      const { score, reasons } = this.calculateMatchScore(requirement, project);

      if (score > 0) {
        // 获取推荐分支
        const branches = await this.listBranches(project);
        const recommendedBranch = this.recommendBranch(requirement, branches);

        if (recommendedBranch) {
          matches.push({
            project,
            branch: recommendedBranch,
            matchScore: score,
            matchReasons: reasons,
          });
        }
      }
    }

    // 按分数排序
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * 交互式选择
   */
  async interactiveSelect(
    requirement: RequirementInfo,
    matches: MatchResult[]
  ): Promise<{ project: ProjectInfo; branch: BranchInfo } | null> {
    console.log('\n=== 需求信息 ===');
    console.log(`标题: ${requirement.title}`);
    console.log(`类型: ${requirement.type}`);
    console.log(`优先级: ${requirement.priority}`);
    console.log(`复杂度: ${requirement.analysis.estimatedComplexity}`);
    console.log(`主要目标: ${requirement.analysis.mainGoal}`);

    if (matches.length === 0) {
      console.log('\n未找到匹配的项目。');

      // 让用户手动选择项目
      const { selectedProject } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedProject',
          message: '请选择一个项目:',
          choices: [
            ...this.projects.map(p => ({ name: p.name, value: p })),
            { name: '跳过此需求', value: null },
          ],
        },
      ]);

      if (!selectedProject) {
        return null;
      }

      // 选择分支
      const branches = await this.listBranches(selectedProject);
      const { selectedBranch } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedBranch',
          message: '请选择一个分支:',
          choices: branches.map(b => ({
            name: `${b.name} ${b.isLocal ? '[本地]' : ''} ${b.isRemote ? '[远程]' : ''}`,
            value: b,
          })),
        },
      ]);

      return {
        project: selectedProject,
        branch: selectedBranch,
      };
    }

    // 显示匹配结果
    console.log('\n=== 推荐的项目和分支 ===');
    matches.slice(0, 5).forEach((match, index) => {
      console.log(`\n${index + 1}. ${match.project.name} (匹配度: ${match.matchScore}%)`);
      console.log(`   分支: ${match.branch.name}`);
      console.log(`   匹配原因: ${match.matchReasons.join(', ')}`);
    });

    // 让用户选择
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '请选择操作:',
        choices: [
          { name: '使用第1个推荐（最匹配）', value: 'use-first' },
          { name: '从列表中选择', value: 'select' },
          { name: '手动选择其他项目', value: 'manual' },
          { name: '跳过此需求', value: 'skip' },
        ],
      },
    ]);

    if (action === 'skip') {
      return null;
    }

    if (action === 'use-first') {
      const first = matches[0];
      console.log(`✓ 已选择: ${first.project.name} / ${first.branch.name}`);
      return {
        project: first.project,
        branch: first.branch,
      };
    }

    if (action === 'select') {
      const { selectedMatch } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedMatch',
          message: '选择项目和分支:',
          choices: matches.slice(0, 10).map((match, index) => ({
            name: `${match.project.name} / ${match.branch.name} (${match.matchScore}%)`,
            value: match,
          })),
        },
      ]);

      console.log(`✓ 已选择: ${selectedMatch.project.name} / ${selectedMatch.branch.name}`);
      return {
        project: selectedMatch.project,
        branch: selectedMatch.branch,
      };
    }

    // manual - 手动选择
    const { selectedProject } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedProject',
        message: '请选择一个项目:',
        choices: this.projects.map(p => ({ name: p.name, value: p })),
      },
    ]);

    const branches = await this.listBranches(selectedProject);
    const { selectedBranch } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedBranch',
        message: '请选择一个分支:',
        choices: branches.map(b => ({
          name: `${b.name} ${b.isLocal ? '[本地]' : ''} ${b.isRemote ? '[远程]' : ''}`,
          value: b,
        })),
      },
    ]);

    console.log(`✓ 已选择: ${selectedProject.name} / ${selectedBranch.name}`);
    return {
      project: selectedProject,
      branch: selectedBranch,
    };
  }

  /**
   * 计算匹配分数
   */
  private calculateMatchScore(
    requirement: RequirementInfo,
    project: ProjectInfo
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    // 1. 检查推荐项目列表
    if (requirement.analysis.suggestedProjects.includes(project.name)) {
      score += 40;
      reasons.push('AI推荐项目');
    }

    // 2. 检查技术栈匹配
    const reqTechStack = requirement.analysis.technicalStack.map(t => t.toLowerCase());
    const projTechStack = (project.technicalStack || []).map(t => t.toLowerCase());

    const techMatches = reqTechStack.filter(t =>
      projTechStack.some(pt => pt.includes(t) || t.includes(pt))
    );

    if (techMatches.length > 0) {
      score += Math.min(30, techMatches.length * 10);
      reasons.push(`技术栈匹配 (${techMatches.length}项)`);
    }

    // 3. 检查模块匹配
    const reqModules = requirement.analysis.affectedModules.map(m => m.toLowerCase());
    const projModules = (project.modules || []).map(m => m.toLowerCase());

    const moduleMatches = reqModules.filter(m =>
      projModules.some(pm => pm.includes(m) || m.includes(pm))
    );

    if (moduleMatches.length > 0) {
      score += Math.min(20, moduleMatches.length * 10);
      reasons.push(`模块匹配 (${moduleMatches.length}项)`);
    }

    // 4. 检查关键词匹配
    const keywords = requirement.analysis.keywords.map(k => k.toLowerCase());
    const projectText = `${project.name} ${project.description || ''}`.toLowerCase();

    const keywordMatches = keywords.filter(k => projectText.includes(k));

    if (keywordMatches.length > 0) {
      score += Math.min(10, keywordMatches.length * 2);
      reasons.push(`关键词匹配 (${keywordMatches.length}项)`);
    }

    // 确保分数在0-100范围内
    score = Math.min(100, Math.max(0, score));

    return { score, reasons };
  }

  /**
   * 推荐分支
   */
  private recommendBranch(
    requirement: RequirementInfo,
    branches: BranchInfo[]
  ): BranchInfo | null {
    if (branches.length === 0) {
      return null;
    }

    // 优先级列表
    const suggestedBranches = requirement.analysis.suggestedBranches.map(b => b.toLowerCase());

    // 1. 检查AI推荐的分支
    for (const suggested of suggestedBranches) {
      const match = branches.find(b => b.name.toLowerCase() === suggested);
      if (match) {
        return match;
      }
    }

    // 2. 根据需求类型推荐分支
    if (requirement.type === 'bug') {
      // Bug优先使用main/master或develop
      const bugBranches = ['main', 'master', 'develop', 'dev'];
      for (const branchName of bugBranches) {
        const match = branches.find(b => b.name.toLowerCase() === branchName);
        if (match) {
          return match;
        }
      }
    }

    // 3. 寻找常见的开发分支
    const commonBranches = ['develop', 'dev', 'development', 'main', 'master'];
    for (const branchName of commonBranches) {
      const match = branches.find(b => b.name.toLowerCase() === branchName);
      if (match) {
        return match;
      }
    }

    // 4. 返回最近更新的分支
    const sorted = [...branches].sort((a, b) =>
      b.lastCommit.date.getTime() - a.lastCommit.date.getTime()
    );

    return sorted[0] || null;
  }

  /**
   * 自动批准模式（不交互）
   */
  async autoApprove(requirement: RequirementInfo): Promise<{ project: ProjectInfo; branch: BranchInfo } | null> {
    const matches = await this.matchRequirement(requirement);

    if (matches.length === 0) {
      console.log(`⚠ 需求 "${requirement.title}" 未找到匹配的项目，已跳过`);
      return null;
    }

    const best = matches[0];
    console.log(`✓ 自动选择: ${best.project.name} / ${best.branch.name} (匹配度: ${best.matchScore}%)`);

    return {
      project: best.project,
      branch: best.branch,
    };
  }
}
