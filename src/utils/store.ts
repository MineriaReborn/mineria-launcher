import { ONE_GIGA_BYTES } from './constants';
import { Memory } from '../types/memory';
import { Resolution } from '../types/resolution';
import { LauncherSettings } from '../types/launcher-settings';
import { Account } from '../types/account';

export enum StoreItem {
  Account = 'Account',
  Launcher = 'Launcher',
  Memory = 'Memory',
  Resolution = 'Resolution',
  MineriaConfig = 'MineriaConfig',
}

export type State = {
  [StoreItem.Memory]: Memory;
  [StoreItem.Resolution]: Resolution;
  [StoreItem.Launcher]: LauncherSettings;
  [StoreItem.Account]?: Account;
  [StoreItem.MineriaConfig]?: MineriaConfig;
};

const initialState: State = {
  [StoreItem.Memory]: {
    min: ONE_GIGA_BYTES,
    max: ONE_GIGA_BYTES * 2,
  },
  [StoreItem.Resolution]: {
    width: 1280,
    height: 720,
  },
  [StoreItem.Launcher]: {
    close: 'open-launcher',
  },
  [StoreItem.Account]: undefined,
  [StoreItem.MineriaConfig]: undefined,
} as const;

export class Store {
  upsert<K extends StoreItem>(key: K, value: State[K]) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  get<K extends StoreItem>(key: K): State[K] {
    const item = localStorage.getItem(key);
    if (!item) {
      return initialState[key];
    }
    return JSON.parse(item) as State[K];
  }

  remove<K extends StoreItem>(key: K) {
    localStorage.removeItem(key);
  }
}
