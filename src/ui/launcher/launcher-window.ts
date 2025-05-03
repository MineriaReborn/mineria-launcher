import { app, BrowserWindow, BrowserWindowConstructorOptions } from 'electron';
import * as path from 'path';
import * as os from 'os';

class LauncherWindow {
  private static instance: BrowserWindow | undefined;

  static getWindow(): BrowserWindow | undefined {
    return this.instance;
  }

  static destroy(): void {
    if (this.instance) {
      app.exit(0);
    }
  }

  static create(): void {
    this.destroy();

    const options: BrowserWindowConstructorOptions = {
      title: 'Mineria Launcher',
      width: 1280,
      height: 720,
      minWidth: 1280,
      minHeight: 720,
      frame: false,
      transparent: true,
      resizable: false,
      icon: `./src/assets/images/icon.${os.platform() === 'win32' ? 'ico' : 'png'}`,
      show: false,
      webPreferences: {
        contextIsolation: false,
        nodeIntegration: true,
      },
    };

    this.instance = new BrowserWindow(options);
    this.instance.loadFile(path.join(app.getAppPath(), 'dist', 'ui', 'launcher', 'launcher.html'));
    this.instance.once('ready-to-show', () => this.instance?.show());
  }
}

export const createLauncherWindow = () => LauncherWindow.create();
export const getLauncherWindow = () => LauncherWindow.getWindow();
export const destroyLauncherWindow = () => LauncherWindow.destroy();
