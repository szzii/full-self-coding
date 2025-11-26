# Full Self Coding - 工作流模式使用指南

## 概述

工作流模式是Full Self Coding的全新功能，它将FSC从被动的代码库分析工具扩展为主动的**需求驱动开发平台**。

## 完整工作流程

```
禅道需求/Bug
    ↓
AI分析需求内容
    ↓
智能匹配项目和分支（交互式选择）
    ↓
生成详细可执行的prompt
    ↓
创建GitLab Issue
    ↓
Docker Agent执行任务
    ↓
提交代码到新分支
    ↓
创建Merge Request
    ↓
关联Issue和MR
    ↓
完成（可选自动合并）
```

## 快速开始

### 1. 配置文件设置

创建或编辑配置文件 `~/.config/full-self-coding/config.json`:

```json
{
  "agentType": "claude-code",
  "anthropicAPIKey": "your-api-key",

  "workflow": {
    "enabled": true,
    "autoApprove": false,
    "autoClose": true
  },

  "zentao": {
    "apiUrl": "http://your-zentao-server.com",
    "account": "your-account",
    "password": "your-password",
    "productIds": [1, 2]
  },

  "projects": [
    {
      "name": "frontend-app",
      "path": "/path/to/frontend-app",
      "gitUrl": "git@gitlab.com:your-org/frontend-app.git",
      "description": "前端应用项目",
      "technicalStack": ["TypeScript", "React", "Vite"],
      "modules": ["auth", "dashboard", "settings"]
    }
  ],

  "issuePlatform": {
    "type": "gitlab",
    "token": "your-gitlab-access-token",
    "url": "https://gitlab.com",
    "defaultLabels": ["auto-generated", "ai-agent"]
  }
}
```

### 2. 运行工作流

```bash
# 基础命令（交互式模式）
full-self-coding workflow

# 自动批准模式（无需确认）
full-self-coding workflow --auto-approve

# 使用指定配置文件
full-self-coding workflow --config /path/to/config.json

# Dry run模式（测试，不实际创建Issue/MR）
full-self-coding workflow --dry-run
```

## 配置说明

### 工作流配置 (`workflow`)

```json
{
  "workflow": {
    "enabled": true,        // 是否启用工作流模式
    "autoApprove": false,   // 自动批准，不需要用户确认
    "autoClose": true,      // 自动关闭已完成的issue
    "pollInterval": 300     // 轮询间隔（秒）- 暂未使用
  }
}
```

### 禅道配置 (`zentao`)

```json
{
  "zentao": {
    "apiUrl": "http://zentao.example.com",  // 禅道API地址
    "account": "username",                    // 账号
    "password": "password",                   // 密码
    "productIds": [1, 2, 3],                 // 监听的产品ID列表
    "projectIds": [10, 20]                    // 监听的项目ID列表（可选）
  }
}
```

**获取产品ID和项目ID：**
- 在禅道系统中打开产品或项目页面
- URL中的数字就是ID，如：`/zentao/product-view-1.html` 中的 `1`

### 项目配置 (`projects`)

```json
{
  "projects": [
    {
      "name": "project-name",                    // 项目名称（唯一标识）
      "path": "/absolute/path/to/project",       // 项目绝对路径
      "gitUrl": "git@gitlab.com:org/repo.git",  // Git仓库URL
      "description": "项目描述",                  // 项目描述（可选）
      "technicalStack": [                        // 技术栈列表（可选但推荐）
        "TypeScript",
        "React",
        "Node.js"
      ],
      "modules": [                               // 模块列表（可选但推荐）
        "auth",
        "api",
        "frontend"
      ]
    }
  ]
}
```

**技术栈和模块的作用：**
- AI会根据需求内容智能匹配最合适的项目
- 技术栈和模块信息提高匹配准确度

### Issue平台配置 (`issuePlatform`)

#### GitLab配置

```json
{
  "issuePlatform": {
    "type": "gitlab",
    "token": "your-gitlab-access-token",
    "url": "https://gitlab.com",              // 或自托管GitLab的URL
    "defaultLabels": ["auto-generated", "ai"] // 默认标签
  }
}
```

**获取GitLab Access Token：**
1. 登录GitLab
2. 进入 User Settings → Access Tokens
3. 创建新token，勾选 `api` 权限
4. 复制生成的token

#### GitHub配置（即将支持）

```json
{
  "issuePlatform": {
    "type": "github",
    "token": "ghp_xxxxxxxxxxxxx",
    "owner": "your-username",
    "defaultRepo": "your-repo",
    "defaultLabels": ["auto-generated"]
  }
}
```

## 工作流程详解

### 1. 需求采集

工作流启动后，系统会：
- 连接禅道系统
- 获取配置的产品/项目中的活跃需求和Bug
- 显示找到的需求数量

### 2. 需求分析

对每个需求，AI会分析：
- **主要目标**：用一句话概括
- **技术栈**：涉及的技术
- **影响模块**：可能需要修改的模块
- **复杂度**：low/medium/high
- **推荐项目**：最适合的项目
- **推荐分支**：最适合的分支
- **关键词**：用于搜索和匹配
- **实现步骤**：建议的实现步骤

### 3. 项目匹配

系统会根据以下因素智能匹配：
- AI推荐的项目（40分）
- 技术栈匹配（最多30分）
- 模块匹配（最多20分）
- 关键词匹配（最多10分）

**交互式选择：**
```
=== 推荐的项目和分支 ===

1. frontend-app (匹配度: 85%)
   分支: develop
   匹配原因: AI推荐项目, 技术栈匹配 (3项), 模块匹配 (2项)

2. backend-api (匹配度: 60%)
   分支: main
   匹配原因: 技术栈匹配 (2项), 关键词匹配 (5项)

请选择操作:
  • 使用第1个推荐（最匹配）
  • 从列表中选择
  • 手动选择其他项目
  • 跳过此需求
```

### 4. Prompt优化

系统会生成详细的prompt，包括：

#### 背景信息
- 项目名称、描述、分支
- 需求来源、优先级、复杂度

#### 目标描述
- 主要目标
- 详细说明

#### 具体要求
- 根据需求类型生成（feature/bug/optimization等）
- 建议的实现步骤

#### 约束条件
- 技术栈约束
- 模块约束
- 编码规范约束

#### 验收标准
- 根据需求类型和复杂度生成

#### 技术和代码库上下文
- 项目技术栈
- 项目结构
- 相关文件列表
- 依赖信息

### 5. 创建Issue

在GitLab中创建Issue，包含：
- 格式化的标题：`[类型] 需求标题`
- 详细的描述（包含所有分析结果）
- 标签：需求类型、优先级、复杂度
- 元数据：需求ID、来源等

**示例Issue：**
```markdown
## 📋 需求概述

实现用户登录功能，支持邮箱和手机号登录

## 📝 详细描述

需要实现用户登录页面，支持邮箱和手机号两种方式登录...

## 🔧 涉及技术栈

- TypeScript
- React
- Redux

## 📦 影响模块

- auth
- api-client

## 🚀 建议实现步骤

1. 创建登录表单组件
2. 实现登录API调用
3. 添加状态管理
4. 实现错误处理

...
```

### 6. Docker Agent执行

- 启动独立的Docker容器
- 传递优化后的prompt
- AI Agent分析代码库
- 生成代码变更
- 在容器内进行测试

### 7. 提交代码

- 创建新分支（如：`fix/issue-123`）
- 提交所有变更
- Push到远程仓库

### 8. 创建Merge Request

创建MR，包含：
- 标题：`解决 #123: 需求标题`
- 详细描述
- 验收标准checklist
- 元信息（复杂度、预估代码行数等）
- 自动关联到Issue

**示例MR：**
```markdown
## 🎯 解决的问题

解决 Issue #123

实现用户登录功能，支持邮箱和手机号登录

## 📝 变更说明

- 添加了登录表单组件
- 实现了登录API调用逻辑
- 添加了状态管理
- 实现了错误处理

## ✅ 验收标准

- [ ] 代码能够成功编译/构建
- [ ] 所有现有测试通过
- [ ] 代码符合项目的lint规则
- [ ] 新功能按预期工作
- [ ] 添加了相应的单元测试

## 📊 元信息

- **复杂度**: medium
- **预估代码行数**: 250
- **需求来源**: zentao-requirement

---

🤖 此MR由AI Agent自动生成
```

### 9. 关联和关闭

- 在Issue中添加MR链接
- 添加执行报告（执行时间、修改文件数等）
- 如果配置了`autoClose`，自动关闭Issue

## 命令行选项

### `full-self-coding workflow`

启动工作流模式。

**选项：**

- `-c, --config <path>` - 指定配置文件路径
- `--auto-approve` - 自动批准，不需要用户确认
- `--dry-run` - 模拟执行，不实际创建Issue或MR

**示例：**

```bash
# 交互式模式
full-self-coding workflow

# 自动批准所有操作
full-self-coding workflow --auto-approve

# 使用自定义配置
full-self-coding workflow -c ./my-config.json

# 测试运行
full-self-coding workflow --dry-run
```

## 最佳实践

### 1. 配置技巧

**详细的项目信息：**
```json
{
  "name": "user-service",
  "description": "用户服务，负责用户认证、授权和个人信息管理",
  "technicalStack": ["Node.js", "TypeScript", "Express", "PostgreSQL", "Redis"],
  "modules": ["auth", "profile", "settings", "notifications"]
}
```

技术栈和模块越详细，AI匹配越准确。

**使用标签组织：**
```json
{
  "issuePlatform": {
    "defaultLabels": [
      "auto-generated",
      "ai-agent",
      "needs-review"
    ]
  }
}
```

### 2. 禅道使用技巧

**清晰的需求描述：**
- 在禅道中编写详细的需求描述
- 包含验收标准
- 明确技术要求
- AI会分析这些信息

**使用优先级：**
- 设置合理的优先级（1-4）
- 工作流会按优先级排序

### 3. 项目结构建议

**标准分支策略：**
```
main/master  - 生产环境
develop      - 开发环境
feature/*    - 功能分支
bugfix/*     - Bug修复分支
```

工作流会根据需求类型推荐合适的基础分支。

### 4. 审查和合并

**MR审查：**
- AI生成的代码需要人工审查
- 检查验收标准是否满足
- 运行测试确保质量
- 审查通过后手动合并（或配置自动合并）

## 故障排除

### 问题：无法连接禅道

**检查：**
1. 禅道API地址是否正确
2. 账号密码是否正确
3. 禅道版本是否支持（建议12.0+）

**测试连接：**
```bash
curl -X POST http://your-zentao-server/api.php/v1/tokens \
  -H "Content-Type: application/json" \
  -d '{"account":"your-account","password":"your-password"}'
```

### 问题：GitLab Token权限不足

**需要的权限：**
- `api` - 完整API访问
- `write_repository` - 推送代码

**重新创建Token：**
1. 删除旧token
2. 创建新token，确保勾选所有必要权限

### 问题：项目匹配不准确

**改进方法：**
1. 添加更详细的`technicalStack`
2. 添加`modules`列表
3. 完善项目`description`
4. 在禅道中使用更清晰的需求描述

### 问题：Docker容器执行失败

**检查：**
1. Docker是否正常运行
2. 容器内存限制是否足够
3. 超时时间是否足够长

**调整配置：**
```json
{
  "dockerMemoryMB": 1024,
  "dockerTimeoutSeconds": 600,
  "dockerCpuCores": 2
}
```

## 环境变量

支持通过环境变量覆盖配置：

```bash
# Anthropic API Key
export FSC_ANTHROPIC_API_KEY="your-key"

# GitLab Token
export FSC_GITLAB_TOKEN="your-token"

# 禅道配置
export FSC_ZENTAO_API_URL="http://zentao.example.com"
export FSC_ZENTAO_ACCOUNT="username"
export FSC_ZENTAO_PASSWORD="password"
```

## 高级用法

### 编程API

```typescript
import { WorkflowOrchestrator } from './workflowOrchestrator';
import { Config } from './config';

// 加载配置
const config: Config = {
  // ... 配置
};

// 创建编排器
const orchestrator = new WorkflowOrchestrator(config);

// 执行工作流
const contexts = await orchestrator.execute();

// 查看结果
contexts.forEach(ctx => {
  console.log(`需求: ${ctx.requirement?.title}`);
  console.log(`状态: ${ctx.state}`);
  if (ctx.mergeRequest) {
    console.log(`MR: ${ctx.mergeRequest.webUrl}`);
  }
});
```

### 自定义工作流

可以直接使用各个模块：

```typescript
import { ZentaoIntegration } from './integrations/zentaoIntegration';
import { RequirementAnalyzer } from './requirementAnalyzer';
import { ProjectMatcher } from './projectMatcher';

// 1. 获取需求
const zentao = new ZentaoIntegration(zentaoConfig);
const requirements = await zentao.fetchRequirements();

// 2. 分析需求
const analyzer = new RequirementAnalyzer(config, projects);
const analyzed = await analyzer.analyzeBatch(requirements, []);

// 3. 匹配项目
const matcher = new ProjectMatcher(config, projects);
for (const req of analyzed) {
  const matches = await matcher.matchRequirement(req);
  // ... 处理匹配结果
}
```

## 下一步

- 查看 [架构设计文档](./requirement-driven-workflow-design.md)
- 查看 [配置示例](../examples/workflow-config.json.example)
- 查看 [API文档](./api-reference.md)（即将推出）

## 反馈和贡献

如有问题或建议，欢迎提交Issue或Pull Request。
