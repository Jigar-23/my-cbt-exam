const { app, BrowserWindow, ipcMain, shell } = require('electron');
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

const candidateVaultDirs = [
  process.env.CBT_DATA_DIR,
  '/Users/jigar/Library/CloudStorage/GoogleDrive-pulkit10112@gmail.com/My Drive/CBT_EXAM_MASTER',
  '/Users/jigar/Library/CloudStorage/GoogleDrive-penguin1hehe1234@gmail.com/My Drive/CBT_EXAM_MASTER',
  path.join(__dirname, '..', '..', 'test-serverless', 'data'),
  path.join(__dirname, '..', 'data'),
].filter(Boolean);

function findVaultFile(reqPath) {
  if (!reqPath || typeof reqPath !== 'string') return null;
  let cleanPath = decodeURIComponent(reqPath)
    .replace(/^(\.\/|\/)?(public\/|data\/)?/, '')
    .replace(/^\/+/, '');
  for (const vaultDir of candidateVaultDirs) {
    try {
      const fullPath = path.resolve(vaultDir, cleanPath);
      const normalizedVaultDir = path.resolve(vaultDir);
      if (fullPath.startsWith(normalizedVaultDir) && fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        return fullPath;
      }
    } catch (e) {}
  }
  return null;
}

// Ensure Google Drive FileProvider daemon is awake in background on macOS
if (process.platform === 'darwin') {
  try {
    const { exec } = require('child_process');
    exec('open -g -a "Google Drive"', () => {});
  } catch (_) {}
}

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

        let filePath = resolvedPath;
        let exists = false;
        try {
          if (resolvedPath.startsWith(normalizedOutDir)) {
            exists = fs.existsSync(filePath);
            if (exists && fs.statSync(filePath).isDirectory()) {
              filePath = path.join(filePath, 'index.html');
              exists = fs.existsSync(filePath);
            }
          }
        } catch (e) {
          exists = false;
        }

        // Check CBT Exam Master vault directories if file does not exist in outDir
        if (!exists) {
          const vaultFile = findVaultFile(pathname);
          if (vaultFile) {
            filePath = vaultFile;
            exists = true;
          }
        }

        if (!exists) {
          const reqExt = path.extname(pathname).toLowerCase();
          if (reqExt && reqExt !== '.html') {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return;
          }
          filePath = path.join(outDir, 'index.html');
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[ext] || 'application/octet-stream';

        let content;
        try {
          content = fs.readFileSync(filePath);
        } catch (readErr) {
          if (readErr.code === 'ETIMEDOUT' && process.platform === 'darwin') {
            log('FileProvider timeout reading ' + filePath + ', waking Google Drive...');
            try {
              const { execSync } = require('child_process');
              execSync('open -g -a "Google Drive"');
              content = fs.readFileSync(filePath);
            } catch (retryErr) {
              throw retryErr;
            }
          } else {
            throw readErr;
          }
        }

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

    const preferredPort = 3000;
    function tryListen(p) {
      server.removeAllListeners('error');
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE' && p < 3005) {
          log(`Port ${p} in use, trying port ${p + 1}...`);
          tryListen(p + 1);
        } else {
          log('HTTP server error: ' + (err.stack || err));
          reject(err);
        }
      });

      server.listen(p, '127.0.0.1', () => {
        const port = server.address().port;
        log('CBT Exam Master internal server running on port: ' + port);
        resolve(port);
      });
    }

    tryListen(preferredPort);
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

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      log('Window open requested: ' + url);
      // External links (documentation, console, privacy policy) open in user's default browser
      if (!url.includes('accounts.google.com')) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 540,
          height: 680,
          autoHideMenuBar: true,
          title: 'Sign in with Google',
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        },
      };
    });

    mainWindow.webContents.on('did-create-window', (childWindow) => {
      log('Child OAuth window created');
      childWindow.on('closed', () => {
        log('Child OAuth window closed');
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('oauth-window-closed');
        }
      });
    });

    mainWindow.loadURL(`http://localhost:${port}/index.html`);

    ipcMain.on('toggle-fullscreen', () => {
      if (mainWindow) {
        mainWindow.setFullScreen(!mainWindow.isFullScreen());
      }
    });

    ipcMain.handle('cbt:get-test-paper', async (event, testPath) => {
      try {
        const vaultFile = findVaultFile(testPath);
        if (vaultFile) {
          const raw = fs.readFileSync(vaultFile, 'utf8');
          return JSON.parse(raw);
        }
      } catch (err) {
        log('IPC get-test-paper error for ' + testPath + ': ' + err.message);
      }
      return null;
    });

    ipcMain.handle('cbt:get-device-physical-id', () => {
      try {
        const os = require('os');
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
          for (const iface of interfaces[name]) {
            if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
              return `MAC-${iface.mac.toUpperCase()}`;
            }
          }
        }
        return `MAC-DESKTOP-${(os.hostname() || 'PC').toUpperCase()}`;
      } catch (err) {
        return 'MAC-DESKTOP-UNKNOWN';
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
  app.quit();
});

