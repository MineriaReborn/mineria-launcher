import { ipcRenderer } from 'electron';
import { Config } from '../../utils';
import { ProgressInfo } from 'electron-updater';
import { sleep } from '../../utils/sleep';

class UpdateController {
  private splash: HTMLImageElement | null;
  private readonly message: HTMLElement | null;
  private readonly progress: HTMLProgressElement | null;

  constructor() {
    this.splash = document.querySelector('.splash');
    this.message = document.querySelector('.message');
    this.progress = document.querySelector('progress');

    document.addEventListener('DOMContentLoaded', async () => {
      await this.startAnimation();
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey && e.shiftKey && e.key === 'I') || e.key === 'F12') {
        ipcRenderer.send('update-window-dev-tools');
      }
    });
  }

  async startAnimation(): Promise<void> {
    await sleep(100);
    const splashContainer = document.querySelector<HTMLElement>('#splash');
    if (splashContainer) splashContainer.style.display = 'block';

    await sleep(500);
    this.splash?.classList.add('opacity');

    await sleep(500);
    this.splash?.classList.add('translate');
    this.message?.classList.add('opacity');

    await sleep(1000);
    await this.loadConfig();
  }

  async loadConfig(): Promise<void> {
    if (process.env.NODE_ENV === 'dev') {
      this.startLauncher();
      return;
    }

    const config = Config.getConfig();

    if (!config) {
      return this.shutdown('Aucune connexion internet détectée : <br>Veuillez ré-essayer.');
    }

    this.checkUpdate();
  }

  checkUpdate(): void {
    ipcRenderer.send('update-app');

    ipcRenderer.once('updateAvailable', () => {
      this.setStatus('Mise à jour disponible !');
      ipcRenderer.send('start-update');
    });

    ipcRenderer.on('download-progress', (_, progress: ProgressInfo) => {
      this.toggleProgress();
      const percentage = Math.floor((progress.transferred / progress.total) * 100);
      this.setStatus(`Téléchargement - ${percentage}%`);
      this.setProgress(progress.transferred, progress.total);
    });

    ipcRenderer.once('update-not-available', () => {
      this.startLauncher();
    });
  }

  startLauncher(): void {
    ipcRenderer.send('main-window-open');
    ipcRenderer.send('update-window-close');
    ipcRenderer.send('discord');
  }

  shutdown(text: string): void {
    this.setStatus(`${text}<br>Arrêt dans 5s`);
    let i = 4;
    const interval = setInterval(() => {
      this.setStatus(`${text}<br>Arrêt dans ${i--}s`);
      if (i < 0) {
        clearInterval(interval);
        ipcRenderer.send('update-window-close');
      }
    }, 1000);
  }

  setStatus(text: string): void {
    if (this.message) this.message.innerHTML = text;
  }

  toggleProgress(): void {
    if (this.progress) this.progress.style.opacity = '1';
  }

  setProgress(value: number, max: number): void {
    if (this.progress) {
      this.progress.value = value;
      this.progress.max = max;
    }
  }
}

new UpdateController();
