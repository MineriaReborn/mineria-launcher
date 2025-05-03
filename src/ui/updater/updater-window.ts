import { app, BrowserWindow, BrowserWindowConstructorOptions } from 'electron';
import * as path from 'path';
import * as os from 'os';

class UpdaterWindow {
  private static instance: BrowserWindow | undefined;

  static getWindow(): BrowserWindow | undefined {
    return this.instance;
  }

  static destroy(): void {
    if (this.instance) {
      this.instance.close();
      this.instance = undefined;
    }
  }

  static create(): void {
    this.destroy();

    const options: BrowserWindowConstructorOptions = {
      title: 'Mise à jour',
      width: 400,
      height: 500,
      resizable: false,
      icon: `./src/assets/images/icon.${os.platform() === 'win32' ? 'ico' : 'png'}`,
      transparent: os.platform() === 'win32',
      frame: false,
      show: false,
      webPreferences: {
        contextIsolation: false,
        nodeIntegration: true,
      },
    };

    this.instance = new BrowserWindow(options);
    this.instance.loadFile(path.join(app.getAppPath(), 'dist', 'ui', 'updater', 'updater.html'));
    this.instance.once('ready-to-show', () => this.instance?.show());
  }
}

export const createUpdaterWindow = () => UpdaterWindow.create();
export const getUpdaterWindow = () => UpdaterWindow.getWindow();
export const destroyUpdaterWindow = () => UpdaterWindow.destroy();
