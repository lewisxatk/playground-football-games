import { useCallback, useEffect, useState } from "react";
import { getArchiveGamePlayers, type ArchiveGamePlayer } from "./careerFileData";

const memoryPools = new Map<string, Promise<ArchiveGamePlayer[]>>();
const DB_NAME = "playground-football-cache";
const STORE_NAME = "player-pools";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

function openCache(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise(resolve => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

async function readCache(key: string): Promise<ArchiveGamePlayer[] | null> {
  const db = await openCache();
  if (!db) return null;
  return new Promise(resolve => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
    request.onsuccess = () => {
      const saved = request.result as { at:number; players:ArchiveGamePlayer[] } | undefined;
      resolve(saved && Date.now()-saved.at<CACHE_TTL && Array.isArray(saved.players) ? saved.players : null);
      db.close();
    };
    request.onerror = () => { resolve(null); db.close(); };
  });
}

async function writeCache(key: string, players: ArchiveGamePlayer[]): Promise<void> {
  const db = await openCache();
  if (!db) return;
  await new Promise<void>(resolve => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ at:Date.now(), players }, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.onabort = () => resolve();
  });
  db.close();
}

function poolFor(key: string, limit: number): Promise<ArchiveGamePlayer[]> {
  const existing = memoryPools.get(key);
  if (existing) return existing;
  const request = (async () => {
    const cached = await readCache(key);
    if (cached) return cached.slice(0, limit);
    const players = await getArchiveGamePlayers(limit, key);
    await writeCache(key, players);
    return players;
  })().catch(error => {
    memoryPools.delete(key);
    throw error;
  });
  memoryPools.set(key, request);
  return request;
}

export function useArchivePlayers(enabled = true, seed = "PLAYGROUND-GAMES-2026-01", limit = 1600) {
  const [players, setPlayers] = useState<ArchiveGamePlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const key = seed + ":" + limit;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let live = true;
    setLoading(true);
    setError("");
    poolFor(key, limit).then(result => {
      if (live) setPlayers(result);
    }).catch(problem => {
      if (live) setError(problem instanceof Error ? problem.message : "Player database unavailable.");
    }).finally(() => {
      if (live) setLoading(false);
    });
    return () => { live = false; };
  }, [enabled, key, limit, attempt]);

  const retry = useCallback(() => {
    memoryPools.delete(key);
    setPlayers([]);
    setError("");
    setAttempt(value => value + 1);
  }, [key]);

  return { players, loading, error, retry };
}
