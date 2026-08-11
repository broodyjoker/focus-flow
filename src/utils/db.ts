/**
 * db.ts
 *
 * A robust, Promise-based wrapper around the native window.indexedDB API.
 * Used to persist heavy offline-first data (e.g. base64 images) that would
 * bust the 5 MB localStorage quota.
 *
 * Safety additions vs. the original:
 *   - loadTasks / loadBuckets validators discard structurally broken records
 *     rather than letting corrupt data crash the app downstream.
 *   - Every public function returns a safe fallback (null / []) on error
 *     instead of surfacing a rejected promise to callers.
 *   - initDB is cached per page-load so we don't re-open on every call.
 */

const DB_NAME    = 'TaskZoneDB';
const DB_VERSION = 1;
const STORE_NAME = 'state';

// Module-level cache so initDB() only opens once per page-load.
let _db: IDBDatabase | null = null;

function initDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB failed to open:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      _db = request.result;
      // Clear our cache if the connection closes unexpectedly.
      _db.onclose = () => { _db = null; };
      resolve(_db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // Out-of-line keys: key is passed manually in put() / get().
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

// ── Structural validators ────────────────────────────────────────────────────
// These run on data read from IndexedDB before it touches React state.
// A record missing required fields is silently discarded — better to lose
// a corrupt task than to crash the entire app.

function isValidTask(t: unknown): boolean {
  if (!t || typeof t !== 'object') return false;
  const task = t as Record<string, unknown>;
  return (
    typeof task.id    === 'string' && task.id.trim()    !== '' &&
    typeof task.title === 'string' && task.title.trim() !== ''
  );
}

function isValidBucket(b: unknown): boolean {
  if (!b || typeof b !== 'object') return false;
  const bucket = b as Record<string, unknown>;
  return (
    typeof bucket.id           === 'string' && bucket.id.trim()           !== '' &&
    typeof bucket.defaultLabel === 'string' && bucket.defaultLabel.trim() !== ''
  );
}

// ── Core read / write ────────────────────────────────────────────────────────

/**
 * Saves a payload to the database under the given key.
 */
export async function saveData<T>(key: string, data: T): Promise<void> {
  try {
    const db = await initDB();
    await new Promise<void>((resolve, reject) => {
      const tx    = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req   = store.put(data, key);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  } catch (error) {
    console.error(`[db] saveData("${key}") failed:`, error);
    // ponytail: fire-and-forget; caller does not need to handle save errors.
  }
}

/**
 * Retrieves a payload from the database by its key.
 * Returns null if the key doesn't exist or any error occurs.
 */
export async function loadData<T>(key: string): Promise<T | null> {
  try {
    const db = await initDB();
    return await new Promise<T | null>((resolve, reject) => {
      const tx    = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req   = store.get(key);
      req.onsuccess = () =>
        resolve(req.result !== undefined ? (req.result as T) : null);
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.error(`[db] loadData("${key}") failed:`, error);
    return null;
  }
}

// ── Typed loaders with structural validation ─────────────────────────────────

/**
 * Load tasks array, discarding any element that is missing `id` or `title`.
 * Returns an empty array if the DB has nothing or the stored value is corrupt.
 */
export async function loadTasks(): Promise<import('../models').Task[]> {
  const raw = await loadData<unknown[]>('tasks');
  if (!Array.isArray(raw)) return [];
  const valid = raw.filter(isValidTask) as import('../models').Task[];
  if (valid.length !== raw.length) {
    console.warn(`[db] loadTasks: discarded ${raw.length - valid.length} corrupt record(s).`);
  }
  return valid;
}

/**
 * Load buckets array, discarding any element missing `id` or `defaultLabel`.
 * Returns an empty array if the DB has nothing or the stored value is corrupt.
 */
export async function loadBuckets(): Promise<import('../models').LifeBucket[]> {
  const raw = await loadData<unknown[]>('buckets');
  if (!Array.isArray(raw)) return [];
  const valid = raw.filter(isValidBucket) as import('../models').LifeBucket[];
  if (valid.length !== raw.length) {
    console.warn(`[db] loadBuckets: discarded ${raw.length - valid.length} corrupt record(s).`);
  }
  return valid;
}
