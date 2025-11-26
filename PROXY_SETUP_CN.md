# 代理配置指南

## ✅ 代理已配置成功

你的 Full Self Coding 系统已经成功配置代理支持！

---

## 📋 当前代理配置

**配置文件**: `.fsc/config.json`

```json
{
  "httpProxy": "http://192.168.124.58:1080",
  "httpsProxy": "http://192.168.124.58:1080"
}
```

这些代理设置会自动传递给所有 Docker 容器。

---

## 🔧 工作原理

### 代理传递流程

1. **配置读取**
   - 系统从 `.fsc/config.json` 读取代理配置
   - 如果配置文件中没有，则从环境变量读取（`http_proxy`, `https_proxy`）

2. **容器创建**
   - Docker 容器启动时，代理设置作为环境变量传递
   - 设置的环境变量：
     ```bash
     http_proxy=http://192.168.124.58:1080
     HTTP_PROXY=http://192.168.124.58:1080
     https_proxy=http://192.168.124.58:1080
     HTTPS_PROXY=http://192.168.124.58:1080
     ```

3. **容器内使用**
   - `apt-get`、`npm`、`git`、`curl` 等工具自动使用代理
   - Claude Code CLI 的网络请求也会通过代理

---

## 🚀 配置方式

### 方法 1: 配置文件（推荐）

编辑 `.fsc/config.json`：

```json
{
  "agentType": "claude-code",
  "httpProxy": "http://your-proxy-host:port",
  "httpsProxy": "http://your-proxy-host:port",
  "noProxy": "localhost,127.0.0.1,.local"
}
```

### 方法 2: 环境变量

如果配置文件中没有设置代理，系统会自动从环境变量读取：

```bash
export http_proxy=http://192.168.124.58:1080
export https_proxy=http://192.168.124.58:1080
export no_proxy=localhost,127.0.0.1

# 然后运行
bun src/main.ts
```

### 方法 3: 混合方式

配置文件优先级高于环境变量。你可以：
- 在配置文件中设置项目特定的代理
- 在环境变量中设置全局默认代理

---

## 📊 验证代理配置

### 运行代理测试

```bash
bun test-proxy.ts
```

这个脚本会：
1. 读取代理配置
2. 创建 Docker 容器
3. 验证容器内的代理环境变量
4. 测试网络连接（访问 google.com）

**成功输出示例**：
```
=== Testing Docker Proxy Configuration ===

Configuration loaded:
- HTTP Proxy: http://192.168.124.58:1080
- HTTPS Proxy: http://192.168.124.58:1080

Setting HTTP proxy for container: http://192.168.124.58:1080
Setting HTTPS proxy for container: http://192.168.124.58:1080
✓ Container started: proxy-test

Container environment:
HTTPS_PROXY=http://192.168.124.58:1080
https_proxy=http://192.168.124.58:1080
http_proxy=http://192.168.124.58:1080
HTTP_PROXY=http://192.168.124.58:1080

Network test result:
HTTP/1.1 200 Connection Established

=== Proxy Test Completed Successfully ===
```

### 手动验证

```bash
# 1. 检查配置文件
cat .fsc/config.json | grep -i proxy

# 2. 检查环境变量
env | grep -i proxy

# 3. 运行配置测试
bun test-config.ts
```

---

## 🔍 代理配置选项详解

### httpProxy

HTTP 流量的代理服务器。

**格式**: `http://host:port` 或 `https://host:port`

**示例**:
```json
{
  "httpProxy": "http://192.168.1.100:8080"
}
```

**用途**:
- `git clone http://...` - HTTP Git 仓库
- `npm install` - npm 包下载
- `curl http://...` - HTTP 请求

### httpsProxy

HTTPS 流量的代理服务器。

**格式**: `http://host:port` 或 `https://host:port`

**注意**: 即使是 HTTPS 代理，格式通常也是 `http://...`

**示例**:
```json
{
  "httpsProxy": "http://192.168.1.100:8080"
}
```

**用途**:
- `git clone https://...` - HTTPS Git 仓库
- `npm install` - HTTPS npm registry
- `curl https://...` - HTTPS 请求
- Claude Code API 调用

### noProxy

不使用代理的域名列表（逗号分隔）。

**格式**: `domain1,domain2,ip-range`

**示例**:
```json
{
  "noProxy": "localhost,127.0.0.1,.local,.internal,192.168.0.0/16"
}
```

**常用设置**:
- `localhost` - 本地主机
- `127.0.0.1` - 本地 IP
- `.local` - 本地域名
- `.internal` - 内部域名
- `192.168.0.0/16` - 内网 IP 段

---

## 🌐 常见代理场景

### 场景 1: 公司/学校代理

```json
{
  "httpProxy": "http://proxy.company.com:8080",
  "httpsProxy": "http://proxy.company.com:8080",
  "noProxy": "localhost,127.0.0.1,.company.com,.local"
}
```

### 场景 2: SOCKS5 代理（需要转换）

如果你有 SOCKS5 代理（如 Shadowsocks），需要使用 HTTP 转换工具：

**选项 1: 使用 privoxy**
```bash
# 安装 privoxy
sudo apt-get install privoxy

# 配置 privoxy 监听 8118，转发到 SOCKS5 1080
echo "forward-socks5 / 127.0.0.1:1080 ." | sudo tee -a /etc/privoxy/config
sudo systemctl restart privoxy

# 在配置中使用
{
  "httpProxy": "http://127.0.0.1:8118",
  "httpsProxy": "http://127.0.0.1:8118"
}
```

**选项 2: 使用支持 HTTP 的代理**

你当前的配置 `http://192.168.124.58:1080` 看起来已经是 HTTP 代理。

### 场景 3: 认证代理

如果代理需要用户名和密码：

```json
{
  "httpProxy": "http://username:password@proxy.company.com:8080",
  "httpsProxy": "http://username:password@proxy.company.com:8080"
}
```

**注意**: 密码中的特殊字符需要 URL 编码：
- `@` → `%40`
- `:` → `%3A`
- `#` → `%23`

### 场景 4: 不同协议使用不同代理

```json
{
  "httpProxy": "http://http-proxy.com:8080",
  "httpsProxy": "http://https-proxy.com:8443"
}
```

---

## 🐛 故障排查

### 问题 1: Git Clone 失败

**症状**:
```
fatal: unable to access 'https://github.com/...':
GnuTLS recv error (-110): The TLS connection was non-properly terminated.
```

**解决**:
1. 确认代理配置正确
   ```bash
   cat .fsc/config.json | grep -i proxy
   ```

2. 测试代理连接
   ```bash
   curl -x http://192.168.124.58:1080 https://github.com
   ```

3. 运行代理测试
   ```bash
   bun test-proxy.ts
   ```

### 问题 2: npm 安装失败

**症状**:
```
npm ERR! network request to https://registry.npmjs.org/... failed
```

**解决**:
1. 检查代理设置
2. 测试 npm registry 访问
   ```bash
   curl -x http://192.168.124.58:1080 https://registry.npmjs.org
   ```

3. 在容器内手动测试
   ```bash
   docker run -it \
     -e http_proxy=http://192.168.124.58:1080 \
     -e https_proxy=http://192.168.124.58:1080 \
     node:latest bash

   # 在容器内
   npm config get proxy
   npm install -g @anthropic-ai/claude-code
   ```

### 问题 3: 代理未生效

**症状**: 容器启动但网络请求不走代理

**检查步骤**:

1. **验证代理环境变量**
   ```bash
   bun test-proxy.ts
   ```

2. **检查配置加载**
   ```typescript
   // 运行
   bun test-config.ts
   ```

3. **查看容器日志**
   系统启动容器时会打印：
   ```
   Setting HTTP proxy for container: http://192.168.124.58:1080
   Setting HTTPS proxy for container: http://192.168.124.58:1080
   ```

### 问题 4: 代理服务器无法访问

**症状**:
```
curl: (7) Failed to connect to 192.168.124.58 port 1080: Connection refused
```

**解决**:
1. 检查代理服务器是否运行
2. 检查防火墙设置
3. 确认代理地址和端口正确
4. 如果是 WSL，确保代理监听在正确的网络接口

---

## 💡 最佳实践

### 1. 使用配置文件而非环境变量

**推荐**:
```json
// .fsc/config.json
{
  "httpProxy": "http://192.168.124.58:1080",
  "httpsProxy": "http://192.168.124.58:1080"
}
```

**原因**:
- 项目特定配置
- 易于版本控制（排除敏感信息）
- 不影响其他应用

### 2. 设置 noProxy

避免内网流量走代理：

```json
{
  "httpProxy": "http://192.168.124.58:1080",
  "httpsProxy": "http://192.168.124.58:1080",
  "noProxy": "localhost,127.0.0.1,.local,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
}
```

### 3. 测试代理连接

在运行完整分析前，先测试代理：

```bash
# 1. 测试代理配置
bun test-proxy.ts

# 2. 测试完整配置
bun test-config.ts

# 3. 运行实际任务
bun src/main.ts
```

### 4. 代理认证信息安全

如果代理需要认证，不要直接在配置文件中写密码：

```bash
# 使用环境变量
export PROXY_USER=myuser
export PROXY_PASS=mypass
export http_proxy=http://$PROXY_USER:$PROXY_PASS@proxy.com:8080

# 或在运行时指定
bun src/main.ts
```

---

## 📚 相关命令

```bash
# 测试代理配置
bun test-proxy.ts

# 测试完整配置
bun test-config.ts

# 验证系统设置
./verify-setup.sh

# 查看当前代理设置
cat .fsc/config.json | grep -i proxy
env | grep -i proxy

# 清理 Docker 容器
docker ps -a | grep copilot-docker | awk '{print $1}' | xargs docker rm -f
```

---

## ✅ 配置检查清单

运行以下命令确保代理配置正确：

```bash
# ✓ 1. 检查配置文件
cat .fsc/config.json | jq '.httpProxy, .httpsProxy'

# ✓ 2. 测试代理
bun test-proxy.ts

# ✓ 3. 重新构建
bun run build

# ✓ 4. 验证系统
./verify-setup.sh

# ✓ 5. 运行测试
bun src/main.ts
```

如果所有步骤都通过，你的代理配置就完全正确了！

---

## 🎉 完成

你的 Full Self Coding 系统现在支持代理配置！

**已实现功能**:
- ✅ 从配置文件读取代理设置
- ✅ 自动传递给 Docker 容器
- ✅ 支持 HTTP 和 HTTPS 代理
- ✅ 支持 noProxy 排除列表
- ✅ 环境变量回退支持
- ✅ 代理测试工具

**当前配置**:
- HTTP Proxy: `http://192.168.124.58:1080`
- HTTPS Proxy: `http://192.168.124.58:1080`

现在你可以在需要代理的网络环境中正常使用 Full Self Coding 了！

---

*最后更新: 2025-11-25*
