/**
 * LAN File and Message Sharing System - Server Side
 * Real-time communication based on Express + Socket.IO
 * No data storage, all information is transmitted in memory in real-time
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const cors = require('cors');
const os = require('os');
const path = require('path');
const fs = require('fs');

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware configuration
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Memory storage (no persistence)
const memoryStore = {
  files: new Map(), // Store file data
  messages: [], // Store chat messages
  users: new Map() // Store online users
};

// Broadcast current status to all clients
function broadcastStatus() {
  io.emit('serverStatus', {
    filesCount: memoryStore.files.size,
    messagesCount: memoryStore.messages.length,
    usersCount: memoryStore.users.size
  });
}

// Configure multer for file uploads (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // Limit file size to 500MB
  }
});

// Get all available IP addresses
function getAllLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        // Exclude common virtual network addresses
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

// Get local IP address (prioritize the first one)
function getLocalIP() {
  const ips = getAllLocalIPs();
  return ips.length > 0 ? ips[0].address : 'localhost';
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileId = generateId();
    const fileInfo = {
      id: fileId,
      name: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype,
      data: req.file.buffer,
      uploadTime: new Date().toISOString(),
      uploader: req.body.uploader || 'Anonymous User'
    };

    // Store in memory
    memoryStore.files.set(fileId, fileInfo);

    // Broadcast file info to all clients
    io.emit('fileUploaded', {
      id: fileId,
      name: fileInfo.name,
      size: fileInfo.size,
      type: fileInfo.type,
      uploadTime: fileInfo.uploadTime,
      uploader: fileInfo.uploader,
      sizeFormatted: formatFileSize(fileInfo.size)
    });

    // Update status
    broadcastStatus();

    console.log(`File upload successful: ${fileInfo.name} (${formatFileSize(fileInfo.size)})`);
    res.json({ success: true, fileId: fileId });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// File download endpoint
app.get('/download/:fileId', (req, res) => {
  try {
    const fileId = req.params.fileId;
    const fileInfo = memoryStore.files.get(fileId);

    if (!fileInfo) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.setHeader('Content-Type', fileInfo.type);
    res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.name}"`);
    res.setHeader('Content-Length', fileInfo.size);
    res.send(fileInfo.data);

    console.log(`File download: ${fileInfo.name}`);
  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({ error: 'File download failed' });
  }
});

// Get file list
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
    console.error('Get file list error:', error);
    res.status(500).json({ error: 'Failed to get file list' });
  }
});

// Get chat messages
app.get('/messages', (req, res) => {
  try {
    res.json(memoryStore.messages);
  } catch (error) {
    console.error('Get message list error:', error);
    res.status(500).json({ error: 'Failed to get message list' });
  }
});

// Get server info
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
    console.error('Get server info error:', error);
    res.status(500).json({ error: 'Failed to get server info' });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Register anonymous user on connect to ensure accurate online count
  const anonUser = {
    id: socket.id,
    name: 'Anonymous User',
    joinTime: new Date().toISOString()
  };
  memoryStore.users.set(socket.id, anonUser);
  io.emit('userList', Array.from(memoryStore.users.values()));
  broadcastStatus();

  // User join
  socket.on('userJoin', (userData) => {
    const safeName = userData.name || 'Anonymous User';
    const existing = memoryStore.users.get(socket.id) || { id: socket.id, joinTime: new Date().toISOString() };
    const user = { ...existing, name: safeName };
    memoryStore.users.set(socket.id, user);

    // Broadcast user joined message (only if name is not anonymous or changed)
    socket.broadcast.emit('userJoined', user);

    // Send updated online user list and status to all clients
    io.emit('userList', Array.from(memoryStore.users.values()));
    broadcastStatus();

    console.log(`User joined: ${user.name}`);
  });

  // Send chat message
  socket.on('sendMessage', (messageData) => {
    const message = {
      id: generateId(),
      user: memoryStore.users.get(socket.id)?.name || 'Anonymous User',
      content: messageData.content,
      timestamp: new Date().toISOString(),
      type: 'text'
    };

    // Store message
    memoryStore.messages.push(message);
    
    // Limit message count to avoid memory overflow
    if (memoryStore.messages.length > 1000) {
      memoryStore.messages = memoryStore.messages.slice(-500);
    }

    // Broadcast message to all clients
    io.emit('newMessage', message);
    
    // Update status
    broadcastStatus();
    
    console.log(`Message: ${message.user}: ${message.content}`);
  });

  // User disconnect
  socket.on('disconnect', () => {
    const user = memoryStore.users.get(socket.id);
    if (user) {
      memoryStore.users.delete(socket.id);
      // Notify others user left
      socket.broadcast.emit('userLeft', user);
      // Broadcast updated user list and status
      io.emit('userList', Array.from(memoryStore.users.values()));
      broadcastStatus();
      console.log(`User left: ${user.name}`);
    }
  });

  // Send current status
  socket.emit('serverStatus', {
    filesCount: memoryStore.files.size,
    messagesCount: memoryStore.messages.length,
    usersCount: memoryStore.users.size
  });
});

// Start server
const BASE_PORT = process.env.PORT || 3000;
const HOST = getLocalIP();
const allIPs = getAllLocalIPs();

function startServer(port) {
  server.listen(port, '0.0.0.0')
    .once('listening', () => {
      console.log('\n🚀 LAN File and Message Sharing System Started!');
      console.log('=====================================');
      console.log(`📱 Local Access: http://localhost:${port}`);
      console.log('🌐 LAN Access Addresses:');
      if (allIPs.length > 0) {
        allIPs.forEach((ip, index) => {
          console.log(`   ${index + 1}. http://${ip.address}:${port} (${ip.interface})`);
        });
      } else {
        console.log(`   http://${HOST}:${port}`);
      }
      console.log('=====================================');
      console.log('💡 Tip: Use the above IP addresses to access from other devices in the LAN');
      console.log('   ⚠️  If unable to access, please try other IP addresses');
      console.log('📁 Features: File Sharing + Real-time Chat');
      console.log('⚡ Features: No Storage, Memory Real-time Transmission');
      console.log('=====================================\n');
    })
    .once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`⚠️  Port ${port} is in use, trying ${port + 1}...`);
        server.close();
        startServer(port + 1);
      } else {
        throw err;
      }
    });
}

startServer(Number(BASE_PORT));

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nClosing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
});
