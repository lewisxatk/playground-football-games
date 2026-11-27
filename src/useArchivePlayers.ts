import { useEffect, useState } from "react";
import { getArchiveGamePlayers, type ArchiveGamePlayer } from "./careerFileData";

let poolPromise: Promise<ArchiveGamePlayer[]> | null = null;

export function useArchivePlayers(enabled = true) {
  const [players, setPlayers] = useState<ArchiveGamePlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    setLoading(true);
    setError("");
    if (!poolPromise) {
      poolPromise = getArchiveGamePlayers(1600).catch(problem => {
        poolPromise = null;
        throw problem;
      });
    }
    poolPromise.then(result => {
      if (live) setPlayers(result);
    }).catch(problem => {
      if (live) setError(problem instanceof Error ? problem.message : "Player database unavailable.");
    }).finally(() => {
      if (live) setLoading(false);
    });
    return () => { live = false; };
  }, [enabled]);

  return { players, loading, error };
}
