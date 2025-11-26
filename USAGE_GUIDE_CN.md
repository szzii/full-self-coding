# Full Self Coding 使用指南

## ✅ 配置完成

你的系统已经成功配置并构建完成！

### 当前配置

- **Agent 类型**: Claude Code
- **API 地址**: https://gaccode.com/claudecode
- **API Key**: 已配置 (sk-ant-oat01-...)
- **最大 Docker 容器数**: 10
- **并行容器数**: 3
- **容器内存**: 2048 MB
- **CPU 核心数**: 2

## 🚀 如何使用

### 方法 1: 分析本地仓库

```bash
# 在你的项目目录中运行
cd /path/to/your/project
/home/szz/ts/full-self-coding/dist/main.js
```

### 方法 2: 分析远程仓库

```bash
# 克隆并分析远程仓库
/home/szz/ts/full-self-coding/dist/main.js https://github.com/username/repo.git
```

### 方法 3: 使用 bun 运行

```bash
cd /home/szz/ts/full-self-coding
bun src/main.ts
```

## 📋 配置文件位置

项目配置文件位于: `.fsc/config.json`

你可以为不同的项目创建不同的配置文件：

```bash
# 在你的项目根目录创建 .fsc 文件夹
mkdir .fsc
cp /home/szz/ts/full-self-coding/.fsc/config.json .fsc/
```

## 🔧 修改配置

编辑 `.fsc/config.json` 文件来修改配置：

```json
{
  "agentType": "claude-code",
  "anthropicAPIKey": "your-api-key",
  "anthropicAPIBaseUrl": "https://gaccode.com/claudecode",
  "anthropicAPIKeyExportNeeded": true,
  "maxDockerContainers": 10,
  "maxParallelDockerContainers": 3,
  "dockerTimeoutSeconds": 600,
  "dockerMemoryMB": 2048,
  "dockerCpuCores": 2,
  "maxTasks": 10,
  "minTasks": 1,
  "workStyle": "default",
  "codingStyleLevel": 5
}
```

### 配置参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `agentType` | AI 代理类型 | `claude-code` |
| `anthropicAPIKey` | Claude API 密钥 | - |
| `anthropicAPIBaseUrl` | 自定义 API 地址 | - |
| `maxDockerContainers` | 最大容器数量 | 10 |
| `maxParallelDockerContainers` | 并行容器数量 | 3 |
| `dockerTimeoutSeconds` | 容器超时时间（秒） | 600 |
| `dockerMemoryMB` | 容器内存限制（MB） | 2048 |
| `dockerCpuCores` | CPU 核心数 | 2 |
| `maxTasks` | 最大任务数 | 10 |
| `minTasks` | 最小任务数 | 1 |
| `workStyle` | 工作风格 | `default` |
| `codingStyleLevel` | 代码风格级别 (0-10) | 5 |

### 工作风格选项

- `default`: 默认风格
- `bold_genius`: 大胆创新
- `careful`: 谨慎细致
- `agile`: 敏捷开发
- `research`: 研究导向

## 📝 验证配置

运行测试脚本验证配置是否正确：

```bash
cd /home/szz/ts/full-self-coding
bun test-config.ts
```

## 🐳 Docker 要求

确保 Docker 已安装并运行：

```bash
# 检查 Docker 版本
docker --version

# 检查 Docker 状态
docker info

# 测试 Docker
docker run --rm hello-world
```

## 📊 运行示例

### 示例 1: 简单分析

```bash
cd /home/szz/ts/full-self-coding
bun src/main.ts
```

这将分析当前项目，Claude Code 会自动：
1. 分析代码库结构
2. 识别潜在问题和改进点
3. 生成任务列表
4. 在 Docker 容器中并行执行任务
5. 生成详细报告

### 示例 2: 使用命令行选项

```bash
# 指定最大任务数和并行容器数
bun src/main.ts --max-tasks 20 --parallel-containers 5

# 使用不同的工作风格
bun src/main.ts --work-style bold_genius

# 调整资源限制
bun src/main.ts --memory 4096 --cpu 4
```

## 🔍 命令行选项

```bash
选项:
  -a, --agent-type <type>           AI 代理类型 (默认: claude-code)
  -m, --max-containers <number>     最大容器数
  -p, --parallel-containers <n>     并行容器数
  -t, --timeout <seconds>           超时时间
  -M, --memory <mb>                 内存限制 (MB)
  -c, --cpu <cores>                 CPU 核心数
  -w, --work-style <style>          工作风格
  -l, --coding-style-level <level>  代码风格级别
  -T, --max-tasks <number>          最大任务数
  -n, --min-tasks <number>          最小任务数
  -h, --help                        显示帮助信息
```

## 📈 输出结果

运行后，系统会：

1. **分析阶段**:
   - 扫描代码库
   - 识别问题和改进点
   - 生成任务列表

2. **执行阶段**:
   - 在 Docker 容器中运行任务
   - 实时显示进度
   - 记录所有更改

3. **报告阶段**:
   - 生成详细报告
   - 显示所有代码更改 (git diff)
   - 总结执行结果

## ⚠️ 注意事项

1. **Docker 必须运行**: 确保 Docker 守护进程正在运行
2. **API Key 安全**: 不要提交包含 API key 的配置文件到公共仓库
3. **资源限制**: 根据你的机器配置调整容器资源
4. **网络连接**: 确保可以访问 https://gaccode.com/claudecode

## 🛠️ 故障排查

### Docker 连接问题

```bash
# 重启 Docker
sudo systemctl restart docker

# 检查 Docker 权限
sudo usermod -aG docker $USER
newgrp docker
```

### API 连接问题

```bash
# 测试 API 连接
curl -v https://gaccode.com/claudecode
```

### 配置问题

```bash
# 重新生成配置
cd /home/szz/ts/full-self-coding
bun test-config.ts
```

## 📞 获取帮助

如有问题，请查看：
- GitHub Issues: https://github.com/NO-CHATBOT-REVOLUTION/full-self-coding/issues
- 项目文档: README.md
- 配置测试脚本: test-config.ts
