import { Story } from '../types';

const DB_NAME = 'story-board-editor';
const STORE_NAME = 'stories';
const VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveStories(stories: Story[], order: string[]): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.put({ stories, order, timestamp: Date.now() }, 'data');
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadStories(): Promise<{ stories: Story[]; order: string[] } | null> {
  const db = await openDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const request = store.get('data');
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export function triggerDownload(filename: string, data: Blob) {
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function exportStoriesAsJson(stories: Story[], order: string[]) {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    stories,
    order,
  };
  triggerDownload(
    `stories-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
  );
}

export async function importStoriesFromJson(file: File): Promise<{ stories: Story[]; order: string[] }> {
  const text = await file.text();
  const payload = JSON.parse(text);
  if (!payload || !Array.isArray(payload.stories)) {
    throw new Error('Invalid story file');
  }
  return { stories: payload.stories as Story[], order: payload.order ?? [] };
}
