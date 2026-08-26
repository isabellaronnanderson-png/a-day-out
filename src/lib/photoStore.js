// Photos are stored in IndexedDB rather than localStorage — localStorage's
// ~5-10MB total quota fills up fast with real photos, while IndexedDB gives
// each origin hundreds of MB (varies by browser) and handles binary data
// more naturally. Photos are resized/compressed client-side before storage
// to keep things reasonable regardless.

import { fileToCompressedDataUrl } from './imageUtils';

const DB_NAME = 'dispatch-photos';
const DB_VERSION = 1;
const STORE = 'photos';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('placeId', 'placeId', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function addPhoto(placeId, file) {
  const dataUrl = await fileToCompressedDataUrl(file);
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const record = { placeId, dataUrl, createdAt: Date.now() };
    const req = tx.objectStore(STORE).add(record);
    req.onsuccess = () => resolve({ ...record, id: req.result });
    req.onerror = () => reject(req.error);
  });
}

export async function getPhotos(placeId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const index = tx.objectStore(STORE).index('placeId');
    const req = index.getAll(placeId);
    req.onsuccess = () => resolve((req.result || []).sort((a, b) => a.createdAt - b.createdAt));
    req.onerror = () => reject(req.error);
  });
}

export async function deletePhoto(photoId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).delete(photoId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteAllPhotosForPlace(placeId) {
  const photos = await getPhotos(placeId);
  await Promise.all(photos.map((p) => deletePhoto(p.id)));
}
