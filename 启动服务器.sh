#!/bin/bash
# 7B班作业服务器 - 一键启动脚本

DIR="$(cd "$(dirname "$0")" && pwd)"
NODE="/Users/bubble77887788/.workbuddy/binaries/node/versions/22.12.0/bin/node"

echo ""
echo "======================================="
echo "  📚 7B班作业同步服务器"
echo "======================================="

# 检查 node
if [ ! -f "$NODE" ]; then
  # 尝试系统 node
  NODE=$(which node 2>/dev/null)
  if [ -z "$NODE" ]; then
    echo "  ❌ 未找到 Node.js，请先安装"
    exit 1
  fi
fi

echo "  正在启动服务器..."
cd "$DIR"
"$NODE" server.js
