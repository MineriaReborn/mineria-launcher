import fs from 'fs';
import path from 'path';
import { ipcRenderer } from 'electron';

import { addAccount, changePanel, Config } from '../../utils';

import Login from '../panels/login/login';
import Home from '../panels/home/home';
import Settings from '../panels/settings/settings';
import { StoreItem, Store } from '../../utils/store';
import Azuriom from '../../libs/azuriom/Azuriom';
import { SiteNews } from '../../types/site-news';

class Launcher {
  private readonly store = new Store();
  private readonly azuriom = new Azuriom('https://mineria.fr');

  private config?: MineriaConfig;
  private news: SiteNews = [];

  public async init(): Promise<void> {
    if (process.env.NODE_ENV === 'dev') {
      this.enableDevTools();
    }

    this.initWindowControls();

    this.config = Config.getConfig();
    this.news = await Config.fetchNews();

    this.loadPanels();
    await this.reLogin();
  }

  private enableDevTools(): void {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'i') {
        ipcRenderer.send('main-window-dev-tools');
      }
    });
  }

  private initWindowControls(): void {
    document.querySelector('.frame')?.classList.toggle('hide');
    document.querySelector('.dragbar')?.classList.toggle('hide');

    document.querySelector('#minimize')?.addEventListener('click', () => {
      ipcRenderer.send('main-window-minimize');
    });

    let maximized = false;
    const maximizeButton = document.querySelector('#maximize');

    maximizeButton?.addEventListener('click', () => {
      ipcRenderer.send('main-window-maximize');
      maximized = !maximized;
      maximizeButton.classList.toggle('icon-maximize');
      maximizeButton.classList.toggle('icon-restore-down');
    });

    document.querySelector('#close')?.addEventListener('click', () => {
      ipcRenderer.send('main-window-close');
    });
  }

  private loadPanels(): void {
    const container = document.querySelector('.panels');

    const panels = [Home, Settings, Login];

    Object.values(panels).forEach((PanelConstructor) => {
      const div = document.createElement('div');

      div.classList.add('panel', PanelConstructor.id);
      div.innerHTML = fs.readFileSync(
        path.join(__dirname, '..', `panels/${PanelConstructor.id}/${PanelConstructor.id}.html`),
        'utf8',
      );

      container?.appendChild(div);

      if (this.config) {
        new PanelConstructor().init({
          news: this.news,
        });
      }
    });
  }

  private async reLogin(): Promise<void> {
    const account = this.store.get(StoreItem.Account);

    if (!account) {
      this.hidePreload();
      return changePanel('login');
    }

    const { account: refreshedAccount, message } = await this.azuriom.verify(account);

    if (!refreshedAccount || message?.length) {
      this.store.remove(StoreItem.Account);
      this.hidePreload();
      return changePanel('login');
    }

    this.store.upsert(StoreItem.Account, refreshedAccount);
    addAccount(refreshedAccount);

    this.hidePreload();
    changePanel('home');
  }

  private hidePreload(): void {
    const preload = document.querySelector('.preload-content') as HTMLElement;
    if (preload) preload.style.display = 'none';
  }
}

new Launcher().init();
