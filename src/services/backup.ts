/**
 * Backup automático em uma pasta do computador (File System Access API — Chrome/Edge).
 * O "handle" da pasta fica salvo no IndexedDB para reutilizar nas próximas aberturas.
 */

const DB_NAME = 'boraxp_fs';
const STORE = 'handles';
const HANDLE_KEY = 'backupDir';
const LAST_BACKUP_KEY = 'boraxp_last_backup_date';
const MAX_BACKUP_FILES = 14;

type PermissionMode = { mode: 'readwrite' };

interface DirHandle {
  name: string;
  queryPermission?: (opts: PermissionMode) => Promise<PermissionState>;
  requestPermission?: (opts: PermissionMode) => Promise<PermissionState>;
  getFileHandle: (name: string, opts?: { create?: boolean }) => Promise<{
    createWritable: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }>;
  }>;
  removeEntry: (name: string) => Promise<void>;
  keys?: () => AsyncIterableIterator<string>;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function isAutoBackupSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window && 'indexedDB' in window;
}

export type BackupFolderStatus = {
  name: string | null;
  permission: PermissionState | 'none';
};

export async function getBackupFolderStatus(): Promise<BackupFolderStatus> {
  if (!isAutoBackupSupported()) return { name: null, permission: 'none' };
  try {
    const handle = await idbGet<DirHandle>(HANDLE_KEY);
    if (!handle) return { name: null, permission: 'none' };
    const permission = handle.queryPermission
      ? await handle.queryPermission({ mode: 'readwrite' })
      : 'granted';
    return { name: handle.name, permission };
  } catch {
    return { name: null, permission: 'none' };
  }
}

/** Precisa ser chamado a partir de um clique do usuário. */
export async function pickBackupFolder(): Promise<string | null> {
  if (!isAutoBackupSupported()) return null;
  const picker = (window as unknown as { showDirectoryPicker: (o?: object) => Promise<DirHandle> }).showDirectoryPicker;
  const handle = await picker({ id: 'boraxp-backup', mode: 'readwrite' });
  await idbSet(HANDLE_KEY, handle);
  return handle.name;
}

/** Precisa ser chamado a partir de um clique do usuário. */
export async function requestBackupPermission(): Promise<boolean> {
  const handle = await idbGet<DirHandle>(HANDLE_KEY);
  if (!handle) return false;
  if (!handle.requestPermission) return true;
  const res = await handle.requestPermission({ mode: 'readwrite' });
  return res === 'granted';
}

export async function forgetBackupFolder(): Promise<void> {
  await idbDelete(HANDLE_KEY);
}

export function getLastBackupDate(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}

export function setLastBackupDate(dateKey: string): void {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, dateKey);
  } catch {
    // ignorar
  }
}

/** Grava `boraxp-backup-YYYY-MM-DD.json` na pasta escolhida e mantém só os últimos 14. */
export async function writeBackupToFolder(json: string, dateKey: string): Promise<boolean> {
  const handle = await idbGet<DirHandle>(HANDLE_KEY);
  if (!handle) return false;
  if (handle.queryPermission) {
    const perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') return false;
  }

  const fileHandle = await handle.getFileHandle(`boraxp-backup-${dateKey}.json`, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(json);
  await writable.close();

  // Limpeza dos backups antigos
  if (handle.keys) {
    const names: string[] = [];
    for await (const name of handle.keys()) {
      if (/^boraxp-backup-\d{4}-\d{2}-\d{2}\.json$/.test(name)) names.push(name);
    }
    names.sort();
    const excess = names.length - MAX_BACKUP_FILES;
    for (let i = 0; i < excess; i++) {
      await handle.removeEntry(names[i]).catch(() => {});
    }
  }

  setLastBackupDate(dateKey);
  return true;
}

/** Pede ao navegador para não apagar os dados do BoraXP automaticamente. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    // ignorar
  }
  return false;
}
