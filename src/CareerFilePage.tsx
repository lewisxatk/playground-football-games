import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { getCandidates, getPlayer, getStatEligibleCandidates, getTransferHints, type Candidate, type LeagueCode, type Player, type Transfer, type ArchiveGamePlayer } from "./careerFileData";
import { getStaticArchivePlayers } from "./useArchivePlayers";
import "./career-file.css";

type Mode = "EASY" | "MEDIUM" | "HARD" | "EXTREME";
type Row = { id:string; season:string; club:string; clubKey:string; loan:boolean; apps:number|null; goals:number|null; covered:boolean; spellApps:number|null; spellGoals:number|null };
type FreeNote = { id:string; label:string; value:string };
type Hint = { id:string; label:string; cost:number; value:string; available:boolean };

function archivePlayerToCareerFile(raw:ArchiveGamePlayer):Player{
 const spells=(raw.spells??[]).map((spell,index)=>({
   seq:Number(spell.seq??index),
   years:String(spell.years??""),
   start:spell.startYear??null,
   end:spell.endYear??spell.startYear??null,
   club:String(spell.club??""),
   clubLink:String(spell.clubLink??""),
   clubQid:String(spell.clubQid??""),
   loan:Boolean(spell.loan),
   apps:spell.apps??null,
   goals:spell.goals??null,
   sourceTitle:String(spell.sourceTitle??raw.careerSourceTitle??""),
   sourceRevision:spell.sourceRevision??raw.careerSourceRevision??null
 }));
 const sourceStats=raw.seasonStats??raw.stats??[];
 const stats=sourceStats.map(stat=>({
   club:String(stat.club??""),
   clubLink:String(stat.clubLink??""),
   clubQid:String(stat.clubQid??""),
   season:String(stat.season??""),
   apps:stat.apps??null,
   goals:stat.goals??null,
   assists:stat.assists??null
 }));
 const article=raw.careerSourceTitle?.trim();
 return {
   id:raw.id,
   name:raw.name,
   fullName:raw.fullName??raw.name,
   nationality:raw.nationality??"",
   position:raw.position??"",
   height:raw.heightCm??null,
   birthDate:raw.birthDate??"",
   birthPrecision:raw.birthPrecision??null,
   birthplace:raw.birthPlace??"",
   spells,
   stats,
   caps:raw.caps??null,
   internationalGoals:raw.internationalGoals??null,
   teams:raw.nationalTeams??[],
   wikipediaUrl:article?"https://en.wikipedia.org/wiki/"+encodeURIComponent(article.replace(/ /g,"_")):""
 };
}
function archivePlayerCandidate(player:Player,raw:ArchiveGamePlayer):Candidate{
 const country=clean(raw.currentCountry??"");
 const league=clean(raw.currentLeague??"");
 const normalisedLeague=league.replace(/[^a-z]/g,"");
 const englishLeague=normalisedLeague.startsWith("efl")||normalisedLeague.includes("englishfootball")||
   ["premierleague","championship","leagueone","leaguetwo","nationalleague"].includes(normalisedLeague);
 const region:Candidate["region"]=country.includes("england")||country.includes("angleterre")?"ENGLISH":
   country.includes("united kingdom")||country.includes("great britain")||country.includes("royaume uni")||country==="uk"||country==="gb"? (englishLeague?"ENGLISH":"INTERNATIONAL"):
   country?"INTERNATIONAL":league.replace(/[^a-z]/g,"").startsWith("eng")||league.includes("englishfootball")?"ENGLISH":
   league?"INTERNATIONAL":undefined;
 return {
   id:player.id,
   name:player.name,
   apps:raw.appearances??0,
   spells:player.spells.length,
   clubs:new Set(player.spells.map(spell=>spell.clubQid||clean(spell.clubLink||spell.club)).filter(Boolean)).size,
   statSeasons:raw.seasons??0,
   region
 };
}

const MODES: { name:Mode; note:string; colour:string }[] = [
  {name:"EASY",note:"Famous players with long, well-documented careers",colour:"lime"},
  {name:"MEDIUM",note:"Established players and recognisable career paths",colour:"blue"},
  {name:"HARD",note:"Less obvious players and more demanding career clues",colour:"orange"},
  {name:"EXTREME",note:"Specialist careers, shorter records and fewer obvious clues",colour:"violet"}
];

const LEAGUES: {label:string;code:LeagueCode}[] = [
  {label:"Premier League",code:"ENG-PL"}
];
const clean=(s:string)=>s.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
const yearOf=(s:string):number|null=>{const m=s.match(/(?:19|20)\d{2}/);return m?Number(m[0]):null;};
const fmt=(v:number|null|undefined)=>v==null?"—":v.toLocaleString("en-GB");
const ordered=(p:Player)=>[...p.spells].sort((a,b)=>(a.start??9999)-(b.start??9999)||a.seq-b.seq);
function stableHash(value:string):number{
  let hash=2166136261;
  for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return hash>>>0;
}
function seededRandom(seed:number){let state=seed>>>0;return()=>{state+=0x6D2B79F5;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function shuffleCandidates<T>(items:T[],limit:number,seed?:string):T[]{
  const copy=[...items];const random=seed?seededRandom(stableHash(seed)):Math.random;
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy.slice(0,limit);
}
const RECENT_PLAYER_KEY="playground.career-file.recent.v1";
function loadRecentCareerIds():Set<string>{
  try{
    const value=JSON.parse(localStorage.getItem(RECENT_PLAYER_KEY)||"[]");
    return new Set(Array.isArray(value)?value.filter((id):id is string=>typeof id==="string").slice(-600):[]);
  }catch{return new Set();}
}
function persistRecentCareerIds(ids:Set<string>){
  try{localStorage.setItem(RECENT_PLAYER_KEY,JSON.stringify(Array.from(ids).slice(-600)));}catch{/* private browsing may disable storage */}
}
function makeRows(p:Player):Row[]{
  const rows:Row[]=[];
  for(const spell of ordered(p)){
    const start=spell.start??yearOf(spell.years),end=spell.end??start;
    const clubKey=spell.clubQid||clean(spell.clubLink||spell.club);
    if(start==null){
      rows.push({id:"s"+spell.seq,season:spell.years||"Date not recorded",club:spell.club,clubKey,loan:spell.loan,
        apps:null,goals:null,covered:false,spellApps:spell.apps,spellGoals:spell.goals});
      continue;
    }
    for(let y=start;y<=Math.min(end??start,start+35);y++){
      const found=p.stats.filter(stat=>{
        if(yearOf(stat.season)!==y)return false;
        // Prefer stable Wikidata identity, then page links; fall back to the displayed club
        // name because career infobox links may be redirects while the stats table uses another title.
        if(spell.clubQid&&stat.clubQid&&spell.clubQid===stat.clubQid)return true;
        if(spell.clubLink&&stat.clubLink&&clean(spell.clubLink)===clean(stat.clubLink))return true;
        return clean(spell.club)===clean(stat.club);
      });
      const sourceSeason=found.find(stat=>stat.season)?.season.trim();
      const displayedSeason=sourceSeason?sourceSeason.replace(/[–—-]/g,"/"):y+"/"+String((y+1)%100).padStart(2,"0");
      rows.push({id:spell.seq+"-"+y,season:displayedSeason,
        club:spell.club,clubKey,loan:spell.loan,
        apps:found.length&&found.some(x=>x.apps!==null)?found.reduce((n,x)=>n+(x.apps??0),0):null,
        goals:found.length&&found.some(x=>x.goals!==null)?found.reduce((n,x)=>n+(x.goals??0),0):null,
        covered:found.length>0,spellApps:y===start?spell.apps:null,spellGoals:y===start?spell.goals:null});
    }
  }
  return rows;
}
const ageOf=(p:Player)=>{
  if(!p.birthDate||p.birthPrecision!==11)return "";
  const d=new Date(p.birthDate+"T00:00:00Z");if(Number.isNaN(d.getTime()))return "";
  const now=new Date();let age=now.getUTCFullYear()-d.getUTCFullYear();
  if(now.getUTCMonth()<d.getUTCMonth()||(now.getUTCMonth()===d.getUTCMonth()&&now.getUTCDate()<d.getUTCDate()))age--;
  return String(age);
};
function fits(c:Candidate,m:Mode){
  // Difficulty is based on career footprint, not a short hard-coded celebrity list.
  // The archive remains the source of the career and season rows shown in each file.
  if(c.statSeasons<2)return false;
  if(m==="EASY")return c.apps>=550&&c.clubs>=3;
  if(m==="MEDIUM")return c.apps>=220&&c.clubs>=3;
  if(m==="HARD")return c.apps>=70&&c.clubs>=2;
  return c.apps>=20&&c.apps<220&&c.clubs>=2;
}
function positionLabel(raw:string){
  const value=raw.toUpperCase();
  if(/GK|GOALKEEPER/.test(value))return "Goalkeeper";
  if(/DF|DEFENDER|BACK/.test(value))return "Defender";
  if(/MF|MIDFIELDER|MID/.test(value))return "Midfielder";
  if(/FW|FORWARD|STRIKER|ATTACK/.test(value))return "Forward";
  return raw.trim();
}
function randomFreeRows(rows:Row[],seed?:string):string[]{
  const available=rows.filter(row=>row.covered&&row.apps!==null&&row.goals!==null);
  const shuffled=shuffleCandidates(available,available.length,seed);
  const selected:Row[]=[];
  for(const row of shuffled){
    if(selected.length>=2)break;
    if(!selected.some(existing=>existing.clubKey===row.clubKey)&&!selected.some(existing=>existing.season===row.season))selected.push(row);
  }
  for(const row of shuffled){
    if(selected.length>=2)break;
    if(!selected.some(existing=>existing.id===row.id))selected.push(row);
  }
  return selected.map(row=>row.id);
}
function makeFreeNote(player:Player,seed?:string):FreeNote|null{
  const career=ordered(player);
  const first=career[0],last=career[career.length-1];
  const broadPosition=positionLabel(player.position);
  const options:FreeNote[]=[];
  if(broadPosition)options.push({id:"position",label:"Position group",value:broadPosition});
  if(player.nationality)options.push({id:"nationality",label:"Nationality",value:player.nationality});
  if(first?.start&&last?.end)options.push({id:"span",label:"Career window",value:first.start+"–"+last.end});
  if(!options.length)return null;
  return options[seed?Math.floor(seededRandom(stableHash(seed))()*options.length):Math.floor(Math.random()*options.length)];
}
function matches(input:string,p:Player){
  const g=clean(input);if(!g)return false;
  const accepted=new Set([clean(p.name),clean(p.fullName)]);
  const particles=new Set(["van","von","de","del","di","da","dos","das","du","la","le","ter","den","der"]);
  for(const name of [p.name,p.fullName]){
    const bits=clean(name).split(" ").filter(Boolean);
    if(bits.length){
      accepted.add(bits[bits.length-1]);
      if(bits.length>1&&particles.has(bits[bits.length-2]))accepted.add(bits.slice(-2).join(" "));
      if(bits.length>2&&particles.has(bits[bits.length-3]))accepted.add(bits.slice(-3).join(" "));
    }
  }
  return accepted.has(g);
}
function careerHint(p:Player):Hint[]{
  const spells=ordered(p),first=spells[0],last=spells[spells.length-1];
  const totalApps=p.spells.reduce((n,s)=>n+(s.apps??0),0),totalGoals=p.spells.reduce((n,s)=>n+(s.goals??0),0);
  const age=ageOf(p);
  return [
    {id:"position",label:"Position",cost:90,value:positionLabel(p.position)||"Not listed in the top-five league squad records",available:true},
    {id:"nationality",label:"Nationality",cost:90,value:p.nationality||"Not listed in the top-five league squad records",available:true},
    {id:"age",label:"Age / birth year",cost:90,value:age?age+" years old":p.birthDate?"Born "+p.birthDate.slice(0,4):"Birth date not recorded",available:!!(age||p.birthDate)},
    {id:"height",label:"Height",cost:70,value:p.height?p.height+" cm":"Height not recorded",available:p.height!=null},
    {id:"birthplace",label:"Birthplace",cost:100,value:p.birthplace||"Birthplace not recorded",available:!!p.birthplace},
    {id:"first",label:"First senior club",cost:120,value:first?.club??"",available:!!first?.club},
    {id:"last",label:"Latest listed club",cost:120,value:last?.club??"",available:!!last?.club},
    {id:"span",label:"Career span",cost:100,value:first?.start&&last?.end?first.start+"–"+last.end:"Career dates are incomplete",available:!!(first?.start||last?.end)},
    {id:"clubs",label:"Number of clubs",cost:90,value:new Set(p.spells.map(s=>s.club)).size+" different clubs",available:true},
    {id:"apps",label:"Senior appearances",cost:150,value:fmt(totalApps)+" recorded appearances",available:totalApps>0},
    {id:"goals",label:"Senior goals",cost:150,value:fmt(totalGoals)+" recorded goals",available:totalGoals>0},
    {id:"international",label:"International record",cost:160,value:p.caps==null?"International caps not recorded":fmt(p.caps)+" caps · "+fmt(p.internationalGoals)+" goals"+(p.teams.length?" · "+p.teams.slice(0,5).join(", "):""),available:p.caps!=null||p.teams.length>0}
  ];
}

export default function CareerFilePage({dailyDone=false,onDailyComplete}:{dailyDone?:boolean;onDailyComplete?:(score:number)=>void}){
  const [mode,setMode]=useState<Mode>("EASY");
  const [league,setLeague]=useState<LeagueCode>("ENG-PL");
  const [pool,setPool]=useState<Candidate[]>([]);
  const [player,setPlayer]=useState<Player|null>(null);
  const [rows,setRows]=useState<Row[]>([]);
  const [guess,setGuess]=useState("");
  const [attempts,setAttempts]=useState(0);
  const [score,setScore]=useState(1000);
  const [revealed,setRevealed]=useState<string[]>([]);
  const [freeRows,setFreeRows]=useState<string[]>([]);
  const [freeNote,setFreeNote]=useState<FreeNote|null>(null);
  const [opened,setOpened]=useState<string[]>([]);
  const [transfers,setTransfers]=useState<Transfer[]|null>(null);
  const [feesBusy,setFeesBusy]=useState(false);
  const [feesError,setFeesError]=useState("");
  const [status,setStatus]=useState<"playing"|"won"|"lost">("playing");
  const [busy,setBusy]=useState(true);
  const [loadingPlayer,setLoadingPlayer]=useState(false);
  const [error,setError]=useState("");
  const [round,setRound]=useState(0);
  const [note,setNote]=useState("");
  const [copied,setCopied]=useState(false);
  const seen=useRef<Set<string>>(loadRecentCareerIds());
  const staticPlayers=useRef<Map<string,Player>>(new Map());

  const newPlayer=useCallback(async(deck:Candidate[],selectedMode:Mode)=>{
    const options=deck.filter(c=>fits(c,selectedMode));
    if(!options.length)throw new Error("There are no candidate files for "+selectedMode+" in this league selection. Try another difficulty.");
    const dailyDraw=!dailyDone;
    const dailySeed="PLAYGROUND-CAREER-FILE:"+new Date().toISOString().slice(0,10)+":"+selectedMode+":"+league;
    const unused=options.filter(c=>!seen.current.has(c.id));
    const source=dailyDraw?options:(unused.length?unused:options);
    if(!dailyDraw&&!unused.length){seen.current.clear();persistRecentCareerIds(seen.current);setNote("You have worked through this difficulty and league pool. The player draw has restarted.");}
    // All Top Five mixes English clubs with Spain, Italy, Germany and France.
    // Individual league filters remain dedicated to the selected competition.
    const balancedSource=league==="ALL"?(()=>{
      const english=source.filter(candidate=>candidate.region==="ENGLISH");
      const international=source.filter(candidate=>candidate.region==="INTERNATIONAL");
      if(english.length>=54&&international.length>=18){
        return [
          ...shuffleCandidates(english,54,dailyDraw?dailySeed+":EN":undefined),
          ...shuffleCandidates(international,18,dailyDraw?dailySeed+":INT":undefined)
        ];
      }
      return source;
    })():source;
    // The first file of each UTC day is deterministic for everyone on the same
    // difficulty/league. Subsequent files are random practice and avoid repeats.
    // Keep the phone draw bounded: 72 candidates and at most six full lookups.
    const dailyCandidates=dailyDraw?[...balancedSource].sort((a,b)=>a.id.localeCompare(b.id)):balancedSource;
    const draw=shuffleCandidates(dailyCandidates,72,dailyDraw?dailySeed:undefined);
    setLoadingPlayer(true);
    setNote("Picking a fresh file from "+options.length.toLocaleString("en-GB")+" eligible careers…");
    try{
      const eligible=staticPlayers.current.size
        ?draw.filter(candidate=>{
          const cached=staticPlayers.current.get(candidate.id);
          return Boolean(cached&&randomFreeRows(makeRows(cached),dailyDraw?dailySeed+":"+candidate.id:undefined).length>=2);
        })
        :await getStatEligibleCandidates(draw);
      const rankByCoverage=(items:Candidate[])=>[...items].sort((a,b)=>b.statSeasons-a.statSeasons||a.id.localeCompare(b.id));
      const englishEligible=rankByCoverage(eligible.filter(candidate=>candidate.region==="ENGLISH"));
      const internationalEligible=rankByCoverage(eligible.filter(candidate=>candidate.region==="INTERNATIONAL"));
      const ranked=league==="ALL"&&englishEligible.length>=27&&internationalEligible.length>=9
        ?[...englishEligible.slice(0,27),...internationalEligible.slice(0,9)]
        :rankByCoverage(eligible);
      let lastProblem="No candidate in this draw had two complete season-stat rows.";
      for(const choice of ranked.slice(0,staticPlayers.current.size?36:6)){
        seen.current.add(choice.id);persistRecentCareerIds(seen.current);
        try{
          const record=staticPlayers.current.get(choice.id)??await getPlayer(choice.id);
          const timeline=makeRows(record);
          const free=randomFreeRows(timeline,dailyDraw?dailySeed+":"+choice.id:undefined);
          const freeSeasons=new Set(free.map(id=>timeline.find(row=>row.id===id)?.season).filter(Boolean));
          if(!timeline.length||free.length<2||freeSeasons.size<2){lastProblem="This career did not have two complete, matching season-stat clues from different seasons.";continue;}
          const note=makeFreeNote(record,dailyDraw?dailySeed+":"+choice.id:undefined);
          setPlayer(record);setRows(timeline);setFreeRows(free);setRevealed(free);setFreeNote(note);
          setOpened(note?[note.id]:[]);setRound(n=>n+1);setStatus("playing");setNote("");
          return;
        }catch(problem){
          lastProblem=problem instanceof Error?problem.message:"Could not read this player's career file.";
        }
      }
      throw new Error("This draw did not contain a complete player file. Choose Next Player to draw again. "+lastProblem);
    }finally{setLoadingPlayer(false);}
  },[dailyDone,league]);

  useEffect(()=>{
    let live=true;setBusy(true);setError("");
    setPlayer(null);setRows([]);setOpened([]);setRevealed([]);setFreeRows([]);setFreeNote(null);setTransfers(null);setFeesError("");
    setGuess("");setAttempts(0);setScore(1000);setStatus("playing");setNote("");
    (async()=>{
      const isDaily=!dailyDone;
      const seed=isDaily
        ?"PLAYGROUND-CAREER-FILE:"+new Date().toISOString().slice(0,10)+":"+mode+":"+league
        :"PLAYGROUND-CAREER-FILE:PRACTICE:"+String(Date.now())+":"+mode+":"+league;
      const rawPlayers=await getStaticArchivePlayers(seed,3200);
      if(live&&rawPlayers?.length){
        const mapped=rawPlayers.map(archivePlayerToCareerFile);
        staticPlayers.current=new Map(mapped.map(player=>[player.id,player]));
        const list=mapped.map(player=>archivePlayerCandidate(player,rawPlayers.find(raw=>raw.id===player.id)!))
          .filter(candidate=>candidate.region==="ENGLISH"&&candidate.statSeasons>=2);
        if(list.length>=50){
          setPool(list);
          await newPlayer(list,mode);
          return;
        }
      }
      staticPlayers.current.clear();
      const list=await getCandidates(league);
      if(!live)return;
      setPool(list);
      await newPlayer(list,mode);
    })()
      .catch(e=>{if(live)setError(e instanceof Error?e.message:"Could not open the player archive.");})
      .finally(()=>{if(live)setBusy(false);});
    return()=>{live=false;};
  },[league,mode,newPlayer]);

  const hints=useMemo(()=>player?careerHint(player):[],[player]);
  const left=Math.max(0,10-attempts),revealedCount=revealed.length;
  const unlock=(hint:Hint)=>{
    if(!player||opened.includes(hint.id)||!hint.available||status!=="playing")return;
    setOpened(v=>[...v,hint.id]);setScore(v=>Math.max(0,v-hint.cost));
  };
  const revealRow=(row:Row)=>{
    if(revealed.includes(row.id)||status!=="playing")return;
    setRevealed(v=>[...v,row.id]);setScore(v=>Math.max(0,v-35));
  };
  const revealAll=()=>{
    const extra=rows.filter(r=>!revealed.includes(r.id));
    setRevealed(rows.map(r=>r.id));setScore(v=>Math.max(0,v-extra.length*35));
  };
  const revealFees=async()=>{
    if(!player||opened.includes("fees")||status!=="playing"||feesBusy)return;
    setFeesBusy(true);setFeesError("");
    try{
      const results=await getTransferHints([player.name,player.fullName]);
      setTransfers(results);
      setOpened(v=>[...v,"fees"]);
      if(results.length>0)setScore(v=>Math.max(0,v-200));
    }catch(e){
      setFeesError(e instanceof Error?e.message:"Could not load the transfer dataset. No points were deducted; try again.");
    }finally{setFeesBusy(false);}
  };
  const submit=(event:FormEvent)=>{
    event.preventDefault();if(!player||!guess.trim()||status!=="playing")return;
    if(matches(guess,player)){setStatus("won");setNote("FILE CRACKED. Nice read.");setGuess("");if(!dailyDone)onDailyComplete?.(score);return;}
    const next=attempts+1;setAttempts(next);setScore(v=>Math.max(0,v-50));setNote("Not that one. Keep reading the file.");setGuess("");
    if(next>=10){setStatus("lost");setRevealed(rows.map(r=>r.id));if(!dailyDone)onDailyComplete?.(0);}
  };
  const next=async()=>{
    if(!pool.length)return;
    setPlayer(null);setRows([]);setGuess("");setAttempts(0);setScore(1000);setRevealed([]);setFreeRows([]);setFreeNote(null);setOpened([]);
    setTransfers(null);setFeesError("");setStatus("playing");setNote("");setCopied(false);setError("");
    try{await newPlayer(pool,mode);}catch(e){setError(e instanceof Error?e.message:"Could not load another player.");}
  };
  const share=async()=>{
    const text="PLAYGROUND CAREER FILE · "+(player?.name??"Mystery player")+" · "+attempts+"/10 wrong guesses · "+score+" points";
    try{if(navigator.share)await navigator.share({title:"PLAYGROUND Career File",text});
      else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);setCopied(true);}}
    catch{/* sharing may be cancelled */}
  };

  return <main className="cf-page" id="top">
    <div className="cf-grain" aria-hidden="true"/>
    <header className="cf-topbar">
      <a className="cf-brand" href="/">PLAY<span>GROUND</span><b>®</b></a>
      <div className="cf-toplinks"><a href="/">THE ARCADE</a><span>/</span><strong>CAREER FILE</strong></div>
      <div className="cf-topright"><i className="cf-live"/> PLAYER ARCHIVE / 01</div>
    </header>
    <section className="cf-hero">
      <div className="cf-hero-copy">
        <div className="cf-eyebrow"><i/> THE PLAYER IDENTITY GAME <span>ISSUE № 01</span></div>
        <h1>CAREER<br/><em>FILE.</em></h1>
        <p>One career. Dozens of clues. One name to find. Study the seasons, follow the transfers and back your football brain.</p>
        <div className="cf-hero-foot"><b>SELECT A FILE.</b><span>DON'T GUESS. INVESTIGATE.</span></div>
      </div>
      <div className="cf-hero-art" aria-label="Animated football pitch graphic">
        <div className="cf-score-strip"><span>PG / SCOUTING DEPT.</span><span>LIVE DOSSIER <i/></span></div>
        <div className="cf-mini-pitch"><div className="cf-halfway"/><div className="cf-centre-circle"/><div className="cf-box left"/><div className="cf-box right"/>
          <motion.div className="cf-ball" animate={{x:[0,16,-11,0],y:[0,-9,4,0],rotate:[0,130,270,360]}} transition={{duration:6.5,repeat:Infinity,ease:"easeInOut"}}/>
          <motion.div className="cf-runner runner-a" animate={{x:[0,26,4,0],y:[0,17,-4,0]}} transition={{duration:5,repeat:Infinity,ease:"easeInOut"}}>09</motion.div>
          <motion.div className="cf-runner runner-b" animate={{x:[0,-22,3,0],y:[0,-12,7,0]}} transition={{duration:6,repeat:Infinity,ease:"easeInOut"}}>10</motion.div>
          <div className="cf-pitch-note">THE<br/>90 MIN.</div>
        </div>
        <div className="cf-art-bottom"><span>EVERY SEASON TELLS A STORY</span><b>↗</b><span>EST. 2026</span></div>
        <motion.div className="cf-orbit-stamp" animate={{rotate:[8,13,8]}} transition={{duration:7,repeat:Infinity}}>SCOUT<br/>THE<br/>STORY</motion.div>
      </div>
    </section>
    {dailyDone&&<div className="cf-daily-complete">TODAY'S CAREER FILE IS BANKED · NEXT FILES ARE PRACTICE</div>}
    <section className="cf-controlbar">
      <div className="cf-control-title"><span>01 / CHOOSE YOUR COMPETITION</span><strong>ENGLISH PREMIER LEAGUE FILES</strong></div>
      <div className="cf-leagues">{LEAGUES.map(x=><button key={x.code} className={league===x.code?"active":""} onClick={()=>setLeague(x.code)}>{x.label}</button>)}</div>
    </section>
    <section className="cf-mode-area">
      <div className="cf-mode-title"><span>02 / SET THE DIFFICULTY</span><span>THE HARDER THE FILE, THE LESS OBVIOUS THE NAME</span></div>
      <div className="cf-mode-grid">{MODES.map((m,i)=><motion.button key={m.name}
        className={"cf-mode-card "+m.colour+(mode===m.name?" chosen":"")} onClick={()=>setMode(m.name)}
        whileHover={{y:-5,rotate:i%2?1:-1}} whileTap={{scale:.98}}>
        <span className="cf-mode-index">0{i+1} / PG</span><strong>{m.name}</strong><small>{m.note}</small><small className="cf-mode-count">{pool.length?pool.filter(c=>fits(c,m.name)).length+" FILES IN THE DRAW":"READING PLAYER POOL"}</small><i>{mode===m.name?"SELECTED ✓":"SELECT ↗"}</i>
      </motion.button>)}</div>
      <div className="cf-round-note"><span><b>{mode}</b> / {league==="ALL"?"ALL FIVE LEAGUES":LEAGUES.find(x=>x.code===league)?.label.toUpperCase()}</span><span>10 GUESSES · 1,000 STARTING POINTS · 2 FREE SEASONS</span></div>
    </section>
    <section className="cf-game-area">
      <div className="cf-game-heading"><div><span>03 / THE DOSSIER</span><h2>WHO'S THE<br/><em>PLAYER?</em></h2></div>
        <div className="cf-round-count"><small>FILE NUMBER</small><strong>{String(round||1).padStart(3,"0")}</strong><span>NEW FILE EACH ROUND</span></div>
      </div>
      {(busy||loadingPlayer)&&<div className="cf-loading"><motion.div animate={{rotate:360}} transition={{repeat:Infinity,duration:1.6,ease:"linear"}}>✳</motion.div>
        <b>{busy?"OPENING THE PLAYER ARCHIVE":"BUILDING THE CAREER FILE"}</b><span>Preparing a random file from the career archive. Season-stat coverage is checked in batches.</span></div>}
      {error&&<div className="cf-error"><strong>THE ARCHIVE HIT A SNAG</strong><p>{error}</p><button onClick={()=>window.location.reload()}>TRY AGAIN ↗</button></div>}
      {player&&!busy&&!loadingPlayer&&<div className="cf-layout">
        <section className="cf-record">
          <div className="cf-record-head"><span>CONFIDENTIAL / SENIOR CAREER RECORD</span><span>SUBJECT: ████████</span></div>
          <div className="cf-subject"><div><small>PLAYER UNKNOWN</small><strong>THE<br/><em>JOURNEY.</em></strong><span>{rows.length} TIMELINE ENTRIES / {player.spells.length} CLUB SPELLS</span></div><div className="cf-crest-stack"><span>PG</span><span>?</span><span>90</span></div></div>
          <div className="cf-timeline-toolbar"><div><b>CAREER TIMELINE</b><small>{revealedCount} / {rows.length} REVEALED</small></div>
            <button onClick={revealAll} disabled={status!=="playing"||revealedCount===rows.length}>REVEAL FULL CAREER · {Math.max(0,rows.length-revealedCount)*35} PTS</button></div>
          <div className="cf-free-brief"><div><span>FREE SCOUTING NOTE</span><strong>{freeNote?freeNote.label:"TWO FREE SEASON CLUES"}</strong><p>{freeNote?freeNote.value:"Two sourced season records are opened for every player."}</p></div><span className="cf-free-tag">NO POINTS DEDUCTED</span></div><div className="cf-table-wrap"><table className="cf-table"><thead><tr><th>SEASON</th><th>CLUB</th><th>APPS</th><th>GOALS</th><th/></tr></thead>
            <tbody>{rows.map((r,i)=>{const shown=revealed.includes(r.id)||status!=="playing";return <motion.tr key={r.id} className={shown?(freeRows.includes(r.id)?"unblurred cf-free-row":"unblurred cf-paid-row"):"hidden-row"}
              initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:Math.min(i*.012,.4)}}>
              <td><span className={shown?"":"cf-blur"}>{r.season}</span></td>
              <td><span className={shown?"":"cf-blur"}>{r.club}</span>{shown&&r.loan&&<small className="cf-loan">LOAN</small>}{shown&&(r.spellApps!=null||r.spellGoals!=null)&&<small className="cf-spell-total">SPELL TOTAL · {fmt(r.spellApps)} APPS / {fmt(r.spellGoals)} GOALS</small>}</td>
              <td><span className={shown?"":"cf-blur"}>{r.covered?fmt(r.apps):"—"}</span></td>
              <td><span className={shown?"":"cf-blur"}>{r.covered?fmt(r.goals):"—"}</span></td>
              <td>{shown?<span className="cf-revealed-tick">{freeRows.includes(r.id)?"FREE":"✓"}</span>:<button className="cf-reveal-row" onClick={()=>revealRow(r)} disabled={status!=="playing"}>−35 ↗</button>}</td>
            </motion.tr>;})}</tbody></table></div>
          <div className="cf-record-foot"><span>APPS / GOALS: SOURCE TOTALS ACROSS LISTED COMPETITION GROUPS</span><span>— = NOT RECORDED</span></div>
          <div className="cf-source-note">Career-spell totals are shown separately from season totals. Season figures combine the source’s listed non-total competition groups for that club and season. Missing totals are not guessed; source statistics are unverified. <a href={player.wikipediaUrl} target="_blank" rel="noreferrer">OPEN THE ORIGINAL PLAYER SOURCE ↗</a></div>
        </section>
        <aside className="cf-side">
          <div className="cf-scorecard"><div><small>YOUR SCORE</small><strong>{score.toLocaleString("en-GB")}<i> PTS</i></strong></div><div><small>GUESSES LEFT</small><strong>{left}<i> / 10</i></strong></div>
            <div className="cf-score-track"><motion.i animate={{width:score/1000*100+"%"}}/></div></div>
          <section className="cf-side-panel cf-guess-panel"><span className="cf-side-kicker">04 / MAKE YOUR CALL</span><label htmlFor="cf-guess">WHO IS THE PLAYER?</label>
            <form onSubmit={submit}><input id="cf-guess" value={guess} onChange={e=>setGuess(e.target.value)} placeholder="Full name or surname…" disabled={status!=="playing"} autoComplete="off"/>
              <button disabled={!guess.trim()||status!=="playing"}>LOCK IT IN ↗</button></form>
            <div className="cf-guess-rules"><span>10 GUESSES</span><span>−50 PTS / WRONG ANSWER</span></div>
            {note&&<motion.p className="cf-message" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}>{note}</motion.p>}
            {status!=="playing"&&<div className={"cf-outcome "+status}><span>{status==="won"?"FILE CRACKED":"CASE CLOSED"}</span><strong>{player.name}</strong>
              <p>{status==="won"?"You found the player with "+score+" points.":"The player was "+player.name+". The complete record is now revealed."}</p>
              <button onClick={share}>{copied?"COPIED ✓":"SHARE RESULT ↗"}</button></div>}
          </section>
          <section className="cf-side-panel cf-hints"><div className="cf-hint-head"><span className="cf-side-kicker">05 / THE CLUE ROOM</span><span>SPEND TO REVEAL</span></div>
            {hints.map(h=><div className="cf-hint-row" key={h.id}><div><b>{h.label}</b>{opened.includes(h.id)&&<p>{h.value}</p>}</div>
              <button onClick={()=>unlock(h)} disabled={!h.available||opened.includes(h.id)||status!=="playing"}>{opened.includes(h.id)?(freeNote?.id===h.id?"FREE ✓":"UNLOCKED ✓"):h.available?"−"+h.cost+" PTS ↗":"NO DATA"}</button></div>)}
            <div className="cf-hint-row cf-transfer-row"><div><b>Transfer history / fees</b>
              {(opened.includes("fees")||Boolean(feesError))&&(feesBusy?<p>Searching the transfer archive…</p>:feesError?<p>{feesError}</p>:transfers?.length?
                <div className="cf-transfer-list">{transfers.map((t,i)=><p key={i}><strong>{t.year||"Year ?"}</strong> · {t.from||"Unknown"} → {t.to||"Unknown"}<br/><b>{t.fee}</b>{t.league?" · "+t.league:""}</p>)}</div>:
                <p>No matching entry in the 2005–2024 transfer dataset. No points were deducted. This does not mean the player moved for free.</p>)}
            </div><button onClick={revealFees} disabled={opened.includes("fees")||feesBusy||status!=="playing"}>{feesBusy?"SEARCHING…":opened.includes("fees")?(transfers?.length?"UNLOCKED · −200 PTS ✓":"NO FEE RECORD · FREE ✓"):"−200 PTS ↗"}</button></div>
          </section>
          <div className="cf-side-actions"><button onClick={next} disabled={busy||loadingPlayer||!pool.length}>{loadingPlayer?"LOADING…":"NEXT PLAYER ↗"}</button><span>USED FILES ARE AVOIDED UNTIL THE DRAW REFRESHES.</span></div>
        </aside>
      </div>}
    </section>
    <section className="cf-bottom-strip"><div><span>THE PLAYGROUND PLAYER ARCHIVE</span><strong>READ THE GAME.<br/>READ THE CAREER.</strong></div>
      <div className="cf-source-credits"><b>DATA & SOURCES</b>
        <p>This Career File is restricted to Premier League players in the OpenFootballBase-Data archive. Each playable file must have at least two distinct recorded seasons and two free season-stat clues. Appearance and goal figures are shown only where present in the source and remain explicitly unverified; missing seasons stay blank. OpenFootballBase-Data is CC BY-SA 4.0; Wikipedia text is CC BY-SA 4.0; Wikidata is CC0. This is a curated archive, not a complete record of every English-league player.</p>
        <p>Transfer clues use Tiago Cumetti’s Football Transfers Dataset (2005–2024), collected from Transfermarkt pages. It is CC BY 4.0 and includes undisclosed or missing fees. No match does not mean a free transfer.</p>
        <a href="https://github.com/florentfougeres/OpenFootballBase-Data" target="_blank" rel="noreferrer">OPEN FOOTBALL DATA SOURCE ↗</a>
        <a href="https://doi.org/10.5281/zenodo.17921143" target="_blank" rel="noreferrer">TRANSFER DATA / DOI ↗</a>
      </div>
    </section>
    <footer className="cf-footer"><a href="/">PLAYGROUND®</a><span>FOOTBALL, PLAYED DIFFERENTLY.</span><a href="#top" onClick={e=>{e.preventDefault();window.scrollTo({top:0,behavior:"smooth"});}}>BACK TO KICK-OFF ↑</a></footer>
  </main>;
}