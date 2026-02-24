# Installation and Usage Instructions

[中文说明](INSTALL_zh.md)

## Quick Start

### Windows Users

1. Double-click the `start.bat` file to run.
2. Wait for dependencies to be installed.
3. After the server starts, access the displayed address in your browser.

### Linux/Mac Users

1. Run in the terminal:

   ```bash
   chmod +x start.sh
   ./start.sh
   ```

2. Wait for dependencies to be installed.
3. After the server starts, access the displayed address in your browser.

### Manual Installation

1. Ensure Node.js (version 14.0 or higher) is installed.
2. Run in the project directory:

   ```bash
   npm install
   npm start
   ```

## System Requirements

- Node.js 14.0 or higher
- Modern browser support (Chrome, Firefox, Safari, Edge)
- LAN network connection

## Feature Description

### File Sharing

- Supports drag-and-drop file uploads
- Supports all file types
- File size limit: 500MB
- Real-time file list display
- One-click file download

### Real-time Chat

- Supports multiple users online simultaneously
- Real-time message transmission
- Displays online user count
- Message history

### LAN Access

- Automatically retrieves local IP address
- Supports mobile devices such as phones and tablets
- No extra configuration needed

## Notes

- All data is stored in memory only and will disappear after the server restarts.
- Suitable for temporary file sharing and team collaboration.
- Please ensure usage in a secure LAN environment.
- It is recommended to restart the server periodically to clear memory.

## Troubleshooting

### Server Fails to Start

- Check if Node.js is correctly installed.
- Check if port 3000 is occupied.
- Try using another port: `PORT=3001 npm start`

### Cannot Access Webpage

- Check firewall settings.
- Confirm if the IP address is correct.
- Try accessing via localhost.

### File Upload Failed

- Check if file size exceeds 500MB.
- Check network connection.
- Refresh the page and try again.

## Technical Support

If you encounter problems, please check:

1. If Node.js version meets the requirements.
2. If the network connection is normal.
3. If the firewall is blocking the connection.
4. If the port is occupied by other programs.
