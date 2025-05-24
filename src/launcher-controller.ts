import fs from 'fs';
import path from 'path';
import { ipcRenderer } from 'electron';
import { Azuriom } from './libs/tropolia-core';

import { addAccount, changePanel, Config } from './utils';

import Login from './panels/login';
import Home from './panels/home';
import Settings from './panels/settings';
import { ItemKey, Store } from './utils/store';
import { Account } from './types/account';

type PanelConstructor = {
  id: string;
  new (): { init: (config: any, news: any, whitelist: any) => void };
};

export default class Launcher {
  private configData: any;
  private newsData: any;
  private whitelistData: any;
  private store: Store;

  constructor() {
    this.store = new Store();
  }

  public async init(): Promise<void> {
    this.initLogger();
    this.initWindowControls();

    this.configData = await Config.GetConfig();
    this.newsData = await Config.GetNews();
    this.whitelistData = await Config.getWhiteListed();

    this.loadPanels(Login, Home, Settings);
    await this.loadAccounts();
  }

  private initLogger(): void {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey && e.shiftKey && e.keyCode === 73) || e.keyCode === 123) {
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

  private loadPanels(...panels: PanelConstructor[]): void {
    const container = document.querySelector('.panels');

    panels.forEach((Panel) => {
      const div = document.createElement('div');
      div.classList.add('panel', Panel.id);
      div.innerHTML = fs.readFileSync(path.join(__dirname, `panels/${Panel.id}.html`), 'utf8');
      container?.appendChild(div);

      new Panel().init(this.configData, this.newsData, this.whitelistData);
    });
  }

  private async loadAccounts(): Promise<void> {
    const account = this.store.get<Account>(ItemKey.Account);
    const azuriom = new Azuriom('https://mineria.fr');

    if (!account) {
      changePanel('login');
      this.hidePreload();
      return;
    }

    if (account.meta.type === 'AZauth') {
      const refreshed = await azuriom.verify(account);

      if (refreshed.error) {
        return this.store.remove(ItemKey.Account);
      }

      const updatedAccount = {
        access_token: refreshed.access_token,
        client_token: refreshed.uuid,
        uuid: refreshed.uuid,
        name: refreshed.name,
        user_properties: refreshed.user_properties,
        meta: {
          type: refreshed.meta?.type,
          offline: !refreshed.meta?.online,
        },
        user_info: {
          monnaie: refreshed.user_info?.money,
          role: refreshed.user_info?.role,
        },
      };

      this.store.upsert(ItemKey.Account, updatedAccount);
      addAccount(updatedAccount);
    } else {
      this.store.remove(ItemKey.Account);
      return changePanel('login');
    }

    changePanel('home');
    this.hidePreload();
  }

  private hidePreload(): void {
    const preload = document.querySelector('.preload-content') as HTMLElement;
    if (preload) preload.style.display = 'none';
  }
}
