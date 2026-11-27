import { useEffect, useState } from "react";
export type CC0QuizTier = "EASY" | "MEDIUM" | "HARD" | "EXTREME";

export type CC0FootballPlayer = {id:string;name:string;aliases:string[];nationalities:string[];birthYears:number[];positions:string[];source:string;sourceCommit?:string;licence:"CC0-1.0";wikidataId?:string;internationalGoalsRecorded?:number;worldCupStarts?:number;worldCupYears?:number[]};
export type CC0Club = {id:string;name:string;countries:string[];source:string;sourceCommit:string;licence:"CC0-1.0"};
export type CC0InternationalMatch = {id:string;date:string;year:number;home:string;away:string;homeScore:number;awayScore:number;tournament:string;city?:string;country?:string;neutral:boolean;source:unknown};
export type CC0InternationalGoalEvent = {id:string;date:string;year:number;home:string;away:string;team:string;scorer:string;minute:string;penalty:boolean;ownGoal:boolean;eligibleForScorerTotals:boolean;source:unknown};
export type CC0WorldCupLineup = {id:string;year:number;date:string;team:string;opponent:string;starters:string[];tournament:string;round:string};
export type CC0ConnectionsPack = {id:string;groups:{name:string;dimension:string;value:string;memberIds:string[]}[]};
export type CC0StrandsPack = {id:string;spangram:string;words:string[];theme:string};
export type CC0GridPack = {id:string;positions:string[];countries:string[];answers:string[][][]};
export type CC0QuizQuestion = {id:string;factId:string;playerId:string;tier:CC0QuizTier;region:"UK"|"INTERNATIONAL";category:string;question:string;answer:string;options:string[];explanation:string;source:string;matchId:string;eventDate:string};
export type CC0StatPlayer = {id:string;name:string;value?:number;goals?:number;internationalGoalsRecorded?:number;teams?:string[];label?:string};
export type CC0StatPack = {id:string;players:CC0StatPlayer[];metric?:string};
export type CC0DraftPlayer = {id:string;name:string;aliases:string[];positions:string[];nationalities:string[];birthYears:number[];worldCupYears:number[];internationalGoalsRecorded:number;worldCupStarts:number;source:string};
export type WorldCupPlayerCard = {id:string;name:string;worldCups:number[];teams:string[];matchIds:string[]};
export type CC0CareerSpell = {id:string;statementId:string;clubId:string;clubQid:string;club:string;startYear:number;endYear:number|null;years:string;source:string;licence:"CC0-1.0"};
export type CC0CareerPlayer = {id:string;playerId:string;qid:string;name:string;fullName:string;nationality:string;position:string;aliases:string[];birthYears:number[];spells:CC0CareerSpell[];clubs:string[];firstYear:number|null;lastYear:number|null;source:string;licence:"CC0-1.0";sourceItemUrl:string;sourceRetrievedAt:string};
export type CC0LinkUpPack = {id:string;answerPlayerId:string;startPlayerId:string;endPlayerId:string;startClub:string;startClubId:string;endClub:string;endClubId:string;optionPlayerIds:string[];explanation:string;source:{repo:string;licence:string;url:string};licence:"CC0-1.0"};

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
 "career-history":{players:CC0CareerPlayer[];careerFileCandidates:CC0CareerPlayer[];cultHeroCandidates:CC0CareerPlayer[];linkUpPacks:CC0LinkUpPack[];meta:{status:string;endpoint:string;retrievedAt:string;rawRows:number;acceptedSpells:number;players:number;eligibleCareerFile:number;eligibleCultHero:number;error:string|null}};
};
export type FootballKnowledgeKey=keyof FootballKnowledgeShards;
const shardCache=new Map<FootballKnowledgeKey,Promise<unknown>>();
const minimums:Record<FootballKnowledgeKey,number>={core:500,matches:500,"goal-events":500,"world-cup":500,footle:500,connections:500,strands:500,"football-grid":500,"the-climb":500,"timed-quiz":500,"the-reveal":500,"goal-packs":500,"player-stats":500,"career-history":0};

function validateShard<K extends FootballKnowledgeKey>(key:K,value:unknown):FootballKnowledgeShards[K]{
 if(!value||typeof value!=="object")throw new Error("The CC0 "+key+" content shard is invalid.");
 const data=value as Record<string,unknown>;
 const list=(name:string)=>Array.isArray(data[name])?data[name] as unknown[]:[];
 const count=key==="core"?list("players").length:\n  key==="matches"?list("matches").length:\n  key==="goal-events"?list("events").length:\n  key==="world-cup"?list("lineups").length:\n  key==="footle"?list("answers").length:
  key==="connections"?list("packs").length:
  key==="strands"?list("packs").length:
  key==="football-grid"?list("packs").length:
  key==="the-climb"?list("questions").length:
  key==="timed-quiz"?list("questions").length:
  key==="the-reveal"?list("playerCards").length:
  key==="goal-packs"?Math.min(list("lowballPairs").length,list("ladderPacks").length,list("football501Packs").length):
  key==="career-history"?list("players").length:
  list("players").length;
 if(count<minimums[key])throw new Error("The CC0 "+key+" shard failed its minimum content check ("+count+").");
 if(key==="core"){
  if(list("clubs").length<500)throw new Error("The CC0 canonical club directory is incomplete.");
  const players=list("players") as Record<string,unknown>[],clubs=list("clubs") as Record<string,unknown>[];
  if(players.some(player=>!player.id||!player.name||player.licence!=="CC0-1.0")||clubs.some(club=>!club.id||!club.name||club.licence!=="CC0-1.0"))throw new Error("A canonical entity is missing its stable ID or CC0 marker.");
 }
 if(key==="matches"&&list("matches").some(match=>{const row=match as Record<string,unknown>;return !row.id||!row.date||!row.home||!row.away||!Number.isInteger(row.homeScore)||!Number.isInteger(row.awayScore)}))throw new Error("An international match record is incomplete.");
 if(key==="goal-events"&&list("events").some(event=>{const row=event as Record<string,unknown>;return !row.id||!row.date||!row.scorer||typeof row.ownGoal!=="boolean"}))throw new Error("An international goal event is incomplete.");
 if(key==="world-cup"){
  const lineups=list("lineups") as Record<string,unknown>[];
  if(lineups.some(row=>!row.id||!Array.isArray(row.starters)||row.starters.length!==11||new Set(row.starters as string[]).size!==11)||list("questions").length<500||list("playerCards").length<500)throw new Error("The World Cup master shard failed its line-up/question/player checks.");
 }
 if(key==="career-history"&&(list("players").length<500||list("linkUpPacks").length<500||list("careerFileCandidates").length<500||list("cultHeroCandidates").length<500))throw new Error("The CC0 career shard is below 500 unique playable records.");
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
