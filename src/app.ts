import { app, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fs from 'fs';
import {
  createLauncherWindow,
  destroyLauncherWindow,
  getLauncherWindow,
} from './ui/launcher/launcher-window';
import {
  createUpdaterWindow,
  destroyUpdaterWindow,
  getUpdaterWindow,
} from './ui/updater/updater-window';

const dev = process.env.NODE_ENV === 'dev';

if (dev) {
  const appPath = path.resolve('./AppData/Launcher').replace(/\\/g, '/');
  if (!fs.existsSync(appPath)) fs.mkdirSync(appPath, { recursive: true });
  app.setPath('userData', appPath);
}

app.whenReady().then(() => {
  createUpdaterWindow();
});

ipcMain.on('update-window-close', destroyUpdaterWindow);
ipcMain.on('update-window-dev-tools', () =>
  getUpdaterWindow()?.webContents.openDevTools({ mode: 'detach' }),
);
ipcMain.on('main-window-open', createLauncherWindow);
ipcMain.on('main-window-dev-tools', () =>
  getLauncherWindow()?.webContents.openDevTools({ mode: 'detach' }),
);
ipcMain.on('main-window-close', destroyLauncherWindow);
ipcMain.on('main-window-minimize', () => getLauncherWindow()?.minimize());
ipcMain.on('main-window-maximize', () => {
  const win = getLauncherWindow();
  if (win) win.isMaximized() ? win.unmaximize() : win.maximize();
});
ipcMain.on('main-window-hide', () => getLauncherWindow()?.hide());
ipcMain.on('main-window-show', () => getLauncherWindow()?.show());

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

autoUpdater.autoDownload = false;
ipcMain.on('update-app', () => autoUpdater.checkForUpdates());
autoUpdater.on('update-available', () => getUpdaterWindow()?.webContents.send('updateAvailable'));
ipcMain.on('start-update', () => autoUpdater.downloadUpdate());
autoUpdater.on('update-not-available', () =>
  getUpdaterWindow()?.webContents.send('update-not-available'),
);
autoUpdater.on('update-downloaded', () => autoUpdater.quitAndInstall());
autoUpdater.on('download-progress', (progress) =>
  getUpdaterWindow()?.webContents.send('download-progress', progress),
);
