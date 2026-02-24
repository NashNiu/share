# LAN File and Message Sharing System

[中文文档](README_zh.md)

## Project Introduction

This is a WebSocket-based real-time LAN file and message sharing system. It does not store data; all files and messages are transmitted in memory in real-time. It is suitable for quick file sharing and real-time communication between multiple devices within a local area network (LAN).

## Key Features

- 📁 **File Sharing**: Supports drag-and-drop file uploads, real-time sharing with other users in the LAN.
- 💬 **Real-time Chat**: Supports real-time sending and receiving of text messages.
- 📋 **Message Copy**: Supports copying single messages or all messages to the clipboard.
- 🌐 **LAN Discovery**: Automatically discovers services running in the LAN.
- 📱 **Responsive Design**: Supports various devices such as mobile phones, tablets, and computers.
- ⚡ **No Storage**: All data is in memory and does not occupy disk space.

## Technical Architecture

- **Backend**: Node.js + Express + Socket.IO
- **Frontend**: HTML5 + CSS3 + JavaScript (Native)
- **Communication**: WebSocket real-time communication
- **File Processing**: Memory stream processing, no disk storage

## Quick Start

### Install Dependencies

```bash
npm install
```

### Start Service

```bash
npm start
```

### Access System

1. Open `http://localhost:3000` in your browser.
2. Access `http://[Server IP]:3000` on other devices in the LAN.

## Usage Instructions

### File Sharing

1. Drag and drop files to the upload area.
2. The file will immediately appear in the shared list.
3. Other users can click to download the file.
4. Files will disappear after the server restarts (not stored).

### Real-time Chat

1. Enter a message in the chat box.
2. Press Enter or click the send button.
3. The message will be displayed to all online users in real-time.
4. Hover over a message to see the copy button.
5. Click the copy button to copy a single message.
6. Click the "Copy All" button to copy all messages.

### LAN Access

- The server will display the local IP address after startup.
- Use this IP address to access from other devices in the LAN.
- Supports mobile devices such as phones and tablets.

## Project Structure

```
share/
├── README.md           # Project documentation
├── README_zh.md        # Project documentation (Chinese)
├── package.json        # Project dependency configuration
├── server.js           # Server main file
├── public/             # Frontend static files
│   ├── index.html      # Main page
│   ├── style.css       # Style file
│   └── script.js       # Frontend logic
└── uploads/            # Temporary file directory (cleared after restart)
```

## Notes

- This system does not store any data; all files and messages will disappear after restarting the server.
- Suitable for temporary file sharing and team collaboration.
- Please ensure use in a secure LAN environment.
- It is recommended to restart the server periodically to clear memory.

## System Requirements

- Node.js 14.0 or higher
- Modern browser support (Chrome, Firefox, Safari, Edge)
- LAN network connection

## Project Features

- ✅ **No Storage**: All data in memory, automatically cleared after restart.
- ✅ **Real-time Sync**: Real-time communication based on WebSocket.
- ✅ **Cross-platform**: Supports Windows, Linux, Mac.
- ✅ **Responsive**: Supports mobile phones, tablets, computers, etc.
- ✅ **Easy to Use**: One-click start, no complex configuration required.
- ✅ **Secure & Reliable**: Used only within LAN, data is not persisted.

## Technical Highlights

- High-performance server built with Node.js + Express + Socket.IO.
- Frontend uses native JavaScript, no framework dependencies.
- Supports drag-and-drop upload, user-friendly experience.
- Memory stream processing, avoiding disk I/O.
- Real-time status synchronization, multi-user collaboration.
