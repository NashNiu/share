@echo off
echo 局域网文件和信息共享系统
echo ================================
echo.

echo 正在检查Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到Node.js，请先安装Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo 正在安装依赖包...
call npm install

if %errorlevel% neq 0 (
    echo 错误: 依赖安装失败
    pause
    exit /b 1
)

echo.
echo 启动服务器...
echo ================================
echo 按 Ctrl+C 停止服务器
echo.

call npm start

pause
