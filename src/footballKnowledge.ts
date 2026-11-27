import { useEffect, useState } from "react";
import type { QuizTier } from "./questionBank";

export type CC0FootballPlayer = {id:string;name:string;aliases:string[];nationalities:string[];birthYears:number[];positions:string[];source:string;sourceCommit:string;licence:"CC0-1.0"};
export type CC0ConnectionsPack = {id:string;groups:{name:string;dimension:string;value:string;memberIds:string[]}[]};
export type CC0StrandsPack = {id:string;spangram:string;words:string[];theme:string};
export type CC0GridPack = {id:string;positions:string[];countries:string[];answers:string[][][]};
export type CC0QuizQuestion = {id:string;factId:string;playerId:string;tier:QuizTier;region:"UK"|"INTERNATIONAL";category:string;question:string;answer:string;options:string[];explanation:string;source:string;matchId:string;eventDate:string};
export type CC0StatPlayer = {id:string;name:string;value?:number;goals?:number;internationalGoalsRecorded?:number;teams?:string[];label?:string};
export type CC0StatPack = {id:string;players:CC0StatPlayer[];metric:string};
export type CC0DraftPlayer = {id:string;name:string;aliases:string[];positions:string[];nationalities:string[];birthYears:number[];worldCupYears:number[];internationalGoalsRecorded:number;worldCupStarts:number;source:string};
export type WorldCupPlayerCard = {id:string;name:string;worldCups:number[];teams:string[];matchIds:string[]};

type FootballKnowledgeShards = {
 footle:{answers:string[]};
 connections:{players:CC0FootballPlayer[];packs:CC0ConnectionsPack[];clubCountryPacks?:unknown[]};
 strands:{packs:CC0StrandsPack[]};
 "football-grid":{players:CC0FootballPlayer[];packs:CC0GridPack[]};
 "the-climb":{questions:CC0QuizQuestion[]};
 "timed-quiz":{questions:CC0QuizQuestion[]};
 "the-reveal":{playerCards:WorldCupPlayerCard[]};
 "goal-packs":{lowballPairs:CC0StatPack[];ladderPacks:CC0StatPack[];football501Packs:CC0StatPack[]};
 "player-stats":{players:CC0DraftPlayer[]};
};
export type FootballKnowledgeKey=keyof FootballKnowledgeShards;
const shardCache=new Map<FootballKnowledgeKey,Promise<unknown>>();
const minimums:Record<FootballKnowledgeKey,number>={footle:500,connections:500,strands:500,"football-grid":500,"the-climb":500,"timed-quiz":500,"the-reveal":500,"goal-packs":500,"player-stats":500};

function validateShard<K extends FootballKnowledgeKey>(key:K,value:unknown):FootballKnowledgeShards[K]{
 if(!value||typeof value!=="object")throw new Error("The CC0 "+key+" content shard is invalid.");
 const data=value as Record<string,unknown>;
 const list=(name:string)=>Array.isArray(data[name])?data[name] as unknown[]:[];
 const count=key==="footle"?list("answers").length:
  key==="connections"?list("packs").length:
  key==="strands"?list("packs").length:
  key==="football-grid"?list("packs").length:
  key==="the-climb"?list("questions").length:
  key==="timed-quiz"?list("questions").length:
  key==="the-reveal"?list("playerCards").length:
  key==="goal-packs"?Math.min(list("lowballPairs").length,list("ladderPacks").length,list("football501Packs").length):
  list("players").length;
 if(count<minimums[key])throw new Error("The CC0 "+key+" shard failed its minimum content check ("+count+").");
 if(key==="connections"&&list("players").length<500)throw new Error("The CC0 connections player list is incomplete.");
 if(key==="football-grid"&&list("players").length<500)throw new Error("The CC0 grid player list is incomplete.");
 if(key==="connections"||key==="football-grid"){
  const players=list("players") as Record<string,unknown>[];
  if(players.some(player=>!player.id||!player.name||player.licence!=="CC0-1.0"))throw new Error("A CC0 player record is missing its identity or licence marker.");
 }
 return data as FootballKnowledgeShards[K];
}

export async function loadFootballKnowledge<K extends FootballKnowledgeKey>(key:K,force=false):Promise<FootballKnowledgeShards[K]>{
 if(force)shardCache.delete(key);
 let promise=shardCache.get(key);
 if(!promise){
  promise=fetch("/data/football-knowledge-"+key+".cc0.json",{cache:force?"no-store":"force-cache"}).then(async response=>{
   if(!response.ok)throw new Error("The CC0 "+key+" database shard is unavailable ("+response.status+").");
   return validateShard(key,await response.json());
  }).catch(error=>{shardCache.delete(key);throw error});
  shardCache.set(key,promise);
 }
 return promise as Promise<FootballKnowledgeShards[K]>;
}

export function useFootballKnowledge<K extends FootballKnowledgeKey>(key:K){
 const [data,setData]=useState<FootballKnowledgeShards[K]|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let live=true;setLoading(true);setError("");
  loadFootballKnowledge(key,attempt>0).then(value=>{if(live)setData(value)}).catch(problem=>{if(live)setError(problem instanceof Error?problem.message:"CC0 football database unavailable.")}).finally(()=>{if(live)setLoading(false)});
  return()=>{live=false};
 },[key,attempt]);
 return {data,loading,error,retry:()=>setAttempt(value=>value+1)};
}

function seededShuffle<T>(items:T[],seed:number):T[]{const copy=[...items];let state=seed>>>0;for(let i=copy.length-1;i>0;i--){state=(Math.imul(state,1664525)+1013904223)>>>0;const j=state%(i+1);[copy[i],copy[j]]=[copy[j],copy[i]]}return copy}
export function makeCC0QuizRound(pool:CC0QuizQuestion[],tier:QuizTier,seed:number,count=5):CC0QuizQuestion[]{
 const eligible=pool.filter(q=>q.tier===tier);if(!eligible.length)return[];
 const uk=seededShuffle(eligible.filter(q=>q.region==="UK"),seed+17),international=seededShuffle(eligible.filter(q=>q.region==="INTERNATIONAL"),seed+31);
 const ukCount=Math.min(uk.length,Math.round(count*.4)),selected=[...uk.slice(0,ukCount),...international.slice(0,count-ukCount)];
 if(selected.length<count)selected.push(...seededShuffle(eligible.filter(q=>!selected.some(x=>x.id===q.id)),seed+43).slice(0,count-selected.length));
 return seededShuffle(selected,seed+59);
}
export function makeCC0DailyQuizRound(pool:CC0QuizQuestion[],seed:number):CC0QuizQuestion[]{
 const plan:{tier:QuizTier;count:number}[]=[{tier:"EASY",count:5},{tier:"MEDIUM",count:5},{tier:"HARD",count:5},{tier:"EXTREME",count:2}],selected:CC0QuizQuestion[]=[];
 plan.forEach((entry,index)=>selected.push(...makeCC0QuizRound(pool,entry.tier,seed+index*101,entry.count)));
 return seededShuffle(selected,seed+997);
}
