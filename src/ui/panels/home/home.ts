import { changePanel } from '../../../utils';
import { ipcRenderer, shell } from 'electron';
import { MineriaClientDownloader } from '../../../libs/mineria/mineria-client.downloader';
import EventEmitter from 'node:events';
import { MineriaClientRunner } from '../../../libs/mineria/mineria-client.runner';
import { JavaDownloader } from '../../../libs/mineria/java-downloader';
import { StoreItem, Store } from '../../../utils/store';
import { Account } from '../../../types/account';

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

type HomeProps = {
  news: News[];
};

export default class Home {
  static id = 'home';
  private news: News[] = [];
  private store: Store;

  constructor() {
    this.store = new Store();
  }

  async init(props: HomeProps): Promise<void> {
    this.news = props.news;
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
      const account = this.store.get(StoreItem.Account);

      if (!account) {
        console.error('Account not found');
        return changePanel('login');
      }

      const ram = this.store.get(StoreItem.Memory);
      const resolution = this.store.get(StoreItem.Resolution);
      const launcherSettings = this.store.get(StoreItem.Launcher);

      playBtn.disabled = true;

      if (playBtn.classList.contains('stop-animation')) {
        playBtn.classList.remove('stop-animation');
      } else {
        playBtn.classList.add('stop-animation');
      }

      info.style.display = 'block';
      info.innerHTML = `Vérification`;

      const eventEmitter = new EventEmitter();
      const clientPath = MineriaClientDownloader.getClientPath();
      const javaDownloader = new JavaDownloader(clientPath);
      const downloader = new MineriaClientDownloader(eventEmitter, this.store);
      const runner = new MineriaClientRunner(javaDownloader, eventEmitter, {
        account,
        clientPath: MineriaClientDownloader.getClientPath(),
        detached: launcherSettings.close !== 'close-all',
        resolution,
        memory: ram,
      });

      eventEmitter.on('extract', (extract) => {
        console.log(extract);
      });

      eventEmitter.on('progress', (progress, size) => {
        const percentage = (progress / size) * 100;
        progressBar.style.display = 'block';
        info.innerHTML = `Téléchargement ${percentage.toFixed(0)}%`;
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
        //console.log(`${speedMbps.toFixed(2)} Mb/s`);
      });

      eventEmitter.on('finished', () => {
        info.innerHTML = `Lancement...`;
      });

      eventEmitter.on('data', (e) => {
        if (launcherSettings.close === 'close-launcher') {
          ipcRenderer.send('main-window-hide');
        }

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
        if (launcherSettings.close === 'close-launcher') {
          setInterval(() => {
            ipcRenderer.send('main-window-close');
          }, 10000);
        }
      });

      eventEmitter.on('close', () => {
        if (launcherSettings.close === 'close-launcher') {
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
      this.store.remove(StoreItem.Account);
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
