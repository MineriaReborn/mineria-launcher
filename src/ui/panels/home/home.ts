import { changePanel, Config } from '../../../utils';
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

type HomeProps = {
  news: News[];
};

export default class Home {
  static readonly id = 'home';

  private readonly store = new Store();
  private news: News[] = [];

  async init(props: HomeProps): Promise<void> {
    this.news = props.news;
    await this.newsInitialisation();
    await this.startInitialisation();
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
      const config = Config.getConfig();
      playBtn.disabled = true;

      if (
        !account ||
        !config ||
        (config.maintenance && !config.whitelist.includes(account.username))
      ) {
        info.innerHTML = `Serveur en maintenance`;
        playBtn.style.filter = 'grayscale(100%)';
        playBtn.style.pointerEvents = 'none';
        return;
      }

      const memory = this.store.get(StoreItem.Memory);
      const resolution = this.store.get(StoreItem.Resolution);
      const launcherSettings = this.store.get(StoreItem.Launcher);

      info.style.display = 'block';
      info.innerHTML = `Vérification`;

      const eventEmitter = new EventEmitter();
      const clientPath = MineriaClientDownloader.getClientPath();
      const javaDownloader = new JavaDownloader(clientPath, eventEmitter);
      const downloader = new MineriaClientDownloader(eventEmitter, this.store);
      const runner = new MineriaClientRunner(javaDownloader, eventEmitter, {
        account,
        clientPath: MineriaClientDownloader.getClientPath(),
        resolution,
        memory,
        launcherSettings,
      });

      eventEmitter.on('client_download_progress', (progress, size) => {
        const percentage = (progress / size) * 100;
        info.innerHTML = `Téléchargement ${percentage.toFixed(0)}%`;
        progressBar.value = progress;
        progressBar.max = size;
      });

      eventEmitter.on('client_downloaded', () => {
        info.innerHTML = `Client téléchargé`;
        progressBar.value = 100;
        progressBar.max = 100;
      });

      eventEmitter.on('java_download_progress', () => {
        info.innerHTML = `Téléchargement de Java 8`;
      });

      eventEmitter.on('game_started', () => {
        playBtn.style.filter = 'grayscale(100%)';
        playBtn.style.pointerEvents = 'none';
        info.innerHTML = 'Mineria est lancé';

        if (launcherSettings.close === 'close-launcher') {
          setInterval(() => {
            ipcRenderer.send('main-window-close');
          }, 15_000);
        }
      });

      eventEmitter.on('game_closed', () => {
        playBtn.disabled = false;
        playBtn.style.filter = 'grayscale(0%)';
        playBtn.style.pointerEvents = 'all';
        info.innerHTML = 'Attente de lancement.';
        progressBar.value = 0;
        progressBar.max = 0;
      });

      await downloader.install();
      await runner.run();

      eventEmitter.emit('game_started');
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
