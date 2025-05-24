const baseUrl = 'https://mineria.fr/files/';
const CONFIG_URL = `${baseUrl}/launcher/config-launcher/config.json`;
const WHITELIST_URL = `${baseUrl}/launcher/whitelist.json`;

type GetConfigResponse = {
  maintenance: boolean;
  maintenance_message: string;
  online: boolean;
  client_id: string;
  game_version: string;
  verify: boolean;
  java: boolean;
  game_args: string[];
  dataDirectory: string;
  ignored: string[];
  loader: {
    type: string;
    build: string;
    enable: boolean;
  };
  status: {
    nameServer: string;
    ip: string;
    port: number;
  };
};

class Config {
  async GetConfig() {
    try {
      const res = await fetch(CONFIG_URL);
      return (await res.json()) as GetConfigResponse;
    } catch (err) {
      throw new Error('Failed to fetch config');
    }
  }

  async GetNews() {
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
      return false;
    }
  }

  async getWhiteListed() {
    try {
      const res = await fetch(WHITELIST_URL);
      return res.status === 200 ? await res.json() : false;
    } catch {
      return false;
    }
  }
}

export default new Config();
