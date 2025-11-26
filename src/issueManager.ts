/**
 * Issue管理器模块
 *
 * 提供GitLab/GitHub Issue的创建、更新、关闭等管理功能
 */

import { Gitlab } from '@gitbeaker/node';
import type { IssuePlatformConfig } from './config';
import type { RequirementInfo } from './requirementAnalyzer';

/**
 * Issue数据接口
 */
export interface IssueData {
  title: string;
  body: string;
  labels?: string[];
  assignees?: string[];
  milestone?: string;

  // 自定义字段（通过description附加）
  metadata: {
    requirementId: string;
    source: string;
    priority: number;
    complexity: string;
  };
}

/**
 * Issue接口
 */
export interface Issue {
  id: number;
  iid: number;  // GitLab的内部ID
  title: string;
  description: string;
  state: 'opened' | 'closed';
  webUrl: string;
  createdAt: Date;
  updatedAt: Date;
  labels: string[];
}

/**
 * Issue管理器类
 */
export class IssueManager {
  private config: IssuePlatformConfig;
  private client: any;

  constructor(config: IssuePlatformConfig) {
    this.config = config;

    if (config.type === 'gitlab') {
      this.client = new Gitlab({
        token: config.token,
        host: config.url || 'https://gitlab.com',
      });
    } else {
      throw new Error('当前只支持GitLab，GitHub支持即将推出');
    }
  }

  /**
   * 创建Issue
   */
  async createIssue(projectId: string, issueData: IssueData): Promise<Issue> {
    try {
      // 构建完整的描述（包含元数据）
      const description = this.buildIssueDescription(issueData);

      // 准备标签
      const labels = [
        ...(issueData.labels || []),
        ...(this.config.defaultLabels || []),
      ];

      // 创建Issue
      const result = await this.client.Issues.create(projectId, {
        title: issueData.title,
        description,
        labels: labels.join(','),
        assigneeIds: issueData.assignees,
      });

      return this.parseGitLabIssue(result);
    } catch (error: any) {
      throw new Error(`创建Issue失败: ${error.message}`);
    }
  }

  /**
   * 从需求信息创建Issue
   */
  async createIssueFromRequirement(
    projectId: string,
    requirement: RequirementInfo,
    additionalContext?: string
  ): Promise<Issue> {
    const issueData: IssueData = {
      title: `[${requirement.type.toUpperCase()}] ${requirement.title}`,
      body: this.buildRequirementIssueBody(requirement, additionalContext),
      labels: [
        requirement.type,
        `priority-${requirement.priority}`,
        `complexity-${requirement.analysis.estimatedComplexity}`,
      ],
      metadata: {
        requirementId: requirement.sourceId,
        source: requirement.source,
        priority: requirement.priority,
        complexity: requirement.analysis.estimatedComplexity,
      },
    };

    return this.createIssue(projectId, issueData);
  }

  /**
   * 更新Issue
   */
  async updateIssue(
    projectId: string,
    issueIid: number,
    updates: Partial<IssueData>
  ): Promise<Issue> {
    try {
      const updateData: any = {};

      if (updates.title) {
        updateData.title = updates.title;
      }

      if (updates.body) {
        updateData.description = updates.body;
      }

      if (updates.labels) {
        updateData.labels = updates.labels.join(',');
      }

      const result = await this.client.Issues.edit(projectId, issueIid, updateData);

      return this.parseGitLabIssue(result);
    } catch (error: any) {
      throw new Error(`更新Issue失败: ${error.message}`);
    }
  }

  /**
   * 添加评论
   */
  async addComment(
    projectId: string,
    issueIid: number,
    comment: string
  ): Promise<void> {
    try {
      await this.client.IssueNotes.create(projectId, issueIid, comment);
    } catch (error: any) {
      throw new Error(`添加评论失败: ${error.message}`);
    }
  }

  /**
   * 关闭Issue
   */
  async closeIssue(
    projectId: string,
    issueIid: number,
    comment?: string
  ): Promise<Issue> {
    try {
      // 如果有评论，先添加评论
      if (comment) {
        await this.addComment(projectId, issueIid, comment);
      }

      // 关闭Issue
      const result = await this.client.Issues.edit(projectId, issueIid, {
        stateEvent: 'close',
      });

      return this.parseGitLabIssue(result);
    } catch (error: any) {
      throw new Error(`关闭Issue失败: ${error.message}`);
    }
  }

  /**
   * 获取Issue
   */
  async getIssue(projectId: string, issueIid: number): Promise<Issue> {
    try {
      const result = await this.client.Issues.show(projectId, issueIid);
      return this.parseGitLabIssue(result);
    } catch (error: any) {
      throw new Error(`获取Issue失败: ${error.message}`);
    }
  }

  /**
   * 列出Issues
   */
  async listIssues(
    projectId: string,
    filters?: {
      state?: 'opened' | 'closed' | 'all';
      labels?: string[];
    }
  ): Promise<Issue[]> {
    try {
      const options: any = {};

      if (filters?.state) {
        options.state = filters.state;
      }

      if (filters?.labels && filters.labels.length > 0) {
        options.labels = filters.labels.join(',');
      }

      const results = await this.client.Issues.all({
        projectId,
        ...options,
      });

      return results.map((r: any) => this.parseGitLabIssue(r));
    } catch (error: any) {
      throw new Error(`列出Issues失败: ${error.message}`);
    }
  }

  /**
   * 从Git URL提取项目ID
   */
  extractProjectId(gitUrl: string): string {
    // GitLab项目ID格式：owner/project
    // 例如：git@gitlab.com:owner/project.git -> owner/project

    try {
      // 移除.git后缀
      let url = gitUrl.replace(/\.git$/, '');

      // 处理SSH格式 git@gitlab.com:owner/project
      if (url.includes('@')) {
        const match = url.match(/:(.+)$/);
        if (match) {
          return match[1];
        }
      }

      // 处理HTTPS格式 https://gitlab.com/owner/project
      if (url.startsWith('http')) {
        const urlObj = new URL(url);
        return urlObj.pathname.substring(1); // 移除开头的/
      }

      throw new Error('无法识别的Git URL格式');
    } catch (error: any) {
      throw new Error(`提取项目ID失败: ${error.message}`);
    }
  }

  /**
   * 构建Issue描述
   */
  private buildIssueDescription(issueData: IssueData): string {
    let description = issueData.body;

    // 附加元数据
    description += '\n\n---\n\n';
    description += '### 📊 元数据\n\n';
    description += `- **需求ID**: ${issueData.metadata.requirementId}\n`;
    description += `- **来源**: ${issueData.metadata.source}\n`;
    description += `- **优先级**: ${issueData.metadata.priority}\n`;
    description += `- **复杂度**: ${issueData.metadata.complexity}\n`;

    return description;
  }

  /**
   * 从需求信息构建Issue正文
   */
  private buildRequirementIssueBody(
    requirement: RequirementInfo,
    additionalContext?: string
  ): string {
    let body = '';

    // 摘要
    body += '## 📋 需求概述\n\n';
    body += `${requirement.analysis.mainGoal}\n\n`;

    // 详细描述
    body += '## 📝 详细描述\n\n';
    body += `${requirement.description}\n\n`;

    // 技术栈
    if (requirement.analysis.technicalStack.length > 0) {
      body += '## 🔧 涉及技术栈\n\n';
      requirement.analysis.technicalStack.forEach(tech => {
        body += `- ${tech}\n`;
      });
      body += '\n';
    }

    // 影响模块
    if (requirement.analysis.affectedModules.length > 0) {
      body += '## 📦 影响模块\n\n';
      requirement.analysis.affectedModules.forEach(module => {
        body += `- ${module}\n`;
      });
      body += '\n';
    }

    // 实现步骤
    if (requirement.analysis.implementationSteps && requirement.analysis.implementationSteps.length > 0) {
      body += '## 🚀 建议实现步骤\n\n';
      requirement.analysis.implementationSteps.forEach((step, index) => {
        body += `${index + 1}. ${step}\n`;
      });
      body += '\n';
    }

    // 附加上下文
    if (additionalContext) {
      body += '## 📚 附加上下文\n\n';
      body += `${additionalContext}\n\n`;
    }

    // 原始内容
    body += '## 📄 原始内容\n\n';
    body += '```\n';
    body += requirement.rawContent;
    body += '\n```\n\n';

    return body;
  }

  /**
   * 解析GitLab Issue响应
   */
  private parseGitLabIssue(data: any): Issue {
    return {
      id: data.id,
      iid: data.iid,
      title: data.title,
      description: data.description || '',
      state: data.state,
      webUrl: data.web_url,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      labels: data.labels || [],
    };
  }

  /**
   * 创建Merge Request（GitLab的PR）
   */
  async createMergeRequest(
    projectId: string,
    options: {
      sourceBranch: string;
      targetBranch: string;
      title: string;
      description: string;
      removeSourceBranch?: boolean;
      assigneeId?: number;
      labels?: string[];
    }
  ): Promise<{
    id: number;
    iid: number;
    title: string;
    webUrl: string;
    state: string;
  }> {
    try {
      const result = await this.client.MergeRequests.create(projectId, options.sourceBranch, options.targetBranch, options.title, {
        description: options.description,
        removeSourceBranch: options.removeSourceBranch !== false, // 默认删除源分支
        assigneeId: options.assigneeId,
        labels: options.labels?.join(','),
      });

      return {
        id: result.id,
        iid: result.iid,
        title: result.title,
        webUrl: result.web_url,
        state: result.state,
      };
    } catch (error: any) {
      throw new Error(`创建Merge Request失败: ${error.message}`);
    }
  }

  /**
   * 关联Issue到Merge Request
   */
  async linkIssueToMergeRequest(
    projectId: string,
    issueIid: number,
    mergeRequestIid: number
  ): Promise<void> {
    try {
      // 通过在Issue中添加评论来关联MR
      const comment = `关联到 Merge Request: !${mergeRequestIid}`;
      await this.addComment(projectId, issueIid, comment);

      // 也可以使用closes关键字自动关闭issue
      await this.addComment(projectId, issueIid, `Closes #${issueIid}`);
    } catch (error: any) {
      console.error('关联Issue到MR失败:', error.message);
    }
  }

  /**
   * 获取Merge Request详情
   */
  async getMergeRequest(projectId: string, mergeRequestIid: number): Promise<any> {
    try {
      return await this.client.MergeRequests.show(projectId, mergeRequestIid);
    } catch (error: any) {
      throw new Error(`获取Merge Request失败: ${error.message}`);
    }
  }

  /**
   * 合并Merge Request
   */
  async mergeMergeRequest(
    projectId: string,
    mergeRequestIid: number,
    options?: {
      shouldRemoveSourceBranch?: boolean;
      mergeCommitMessage?: string;
    }
  ): Promise<void> {
    try {
      await this.client.MergeRequests.accept(projectId, mergeRequestIid, {
        shouldRemoveSourceBranch: options?.shouldRemoveSourceBranch !== false,
        mergeCommitMessage: options?.mergeCommitMessage,
      });
    } catch (error: any) {
      throw new Error(`合并Merge Request失败: ${error.message}`);
    }
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      // 尝试获取当前用户信息
      await this.client.Users.current();
      return true;
    } catch (error: any) {
      console.error('GitLab连接测试失败:', error.message);
      return false;
    }
  }
}
