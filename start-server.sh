#!/bin/bash

echo "🚀 答题比赛系统 - 本地服务器启动脚本"
echo "================================="

# 检查端口是否可用
PORT=8080
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        return 1
    else
        return 0
    fi
}

# 寻找可用端口
while ! check_port $PORT; do
    echo "⚠️  端口 $PORT 被占用，尝试 $((PORT+1))"
    PORT=$((PORT+1))
done

echo "✅ 使用端口: $PORT"

# 检查Python版本
if command -v python3 &> /dev/null; then
    echo "🐍 使用 Python3 启动服务器..."
    echo "📡 本地访问地址: http://localhost:$PORT"
    echo "📱 手机访问地址: http://$(hostname -I | awk '{print $1}'):$PORT"
    echo ""
    echo "🎯 管理员密码: admin123"
    echo ""
    echo "按 Ctrl+C 停止服务器"
    echo "================================="
    python3 -m http.server $PORT
elif command -v python &> /dev/null; then
    echo "🐍 使用 Python 启动服务器..."
    echo "📡 访问地址: http://localhost:$PORT"
    echo "按 Ctrl+C 停止服务器"
    echo "================================="
    python -m SimpleHTTPServer $PORT
else
    echo "❌ 未找到 Python，请安装 Python 或使用其他方法启动服务器"
    echo ""
    echo "其他启动方法："
    echo "1. 安装 Node.js 后运行: npx http-server -p $PORT"
    echo "2. 安装 PHP 后运行: php -S localhost:$PORT"
    echo "3. 直接双击 index.html 文件（功能可能受限）"
fi