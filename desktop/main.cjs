// Electron main process untuk Briefzy Studio (aplikasi desktop Windows).
// Menjalankan server Express yang sudah dibundel (dist-server/server.cjs) di localhost,
// lalu menampilkannya dalam jendela aplikasi. Semua data tetap di komputer pengguna.
const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('node:path');
const net = require('node:net');
const http = require('node:http');
const fs = require('node:fs');

process.env.NODE_ENV = 'production';
process.env.BRIEFZY_DESKTOP = '1';
process.env.BRIEFZY_HOST = '127.0.0.1'; // hanya bisa diakses dari komputer ini

const PRIMARY_PORT = Number(process.env.BRIEFZY_PORT || 3000);
let mainWindow = null;
let baseUrl = '';
let shuttingDown = false;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function portAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', () => resolve(false));
    tester.once('listening', () => tester.close(() => resolve(true)));
    tester.listen(port, '127.0.0.1');
  });
}

async function pickPort(start) {
  for (let i = 0; i < 20; i += 1) {
    const port = start + i;
    // eslint-disable-next-line no-await-in-loop
    if (await portAvailable(port)) return port;
  }
  throw new Error(`Tidak ada port kosong di ${start}-${start + 19}.`);
}

function waitForServer(url, timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      http
        .get(`${url}/api/health`, (res) => {
          res.resume();
          if (res.statusCode && res.statusCode < 500) resolve();
          else retry();
        })
        .on('error', retry);
    };
    const retry = () => {
      if (Date.now() > deadline) reject(new Error('Server lokal tidak merespons.'));
      else setTimeout(tick, 400);
    };
    tick();
  });
}

function buildMenu() {
  const template = [
    {
      label: 'Briefzy',
      submenu: [
        { label: 'Refresh', accelerator: 'CmdOrCtrl+R', click: () => mainWindow && mainWindow.reload() },
        { type: 'separator' },
        { label: 'Keluar', role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'Tampilan',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { label: 'Developer Tools', accelerator: 'CmdOrCtrl+Shift+I', click: () => mainWindow && mainWindow.webContents.openDevTools({ mode: 'detach' }) },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: 'Briefzy Studio',
    backgroundColor: '#0f172a',
    show: false,
    autoHideMenuBar: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Tautan keluar (termasuk halaman izin Google) dibuka di browser default,
  // bukan di dalam jendela aplikasi.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(baseUrl)) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(baseUrl)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.loadURL(`${baseUrl}/admin`);
}

async function bootstrap() {
  const dataDir = path.join(app.getPath('userData'), 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  process.env.BRIEFZY_DATA_DIR = dataDir;
  process.env.BRIEFZY_APP_ROOT = app.getAppPath();

  const port = await pickPort(PRIMARY_PORT);
  process.env.PORT = String(port);
  baseUrl = `http://127.0.0.1:${port}`;

  const serverPath = path.join(__dirname, '..', 'dist-server', 'server.cjs');
  if (!fs.existsSync(serverPath)) {
    throw new Error(
      `Server aplikasi belum dibangun.\n\nJalankan: npm run build:desktop\n\nFile yang dicari:\n${serverPath}`
    );
  }

  // Server Express berjalan di dalam proses Electron ini (tidak perlu terminal terpisah).
  require(serverPath);
  await waitForServer(baseUrl);
  if (port !== PRIMARY_PORT) {
    console.warn(
      `Port ${PRIMARY_PORT} sedang dipakai, memakai ${port}. Daftarkan redirect URI http://127.0.0.1:${port}/api/blogger/auth/callback di Google Cloud Console.`
    );
  }
  createWindow();
}

app.whenReady().then(async () => {
  buildMenu();
  try {
    await bootstrap();
  } catch (err) {
    dialog.showErrorBox('Briefzy Studio gagal dijalankan', String(err && err.message ? err.message : err));
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && baseUrl) createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', () => {
  shuttingDown = true;
});

process.on('uncaughtException', (err) => {
  if (shuttingDown) return;
  try {
    dialog.showErrorBox('Kesalahan tak terduga', String((err && err.stack) || err));
  } catch {
    /* noop */
  }
});
