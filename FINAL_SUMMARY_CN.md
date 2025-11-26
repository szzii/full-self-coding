# 🎉 Full Self Coding 安装和配置完成

## ✅ 系统已准备就绪

你的 Full Self Coding 系统已经成功配置，可以使用自定义的 Claude Code API 地址。

---

## 📋 配置摘要

### 核心配置
- **Agent 类型**: Claude Code (`claude-code`)
- **API 端点**: `https://gaccode.com/claudecode`
- **API Key**: `sk-ant-oat01-3d16c2d5def79025c5a9f12e8d44b6f73828803e2a9083b7732cbe2ba04406c8`
- **运行模式**: Claude Code **在 Docker 容器内运行** ✓

### Docker 配置
- **容器数量**: 最多 10 个容器
- **并行执行**: 3 个容器同时运行
- **容器内存**: 2048 MB
- **CPU 核心**: 2 核
- **超时设置**: 600 秒

### 文件位置
- **配置文件**: `/home/szz/ts/full-self-coding/.fsc/config.json`
- **可执行文件**: `/home/szz/ts/full-self-coding/dist/main.js`
- **源代码**: `/home/szz/ts/full-self-coding/src/main.ts`

---

## 🔧 系统工作原理

### Claude Code 在 Docker 中的运行流程

1. **容器创建**
   - 系统为每个任务创建独立的 Node.js Docker 容器
   - 使用镜像: `node:latest`

2. **环境准备**（在容器内自动执行）
   ```bash
   # 克隆代码仓库
   git clone <your-repo> /app/repo

   # 安装 Node.js 和依赖
   apt-get update
   apt-get install -y curl nodejs

   # 安装 Claude Code CLI
   npm install -g @anthropic-ai/claude-code
   ```

3. **配置 API**（在容器内自动设置）
   ```bash
   # 设置自定义 API 端点
   export ANTHROPIC_BASE_URL=https://gaccode.com/claudecode

   # 设置 API 密钥
   export ANTHROPIC_AUTH_TOKEN=sk-ant-oat01-...

   # 设置沙盒模式
   export IS_SANDBOX=1
   ```

4. **执行任务**
   ```bash
   # Claude Code 读取任务描述并执行
   claude -p "all the task descriptions are located at /app/taskSolverPrompt.txt, please read and execute" \
     --allowedTools "Bash,ReadEdit,Glob,Grep,WebFetch,WebSearch,Write,TodoWrite,SlashCommand" \
     --permission-mode bypassPermissions
   ```

5. **结果收集**
   - 从容器中提取修改后的代码
   - 生成 git diff 报告
   - 清理容器

### 关键优势

✓ **隔离性**: 每个任务在独立容器中运行，互不干扰
✓ **安全性**: 代码修改在沙盒环境中进行
✓ **可重复性**: 每次都使用相同的环境配置
✓ **并行性**: 多个任务可以同时在不同容器中执行
✓ **资源控制**: 精确控制每个容器的内存和CPU使用

---

## 🚀 快速开始

### 方法 1: 使用快速启动脚本（推荐新手）

```bash
cd /home/szz/ts/full-self-coding
./quick-start.sh
```

### 方法 2: 直接运行（推荐熟练用户）

```bash
# 分析当前目录
cd /path/to/your/project
/home/szz/ts/full-self-coding/dist/main.js

# 或分析远程仓库
/home/szz/ts/full-self-coding/dist/main.js https://github.com/username/repo.git
```

### 方法 3: 使用 Bun（开发模式）

```bash
cd /home/szz/ts/full-self-coding
bun src/main.ts
```

---

## 🔍 执行流程示例

当你运行 `./dist/main.js` 时，会发生以下事情：

### 第 1 阶段: 分析 (2-5 分钟)

```
[系统] 创建 Docker 容器: analyzer-xxxxx
[容器] 安装 Node.js 和 Claude Code
[容器] 设置环境变量:
        - ANTHROPIC_BASE_URL=https://gaccode.com/claudecode
        - ANTHROPIC_AUTH_TOKEN=sk-ant-oat01-...
[容器] 克隆代码仓库
[Claude] 分析代码库...
[Claude] 识别问题和改进点
[Claude] 生成任务列表: 10 个任务
[系统] 保存任务列表
[系统] 关闭分析容器
```

### 第 2 阶段: 执行任务 (每个 5-10 分钟)

```
[系统] 创建 3 个并行容器:
        - task-1-xxxxx
        - task-2-xxxxx
        - task-3-xxxxx

[容器 task-1] 安装 Claude Code
[容器 task-1] 设置 API 环境变量
[容器 task-1] 克隆仓库
[容器 task-1] Claude Code 执行任务 1...
[容器 task-1] 修改代码文件...
[容器 task-1] 运行测试...
[容器 task-1] 任务完成

[系统] 收集结果
[系统] 生成 git diff
[系统] 关闭容器

... 重复直到所有 10 个任务完成
```

### 第 3 阶段: 报告 (1 分钟)

```
[系统] 汇总所有任务结果
[系统] 生成详细报告
[系统] 显示所有代码更改
[系统] 完成！
```

---

## 📊 可用命令和工具

### 验证命令

```bash
# 完整系统验证
./verify-setup.sh

# 仅验证配置
bun test-config.ts

# 检查 Docker 状态
docker info
docker ps  # 查看运行中的容器
```

### 构建和开发命令

```bash
# 重新构建项目
bun run build

# 安装依赖
bun install

# 清理 Docker 容器
docker ps -a | grep copilot-docker | awk '{print $1}' | xargs docker rm -f
```

---

## 🎯 使用示例

### 示例 1: 分析并改进 TypeScript 项目

```bash
cd ~/my-typescript-project
/home/szz/ts/full-self-coding/dist/main.js
```

**期望结果**:
- Claude Code 会识别类型错误
- 修复 lint 问题
- 优化代码结构
- 添加缺失的类型注解

### 示例 2: 修复 Bug 和测试

```bash
/home/szz/ts/full-self-coding/dist/main.js \
  --max-tasks 5 \
  --work-style careful
```

**期望结果**:
- 更谨慎的代码分析
- 识别潜在 bug
- 运行和修复失败的测试
- 添加缺失的测试用例

### 示例 3: 大型项目深度分析

```bash
/home/szz/ts/full-self-coding/dist/main.js \
  --max-tasks 20 \
  --parallel-containers 5 \
  --memory 4096 \
  --cpu 4 \
  --timeout 1200
```

**期望结果**:
- 分析更多问题（最多 20 个任务）
- 更快执行（5 个并行容器）
- 更多资源（4GB 内存，4 CPU 核心）
- 更长超时（20 分钟）

---

## ⚙️ 配置文件详解

位置: `.fsc/config.json`

```json
{
  "agentType": "claude-code",

  // 你的自定义 API 配置
  "anthropicAPIKey": "sk-ant-oat01-3d16c2d5def79025c5a9f12e8d44b6f73828803e2a9083b7732cbe2ba04406c8",
  "anthropicAPIBaseUrl": "https://gaccode.com/claudecode",
  "anthropicAPIKeyExportNeeded": true,

  // Docker 资源限制
  "maxDockerContainers": 10,           // 最多创建 10 个容器
  "maxParallelDockerContainers": 3,    // 同时运行 3 个
  "dockerTimeoutSeconds": 600,         // 每个任务最多 10 分钟
  "dockerMemoryMB": 2048,              // 每个容器 2GB 内存
  "dockerCpuCores": 2,                 // 每个容器 2 个 CPU 核心

  // 任务配置
  "maxTasks": 10,                      // 最多生成 10 个任务
  "minTasks": 1,                       // 至少生成 1 个任务

  // 工作风格
  "workStyle": "default",              // 默认工作风格
  "codingStyleLevel": 5                // 代码风格级别 (0-10)
}
```

### 如何调整配置

#### 提高性能（适合强大的机器）
```json
{
  "maxParallelDockerContainers": 5,
  "dockerMemoryMB": 4096,
  "dockerCpuCores": 4,
  "maxTasks": 20
}
```

#### 降低资源使用（适合普通机器）
```json
{
  "maxParallelDockerContainers": 2,
  "dockerMemoryMB": 1024,
  "dockerCpuCores": 1,
  "maxTasks": 5
}
```

#### 更快速但less深入的分析
```json
{
  "maxTasks": 3,
  "dockerTimeoutSeconds": 300,
  "workStyle": "agile"
}
```

#### 更彻底但slower的分析
```json
{
  "maxTasks": 20,
  "dockerTimeoutSeconds": 1200,
  "workStyle": "careful"
}
```

---

## 🐳 Docker 内部环境

每个 Docker 容器内部都有完整的开发环境：

### 已安装的工具
- ✓ Node.js 20.x
- ✓ npm
- ✓ git
- ✓ curl
- ✓ Claude Code CLI
- ✓ simple-git (用于 diff 生成)

### 目录结构
```
/app/
├── repo/              # 你的代码仓库
│   └── fsc/          # Full Self Coding 工作目录
├── diff/             # Git diff 工具
│   ├── run.js        # Diff 生成脚本
│   └── node_modules/
└── taskSolverPrompt.txt  # 任务描述
```

### 环境变量
```bash
ANTHROPIC_BASE_URL=https://gaccode.com/claudecode
ANTHROPIC_AUTH_TOKEN=sk-ant-oat01-...
IS_SANDBOX=1
```

---

## 🔒 安全性

### API Key 安全
- ✓ API Key 仅在 Docker 容器内部使用
- ✓ 容器执行完毕后自动销毁
- ✓ 不会写入日志或持久化存储
- ⚠️ 不要将 `.fsc/config.json` 提交到公共仓库

### 容器隔离
- ✓ 每个任务在独立容器中运行
- ✓ 容器之间互不影响
- ✓ 容器无法访问宿主机敏感文件
- ✓ 资源限制防止失控进程

### 建议
```bash
# 将配置文件添加到 .gitignore
echo ".fsc/config.json" >> .gitignore

# 或使用环境变量
export FSC_ANTHROPIC_API_KEY="sk-ant-oat01-..."
export FSC_ANTHROPIC_API_BASE_URL="https://gaccode.com/claudecode"
```

---

## 🐛 常见问题和解决方案

### 问题 1: Docker 容器启动失败

**症状**: `Error: Cannot connect to Docker daemon`

**解决**:
```bash
# 启动 Docker
sudo systemctl start docker

# 检查状态
docker info
```

### 问题 2: API 连接失败

**症状**: `Error: Failed to connect to API endpoint`

**解决**:
```bash
# 1. 检查网络连接
curl -v https://gaccode.com/claudecode

# 2. 验证 API Key
cat .fsc/config.json | grep anthropicAPIKey

# 3. 重新测试配置
bun test-config.ts
```

### 问题 3: 容器内存不足

**症状**: `Docker container killed (OOM)`

**解决**:
```json
// 增加内存限制
{
  "dockerMemoryMB": 4096,  // 增加到 4GB
  "maxParallelDockerContainers": 2  // 减少并行数
}
```

### 问题 4: Claude Code 安装失败

**症状**: `npm install -g @anthropic-ai/claude-code failed`

**解决**:
这通常是网络问题，系统会自动重试。如果持续失败：
```bash
# 手动测试 npm 安装
docker run -it node:latest bash
npm install -g @anthropic-ai/claude-code
```

### 问题 5: 任务超时

**症状**: `Task timeout after 600 seconds`

**解决**:
```json
// 增加超时时间
{
  "dockerTimeoutSeconds": 1200  // 增加到 20 分钟
}
```

---

## 📈 性能优化建议

### 对于小项目 (< 100 文件)
```json
{
  "maxTasks": 5,
  "maxParallelDockerContainers": 2,
  "dockerMemoryMB": 1024
}
```

### 对于中型项目 (100-1000 文件)
```json
{
  "maxTasks": 10,
  "maxParallelDockerContainers": 3,
  "dockerMemoryMB": 2048
}
```

### 对于大型项目 (> 1000 文件)
```json
{
  "maxTasks": 20,
  "maxParallelDockerContainers": 5,
  "dockerMemoryMB": 4096,
  "dockerCpuCores": 4,
  "dockerTimeoutSeconds": 1200
}
```

---

## 📚 相关文档

- **完整使用指南**: `USAGE_GUIDE_CN.md`
- **设置完成说明**: `SETUP_COMPLETE_CN.md`
- **原始 README**: `README.md`
- **配置测试**: `test-config.ts`
- **快速启动**: `quick-start.sh`
- **系统验证**: `verify-setup.sh`

---

## ✅ 下一步行动

1. **运行系统验证**
   ```bash
   ./verify-setup.sh
   ```

2. **测试一个简单项目**
   ```bash
   # 克隆一个示例项目
   git clone https://github.com/yourusername/test-repo.git /tmp/test-repo
   cd /tmp/test-repo

   # 运行分析
   /home/szz/ts/full-self-coding/dist/main.js
   ```

3. **在真实项目上使用**
   ```bash
   cd ~/your-real-project
   /home/szz/ts/full-self-coding/dist/main.js
   ```

4. **根据需要调整配置**
   - 编辑 `.fsc/config.json`
   - 调整资源限制
   - 尝试不同的工作风格

---

## 🎊 总结

你的 Full Self Coding 系统现在已经：

✅ 完全安装和配置
✅ 使用自定义 API 端点 (https://gaccode.com/claudecode)
✅ Claude Code 在 Docker 容器中安全运行
✅ 支持并行任务执行
✅ 准备好分析和改进代码

**系统已就绪，开始使用吧！** 🚀

---

## 📞 获取帮助

如果遇到问题：

1. 查看文档: `USAGE_GUIDE_CN.md`
2. 运行诊断: `./verify-setup.sh`
3. 查看日志: 命令输出包含详细的调试信息
4. GitHub Issues: https://github.com/NO-CHATBOT-REVOLUTION/full-self-coding/issues

---

*配置完成时间: 2025-11-25*
*配置者: Claude Code Assistant*
