import { randomId } from "./utils";

const DB_NAME = "esg-storage";
const DB_VERSION = 1;
const STORE_NAME = "images";

export type SavedImageRecord = {
  id: string;
  title: string;
  kind: string;
  mimeType: string;
  createdAt: number;
  storyboardId?: string;
  storyboardTitle?: string;
  fileName?: string;
  blob: Blob;
};

type SaveInput = Omit<SavedImageRecord, "id" | "createdAt"> & {
  id?: string;
  createdAt?: number;
};

function ensureIndexedDb(): IDBFactory {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this environment.");
  }
  return indexedDB;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

function openDb(): Promise<IDBDatabase> {
  const idb = ensureIndexedDb();
  return new Promise((resolve, reject) => {
    const request = idb.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB."));
  });
}

export async function saveImageRecord(input: SaveInput): Promise<SavedImageRecord> {
  const record: SavedImageRecord = {
    id: input.id || randomId(),
    createdAt: typeof input.createdAt === "number" ? input.createdAt : Date.now(),
    title: input.title,
    kind: input.kind,
    mimeType: input.mimeType,
    storyboardId: input.storyboardId,
    storyboardTitle: input.storyboardTitle,
    fileName: input.fileName,
    blob: input.blob,
  };

  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await requestToPromise(store.put(record));
  return record;
}

export async function listSavedImages(): Promise<SavedImageRecord[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const records = await requestToPromise(store.getAll());
  return (records || []).sort((a, b) => (b?.createdAt || 0) - (a?.createdAt || 0));
}

export async function deleteSavedImage(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await requestToPromise(store.delete(id));
}

export async function clearSavedImages(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await requestToPromise(store.clear());
}
