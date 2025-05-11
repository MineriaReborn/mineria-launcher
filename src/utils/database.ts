type StoreType = 'accounts' | 'accounts-selected' | 'java-path' | 'java-args' | 'launcher' | 'profile' | 'ram' | 'screen';
export type AccountSelected = {
    uuid: string;
    selected: string;
}

type DBData<T>  = {
    key: string;
    value: T;
}

class Database {
    private db!: IDBDatabase;

    async init(): Promise<this> {
        this.db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open("database", 1);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBRequest).result;

                const stores: StoreType[] = [
                    'accounts', 'accounts-selected', 'java-path', 'java-args',
                    'launcher', 'profile', 'ram', 'screen'
                ];

                stores.forEach(store => {
                    if (!db.objectStoreNames.contains(store)) {
                        db.createObjectStore(store, { keyPath: 'key' });
                    }
                });
            };

            request.onsuccess = (event) => {
                resolve((event.target as IDBRequest).result);
            };

            request.onerror = () => {
                reject(new Error('Failed to open database'));
            };
        });

        return this;
    }

    private getStore(type: StoreType): IDBObjectStore {
        return this.db.transaction(type, "readwrite").objectStore(type);
    }

    private genKey(int: string): number {
        let key = 0;
        for (let c of int.split("")) {
            key = (((key << 5) - key) + c.charCodeAt(0)) & 0xFFFFFFFF;
        }
        return key;
    }

    async add<T extends { uuid: string }>(data: T, type: StoreType): Promise<void> {
        const store = this.getStore(type);
        const key = this.genKey(data.uuid);
        await new Promise<void>((resolve, reject) => {
            const request = store.add({ key, value: data });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error("Failed to add data"));
        });
    }

    async get<T>(key: string, type: StoreType): Promise<{ key: string | number; value: T } | null> {
        const store = this.getStore(type);
        const keyValue = this.genKey(key);
        return new Promise((resolve) => {
            const request = store.get(keyValue);
            request.onsuccess = (event) => {
                const result = (event.target as IDBRequest).result;
                resolve(result || null);
            };
            request.onerror = () => resolve(null);
        });
    }

    async getAll<T>(type: StoreType): Promise<Array<{ key: string | number; value: T }>> {
        const store = this.getStore(type);
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = (event) => {
                const result = (event.target as IDBRequest).result;
                resolve(result || []);
            };
            request.onerror = () => reject(new Error("Failed to fetch all records"));
        });
    }

    async update<T extends { uuid: string }>(data: T, type: StoreType): Promise<void> {
        const store = this.getStore(type);
        const key = this.genKey(data.uuid);
        await new Promise<void>((resolve, reject) => {
            const request = store.put({ key, value: data });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error("Failed to update data"));
        });
    }

    async delete(key: string, type: StoreType): Promise<void> {
        const store = this.getStore(type);
        const keyValue = this.genKey(key);
        await new Promise<void>((resolve, reject) => {
            const request = store.delete(keyValue);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error("Failed to delete data"));
        });
    }
}

export default Database;