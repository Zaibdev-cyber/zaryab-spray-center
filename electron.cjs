const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow = null;

function startServer() {
  try {
    process.env.NODE_ENV = 'production';
    process.env.DIST_PATH = path.join(__dirname, 'dist');
    process.env.APPDATA_PATH = app.getPath('userData');
    process.env.SUPABASE_URL = 'https://aunordasimvnqpmupocb.supabase.co';
    process.env.SUPABASE_KEY = 'sb_publishable_5lHH9pnQx9Mdf3ssvdRNsg_-jfd3UDq';
    require('./dist/server.cjs');
    console.log('Server started');
  } catch (err) {
    console.error('Server error:', err);
    dialog.showErrorBox('Server Error', 'Failed to start: ' + err.message);
  }
}

function waitForServer(callback, attempts = 0) {
  if (attempts > 40) {
    dialog.showErrorBox('Error', 'Server did not start. Please restart the app.');
    return;
  }
  const req = http.get('http://localhost:3000', () => callback());
  req.on('error', () => setTimeout(() => waitForServer(callback, attempts + 1), 300));
  req.end();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    title: 'Spray Center',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    show: false,
  });
  mainWindow.loadURL('http://localhost:3000');
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  startServer();
  waitForServer(() => createWindow());
});

app.on('window-all-closed', () => app.quit());
