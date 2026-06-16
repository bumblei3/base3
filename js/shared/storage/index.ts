/**
 * Shared storage abstraction - LocalStorage / IndexedDB wrapper
 */

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

class LocalStorageAdapter implements StorageAdapter {
  async get<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(key, JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    localStorage.clear();
  }

  async keys(): Promise<string[]> {
    return Object.keys(localStorage);
  }
}

class IndexedDBAdapter implements StorageAdapter {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;

  constructor(dbName = 'base3', storeName = 'data') {
    this.dbName = dbName;
    this.storeName = storeName;
  }

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async set<T>(key: string, value: T): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async remove(key: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async keys(): Promise<string[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(request.error);
    });
  }
}

// High-level storage with namespaces
export class Storage {
  private adapter: StorageAdapter;
  private namespace: string;

  constructor(adapter: StorageAdapter, namespace = 'base3') {
    this.adapter = adapter;
    this.namespace = namespace;
  }

  private key(key: string): string {
    return `${this.namespace}:${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    return this.adapter.get<T>(this.key(key));
  }

  async set<T>(key: string, value: T): Promise<void> {
    return this.adapter.set(this.key(key), value);
  }

  async remove(key: string): Promise<void> {
    return this.adapter.remove(this.key(key));
  }

  async clear(): Promise<void> {
    const keys = await this.adapter.keys();
    await Promise.all(keys.filter(k => k.startsWith(this.namespace + ':')).map(k => this.adapter.remove(k)));
  }

  async keys(): Promise<string[]> {
    const allKeys = await this.adapter.keys();
    return allKeys.filter(k => k.startsWith(this.namespace + ':')).map(k => k.slice(this.namespace.length + 1));
  }
}

// Default instances
export const localStorageInstance = new Storage(new LocalStorageAdapter());
export const indexedDBInstance = new Storage(new IndexedDBAdapter());

// Game-specific helpers
export interface GameSaveData {
  variant: 'schach9x9' | 'trischach';
  state: unknown;
  timestamp: number;
}

export async function saveGame(slot: string, data: GameSaveData): Promise<void> {
  await indexedDBInstance.set(`games:${slot}`, data);
}

export async function loadGame(slot: string): Promise<GameSaveData | null> {
  return indexedDBInstance.get<GameSaveData>(`games:${slot}`);
}

export async function listSaves(): Promise<string[]> {
  return indexedDBInstance.keys().then(keys => keys.filter(k => k.startsWith('games:')));
}

export async function deleteSave(slot: string): Promise<void> {
  await indexedDBInstance.remove(`games:${slot}`);
}

// Settings
export async function getSettings(): Promise<Record<string, unknown>> {
  return (await localStorageInstance.get('settings')) ?? {};
}

export async function setSettings(settings: Record<string, unknown>): Promise<void> {
  await localStorageInstance.set('settings', settings);
}

export async function getSetting<K>(key: string, defaultValue: K): Promise<K> {
  const settings = await getSettings();
  return (settings[key] as K) ?? defaultValue;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const settings = await getSettings();
  settings[key] = value;
  await setSettings(settings);
}