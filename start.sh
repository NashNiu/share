#!/bin/bash

echo "LAN File and Message Sharing System"
echo "================================"
echo

echo "Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "Error: Node.js not found, please install Node.js first"
    echo "Download URL: https://nodejs.org/"
    exit 1
fi

echo "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "Error: Failed to install dependencies"
    exit 1
fi

echo
echo "Starting server..."
echo "================================"
echo "Press Ctrl+C to stop the server"
echo

npm start
