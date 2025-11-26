#!/bin/bash

# Full Self Coding - Quick Start Script
# 快速启动脚本

echo "===================================="
echo "Full Self Coding - Quick Start"
echo "===================================="
echo ""

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行或未安装"
    echo "请先启动 Docker: sudo systemctl start docker"
    exit 1
fi

echo "✓ Docker 正在运行"

# 检查配置文件
if [ ! -f ".fsc/config.json" ]; then
    echo "❌ 配置文件不存在: .fsc/config.json"
    echo "请先创建配置文件或复制示例配置"
    exit 1
fi

echo "✓ 配置文件存在"

# 显示当前配置
echo ""
echo "当前配置:"
echo "----------"
cat .fsc/config.json | grep -E '"agentType"|"anthropicAPIBaseUrl"|"maxDockerContainers"|"maxParallelDockerContainers"'
echo ""

# 运行测试
read -p "是否运行配置测试? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "运行配置测试..."
    bun test-config.ts
    if [ $? -ne 0 ]; then
        echo "❌ 配置测试失败"
        exit 1
    fi
    echo ""
fi

# 选择运行模式
echo "请选择运行模式:"
echo "1) 分析当前项目"
echo "2) 分析指定仓库"
echo "3) 退出"
echo ""
read -p "请输入选项 (1-3): " choice

case $choice in
    1)
        echo ""
        echo "开始分析当前项目..."
        bun src/main.ts
        ;;
    2)
        echo ""
        read -p "请输入 Git 仓库 URL: " repo_url
        echo "开始分析仓库: $repo_url"
        bun src/main.ts "$repo_url"
        ;;
    3)
        echo "退出"
        exit 0
        ;;
    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac

echo ""
echo "===================================="
echo "运行完成!"
echo "===================================="
