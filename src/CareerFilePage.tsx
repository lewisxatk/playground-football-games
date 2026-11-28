import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { getArchiveGamePlayersByNames, getWikidataCareerPlayersByNames, type Candidate, type Player, type ArchiveGamePlayer, type CareerDifficulty, type PlayerPoolCategory } from "./careerFileData";
import { getQuizFcCareerCandidates, getQuizFcCareerPlayer, getQuizFcStatEligibleCandidates } from "./quizFcCareerData";
import "./career-file.css";

type Mode = CareerDifficulty;
type Row = { id:string; season:string; club:string; clubKey:string; loan:boolean; apps:number|null; goals:number|null; assists:number|null; covered:boolean };
type Hint = { id:string; label:string; cost:number; value:string; available:boolean };

function archivePlayerToCareerFile(raw:ArchiveGamePlayer):Player{
 const spells=(raw.spells??[]).map((spell,index)=>({
   seq:Number(spell.seq??index),
   years:String(spell.years??""),
   start:spell.startYear??null,
   end:spell.endYear??null,
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
 const article=(raw.careerSourceTitle||spells.find(spell=>spell.sourceTitle)?.sourceTitle||"").trim();
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
   wikipediaUrl:article?"https://en.wikipedia.org/wiki/"+encodeURIComponent(article.replace(/ /g,"_")):raw.id.startsWith("Q")?"https://www.wikidata.org/wiki/"+raw.id:"",
   statsScope:"Wikipedia senior-career club-spell totals (unverified; may include more than league appearances)"
 };
}
function wikidataPlayerCandidate(player:Player,poolCategory:PlayerPoolCategory):Candidate{
 const clubs=new Set(player.spells.map(spell=>spell.clubQid||clean(spell.clubLink||spell.club)).filter(Boolean));
 return {id:player.id,name:player.name,apps:0,spells:player.spells.length,clubs:clubs.size,statSeasons:player.spells.length,
   region:poolCategory==="EFL_LEGEND"?"ENGLISH":"INTERNATIONAL",source:"wikidata",poolCategory};
}
function archivePlayerCandidate(player:Player,raw:ArchiveGamePlayer,poolCategory:PlayerPoolCategory):Candidate{
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
   region, source:"openfootballbase", poolCategory
 };
}

const EFL_LEGEND_NAMES = [
 "Bartosz Bialkowski","Richard Keogh","Aden Flint","Tom Lees","Jed Wallace","Lewis McGugan",
 "Paul McKenna","Sean Scannell","Fernando Forestieri","Lee Trundle","Ross McCormack",
 "Britt Assombalonga","Dele Adebola","Will Grigg","Billy Paynter","Brett Pitman",
 "Robin Friday","Steve Fletcher","Simon Garner","Graham Ford","Geoff Bradford",
 "Wilf Kirkham","Dean Lewington","Steve Bull","Tommy Tynan","Jimmy Chamberlain"
];
const WORLD_LEGEND_NAMES = [
 "Lionel Messi","Diego Maradona","Zinedine Zidane","Ronaldinho","Xavi","Andres Iniesta",
 "Andrés Iniesta","Paolo Maldini","Gianluigi Buffon","Andrea Pirlo","Francesco Totti",
 "Alessandro Del Piero","Kaka","Kaká","Ronaldo","Ronaldo Nazario","Ronaldo Luís Nazário de Lima",
 "Pele","Pelé","Johan Cruyff","Franz Beckenbauer","Eusebio","Eusébio","Michel Platini",
 "Roberto Baggio","Hristo Stoichkov","Luis Figo","Luís Figo","Romario","Romário","Zico",
 "Iker Casillas","Raul","Raúl","Juan Roman Riquelme","Juan Román Riquelme","Gabriel Batistuta",
 "Miroslav Klose","Lothar Matthaus","Lothar Matthäus","Rivaldo","Neymar","Karim Benzema",
 "Robert Lewandowski"
];
const MODES: { name:Mode; note:string; colour:string }[] = [
  {name:"EASY",note:"Well-known Premier League careers and major clubs",colour:"lime"},
  {name:"MEDIUM",note:"Established Premier League players with less obvious paths",colour:"blue"},
  {name:"HARD",note:"Less familiar players and deeper Premier League knowledge",colour:"orange"},
  {name:"EXTREME",note:"Shorter, older or specialist Premier League careers",colour:"violet"}
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
function poolCategoryForSlot(slot:number):PlayerPoolCategory{
  const position=((Math.trunc(slot)%100)+100)%100;
  return position<95?"PREMIER_LEAGUE":position<98?"EFL_LEGEND":"WORLD_LEGEND";
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
   const start=spell.start??yearOf(spell.years);
   const matchingStats=p.stats.filter(stat=>{
     const statYear=yearOf(stat.season);
     if(statYear===null||start===null||statYear<start||(spell.end!==null&&statYear>spell.end))return false;
     if(spell.clubQid&&stat.clubQid&&spell.clubQid===stat.clubQid)return true;
     if(spell.clubLink&&stat.clubLink&&clean(spell.clubLink)===clean(stat.clubLink))return true;
     return clean(spell.club)===clean(stat.club);
   });
   const knownYears=matchingStats.map(stat=>yearOf(stat.season)).filter((year):year is number=>year!==null);
   const firstYear=start??(knownYears.length?Math.min(...knownYears):null);
   const lastYear=spell.end??(knownYears.length?Math.max(...knownYears):firstYear);
   const total=(key:"apps"|"goals"|"assists")=>{
     if(p.statsScope)return key==="assists"?null:spell[key]??null;
     if(!matchingStats.length||matchingStats.some(stat=>stat[key]===null||stat[key]===undefined))return null;
     if(key==="apps"&&matchingStats.some(stat=>stat.statsLevel!==undefined&&stat.statsLevel!=="full"))return null;
     if(key==="goals"&&matchingStats.some(stat=>stat.statsLevel==="none"))return null;
     return matchingStats.reduce((sum,stat)=>sum+(stat[key]??0),0);
   };
   rows.push({
     id:"club-"+spell.seq,
     season:firstYear===null?"Dates not recorded":lastYear===null||lastYear===firstYear?String(firstYear):firstYear+"–"+lastYear,
     club:spell.club,
     clubKey:spell.clubQid||clean(spell.clubLink||spell.club),
     loan:spell.loan,
     apps:total("apps"),
     goals:total("goals"),
     assists:total("assists"),
     covered:matchingStats.length>0||(p.statsScope!==undefined&&(p.statsScope.startsWith("Wikidata")||spell.apps!==null||spell.goals!==null))
   });
 }
 return rows.filter(row=>row.club.trim().length>0);
}
const ageOf=(p:Player)=>{
  if(!p.birthDate||p.birthPrecision!==11)return "";
  const d=new Date(p.birthDate+"T00:00:00Z");if(Number.isNaN(d.getTime()))return "";
  const now=new Date();let age=now.getUTCFullYear()-d.getUTCFullYear();
  if(now.getUTCMonth()<d.getUTCMonth()||(now.getUTCMonth()===d.getUTCMonth()&&now.getUTCDate()<d.getUTCDate()))age--;
  return String(age);
};
function fits(c:Candidate,m:Mode){
  // The small EFL/global pools are curated legends and stay eligible at every difficulty;
  // the difficulty bands are driven by the much larger Premier League core.
  if(c.poolCategory==="EFL_LEGEND"||c.poolCategory==="WORLD_LEGEND")return true;
  if(c.source==="quizfc-pl"&&c.fameRank!==undefined){
    // Source-provided prominence rank: lower ranks indicate more recognisable players.
    if(m==="EASY")return c.fameRank<=300;
    if(m==="MEDIUM")return c.fameRank>300&&c.fameRank<=1200;
    if(m==="HARD")return c.fameRank>1200&&c.fameRank<=2500;
    return c.fameRank>2500;
  }
  // Legacy archive fallback uses disjoint recorded-appearance bands.
  if(m==="EASY")return c.apps>=450&&c.clubs>=2;
  if(m==="MEDIUM")return c.apps>=250&&c.apps<450&&c.clubs>=2;
  if(m==="HARD")return c.apps>=100&&c.apps<250&&c.clubs>=2;
  return c.apps>=20&&c.apps<100&&c.clubs>=2;
}
function positionLabel(raw:string){
  const value=raw.toUpperCase();
  if(/GK|GOALKEEPER/.test(value))return "Goalkeeper";
  if(/DF|DEFENDER|BACK/.test(value))return "Defender";
  if(/MF|MIDFIELDER|MID/.test(value))return "Midfielder";
  if(/FW|FORWARD|STRIKER|ATTACK|^ATT$/.test(value))return "Forward";
  return raw.trim();
}
function hasOneUsablePLRow(rows:Row[]):boolean{
 return rows.some(row=>row.covered&&row.apps!==null&&row.goals!==null);
}
function hasTwoUsableCareerRows(rows:Row[]):boolean{
 const clubs=new Set(rows.filter(row=>row.covered&&(row.apps!==null||row.goals!==null)).map(row=>row.clubKey));
 return clubs.size>=2;
}
function matches(input:string,p:Player){
  const g=clean(input);if(!g)return false;
  const accepted=new Set([clean(p.name),clean(p.fullName),...(p.aliases??[]).map(clean)]);
  const particles=new Set(["van","von","de","del","di","da","dos","das","du","la","le","ter","den","der"]);
  for(const name of [p.name,p.fullName,...(p.aliases??[])]){
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
 const name=(p.fullName||p.name).trim().split(/\s+/).filter(Boolean);
 const firstInitial=name[0]?.[0]?.toUpperCase()??"";
 const surnameInitial=name[name.length-1]?.[0]?.toUpperCase()??"";
 const age=ageOf(p);
 return [
  {id:"position",label:"Position",cost:60,value:positionLabel(p.position)||"Position not recorded",available:!!p.position},
  {id:"firstInitial",label:"First-name initial",cost:45,value:firstInitial||"Initial not recorded",available:!!firstInitial},
  {id:"surnameInitial",label:"Surname initial",cost:45,value:surnameInitial||"Initial not recorded",available:!!surnameInitial},
  {id:"age",label:"Current age",cost:110,value:age?age+" years old":"Full birth date not recorded",available:!!age},
  {id:"international",label:"International caps",cost:150,value:p.caps===null?"International caps not recorded":fmt(p.caps)+(p.statsScope?" senior caps (source unverified)":" senior international caps"),available:p.caps!==null},
  {id:"nationality",label:"Nationality",cost:200,value:p.nationality||"Nationality not recorded",available:!!p.nationality}
 ];
}

export default function CareerFilePage({dailyDone=false,onDailyComplete}:{dailyDone?:boolean;onDailyComplete?:(score:number)=>void}){
  const [mode,setMode]=useState<Mode>("EASY");
  const [pool,setPool]=useState<Candidate[]>([]);
  const [player,setPlayer]=useState<Player|null>(null);
  const [rows,setRows]=useState<Row[]>([]);
  const [guess,setGuess]=useState("");
  const [attempts,setAttempts]=useState(0);
  const [score,setScore]=useState(1000);
  const [revealed,setRevealed]=useState<string[]>([]);
  const [opened,setOpened]=useState<string[]>([]);
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
    const dailyDraw=!dailyDone;
    const today=new Date().toISOString().slice(0,10);
    const dailySeed="PLAYGROUND-CAREER-FILE:"+today+":"+selectedMode+":MIXED;
    const slot=dailyDraw?Math.floor(Date.parse(today+"T00:00:00Z")/86400000)%100:seen.current.size%100;
    const desiredPool=poolCategoryForSlot(slot);
    let options:Candidate[]=[];
    let selectedPool=desiredPool;
    let fallbackNotice="";
    staticPlayers.current.clear();
    setLoadingPlayer(true);
    if(desiredPool==="PREMIER_LEAGUE"){
      options=deck.filter(candidate=>candidate.poolCategory==="PREMIER_LEAGUE"&&fits(candidate,selectedMode));
    }else{
      const names=desiredPool==="EFL_LEGEND"?EFL_LEGEND_NAMES:WORLD_LEGEND_NAMES;
      setNote("Loading the curated "+(desiredPool==="EFL_LEGEND"?"EFL legends":"world legends")+" files…");
      const [archiveRows,wikidataRows]=await Promise.all([
        getArchiveGamePlayersByNames(names).catch(()=>[]),
        getWikidataCareerPlayersByNames(names).catch(()=>[])
      ]);
      const archiveById=new Map(archiveRows.map(raw=>[raw.id,raw]));
      const playerById=new Map(wikidataRows.map(player=>[player.id,player]));
      for(const raw of archiveRows){
        const player=archivePlayerToCareerFile(raw);
        if(hasTwoUsableCareerRows(makeRows(player)))playerById.set(player.id,player);
      }
      staticPlayers.current=playerById;
      options=Array.from(playerById.values()).map(player=>{
        const raw=archiveById.get(player.id);
        return raw&&player.statsScope?.startsWith("Wikipedia")?archivePlayerCandidate(player,raw,desiredPool):wikidataPlayerCandidate(player,desiredPool);
      }).filter(candidate=>fits(candidate,selectedMode))
        .filter(candidate=>{const player=staticPlayers.current.get(candidate.id);return Boolean(player&&hasTwoUsableCareerRows(makeRows(player)));});
      if(!options.length){
        staticPlayers.current.clear();
        selectedPool="PREMIER_LEAGUE";
        fallbackNotice=(desiredPool==="EFL_LEGEND"?"EFL legend source had no usable career record.":"Global legend source had no usable career record.")+" This slot used the Premier League backup instead.";
        options=deck.filter(candidate=>candidate.poolCategory==="PREMIER_LEAGUE"&&fits(candidate,selectedMode));
      }
    }
    if(!options.length){setLoadingPlayer(false);throw new Error("There are no verified player files for "+selectedMode+". Choose another difficulty.");}
    const unused=options.filter(candidate=>!seen.current.has(candidate.id));
    const source=dailyDraw?options:(unused.length?unused:options);
    if(!dailyDraw&&!unused.length){seen.current.clear();persistRecentCareerIds(seen.current);setNote("You have worked through this player pool. The draw has restarted.");}
    const draw=shuffleCandidates(source,Math.min(180,source.length),dailyDraw?dailySeed+":"+selectedPool:undefined);
    setNote("Picking a "+(selectedPool==="PREMIER_LEAGUE"?"former Premier League":selectedPool==="EFL_LEGEND"?"EFL legend":"world legend")+" career…");
    try{
      const eligible=selectedPool==="PREMIER_LEAGUE"
        ?getQuizFcStatEligibleCandidates(draw)
        :draw.filter(candidate=>{const cached=staticPlayers.current.get(candidate.id);return Boolean(cached&&hasTwoUsableCareerRows(makeRows(cached)));});
      const ranked=[...eligible].sort((a,b)=>b.statSeasons-a.statSeasons||a.id.localeCompare(b.id));
      let lastProblem="No player in this category had enough sourced career rows.";
      for(const choice of ranked.slice(0,36)){
        try{
          const record=staticPlayers.current.get(choice.id)??await getQuizFcCareerPlayer(choice.id);
          const timeline=makeRows(record);
          const usable=selectedPool==="PREMIER_LEAGUE"?hasOneUsablePLRow(timeline):hasTwoUsableCareerRows(timeline);
          if(!timeline.length||!usable){lastProblem="This career did not have enough usable, sourced club records.";continue;}
          seen.current.add(choice.id);persistRecentCareerIds(seen.current);
          setPlayer(record);setRows(timeline);setRevealed([]);setOpened([]);
          setRound(n=>n+1);setStatus("playing");setNote(fallbackNotice);setGuess("");setAttempts(0);setScore(1000);
          return;
        }catch(problem){lastProblem=problem instanceof Error?problem.message:"Could not read this player's career file.";}
      }
      throw new Error("This draw did not contain a complete player file. Choose Next Player to draw again. "+lastProblem);
    }finally{setLoadingPlayer(false);}
  },[dailyDone]);
  useEffect(()=>{
    let live=true;setBusy(true);setError("");
    setPlayer(null);setRows([]);setOpened([]);setRevealed([]);
    setGuess("");setAttempts(0);setScore(1000);setStatus("playing");setNote("");setRound(0);
    (async()=>{
      const list=await getQuizFcCareerCandidates();
      if(!live)return;
      staticPlayers.current.clear();
      setPool(list);
      await newPlayer(list,mode);
    })().catch(e=>{if(live)setError(e instanceof Error?e.message:"Could not open the player archive.");})
      .finally(()=>{if(live)setBusy(false);});
    return()=>{live=false;};
  },[mode,newPlayer]);
  const hints=useMemo(()=>player?careerHint(player):[],[player]);
  const goalsAvailable=rows.some(row=>row.goals!==null);
  const assistsAvailable=rows.some(row=>row.assists!==null);
  const left=Math.max(0,10-attempts);
  const unlock=(hint:Hint)=>{
    if(!player||opened.includes(hint.id)||!hint.available||status!=="playing")return;
    setOpened(v=>[...v,hint.id]);setScore(v=>Math.max(0,v-hint.cost));
  };
  const revealStat=(key:"goals"|"assists")=>{
    if(!player||revealed.includes(key)||status!=="playing")return;
    const cost=100;
    setRevealed(v=>[...v,key]);
    setScore(v=>Math.max(0,v-cost));
  };
  const submit=(event:FormEvent)=>{
    event.preventDefault();if(!player||!guess.trim()||status!=="playing")return;
    if(matches(guess,player)){setStatus("won");setNote("FILE CRACKED. Nice read.");setGuess("");if(!dailyDone)onDailyComplete?.(score);return;}
    const next=attempts+1;setAttempts(next);setScore(v=>Math.max(0,v-50));setNote("Not that one. Keep reading the file.");setGuess("");
    if(next>=10){setStatus("lost");setRevealed(["goals","assists"]);if(!dailyDone)onDailyComplete?.(0);}
  };
  const next=async()=>{
    if(!pool.length)return;
    setPlayer(null);setRows([]);setGuess("");setAttempts(0);setScore(1000);setRevealed([]);setOpened([]);
    setStatus("playing");setNote("");setCopied(false);setError("");
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
        <div className="cf-eyebrow"><i/> FOOTBALL CAREER IDENTITY GAME <span>ISSUE № 01</span></div>
        <h1>CAREER<br/><em>FILE.</em></h1>
        <p>One player. A career pathway. One name to find. Follow the club pathway, compare appearances and unlock hidden stats across Premier League careers, EFL legends and global greats.</p>
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
    <section className="cf-controlbar cf-pool-mix">
      <div className="cf-control-title"><span>01 / PLAYER DATABASE</span><strong>THREE FOOTBALL WORLDS. ONE DRAW.</strong></div>
      <div className="cf-pool-mix-items"><span><b>95%</b> PREMIER LEAGUE CAREERS</span><span><b>3%</b> EFL LEGENDS</span><span><b>2%</b> WORLD LEGENDS</span></div>
    </section>
    <section className="cf-mode-area">
      <div className="cf-mode-title"><span>02 / SET THE DIFFICULTY</span><span>THE HARDER THE FILE, THE LESS OBVIOUS THE NAME</span></div>
      <div className="cf-mode-grid">{MODES.map((m,i)=><motion.button key={m.name}
        className={"cf-mode-card "+m.colour+(mode===m.name?" chosen":"")} onClick={()=>setMode(m.name)}
        whileHover={{y:-5,rotate:i%2?1:-1}} whileTap={{scale:.98}}>
        <span className="cf-mode-index">0{i+1} / PG</span><strong>{m.name}</strong><small>{m.note}</small><small className="cf-mode-count">{pool.length?pool.filter(c=>fits(c,m.name)).length+" PL CORE FILES":"READING PLAYER POOL"}</small><i>{mode===m.name?"SELECTED ✓":"SELECT ↗"}</i>
      </motion.button>)}</div>
      <div className="cf-round-note"><span><b>{mode}</b> / MIXED FOOTBALL PLAYER POOL</span><span>10 GUESSES · 1,000 STARTING POINTS · CLUB PATHWAY VISIBLE</span></div>
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
          <div className="cf-record-head"><span>CONFIDENTIAL / FOOTBALL CAREER PATHWAY</span><span>SUBJECT: ████████</span></div>
          <div className="cf-subject"><div><small>IDENTITY HIDDEN</small><strong>THE<br/><em>JOURNEY.</em></strong><span>{rows.length} CLUB SPELLS / CAREER PATHWAY</span></div><div className="cf-crest-stack"><span>PG</span><span>?</span><span>90</span></div></div>
          <div className="cf-timeline-toolbar cf-pathway-toolbar">
            <div><b>CLUB PATHWAY</b><small>{rows.length} CLUB SPELLS · CHRONOLOGICAL</small></div>
            <div className="cf-stat-unlocks">
              <button onClick={()=>revealStat("goals")} disabled={status!=="playing"||revealed.includes("goals")||!goalsAvailable}> {revealed.includes("goals")?"GOALS SHOWN ✓":goalsAvailable?"REVEAL GOALS · −100 PTS":"GOALS NOT RECORDED"}</button>
              <button onClick={()=>revealStat("assists")} disabled={status!=="playing"||revealed.includes("assists")||!assistsAvailable}> {revealed.includes("assists")?"ASSISTS SHOWN ✓":assistsAvailable?"REVEAL ASSISTS · −100 PTS":"ASSISTS NOT RECORDED"}</button>
            </div>
          </div>
          <div className="cf-table-wrap"><table className="cf-table cf-pathway-table"><thead><tr><th>CLUB PATHWAY</th><th>APPS</th><th>GOALS</th><th>ASSISTS</th></tr></thead>
            <tbody>{rows.map((r,i)=><motion.tr key={r.id}
              initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:Math.min(i*.025,.35)}}>
              <td><strong>{r.club}</strong><small className="cf-pathway-years">{r.season}</small>{r.loan&&<small className="cf-loan">LOAN</small>}</td>
              <td>{fmt(r.apps)}</td>
              <td><span className={status!=="playing"||revealed.includes("goals")||r.goals===null?"":"cf-blur"}>{fmt(r.goals)}</span></td>
              <td><span className={status!=="playing"||revealed.includes("assists")||r.assists===null?"":"cf-blur"}>{fmt(r.assists)}</span></td>
            </motion.tr>)}</tbody></table></div>
          <div className="cf-record-foot"><span>{player.statsScope?.startsWith("Wikidata")?"APPS / GOALS / ASSISTS: NOT IN WIKIDATA CAREER RECORD":player.statsScope?"APPS / GOALS: WIKIPEDIA CLUB-SPELL TOTALS · UNVERIFIED":"APPS / GOALS / ASSISTS: PREMIER LEAGUE LEAGUE TOTALS"}</span><span>— = NOT RECORDED</span></div>
          <div className="cf-source-note">{player.statsScope?.startsWith("Wikidata")?"This career pathway uses Wikidata club-membership records. Club affiliations and dates may be incomplete; appearances, goals and assists are not provided by this source.":player.statsScope?"EFL and world-legend appearances and goals are sourced from Wikipedia senior-career club-spell infoboxes. These figures are unverified and are not directly comparable with Premier League league-only statistics. Assists are not included for these files until complete, comparable data is available.":"Premier League league appearances, goals and assists (1992/93 onward). Cup, European and EFL figures are excluded. Club dates are first and last recorded PL seasons, not exact transfer dates; gaps remain unrecorded. Missing figures remain unrecorded."} <a href={player.wikipediaUrl} target="_blank" rel="noreferrer">OPEN PLAYER IDENTITY ↗</a></div>
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
            {hints.filter(h=>h.available).map(h=><div className="cf-hint-row" key={h.id}><div><b>{h.label}</b>{opened.includes(h.id)&&<p>{h.value}</p>}</div>
              <button onClick={()=>unlock(h)} disabled={!h.available||opened.includes(h.id)||status!=="playing"}>{opened.includes(h.id)?"UNLOCKED ✓":h.available?"−"+h.cost+" PTS ↗":"NO DATA"}</button></div>)}
          </section>
          <div className="cf-side-actions"><button onClick={next} disabled={busy||loadingPlayer||!pool.length}>{loadingPlayer?"LOADING…":"NEXT PLAYER ↗"}</button><span>USED FILES ARE AVOIDED UNTIL THE DRAW REFRESHES.</span></div>
        </aside>
      </div>}
    </section>
    <section className="cf-bottom-strip"><div><span>THE PLAYGROUND PLAYER ARCHIVE</span><strong>READ THE GAME.<br/>READ THE CAREER.</strong></div>
      <div className="cf-source-credits"><b>DATA & SOURCES</b>
        <p>Player draw is weighted across three pools: 95% players with recorded Premier League careers (current and former), 3% EFL legends who never played in the Premier League, and 2% global legends from other leagues. The Premier League core uses Quiz FC PL history data (1992/93 onward). EFL and global legend files are looked up by curated player lists against OpenFootballBase career records, with Wikidata P54 club-membership fallback for EFL-only players not present in the squad-derived archive. Premier League stats are league-only; OpenFootballBase appearances/goals use Wikipedia senior-career infobox totals and are labelled unverified. Wikidata-only careers show club membership/dates where available but no invented appearance or goal totals. Missing figures remain blank. OpenFootballBase is Wikipedia CC BY-SA 4.0 and Wikidata CC0; attribution is provided with the data-source links.</p>
        <a href="https://quiz-fc.com/data/pl-history.v2.json" target="_blank" rel="noreferrer">OPEN PL HISTORY DATA ↗</a>
        <a href="https://github.com/florentfougeres/OpenFootballBase-Data" target="_blank" rel="noreferrer">OPENFOOTBALLBASE CAREER DATA ↗</a>
        <a href="https://www.planetfootball.com/lists-and-rankings/amazing-xi-efl-legends-never-played-premier-league" target="_blank" rel="noreferrer">EFL LEGEND SELECTION RESEARCH ↗</a>
        <a href="https://therealefl.co.uk/2025/06/03/legendary-efl-strikers-who-never-played-in-the-premier-league/" target="_blank" rel="noreferrer">EFL PLAYER RESEARCH ↗</a>
        <a href="https://quiz-fc.com/data/ATTRIBUTION.md" target="_blank" rel="noreferrer">DATA ATTRIBUTION / CC BY-SA 4.0 ↗</a>
      </div>
    </section>
    <footer className="cf-footer"><a href="/">PLAYGROUND®</a><span>FOOTBALL, PLAYED DIFFERENTLY.</span><a href="#top" onClick={e=>{e.preventDefault();window.scrollTo({top:0,behavior:"smooth"});}}>BACK TO KICK-OFF ↑</a></footer>
  </main>;
}