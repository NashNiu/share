/**
 * 局域网文件和信息共享系统 - 服务器端
 * 基于Express + Socket.IO实现实时通信
 * 不存储数据，所有信息在内存中实时传输
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const cors = require('cors');
const os = require('os');
const path = require('path');
const fs = require('fs');

// 创建Express应用
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 内存存储（不持久化）
const memoryStore = {
  files: new Map(), // 存储文件数据
  messages: [], // 存储聊天消息
  users: new Map() // 存储在线用户
};

// 配置multer用于文件上传（内存存储）
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 限制文件大小为500MB
  }
});

// 获取所有可用的IP地址
function getAllLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        // 排除常见的虚拟网络地址
        if (!iface.address.startsWith('172.26.') && 
            !iface.address.startsWith('169.254.')) {
          ips.push({
            address: iface.address,
            interface: name
          });
        }
      }
    }
  }
  return ips;
}

// 获取本机IP地址（优先返回第一个）
function getLocalIP() {
  const ips = getAllLocalIPs();
  return ips.length > 0 ? ips[0].address : 'localhost';
}

// 生成唯一ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 文件上传接口
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有文件上传' });
    }

    const fileId = generateId();
    const fileInfo = {
      id: fileId,
      name: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype,
      data: req.file.buffer,
      uploadTime: new Date().toISOString(),
      uploader: req.body.uploader || '匿名用户'
    };

    // 存储到内存
    memoryStore.files.set(fileId, fileInfo);

    // 广播文件信息给所有客户端
    io.emit('fileUploaded', {
      id: fileId,
      name: fileInfo.name,
      size: fileInfo.size,
      type: fileInfo.type,
      uploadTime: fileInfo.uploadTime,
      uploader: fileInfo.uploader,
      sizeFormatted: formatFileSize(fileInfo.size)
    });

    console.log(`文件上传成功: ${fileInfo.name} (${formatFileSize(fileInfo.size)})`);
    res.json({ success: true, fileId: fileId });
  } catch (error) {
    console.error('文件上传错误:', error);
    res.status(500).json({ error: '文件上传失败' });
  }
});

// 文件下载接口
app.get('/download/:fileId', (req, res) => {
  try {
    const fileId = req.params.fileId;
    const fileInfo = memoryStore.files.get(fileId);

    if (!fileInfo) {
      return res.status(404).json({ error: '文件不存在' });
    }

    res.setHeader('Content-Type', fileInfo.type);
    res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.name}"`);
    res.setHeader('Content-Length', fileInfo.size);
    res.send(fileInfo.data);

    console.log(`文件下载: ${fileInfo.name}`);
  } catch (error) {
    console.error('文件下载错误:', error);
    res.status(500).json({ error: '文件下载失败' });
  }
});

// 获取文件列表
app.get('/files', (req, res) => {
  try {
    const files = Array.from(memoryStore.files.values()).map(file => ({
      id: file.id,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadTime: file.uploadTime,
      uploader: file.uploader,
      sizeFormatted: formatFileSize(file.size)
    }));

    res.json(files);
  } catch (error) {
    console.error('获取文件列表错误:', error);
    res.status(500).json({ error: '获取文件列表失败' });
  }
});

// 获取聊天消息
app.get('/messages', (req, res) => {
  try {
    res.json(memoryStore.messages);
  } catch (error) {
    console.error('获取消息列表错误:', error);
    res.status(500).json({ error: '获取消息列表失败' });
  }
});

// 获取服务器信息
app.get('/api/server-info', (req, res) => {
  try {
    res.json({
      ip: getLocalIP(),
      port: PORT,
      status: 'running',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      filesCount: memoryStore.files.size,
      messagesCount: memoryStore.messages.length,
      usersCount: memoryStore.users.size
    });
  } catch (error) {
    console.error('获取服务器信息错误:', error);
    res.status(500).json({ error: '获取服务器信息失败' });
  }
});

// WebSocket连接处理
io.on('connection', (socket) => {
  console.log(`用户连接: ${socket.id}`);

  // 用户加入
  socket.on('userJoin', (userData) => {
    const user = {
      id: socket.id,
      name: userData.name || '匿名用户',
      joinTime: new Date().toISOString()
    };
    
    memoryStore.users.set(socket.id, user);
    
    // 广播用户加入消息
    socket.broadcast.emit('userJoined', user);
    
    // 发送当前在线用户列表
    socket.emit('userList', Array.from(memoryStore.users.values()));
    
    console.log(`用户加入: ${user.name}`);
  });

  // 发送聊天消息
  socket.on('sendMessage', (messageData) => {
    const message = {
      id: generateId(),
      user: memoryStore.users.get(socket.id)?.name || '匿名用户',
      content: messageData.content,
      timestamp: new Date().toISOString(),
      type: 'text'
    };

    // 存储消息
    memoryStore.messages.push(message);
    
    // 限制消息数量，避免内存溢出
    if (memoryStore.messages.length > 1000) {
      memoryStore.messages = memoryStore.messages.slice(-500);
    }

    // 广播消息给所有客户端
    io.emit('newMessage', message);
    
    console.log(`消息: ${message.user}: ${message.content}`);
  });

  // 用户断开连接
  socket.on('disconnect', () => {
    const user = memoryStore.users.get(socket.id);
    if (user) {
      memoryStore.users.delete(socket.id);
      socket.broadcast.emit('userLeft', user);
      console.log(`用户离开: ${user.name}`);
    }
  });

  // 发送当前状态
  socket.emit('serverStatus', {
    filesCount: memoryStore.files.size,
    messagesCount: memoryStore.messages.length,
    usersCount: memoryStore.users.size
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
const HOST = getLocalIP();
const allIPs = getAllLocalIPs();

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 局域网文件和信息共享系统已启动!');
  console.log('=====================================');
  console.log(`📱 本机访问: http://localhost:${PORT}`);
  console.log('🌐 局域网访问地址:');
  if (allIPs.length > 0) {
    allIPs.forEach((ip, index) => {
      console.log(`   ${index + 1}. http://${ip.address}:${PORT} (${ip.interface})`);
    });
  } else {
    console.log(`   http://${HOST}:${PORT}`);
  }
  console.log('=====================================');
  console.log('💡 提示: 在局域网内其他设备上使用上述IP地址访问');
  console.log('   ⚠️  如果无法访问，请尝试其他IP地址');
  console.log('📁 功能: 文件共享 + 实时聊天');
  console.log('⚡ 特点: 无需存储，内存实时传输');
  console.log('=====================================\n');
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});
