import { StoreItem, Store } from './store';
import { SiteNews } from '../types/site-news';

const CONFIG_URL = `https://launcher.mineria.ovh/launcher/config.json`;

class Config {
  private readonly store: Store;

  constructor() {
    this.store = new Store();
    this.loadConfig();
  }

  private async loadConfig(): Promise<void> {
    try {
      const res = await fetch(CONFIG_URL);
      // validate response body is json
      const json = await res.json();
      this.store.upsert(StoreItem.MineriaConfig, json);
    } catch (err: unknown) {
      console.error('Failed to fetch config', err);
    }
  }

  public getConfig(): MineriaConfig | undefined {
    return this.store.get(StoreItem.MineriaConfig);
  }

  async fetchNews(): Promise<SiteNews> {
    try {
      const res = await fetch('https://mineria.fr/api/rss');
      const text = await res.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'application/xml');

      return Array.from(xml.querySelectorAll('item')).map((item, index) => ({
        id: `${index + 1}`,
        title: item.querySelector('title')?.textContent ?? 'Sans titre',
        url: item.querySelector('link')?.textContent ?? '#',
        image:
          item.querySelector('enclosure')?.getAttribute('url') ??
          'https://mineria.fr/files/img/default-news.jpg',
        publish_date: new Date(item.querySelector('pubDate')?.textContent ?? '')
          .toISOString()
          .split('T')
          .join(' ')
          .split('.')[0],
      }));
    } catch {
      return [];
    }
  }
}

export default new Config();
