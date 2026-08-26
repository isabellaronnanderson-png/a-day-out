// Persists the 4 header "color field" photos in IndexedDB, keyed by slot
// index (0-3). An empty/never-set slot just means "show the default color"
// — see HeaderFieldRow.jsx.

import { fileToCompressedDataUrl } from './imageUtils';

const DB_NAME = 'dispatch-header';
const DB_VERSION = 1;
const STORE = 'fields';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'slot' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function setHeaderPhoto(slot, file) {
  const dataUrl = await fileToCompressedDataUrl(file, 1400, 0.8); // header photos are large/full-bleed, keep a bit more detail
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put({ slot, dataUrl });
    req.onsuccess = () => resolve(dataUrl);
    req.onerror = () => reject(req.error);
  });
}

export async function clearHeaderPhoto(slot) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).delete(slot);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Returns an array of 4 entries (dataUrl or null), ordered by slot.
export async function getHeaderPhotos() {
  const db = await openDb();
  const all = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  const bySlot = {};
  all.forEach((r) => { bySlot[r.slot] = r.dataUrl; });
  return [0, 1, 2, 3].map((i) => bySlot[i] || null);
}
