import { useEffect, useState } from "react";
export type CC0FootballPlayer = { id:string; name:string; aliases:string[]; nationalities:string[]; birthYears:number[]; positions:string[]; source:string; sourceCommit:string; licence:"CC0-1.0" };
type KnowledgeDatabase = { schemaVersion:number; players:CC0FootballPlayer[]; report:{counts:Record<string,number>;games:Record<string,{count:number;ready:boolean}>} };
let databasePromise:Promise<KnowledgeDatabase>|null=null;
export async function loadFootballKnowledge(force=false):Promise<KnowledgeDatabase>{
 if(force)databasePromise=null;
 if(!databasePromise)databasePromise=fetch("/data/football-knowledge.cc0.json",{cache:force?"no-store":"force-cache"}).then(async response=>{
  if(!response.ok)throw new Error("The CC0 football database is unavailable ("+response.status+").");
  const database=await response.json() as KnowledgeDatabase;
  if(database.schemaVersion!==1||!Array.isArray(database.players)||database.players.length<500||database.players.some(p=>!p.id||!p.name||p.licence!=="CC0-1.0"))throw new Error("The CC0 football database failed its identity and licence checks.");
  return database;
 }).catch(error=>{databasePromise=null;throw error});
 return databasePromise;
}
export function useFootballKnowledge(){
 const [players,setPlayers]=useState<CC0FootballPlayer[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let live=true;setLoading(true);setError("");loadFootballKnowledge(attempt>0).then(db=>{if(live)setPlayers(db.players)}).catch(problem=>{if(live)setError(problem instanceof Error?problem.message:"CC0 football database unavailable.")}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[attempt]);
 return {players,loading,error,retry:()=>setAttempt(value=>value+1)};
}
