# 自定义 Claude Code 安装说明

## ✅ 已更新为自定义安装源

系统已经配置为使用你的自定义 Claude Code 安装源。

---

## 📋 自定义安装配置

### 安装命令

系统现在使用以下命令在 Docker 容器内安装 Claude Code：

```bash
npm install -g https://gaccode.com/claudecode/install --registry=https://registry.npmmirror.com
```

### 修改的文件

1. **src/SWEAgent/SWEAgentTaskSolverCommands.ts** (第 31 行)
2. **src/analyzer.ts** (第 96 行)

---

## 🔧 工作原理

### 容器内安装流程

当系统创建 Docker 容器时，会自动执行以下步骤：

1. **环境准备**
   ```bash
   apt-get update
   apt-get install -y curl
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt-get install -y nodejs
   ```

2. **安装 Claude Code**（使用自定义源）
   ```bash
   npm install -g https://gaccode.com/claudecode/install \
     --registry=https://registry.npmmirror.com
   ```

3. **设置环境变量**
   ```bash
   export ANTHROPIC_BASE_URL=https://gaccode.com/claudecode
   export ANTHROPIC_AUTH_TOKEN=sk-ant-oat01-...
   export IS_SANDBOX=1
   ```

4. **运行 Claude Code**
   ```bash
   claude -p "..." --allowedTools "..." --permission-mode bypassPermissions
   ```

---

## 🚀 完整配置

你的系统现在同时配置了：

### 1. 自定义 API 端点
```json
{
  "anthropicAPIBaseUrl": "https://gaccode.com/claudecode"
}
```

### 2. 自定义安装源
```bash
npm install -g https://gaccode.com/claudecode/install \
  --registry=https://registry.npmmirror.com
```

### 3. 代理配置
```json
{
  "httpProxy": "http://192.168.124.58:1080",
  "httpsProxy": "http://192.168.124.58:1080"
}
```

---

## 📊 验证安装

### 快速测试

运行测试脚本验证 Claude Code 能否正确安装：

```bash
bun test-claude-install.ts
```

**预期输出**：
```
=== Testing Custom Claude Code Installation ===

✓ Container started
✓ Node.js installed
✓ Claude Code installed

Claude location: /usr/local/bin/claude
Claude version: [版本信息]

✅ Claude Code installation SUCCESSFUL!
```

### 完整配置测试

```bash
# 测试所有配置
bun test-config.ts

# 测试代理
bun test-proxy.ts

# 验证系统
./verify-setup.sh
```

---

## 🔍 关于 Docker Logs

### 为什么 `docker logs` 看不到日志？

**原因**：
- 系统使用 `docker exec` 在容器内运行命令
- `docker exec` 的输出不会进入容器的主进程（`sleep infinity`）日志
- 主进程只是保持容器运行，没有实际输出

### 如何查看执行日志？

**方法 1: 查看系统输出**
```bash
# 系统会实时显示所有命令的输出
bun src/main.ts
```

所有 Docker 命令的输出都会直接显示在终端。

**方法 2: 进入容器查看**
```bash
# 查找正在运行的容器
docker ps

# 进入容器
docker exec -it <container-name> bash

# 查看文件系统
ls -la /app/
cat /app/taskSolverPrompt.txt
```

**方法 3: 查看容器执行历史**
```bash
# 查看容器信息
docker inspect <container-name>

# 查看容器进程
docker top <container-name>
```

### 实时监控容器执行

如果想实时查看容器内的活动，可以：

```bash
# 在容器内启动一个 shell 并跟踪日志
docker exec -it <container-name> bash

# 在容器内监控进程
watch -n 1 'ps aux | grep -E "claude|npm|git"'

# 查看文件变化
watch -n 1 'ls -lt /app/repo | head -20'
```

---

## 🛠️ 自定义安装源的优势

### 使用你的自定义源的好处：

1. **控制版本**
   - 使用你自己维护的 Claude Code 版本
   - 确保版本一致性

2. **网络优化**
   - 使用国内镜像源（npmmirror.com）
   - 更快的下载速度
   - 更稳定的连接

3. **内部部署**
   - 可以在内网环境使用
   - 不依赖外部 npm registry

4. **自定义配置**
   - 可以预配置某些设置
   - 添加企业特定的配置

---

## 🔧 高级配置

### 修改安装源

如果需要更改安装源，编辑以下文件：

**文件 1: `src/SWEAgent/SWEAgentTaskSolverCommands.ts`**
```typescript
case SWEAgentType.CLAUDE_CODE:
  setupCommands.push(
    "npm install -g https://YOUR-NEW-URL/install --registry=YOUR-REGISTRY",
  );
  break;
```

**文件 2: `src/analyzer.ts`**
```typescript
case SWEAgentType.CLAUDE_CODE:
  allCommands.push(`npm install -g https://YOUR-NEW-URL/install --registry=YOUR-REGISTRY`);
  break;
```

然后重新构建：
```bash
bun run build
```

### 添加额外的 npm 配置

如果需要更多 npm 配置，可以在安装命令前添加：

```typescript
setupCommands.push(
  "npm config set registry https://registry.npmmirror.com",
  "npm config set proxy http://your-proxy:port",
  "npm install -g https://gaccode.com/claudecode/install",
);
```

---

## 📝 完整配置文件示例

**`.fsc/config.json`**:
```json
{
  "agentType": "claude-code",

  "anthropicAPIKey": "sk-ant-oat01-...",
  "anthropicAPIBaseUrl": "https://gaccode.com/claudecode",
  "anthropicAPIKeyExportNeeded": true,

  "httpProxy": "http://192.168.124.58:1080",
  "httpsProxy": "http://192.168.124.58:1080",

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

---

## ✅ 检查清单

运行系统前，确保：

- [x] 代码已更新为使用自定义安装源
- [x] 项目已重新构建（`bun run build`）
- [x] 配置文件包含 API 端点和代理
- [x] Docker 正在运行
- [x] 代理可访问（如果在代理环境）
- [x] 测试安装成功（`bun test-claude-install.ts`）

---

## 🚀 现在可以使用了

所有配置已完成，你可以开始使用系统：

```bash
# 快速启动
./quick-start.sh

# 或直接运行
bun src/main.ts

# 或使用编译版本
./dist/main.js
```

---

## 🔍 故障排查

### 问题 1: Claude Code 安装失败

**症状**:
```
npm ERR! 404 Not Found - GET https://gaccode.com/claudecode/install
```

**检查**:
1. 确认 URL 可访问
   ```bash
   curl -I https://gaccode.com/claudecode/install
   ```

2. 检查代理设置
   ```bash
   cat .fsc/config.json | grep -i proxy
   ```

3. 手动测试安装
   ```bash
   docker run -it \
     -e http_proxy=http://192.168.124.58:1080 \
     -e https_proxy=http://192.168.124.58:1080 \
     node:latest bash

   # 在容器内
   npm install -g https://gaccode.com/claudecode/install \
     --registry=https://registry.npmmirror.com
   ```

### 问题 2: Claude 命令未找到

**症状**:
```
bash: claude: command not found
```

**解决**:
1. 检查全局安装路径
   ```bash
   npm list -g --depth=0
   ```

2. 检查 PATH
   ```bash
   echo $PATH | grep npm
   ```

3. 重新安装
   ```bash
   npm install -g https://gaccode.com/claudecode/install --force
   ```

### 问题 3: API 连接失败

**症状**:
```
Error: Failed to connect to API
```

**检查**:
1. 验证 API 端点
   ```bash
   curl https://gaccode.com/claudecode
   ```

2. 检查环境变量
   ```bash
   docker exec <container> env | grep ANTHROPIC
   ```

3. 测试 API Key
   ```bash
   curl -H "x-api-key: sk-ant-oat01-..." \
        https://gaccode.com/claudecode/v1/messages
   ```

---

## 📚 相关文档

- **FINAL_SUMMARY_CN.md** - 系统完整说明
- **PROXY_SETUP_CN.md** - 代理配置指南
- **USAGE_GUIDE_CN.md** - 使用指南
- **test-claude-install.ts** - 安装测试脚本

---

*最后更新: 2025-11-25*
*自定义安装源: https://gaccode.com/claudecode/install*
*Registry: https://registry.npmmirror.com*
