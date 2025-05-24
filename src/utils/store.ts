export enum ItemKey {
  Account = 'Account',
  AccountSelected = 'AccountSelected',
  JavaArgs = 'JavaArgs',
  LauncherSettings = 'LauncherSettings',
  Profile = 'Profile',
  Ram = 'Ram',
  Resolution = 'Resolution',
}

export class Store {
  upsert<T>(key: ItemKey, value: T) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  get<T>(key: ItemKey): T | null {
    const item = localStorage.getItem(key);
    if (!item || !item.length) return null;
    return JSON.parse(item) as T;
  }

  remove(key: ItemKey) {
    localStorage.removeItem(key);
  }
}
