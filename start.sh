#!/bin/bash

echo "局域网文件和信息共享系统"
echo "================================"
echo

echo "正在检查Node.js..."
if ! command -v node &> /dev/null; then
    echo "错误: 未找到Node.js，请先安装Node.js"
    echo "下载地址: https://nodejs.org/"
    exit 1
fi

echo "正在安装依赖包..."
npm install

if [ $? -ne 0 ]; then
    echo "错误: 依赖安装失败"
    exit 1
fi

echo
echo "启动服务器..."
echo "================================"
echo "按 Ctrl+C 停止服务器"
echo

npm start
