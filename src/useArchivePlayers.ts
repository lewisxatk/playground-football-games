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

type StaticPlayerIndex = {
  source?: string;
  licence?: string;
  releaseTag?: string;
  generatedAt?: string;
  sourceAssetSha256?: string;
  playerCount?: number;
  shardSize?: number;
  shardCount?: number;
  caveats?: string[];
  shards?: { file:string; count:number; bytes?:number; sha256?:string }[];
};
type StaticPlayerShard = { releaseTag:string; source:string; licence:string; players:ArchiveGamePlayer[] };
let staticIndexPromise:Promise<StaticPlayerIndex|null>|null=null;

function seededHash(value:string):number{
  let hash=2166136261;
  for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return hash>>>0;
}

async function getStaticIndex():Promise<StaticPlayerIndex|null>{
  if(!staticIndexPromise){
    staticIndexPromise=fetch("/data/player-pool/manifest.json",{cache:"force-cache"})
      .then(async response=>{
        if(!response.ok)return null;
        const index=await response.json() as StaticPlayerIndex;
        if(index.source!=="OpenFootballBase-Data"||index.licence!=="CC BY-SA 4.0"||
          !index.releaseTag||!Array.isArray(index.shards)||index.shards.length<32||
          !Number.isFinite(index.playerCount))return null;
        return index;
      }).catch(()=>null);
  }
  return staticIndexPromise;
}

async function loadStaticPlayerShard(seed:string,limit:number):Promise<ArchiveGamePlayer[]|null>{
  const index=await getStaticIndex();
  if(!index?.shards?.length)return null;
  const needed=Math.max(1,Math.ceil(limit/Math.max(1,index.shardSize??1000)));
  const start=seededHash(seed)%index.shards.length;
  const selected=Array.from({length:Math.min(needed,index.shards.length)},(_,i)=>index.shards![(start+i)%index.shards!.length]);
  const cacheKey="static:"+index.releaseTag+":"+selected.map(shard=>shard.file).join(",")+":"+seed+":"+limit;
  const cached=await readCache(cacheKey);
  if(cached)return cached.slice(0,limit);
  const payloads=await Promise.all(selected.map(async shard=>{
    if(!shard?.file||!Number.isInteger(shard.count))throw new Error("Static player shard metadata is invalid.");
    const response=await fetch("/data/player-pool/"+shard.file,{cache:"force-cache"});
    if(!response.ok)throw new Error("Static player shard could not be loaded ("+response.status+").");
    const payload=await response.json() as StaticPlayerShard;
    if(payload.releaseTag!==index.releaseTag||!Array.isArray(payload.players)||payload.players.length!==shard.count)
      throw new Error("Static player shard does not match its release manifest.");
    return payload.players;
  }));
  const all=payloads.flat();
  const distinct=Array.from(new Map(all.filter(player=>player?.id&&player.name).map(player=>[player.id,player])).values());
  // The archive shards are hash-distributed. Seeded ordering gives every session
  // a different draw, while the date seed keeps the Daily draw shared.
  const sampled=distinct.sort((a,b)=>seededHash(seed+":"+a.id)-seededHash(seed+":"+b.id)).slice(0,limit);
  if(sampled.length<Math.min(limit,500))throw new Error("Static player sample is too small to start a game.");
  await writeCache(cacheKey,sampled);
  return sampled;
}

function poolFor(key: string, limit: number): Promise<ArchiveGamePlayer[]> {
  const existing = memoryPools.get(key);
  if (existing) return existing;
  const request = (async () => {
    try {
      const staticPlayers=await loadStaticPlayerShard(key,limit);
      if(staticPlayers)return staticPlayers;
    } catch(error) {
      // Preserve the existing remote Parquet path as a safety fallback while
      // a new shard set is being deployed or an individual static asset fails.
    }
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
