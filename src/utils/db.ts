/**
 * db.ts
 * 
 * A robust, Promise-based wrapper around the native window.indexedDB API.
 * This is used to persist heavy offline-first data like base64 images, which
 * would instantly crash the 5MB quota of localStorage.
 */

const DB_NAME = 'TaskZoneDB';
const DB_VERSION = 1;
const STORE_NAME = 'state';

/**
 * Initializes the IndexedDB database.
 * If the database does not exist or the version is upgraded, it creates the object store.
 */
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB failed to open:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // We use out-of-line keys by setting no keyPath.
        // We will pass the key manually in put() and get().
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Saves a payload to the database under the given key.
 */
export async function saveData<T>(key: string, data: T): Promise<void> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.put(data, key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      
      // Close the connection when the transaction completes
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error(`Failed to save data for key "${key}":`, error);
  }
}

/**
 * Retrieves a payload from the database by its key.
 * Returns null if the key doesn't exist.
 */
export async function loadData<T>(key: string): Promise<T | null> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.get(key);
      
      request.onsuccess = () => {
        resolve(request.result !== undefined ? request.result : null);
      };
      request.onerror = () => reject(request.error);
      
      // Close the connection when the transaction completes
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error(`Failed to load data for key "${key}":`, error);
    return null;
  }
}
