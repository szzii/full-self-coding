# 工作流模式 - 快速开始

Full Self Coding现在支持**需求驱动工作流**！从禅道获取需求，AI自动分析、匹配项目、执行任务、创建MR。

## 5分钟快速开始

### 1. 安装依赖

```bash
npm install
# 或
bun install
```

### 2. 创建配置文件

创建 `~/.config/full-self-coding/config.json`:

```json
{
  "agentType": "claude-code",
  "anthropicAPIKey": "sk-ant-xxxxx",

  "workflow": {
    "enabled": true,
    "autoApprove": false,
    "autoClose": true
  },

  "zentao": {
    "apiUrl": "http://your-zentao-server.com",
    "account": "your-account",
    "password": "your-password",
    "productIds": [1]
  },

  "projects": [
    {
      "name": "my-project",
      "path": "/path/to/my-project",
      "gitUrl": "git@gitlab.com:org/my-project.git",
      "technicalStack": ["TypeScript", "React"],
      "modules": ["auth", "api"]
    }
  ],

  "issuePlatform": {
    "type": "gitlab",
    "token": "glpat-xxxxx",
    "url": "https://gitlab.com",
    "defaultLabels": ["auto-generated"]
  }
}
```

### 3. 运行工作流

```bash
# 构建
npm run build

# 运行工作流（交互式）
full-self-coding workflow

# 或自动批准模式
full-self-coding workflow --auto-approve
```

## 工作流程演示

```
🚀 Full Self Coding - Workflow Mode

Loaded configuration from ~/.config/full-self-coding/config.json
✓ 采集到 3 个需求

================================================================================
处理需求 1/3: 实现用户登录功能
================================================================================

=== 需求信息 ===
标题: 实现用户登录功能
类型: feature
优先级: 1
复杂度: medium
主要目标: 实现用户登录页面，支持邮箱和手机号登录

=== 推荐的项目和分支 ===

1. frontend-app (匹配度: 85%)
   分支: develop
   匹配原因: AI推荐项目, 技术栈匹配 (3项), 模块匹配 (2项)

请选择操作:
❯ 使用第1个推荐（最匹配）
  从列表中选择
  手动选择其他项目
  跳过此需求

✓ 已选择: frontend-app / develop
✓ Prompt已优化
✓ Issue已创建: https://gitlab.com/org/frontend-app/-/issues/123
✓ 任务执行完成
✓ Merge Request已创建: https://gitlab.com/org/frontend-app/-/merge_requests/45

📋 执行摘要:
  状态: ✅ completed
  耗时: 245秒
  项目: frontend-app
  Issue: https://gitlab.com/org/frontend-app/-/issues/123
  MR: https://gitlab.com/org/frontend-app/-/merge_requests/45

================================================================================
📊 工作流执行完成
================================================================================

总计: 3 个需求
  ✅ 成功: 2
  ❌ 失败: 0
  ⏭  跳过: 1
  ⏱  总耗时: 512秒

🔀 创建的Merge Requests:
  - 实现用户登录功能
    https://gitlab.com/org/frontend-app/-/merge_requests/45
  - 修复用户信息显示Bug
    https://gitlab.com/org/frontend-app/-/merge_requests/46
```

## 核心功能

| 功能 | 说明 |
|------|------|
| 🔌 **禅道集成** | 自动获取需求和Bug |
| 🤖 **AI分析** | 智能分析需求内容，提取关键信息 |
| 🎯 **智能匹配** | 根据技术栈和模块自动匹配项目 |
| 💬 **交互式选择** | 人工确认或自动批准 |
| 📝 **Issue管理** | 自动创建GitLab Issue |
| 🚀 **AI执行** | Docker容器中的AI agent自动编码 |
| 🔀 **MR创建** | 自动创建Merge Request |
| ✅ **自动关闭** | 任务完成后自动关闭Issue |

## 配置要点

### 必需配置

1. **AI Agent API Key**
   ```json
   "anthropicAPIKey": "sk-ant-xxxxx"
   ```

2. **禅道配置**
   ```json
   "zentao": {
     "apiUrl": "http://zentao.example.com",
     "account": "username",
     "password": "password"
   }
   ```

3. **项目列表**
   ```json
   "projects": [{
     "name": "project-name",
     "path": "/absolute/path",
     "gitUrl": "git@gitlab.com:org/repo.git"
   }]
   ```

4. **GitLab Token**
   ```json
   "issuePlatform": {
     "type": "gitlab",
     "token": "glpat-xxxxx"
   }
   ```

### 获取GitLab Token

1. 登录GitLab
2. User Settings → Access Tokens
3. 创建token，勾选 `api` 和 `write_repository`
4. 复制token到配置文件

### 获取禅道产品ID

1. 打开禅道产品页面
2. URL中的数字就是产品ID
   - 例如：`/zentao/product-view-1.html` → ID是 `1`

## 命令选项

```bash
# 基础命令（交互式）
full-self-coding workflow

# 自动批准（无需确认）
full-self-coding workflow --auto-approve

# 指定配置文件
full-self-coding workflow --config ./config.json

# 测试模式（不实际创建Issue/MR）
full-self-coding workflow --dry-run
```

## 配置示例

完整配置示例请查看：
- [examples/workflow-config.json.example](./examples/workflow-config.json.example)

详细文档请查看：
- [docs/workflow-mode-guide.md](./docs/workflow-mode-guide.md)
- [docs/requirement-driven-workflow-design.md](./docs/requirement-driven-workflow-design.md)

## 常见问题

### Q: 如何测试配置是否正确？

A: 使用 `--dry-run` 模式：
```bash
full-self-coding workflow --dry-run
```

### Q: 可以只处理特定的需求吗？

A: 目前会处理所有活跃的需求和Bug。可以使用交互式模式选择跳过不需要的需求。

### Q: AI生成的代码质量如何保证？

A:
1. 系统会生成详细的验收标准
2. 代码提交到新分支，需要人工审查MR
3. 建议配置CI/CD自动运行测试

### Q: 支持GitHub吗？

A: GitHub支持即将推出，目前仅支持GitLab。

### Q: 如何提高项目匹配准确度？

A: 在配置中添加详细的：
- `technicalStack` - 技术栈列表
- `modules` - 模块列表
- `description` - 项目描述

## 故障排除

### 禅道连接失败

检查：
- API URL是否正确（包含 `/api.php/v1`）
- 账号密码是否正确
- 网络连接是否正常

### GitLab权限不足

检查token权限：
- `api` - 完整API访问
- `write_repository` - 推送代码

### Docker执行失败

检查：
- Docker daemon是否运行
- 内存和超时配置是否足够
- 容器镜像是否正确

## 下一步

- 📖 阅读[完整使用指南](./docs/workflow-mode-guide.md)
- 🏗️ 查看[架构设计文档](./docs/requirement-driven-workflow-design.md)
- 💡 查看[配置示例](./examples/workflow-config.json.example)

## 反馈

遇到问题或有建议？欢迎提交Issue！
