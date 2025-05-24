import { changePanel } from '../utils';
import { ipcRenderer, shell } from 'electron';
import { AccountSelected } from '../utils/database';
import { MineriaClientDownloader } from '../libs/mineria-client.downloader';
import EventEmitter from 'node:events';
import { MineriaClientRunner } from '../libs/mineria-client.runner';
import { JavaDownloader } from '../libs/java-downloader';
import { ItemKey, Store } from '../utils/store';
import { Account } from '../types/account';

const gameDirectory =
  process.env.APPDATA ||
  (process.platform === 'darwin'
    ? `${process.env.HOME}/Library/Application Support`
    : process.env.HOME);

interface News {
  publish_date: string;
  image: string;
  title: string;
  url: string;
}

interface Resolution {
  screen: {
    width: string;
    height: string;
  };
}

interface Ram {
  ramMin: number;
  ramMax: number;
}

interface LauncherSettings {
  launcher: {
    close: string;
  };
}

export default class Home {
  static id = 'home';
  private config: any;
  private news: News[] = [];
  private whitelisted: boolean = false;
  private store: Store;

  constructor() {
    this.store = new Store();
  }

  async init(config: any, news: Promise<News[]>, whitelisted: Promise<boolean>): Promise<void> {
    this.config = config;
    this.news = await news;
    this.whitelisted = await whitelisted;
    this.newsInitialisation();
    this.startInitialisation();
    this.buttonInitialisation();
  }

  private async newsInitialisation(): Promise<void> {
    const newsContainer = document.querySelector('.news-content');
    if (this.news && newsContainer) {
      if (this.news.length === 0) return;

      for (let i = 0; i < this.news.length && i < 3; i++) {
        const currentNews = this.news[i];
        const date = await this.getDate(currentNews.publish_date);
        const blockNews = document.createElement('div');
        blockNews.classList.add('news-block');
        blockNews.innerHTML = `
          <div class="news">
            <img class="news-image" src="${currentNews.image}">
            <div class="gradient-overlay"></div>
            <div class="news-title">${currentNews.title}</div>
            <div class="news-date">
              <div class="news-day">${date.day}</div>
              <div class="news-month">${date.month}</div>
            </div>
            <button class="news-url" data-url="${currentNews.url}"></button>
          </div>
        `;
        newsContainer.appendChild(blockNews);
      }

      const checkButtons = document.querySelectorAll('.news-url');
      checkButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const url = button.getAttribute('data-url');
          if (url) {
            shell.openExternal(url);
          }
        });
      });
    }
  }

  private async startInitialisation(): Promise<void> {
    const playBtn = document.querySelector('.launch-button') as HTMLButtonElement;
    const progressBar = document.querySelector('.progress-bar') as HTMLProgressElement;
    const info = document.querySelector('.text-download') as HTMLElement;
    playBtn?.addEventListener('click', async () => {
      const urlpkg = 'https://mineria.fr/files/files';
      const account = this.store.get<Account>(ItemKey.Account);

      if (!account) {
        console.error('Account not found');
        return changePanel('login');
      }

      const ram = this.store.get<Ram>(ItemKey.Ram);
      const resolution = this.store.get<Resolution>(ItemKey.Ram);
      const launcherSettings = this.store.get<LauncherSettings>(ItemKey.LauncherSettings);

      playBtn.disabled = true;

      if (playBtn.classList.contains('stop-animation')) {
        playBtn.classList.remove('stop-animation');
      } else {
        playBtn.classList.add('stop-animation');
      }

      let screen: { width: number; height: number } | boolean =
        resolution?.screen.width === '<auto>'
          ? false
          : {
              width: Number(resolution?.screen.width),
              height: Number(resolution?.screen.height),
            };

      const opts = {
        url: this.config.game_url || urlpkg,
        authenticator: account,
        timeout: 10000,
        path: `${gameDirectory}/${process.platform === 'darwin' ? this.config.dataDirectory : `.${this.config.dataDirectory}`}`,
        version: this.config.game_version,
        detached: launcherSettings?.launcher.close !== 'close-all',
        downloadFileMultiple: 30,
        mcp: './minecraft.jar',
        verify: this.config.verify,
        ignored: ['loader', ...this.config.ignored],
        java: true,
        screen,
        memory: {
          min: `${(ram?.ramMin ?? 1) * 1024}M`,
          max: `${(ram?.ramMax ?? 1) * 1024}M`,
        },
      };

      info.style.display = 'block';
      info.innerHTML = `Vérification`;

      const eventEmitter = new EventEmitter();
      const clientPath = MineriaClientDownloader.getClientPath();
      const javaDownloader = new JavaDownloader(clientPath);
      const downloader = new MineriaClientDownloader(eventEmitter);
      const runner = new MineriaClientRunner(javaDownloader, eventEmitter, {
        clientPath: MineriaClientDownloader.getClientPath(),
        account: {
          username: account.name,
          access_token: account.access_token,
          uuid: account.uuid,
        },
      });

      eventEmitter.on('extract', (extract) => {
        console.log(extract);
      });

      eventEmitter.on('progress', (progress, size) => {
        const percentage = (progress / size) * 100;
        progressBar.style.display = 'block';
        info.innerHTML = `Téléchargement ${percentage.toFixed(0)}%`;
        ipcRenderer.send('main-window-progress', { progress, size });
        progressBar.value = progress;
        progressBar.max = size;
      });

      eventEmitter.on('check', (progress, size) => {
        const percentage = (progress / size) * 100;
        progressBar.style.display = 'block';
        info.innerHTML = `Vérification ${percentage.toFixed(0)}%`;
        progressBar.value = progress;
        progressBar.max = size;
      });

      eventEmitter.on('speed', (speedMbps) => {
        console.log(`${speedMbps.toFixed(2)} Mb/s`);
      });

      eventEmitter.on('finished', () => {
        info.innerHTML = `Lancement...`;
      });

      eventEmitter.on('data', (e) => {
        if (launcherSettings?.launcher.close === 'close-launcher') {
          ipcRenderer.send('main-window-hide');
        }

        ipcRenderer.send('main-window-progress-reset');
        info.innerHTML = `Démarrage en cours...`;
        playBtn.classList.remove('stop-animation');
        playBtn.disabled = false;
        playBtn.style.background = `#cf8127`;
        playBtn.style.color = `#FFFFFF`;
        playBtn.style.display = 'block';
        progressBar.style.display = 'block';
        progressBar.value = 0;
        progressBar.max = 0;
        info.style.display = 'block';
        info.innerHTML = `Attente de lancement.`;
        if (launcherSettings?.launcher.close === 'close-launcher') {
          setInterval(() => {
            ipcRenderer.send('main-window-close');
          }, 10000);
        }
      });

      eventEmitter.on('close', () => {
        if (launcherSettings?.launcher.close === 'close-launcher') {
          ipcRenderer.send('main-window-show');
        }
      });

      eventEmitter.on('error', (err) => {
        console.log(err);
      });

      await downloader.install();
      await runner.run();
    });
  }

  private buttonInitialisation(): void {
    document.querySelector('.home-panel')?.addEventListener('click', () => {
      changePanel('home');
    });

    document.querySelector('.player-disconnect')?.addEventListener('click', () => {
      this.store.remove(ItemKey.AccountSelected);
      changePanel('login');
    });

    document.querySelector('.setting-panel')?.addEventListener('click', () => {
      changePanel('settings');
    });

    document.querySelector('.info-button')?.addEventListener('click', () => {
      shell.openExternal('https://mineria.fr/shop');
    });
  }

  private async getDate(dateStr: string): Promise<{ year: number; month: string; day: number }> {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = [
      'janvier',
      'février',
      'mars',
      'avril',
      'mai',
      'juin',
      'juillet',
      'août',
      'septembre',
      'octobre',
      'novembre',
      'décembre',
    ][date.getMonth()];
    const day = date.getDate();
    return { year, month, day };
  }
}
