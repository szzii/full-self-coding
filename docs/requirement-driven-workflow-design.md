# 需求驱动工作流设计文档

## 概述

扩展 Full Self Coding 项目，添加从外部需求源（企业微信、禅道）自动化处理需求的完整工作流。

## 功能目标

1. **需求采集**：从企业微信聊天和禅道系统获取需求/bug
2. **智能匹配**：自动分析需求并匹配到对应的项目和分支
3. **交互式选择**：枚举所有可用的仓库和分支供用户确认
4. **Prompt优化**：将需求转换为详细、可执行的AI prompt
5. **Issue管理**：自动创建、跟踪、关闭Git issue
6. **自动化执行**：通知Docker agent处理issue并自动关闭

## 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      数据采集层                               │
├──────────────────┬──────────────────────────────────────────┤
│ 企业微信集成      │  禅道集成                                 │
│ - 聊天记录抓取    │  - 需求列表获取                           │
│ - 消息过滤       │  - Bug列表获取                            │
│ - 关键词识别     │  - 详情获取                               │
└──────────────────┴──────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                     需求分析层                                │
├─────────────────────────────────────────────────────────────┤
│ 需求分析器 (RequirementAnalyzer)                             │
│ - AI驱动的需求理解                                           │
│ - 提取关键信息（功能点、技术栈、改动范围）                      │
│ - 分析优先级和复杂度                                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                     项目匹配层                                │
├─────────────────────────────────────────────────────────────┤
│ 项目匹配器 (ProjectMatcher)                                  │
│ - 枚举所有配置的代码仓库                                       │
│ - 列出所有分支（本地+远程）                                    │
│ - 智能推荐最匹配的项目和分支                                   │
│ - 提供交互式选择界面                                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    Prompt优化层                               │
├─────────────────────────────────────────────────────────────┤
│ Prompt优化器 (PromptOptimizer)                               │
│ - 需求 → 详细技术方案                                        │
│ - 添加代码库上下文                                           │
│ - 生成结构化prompt（背景、目标、约束、验收标准）               │
│ - 适配不同AI agent的格式                                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                     Issue管理层                               │
├─────────────────────────────────────────────────────────────┤
│ Issue管理器 (IssueManager)                                   │
│ - 创建GitHub/GitLab issue                                    │
│ - 添加标签、里程碑、分配者                                     │
│ - 跟踪issue状态                                              │
│ - 评论更新进展                                               │
│ - 自动关闭已完成的issue                                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    工作流编排层                               │
├─────────────────────────────────────────────────────────────┤
│ 工作流编排器 (WorkflowOrchestrator)                          │
│ - 串联整个处理流程                                           │
│ - 管理状态机转换                                             │
│ - 错误处理和重试                                             │
│ - 生成执行报告                                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    执行层（现有FSC）                          │
├─────────────────────────────────────────────────────────────┤
│ - Docker容器启动                                             │
│ - AI Agent执行任务                                           │
│ - 代码变更应用                                               │
│ - Git提交和分支管理                                           │
└─────────────────────────────────────────────────────────────┘
```

## 新增模块设计

### 1. 企业微信集成 (src/integrations/wechatWorkIntegration.ts)

```typescript
interface WechatMessage {
  msgId: string;
  senderId: string;
  senderName: string;
  chatId: string;
  chatName: string;
  timestamp: number;
  content: string;
  msgType: 'text' | 'image' | 'file';
  mentions?: string[];
}

interface WechatConfig {
  corpId: string;
  corpSecret: string;
  agentId: string;
  webhookUrl?: string;
  keywordFilters?: string[];  // 需求关键词，如 "需求"、"bug"、"优化"
}

class WechatWorkIntegration {
  constructor(config: WechatConfig);

  // 获取聊天记录
  async fetchMessages(chatId: string, startTime: Date, endTime: Date): Promise<WechatMessage[]>;

  // 过滤需求相关消息
  async filterRequirementMessages(messages: WechatMessage[]): Promise<WechatMessage[]>;

  // 发送通知
  async sendNotification(chatId: string, message: string): Promise<void>;
}
```

### 2. 禅道集成 (src/integrations/zentaoIntegration.ts)

```typescript
interface ZentaoRequirement {
  id: number;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'closed';
  priority: 1 | 2 | 3 | 4;
  category: string;
  assignedTo: string;
  createdAt: Date;
  updatedAt: Date;
  product: string;
  project?: string;
}

interface ZentaoBug {
  id: number;
  title: string;
  description: string;
  steps: string;         // 重现步骤
  severity: 1 | 2 | 3 | 4;
  status: 'active' | 'resolved' | 'closed';
  assignedTo: string;
  module: string;
  createdAt: Date;
}

interface ZentaoConfig {
  apiUrl: string;
  account: string;
  password: string;
  productIds?: number[];   // 监听的产品ID
  projectIds?: number[];   // 监听的项目ID
}

class ZentaoIntegration {
  constructor(config: ZentaoConfig);

  // 获取需求列表
  async fetchRequirements(filters?: {
    status?: string[];
    priority?: number[];
    startDate?: Date;
  }): Promise<ZentaoRequirement[]>;

  // 获取Bug列表
  async fetchBugs(filters?: {
    status?: string[];
    severity?: number[];
    module?: string;
  }): Promise<ZentaoBug[]>;

  // 获取详情
  async getRequirementDetail(id: number): Promise<ZentaoRequirement>;
  async getBugDetail(id: number): Promise<ZentaoBug>;

  // 更新状态
  async updateRequirementStatus(id: number, status: string): Promise<void>;
  async updateBugStatus(id: number, status: string): Promise<void>;
}
```

### 3. 需求分析器 (src/requirementAnalyzer.ts)

```typescript
interface RequirementInfo {
  source: 'wechat' | 'zentao';
  sourceId: string;
  type: 'feature' | 'bug' | 'optimization' | 'refactor';
  title: string;
  description: string;
  rawContent: string;

  // AI分析结果
  analysis: {
    mainGoal: string;           // 主要目标
    technicalStack: string[];   // 涉及技术栈
    affectedModules: string[];  // 影响的模块
    estimatedComplexity: 'low' | 'medium' | 'high';
    suggestedProjects: string[]; // 推荐项目
    suggestedBranches: string[]; // 推荐分支
    keywords: string[];          // 关键词
  };

  priority: number;
  createdAt: Date;
}

class RequirementAnalyzer {
  constructor(config: Config, aiAgent: AIAgent);

  // 分析微信消息
  async analyzeWechatMessage(message: WechatMessage): Promise<RequirementInfo>;

  // 分析禅道需求
  async analyzeZentaoRequirement(req: ZentaoRequirement): Promise<RequirementInfo>;

  // 分析禅道Bug
  async analyzeZentaoBug(bug: ZentaoBug): Promise<RequirementInfo>;

  // 批量分析
  async analyzeBatch(items: Array<WechatMessage | ZentaoRequirement | ZentaoBug>): Promise<RequirementInfo[]>;
}
```

### 4. 项目匹配器 (src/projectMatcher.ts)

```typescript
interface ProjectInfo {
  name: string;
  path: string;
  gitUrl: string;
  description?: string;
  technicalStack?: string[];
  modules?: string[];
}

interface BranchInfo {
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

interface MatchResult {
  project: ProjectInfo;
  branch: BranchInfo;
  matchScore: number;  // 0-100
  matchReasons: string[];
}

class ProjectMatcher {
  constructor(config: Config, projects: ProjectInfo[]);

  // 枚举所有项目
  async listAllProjects(): Promise<ProjectInfo[]>;

  // 枚举指定项目的所有分支
  async listBranches(project: ProjectInfo): Promise<BranchInfo[]>;

  // 智能匹配项目和分支
  async matchRequirement(requirement: RequirementInfo): Promise<MatchResult[]>;

  // 交互式选择
  async interactiveSelect(
    requirement: RequirementInfo,
    matches: MatchResult[]
  ): Promise<{ project: ProjectInfo; branch: BranchInfo }>;
}
```

### 5. Prompt优化器 (src/promptOptimizer.ts)

```typescript
interface OptimizedPrompt {
  title: string;

  // 结构化prompt内容
  sections: {
    background: string;        // 背景信息
    objective: string;         // 目标描述
    requirements: string[];    // 具体要求
    constraints: string[];     // 约束条件
    acceptanceCriteria: string[]; // 验收标准
    technicalContext: string;  // 技术上下文
    codebaseContext: string;   // 代码库上下文
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

class PromptOptimizer {
  constructor(config: Config, aiAgent: AIAgent);

  // 优化需求为详细prompt
  async optimizeRequirement(
    requirement: RequirementInfo,
    project: ProjectInfo,
    branch: BranchInfo
  ): Promise<OptimizedPrompt>;

  // 添加代码库上下文
  private async addCodebaseContext(
    requirement: RequirementInfo,
    projectPath: string
  ): Promise<string>;

  // 生成验收标准
  private async generateAcceptanceCriteria(
    requirement: RequirementInfo
  ): Promise<string[]>;
}
```

### 6. Issue管理器 (src/issueManager.ts)

```typescript
interface IssueConfig {
  platform: 'github' | 'gitlab';
  token: string;
  owner?: string;     // GitHub owner
  project?: string;   // GitLab project
}

interface IssueData {
  title: string;
  body: string;
  labels?: string[];
  assignees?: string[];
  milestone?: string;

  // 自定义字段
  metadata: {
    requirementId: string;
    source: string;
    priority: number;
    complexity: string;
  };
}

interface Issue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  htmlUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

class IssueManager {
  constructor(config: IssueConfig);

  // 创建issue
  async createIssue(
    repo: string,
    issueData: IssueData
  ): Promise<Issue>;

  // 更新issue
  async updateIssue(
    repo: string,
    issueNumber: number,
    updates: Partial<IssueData>
  ): Promise<Issue>;

  // 添加评论
  async addComment(
    repo: string,
    issueNumber: number,
    comment: string
  ): Promise<void>;

  // 关闭issue
  async closeIssue(
    repo: string,
    issueNumber: number,
    comment?: string
  ): Promise<Issue>;

  // 获取issue
  async getIssue(repo: string, issueNumber: number): Promise<Issue>;

  // 列出issues
  async listIssues(
    repo: string,
    filters?: {
      state?: 'open' | 'closed' | 'all';
      labels?: string[];
    }
  ): Promise<Issue[]>;
}
```

### 7. 工作流编排器 (src/workflowOrchestrator.ts)

```typescript
type WorkflowState =
  | 'collecting'      // 采集需求
  | 'analyzing'       // 分析需求
  | 'matching'        // 匹配项目
  | 'optimizing'      // 优化prompt
  | 'creating_issue'  // 创建issue
  | 'executing'       // 执行任务
  | 'reviewing'       // 审查结果
  | 'closing'         // 关闭issue
  | 'completed'       // 完成
  | 'failed';         // 失败

interface WorkflowContext {
  state: WorkflowState;
  requirement?: RequirementInfo;
  project?: ProjectInfo;
  branch?: BranchInfo;
  optimizedPrompt?: OptimizedPrompt;
  issue?: Issue;
  taskResults?: TaskResult[];
  error?: Error;
}

interface WorkflowConfig {
  autoApprove?: boolean;  // 自动批准，不需要用户确认
  autoClose?: boolean;    // 自动关闭issue
  notifyWechat?: boolean; // 通知到微信
  notifyZentao?: boolean; // 更新禅道状态
}

class WorkflowOrchestrator {
  constructor(
    config: Config,
    workflowConfig: WorkflowConfig,
    integrations: {
      wechat?: WechatWorkIntegration;
      zentao?: ZentaoIntegration;
      issueManager: IssueManager;
    }
  );

  // 执行完整工作流
  async execute(
    sources: {
      wechatMessages?: WechatMessage[];
      zentaoRequirements?: ZentaoRequirement[];
      zentaoBugs?: ZentaoBug[];
    }
  ): Promise<WorkflowContext[]>;

  // 单个需求的完整流程
  async processRequirement(
    requirement: RequirementInfo
  ): Promise<WorkflowContext>;

  // 状态转换
  private async transitionState(
    context: WorkflowContext,
    nextState: WorkflowState
  ): Promise<WorkflowContext>;

  // 发送通知
  private async sendNotifications(
    context: WorkflowContext,
    message: string
  ): Promise<void>;

  // 生成报告
  async generateReport(contexts: WorkflowContext[]): Promise<string>;
}
```

## 配置扩展

在 `src/config.ts` 中添加新的配置选项：

```typescript
interface Config {
  // ... 现有配置 ...

  // 新增：工作流配置
  workflow?: {
    enabled: boolean;
    autoApprove: boolean;
    autoClose: boolean;
  };

  // 新增：企业微信配置
  wechatWork?: {
    enabled: boolean;
    corpId: string;
    corpSecret: string;
    agentId: string;
    monitoredChats: string[];  // 监听的群聊ID
    keywordFilters: string[];  // 关键词过滤
    pollInterval: number;      // 轮询间隔（秒）
  };

  // 新增：禅道配置
  zentao?: {
    enabled: boolean;
    apiUrl: string;
    account: string;
    password: string;
    productIds: number[];
    projectIds: number[];
    pollInterval: number;
  };

  // 新增：项目配置
  projects?: Array<{
    name: string;
    path: string;
    gitUrl: string;
    description?: string;
    technicalStack?: string[];
    modules?: string[];
  }>;

  // 新增：Issue平台配置
  issuePlatform?: {
    type: 'github' | 'gitlab';
    token: string;
    owner?: string;
    defaultRepo?: string;
    defaultLabels?: string[];
  };
}
```

## CLI命令扩展

```bash
# 新增命令：工作流模式
full-self-coding workflow [options]

选项：
  --source <type>           数据源：wechat, zentao, both
  --wechat-chat <id>        指定微信群聊ID
  --zentao-product <id>     指定禅道产品ID
  --auto-approve            自动批准，不需要确认
  --auto-close              自动关闭issue
  --dry-run                 试运行，不实际执行

# 示例
full-self-coding workflow --source both --auto-approve
full-self-coding workflow --source wechat --wechat-chat 123456
full-self-coding workflow --source zentao --zentao-product 1 --dry-run
```

## 工作流程图

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 数据采集                                                   │
│    - 从企业微信获取聊天记录                                     │
│    - 从禅道获取需求和Bug                                       │
│    - 过滤和预处理                                             │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. 需求分析                                                   │
│    - AI分析需求内容                                           │
│    - 提取关键信息                                             │
│    - 评估复杂度和优先级                                        │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. 项目匹配                                                   │
│    - 枚举所有配置的项目                                        │
│    - 列出每个项目的分支                                        │
│    - AI推荐最匹配的项目/分支                                   │
│    - 用户确认选择                                             │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Prompt优化                                                │
│    - 分析项目代码库                                           │
│    - 生成详细的技术方案                                        │
│    - 创建结构化prompt                                         │
│    - 添加验收标准                                             │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. 创建Issue                                                 │
│    - 在GitHub/GitLab创建issue                                │
│    - 添加详细描述和标签                                        │
│    - 关联元数据                                               │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Docker Agent执行                                          │
│    - 启动Docker容器                                           │
│    - 传递优化后的prompt                                       │
│    - AI Agent生成代码                                         │
│    - 应用代码变更                                             │
│    - 提交到新分支                                             │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. 审查和关闭                                                 │
│    - 更新issue评论（附上执行结果）                              │
│    - 如果成功，自动关闭issue                                   │
│    - 通知到企业微信                                           │
│    - 更新禅道状态                                             │
└─────────────────────────────────────────────────────────────┘
```

## 实现优先级

### P0 - 核心功能
1. 禅道集成（相对标准化）
2. 需求分析器
3. 项目匹配器（手动选择版本）
4. Issue管理器（GitHub）
5. 工作流编排器（基础版）

### P1 - 增强功能
1. 企业微信集成
2. Prompt优化器（AI增强）
3. 自动化项目匹配（AI推荐）
4. GitLab支持

### P2 - 高级功能
1. 自动审查和关闭
2. 多源数据融合
3. 学习和优化能力
4. 可视化Dashboard

## 技术选型

### API客户端
- **GitHub API**: @octokit/rest
- **GitLab API**: @gitbeaker/node
- **禅道API**: axios (自定义封装)
- **企业微信API**: axios + 官方SDK

### 交互式CLI
- **inquirer**: 用户选择界面
- **ora**: 加载动画
- **chalk**: 彩色输出（已有）

### AI增强
- 复用现有的 AI agent 配置
- 支持 Claude/Gemini/Cursor

## 安全性考虑

1. **敏感信息**：所有API token通过环境变量或加密配置文件
2. **权限控制**：最小权限原则，只读API尽量用只读token
3. **数据隔离**：不同项目的数据完全隔离
4. **审计日志**：记录所有操作和状态变更
5. **错误处理**：优雅降级，避免级联失败

## 测试策略

1. **单元测试**：每个模块独立测试
2. **集成测试**：端到端工作流测试
3. **Mock服务**：模拟外部API响应
4. **手动测试**：真实场景验证

## 迁移路径

1. 保持现有功能完全兼容
2. 新功能通过独立的 `workflow` 命令启用
3. 配置向后兼容
4. 逐步迁移，分阶段发布

## 未来扩展

1. **更多集成源**：Jira、Linear、Notion等
2. **智能调度**：根据优先级和资源自动调度
3. **持续学习**：从历史数据中学习最佳实践
4. **团队协作**：多人协作和任务分配
5. **性能监控**：实时监控和告警
