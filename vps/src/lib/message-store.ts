import type { proto } from "@whiskeysockets/baileys";

const MAX_ENTRIES = 5000;
const TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  message: proto.IMessage;
  at: number;
}

/** Caché en memoria para getMessage (reintentos E2E de WhatsApp). */
export class SessionMessageStore {
  private cache = new Map<string, CacheEntry>();

  set(id: string, message: proto.IMessage): void {
    this.cache.set(id, { message, at: Date.now() });
    this.prune();
  }

  async get(key: proto.IMessageKey): Promise<proto.IMessage | undefined> {
    if (!key.id) return undefined;
    const entry = this.cache.get(key.id);
    if (!entry) return undefined;
    if (Date.now() - entry.at > TTL_MS) {
      this.cache.delete(key.id);
      return undefined;
    }
    return entry.message;
  }

  private prune(): void {
    if (this.cache.size <= MAX_ENTRIES) return;
    const cutoff = Date.now() - TTL_MS;
    for (const [id, entry] of this.cache) {
      if (entry.at < cutoff) this.cache.delete(id);
    }
    if (this.cache.size <= MAX_ENTRIES) return;
    const sorted = [...this.cache.entries()].sort((a, b) => a[1].at - b[1].at);
    const remove = sorted.length - MAX_ENTRIES;
    for (let i = 0; i < remove; i++) {
      this.cache.delete(sorted[i]![0]);
    }
  }
}

const stores = new Map<string, SessionMessageStore>();

export function getSessionMessageStore(businessId: string): SessionMessageStore {
  let store = stores.get(businessId);
  if (!store) {
    store = new SessionMessageStore();
    stores.set(businessId, store);
  }
  return store;
}

export function dropSessionMessageStore(businessId: string): void {
  stores.delete(businessId);
}
