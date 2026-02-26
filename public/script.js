/**
 * LAN File and Message Sharing System - Frontend Logic
 * Handles file upload, download, real-time chat, etc.
 */

class ShareApp {
    constructor() {
        this.socket = null;
        this.userName = '';
        this.isConnected = false;
        this.files = new Map();
        this.messages = [];
        this.users = new Map();
        this.isMobile = this.detectMobile();
        
        this.init();
    }

    // Detect mobile device
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               (window.innerWidth <= 768);
    }

    // Initialize application
    init() {
        this.setupEventListeners();
        this.connectToServer();
        this.loadUserData();
        this.setupMobileOptimizations();
    }

    // Setup event listeners
    setupEventListeners() {
        // File upload related
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const refreshBtn = document.getElementById('refreshFiles');

        // Drag and drop upload
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

        // Click to upload
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            this.uploadFiles(e.target.files);
        });

        // Refresh file list
        refreshBtn.addEventListener('click', () => {
            this.loadFiles();
        });

        // Chat related
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const userNameInput = document.getElementById('userName');
        const copyAllBtn = document.getElementById('copyAllMessages');

        // Send message
        sendButton.addEventListener('click', () => {
            this.sendMessage();
        });

        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto resize textarea
        messageInput.addEventListener('input', () => {
            this.autoResizeTextarea(messageInput);
        });

        // Copy all messages
        copyAllBtn.addEventListener('click', () => {
            this.copyAllMessages();
        });

        // Username input
        userNameInput.addEventListener('change', (e) => {
            this.userName = e.target.value.trim() || 'Anonymous User';
            this.saveUserData();
            if (this.isConnected) {
                this.socket.emit('userJoin', { name: this.userName });
            }
        });

        // Save data before window unload
        window.addEventListener('beforeunload', () => {
            this.saveUserData();
        });
    }

    // Connect to server
    connectToServer() {
        this.showLoading(true);
        
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.isConnected = true;
            this.showLoading(false);
            this.showNotification('Connected to server', 'success');
            
            // Send user info
            if (this.userName) {
                this.socket.emit('userJoin', { name: this.userName });
            }
            
            // Load initial data
            this.loadFiles();
            this.loadMessages();
            this.loadServerInfo();
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.isConnected = false;
            this.showNotification('Disconnected from server', 'error');
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.showLoading(false);
            this.showNotification('Failed to connect to server', 'error');
        });

        // File related events
        this.socket.on('fileUploaded', (fileData) => {
            this.addFileToList(fileData);
            this.showNotification(`File "${fileData.name}" uploaded successfully`, 'success');
            // Update count immediately
            const fileCountEl = document.getElementById('fileCount');
            if (fileCountEl) fileCountEl.textContent = this.files.size;
        });

        // Message related events
        this.socket.on('newMessage', (message) => {
            this.addMessageToList(message);
            // Update count immediately
            const msgCountEl = document.getElementById('messageCount');
            if (msgCountEl) msgCountEl.textContent = this.messages.length;
        });

        this.socket.on('userJoined', (user) => {
            this.showNotification(`${user.name} joined the chat`, 'info');
        });

        this.socket.on('userLeft', (user) => {
            this.showNotification(`${user.name} left the chat`, 'info');
        });

        this.socket.on('userList', (userList) => {
            this.updateUserList(userList);
        });

        // Server status update
        this.socket.on('serverStatus', (status) => {
            this.updateStatus(status);
        });
    }

    // Upload files
    async uploadFiles(files) {
        if (!files || files.length === 0) return;

        for (const file of files) {
            if (file.size > 500 * 1024 * 1024) {
                this.showNotification(`File "${file.name}" exceeds 500MB limit`, 'error');
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
                    console.log(`File upload successful: ${file.name}`);
                } else {
                    this.showNotification(`File "${file.name}" upload failed`, 'error');
                }
            } catch (error) {
                console.error('File upload error:', error);
                this.showNotification(`File "${file.name}" upload failed`, 'error');
            }
        }
    }

    // Download file
    downloadFile(fileId, fileName) {
        const link = document.createElement('a');
        link.href = `/download/${fileId}`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showNotification(`Starting download "${fileName}"`, 'success');
    }

    // Load file list
    async loadFiles() {
        try {
            const response = await fetch('/files');
            const files = await response.json();
            
            const fileList = document.getElementById('fileList');
            fileList.innerHTML = '';

            // Update file count from server response
            const fileCountEl = document.getElementById('fileCount');
            if (fileCountEl) fileCountEl.textContent = files.length;

            if (files.length === 0) {
                fileList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-folder-open"></i>
                        <p>No shared files yet</p>
                    </div>
                `;
                return;
            }

            files.forEach(file => {
                this.addFileToList(file);
            });
        } catch (error) {
            console.error('Load file list error:', error);
            this.showNotification('Failed to load file list', 'error');
        }
    }

    // Add file to list
    addFileToList(fileData) {
        const fileList = document.getElementById('fileList');
        
        // Remove empty state
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
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
        `;

        fileList.appendChild(fileItem);
        this.files.set(fileData.id, fileData);
    }

    // Get file type icon
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

    // Get file type CSS class
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

    // Auto resize textarea
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 120); // Max height 120px
        textarea.style.height = newHeight + 'px';
    }

    // Setup mobile optimizations
    setupMobileOptimizations() {
        if (!this.isMobile) return;

        // Prevent double tap zoom
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);

        // Optimize file upload experience
        this.optimizeFileUpload();
        
        // Optimize keyboard layout
        this.optimizeKeyboardLayout();
        
        // Add touch feedback
        this.addTouchFeedback();
    }

    // Optimize file upload experience
    optimizeFileUpload() {
        const fileInput = document.getElementById('fileInput');
        
        // Mobile file selection optimization
        if (fileInput) {
            fileInput.setAttribute('accept', '*/*');
            fileInput.setAttribute('capture', 'environment'); // Allow camera capture
        }

        // Add upload progress hint
        const originalUploadFiles = this.uploadFiles.bind(this);
        this.uploadFiles = (files) => {
            if (files.length > 0) {
                this.showNotification(`Starting upload of ${files.length} files...`, 'info');
            }
            originalUploadFiles(files);
        };
    }

    // Optimize keyboard layout
    optimizeKeyboardLayout() {
        const messageInput = document.getElementById('messageInput');
        if (!messageInput) return;

        let initialViewportHeight = window.innerHeight;
        
        // Listen for viewport height changes (keyboard show/hide)
        const handleResize = () => {
            const currentHeight = window.innerHeight;
            const heightDiff = initialViewportHeight - currentHeight;
            
            if (heightDiff > 150) { // Keyboard shown
                document.body.classList.add('keyboard-open');
                // Scroll to input
                setTimeout(() => {
                    messageInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            } else { // Keyboard hidden
                document.body.classList.remove('keyboard-open');
            }
        };

        window.addEventListener('resize', handleResize);
        
        // Optimize when input gets focus
        messageInput.addEventListener('focus', () => {
            setTimeout(() => {
                messageInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });
    }

    // Add touch feedback
    addTouchFeedback() {
        // Add touch feedback for buttons
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(btn => {
            btn.addEventListener('touchstart', (e) => {
                btn.style.transform = 'scale(0.95)';
            });
            
            btn.addEventListener('touchend', (e) => {
                setTimeout(() => {
                    btn.style.transform = '';
                }, 150);
            });
        });

        // Add touch feedback for file items
        document.addEventListener('touchstart', (e) => {
            const fileItem = e.target.closest('.file-item');
            if (fileItem) {
                fileItem.style.transform = 'scale(0.98)';
            }
        });

        document.addEventListener('touchend', (e) => {
            const fileItem = e.target.closest('.file-item');
            if (fileItem) {
                setTimeout(() => {
                    fileItem.style.transform = '';
                }, 150);
            }
        });
    }

    // Send message
    sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const content = messageInput.value.trim();
        
        if (!content) return;
        if (!this.userName) {
            this.showNotification('Please enter a nickname first', 'error');
            return;
        }

        this.socket.emit('sendMessage', { content });
        messageInput.value = '';
        // Reset textarea height
        this.autoResizeTextarea(messageInput);
    }

    // Copy single message
    copyMessage(messageId) {
        const message = this.messages.find(m => (m.id || m.timestamp) == messageId);
        if (!message) {
            this.showNotification('Message not found', 'error');
            return;
        }

        const messageText = `${message.content}`;
        
        this.copyToClipboard(messageText).then(() => {
            this.showNotification('Message copied to clipboard', 'success');
        }).catch(() => {
            this.showNotification('Copy failed, please copy manually', 'error');
        });
    }

    // Copy all messages
    copyAllMessages() {
        if (this.messages.length === 0) {
            this.showNotification('No messages to copy', 'info');
            return;
        }

        const allMessages = this.messages.map(message => 
            `[${this.formatTime(message.timestamp)}] ${message.user}: ${message.content}`
        ).join('\n');

        this.copyToClipboard(allMessages).then(() => {
            this.showNotification(`Copied ${this.messages.length} messages to clipboard`, 'success');
        }).catch(() => {
            this.showNotification('Copy failed, please copy manually', 'error');
        });
    }

    // Copy to clipboard
    async copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            // Use modern Clipboard API
            await navigator.clipboard.writeText(text);
        } else {
            // Fallback to traditional method
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

    // Add message to list
    addMessageToList(message) {
        const messagesContainer = document.getElementById('messagesContainer');
        
        // Remove welcome message
        const welcomeMessage = messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        
        const isOwn = message.user === this.userName;
        const normalizedContent = this.normalizeMessageText(message.content);
        messageElement.innerHTML = `
            <div class="message-content ${isOwn ? 'own' : ''}">
                ${this.escapeHtml(normalizedContent)}
            </div>
            <div class="message-info ${isOwn ? 'own' : ''}">
                <span><i class="fas fa-user"></i> ${this.escapeHtml(message.user)}</span>
                <span><i class="fas fa-clock"></i> ${this.formatTime(message.timestamp)}</span>
                <button class="copy-btn" onclick="app.copyMessage('${message.id || Date.now()}')" title="Copy Message">
                    <i class="fas fa-copy"></i>
                </button>
            </div>
        `;

        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        this.messages.push(message);
    }

    // Load message list
    async loadMessages() {
        try {
            const response = await fetch('/messages');
            const messages = await response.json();
            
            const messagesContainer = document.getElementById('messagesContainer');
            messagesContainer.innerHTML = '';

            // Update message count from server response
            const msgCountEl = document.getElementById('messageCount');
            if (msgCountEl) msgCountEl.textContent = messages.length;

            if (messages.length === 0) {
                messagesContainer.innerHTML = `
                    <div class="welcome-message">
                        <i class="fas fa-comment-dots"></i>
                        <p>Welcome to LAN Share!</p>
                        <p>Start chatting or sharing files now~</p>
                    </div>
                `;
                return;
            }

            messages.forEach(message => {
                this.addMessageToList(message);
            });
        } catch (error) {
            console.error('Load message list error:', error);
        }
    }

    // Load server info
    async loadServerInfo() {
        try {
            const response = await fetch('/api/server-info');
            const info = await response.json();
            
            const serverIP = document.getElementById('serverIP');
            if (serverIP) {
                serverIP.textContent = `${info.ip}:${info.port}`;
            }
        } catch (error) {
            console.error('Load server info error:', error);
        }
    }

    // Update user list
    updateUserList(userList) {
        this.users.clear();
        userList.forEach(user => {
            this.users.set(user.id, user);
        });
        // Update online user count
        const userCountEl = document.getElementById('userCount');
        if (userCountEl) userCountEl.textContent = this.users.size;
    }

    // Update status info
    updateStatus(status) {
        document.getElementById('fileCount').textContent = status.filesCount;
        document.getElementById('messageCount').textContent = status.messagesCount;
        document.getElementById('userCount').textContent = status.usersCount;
    }

    // Show loading state
    showLoading(show) {
        const loading = document.getElementById('loading');
        loading.style.display = show ? 'flex' : 'none';
    }

    // Show notification
    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notificationText');
        const notificationIcon = notification.querySelector('i');
        
        notificationText.textContent = message;
        
        // Set icon based on type
        notificationIcon.className = '';
        if (type === 'success') {
            notificationIcon.className = 'fas fa-check-circle';
            notification.style.background = '#48bb78';
        } else if (type === 'error') {
            notificationIcon.className = 'fas fa-times-circle';
            notification.style.background = '#f56565';
        } else if (type === 'info') {
            notificationIcon.className = 'fas fa-info-circle';
            notification.style.background = '#4299e1';
        }
        
        notification.classList.add('show');
        
        // Hide after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // Format time
    formatTime(isoString) {
        const date = new Date(isoString);
        return date.toLocaleTimeString();
    }

    // Save user data to local storage
    saveUserData() {
        localStorage.setItem('lan_share_username', this.userName);
    }

    // Load user data from local storage
    loadUserData() {
        const savedName = localStorage.getItem('lan_share_username');
        if (savedName) {
            this.userName = savedName;
            const userNameInput = document.getElementById('userName');
            if (userNameInput) {
                userNameInput.value = savedName;
            }
        }
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    normalizeMessageText(text) {
        if (!text) return '';
        return text.replace(/^[\s\r\n]+/, '').replace(/[\s\r\n]+$/, '');
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ShareApp();
});
