import { useEffect, useState } from "react";
export type CC0QuizTier = "EASY" | "MEDIUM" | "HARD" | "EXTREME";
export type CC0FootballPlayer = { id:string; name:string; aliases:string[]; nationalities:string[]; birthYears:number[]; positions:string[]; source:string; sourceCommit:string; licence:"CC0-1.0" };
export type CC0ConnectionsPack = { id:string; groups:{name:string;dimension:string;value:string;memberIds:string[]}[] };
export type CC0StrandsPack = { id:string; spangram:string; words:string[]; theme:string };
export type CC0StatPlayer = {id:string;name:string;value?:number;goals?:number;internationalGoalsRecorded?:number;teams?:string[];label?:string};
export type CC0StatPack = {id:string;players:CC0StatPlayer[];metric:string};
export type CC0DraftPlayer = {id:string;name:string;positions:string[];nationalities:string[];birthYears:number[];internationalGoalsRecorded:number;worldCupStarts:number;source:string};
export type CC0QuizQuestion = {id:string;factId:string;playerId:string;tier:CC0QuizTier;region:"UK"|"INTERNATIONAL";category:string;question:string;answer:string;options:string[];explanation:string;source:string;matchId:string;eventDate:string};
type WorldCupPlayerCard = {id:string;name:string;worldCups:number[];teams:string[];matchIds:string[]};
type KnowledgeDatabase = {
 schemaVersion:number; players:CC0FootballPlayer[];
 worldCup?:{playerCards?:WorldCupPlayerCard[]};
 games?:{connections?:{packs:CC0ConnectionsPack[]};strands?:{packs:CC0StrandsPack[]};"the-climb"?:{questions:CC0QuizQuestion[]};"timed-quiz"?:{questions:CC0QuizQuestion[]};lowball?:{pairs:CC0StatPack[]};ladder?:{packs:CC0StatPack[]};"football-501"?:{packs:CC0StatPack[]};"draft-xi"?:{players:CC0DraftPlayer[]};"scout-signal"?:{players:CC0DraftPlayer[]}};
 report:{counts:Record<string,number>;games:Record<string,{count:number;ready:boolean;integrated?:boolean}>};
};
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
 const [database,setDatabase]=useState<KnowledgeDatabase|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let live=true;setLoading(true);setError("");loadFootballKnowledge(attempt>0).then(db=>{if(live)setDatabase(db)}).catch(problem=>{if(live)setError(problem instanceof Error?problem.message:"CC0 football database unavailable.")}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[attempt]);
 return {players:database?.players??[],connectionsPacks:database?.games?.connections?.packs??[],strandsPacks:database?.games?.strands?.packs??[],playerCards:database?.worldCup?.playerCards??[],climbQuestions:database?.games?.["the-climb"]?.questions??[],timedQuizQuestions:database?.games?.["timed-quiz"]?.questions??[],lowballPairs:database?.games?.lowball?.pairs??[],ladderPacks:database?.games?.ladder?.packs??[],football501Packs:database?.games?.["football-501"]?.packs??[],draftPlayers:database?.games?.["draft-xi"]?.players??[],scoutPlayers:database?.games?.["scout-signal"]?.players??[],loading,error,retry:()=>setAttempt(value=>value+1)};
}
function seededShuffle<T>(items:T[],seed:number):T[]{const copy=[...items];let state=seed>>>0;for(let i=copy.length-1;i>0;i--){state=(Math.imul(state,1664525)+1013904223)>>>0;const j=state%(i+1);[copy[i],copy[j]]=[copy[j],copy[i]]}return copy}
export function makeCC0QuizRound(pool:CC0QuizQuestion[],tier:CC0QuizTier,seed:number,count=5):CC0QuizQuestion[]{
 const eligible=pool.filter(q=>q.tier===tier);if(!eligible.length)return[];
 const uk=seededShuffle(eligible.filter(q=>q.region==="UK"),seed+17),international=seededShuffle(eligible.filter(q=>q.region==="INTERNATIONAL"),seed+31);
 const ukCount=Math.min(uk.length,Math.round(count*.4)),selected=[...uk.slice(0,ukCount),...international.slice(0,count-ukCount)];
 if(selected.length<count)selected.push(...seededShuffle(eligible.filter(q=>!selected.some(x=>x.id===q.id)),seed+43).slice(0,count-selected.length));
 return seededShuffle(selected,seed+59);
}
export function makeCC0DailyQuizRound(pool:CC0QuizQuestion[],seed:number):CC0QuizQuestion[]{
 const plan:{tier:CC0QuizTier;count:number}[]=[{tier:"EASY",count:5},{tier:"MEDIUM",count:5},{tier:"HARD",count:5},{tier:"EXTREME",count:2}],selected:CC0QuizQuestion[]=[];
 plan.forEach((entry,index)=>selected.push(...makeCC0QuizRound(pool,entry.tier,seed+index*101,entry.count)));
 return seededShuffle(selected,seed+997);
}
