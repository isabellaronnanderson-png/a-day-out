// Persists the 4 header "color field" photos in IndexedDB, keyed by slot
// index (0-3), along with a pan position for each so a photo can be
// recropped by dragging. An empty/never-set slot just means "show the
// default color" — see HeaderFieldRow.jsx.

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

async function getRecord(slot) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(slot);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function putRecord(record) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

export async function setHeaderPhoto(slot, file) {
  const dataUrl = await fileToCompressedDataUrl(file, 1600, 0.8); // header photos are large/full-bleed, keep a bit more detail
  const record = { slot, dataUrl, posX: 50, posY: 50 };
  await putRecord(record);
  return record;
}

export async function setHeaderPosition(slot, posX, posY) {
  const existing = await getRecord(slot);
  if (!existing) return null;
  const record = { ...existing, posX, posY };
  await putRecord(record);
  return record;
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

// Returns an array of 4 entries ({ dataUrl, posX, posY } or null), ordered by slot.
export async function getHeaderPhotos() {
  const db = await openDb();
  const all = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  const bySlot = {};
  all.forEach((r) => { bySlot[r.slot] = r; });
  return [0, 1, 2, 3].map((i) => {
    const r = bySlot[i];
    return r ? { dataUrl: r.dataUrl, posX: r.posX ?? 50, posY: r.posY ?? 50 } : null;
  });
}
