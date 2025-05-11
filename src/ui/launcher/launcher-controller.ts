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
  private config: MineriaConfig | undefined;
  private news: SiteNews = [];
  private store: Store;

  constructor() {
    this.store = new Store();
  }

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
          config: this.config,
          news: this.news,
        });
      }
    });
  }

  private async reLogin(): Promise<void> {
    const account = this.store.get(StoreItem.Account);
    const azuriom = new Azuriom('https://mineria.fr');

    if (!account) {
      this.hidePreload();
      changePanel('login');
      return;
    }

    if (account.meta.type === 'AZauth') {
      const refreshed = await azuriom.verify(account);

      if (!refreshed.account || refreshed?.message) {
        this.store.remove(StoreItem.Account);
        return changePanel('login');
      }

      const updatedAccount = {
        access_token: refreshed.account.access_token,
        client_token: refreshed.account.uuid,
        uuid: refreshed.account.uuid,
        name: refreshed.account.name,
        user_properties: refreshed.account.user_properties,
        meta: {
          type: refreshed.account.meta?.type,
          offline: !refreshed.account.meta?.online,
        },
        user_info: {
          monnaie: refreshed.account.user_info?.money,
          role: refreshed.account.user_info?.role,
        },
      };

      this.store.upsert(StoreItem.Account, updatedAccount);
      addAccount(updatedAccount);
    } else {
      this.store.remove(StoreItem.Account);
      return changePanel('login');
    }

    this.hidePreload();
    changePanel('home');
  }

  private hidePreload(): void {
    const preload = document.querySelector('.preload-content') as HTMLElement;
    if (preload) preload.style.display = 'none';
  }
}

new Launcher().init();
