const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let logFilePath = null;
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  console.log(msg);
  try {
    if (logFilePath) {
      fs.appendFileSync(logFilePath, line);
    }
  } catch (e) {}
}

// Set up crash and error logging immediately
try {
  const userData = app.getPath('userData');
  fs.mkdirSync(userData, { recursive: true });
  logFilePath = path.join(userData, 'cbt_exam_master_debug.log');
  log('Starting CBT Exam Master 2026 process...');
  log('Platform: ' + process.platform + ' | Arch: ' + process.arch + ' | Node: ' + process.version);
} catch (e) {
  console.error('Failed to init log file:', e);
}

if (process.stdout) process.stdout.on('error', (err) => { if (err.code === 'EPIPE') return; });
if (process.stderr) process.stderr.on('error', (err) => { if (err.code === 'EPIPE') return; });
process.on('uncaughtException', (err) => {
  if (err.code === 'EPIPE' || (err.message && err.message.includes('EPIPE'))) return;
  log('Uncaught Exception: ' + (err.stack || err));
});

let mainWindow = null;
let server = null;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

function startServer() {
  return new Promise((resolve, reject) => {
    const outDir = path.join(__dirname, '..', 'out');
    log('Serving assets from: ' + outDir);

    server = http.createServer((req, res) => {
      try {
        const parsedUrl = new URL(req.url, 'http://127.0.0.1');
        let rawPath = decodeURIComponent(parsedUrl.pathname);
        let pathname = path.normalize(rawPath);
        if (pathname === '/' || pathname === '' || pathname === '.') {
          pathname = '/index.html';
        }

        const normalizedOutDir = path.resolve(outDir);
        let resolvedPath = path.resolve(outDir, '.' + pathname);

        // Security Boundary Enforcement: Path cannot escape outDir
        if (!resolvedPath.startsWith(normalizedOutDir)) {
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          res.end('Access Denied');
          return;
        }

        let filePath = resolvedPath;
        let exists = false;
        try {
          exists = fs.existsSync(filePath);
          if (exists && fs.statSync(filePath).isDirectory()) {
            filePath = path.join(filePath, 'index.html');
            exists = fs.existsSync(filePath);
          }
        } catch (e) {
          exists = false;
        }

        if (!exists) {
          filePath = path.join(outDir, 'index.html');
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        const content = fs.readFileSync(filePath);

        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache',
        });
        res.end(content);
      } catch (err) {
        log('Server handle error on ' + req.url + ': ' + (err.stack || err));
        res.writeHead(500);
        res.end('Internal Server Error: ' + err.message);
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      log('CBT Exam Master internal server running on port: ' + port);
      resolve(port);
    });

    server.on('error', (err) => {
      log('HTTP server error: ' + (err.stack || err));
      reject(err);
    });
  });
}

async function createWindow() {
  try {
    const port = await startServer();

    mainWindow = new BrowserWindow({
      width: 1440,
      height: 900,
      minWidth: 1024,
      minHeight: 700,
      title: 'CBT Exam Master 2026 (Serverless)',
      backgroundColor: '#0f172a',
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      trafficLightPosition: { x: 16, y: 16 },
      show: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
      },
    });

    mainWindow.webContents.on('render-process-gone', (event, details) => {
      log('Renderer process gone: ' + JSON.stringify(details));
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      log(`Failed to load ${validatedURL} [${errorCode}]: ${errorDescription}`);
    });

    mainWindow.loadURL(`http://127.0.0.1:${port}/index.html`);

    ipcMain.on('toggle-fullscreen', () => {
      if (mainWindow) {
        mainWindow.setFullScreen(!mainWindow.isFullScreen());
      }
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  } catch (err) {
    log('createWindow failed: ' + (err.stack || err));
  }
}

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (server) {
    try { server.close(); } catch (e) {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

