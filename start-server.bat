@echo off
chcp 65001 >nul
echo 🚀 答题比赛系统 - 本地服务器启动脚本
echo =================================

set PORT=8080

:checkport
netstat -an | find ":8080 " >nul
if %errorlevel% == 0 (
    echo ⚠️  端口 %PORT% 被占用，尝试 8081
    set PORT=8081
    goto checkport8081
) else (
    goto startserver
)

:checkport8081
netstat -an | find ":8081 " >nul
if %errorlevel% == 0 (
    echo ⚠️  端口 %PORT% 被占用，尝试 8082
    set PORT=8082
    goto startserver
) else (
    goto startserver
)

:startserver
echo ✅ 使用端口: %PORT%

python -c "import sys; print(sys.version)" >nul 2>&1
if %errorlevel% == 0 (
    echo 🐍 使用 Python 启动服务器...
    echo 📡 本地访问地址: http://localhost:%PORT%
    echo 📱 手机访问可尝试: http://你的电脑IP:%PORT%
    echo.
    echo 🎯 管理员密码: admin123
    echo.
    echo 按 Ctrl+C 停止服务器
    echo =================================
    python -m http.server %PORT%
    goto end
)

py -c "import sys; print(sys.version)" >nul 2>&1
if %errorlevel% == 0 (
    echo 🐍 使用 Python 启动服务器...
    echo 📡 访问地址: http://localhost:%PORT%
    echo 按 Ctrl+C 停止服务器
    echo =================================
    py -m http.server %PORT%
    goto end
)

echo ❌ 未找到 Python，请安装 Python 或使用其他方法启动服务器
echo.
echo 其他启动方法：
echo 1. 安装 Python 后重新运行此脚本
echo 2. 安装 Node.js 后运行: npx http-server -p %PORT%
echo 3. 直接双击 index.html 文件（功能可能受限）
echo.
pause

:end