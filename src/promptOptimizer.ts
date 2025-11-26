/**
 * Prompt优化器模块
 *
 * 将需求信息转换为详细、可执行的AI prompt
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import type { Config, ProjectInfo } from './config';
import type { RequirementInfo } from './requirementAnalyzer';
import type { BranchInfo } from './projectMatcher';
import { WorkStyle } from './workStyle';

const execAsync = promisify(exec);

/**
 * 优化后的Prompt接口
 */
export interface OptimizedPrompt {
  title: string;

  // 结构化prompt内容
  sections: {
    background: string;           // 背景信息
    objective: string;            // 目标描述
    requirements: string[];       // 具体要求
    constraints: string[];        // 约束条件
    acceptanceCriteria: string[]; // 验收标准
    technicalContext: string;     // 技术上下文
    codebaseContext: string;      // 代码库上下文
  };

  // 不同格式
  formats: {
    markdown: string;
    plainText: string;
    json: string;
  };

  // 元信息
  metadata: {
    complexity: string;
    estimatedLOC: number;
    suggestedWorkStyle: WorkStyle;
    suggestedCodingLevel: number;
  };
}

/**
 * Prompt优化器类
 */
export class PromptOptimizer {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * 优化需求为详细prompt
   */
  async optimizeRequirement(
    requirement: RequirementInfo,
    project: ProjectInfo,
    branch: BranchInfo
  ): Promise<OptimizedPrompt> {
    // 生成各个部分
    const background = this.generateBackground(requirement, project, branch);
    const objective = this.generateObjective(requirement);
    const requirements = this.generateRequirements(requirement);
    const constraints = this.generateConstraints(requirement, project);
    const acceptanceCriteria = this.generateAcceptanceCriteria(requirement);
    const technicalContext = await this.generateTechnicalContext(requirement, project);
    const codebaseContext = await this.generateCodebaseContext(requirement, project);

    const sections = {
      background,
      objective,
      requirements,
      constraints,
      acceptanceCriteria,
      technicalContext,
      codebaseContext,
    };

    // 生成不同格式
    const formats = {
      markdown: this.toMarkdown(sections),
      plainText: this.toPlainText(sections),
      json: JSON.stringify(sections, null, 2),
    };

    // 生成元信息
    const metadata = this.generateMetadata(requirement);

    return {
      title: requirement.title,
      sections,
      formats,
      metadata,
    };
  }

  /**
   * 生成背景信息
   */
  private generateBackground(
    requirement: RequirementInfo,
    project: ProjectInfo,
    branch: BranchInfo
  ): string {
    let background = `这是一个来自${this.getSourceName(requirement.source)}的${this.getTypeName(requirement.type)}任务。\n\n`;

    background += `**项目**: ${project.name}\n`;
    if (project.description) {
      background += `**项目描述**: ${project.description}\n`;
    }
    background += `**分支**: ${branch.name}\n`;
    background += `**优先级**: ${requirement.priority} (1=最高, 4=最低)\n`;
    background += `**复杂度**: ${requirement.analysis.estimatedComplexity}\n\n`;

    background += `**原始需求ID**: ${requirement.sourceId}\n`;
    background += `**创建时间**: ${requirement.createdAt.toISOString()}\n`;

    return background;
  }

  /**
   * 生成目标描述
   */
  private generateObjective(requirement: RequirementInfo): string {
    let objective = `# 主要目标\n\n`;
    objective += `${requirement.analysis.mainGoal}\n\n`;

    if (requirement.description) {
      objective += `# 详细说明\n\n`;
      objective += `${requirement.description}\n`;
    }

    return objective;
  }

  /**
   * 生成具体要求
   */
  private generateRequirements(requirement: RequirementInfo): string[] {
    const reqs: string[] = [];

    // 基于需求类型生成要求
    switch (requirement.type) {
      case 'feature':
        reqs.push('实现完整的功能逻辑');
        reqs.push('确保代码可测试性');
        reqs.push('添加必要的错误处理');
        reqs.push('遵循项目的编码规范');
        break;

      case 'bug':
        reqs.push('定位并修复bug的根本原因');
        reqs.push('添加测试用例防止回归');
        reqs.push('不引入新的问题');
        reqs.push('验证修复效果');
        break;

      case 'optimization':
        reqs.push('提升性能或代码质量');
        reqs.push('保持功能完整性');
        reqs.push('添加性能基准测试');
        reqs.push('记录优化效果');
        break;

      case 'refactor':
        reqs.push('改进代码结构和可读性');
        reqs.push('保持功能行为不变');
        reqs.push('确保所有测试通过');
        reqs.push('更新相关文档');
        break;

      case 'documentation':
        reqs.push('编写清晰准确的文档');
        reqs.push('包含代码示例');
        reqs.push('保持文档格式统一');
        reqs.push('更新目录和索引');
        break;
    }

    // 添加实现步骤建议
    if (requirement.analysis.implementationSteps && requirement.analysis.implementationSteps.length > 0) {
      reqs.push('');
      reqs.push('建议的实现步骤：');
      requirement.analysis.implementationSteps.forEach((step, index) => {
        reqs.push(`  ${index + 1}. ${step}`);
      });
    }

    return reqs;
  }

  /**
   * 生成约束条件
   */
  private generateConstraints(
    requirement: RequirementInfo,
    project: ProjectInfo
  ): string[] {
    const constraints: string[] = [];

    // 技术栈约束
    if (project.technicalStack && project.technicalStack.length > 0) {
      constraints.push(`必须使用项目的技术栈: ${project.technicalStack.join(', ')}`);
    }

    // 模块约束
    if (requirement.analysis.affectedModules.length > 0) {
      constraints.push(`改动应限制在以下模块: ${requirement.analysis.affectedModules.join(', ')}`);
    }

    // 通用约束
    constraints.push('保持代码风格与现有代码一致');
    constraints.push('不破坏现有功能');
    constraints.push('遵循SOLID原则');

    // 根据复杂度添加约束
    if (requirement.analysis.estimatedComplexity === 'low') {
      constraints.push('尽量使用简单直接的实现方式');
    } else if (requirement.analysis.estimatedComplexity === 'high') {
      constraints.push('可能需要设计模式和架构优化');
      constraints.push('建议分阶段实现');
    }

    return constraints;
  }

  /**
   * 生成验收标准
   */
  private generateAcceptanceCriteria(requirement: RequirementInfo): string[] {
    const criteria: string[] = [];

    // 基本标准
    criteria.push('代码能够成功编译/构建');
    criteria.push('所有现有测试通过');
    criteria.push('代码符合项目的lint规则');

    // 根据类型添加标准
    switch (requirement.type) {
      case 'feature':
        criteria.push('新功能按预期工作');
        criteria.push('添加了相应的单元测试');
        criteria.push('更新了相关文档');
        break;

      case 'bug':
        criteria.push('Bug不再重现');
        criteria.push('添加了防止回归的测试');
        break;

      case 'optimization':
        criteria.push('性能指标有明显改善');
        criteria.push('资源使用更加高效');
        break;

      case 'refactor':
        criteria.push('代码可读性提升');
        criteria.push('代码复杂度降低');
        criteria.push('功能行为保持不变');
        break;

      case 'documentation':
        criteria.push('文档准确完整');
        criteria.push('代码示例可运行');
        break;
    }

    // 复杂度相关标准
    if (requirement.analysis.estimatedComplexity === 'high') {
      criteria.push('代码有充分的注释');
      criteria.push('复杂逻辑有设计文档');
    }

    return criteria;
  }

  /**
   * 生成技术上下文
   */
  private async generateTechnicalContext(
    requirement: RequirementInfo,
    project: ProjectInfo
  ): Promise<string> {
    let context = '';

    // 技术栈
    if (requirement.analysis.technicalStack.length > 0) {
      context += `**涉及技术栈**: ${requirement.analysis.technicalStack.join(', ')}\n\n`;
    }

    // 项目技术栈
    if (project.technicalStack && project.technicalStack.length > 0) {
      context += `**项目技术栈**: ${project.technicalStack.join(', ')}\n\n`;
    }

    // 影响模块
    if (requirement.analysis.affectedModules.length > 0) {
      context += `**影响模块**: ${requirement.analysis.affectedModules.join(', ')}\n\n`;
    }

    // 项目模块
    if (project.modules && project.modules.length > 0) {
      context += `**项目模块列表**: ${project.modules.join(', ')}\n\n`;
    }

    // 关键词
    if (requirement.analysis.keywords.length > 0) {
      context += `**关键词**: ${requirement.analysis.keywords.join(', ')}\n`;
    }

    return context;
  }

  /**
   * 生成代码库上下文
   */
  private async generateCodebaseContext(
    requirement: RequirementInfo,
    project: ProjectInfo
  ): Promise<string> {
    try {
      let context = '# 代码库信息\n\n';

      // 项目路径
      context += `**项目路径**: ${project.path}\n`;
      context += `**Git仓库**: ${project.gitUrl}\n\n`;

      // 获取项目结构
      const structure = await this.getProjectStructure(project.path);
      context += '**项目结构**:\n```\n';
      context += structure;
      context += '\n```\n\n';

      // 获取package.json信息
      const packageInfo = await this.getPackageInfo(project.path);
      if (packageInfo) {
        context += '**依赖信息**:\n';
        context += packageInfo;
        context += '\n';
      }

      // 搜索相关文件
      const relatedFiles = await this.searchRelatedFiles(
        project.path,
        requirement.analysis.keywords
      );
      if (relatedFiles.length > 0) {
        context += '**相关文件** (可能需要修改):\n';
        relatedFiles.slice(0, 10).forEach(file => {
          context += `- ${file}\n`;
        });
        context += '\n';
      }

      return context;
    } catch (error: any) {
      console.error('生成代码库上下文失败:', error.message);
      return '代码库上下文获取失败';
    }
  }

  /**
   * 获取项目结构
   */
  private async getProjectStructure(projectPath: string, maxDepth = 2): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `find . -maxdepth ${maxDepth} -type d -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" | head -50`,
        { cwd: projectPath }
      );
      return stdout.trim();
    } catch (error) {
      return '(无法获取项目结构)';
    }
  }

  /**
   * 获取package.json信息
   */
  private async getPackageInfo(projectPath: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync(
        `cat package.json | grep -A 20 '"dependencies"\\|"devDependencies"' || echo "无package.json"`,
        { cwd: projectPath }
      );
      return stdout.trim();
    } catch (error) {
      return null;
    }
  }

  /**
   * 搜索相关文件
   */
  private async searchRelatedFiles(
    projectPath: string,
    keywords: string[]
  ): Promise<string[]> {
    if (keywords.length === 0) {
      return [];
    }

    try {
      // 使用关键词搜索文件名和内容
      const searchPattern = keywords.slice(0, 3).join('\\|');
      const { stdout } = await execAsync(
        `grep -rl "${searchPattern}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . 2>/dev/null | head -20 || echo ""`,
        { cwd: projectPath, maxBuffer: 1024 * 1024 }
      );

      return stdout
        .trim()
        .split('\n')
        .filter(f => f && !f.includes('node_modules') && !f.includes('dist'));
    } catch (error) {
      return [];
    }
  }

  /**
   * 转换为Markdown格式
   */
  private toMarkdown(sections: OptimizedPrompt['sections']): string {
    let md = '# 任务详情\n\n';

    md += '## 📋 背景信息\n\n';
    md += sections.background + '\n\n';

    md += '## 🎯 目标\n\n';
    md += sections.objective + '\n\n';

    md += '## ✅ 具体要求\n\n';
    sections.requirements.forEach(req => {
      md += `- ${req}\n`;
    });
    md += '\n';

    md += '## ⚠️ 约束条件\n\n';
    sections.constraints.forEach(constraint => {
      md += `- ${constraint}\n`;
    });
    md += '\n';

    md += '## 🎓 验收标准\n\n';
    sections.acceptanceCriteria.forEach(criterion => {
      md += `- ${criterion}\n`;
    });
    md += '\n';

    md += '## 🔧 技术上下文\n\n';
    md += sections.technicalContext + '\n\n';

    md += '## 📁 代码库上下文\n\n';
    md += sections.codebaseContext + '\n';

    return md;
  }

  /**
   * 转换为纯文本格式
   */
  private toPlainText(sections: OptimizedPrompt['sections']): string {
    let text = '=== 任务详情 ===\n\n';

    text += '--- 背景信息 ---\n';
    text += sections.background + '\n\n';

    text += '--- 目标 ---\n';
    text += sections.objective + '\n\n';

    text += '--- 具体要求 ---\n';
    sections.requirements.forEach(req => {
      text += `* ${req}\n`;
    });
    text += '\n';

    text += '--- 约束条件 ---\n';
    sections.constraints.forEach(constraint => {
      text += `* ${constraint}\n`;
    });
    text += '\n';

    text += '--- 验收标准 ---\n';
    sections.acceptanceCriteria.forEach(criterion => {
      text += `* ${criterion}\n`;
    });
    text += '\n';

    text += '--- 技术上下文 ---\n';
    text += sections.technicalContext + '\n\n';

    text += '--- 代码库上下文 ---\n';
    text += sections.codebaseContext + '\n';

    return text;
  }

  /**
   * 生成元信息
   */
  private generateMetadata(requirement: RequirementInfo): OptimizedPrompt['metadata'] {
    // 估算代码行数
    let estimatedLOC = 50; // 默认值

    switch (requirement.analysis.estimatedComplexity) {
      case 'low':
        estimatedLOC = 50;
        break;
      case 'medium':
        estimatedLOC = 250;
        break;
      case 'high':
        estimatedLOC = 800;
        break;
    }

    // 根据类型调整
    if (requirement.type === 'documentation') {
      estimatedLOC = Math.floor(estimatedLOC * 0.3);
    } else if (requirement.type === 'bug') {
      estimatedLOC = Math.floor(estimatedLOC * 0.5);
    }

    // 建议工作风格
    let suggestedWorkStyle = WorkStyle.DEFAULT;
    if (requirement.type === 'bug') {
      suggestedWorkStyle = WorkStyle.BUGFIXER;
    } else if (requirement.type === 'documentation') {
      suggestedWorkStyle = WorkStyle.CAREFULDOCUMENTWRITER;
    } else if (requirement.analysis.estimatedComplexity === 'high') {
      suggestedWorkStyle = WorkStyle.BOLDGENIUS;
    }

    // 建议编码级别
    let suggestedCodingLevel = 5; // 默认中等
    if (requirement.analysis.estimatedComplexity === 'low') {
      suggestedCodingLevel = 3;
    } else if (requirement.analysis.estimatedComplexity === 'high') {
      suggestedCodingLevel = 8;
    }

    return {
      complexity: requirement.analysis.estimatedComplexity,
      estimatedLOC,
      suggestedWorkStyle,
      suggestedCodingLevel,
    };
  }

  /**
   * 获取来源名称
   */
  private getSourceName(source: string): string {
    const names: Record<string, string> = {
      'zentao-requirement': '禅道需求',
      'zentao-bug': '禅道Bug',
      'wechat': '企业微信',
    };
    return names[source] || source;
  }

  /**
   * 获取类型名称
   */
  private getTypeName(type: string): string {
    const names: Record<string, string> = {
      'feature': '新功能',
      'bug': 'Bug修复',
      'optimization': '优化',
      'refactor': '重构',
      'documentation': '文档',
    };
    return names[type] || type;
  }
}
