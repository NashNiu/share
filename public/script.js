/**
 * 局域网文件和信息共享系统 - 前端逻辑
 * 处理文件上传、下载、实时聊天等功能
 */

class ShareApp {
    constructor() {
        this.socket = null;
        this.userName = '';
        this.isConnected = false;
        this.files = new Map();
        this.messages = [];
        this.users = new Map();
        
        this.init();
    }

    // 初始化应用
    init() {
        this.setupEventListeners();
        this.connectToServer();
        this.loadUserData();
    }

    // 设置事件监听器
    setupEventListeners() {
        // 文件上传相关
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const refreshBtn = document.getElementById('refreshFiles');

        // 拖拽上传
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            this.uploadFiles(files);
        });

        // 点击上传
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            this.uploadFiles(e.target.files);
        });

        // 刷新文件列表
        refreshBtn.addEventListener('click', () => {
            this.loadFiles();
        });

        // 聊天相关
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const userNameInput = document.getElementById('userName');
        const copyAllBtn = document.getElementById('copyAllMessages');

        // 发送消息
        sendButton.addEventListener('click', () => {
            this.sendMessage();
        });

        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // 自动调整textarea高度
        messageInput.addEventListener('input', () => {
            this.autoResizeTextarea(messageInput);
        });

        // 复制所有消息
        copyAllBtn.addEventListener('click', () => {
            this.copyAllMessages();
        });

        // 用户名输入
        userNameInput.addEventListener('change', (e) => {
            this.userName = e.target.value.trim() || '匿名用户';
            this.saveUserData();
            if (this.isConnected) {
                this.socket.emit('userJoin', { name: this.userName });
            }
        });

        // 窗口关闭前保存数据
        window.addEventListener('beforeunload', () => {
            this.saveUserData();
        });
    }

    // 连接服务器
    connectToServer() {
        this.showLoading(true);
        
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('已连接到服务器');
            this.isConnected = true;
            this.showLoading(false);
            this.showNotification('已连接到服务器', 'success');
            
            // 发送用户信息
            if (this.userName) {
                this.socket.emit('userJoin', { name: this.userName });
            }
            
            // 加载初始数据
            this.loadFiles();
            this.loadMessages();
        });

        this.socket.on('disconnect', () => {
            console.log('与服务器断开连接');
            this.isConnected = false;
            this.showNotification('与服务器断开连接', 'error');
        });

        this.socket.on('connect_error', (error) => {
            console.error('连接错误:', error);
            this.showLoading(false);
            this.showNotification('连接服务器失败', 'error');
        });

        // 文件相关事件
        this.socket.on('fileUploaded', (fileData) => {
            this.addFileToList(fileData);
            this.showNotification(`文件 "${fileData.name}" 上传成功`, 'success');
        });

        // 消息相关事件
        this.socket.on('newMessage', (message) => {
            this.addMessageToList(message);
        });

        this.socket.on('userJoined', (user) => {
            this.showNotification(`${user.name} 加入了聊天`, 'info');
        });

        this.socket.on('userLeft', (user) => {
            this.showNotification(`${user.name} 离开了聊天`, 'info');
        });

        this.socket.on('userList', (userList) => {
            this.updateUserList(userList);
        });

        // 服务器状态更新
        this.socket.on('serverStatus', (status) => {
            this.updateStatus(status);
        });
    }

    // 上传文件
    async uploadFiles(files) {
        if (!files || files.length === 0) return;

        for (const file of files) {
            if (file.size > 500 * 1024 * 1024) {
                this.showNotification(`文件 "${file.name}" 超过500MB限制`, 'error');
                continue;
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('uploader', this.userName);

            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();
                if (result.success) {
                    console.log(`文件上传成功: ${file.name}`);
                } else {
                    this.showNotification(`文件 "${file.name}" 上传失败`, 'error');
                }
            } catch (error) {
                console.error('文件上传错误:', error);
                this.showNotification(`文件 "${file.name}" 上传失败`, 'error');
            }
        }
    }

    // 下载文件
    downloadFile(fileId, fileName) {
        const link = document.createElement('a');
        link.href = `/download/${fileId}`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showNotification(`开始下载 "${fileName}"`, 'success');
    }

    // 加载文件列表
    async loadFiles() {
        try {
            const response = await fetch('/files');
            const files = await response.json();
            
            const fileList = document.getElementById('fileList');
            fileList.innerHTML = '';

            if (files.length === 0) {
                fileList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-folder-open"></i>
                        <p>暂无共享文件</p>
                    </div>
                `;
                return;
            }

            files.forEach(file => {
                this.addFileToList(file);
            });
        } catch (error) {
            console.error('加载文件列表错误:', error);
            this.showNotification('加载文件列表失败', 'error');
        }
    }

    // 添加文件到列表
    addFileToList(fileData) {
        const fileList = document.getElementById('fileList');
        
        // 移除空状态
        const emptyState = fileList.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }

        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-icon ${this.getFileTypeClass(fileData.type)}">
                <i class="fas ${this.getFileIcon(fileData.type)}"></i>
            </div>
            <div class="file-info">
                <div class="file-name" title="${fileData.name}">${fileData.name}</div>
                <div class="file-meta">
                    <span><i class="fas fa-user"></i> ${fileData.uploader}</span>
                    <span><i class="fas fa-weight-hanging"></i> ${fileData.sizeFormatted}</span>
                    <span><i class="fas fa-clock"></i> ${this.formatTime(fileData.uploadTime)}</span>
                </div>
            </div>
            <div class="file-actions">
                <button class="btn btn-primary btn-small" onclick="app.downloadFile('${fileData.id}', '${fileData.name}')">
                    <i class="fas fa-download"></i> 下载
                </button>
            </div>
        `;

        fileList.appendChild(fileItem);
        this.files.set(fileData.id, fileData);
    }

    // 获取文件类型图标
    getFileIcon(mimeType) {
        if (mimeType.startsWith('image/')) return 'fa-image';
        if (mimeType.startsWith('video/')) return 'fa-video';
        if (mimeType.startsWith('audio/')) return 'fa-music';
        if (mimeType.includes('pdf')) return 'fa-file-pdf';
        if (mimeType.includes('word')) return 'fa-file-word';
        if (mimeType.includes('excel')) return 'fa-file-excel';
        if (mimeType.includes('powerpoint')) return 'fa-file-powerpoint';
        if (mimeType.includes('zip') || mimeType.includes('rar')) return 'fa-file-archive';
        if (mimeType.includes('text/') || mimeType.includes('javascript') || mimeType.includes('json')) return 'fa-file-code';
        return 'fa-file';
    }

    // 获取文件类型CSS类
    getFileTypeClass(mimeType) {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        if (mimeType.includes('pdf')) return 'pdf';
        if (mimeType.includes('word') || mimeType.includes('excel') || mimeType.includes('powerpoint')) return 'document';
        if (mimeType.includes('zip') || mimeType.includes('rar')) return 'archive';
        if (mimeType.includes('text/') || mimeType.includes('javascript') || mimeType.includes('json')) return 'code';
        return 'default';
    }

    // 自动调整textarea高度
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 120); // 最大高度120px
        textarea.style.height = newHeight + 'px';
    }

    // 发送消息
    sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const content = messageInput.value.trim();
        
        if (!content) return;
        if (!this.userName) {
            this.showNotification('请先输入昵称', 'error');
            return;
        }

        this.socket.emit('sendMessage', { content });
        messageInput.value = '';
        // 重置textarea高度
        this.autoResizeTextarea(messageInput);
    }

    // 复制单条消息
    copyMessage(messageId) {
        const message = this.messages.find(m => (m.id || m.timestamp) == messageId);
        if (!message) {
            this.showNotification('消息不存在', 'error');
            return;
        }

        const messageText = `${message.content}`;
        
        this.copyToClipboard(messageText).then(() => {
            this.showNotification('消息已复制到剪贴板', 'success');
        }).catch(() => {
            this.showNotification('复制失败，请手动复制', 'error');
        });
    }

    // 复制所有消息
    copyAllMessages() {
        if (this.messages.length === 0) {
            this.showNotification('没有消息可复制', 'info');
            return;
        }

        const allMessages = this.messages.map(message => 
            `[${this.formatTime(message.timestamp)}] ${message.user}: ${message.content}`
        ).join('\n');

        this.copyToClipboard(allMessages).then(() => {
            this.showNotification(`已复制 ${this.messages.length} 条消息到剪贴板`, 'success');
        }).catch(() => {
            this.showNotification('复制失败，请手动复制', 'error');
        });
    }

    // 复制到剪贴板
    async copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            // 使用现代 Clipboard API
            await navigator.clipboard.writeText(text);
        } else {
            // 降级到传统方法
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            return new Promise((resolve, reject) => {
                if (document.execCommand('copy')) {
                    resolve();
                } else {
                    reject();
                }
                document.body.removeChild(textArea);
            });
        }
    }

    // 添加消息到列表
    addMessageToList(message) {
        const messagesContainer = document.getElementById('messagesContainer');
        
        // 移除欢迎消息
        const welcomeMessage = messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        
        const isOwn = message.user === this.userName;
        messageElement.innerHTML = `
            <div class="message-content ${isOwn ? 'own' : ''}">
                ${this.escapeHtml(message.content)}
            </div>
            <div class="message-info ${isOwn ? 'own' : ''}">
                <span><i class="fas fa-user"></i> ${this.escapeHtml(message.user)}</span>
                <span><i class="fas fa-clock"></i> ${this.formatTime(message.timestamp)}</span>
                <button class="copy-btn" onclick="app.copyMessage('${message.id || Date.now()}')" title="复制消息">
                    <i class="fas fa-copy"></i>
                </button>
            </div>
        `;

        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        this.messages.push(message);
    }

    // 加载消息列表
    async loadMessages() {
        try {
            const response = await fetch('/messages');
            const messages = await response.json();
            
            const messagesContainer = document.getElementById('messagesContainer');
            messagesContainer.innerHTML = '';

            if (messages.length === 0) {
                messagesContainer.innerHTML = `
                    <div class="welcome-message">
                        <i class="fas fa-comment-dots"></i>
                        <p>欢迎使用局域网共享系统！</p>
                        <p>开始聊天或分享文件吧~</p>
                    </div>
                `;
                return;
            }

            messages.forEach(message => {
                this.addMessageToList(message);
            });
        } catch (error) {
            console.error('加载消息列表错误:', error);
        }
    }

    // 更新用户列表
    updateUserList(userList) {
        this.users.clear();
        userList.forEach(user => {
            this.users.set(user.id, user);
        });
    }

    // 更新状态信息
    updateStatus(status) {
        document.getElementById('fileCount').textContent = status.filesCount;
        document.getElementById('messageCount').textContent = status.messagesCount;
        document.getElementById('userCount').textContent = status.usersCount;
    }

    // 显示加载状态
    showLoading(show) {
        const loading = document.getElementById('loading');
        loading.style.display = show ? 'flex' : 'none';
    }

    // 显示通知
    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notificationText');
        
        notificationText.textContent = message;
        notification.className = `notification show ${type}`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // 格式化时间
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) { // 1分钟内
            return '刚刚';
        } else if (diff < 3600000) { // 1小时内
            return `${Math.floor(diff / 60000)}分钟前`;
        } else if (diff < 86400000) { // 1天内
            return `${Math.floor(diff / 3600000)}小时前`;
        } else {
            return date.toLocaleDateString();
        }
    }

    // HTML转义并保留换行格式
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML.replace(/\n/g, '<br>');
    }

    // 保存用户数据
    saveUserData() {
        localStorage.setItem('shareApp_userName', this.userName);
    }

    // 加载用户数据
    loadUserData() {
        this.userName = localStorage.getItem('shareApp_userName') || '';
        if (this.userName) {
            document.getElementById('userName').value = this.userName;
        }
    }
}

// 获取服务器IP地址
async function getServerIP() {
    try {
        const response = await fetch('/api/server-info');
        const data = await response.json();
        document.getElementById('serverIP').textContent = data.ip;
    } catch (error) {
        // 如果API不存在，尝试从当前URL获取
        const host = window.location.hostname;
        const port = window.location.port;
        document.getElementById('serverIP').textContent = `${host}:${port}`;
    }
}

// 初始化应用
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ShareApp();
    getServerIP();
});

// 全局错误处理
window.addEventListener('error', (event) => {
    console.error('全局错误:', event.error);
    if (app) {
        app.showNotification('发生未知错误', 'error');
    }
});

// 网络状态监听
window.addEventListener('online', () => {
    if (app) {
        app.showNotification('网络已连接', 'success');
    }
});

window.addEventListener('offline', () => {
    if (app) {
        app.showNotification('网络已断开', 'error');
    }
});
