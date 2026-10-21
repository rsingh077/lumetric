/**
 * Lumetric Multi-Tenant Profile & Workspace Storage Engine
 * 
 * Powered by browser IndexedDB for high-capacity (>500MB),
 * zero-latency local persistence, and automatic backward
 * compatibility migration for existing users' saved work.
 */

import { UserProfileDatabase } from '@/types';

const DB_NAME = 'lumetric_profile_vault_v1';
const DB_VERSION = 1;
const STORE_NAME = 'user_workspaces';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'userEmail' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class ProfileStorageManager {
  private static sanitizeEmail(email: string): string {
    return email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
  }

  public static getLegacyStorageKey(email: string): string {
    return `lumetric_profile_db_${this.sanitizeEmail(email)}`;
  }

  /**
   * Saves a user's entire workspace database to IndexedDB.
   * Supports massive datasets (10,000+ rows) without hitting the 5MB localStorage quota.
   */
  public static async saveProfile(dbPayload: UserProfileDatabase): Promise<void> {
    if (typeof window === 'undefined' || !dbPayload.userEmail) return;

    const normEmail = dbPayload.userEmail.toLowerCase().trim();
    const payloadWithNorm = { ...dbPayload, userEmail: normEmail };

    try {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(payloadWithNorm);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('IndexedDB save warning:', err);
    }

    // Secondary best-effort backup to localStorage (if within quota)
    try {
      const key = this.getLegacyStorageKey(normEmail);
      const json = JSON.stringify(payloadWithNorm);
      if (json.length < 3000000) {
        localStorage.setItem(key, json);
      }
    } catch {
      // Ignore quota errors on localStorage since IndexedDB holds authoritative data
    }
  }

  /**
   * Loads a user's profile database.
   * Seamlessly checks:
   * 1. IndexedDB (authoritative, high-capacity)
   * 2. localStorage (for old/existing users who had data saved previously)
   * Automatically migrates legacy localStorage data into IndexedDB.
   */
  public static async loadProfile(userEmail: string): Promise<UserProfileDatabase | null> {
    if (typeof window === 'undefined' || !userEmail) return null;

    const normEmail = userEmail.toLowerCase().trim();

    // 1. Check IndexedDB
    try {
      const db = await openDatabase();
      const profile = await new Promise<UserProfileDatabase | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(normEmail);

        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });

      if (profile && Array.isArray(profile.datasets)) {
        return profile;
      }
    } catch (err) {
      console.warn('IndexedDB read warning:', err);
    }

    // 2. Backward compatibility: Check localStorage for old users
    try {
      const legacyKey = this.getLegacyStorageKey(normEmail);
      const legacyData = localStorage.getItem(legacyKey);
      if (legacyData) {
        const parsed: UserProfileDatabase = JSON.parse(legacyData);
        if (parsed && Array.isArray(parsed.datasets)) {
          // Migrate old user's work directly into IndexedDB for future large-capacity storage
          this.saveProfile(parsed).catch(() => {});
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Legacy localStorage read warning:', err);
    }

    return null;
  }

  /**
   * Clears a user's stored profile on demand (for explicit reset).
   */
  public static async clearProfile(userEmail: string): Promise<void> {
    if (typeof window === 'undefined' || !userEmail) return;
    const normEmail = userEmail.toLowerCase().trim();

    try {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(normEmail);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {}

    try {
      localStorage.removeItem(this.getLegacyStorageKey(normEmail));
    } catch {}
  }
}
