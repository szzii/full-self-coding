#!/bin/bash

# Full Self Coding - 系统验证脚本
# System Verification Script

echo "========================================"
echo "Full Self Coding - 系统验证"
echo "System Verification"
echo "========================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查项计数
TOTAL_CHECKS=0
PASSED_CHECKS=0

# 辅助函数
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED_CHECKS++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# 1. 检查 Bun
echo "1. 检查 Bun 安装..."
((TOTAL_CHECKS++))
if command -v bun &> /dev/null; then
    BUN_VERSION=$(bun --version)
    check_pass "Bun 已安装 (版本: $BUN_VERSION)"
else
    check_fail "Bun 未安装"
    echo "   请访问 https://bun.sh 安装 Bun"
fi
echo ""

# 2. 检查 Docker
echo "2. 检查 Docker..."
((TOTAL_CHECKS++))
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d ' ' -f3 | tr -d ',')
    check_pass "Docker 已安装 (版本: $DOCKER_VERSION)"

    # 检查 Docker 是否运行
    if docker info &> /dev/null; then
        check_pass "Docker 守护进程正在运行"
    else
        check_fail "Docker 守护进程未运行"
        echo "   请启动 Docker: sudo systemctl start docker"
    fi
else
    check_fail "Docker 未安装"
    echo "   请访问 https://docs.docker.com/get-docker/ 安装 Docker"
fi
echo ""

# 3. 检查项目构建
echo "3. 检查项目构建..."
((TOTAL_CHECKS++))
if [ -f "dist/main.js" ]; then
    check_pass "项目已构建 (dist/main.js 存在)"
else
    check_fail "项目未构建"
    echo "   运行: bun run build"
fi
echo ""

# 4. 检查配置文件
echo "4. 检查配置文件..."
((TOTAL_CHECKS++))
if [ -f ".fsc/config.json" ]; then
    check_pass "配置文件存在 (.fsc/config.json)"

    # 检查关键配置项
    if grep -q "anthropicAPIKey" .fsc/config.json; then
        check_pass "API Key 已配置"
    else
        check_warn "API Key 未配置"
    fi

    if grep -q "anthropicAPIBaseUrl" .fsc/config.json; then
        API_BASE_URL=$(grep "anthropicAPIBaseUrl" .fsc/config.json | cut -d '"' -f4)
        check_pass "API Base URL 已配置: $API_BASE_URL"
    else
        check_warn "API Base URL 未配置"
    fi
else
    check_fail "配置文件不存在"
    echo "   请创建 .fsc/config.json"
fi
echo ""

# 5. 检查依赖
echo "5. 检查依赖..."
((TOTAL_CHECKS++))
if [ -d "node_modules" ]; then
    check_pass "依赖已安装"
else
    check_fail "依赖未安装"
    echo "   运行: bun install"
fi
echo ""

# 6. 运行配置测试
echo "6. 运行配置测试..."
((TOTAL_CHECKS++))
if [ -f "test-config.ts" ]; then
    if bun test-config.ts > /tmp/config-test.log 2>&1; then
        check_pass "配置测试通过"
        # 显示关键配置信息
        echo "   配置详情:"
        cat /tmp/config-test.log | grep -E "Agent Type|API Base URL|Max Docker"
    else
        check_fail "配置测试失败"
        echo "   查看详细日志: cat /tmp/config-test.log"
    fi
else
    check_warn "配置测试脚本不存在"
fi
echo ""

# 7. 检查 Docker 镜像
echo "7. 检查 Docker 镜像..."
((TOTAL_CHECKS++))
if docker images | grep -q "node"; then
    check_pass "Node.js Docker 镜像已存在"
else
    check_warn "Node.js Docker 镜像不存在"
    echo "   首次运行时会自动下载"
fi
echo ""

# 8. 测试 Docker 容器创建
echo "8. 测试 Docker 容器..."
((TOTAL_CHECKS++))
if docker run --rm hello-world > /dev/null 2>&1; then
    check_pass "Docker 容器测试成功"
else
    check_fail "Docker 容器测试失败"
    echo "   检查 Docker 权限和配置"
fi
echo ""

# 总结
echo "========================================"
echo "验证完成 - Summary"
echo "========================================"
echo ""
echo "通过检查: $PASSED_CHECKS / $TOTAL_CHECKS"
echo ""

if [ $PASSED_CHECKS -eq $TOTAL_CHECKS ]; then
    echo -e "${GREEN}✓ 所有检查通过！系统已准备就绪。${NC}"
    echo ""
    echo "你可以开始使用了:"
    echo "  ./quick-start.sh"
    echo "或者:"
    echo "  bun src/main.ts"
    exit 0
elif [ $PASSED_CHECKS -ge $((TOTAL_CHECKS - 2)) ]; then
    echo -e "${YELLOW}⚠ 大部分检查通过，但有些警告需要注意。${NC}"
    echo "系统应该可以运行，但可能存在一些问题。"
    exit 0
else
    echo -e "${RED}✗ 多个检查失败，请解决上述问题后再试。${NC}"
    exit 1
fi
