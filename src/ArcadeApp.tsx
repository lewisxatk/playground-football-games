import { Fragment, useEffect, useMemo, useState, useRef, type FormEvent, type ReactNode } from "react";
import { motion, AnimatePresence, Reorder, MotionConfig } from "motion/react";
import {
  PLAYER_DATABASE, LEAGUE_GOALS, STRANDS_PACKS,
  type Player
} from "./playerData";
import { ClubBadge, CountryFlag } from "./ClubBadge";
import { useArchivePlayers } from "./useArchivePlayers";
import { useQuestionBank, makeQuestionRound, type QuizTier, type QuizQuestion, type QuestionBank } from "./questionBank";
import { getWorldCupLineups } from "./tournamentNationData";
import type { ArchiveGamePlayer, ArchiveCareerSpell, ArchiveGameStat } from "./careerFileData";
import CareerFilePage from "./CareerFilePage";
import { getCareerClubsAtYear } from "./careerFileData";
import "./arcade.css";

type Mode = "daily" | "practice";
type Account = {
  nickname: string;
  createdAt: string;
  streak: number;
  bestStreak: number;
  lastDailyDate: string;
  daily: Record<string, Record<string, number>>;
  totals: Record<string, number>;
};
const STORAGE_KEY = "playground.local-account.v1";
const difficultyLabel=(level:string)=>level==="STANDARD"?"MEDIUM / STANDARD":level;
const difficultyDescription=(level:string)=>({
 EASY:"Well-known players, major clubs and straightforward football facts.",
 MEDIUM:"Established careers, familiar records and less obvious choices.",
 HARD:"Tighter statistics, tougher career clues and specialist football knowledge.",
 EXTREME:"Rare records, detailed career chronology and questions for serious obsessives."
} as Record<string,string>)[level]??"";
const ARCHIVE_POOL_SEED = "PLAYGROUND-GAME-POOL-2026-11";
const EMPTY_ACCOUNT: Account = { nickname:"PLAYER 01", createdAt:new Date().toISOString(), streak:0, bestStreak:0, lastDailyDate:"", daily:{}, totals:{} };
const GAME_LINKS = [
  {id:"lowball",title:"LOWBALL",sub:"Higher or lower. No second guesses.",tone:"lime",tag:"QUICK FIRE"},
  {id:"the-climb",title:"THE CLIMB",sub:"Five questions. Three lives.",tone:"orange",tag:"SURVIVAL"},
  {id:"draft-xi",title:"DRAFT XI",sub:"Build an XI inside the game budget.",tone:"blue",tag:"SQUAD BUILDER"},
  {id:"career-file",title:"CAREER FILE",sub:"Follow a Premier League career. Find the player.",tone:"pink",tag:"MYSTERY"},
  {id:"footle",title:"FOOTLE",sub:"A footballer surname in six tries.",tone:"lime",tag:"WORD GAME"},
  {id:"connections",title:"THE CONNECTION",sub:"Four groups. Sixteen names.",tone:"violet",tag:"PUZZLE"},
  {id:"football-grid",title:"FOOTBALL GRID",sub:"Sixteen squares. Sixteen football answers.",tone:"blue",tag:"GRID"},
  {id:"ladder",title:"THE LADDER",sub:"Put five players in stat order.",tone:"orange",tag:"RANKING"},
  {id:"the-reveal",title:"THE REVEAL",sub:"Uncover the mystery player, clue by clue.",tone:"pink",tag:"DEDUCTION"},
  {id:"football-501",title:"FOOTBALL 501",sub:"Count down without busting.",tone:"lime",tag:"COUNTDOWN"},
  {id:"link-up",title:"THE LINK UP",sub:"Find the player who connects two stars.",tone:"violet",tag:"CONNECTION"},
  {id:"missing-xi",title:"MISSING XI",sub:"One name is missing from a famous line-up.",tone:"blue",tag:"LINE-UP"},
  {id:"strands",title:"FOOTBALL STRANDS",sub:"Find the surnames. Find the full-name spangram.",tone:"orange",tag:"WORD SEARCH"},
  {id:"scout-signal",title:"SCOUT SIGNAL",sub:"Guess the footballer. Watch the attributes light up.",tone:"pink",tag:"ATTRIBUTE HUNT"},
  {id:"tournament-nation",title:"TOURNAMENT NATION",sub:"Name the country from a historic World Cup starting XI.",tone:"blue",tag:"INTERNATIONAL"},
  {id:"timed-quiz",title:"THE QUICK QUIZ",sub:"Fifteen questions. Ten seconds each. No VAR.",tone:"orange",tag:"TIMED QUIZ"}
] as const;
type GameId = typeof GAME_LINKS[number]["id"];
const normalise = (v:string) => v.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
const utcDay = () => new Date().toISOString().slice(0,10);
const previousDay = (day:string) => { const d=new Date(day+"T00:00:00Z"); d.setUTCDate(d.getUTCDate()-1); return d.toISOString().slice(0,10); };
const hashSeed = (s:string) => { let h=2166136261; for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);} return h>>>0; };
function rng(seed:number){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function shuffle<T>(items:T[],seed:number){const a=[...items],r=rng(seed);for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function loadAccount():Account{
  try{const raw=localStorage.getItem(STORAGE_KEY);if(raw){const parsed=JSON.parse(raw) as Partial<Account>;return {...EMPTY_ACCOUNT,...parsed,daily:parsed.daily??{},totals:parsed.totals??{}};}}
  catch{/* local saves can be unavailable in private browsing */}
  return EMPTY_ACCOUNT;
}
function awardDaily(account:Account,game:GameId,score:number):Account{
  const day=utcDay();const existing=account.daily[day]??{};
  if(existing[game]!==undefined)return account;
  const streak=account.lastDailyDate===day?account.streak:account.lastDailyDate===previousDay(day)?account.streak+1:1;
  return {...account,streak,bestStreak:Math.max(account.bestStreak,streak),lastDailyDate:day,
    daily:{...account.daily,[day]:{...existing,[game]:score}},totals:{...account.totals,[game]:(account.totals[game]??0)+1}};
}
function todayGames(account:Account){return Object.keys(account.daily[utcDay()]??{}).length;}

type GamePlayer = Player & {
  archiveId:string;
  careerSpells:ArchiveCareerSpell[];
  seasonStats:ArchiveGameStat[];
  careerAppsRecorded:boolean;
  careerGoalsRecorded:boolean;
  leagueAppsRecorded:boolean;
  leagueGoalsRecorded:boolean;
  careerApps:number;
  careerGoals:number;
  leagueApps:number;
  leagueGoals:number;
  leagueGoalSeasons:number;
  leagueAssists:number;
  leagueAssistSeasons:number;
  statSeasons:number;
  firstYear:number|null;
  lastYear:number|null;
  caps:number|null;
  internationalGoals:number|null;
  birthDate:string;
  currentCountry:string;
  currentDivision:number|null;
};
function positionCode(raw:string):Player["position"]{
  const p=raw.toUpperCase();
  if(p.includes("GK")||p.includes("GOALKEEPER"))return "GK";
  if(p.includes("DF")||p.includes("DEFENDER")||p.includes("BACK"))return "DEF";
  if(p.includes("MF")||p.includes("MID"))return "MID";
  if(p.includes("FW")||p.includes("FORWARD")||p.includes("STRIKER"))return "FWD";
  return "" as Player["position"];
}
function archivePlayerToGamePlayer(p:ArchiveGamePlayer):GamePlayer{
  const name=p.name.trim();
  const parts=name.split(/\s+/).filter(Boolean);
  const surname=parts.slice(-1)[0]??name;
  const birth=p.birthDate?new Date(p.birthDate+"T00:00:00Z"):null;
  const age=birth&&!Number.isNaN(birth.getTime())?new Date().getUTCFullYear()-birth.getUTCFullYear():null;
  const ageBand=age===null?"Unknown":age<20?"Teens":age<30?"20s":age<40?"30s":age<50?"40s":age<60?"50s":"60s+";
  return {
    name,surname:surname.toLocaleUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Z]/g,""),
    nationality:p.nationality||"Unlisted",position:positionCode(p.position),
    club:p.currentClub||"Unknown club",league:p.currentLeague||p.currentCountry||"Unlisted",
    active:p.lastYear!==null&&p.lastYear>=new Date().getUTCFullYear()-1,
    ageBand,clubs:p.clubs,aliases:[name,surname,p.fullName??""].filter(Boolean),
    archiveId:p.id,careerSpells:p.spells??[],seasonStats:p.seasonStats??p.stats??[],
    careerAppsRecorded:(p.careerAppearanceRows??0)>0,careerGoalsRecorded:(p.careerGoalRows??0)>0,
    leagueAppsRecorded:(p.leagueAppearanceRows??0)>0,leagueGoalsRecorded:(p.leagueGoalRows??0)>0,
    careerApps:p.appearances,careerGoals:p.goals,leagueApps:p.leagueAppearances,
    leagueGoals:p.leagueGoals,leagueGoalSeasons:p.leagueGoalSeasons,leagueAssists:p.leagueAssists??0,leagueAssistSeasons:p.leagueAssistSeasons??0,statSeasons:p.seasons,firstYear:p.firstYear,lastYear:p.lastYear,
    caps:p.caps,internationalGoals:p.internationalGoals,birthDate:p.birthDate,
    currentCountry:p.currentCountry,currentDivision:p.currentDivision
  };
}
function archiveGuess(input:string,players:GamePlayer[]):GamePlayer|undefined{
  const key=normalise(input);
  return players.find(p=>[p.name,p.surname,...p.aliases].some(alias=>normalise(alias)===key));
}
function acceptedName(input:string,accepted:string[]){const value=normalise(input);return accepted.some(x=>normalise(x)===value);}
function playerSurnames(){
  const seen=new Set<string>();return PLAYER_DATABASE.map(p=>p.surname).filter(s=>s.length===5&&!seen.has(s)&&Boolean(seen.add(s)));
}
function pageFromPath(path:string){return path.replace(/^\/|\/$/g,"").split("/")[0]||"home";}

function Brand(){return <a className="arc-brand" href="/" aria-label="PLAYGROUND home">PLAY<span>GROUND</span><b>®</b></a>;}
function Menu({account}:{account:Account}){
  const [open,setOpen]=useState(false);
  return <div className="arc-menu-wrap">
    <button className={"arc-menu-button"+(open?" is-open":"")} onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-label="Open game menu"><span>MENU</span><b>{open?"×":"☰"}</b></button>
    <AnimatePresence>{open&&<motion.nav className="arc-menu" initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} aria-label="Game menu">
      <div className="arc-menu-top"><small>THE PLAYGROUND / SELECT A GAME</small><button onClick={()=>setOpen(false)}>CLOSE ×</button></div>
      <div className="arc-menu-links">{GAME_LINKS.map((game,i)=><a key={game.id} href={"/"+game.id}><span>{String(i+1).padStart(2,"0")}</span><b>{game.title}</b><i>↗</i></a>)}</div>
      <a className="arc-menu-profile" href="/locker-room"><span>YOUR LOCKER ROOM</span><b>{account.nickname}</b><i>↗</i></a>
    </motion.nav>}</AnimatePresence>
  </div>;
}
function TopBar({account}:{account:Account}){return <header className="arc-top"><Brand/><div className="arc-top-center"><span className="arc-live-dot"/> FOOTBALL. PLAYED DIFFERENTLY.</div><div className="arc-top-right"><a className="arc-streak-pill" href="/locker-room">🔥 {account.streak} DAY STREAK</a><Menu account={account}/></div></header>;}
function GameHeading({eyebrow,title,description,number}:{eyebrow:string;title:string;description:string;number:string}){
  return <div className="arc-page-heading"><div className="arc-eyebrow"><span/>{eyebrow}</div><div className="arc-heading-line"><div><h1>{title}</h1><p>{description}</p></div><div className="arc-file-no"><small>GAME FILE</small><b>{number}</b></div></div></div>;
}
function ModeSwitch({mode,setMode,complete}:{mode:Mode;setMode:(m:Mode)=>void;complete:boolean}){
  return <div className="arc-mode-switch"><button className={mode==="daily"?"active":""} onClick={()=>setMode("daily")}>TODAY'S CHALLENGE {complete?"✓":""}</button><button className={mode==="practice"?"active":""} onClick={()=>setMode("practice")}>PRACTICE / UNLIMITED</button><span>DAILY CLOCK · 00:00 GMT</span></div>;
}
function Frame({account,children,game,eyebrow,title,description,number,mode,setMode}:{account:Account;children:ReactNode;game:GameId;eyebrow:string;title:string;description:string;number:string;mode:Mode;setMode:(m:Mode)=>void}){
  const done=account.daily[utcDay()]?.[game]!==undefined;
  return <div className={"arc-shell arc-"+game}><TopBar account={account}/><motion.main className="arc-main" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:.32,ease:"easeOut"}}><GameHeading eyebrow={eyebrow} title={title} description={description} number={number}/><ModeSwitch mode={mode} setMode={setMode} complete={done}/>{children}</motion.main><footer className="arc-footer"><a href="/">PLAYGROUND®</a><span>THE DAILY CHANGES AT 00:00 GMT · DAILY SCORES & STREAK SAVED ON THIS DEVICE</span><a href="/locker-room">LOCKER ROOM ↗</a></footer></div>;
}
function useMode(){return useState<Mode>("daily");}
function Success({title,detail,button,onAgain}:{title:string;detail:string;button:string;onAgain:()=>void}){
  return <motion.div className="arc-result" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}><span className="arc-result-tick">✓</span><small>CHALLENGE COMPLETE</small><h2>{title}</h2><p>{detail}</p><button className="arc-button" onClick={onAgain}>{button} ↻</button></motion.div>;
}
function Card({children,className=""}:{children:React.ReactNode;className?:string}){return <section className={"arc-card "+className}>{children}</section>;}

function HomePage({account}:{account:Account}){
  const done=todayGames(account);
  return <div className="arc-shell arc-home"><TopBar account={account}/><main className="arc-home-main">
    <section className="arc-home-hero"><div><div className="arc-eyebrow"><span/> THE FOOTBALL ARCADE / EST. 2026</div><h1>NO HALF<br/><em>TIME.</em></h1><p>Quick games, proper football knowledge and a reason to come back tomorrow.</p><div className="arc-hero-actions"><a className="arc-button" href="/footle">PLAY TODAY'S FOOTLE ↗</a><a className="arc-text-link" href="#all-games">PICK YOUR GAME ↓</a></div></div>
      <div className="arc-home-graphic"><div className="arc-graphic-label">THE PLAYGROUND / 16 GAME MODES</div><div className="arc-graphic-pitch"><i className="half"/><i className="centre"/><i className="box-one"/><i className="box-two"/><motion.span className="graphic-ball" animate={{x:[0,32,-20,0],y:[0,-15,8,0],rotate:[0,180,360]}} transition={{duration:5,repeat:Infinity,ease:"easeInOut"}}/></div><div className="arc-graphic-bottom"><span>GUESS / THINK / PLAY</span><b>↗</b><span>16 WAYS TO PLAY</span></div></div>
    </section>
    <section className="arc-daily-strip"><div><small>YOUR DAILY RECORD / UTC</small><strong>{done} <i>/ 16</i></strong><span>GAMES PLAYED TODAY</span></div><div><small>YOUR STREAK</small><strong>{account.streak} <i>days</i></strong><span>BEST {account.bestStreak} DAYS</span></div><div><small>PLAYER NAME</small><strong className="nickname-stat">{account.nickname}</strong><span>LOCAL PLAYER SAVE</span></div><a href="/locker-room">OPEN LOCKER ROOM ↗</a></section>
    <section id="all-games" className="arc-game-directory"><div className="arc-section-title"><div><span>01 / THE LINE-UP</span><h2>PICK YOUR<br/><em>GAME.</em></h2></div><p>Every game has its own page. Daily challenges reset together at midnight GMT. Practice whenever you like.</p></div>
      <div className="arc-home-grid">{GAME_LINKS.map((game,i)=><motion.a href={"/"+game.id} key={game.id} className={"arc-game-tile "+game.tone} whileHover={{y:-5,rotate:i%2?1:-1}} whileTap={{scale:.985}}><div><small>PG / GAME {String(i+1).padStart(2,"0")}</small><span>{game.tag}</span></div><div className="arc-tile-art"><i>{["↗","Ⅲ","XI","?","A","▦","▤","↗","◉","501","↔","11","✳","◎","🏆","⏱"][i]}</i></div><h3>{game.title}</h3><p>{game.sub}</p><b className="arc-tile-arrow">PLAY ↗</b></motion.a>)}</div>
    </section>
    <section className="arc-home-bottom"><div><small>THE PLAYGROUND / CLUBHOUSE</small><h2>KEEP YOUR<br/><em>RUN GOING.</em></h2><p>Your nickname, daily results and streak stay saved in this browser. Practice is unlimited. No signup. Just get playing.</p><a href="/locker-room" className="arc-button">YOUR LOCKER ROOM ↗</a></div><div className="arc-home-score"><span>🔥</span><strong>{account.streak}</strong><small>DAY STREAK</small></div></section>
    </main><footer className="arc-footer"><a href="/">PLAYGROUND®</a><span>FOOTBALL, PLAYED DIFFERENTLY.</span><a href="/locker-room">YOUR ACCOUNT ↗</a></footer></div>;
}

function AccountPage({account,setAccount}:{account:Account;setAccount:(a:Account)=>void}){
 const [name,setName]=useState(account.nickname);
 const [saveMessage,setSaveMessage]=useState("");
 const update=(e:FormEvent)=>{e.preventDefault();setAccount({...account,nickname:name.trim().slice(0,18)||"PLAYER 01"});};
 const exportSave=()=>{
   const payload={format:"PLAYGROUND-LOCAL-SAVE",version:1,exportedAt:new Date().toISOString(),account};
   const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
   const url=URL.createObjectURL(blob);const link=document.createElement("a");
   link.href=url;link.download="playground-save-"+utcDay()+".json";link.click();
   window.setTimeout(()=>URL.revokeObjectURL(url),1000);
   setSaveMessage("Your local player card has been exported.");
 };
 const importSave=async(e:React.ChangeEvent<HTMLInputElement>)=>{
   const file=e.target.files?.[0];if(!file)return;
   try{
     if(file.size>2_000_000)throw new Error("That save file is unexpectedly large.");
     const parsed=JSON.parse(await file.text());
     const incoming=parsed?.format==="PLAYGROUND-LOCAL-SAVE"?parsed.account:parsed;
     if(!incoming||typeof incoming!=="object"||typeof incoming.nickname!=="string"||
       !incoming.daily||typeof incoming.daily!=="object"||Array.isArray(incoming.daily)||
       !incoming.totals||typeof incoming.totals!=="object"||Array.isArray(incoming.totals)||
       !Number.isFinite(Number(incoming.streak))||!Number.isFinite(Number(incoming.bestStreak)))
       throw new Error("This file is not a valid PLAYGROUND local save.");
     const restored:Account={
       ...EMPTY_ACCOUNT,
       nickname:incoming.nickname.trim().slice(0,18)||"PLAYER 01",
       createdAt:typeof incoming.createdAt==="string"?incoming.createdAt:new Date().toISOString(),
       streak:Math.max(0,Math.floor(Number(incoming.streak))),
       bestStreak:Math.max(0,Math.floor(Number(incoming.bestStreak))),
       lastDailyDate:typeof incoming.lastDailyDate==="string"?incoming.lastDailyDate:"",
       daily:incoming.daily,
       totals:Object.fromEntries(Object.entries(incoming.totals).map(([key,value])=>[key,Math.max(0,Math.floor(Number(value)||0))]))
     };
     setAccount(restored);setName(restored.nickname);
     setSaveMessage("Save restored on this device. Your streak and scorecard are back.");
   }catch(problem){
     setSaveMessage(problem instanceof Error?problem.message:"Could not read this save file.");
   }finally{e.target.value="";}
 };
 return <div className="arc-shell arc-locker"><TopBar account={account}/><main className="arc-main"><GameHeading eyebrow="THE CLUBHOUSE / YOUR SAVE" title="LOCKER ROOM." description="Your local player card. Your nickname, daily scores and streak stay in this browser." number="PROFILE"/>
  <Card className="arc-profile-card"><div className="arc-profile-mark">PG</div><div className="arc-profile-details"><small>PLAYER CARD / LOCAL SAVE</small><h2>{account.nickname}</h2><p>PLAYER SINCE {new Date(account.createdAt).toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</p></div><div className="arc-profile-stats"><div><b>{account.streak}</b><span>STREAK</span></div><div><b>{account.bestStreak}</b><span>BEST</span></div><div><b>{Object.values(account.totals).reduce((n,v)=>n+v,0)}</b><span>GAMES</span></div></div></Card>
  <Card><small className="arc-card-kicker">01 / YOUR PLAYER NAME</small><form className="arc-name-form" onSubmit={update}><input value={name} onChange={e=>setName(e.target.value)} maxLength={18} placeholder="Choose a nickname"/><button className="arc-button">SAVE NAME ↗</button></form><p className="arc-muted">This is a local save on this device and browser. It does not currently sync between phones or computers.</p></Card>
  <Card><small className="arc-card-kicker">02 / TODAY'S SCORECARD · {utcDay()} GMT</small><div className="arc-score-list">{GAME_LINKS.map(g=><div key={g.id}><span>{g.title}</span><b>{account.daily[utcDay()]?.[g.id]!==undefined?account.daily[utcDay()][g.id]+" PTS":"NOT PLAYED"}</b></div>)}</div></Card>
  <Card><small className="arc-card-kicker">03 / YOUR RECORD</small><div className="arc-record-grid">{GAME_LINKS.map(g=><div key={g.id}><span>{g.title}</span><strong>{account.totals[g.id]??0}</strong><small>COMPLETIONS</small></div>)}</div></Card>
  <Card className="arc-save-tools"><small className="arc-card-kicker">04 / BACK UP YOUR PLAYER CARD</small><p className="arc-muted">Export a small JSON backup to move your nickname, streak and game history to another phone or browser. Importing a save replaces the current local player card.</p><div className="arc-save-actions"><button className="arc-button" type="button" onClick={exportSave}>EXPORT LOCAL SAVE ↓</button><label className="arc-button arc-import-button">IMPORT SAVE ↑<input type="file" accept="application/json,.json" onChange={importSave}/></label></div>{saveMessage&&<p className="arc-save-message" role="status">{saveMessage}</p>}</Card>
  <p className="arc-muted">Daily streaks roll over at exactly 00:00 GMT (UTC), not local phone midnight. Practice rounds do not affect your streak. Clearing browser data can erase this local save; export a backup before changing devices.</p>
 </main><footer className="arc-footer"><a href="/">PLAYGROUND®</a><span>YOUR GAME. YOUR SAVE.</span><a href="/">BACK TO ARCADE ↑</a></footer></div>;
}

function LowballPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();
 const [step,setStep]=useState(0);
 const [score,setScore]=useState(0);
 const [pick,setPick]=useState<number|null>(null);
 const [runDone,setRunDone]=useState(false);
 const [used,setUsed]=useState<string[]>([]);
 const [practiceSeed,setPracticeSeed]=useState(()=>String(Math.floor(Math.random()*1e12)));
 const done=account.daily[utcDay()]?.lowball!==undefined;
 const seed=mode==="daily"?"LOWBALL:"+utcDay():"LOWBALL:PRACTICE:"+practiceSeed;
 const {players:archivePlayers,loading:poolLoading,error:poolError,retry:retryPool}=useArchivePlayers(true,mode==="daily"?ARCHIVE_POOL_SEED:ARCHIVE_POOL_SEED+":"+practiceSeed,1600);
 const archivePool=useMemo(()=>archivePlayers.map(archivePlayerToGamePlayer)
   .filter(p=>p.leagueGoalSeasons>=2&&p.leagueGoals>=0&&p.name!=="Unknown player"),[archivePlayers]);
 type DuelStatPlayer={name:string;value:number;club:string;seasons:number;id:string};
 const fallbackPool:DuelStatPlayer[]=LEAGUE_GOALS.map(p=>({name:p.name,value:p.value,club:"Premier League archive",seasons:1,id:p.name}));
 const sourcePool:DuelStatPlayer[]=archivePool.length>=2
   ?archivePool.map(p=>({name:p.name,value:p.leagueGoals,club:p.club,seasons:p.leagueGoalSeasons,id:p.archiveId}))
   :fallbackPool;
 const level=Math.min(3,Math.floor(step/5));
 const levelNames=["EASY","MEDIUM / STANDARD","HARD","EXTREME"];
 const metric=archivePool.length>=2?"RECORDED LEAGUE GOALS":"PREMIER LEAGUE GOALS";
 const pair=useMemo(()=>{
   const candidates=sourcePool.filter(p=>!used.includes(p.id));
   const available=candidates.length>=2?candidates:sourcePool;
   const randomized=shuffle(available,hashSeed(seed+":DUEL:"+step));
   const minGap=[.28,.12,.04,0][level];
   const maxGap=[1,.28,.12,.04][level];
   let selectedPair:[DuelStatPlayer,DuelStatPlayer]|null=null;
   for(let i=0;i<randomized.length&&!selectedPair;i++){
     for(let j=i+1;j<randomized.length;j++){
       const high=Math.max(randomized[i].value,randomized[j].value);
       const low=Math.min(randomized[i].value,randomized[j].value);
       if(high===low&&level<3)continue;
       const gap=(high-low)/Math.max(1,high);
       if(gap>=minGap&&(level===3?gap<=.04:gap<maxGap)){
         selectedPair=[randomized[i],randomized[j]];
         break;
       }
     }
   }
   return selectedPair??(randomized.length>=2?[randomized[0],randomized[1]]:[fallbackPool[0],fallbackPool[1]]);
 },[sourcePool,used,seed,step,level]);
 const correct=pair[0].value>pair[1].value?0:1;
 const choose=(i:number)=>{
   if(pick!==null||runDone||done&&mode==="daily")return;
   setPick(i);
   if(i===correct){
     setScore(v=>v+100+(level*50));
     setUsed(v=>[...v,pair[0].id,pair[1].id]);
   }else{
     setRunDone(true);
     if(mode==="daily")onDaily("lowball",score);
   }
 };
 const next=()=>{
   if(pick===null)return;
   if(step+1>=10&&mode==="daily"){
     setRunDone(true);onDaily("lowball",score+100+(level*50));return;
   }
   setStep(v=>v+1);setPick(null);
 };
 const restart=(newMode:Mode=mode)=>{
   setStep(0);setScore(0);setPick(null);setRunDone(false);setUsed([]);
   if(newMode==="practice")setPracticeSeed(String(Math.floor(Math.random()*1e12)));
 };
 return <Frame account={account} game="lowball" eyebrow="STAT FACE-OFF / QUICK FIRE" title="WHO'S GOT MORE?" description="Two players. One number. Pick the bigger recorded league goal total. Your streak gets harder every five correct answers." number="01" mode={mode} setMode={m=>{setMode(m);restart(m);}}>
  {done&&mode==="daily"?<Success title="DAILY DONE." detail="Today's ten-duel challenge is banked. Practice runs are unlimited." button="PRACTICE" onAgain={()=>{setMode("practice");restart("practice");}}/>:
   poolLoading&&archivePlayers.length===0?<Card className="lb-panel lb-loading"><motion.div className="lb-loading-ball" animate={{y:[0,-12,0],rotate:[0,180,360]}} transition={{duration:1.2,repeat:Infinity,ease:"easeInOut"}}>⚽</motion.div><b>SCOUTING THE ARCHIVE</b><p>Building a fresh pool of footballers and recorded stats…</p><span>THE FIRST LOAD CAN TAKE A LITTLE LONGER. NEXT VISITS USE A LOCAL CACHE.</span></Card>:
   runDone?<Success title={pick===null?"RUN COMPLETE.":"STREAK ENDED."} detail={"You reached "+step+" correct in a row and banked "+score+" points."} button="NEW RUN" onAgain={()=>restart(mode)}/>:
   <Card className="lb-panel">
    <div className="arc-game-meta"><span>{mode==="daily"?"DAILY DUEL "+(step+1)+" / 10":"STREAK "+step+" · "+levelNames[level]}</span><motion.b key={score} initial={{opacity:0,y:8,scale:.9}} animate={{opacity:1,y:0,scale:1}} transition={{type:"spring",stiffness:320,damping:18}}>{score} PTS</motion.b></div>
    <div className="lb-streak-meter">{[0,1,2,3].map(i=><span key={i} className={i<=level?"on":""}>{i===0?"EASY":i===1?"MED":i===2?"HARD":"EXTREME"}</span>)}</div>
    <div className="lb-vs">
     <div className="lb-player"><small>PLAYER A</small><strong>{pair[0].name}</strong><span>{pick!==null&&<motion.span initial={{opacity:0,y:12,scale:.92}} animate={{opacity:1,y:0,scale:1}} transition={{duration:.3}}>{pair[0].value.toLocaleString("en-GB")} GOALS</motion.span>}{pick===null?"— — —":""}</span><i>{pair[0].club}</i></div>
     <div className="lb-vs-mark">VS</div>
     <div className="lb-player"><small>PLAYER B</small><strong>{pair[1].name}</strong><span>{pick!==null&&<motion.span initial={{opacity:0,y:12,scale:.92}} animate={{opacity:1,y:0,scale:1}} transition={{duration:.3}}>{pair[1].value.toLocaleString("en-GB")} GOALS</motion.span>}{pick===null?"— — —":""}</span><i>{pair[1].club}</i></div>
    </div>
    <div className="lb-actions">{pair.map((p,i)=><button key={p.id} onClick={()=>choose(i)} disabled={pick!==null} className={pick===null?"":i===correct?"correct":"wrong"}>MORE GOALS ↗</button>)}</div>
    {pick!==null&&<motion.div className={"arc-feedback "+(pick===correct?"quiz-goal":"quiz-miss")} initial={{opacity:0,y:14,scale:.97}} animate={{opacity:1,y:0,scale:1}} transition={{type:"spring",stiffness:240,damping:22}}><b>{pick===correct?"YOU CALLED IT. ⚽":"STREAK OVER."}</b><p>{pair[correct].name} has {pair[correct].value.toLocaleString("en-GB")} recorded league goals in the source records.</p><button className="arc-button" onClick={pick===correct?next:()=>{if(mode==="daily")onDaily("lowball",score);setRunDone(true);}}>{pick===correct?(mode==="daily"&&step===9?"BANK DAILY SCORE":"NEXT DUEL"):"SEE RUN RESULT"} ↗</button></motion.div>}
    <div className="lb-data-note"><b>{metric}</b><span>{archivePool.length>=2?"Source rows with recorded league statistics; season coverage varies by player.":"Starter fallback list while the shared archive is unavailable."}</span>{poolError&&<button onClick={retryPool}>RETRY ARCHIVE</button>}</div>
   </Card>}
 </Frame>;
}

function ClimbPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();
 const [difficulty,setDifficulty]=useState<QuizTier>("EASY");
 const [practiceSeed,setPracticeSeed]=useState(()=>String(Math.floor(Math.random()*1e12)));
 const [step,setStep]=useState(0);const [lives,setLives]=useState(3);const [score,setScore]=useState(0);const [answer,setAnswer]=useState("");const [ended,setEnded]=useState(false);
 const done=account.daily[utcDay()]?.["the-climb"]!==undefined;
 const seed=mode==="daily"?"CLIMB:"+utcDay()+":"+difficulty:"CLIMB:PRACTICE:"+practiceSeed+":"+difficulty;
 const {bank,loading,error,retry}=useQuestionBank();
 const questions=useMemo(()=>bank?makeQuestionRound(bank,difficulty,hashSeed(seed),5):[],[bank,difficulty,seed]);
 const question=questions[step];
 const choose=(value:string)=>{
   if(answer||ended||!question)return;
   setAnswer(value);
   if(value===question.answer)setScore(v=>v+100+lives*25);
   else setLives(v=>v-1);
 };
 const next=()=>{
   if(lives<=0||step===4){setEnded(true);if(mode==="daily")onDaily("the-climb",score);return;}
   setStep(v=>v+1);setAnswer("");
 };
 const restart=(newMode:Mode=mode,newDifficulty:QuizTier=difficulty)=>{
   setDifficulty(newDifficulty);setStep(0);setLives(3);setScore(0);setAnswer("");setEnded(false);
   if(newMode==="practice")setPracticeSeed(String(Math.floor(Math.random()*1e12)));
 };
 const levels:QuizTier[]=["EASY","MEDIUM","HARD","EXTREME"];
 return <Frame account={account} game="the-climb" eyebrow="SURVIVAL QUIZ / FIVE QUESTIONS" title="KEEP CLIMBING." description="Five source-backed football questions. Three lives. Every round mixes English football with the other major European leagues." number="02" mode={mode} setMode={m=>{setMode(m);restart(m);}}>
 {done&&mode==="daily"?<Success title="RUN COMPLETE." detail="Your daily climb is banked. Unlimited practice has fresh questions." button="PRACTICE RUN" onAgain={()=>{setMode("practice");restart("practice");}}/>:
  loading&&!bank?<Card className="climb-loading"><motion.div animate={{y:[0,-10,0],rotate:[0,180,360]}} transition={{duration:1.4,repeat:Infinity}}>⚽</motion.div><b>OPENING THE QUESTION ARCHIVE</b><span>CHECKING FOUR DIFFICULTY POOLS…</span></Card>:
  error||!bank?<Card className="arc-feedback"><b>QUESTION BANK UNAVAILABLE</b><p>{error||"The validated football question bank could not be opened."}</p><button className="arc-button" onClick={retry}>RETRY QUESTION BANK ↗</button></Card>:
  <Card className="climb-play">
   <div className="arc-game-meta"><span>QUESTION {step+1} / 5</span><b>{lives} LIVES · {score} PTS</b></div>
   <div className="grid-difficulty">{levels.map(level=><button key={level} className={difficulty===level?"active":""} onClick={()=>restart(mode,level)}>{level==="MEDIUM"?"MEDIUM / STANDARD":level}</button>)}</div>
   <p className="difficulty-note">{difficultyDescription(difficulty)}</p>
   <p className="difficulty-note">{difficultyDescription(difficulty)}</p>
   <div className="climb-life-track">{[0,1,2].map(i=><i key={i} className={i<lives?"alive":""}/>)}</div>
   <div className="climb-source-line"><span>{question?.category??"FOOTBALL"}</span><span>{question?.region==="ENGLISH"?"ENGLISH FOOTBALL":"OTHER EUROPEAN LEAGUES"}</span></div>
   <h2>{ended?"RUN COMPLETE.":question?.question??"No question available."}</h2>
   {ended?<div className="arc-feedback"><p>You climbed {step+1} questions and banked {score} points.</p><button className="arc-button" onClick={()=>restart(mode)}>RUN IT BACK ↻</button></div>:
    <><div className="climb-options">{question?.options.map(option=><motion.button key={option} whileTap={{scale:.985}} onClick={()=>choose(option)} disabled={!!answer} className={answer===option?(option===question.answer?"correct":"wrong"):""}>{option}<i>↗</i></motion.button>)}</div>
     {answer&&<motion.div className={"arc-feedback "+(answer===question.answer?"quiz-goal":"quiz-miss")} initial={{opacity:0,y:12,scale:.98}} animate={{opacity:1,y:0,scale:1}}><b>{answer===question.answer?"GOAL! RIGHT ANSWER.":"NOT THIS TIME."}</b><p>{question.explanation}</p><small>{question.source}</small><button className="arc-button" onClick={next}>{step===4||lives<=0?"SEE RESULT":"NEXT QUESTION"} ↗</button></motion.div>}
    </>}
   <p className="arc-muted">Question bank: 800+ per difficulty. Every run uses a 75% English-club / 25% other-league mix.</p>
   <div className="arc-game-foot"><span>5 QUESTIONS · 3 LIVES</span><span>{bank.meta.distribution[difficulty].total} IN THIS TIER</span></div>
  </Card>}
 </Frame>;
}

type DraftDifficulty="EASY"|"STANDARD"|"HARD"|"EXTREME";
type DraftCandidate=GamePlayer&{cost:number;rating:number};
const DRAFT_LEVELS:DraftDifficulty[]=["EASY","STANDARD","HARD","EXTREME"];
const FALLBACK_DRAFT=[
 {name:"Alisson",pos:"GK",cost:8},{name:"Trent Alexander-Arnold",pos:"DEF",cost:9},{name:"Virgil van Dijk",pos:"DEF",cost:10},{name:"Rúben Dias",pos:"DEF",cost:9},{name:"Andrew Robertson",pos:"DEF",cost:8},{name:"Rodri",pos:"MID",cost:10},{name:"Kevin De Bruyne",pos:"MID",cost:10},{name:"Jude Bellingham",pos:"MID",cost:10},{name:"Bukayo Saka",pos:"FWD",cost:9},{name:"Erling Haaland",pos:"FWD",cost:11},{name:"Mohamed Salah",pos:"FWD",cost:11},{name:"Declan Rice",pos:"MID",cost:8},{name:"William Saliba",pos:"DEF",cost:8},{name:"Son Heung-min",pos:"FWD",cost:9},{name:"Bruno Fernandes",pos:"MID",cost:9},{name:"Ederson",pos:"GK",cost:7}
];
function draftCost(p:GamePlayer):number{
 const experience=Math.sqrt(Math.max(0,p.careerApps))/9;
 const output=Math.sqrt(Math.max(0,p.careerGoals))/5;
 const leagueGoals=Math.sqrt(Math.max(0,p.leagueGoals))/7;
 return Math.max(4,Math.min(14,Math.round(4+experience+output+leagueGoals)));
}
function DraftPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();const [difficulty,setDifficulty]=useState<DraftDifficulty>("STANDARD");
 const [practiceSeed,setPracticeSeed]=useState(()=>String(Math.floor(Math.random()*1e12)));
 const [picked,setPicked]=useState<string[]>([]);const [locked,setLocked]=useState(false);
 const done=account.daily[utcDay()]?.["draft-xi"]!==undefined;
 const seed=mode==="daily"?"DRAFT:"+utcDay()+":"+difficulty:"DRAFT:PRACTICE:"+practiceSeed+":"+difficulty;
 const {players:archivePlayers,loading,error,retry}=useArchivePlayers(true,mode==="daily"?ARCHIVE_POOL_SEED:ARCHIVE_POOL_SEED+":"+practiceSeed,1600);
 const archivePool=useMemo(()=>archivePlayers.map(archivePlayerToGamePlayer)
   .filter(p=>["GK","DEF","MID","FWD"].includes(p.position)&&p.name.trim()&&p.club!=="Unknown club")
   .map(p=>({...p,cost:draftCost(p),rating:Math.min(99,Math.round(35+Math.sqrt(Math.max(0,p.careerApps))*2+Math.sqrt(Math.max(0,p.careerGoals))*1.5))} as DraftCandidate)),[archivePlayers]);
 const fallbackPool=useMemo(()=>FALLBACK_DRAFT.map((p,i)=>({
   ...PLAYER_DATABASE.find(x=>normalise(x.name)===normalise(p.name))!,
   name:p.name,surname:p.name.split(" ").slice(-1)[0],position:p.pos as Player["position"],
   club:"Starter roster",league:"Starter game",active:true,ageBand:"Unknown",clubs:["Starter roster"],aliases:[p.name],
   archiveId:"fallback-"+i,careerSpells:[],seasonStats:[],careerAppsRecorded:false,careerGoalsRecorded:false,leagueAppsRecorded:false,leagueGoalsRecorded:false,careerApps:0,careerGoals:0,leagueApps:0,leagueGoals:0,leagueGoalSeasons:0,leagueAssists:0,leagueAssistSeasons:0,
   statSeasons:0,firstYear:null,lastYear:null,caps:null,internationalGoals:null,birthDate:"",currentCountry:"",currentDivision:null,
   cost:p.cost,rating:60
 } as DraftCandidate)),[]);
 const basePool=archivePool.length>=25?archivePool:fallbackPool;
 const roster=useMemo(()=>shuffle(basePool,hashSeed(seed+":ROSTER")).slice(0,72),[basePool,seed]);
 const budget=({EASY:105,STANDARD:85,HARD:75,EXTREME:65} as Record<DraftDifficulty,number>)[difficulty];
 const selected=roster.filter(p=>picked.includes(p.archiveId));
 const spent=selected.reduce((n,p)=>n+p.cost,0);
 const counts={
   GK:selected.filter(p=>p.position==="GK").length,
   DEF:selected.filter(p=>p.position==="DEF").length,
   MID:selected.filter(p=>p.position==="MID").length,
   FWD:selected.filter(p=>p.position==="FWD").length
 };
 const valid=counts.GK===1&&counts.DEF===4&&counts.MID===3&&counts.FWD===3&&picked.length===11&&spent<=budget;
 const sortedSelected=[...selected].sort((a,b)=>["GK","DEF","MID","FWD"].indexOf(a.position)-["GK","DEF","MID","FWD"].indexOf(b.position));
 const reset=(newMode:Mode=mode,newDifficulty:DraftDifficulty=difficulty)=>{
   setDifficulty(newDifficulty);setPicked([]);setLocked(false);
   if(newMode==="practice")setPracticeSeed(String(Math.floor(Math.random()*1e12)));
 };
 const toggle=(id:string)=>{
   if(locked)return;
   setPicked(old=>old.includes(id)?old.filter(x=>x!==id):old.length<11?[...old,id]:old);
 };
 const score=Math.max(0,1000-(spent*4)+selected.reduce((n,p)=>n+Math.floor(p.rating/10),0));
 return <Frame account={account} game="draft-xi" eyebrow="SQUAD BUILDER / 4—3—3" title="PICK YOUR XI." description="Build a 4—3—3 from a fresh archive player pool. Credits are game values based on recorded career output, not market prices or transfer valuations." number="03" mode={mode} setMode={m=>{setMode(m);reset(m);}}>
 {done&&mode==="daily"?<Success title="SQUAD SUBMITTED." detail="Your daily Draft XI is banked. Unlimited practice draws a fresh squad pool." button="BUILD AGAIN" onAgain={()=>{setMode("practice");reset("practice");}}/>:
  <Card className="draft-game">
   <div className="arc-game-meta"><span>{picked.length} / 11 SELECTED</span><b>{counts.GK} GK · {counts.DEF} DEF · {counts.MID} MID · {counts.FWD} FWD</b></div>
   <div className="grid-difficulty">{DRAFT_LEVELS.map(level=><button key={level} className={difficulty===level?"active":""} onClick={()=>reset(mode,level)}>{difficultyLabel(level)}</button>)}</div>
   <div className="draft-budget"><div><small>GAME CREDITS USED</small><strong>{spent}<i> / {budget} credits</i></strong></div><span>{budget-spent} LEFT</span><div className="draft-budget-line"><i style={{width:Math.min(100,spent/budget*100)+"%"}}/></div></div>
   {loading&&archivePool.length===0?<div className="grid-loading"><motion.div animate={{rotate:360}} transition={{duration:1.5,repeat:Infinity,ease:"linear"}}>⚽</motion.div><b>BUILDING THE PLAYER MARKET</b><span>SELECTING A FRESH 4—3—3 PLAYER POOL…</span></div>:
    <div className="draft-game-layout">
     <div className="draft-game-pitch"><span>4 — 3 — 3 / {sortedSelected.length} PLAYERS</span><div className="draft-midline"/><div className="draft-circle"/>
      {sortedSelected.map((p,i)=><div className={"draft-player dp"+i} key={p.archiveId}><b>{p.position}</b><small>{p.surname}</small></div>)}
     </div>
     <div className="draft-pick-list">{roster.map(p=><button key={p.archiveId} onClick={()=>toggle(p.archiveId)} className={picked.includes(p.archiveId)?"chosen":""} disabled={!picked.includes(p.archiveId)&&(picked.length>=11||spent+p.cost>budget||locked)}>
       <span><b>{p.name}</b><small><ClubBadge name={p.club} size={17}/> {p.club} · {p.position}</small></span><strong>{p.cost}</strong><i>{picked.includes(p.archiveId)?"−":"+"}</i>
      </button>)}</div>
    </div>}
   <div className="arc-game-foot"><span>{locked?"YOUR XI IS LOCKED":valid?"SQUAD RULES MET":"1 GK · 4 DEF · 3 MID · 3 FWD REQUIRED"}</span><button className="arc-button" disabled={!valid||locked} onClick={()=>{setLocked(true);if(mode==="daily")onDaily("draft-xi",score);}}>LOCK IN XI ↗</button><button className="arc-quiet" onClick={()=>reset(mode)}>RESET</button><button className="arc-quiet" onClick={()=>{retry();reset(mode);}}>NEW POOL ↻</button></div>
   {locked&&<div className="arc-feedback"><b>SQUAD LOCKED · {score} POINTS</b><p>{spent} of {budget} game credits used. This is a custom game rating, not a real transfer-value ranking.</p><button className="arc-button" onClick={()=>reset(mode)}>BUILD ANOTHER SIDE ↗</button></div>}
   <p className="arc-muted">{archivePool.length>=25?"Players and clubs are drawn from the shared archive pool.":"The archive pool is unavailable; a small starter roster is active."} Game credits are derived from recorded appearances and goals, where available. They are not monetary fees.</p>
   {error&&<div className="arc-feedback"><b>ARCHIVE FALLBACK</b><p>{error}</p><button className="arc-quiet" onClick={retry}>RETRY PLAYER POOL</button></div>}
  </Card>}
 </Frame>;
}


const WORDS=[...new Set([...playerSurnames(),"MALEN","BARRY","DIAZ"])];
function wordleEval(guess:string,target:string){const result=Array(5).fill("absent");const letters=target.split("");for(let i=0;i<5;i++){if(guess[i]===target[i]){result[i]="correct";letters[i]="";}}for(let i=0;i<5;i++){if(result[i]==="correct")continue;const at=letters.indexOf(guess[i]);if(at>=0){result[i]="present";letters[at]="";}}return result;}
function FootlePage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();
 const [practiceSeed,setPracticeSeed]=useState(()=>String(Math.floor(Math.random()*1e12)));
 const [typed,setTyped]=useState("");const [guesses,setGuesses]=useState<string[]>([]);const [end,setEnd]=useState(false);const [wordError,setWordError]=useState("");
 const done=account.daily[utcDay()]?.footle!==undefined;
 const seed=mode==="daily"?"FOOTLE:"+utcDay():"FOOTLE:PRACTICE:"+practiceSeed;
 const {players:archivePlayers,loading,error}=useArchivePlayers(true,mode==="daily"?ARCHIVE_POOL_SEED:ARCHIVE_POOL_SEED+":"+practiceSeed,1600);
 const bank=useMemo(()=>{
   const archived=archivePlayers.map(p=>{
     const parts=p.name.trim().split(/\s+/).filter(Boolean);
     const raw=parts.slice(-1)[0]??"";
     return raw.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z]/g,"");
   }).filter(name=>name.length===5);
   return [...new Set([...archived,...WORDS])].sort((a,b)=>a.localeCompare(b));
 },[archivePlayers]);
 const target=bank.length?bank[hashSeed(seed+":answer")%bank.length]:WORDS[0];
 const win=guesses.at(-1)===target;
 const submitWord=()=>{
   const word=typed.toUpperCase();
   if(word.length!==5||guesses.includes(word)||end)return;
   if(!bank.includes(word)){setWordError("NOT IN THE PLAYER LIST — TRY A RECORDED FIVE-LETTER SURNAME.");return;}
   setWordError("");
   const next=[...guesses,word];setGuesses(next);setTyped("");
   if(word===target||next.length===6){setEnd(true);if(mode==="daily")onDaily("footle",word===target?Math.max(100,700-next.length*75):0);}
 };
 const submit=(e:FormEvent)=>{e.preventDefault();submitWord();};
 const keyStatus=(letter:string)=>{
   let status="";
   for(const guess of guesses){
     if(!guess.includes(letter))continue;
     const colours=wordleEval(guess,target);
     if([...guess].some((value,i)=>value===letter&&colours[i]==="correct"))return "correct";
     if([...guess].some((value,i)=>value===letter&&colours[i]==="present"))status="present";
     else if(!status)status="absent";
   }
   return status;
 };
 const keyRows=["QWERTYUIOP","ASDFGHJKL","ZXCVBNM"];
 const restart=(newMode:Mode=mode)=>{
   if(newMode==="practice")setPracticeSeed(String(Math.floor(Math.random()*1e12)));
   setTyped("");setGuesses([]);setEnd(false);setWordError("");
 };
 const updateTyped=(value:string)=>{setWordError("");setTyped(value.replace(/[^a-z]/gi,"").slice(0,5));};
 return <Frame account={account} game="footle" eyebrow="THE FIVE-LETTER FOOTBALL WORD" title="FOOTLE." description="Find the five-letter football surname in six guesses. A fresh shared daily word, plus an archive-backed pool for unlimited practice." number="05" mode={mode} setMode={m=>{setMode(m);restart(m);}}>
 {done&&mode==="daily"?<Success title="TODAY'S FOOTLE IS DONE." detail="One shared daily word. Infinite archive-backed practice is still open." button="UNLIMITED PRACTICE" onAgain={()=>{setMode("practice");restart("practice");}}/>:
  loading&&archivePlayers.length===0?<Card className="footle-loading"><motion.div animate={{rotate:360}} transition={{duration:1.5,repeat:Infinity,ease:"linear"}}>⚽</motion.div><b>SCOUTING FIVE-LETTER NAMES</b><span>BUILDING A FRESH WORD BANK FROM THE PLAYER ARCHIVE…</span></Card>:
  <Card className="footle-game">
   <div className="arc-game-meta"><span>6 GUESSES / 5 LETTERS</span><b>{bank.length} VALID PLAYER SURNAMES</b></div>
   <div className="footle-board">{Array.from({length:6},(_,r)=><div className="footle-row" key={r}>{Array.from({length:5},(_,c)=>{const word=guesses[r];const colour=word?wordleEval(word,target)[c]:"";const character=word?.[c]??(r===guesses.length?typed[c]??"":"");return <motion.div key={r+"-"+c+"-"+character} initial={{opacity:.65,rotateX:character?70:0,y:character?-3:0}} animate={{opacity:1,rotateX:0,y:0}} transition={{duration:.24,delay:word?c*.07:0}} className={"footle-cell "+colour}>{character}</motion.div>;})}</div>)}</div>
   {end&&<motion.div className={"arc-feedback "+(win?"footle-win":"footle-over")} initial={{opacity:0,y:14,scale:.97}} animate={{opacity:1,y:0,scale:1}} transition={{duration:.28}}><b>{win?"GOAL! YOU GOT IT.":"THE WORD WAS "+target}</b><p>{win?"A proper bit of football knowledge. That's in the back of the net.":"One for the next round. Keep your streak alive."}</p>{win&&<motion.span className="footle-goal-ball" initial={{scale:0,rotate:-90}} animate={{scale:1,rotate:0}} transition={{type:"spring",stiffness:260,damping:12}}>⚽</motion.span>}{mode==="practice"&&<button className="arc-button" onClick={()=>restart("practice")}>NEXT WORD ↗</button>}</motion.div>}
   <form className="footle-entry" onSubmit={submit}><input type="text" inputMode="text" enterKeyHint="go" autoCapitalize="characters" autoComplete="off" spellCheck={false} value={typed} onChange={e=>updateTyped(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"||e.key==="Go"||e.key==="NumpadEnter"){e.preventDefault();e.currentTarget.form?.requestSubmit();}}} placeholder="TYPE A 5-LETTER NAME" maxLength={5} disabled={end}/><button className="arc-button" type="submit" disabled={typed.length!==5||end||guesses.includes(typed.toUpperCase())}>ENTER ↵</button></form>
   {wordError&&<p className="footle-word-error" role="status">{wordError}</p>}
   <div className="footle-keyboard" aria-label="On-screen keyboard">{keyRows.map((row,i)=><div className="footle-key-row" key={row}>{row.split("").map(letter=><button type="button" key={letter} className={keyStatus(letter)} aria-label={letter+" key"} onClick={()=>!end&&updateTyped(typed+letter)}>{letter}</button>)}{i===2&&<><button type="button" className="wide-key" onClick={submitWord} disabled={end||typed.length!==5||guesses.includes(typed.toUpperCase())}>ENTER</button><button type="button" className="wide-key" aria-label="Delete last letter" onClick={()=>updateTyped(typed.slice(0,-1))} disabled={end}>⌫</button></>}</div>)}</div>
   <div className="footle-note">GREEN = RIGHT LETTER / RIGHT PLACE · AMBER = RIGHT LETTER / WRONG PLACE · GREY = NOT IN THE WORD</div>
   {error&&<p className="arc-muted">The shared player archive is unavailable. The included football surname list remains playable.</p>}
  </Card>}
 </Frame>;
}

type ConnectionsDifficulty="EASY"|"STANDARD"|"HARD"|"EXTREME";
type DynamicGroup={name:string;color:string;members:GamePlayer[]};
function buildConnectionsGroups(players:GamePlayer[],difficulty:ConnectionsDifficulty,seed:number):DynamicGroup[]{
 const dimensions:{label:string;get:(p:GamePlayer)=>string}[]=[
   {label:"NATIONALITY",get:p=>p.nationality!=="Unlisted"?p.nationality:""},
   {label:"POSITION",get:p=>p.position},
   {label:"LATEST LEAGUE",get:p=>p.league!=="Unlisted"?p.league:""},
   {label:"CAREER START DECADE",get:p=>p.firstYear===null?"":Math.floor(p.firstYear/10)*10+"s"}
 ];
 const limits:{min:number;max:number}={
   EASY:{min:45,max:Number.POSITIVE_INFINITY},
   STANDARD:{min:16,max:90},
   HARD:{min:7,max:35},
   EXTREME:{min:4,max:16}
 }[difficulty];
 type GroupOption={dimension:string;value:string;members:GamePlayer[];key:string};
 const options:GroupOption[]=[];
 for(const dimension of dimensions){
   const buckets=new Map<string,GamePlayer[]>();
   for(const player of players){
     const value=dimension.get(player);if(!value)continue;
     const list=buckets.get(value)??[];
     if(!list.some(p=>p.archiveId===player.archiveId))list.push(player);
     buckets.set(value,list);
   }
   for(const [value,members] of buckets){
     if(members.length<limits.min||members.length>limits.max)continue;
     const selected=shuffle(members,seed+dimension.label.length*41+value.length*17).slice(0,4);
     if(selected.length!==4||new Set(selected.map(p=>p.archiveId)).size!==4)continue;
     options.push({dimension:dimension.label,value,members:selected,key:dimension.label+":"+value});
   }
 }
 if(options.length<4){
   // Ease the member-count limits only when the strict difficulty filter has too few candidates.
   for(const dimension of dimensions){
     const buckets=new Map<string,GamePlayer[]>();
     for(const player of players){const value=dimension.get(player);if(!value)continue;const list=buckets.get(value)??[];if(!list.some(p=>p.archiveId===player.archiveId))list.push(player);buckets.set(value,list);}
     for(const [value,members] of buckets){
       if(members.length<4)continue;
       const key=dimension.label+":"+value;
       if(options.some(option=>option.key===key))continue;
       const selected=shuffle(members,seed+dimension.label.length*43+value.length*19).slice(0,4);
       options.push({dimension:dimension.label,value,members:selected,key});
     }
   }
 }
 if(options.length<4)return [];
 const ordered=shuffle(options,seed);
 const selected:GroupOption[]=[];
 const usedPlayers=new Set<string>();
 const search=(depth:number,usedDimensions:Set<string>):boolean=>{
   if(depth===4)return true;
   for(const option of ordered){
     if(selected.some(item=>item.key===option.key))continue;
     // Prefer four different types of connection, then allow repeats only when data coverage requires it.
     if(usedDimensions.has(option.dimension)&&ordered.some(item=>item.dimension!==option.dimension&&!usedDimensions.has(item.dimension)))continue;
     if(option.members.some(player=>usedPlayers.has(player.archiveId)))continue;
     selected.push(option);option.members.forEach(player=>usedPlayers.add(player.archiveId));
     const nextDimensions=new Set(usedDimensions);nextDimensions.add(option.dimension);
     if(search(depth+1,nextDimensions))return true;
     selected.pop();option.members.forEach(player=>usedPlayers.delete(player.archiveId));
   }
   return false;
 };
 if(!search(0,new Set())){
   selected.length=0;usedPlayers.clear();
   for(const option of ordered){
     if(selected.some(item=>item.key===option.key)||option.members.some(player=>usedPlayers.has(player.archiveId)))continue;
     selected.push(option);option.members.forEach(player=>usedPlayers.add(player.archiveId));
     if(selected.length===4)break;
   }
 }
 if(selected.length!==4||usedPlayers.size!==16)return [];
 const colours=["gold","blue","pink","green"];
 return selected.map((option,index)=>({
   name:option.dimension+" · "+option.value.toUpperCase(),
   color:colours[index],
   members:option.members
 }));
}
function ConnectionsPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();const [difficulty,setDifficulty]=useState<ConnectionsDifficulty>("STANDARD");
 const [selected,setSelected]=useState<string[]>([]);const [found,setFound]=useState<number[]>([]);
 const [mistakes,setMistakes]=useState(0);const [finished,setFinished]=useState(false);
 const [practiceSeed,setPracticeSeed]=useState(()=>String(Math.floor(Math.random()*1e12)));
 const [notice,setNotice]=useState("");const done=account.daily[utcDay()]?.connections!==undefined;
 const seed=mode==="daily"?"CONNECTIONS:"+utcDay():"CONNECTIONS:PRACTICE:"+practiceSeed;
 const {players:archivePlayers,loading,error,retry}=useArchivePlayers(true,mode==="daily"?ARCHIVE_POOL_SEED:ARCHIVE_POOL_SEED+":"+practiceSeed,1600);
 const pool=useMemo(()=>archivePlayers.map(archivePlayerToGamePlayer),[archivePlayers]);
 const groups=useMemo(()=>pool.length>=32?buildConnectionsGroups(pool,difficulty,hashSeed(seed+":"+difficulty)):[],[pool,difficulty,seed]);
 const tilePlayers=useMemo(()=>shuffle(groups.flatMap(g=>g.members),hashSeed(seed+":TILES:"+difficulty)),[groups,seed,difficulty]);
 const selectedGroup=()=>groups.findIndex(g=>selected.length===4&&selected.every(id=>g.members.some(p=>p.archiveId===id)));
 const submit=()=>{
   if(selected.length!==4||finished)return;
   const group=selectedGroup();
   if(group>=0&&!found.includes(group)){
     const next=[...found,group];setFound(next);setSelected([]);setNotice("");
     if(next.length===4){setFinished(true);if(mode==="daily")onDaily("connections",1000-mistakes*150);}
   }else{
     const nextMistakes=mistakes+1;setMistakes(nextMistakes);setSelected([]);setNotice("Not quite — those four names do not share one football connection.");
     if(nextMistakes>=4){setFinished(true);if(mode==="daily")onDaily("connections",0);}
   }
 };
 const reset=(newMode:Mode=mode,newDifficulty:ConnectionsDifficulty=difficulty)=>{
   setDifficulty(newDifficulty);setSelected([]);setFound([]);setMistakes(0);setFinished(false);setNotice("");
   if(newMode==="practice")setPracticeSeed(String(Math.floor(Math.random()*1e12)));
 };
 return <Frame account={account} game="connections" eyebrow="SORT THE TOUCHLINE / 16 TILES" title="FIND THE CONNECTION." description="Sixteen footballers. Four hidden football connections — nationality, position, league or career era. Find all four sets." number="06" mode={mode} setMode={m=>{setMode(m);reset(m);}}>
 {done&&mode==="daily"?<Success title="GROUPS FOUND." detail="Today's Connections board is complete. Go again in unlimited practice." button="PRACTICE" onAgain={()=>{setMode("practice");reset("practice");}}/>:
  <Card className="connections-game">
   <div className="arc-game-meta"><span>GROUPS FOUND {found.length}/4</span><b>MISTAKES {mistakes}/4</b></div>
   <div className="grid-difficulty">{(["EASY","STANDARD","HARD","EXTREME"] as ConnectionsDifficulty[]).map(level=><button key={level} className={difficulty===level?"active":""} onClick={()=>reset(mode,level)}>{difficultyLabel(level)}</button>)}</div>
   {loading&&groups.length===0?<div className="grid-loading"><motion.div animate={{rotate:360}} transition={{duration:1.5,repeat:Infinity,ease:"linear"}}>⚽</motion.div><b>BUILDING CONNECTIONS</b><span>Finding four distinct football groups in the archive.</span></div>:
    groups.length!==4?<div className="arc-feedback"><b>{error?"PLAYER ARCHIVE UNAVAILABLE":"NOT ENOUGH MATCHING PLAYERS"}</b><p>{error||"The current data draw doesn't contain four groups at this difficulty. Try another level or draw again."}</p><button className="arc-button" onClick={()=>{retry();reset(mode,difficulty);}}>RETRY DATABASE ↗</button></div>:
    <>
     <div className="connections-found">{found.map(i=><motion.div layout key={i} className={groups[i].color}><small>{groups[i].name}</small><b>{groups[i].members.map(p=>p.name).join(" · ")}</b></motion.div>)}</div>
     <div className="connections-grid">{tilePlayers.filter(p=>!found.some(i=>groups[i].members.some(g=>g.archiveId===p.archiveId))).map(p=><motion.button layout key={p.archiveId} onClick={()=>setSelected(v=>v.includes(p.archiveId)?v.filter(x=>x!==p.archiveId):v.length<4?[...v,p.archiveId]:v)} className={selected.includes(p.archiveId)?"selected":""} whileTap={{scale:.96}}>{p.name}</motion.button>)}</div>
     <div className="arc-game-foot"><span>{selected.length} / 4 SELECTED</span><button className="arc-button" onClick={submit} disabled={selected.length!==4||finished}>SUBMIT GROUP ↗</button><button className="arc-quiet" onClick={()=>setSelected([])}>CLEAR</button></div>
     {notice&&<div className="arc-feedback"><b>KEEP THINKING.</b><p>{notice}</p></div>}
     {finished&&<div className="arc-feedback"><b>BOARD REVEALED</b>{groups.map(g=><p key={g.name}>{g.name}: {g.members.map(p=>p.name).join(", ")}</p>)}<button className="arc-button" onClick={()=>reset(mode)}>NEW BOARD ↗</button></div>}
     <p className="arc-muted">Group logic uses the archive's recorded nationality field. The player names are drawn afresh from the shared data pool; different practice rounds produce new combinations.</p>
    </>}
  </Card>}
 </Frame>;
}

type GridDifficulty="EASY"|"HARD";
type GridKind="CLUB_NATION"|"CLUB_CLUB";
type GridPuzzle={rows:string[];columns:string[];rowKind:"club";columnKind:"nation"|"club";answers:GamePlayer[][][];solutions:GamePlayer[];quality:number};
const GRID_LEVELS:GridDifficulty[]=["EASY","HARD"];
const GRID_ATTEMPTS:Record<GridDifficulty,number>={EASY:20,HARD:12};
// Clubs with a recognised Premier League history. These are used as a
// harder clue pool, not as a claim that the club currently plays in the PL.
const FORMER_PL_CLUBS=new Set([
 "blackburn rovers","bolton wanderers","portsmouth","wigan athletic","reading",
 "blackpool","birmingham city","middlesbrough","stoke city","norwich city",
 "sunderland","west bromwich albion","hull city","cardiff city","swansea city",
 "watford","sheffield united","sheffield wednesday","charlton athletic",
 "bradford city","wimbledon","oldham athletic","barnsley","coventry city",
 "derby county","queens park rangers","qpr","leicester city","southampton",
 "ipswich town","luton town","huddersfield town","crystal palace","burnley",
 "wolves","wolverhampton wanderers","nottingham forest","fulham"
].map(normalise));
const GRID_VARIANT_TARGET=300;
function assignDistinctAnswers(cells:GamePlayer[][]):GamePlayer[]|null{
 if(cells.length!==16)return null;
 const playerToCell=new Map<string,{player:GamePlayer;cell:number}>();
 const cellToPlayer:Array<GamePlayer|undefined>=Array(cells.length);
 const order=cells.map((c,i)=>({i,candidates:[...new Map(c.filter(p=>p?.archiveId).map(p=>[p.archiveId,p])).values()]}))
   .sort((a,b)=>a.candidates.length-b.candidates.length);
 const assign=(cell:number,seen:Set<string>):boolean=>{
   for(const player of order.find(entry=>entry.i===cell)!.candidates){
     const id=player.archiveId;
     if(seen.has(id))continue;
     seen.add(id);
     const previous=playerToCell.get(id);
     if(!previous||assign(previous.cell,seen)){
       playerToCell.set(id,{player,cell});cellToPlayer[cell]=player;return true;
     }
   }
   return false;
 };
 for(const entry of order)if(!assign(entry.i,new Set()))return null;
 return cellToPlayer.every(Boolean)?cellToPlayer as GamePlayer[]:null;
}
function buildGridPuzzle(players:GamePlayer[],difficulty:GridDifficulty,kind:GridKind,seed:number):GridPuzzle|null{
 const clubPlayers=new Map<string,GamePlayer[]>(),nationPlayers=new Map<string,GamePlayer[]>();
 const clubNames=new Map<string,string>(),nationNames=new Map<string,string>();
 const clubPairs=new Map<string,GamePlayer[]>(),clubNationPairs=new Map<string,GamePlayer[]>();
 const clubNeighbors=new Map<string,Set<string>>();
 for(const player of players){
   const clubs=[...new Set(player.clubs.filter(Boolean))],nation=player.nationality;
   if(nation&&nation!=="Unlisted"){
     const nk=normalise(nation);nationNames.set(nk,nation);
     const list=nationPlayers.get(nk)??[];list.push(player);nationPlayers.set(nk,list);
   }
   for(const club of clubs){
     const ck=normalise(club);if(!ck)continue;
     clubNames.set(ck,club);
     const list=clubPlayers.get(ck)??[];list.push(player);clubPlayers.set(ck,list);
     if(nation&&nation!=="Unlisted"){
       const key=ck+"::"+normalise(nation),matches=clubNationPairs.get(key)??[];
       matches.push(player);clubNationPairs.set(key,matches);
     }
   }
   if(kind==="CLUB_CLUB"){
     for(let a=0;a<clubs.length;a++)for(let b=a+1;b<clubs.length;b++){
       const ka=normalise(clubs[a]),kb=normalise(clubs[b]);if(!ka||!kb||ka===kb)continue;
       const key=[ka,kb].sort().join("::"),list=clubPairs.get(key)??[];
       list.push(player);clubPairs.set(key,list);
       const aSet=clubNeighbors.get(ka)??new Set<string>();aSet.add(kb);clubNeighbors.set(ka,aSet);
       const bSet=clubNeighbors.get(kb)??new Set<string>();bSet.add(ka);clubNeighbors.set(kb,bSet);
     }
   }
 }
 const easy= difficulty==="EASY";
 const minPool=easy?3:1;
 const clubKeys=[...clubPlayers.entries()].filter(([,v])=>v.length>=minPool).map(([k])=>k);
 const nationKeys=[...nationPlayers.entries()].filter(([,v])=>v.length>=minPool).map(([k])=>k);
 const clubRarity=(key:string)=>(clubPlayers.get(key)?.length??0);
 const nationRarity=(key:string)=>(nationPlayers.get(key)?.length??0);
 const rowKeys=kind==="CLUB_CLUB"
   ?[...clubKeys].sort((a,b)=>easy?(clubNeighbors.get(b)?.size??0)-(clubNeighbors.get(a)?.size??0):
      Number(FORMER_PL_CLUBS.has(b))-Number(FORMER_PL_CLUBS.has(a))||clubRarity(a)-clubRarity(b))
   :[...clubKeys].sort((a,b)=>easy?clubRarity(b)-clubRarity(a):
      Number(FORMER_PL_CLUBS.has(b))-Number(FORMER_PL_CLUBS.has(a))||clubRarity(a)-clubRarity(b));
 const colKeys=kind==="CLUB_NATION"
   ?nationKeys.sort((a,b)=>easy?nationRarity(b)-nationRarity(a):nationRarity(a)-nationRarity(b))
   :[...clubKeys].sort((a,b)=>easy?clubRarity(b)-clubRarity(a):
      Number(FORMER_PL_CLUBS.has(b))-Number(FORMER_PL_CLUBS.has(a))||clubRarity(a)-clubRarity(b));
 if(rowKeys.length<4||colKeys.length<4)return null;
 const rowPool=rowKeys.slice(0,easy?120:180),colPool=colKeys.slice(0,easy?120:180);
 let best:GridPuzzle|null=null;
 const attempts=kind==="CLUB_CLUB"?2400:2000;
 for(let attempt=0;attempt<attempts;attempt++){
   const chosenRows=shuffle(rowPool,seed+attempt*19).slice(0,4);
   let chosenCols:string[];
   if(kind==="CLUB_CLUB"){
     const common=[...(clubNeighbors.get(chosenRows[0])??[])].filter(candidate=>
       !chosenRows.includes(candidate)&&chosenRows.every(row=>clubNeighbors.get(row)?.has(candidate)));
     chosenCols=shuffle(common.filter(key=>colPool.includes(key)),seed+attempt*37+7).slice(0,4);
   }else chosenCols=shuffle(colPool,seed+attempt*37+7).slice(0,4);
   if(chosenCols.length!==4)continue;
   const hasFormerClub=[...chosenRows,...chosenCols].some(key=>FORMER_PL_CLUBS.has(key));
   const hasRareNation=kind==="CLUB_NATION"&&chosenCols.some(key=>nationRarity(key)<=18);
   if(!easy&&!hasFormerClub&&!hasRareNation)continue;
   const answers=chosenRows.map(row=>chosenCols.map(col=>
     kind==="CLUB_NATION"?(clubNationPairs.get(row+"::"+col)??[]):(clubPairs.get([row,col].sort().join("::"))??[])
   ));
   if(answers.some(row=>row.some(cell=>cell.length===0)))continue;
   const flat=answers.flat(),solutions=assignDistinctAnswers(flat);if(!solutions)continue;
   const counts=flat.map(cell=>cell.length),min=Math.min(...counts),max=Math.max(...counts);
   const average=counts.reduce((sum,n)=>sum+n,0)/counts.length;
   // Easy favours answerable, familiar intersections but allows a small number
   // of tougher cells. Hard favours low candidate counts and a genuinely rare
   // nationality or a club with Premier League history.
   const quality=easy
     ?-Math.abs(average-7)*12+min*2-max*.25
     :-max*8+min*2+(hasFormerClub?30:0)+(hasRareNation?18:0);
   const puzzle:GridPuzzle={rows:chosenRows.map(k=>clubNames.get(k)??k),
     columns:chosenCols.map(k=>kind==="CLUB_NATION"?(nationNames.get(k)??k):(clubNames.get(k)??k)),
     rowKind:"club",columnKind:kind==="CLUB_NATION"?"nation":"club",answers,solutions,quality};
   if(!best||quality>best.quality)best=puzzle;
   if(easy?min>=2&&max<=18&&average>=4&&average<=11:min>=1&&max<=8)break;
 }
 return best;
}
function GridPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();
 const [difficulty,setDifficulty]=useState<GridDifficulty>("EASY");
 const [kind,setKind]=useState<GridKind>("CLUB_NATION");
 const [values,setValues]=useState<string[]>(Array(16).fill(""));
 const [opened,setOpened]=useState<number[]>([]);
 const [active,setActive]=useState<number|null>(null);
 const [guess,setGuess]=useState("");
 const [practiceSeed,setPracticeSeed]=useState(()=>String(Math.floor(Math.random()*1e12)));
 const [gridNotice,setGridNotice]=useState("");
 const [attempts,setAttempts]=useState(0);
 const [score,setScore]=useState(1000);
 const [finished,setFinished]=useState(false);
 const [showSolutions,setShowSolutions]=useState(false);
 const [hintUsed,setHintUsed]=useState<number[]>([]);
 const done=account.daily[utcDay()]?.["football-grid"]!==undefined;
 const seed=mode==="daily"?hashSeed("GRID:"+utcDay()+":"+difficulty+":"+kind):hashSeed("GRID:practice:"+practiceSeed+":"+difficulty+":"+kind);
 const {players:archivePlayers,loading,error,retry}=useArchivePlayers(true,mode==="daily"?ARCHIVE_POOL_SEED:ARCHIVE_POOL_SEED+":"+practiceSeed,1600);
 const playerPool=useMemo(()=>archivePlayers.map(archivePlayerToGamePlayer),[archivePlayers]);
 const puzzle=useMemo(()=>playerPool.length>=40?buildGridPuzzle(playerPool,difficulty,kind,seed):null,[playerPool,difficulty,kind,seed]);
 const maxAttempts=GRID_ATTEMPTS[difficulty];
 const finish=(finalScore:number)=>{
   setFinished(true);setActive(null);
   if(mode==="daily")onDaily("football-grid",Math.max(0,finalScore));
 };
 const check=()=>{
   if(active===null||!guess.trim()||!puzzle||finished)return;
   const row=Math.floor(active/4),col=active%4;
   const accepted=puzzle.answers[row][col];
   const player=archiveGuess(guess,accepted);
   if(player){
     if(opened.some(id=>values[id]&&normalise(values[id])===normalise(player.name))){
       setGridNotice("You've already used that player. Each footballer can only fill one square.");return;
     }
     const rarity=Math.min(150,Math.max(10,Math.round(150/Math.sqrt(accepted.length))));
     const next=[...opened,active];const nextScore=score+rarity;
     setValues(v=>v.map((x,i)=>i===active?player.name:x));setOpened(next);setActive(null);setGuess("");setGridNotice("Correct — "+player.name+" fits both clues. +"+rarity+" points.");
     setScore(nextScore);
     if(next.length===16)finish(nextScore);
   }else{
     const nextAttempts=attempts+1;const nextScore=Math.max(0,score-50);
     setAttempts(nextAttempts);setScore(nextScore);setGridNotice("That player doesn't fit both recorded clues. −50 points.");
     setGuess("");
     if(nextAttempts>=maxAttempts)finish(nextScore);
   }
 };
 const revealHint=()=>{
   if(active===null||!puzzle||finished||hintUsed.includes(active)||opened.includes(active))return;
   const answer=puzzle.solutions[active];
   const next=[...opened,active];const nextScore=Math.max(0,score-100);
   setValues(v=>v.map((x,i)=>i===active?answer.name:x));setOpened(next);setHintUsed(v=>[...v,active]);setScore(nextScore);setGridNotice("Revealed "+answer.name+" for −100 points.");setActive(null);
   if(next.length===16)finish(nextScore);
 };
 const shareResult=async()=>{
   const summary="PLAYGROUND FOOTBALL GRID · "+difficulty+" · "+kind.replace("_"," × ")+" · "+opened.length+"/16 cells · "+score+" points";
   try{if(navigator.share)await navigator.share({title:"PLAYGROUND Football Grid",text:summary});else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(summary);setGridNotice("Your grid result has been copied to the clipboard.");}}
   catch{/* sharing may be cancelled */}
 };
 const reset=(newMode:Mode=mode,newDifficulty:GridDifficulty=difficulty,newKind:GridKind=kind)=>{
   setValues(Array(16).fill(""));setOpened([]);setActive(null);setGuess("");setGridNotice("");setAttempts(0);setScore(1000);setFinished(false);setShowSolutions(false);setHintUsed([]);
   if(newMode==="practice")setPracticeSeed(String(Math.floor(Math.random()*1e12)));
   setDifficulty(newDifficulty);setKind(newKind);
 };
 const usedNames=new Set(values.filter(Boolean).map(normalise));
 const suggestions=guess.trim().length>=2?playerPool.filter(p=>!usedNames.has(normalise(p.name))&&normalise(p.name).includes(normalise(guess))).slice(0,7):[];
 return <Frame account={account} game="football-grid" eyebrow="THE EDITORIAL FOOTBALL PUZZLE / 4 × 4" title="FOOTBALL GRID." description="Connect the clubs and nations. Sixteen intersections. Sixteen different footballers. Easy or Hard — every board is generated from real career links." number="07" mode={mode} setMode={m=>{setMode(m);reset(m);}}>
 {done&&mode==="daily"?<Success title="TODAY'S GRID IS COMPLETE." detail="Your daily result is saved. Play unlimited practice for a fresh board." button="PRACTICE GRID" onAgain={()=>{setMode("practice");reset("practice");}}/>:
  <Card className="grid-game grid-editorial">
   <div className="grid-editorial-hero"><div><small>THE FOOTBALL KNOWLEDGE TEST</small><h2>FOOTBALL GRID <em>4 × 4</em></h2><p>CONNECT THE CLUBS AND NATIONS</p></div><span className="grid-hero-mark">PG / 07<br/>{GRID_VARIANT_TARGET}+ BOARD TARGET</span></div>
   <div className="grid-mode-row"><button className={kind==="CLUB_NATION"?"active":""} onClick={()=>reset(mode,difficulty,"CLUB_NATION")}>CLUB × NATION</button><button className={kind==="CLUB_CLUB"?"active":""} onClick={()=>reset(mode,difficulty,"CLUB_CLUB")}>CLUB × CLUB</button></div>
   <div className="grid-difficulty">{GRID_LEVELS.map(level=><button key={level} className={difficulty===level?"active":""} onClick={()=>reset(mode,level,kind)}>{level==="EASY"?"EASY / STANDARD":"HARD"}</button>)}</div><p className="arc-muted">{difficulty==="EASY"?"A standard mix of well-known clubs and nations, with the occasional trickier square.":"Less obvious players and nations, plus clubs with Premier League history where the archive supports them."}</p>
   <div className="grid-editorial-stats"><span><small>SCORE</small><b>{score.toLocaleString("en-GB")} PTS</b></span><span><small>ATTEMPTS</small><b>{attempts}/{maxAttempts}</b></span><span><small>CELLS</small><b>{opened.length}/16</b></span><span><small>RARITY</small><b>SCORING ON</b></span></div>
   {loading&&playerPool.length===0?<div className="grid-loading"><motion.div animate={{rotate:360}} transition={{duration:1.5,repeat:Infinity,ease:"linear"}}>⚽</motion.div><b>BUILDING YOUR GRID</b><span>Checking all sixteen intersections against the player archive.</span></div>:
    puzzle?<>     <div className="grid-editorial-entry">{active!==null?<><div><small>SELECTED INTERSECTION</small><b>{puzzle.rows[Math.floor(active/4)]} × {puzzle.columns[active%4]}</b></div><input value={guess} onChange={e=>setGuess(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")check();}} placeholder="Type a player's name…" autoComplete="off"/>{suggestions.length>0&&<div className="grid-autocomplete">{suggestions.map(p=><button key={p.archiveId} type="button" onClick={()=>setGuess(p.name)}>{p.name}<small>{p.nationality} · {p.club}</small></button>)}</div>}<button className="arc-button" onClick={check} disabled={!guess.trim()}>SUBMIT ↗</button><button className="arc-quiet" onClick={revealHint}>HINT −100</button></>:<p>SELECT ANY EMPTY SQUARE TO START · PLAYER SEARCH APPEARS HERE</p>}</div>
     <div className="grid-editorial-board"><div className="grid-corner">PLAYER<br/>↓</div>{puzzle.columns.map(column=><div className="grid-col-head" key={column}>{puzzle.columnKind==="nation"?<CountryFlag name={column}/>:<ClubBadge name={column} size={30}/>}<span>{column}</span></div>)}{puzzle.rows.map((row,ri)=><Fragment key={row}><div className="grid-row-head"><ClubBadge name={row} size={32}/><span>{row}</span></div>{puzzle.columns.map((column,ci)=>{const id=ri*4+ci;const doneCell=opened.includes(id);const count=puzzle.answers[ri][ci].length;return <button key={id} className={"grid-cell "+(doneCell?"filled ":"")+(active===id?"active":"")} disabled={doneCell||finished} onClick={()=>{setActive(id);setGuess("");setGridNotice("");}}><small>{puzzle.rows[ri]} × {column}</small><b>{values[id]||"?"}</b>{doneCell&&<i>{Math.min(150,Math.max(10,Math.round(150/Math.sqrt(count))))} PTS</i>}</button>;})}</Fragment>)}</div>

     {gridNotice&&<div className="arc-feedback"><b>{gridNotice.startsWith("Correct")?"CORRECT ANSWER":"GRID UPDATE"}</b><p>{gridNotice}</p></div>}
     <div className="grid-editorial-actions"><button onClick={()=>setShowSolutions(v=>!v)}>SOLUTIONS / {showSolutions?"HIDE":"REVEAL"}</button><button onClick={()=>{if(active!==null)revealHint();else setGridNotice("Select an empty square first to reveal its answer.");}}>HINT</button><button onClick={shareResult}>SHARE RESULT ↗</button><button onClick={()=>reset(mode,difficulty,kind)}>NEW GRID ↻</button></div>
     {showSolutions&&<div className="grid-solution-list"><b>VALID ANSWERS FOR THIS GRID</b>{puzzle.solutions.map((p,i)=><div key={i}><b>{p.name}</b><small>{puzzle.rows[Math.floor(i/4)]} × {puzzle.columns[i%4]}</small></div>)}</div>}
     {finished&&<div className="arc-feedback"><b>{opened.length===16?"GRID COMPLETE":"TIME TO REVIEW THE GRID"}</b><p>{opened.length}/16 cells · {attempts} wrong attempts · {score} points</p><button className="arc-button" onClick={()=>setShowSolutions(true)}>REVEAL ALL ANSWERS ↗</button><button className="arc-quiet" onClick={()=>reset("practice",difficulty,kind)}>NEW PRACTICE GRID</button></div>}
     <p className="arc-muted">Players are accepted only when the archive records both relationships. One player per square. This archive is sampled, so a player missing from suggestions may still be a valid real-world answer; the generator only uses its indexed records.</p>
    </>:
    <div className="arc-feedback"><b>{error?"PLAYER ARCHIVE UNAVAILABLE":"NO VALID 4×4 GRID IN THIS DRAW"}</b><p>{error||"The current sampled archive could not produce sixteen answerable intersections with distinct players. Try the other difficulty or grid type."}</p><button className="arc-button" onClick={()=>{retry();reset(mode,difficulty,kind);}}>RETRY / NEW DRAW ↗</button></div>}
  </Card>}
 </Frame>;
}

type LadderMetric="leagueGoals"|"careerApps"|"careerGoals"|"caps";
type LadderDifficulty="EASY"|"STANDARD"|"HARD"|"EXTREME";
type LadderEntry={id:string;name:string;value:number};
const LADDER_METRICS:{id:LadderMetric;label:string;short:string}[]=[
 {id:"leagueGoals",label:"Recorded league goals",short:"LEAGUE GOALS"},
 {id:"careerApps",label:"Recorded career appearances",short:"CAREER APPS"},
 {id:"careerGoals",label:"Recorded career goals",short:"CAREER GOALS"},
 {id:"caps",label:"International caps",short:"INTERNATIONAL CAPS"}
];
function makeLadderSet(players:GamePlayer[],metric:LadderMetric,difficulty:LadderDifficulty,seed:number):LadderEntry[]{
 const eligible=players.map(p=>({id:p.archiveId,name:p.name,value:metric==="leagueGoals"?p.leagueGoals:metric==="careerApps"?p.careerApps:metric==="careerGoals"?p.careerGoals:p.caps??-1,coverage:metric==="leagueGoals"?p.leagueGoalSeasons:metric==="caps"?p.caps??0:p.statSeasons}))
   .filter(p=>p.value>=0&&(metric!=="leagueGoals"||p.coverage>=2));
 if(eligible.length<5)return [];
 const thresholds:{min:number;max:number}={EASY:{min:.45,max:1},STANDARD:{min:.22,max:.6},HARD:{min:.08,max:.32},EXTREME:{min:0,max:.16}}[difficulty];
 let best:LadderEntry[]=[];
 let bestScore=-Infinity;
 for(let attempt=0;attempt<1200;attempt++){
   const sample=shuffle(eligible,seed+attempt*23).slice(0,5);
   if(new Set(sample.map(p=>p.value)).size<5)continue;
   const sorted=[...sample].sort((a,b)=>b.value-a.value);
   const range=(sorted[0].value-sorted[4].value)/Math.max(1,sorted[0].value);
   const quality=difficulty==="EASY"?range*1000: difficulty==="STANDARD"?-Math.abs(range-.38)*1000:difficulty==="HARD"?-Math.abs(range-.18)*1000:-range*1000;
   if(range>=thresholds.min&&range<=thresholds.max)return sample.map(({id,name,value})=>({id,name,value}));
   if(quality>bestScore){bestScore=quality;best=sample.map(({id,name,value})=>({id,name,value}));}
 }
 return best;
}
function LadderPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();
 const [difficulty,setDifficulty]=useState<LadderDifficulty>("STANDARD");
 const [metric,setMetric]=useState<LadderMetric>("leagueGoals");
 const [practiceSeed,setPracticeSeed]=useState(()=>String(Math.floor(Math.random()*1e12)));
 const [players,setPlayers]=useState<LadderEntry[]>([]);
 const [submitted,setSubmitted]=useState(false);
 const done=account.daily[utcDay()]?.ladder!==undefined;
 const seed=mode==="daily"?"LADDER:"+utcDay():"LADDER:PRACTICE:"+practiceSeed;
 const {players:archivePlayers,loading,error,retry}=useArchivePlayers(true,mode==="daily"?ARCHIVE_POOL_SEED:ARCHIVE_POOL_SEED+":"+practiceSeed,1600);
 const pool=useMemo(()=>archivePlayers.map(archivePlayerToGamePlayer),[archivePlayers]);
 const generated=useMemo(()=>pool.length>=5?makeLadderSet(pool,metric,difficulty,hashSeed(seed+":"+metric+":"+difficulty)):[],[pool,metric,difficulty,seed]);
 useEffect(()=>{setPlayers(generated);setSubmitted(false);},[generated]);
 const move=(i:number,dir:number)=>setPlayers(old=>{const next=[...old],j=i+dir;if(j<0||j>=next.length)return old;[next[i],next[j]]=[next[j],next[i]];return next;});
 const expected=[...players].sort((a,b)=>b.value-a.value);
 const score=players.filter((p,i)=>p.id===expected[i]?.id).length*200;
 const submit=()=>{if(players.length!==5||submitted)return;setSubmitted(true);if(mode==="daily")onDaily("ladder",score);};
 const reset=(newMode:Mode=mode,newDifficulty:LadderDifficulty=difficulty,newMetric:LadderMetric=metric)=>{
   setDifficulty(newDifficulty);setMetric(newMetric);setSubmitted(false);
   if(newMode==="practice")setPracticeSeed(String(Math.floor(Math.random()*1e12)));
 };
 const metricLabel=LADDER_METRICS.find(x=>x.id===metric)?.label??"Recorded statistic";
 return <Frame account={account} game="ladder" eyebrow="ORDER THE NUMBERS / PLAYER ARCHIVE" title="THE LADDER." description="Drag five footballers into order. Pick the stat and difficulty. The closest five-player sets make the harder rounds." number="08" mode={mode} setMode={m=>{setMode(m);reset(m);}}>
 {done&&mode==="daily"?<Success title="TODAY'S ORDER IS LOCKED." detail="The daily Ladder has been completed. Unlimited practice uses fresh archive players." button="PRACTICE" onAgain={()=>{setMode("practice");reset("practice");}}/>:
  <Card className="ladder-game">
   <div className="arc-game-meta"><span>{players.length}/5 PLAYERS LOADED</span><b>{difficulty} · {metricLabel.toUpperCase()}</b></div>
   <div className="grid-difficulty">{(["EASY","STANDARD","HARD","EXTREME"] as LadderDifficulty[]).map(level=><button key={level} className={difficulty===level?"active":""} onClick={()=>reset(mode,level,metric)}>{difficultyLabel(level)}</button>)}</div>
   <div className="ladder-control-row"><label>STAT<select value={metric} onChange={e=>reset(mode,difficulty,e.target.value as LadderMetric)}>{LADDER_METRICS.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label><span>HIGHEST → LOWEST</span></div>
   {loading&&pool.length===0?<div className="grid-loading"><motion.div animate={{rotate:360}} transition={{duration:1.5,repeat:Infinity,ease:"linear"}}>⚽</motion.div><b>SCOUTING THE LADDER</b><span>Building a fresh set from the player archive.</span></div>:
    players.length<5?<div className="arc-feedback"><b>{error?"PLAYER ARCHIVE UNAVAILABLE":"NOT ENOUGH RECORDED STATISTICS"}</b><p>{error||"This metric does not have five players with enough coverage in the current pool. Try another statistic or difficulty."}</p><button className="arc-button" onClick={()=>{retry();reset(mode,difficulty,metric);}}>RETRY / NEW SET ↗</button></div>:
    <>
     <Reorder.Group axis="y" values={players} onReorder={setPlayers} className="ladder-list">
      {players.map((p,i)=><Reorder.Item key={p.id} value={p} className="ladder-item" whileDrag={{scale:1.025,boxShadow:"0 10px 24px #0002",zIndex:5}}>
       <strong>{i+1}</strong><span>{p.name}</span><small className="ladder-grab">⠿ DRAG</small>
       <div><button aria-label={"Move "+p.name+" up"} onClick={()=>move(i,-1)} disabled={submitted||i===0}>↑</button><button aria-label={"Move "+p.name+" down"} onClick={()=>move(i,1)} disabled={submitted||i===4}>↓</button></div>
      </Reorder.Item>)}
     </Reorder.Group>
     {submitted?<div className="arc-feedback"><b>{score===1000?"PERFECT ORDER.":"ORDER REVEALED."} · {score}/1000</b>{expected.map((p,i)=><p key={p.id}>{i+1}. {p.name} — {p.value.toLocaleString("en-GB")}</p>)}</div>:<div className="arc-game-foot"><span>{metricLabel.toUpperCase()} / SOURCE COVERAGE VARIES</span><button className="arc-button" onClick={submit}>LOCK THE ORDER ↗</button></div>}
     <div className="arc-game-foot"><span>FRESH PLAYER SET</span><button className="arc-quiet" onClick={()=>reset(mode,difficulty,metric)}>NEW LADDER ↻</button></div>
     <p className="arc-muted">Statistics are the values recorded in the archive, not a guarantee of each player's complete career totals. The metric label states what is being compared.</p>
    </>}
  </Card>}
 </Frame>;
}

function RevealPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();
 const [practiceSeed,setPracticeSeed]=useState(()=>String(Math.floor(Math.random()*1e12)));
 const [reveal,setReveal]=useState(0);const [guess,setGuess]=useState("");const [tries,setTries]=useState(0);const [end,setEnd]=useState(false);const [won,setWon]=useState(false);
 const done=account.daily[utcDay()]?.["the-reveal"]!==undefined;
 const seed=mode==="daily"?"REVEAL:"+utcDay():"REVEAL:PRACTICE:"+practiceSeed;
 const {players:archivePlayers,loading,error,retry}=useArchivePlayers(true,mode==="daily"?ARCHIVE_POOL_SEED:ARCHIVE_POOL_SEED+":"+practiceSeed,1600);
 const pool=useMemo(()=>archivePlayers.map(archivePlayerToGamePlayer).filter(p=>p.nationality!=="Unlisted"&&p.clubs.length>=2),[archivePlayers]);
 const target=pool.length?pool[hashSeed(seed+":target")%pool.length]:null;
 const clues=target?[
   {label:"Nationality",value:target.nationality},
   {label:"Position",value:target.position||"Position not recorded"},
   {label:"Career path",value:target.clubs.join(" → ")},
   {label:"Career record",value:target.lastYear!==null?target.firstYear+"–"+target.lastYear:"Career dates incomplete"},
   {label:"Recorded appearances",value:target.careerApps.toLocaleString("en-GB")},
   {label:"Recorded goals",value:target.careerGoals.toLocaleString("en-GB")}
 ].filter(c=>Boolean(c.value)): [];
 const score=Math.max(0,1000-(Math.max(0,reveal-1)*100)-tries*45);
 const restart=(newMode:Mode=mode)=>{
   if(newMode==="practice")setPracticeSeed(String(Math.floor(Math.random()*1e12)));
   setReveal(0);setGuess("");setTries(0);setEnd(false);setWon(false);
 };
 const submit=(e:FormEvent)=>{
   e.preventDefault();if(end||!guess.trim()||!target)return;
   const next=tries+1;setTries(next);
   if(acceptedName(guess,[target.name,target.surname,...target.aliases])){setWon(true);setEnd(true);if(mode==="daily")onDaily("the-reveal",score);}
   else if(next>=8){setEnd(true);if(mode==="daily")onDaily("the-reveal",0);}
   setGuess("");
 };
 const showNext=()=>{if(reveal<clues.length-1)setReveal(v=>v+1);};
 return <Frame account={account} game="the-reveal" eyebrow="BLUR / CLUE / IDENTIFY" title="THE REVEAL." description="A mystery player from the archive. Use the career clues, reveal more information when you need it, then name the footballer." number="09" mode={mode} setMode={m=>{setMode(m);restart(m);}}>
 {done&&mode==="daily"?<Success title="MYSTERY SOLVED." detail="Today's Reveal is complete. Archive-backed practice has a fresh target." button="PRACTICE" onAgain={()=>{setMode("practice");restart("practice");}}/>:
  loading&&pool.length===0?<Card className="reveal-loading"><motion.div animate={{rotate:360}} transition={{duration:1.5,repeat:Infinity,ease:"linear"}}>⚽</motion.div><b>OPENING THE PLAYER DOSSIER</b><span>SCANNING RECORDED CAREERS AND CLUB SPELLS…</span></Card>:
  !target?<Card className="arc-feedback"><b>{error?"PLAYER ARCHIVE UNAVAILABLE":"NO COMPLETE PLAYER FILES FOUND"}</b><p>{error||"The current archive draw did not find enough complete career clues. Try another draw."}</p><button className="arc-button" onClick={()=>{retry();restart(mode);}}>RETRY ARCHIVE ↗</button></Card>:
  <Card className="reveal-game">
   <div className="arc-game-meta"><span>CLUE {Math.min(reveal+1,clues.length)} / {clues.length}</span><b>{Math.max(0,8-tries)} GUESSES · {score} PTS AVAILABLE</b></div>
   <div className="reveal-portrait"><motion.div className={"reveal-silhouette r"+Math.min(3,reveal)} animate={{scale:[1,1.015,1]}} transition={{duration:3,repeat:Infinity,ease:"easeInOut"}}><span>{end?target.name.split(" ").map(x=>x[0]).join("").slice(0,2):"?"}</span></motion.div><small>ARCHIVE PLAYER / PORTRAIT NOT CONNECTED</small></div>
   <div className="reveal-clues">{clues.slice(0,reveal+1).map((c,i)=><motion.p key={c.label} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}}><span>0{i+1}</span><b>{c.label}:</b> {c.value}</motion.p>)}</div>
   <div className="reveal-actions"><button className="arc-quiet" onClick={showNext} disabled={reveal>=clues.length-1||end}>REVEAL NEXT CLUE −100 PTS</button><span>{clues.length-reveal-1} CLUES HIDDEN</span></div>
   <form className="arc-guess-form" onSubmit={submit}><input value={guess} onChange={e=>setGuess(e.target.value)} placeholder="Full name or surname…" disabled={end}/><button className="arc-button" disabled={!guess.trim()||end}>LOCK IN ↗</button></form>
   {end&&<div className="arc-feedback"><b>{won?"GOT THEM.": "THE PLAYER WAS "+target.name}</b><p>{won?"You identified the archive player.":"The target's recorded career was "+target.clubs.join(" → ")+ "."}</p><button className="arc-button" onClick={()=>restart(mode)}>NEXT PLAYER ↗</button></div>}
   <p className="arc-muted">Career totals and club spells reflect available archive records; they are not guaranteed complete for every player.</p>
  </Card>}
 </Frame>;
}

type CheckoutMetric="leagueGoals"|"caps";
type CheckoutDifficulty="EASY"|"STANDARD"|"HARD"|"EXTREME";
type CheckoutPlayer={id:string;name:string;value:number;label:string};
function FiveOhOnePage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();const [difficulty,setDifficulty]=useState<CheckoutDifficulty>("STANDARD");
 const [metric,setMetric]=useState<CheckoutMetric>("leagueGoals");
 const [practiceSeed,setPracticeSeed]=useState(()=>String(Math.floor(Math.random()*1e12)));
 const [remaining,setRemaining]=useState(501);const [turnStart,setTurnStart]=useState(501);
 const [turnPicks,setTurnPicks]=useState<CheckoutPlayer[]>([]);const [used,setUsed]=useState<string[]>([]);
 const [busts,setBusts]=useState(0);const [bust,setBust]=useState(false);const [finish,setFinish]=useState(false);const [runBanked,setRunBanked]=useState(false);
 const done=account.daily[utcDay()]?.["football-501"]!==undefined;
 const seed=mode==="daily"?"501:"+utcDay():"501:PRACTICE:"+practiceSeed;
 const {players:archivePlayers,loading,error,retry}=useArchivePlayers(true,mode==="daily"?ARCHIVE_POOL_SEED:ARCHIVE_POOL_SEED+":"+practiceSeed,1600);
 const pool=useMemo(()=>{
   const mapped=archivePlayers.map(archivePlayerToGamePlayer).map(p=>({
     id:p.archiveId,name:p.name,
     value:metric==="leagueGoals"?p.leagueGoals:(p.caps??-1),
     label:metric==="leagueGoals"?"RECORDED LEAGUE GOALS":"INTERNATIONAL CAPS",
     coverage:metric==="leagueGoals"?p.leagueGoalSeasons:(p.caps??0)
   })).filter(p=>p.value>0&&(metric!=="leagueGoals"||p.coverage>=2));
   return mapped.length>=8?mapped:LEAGUE_GOALS.map(p=>({id:p.name,name:p.name,value:p.value,label:"PREMIER LEAGUE GOALS",coverage:1}));
 },[archivePlayers,metric]);
 const maxValue=difficulty==="EASY"?300:difficulty==="STANDARD"?220:difficulty==="HARD"?130:80;
 const options=useMemo(()=>{
   const valid=pool.filter(p=>!used.includes(p.id)&&p.value<=maxValue);
   const source=valid.length>=6?valid:pool.filter(p=>!used.includes(p.id));
   return shuffle(source,hashSeed(seed+":"+remaining+":"+turnPicks.length+":"+difficulty+":"+metric)).slice(0,6);
 },[pool,used,maxValue,seed,remaining,turnPicks.length,difficulty,metric]);
 const currentVisitTotal=turnPicks.reduce((n,p)=>n+p.value,0);
 const visitEnded=turnPicks.length===3;
 const score=remaining===0?1000:Math.max(0,1000-remaining*2-busts*100);
 const pick=(p:CheckoutPlayer)=>{
   if(finish||runBanked||bust||visitEnded||used.includes(p.id))return;
   const next=remaining-p.value;
   const visitUsed=[...used,p.id];
   if(next<0){
     setUsed(visitUsed);setBusts(v=>v+1);setRemaining(turnStart);setTurnPicks([]);setBust(true);
     return;
   }
   setUsed(visitUsed);setTurnPicks(v=>[...v,p]);setRemaining(next);
   if(next===0){setFinish(true);if(mode==="daily")onDaily("football-501",Math.max(100,1000-(used.length+1)*20-busts*100));}
 };
 const nextVisit=()=>{
   if(turnPicks.length!==3||finish||runBanked)return;
   setTurnStart(remaining);setTurnPicks([]);setBust(false);
 };
 const bankRun=()=>{
   if(used.length===0||finish||runBanked)return;
   setRunBanked(true);if(mode==="daily")onDaily("football-501",score);
 };
 const reset=(newMode:Mode=mode,newDifficulty:CheckoutDifficulty=difficulty,newMetric:CheckoutMetric=metric)=>{
   setDifficulty(newDifficulty);setMetric(newMetric);setRemaining(501);setTurnStart(501);setTurnPicks([]);setUsed([]);setBusts(0);setBust(false);setFinish(false);setRunBanked(false);
   if(newMode==="practice")setPracticeSeed(String(Math.floor(Math.random()*1e12)));
 };
 return <Frame account={account} game="football-501" eyebrow="THREE DARTS / ONE CHECKOUT" title="FOOTBALL 501." description="Choose player-stat darts to work down from 501. Three picks make a visit. Busting below zero wipes the visit." number="10" mode={mode} setMode={m=>{setMode(m);reset(m);}}>
 {done&&mode==="daily"?<Success title="CHECKOUT BANKED." detail="Today's 501 challenge is complete. Practice is unlimited." button="PRACTICE" onAgain={()=>{setMode("practice");reset("practice");}}/>:
  <Card className="checkout-game">
   <div className="arc-game-meta"><span>VISIT / {Math.floor(used.length/3)+1}</span><b>{difficulty} · {metric==="leagueGoals"?"LEAGUE GOALS":"INTERNATIONAL CAPS"}</b></div>
   <div className="grid-difficulty">{(["EASY","STANDARD","HARD","EXTREME"] as CheckoutDifficulty[]).map(level=><button key={level} className={difficulty===level?"active":""} onClick={()=>reset(mode,level,metric)}>{difficultyLabel(level)}</button>)}</div>
   <div className="checkout-scoreboard">
    <div className="checkout-target"><span>REMAINING</span><strong key={remaining}>{remaining}</strong><small>{remaining===0?"CHECKOUT!":remaining<=170?"ON THE FINISH":"301 / 501 CLUBHOUSE"}</small></div>
    <div className="checkout-dartboard"><div className="dart-ring ring-one"/><div className="dart-ring ring-two"/><div className="dart-ring ring-three"/><div className="dart-bull"/><motion.div className="dart-flight" animate={{x:[-30,6,0],y:[-26,4,0],rotate:[-35,8,0],opacity:[0,1,1]}} transition={{duration:.48,repeat:Infinity,repeatDelay:1.8}}/></div>
   </div>
   <div className="checkout-turn"><div><small>THIS VISIT</small><b>{turnPicks.length} / 3 DARTS</b></div><div className="checkout-dart-slots">{[0,1,2].map(i=><div className={turnPicks[i]?"hit":""} key={i}><small>DART {i+1}</small><b>{turnPicks[i]?turnPicks[i].value:"—"}</b></div>)}</div><div className="checkout-turn-total"><small>VISIT TOTAL</small><strong>{currentVisitTotal}</strong></div></div>
   {loading&&pool.length===0?<div className="grid-loading"><motion.div animate={{rotate:360}} transition={{duration:1.4,repeat:Infinity,ease:"linear"}}>⚽</motion.div><b>SCOUTING THE DARTS POOL</b><span>Collecting players with recorded statistics.</span></div>:
    <><div className="arc-game-meta"><span>CHOOSE A PLAYER AS YOUR NEXT DART</span><b>{options.length} OPTIONS</b></div><div className="checkout-cards">{options.map(p=><button key={p.id} disabled={turnPicks.length===3||finish||runBanked||bust} onClick={()=>pick(p)}><small>{p.name}</small><b>{p.value.toLocaleString("en-GB")}</b><i>{p.label}</i></button>)}</div></>}
   {bust&&<div className="arc-feedback"><b>BUST — VISIT WIPED.</b><p>Your total stays at {turnStart}. The three darts in that visit score zero.</p><button className="arc-button" onClick={()=>setBust(false)}>RESET DARTS ↗</button></div>}
   {visitEnded&&!finish&&<div className="arc-feedback"><b>VISIT COMPLETE · {currentVisitTotal} POINTS</b><p>You are now on {remaining}. Start the next visit when you're ready.</p><button className="arc-button" onClick={nextVisit}>NEXT VISIT ↗</button></div>}
   {(finish||runBanked)&&<div className="arc-feedback"><b>{remaining===0?"CHECKOUT!":"RUN BANKED."} · {score}/1000</b><p>{remaining===0?"Exactly zero — perfect finish.":"You finished "+remaining+" away from zero after "+busts+" busts."}</p><button className="arc-button" onClick={()=>reset(mode)}>ANOTHER RUN ↗</button></div>}
   <div className="arc-game-foot"><span>{used.length} PLAYERS USED · {busts} BUSTS</span><button className="arc-button" disabled={used.length===0||finish||runBanked} onClick={bankRun}>BANK SCORE ↗</button><button className="arc-quiet" onClick={()=>reset(mode)}>RESET</button></div>
   <p className="arc-muted">{metric==="leagueGoals"?"Recorded league-goal rows are incomplete for some players; only player totals with at least two recorded seasons are eligible.":"International caps are aggregated from the career archive and may be incomplete."} This is a custom player-stat darts mode, not official PDC scoring.</p>
   {error&&<div className="arc-feedback"><b>ARCHIVE FALLBACK</b><p>The player-stat archive is unavailable. The starter Premier League goal list is active.</p><button className="arc-quiet" onClick={retry}>RETRY DATABASE</button></div>}
  </Card>}
 </Frame>;
}

type LinkDifficulty="STANDARD"|"HARD"|"EXTREME";
type GeneratedLink={start:GamePlayer;end:GamePlayer;answer:GamePlayer;startClub:string;endClub:string;options:GamePlayer[]};

function buildTeammateGraph(players:GamePlayer[]){
 const byClub=new Map<string,{player:GamePlayer;start:number;end:number;club:string}[]>();
 for(const player of players){
   for(const spell of player.careerSpells){
     if(!spell.club||spell.startYear===null)continue;
     const clubKey=normalise(spell.club);
     const group=byClub.get(clubKey)??[];
     group.push({player,start:spell.startYear,end:spell.endYear??spell.startYear,club:spell.club});
     byClub.set(clubKey,group);
   }
 }
 const graph=new Map<string,Map<string,string[]>>();
 for(const group of byClub.values()){
   const unique=new Map<string,typeof group[number][]>();
   for(const entry of group){const bucket=unique.get(entry.player.archiveId)??[];bucket.push(entry);unique.set(entry.player.archiveId,bucket);}
   const rows=Array.from(unique.values());
   for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
     const a=rows[i][0],b=rows[j][0];
     const overlap=rows[i].some(one=>rows[j].some(two=>one.start<=two.end&&two.start<=one.end));
     if(!overlap)continue;
     const left=graph.get(a.player.archiveId)??new Map<string,string[]>();
     const right=graph.get(b.player.archiveId)??new Map<string,string[]>();
     const leftClubs=left.get(b.player.archiveId)??[];
     const rightClubs=right.get(a.player.archiveId)??[];
     if(!leftClubs.includes(a.club))leftClubs.push(a.club);
     if(!rightClubs.includes(a.club))rightClubs.push(a.club);
     left.set(b.player.archiveId,leftClubs);right.set(a.player.archiveId,rightClubs);
     graph.set(a.player.archiveId,left);graph.set(b.player.archiveId,right);
   }
 }
 return graph;
}
function makeLinkQuestions(players:GamePlayer[],seed:number):GeneratedLink[]{
 const graph=buildTeammateGraph(players);
 const byId=new Map(players.map(p=>[p.archiveId,p]));
 const result:GeneratedLink[]=[];
 for(const target of shuffle(players,seed)){
   if(result.length>=24)break;
   const links=graph.get(target.archiveId);if(!links||links.size<2)continue;
   const teammateIds=shuffle(Array.from(links.keys()),seed+target.archiveId.length*37);
   for(let i=0;i<teammateIds.length&&result.length<24;i++){
     for(let j=i+1;j<teammateIds.length&&result.length<24;j++){
       const startId=teammateIds[i],endId=teammateIds[j];
       const start=byId.get(startId),end=byId.get(endId);
       if(!start||!end)continue;
       const startLinks=graph.get(startId),endLinks=graph.get(endId);
       if(!startLinks||!endLinks)continue;
       const common=[...startLinks.keys()].filter(id=>endLinks.has(id)&&id!==startId&&id!==endId);
       if(common.length!==1||common[0]!==target.archiveId)continue;
       const startClub=links.get(startId)?.[0]??"";
       const endClub=links.get(endId)?.[0]??"";
       const wrong=shuffle(players.filter(p=>p.archiveId!==target.archiveId&&p.archiveId!==startId&&p.archiveId!==endId),seed+i*71+j*13).slice(0,3);
       if(wrong.length!==3)continue;
       result.push({start,end,answer:target,startClub,endClub,options:shuffle([target,...wrong],seed+i*101+j*11)});
     }
   }
 }
 return result;
}
function LinkUpPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();const [difficulty,setDifficulty]=useState<LinkDifficulty>("STANDARD");
 const [practiceSeed,setPracticeSeed]=useState(()=>String(Math.floor(Math.random()*1e12)));
 const [guess,setGuess]=useState("");const [tries,setTries]=useState(0);const [end,setEnd]=useState(false);const [won,setWon]=useState(false);const done=account.daily[utcDay()]?.["link-up"]!==undefined;
 const seed=mode==="daily"?"LINK:"+utcDay():"LINK:PRACTICE:"+practiceSeed;
 const {players:archivePlayers,loading,error,retry}=useArchivePlayers(true,mode==="daily"?ARCHIVE_POOL_SEED:ARCHIVE_POOL_SEED+":"+practiceSeed,1600);
 const pool=useMemo(()=>archivePlayers.map(archivePlayerToGamePlayer),[archivePlayers]);
 const questions=useMemo(()=>pool.length>=20?makeLinkQuestions(pool,hashSeed(seed)):[],[pool,seed]);
 const idx=questions.length?hashSeed(seed+":question")%questions.length:0;
 const q=questions[idx];
 const typedMode=difficulty!=="STANDARD";
 const submit=(name:string)=>{
   if(end||!q)return;
   setGuess(name);
   const key=normalise(name);const correct=[q.answer.name,q.answer.surname,...q.answer.aliases].some(alias=>normalise(alias)===key);
   const next=tries+1;setTries(next);
   if(correct||next>= (difficulty==="EXTREME"?3:5)){
     setWon(correct);setEnd(true);
     if(mode==="daily")onDaily("link-up",correct?Math.max(100,1000-next*150):0);
   }
 };
 const reset=(newMode:Mode=mode,newDifficulty:LinkDifficulty=difficulty)=>{
   setDifficulty(newDifficulty);setGuess("");setTries(0);setEnd(false);setWon(false);
   if(newMode==="practice")setPracticeSeed(String(Math.floor(Math.random()*1e12)));
 };
 return <Frame account={account} game="link-up" eyebrow="SHARED TEAM-MATES / CAREER SPELL MATCH" title="THE LINK UP." description="Two players. One missing team-mate. The answer must have a recorded club-season overlap with both endpoints." number="11" mode={mode} setMode={m=>{setMode(m);reset(m);}}>
 {done&&mode==="daily"?<Success title="LINK MADE." detail="Today's shared-team-mate challenge is banked. Unlimited archive draws are open in practice." button="PRACTICE" onAgain={()=>{setMode("practice");reset("practice");}}/>:
  loading&&pool.length===0?<div className="grid-loading"><motion.div animate={{rotate:360}} transition={{duration:1.4,repeat:Infinity,ease:"linear"}}>⚽</motion.div><b>CONNECTING CAREERS</b><span>Finding overlapping club seasons in the archive.</span></div>:
  !q?<Card className="arc-feedback"><b>{error?"PLAYER ARCHIVE UNAVAILABLE":"NO UNIQUE PLAYER BRIDGES FOUND IN THIS DRAW"}</b><p>{error||"This archive sample did not contain enough unambiguous shared-team-mate links. Draw again or change the difficulty."}</p><button className="arc-button" onClick={()=>{retry();reset(mode,difficulty);}}>RETRY LINK ARCHIVE ↗</button></Card>:
  <Card className="link-game">
   <div className="arc-game-meta"><span>{difficulty} · {typedMode?"TYPE THE ANSWER":"PICK THE MISSING LINK"}</span><b>{(difficulty==="EXTREME"?3:5)-tries} GUESSES LEFT</b></div>
   <div className="link-bridge">
    <div><small>START PLAYER</small><strong>{q.start.name}</strong><span className="link-club-evidence"><ClubBadge name={q.startClub} size={22}/>{q.startClub}</span></div>
    <i>↔</i>
    <div><small>END PLAYER</small><strong>{q.end.name}</strong><span className="link-club-evidence"><ClubBadge name={q.endClub} size={22}/>{q.endClub}</span></div>
   </div>
   <div className="link-evidence"><span>THE LINK MUST HAVE OVERLAPPING SPELLS AT BOTH CLUBS.</span><b>ARCHIVE WINDOW / {q.startClub} + {q.endClub}</b></div>
   {!end?(typedMode?<form className="arc-guess-form" onSubmit={e=>{e.preventDefault();submit(guess);}}><input value={guess} onChange={e=>setGuess(e.target.value)} placeholder="Full name or surname…"/><button className="arc-button" disabled={!guess.trim()}>CONNECT ↗</button></form>:
    <div className="missing-options">{q.options.map(p=><button key={p.archiveId} onClick={()=>submit(p.name)}>{p.name}</button>)}</div>):
    <div className="arc-feedback"><b>{won?"BRIDGE FOUND.":"THE ARCHIVE LINK WAS "+q.answer.name.toUpperCase()+"."}</b><p>{q.answer.name} has recorded overlapping career spells with {q.start.name} at {q.startClub}, and with {q.end.name} at {q.endClub}. These are archive career-year overlaps, not minute-level appearance proof.</p><button className="arc-button" onClick={()=>reset(mode)}>NEXT LINK ↗</button></div>}
   <p className="arc-muted">This unique-answer test is within the current archive draw. The underlying careers dataset is incomplete and unverified, so not every real-world teammate relationship will be represented.</p>
  </Card>}
 </Frame>;
}

type MissingDifficulty="EASY"|"STANDARD"|"HARD"|"EXTREME";
const MISSING_LEVELS:MissingDifficulty[]=["EASY","STANDARD","HARD","EXTREME"];
function MissingXIPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();const [difficulty,setDifficulty]=useState<MissingDifficulty>("STANDARD");
 const [data,setData]=useState<Awaited<ReturnType<typeof getWorldCupLineups>>|null>(null);
 const [loadError,setLoadError]=useState("");const [attempts,setAttempts]=useState(0);const [end,setEnd]=useState(false);const [won,setWon]=useState(false);
 const [practiceSeed,setPracticeSeed]=useState(()=>String(Math.floor(Math.random()*1e12)));
 const done=account.daily[utcDay()]?.["missing-xi"]!==undefined;
 const seed=mode==="daily"?"MISSING-XI:"+utcDay()+":"+difficulty:"MISSING-XI:PRACTICE:"+practiceSeed+":"+difficulty;
 useEffect(()=>{let live=true;getWorldCupLineups().then(v=>{if(live)setData(v);}).catch(e=>{if(live)setLoadError(e instanceof Error?e.message:"World Cup line-ups unavailable.");});return()=>{live=false;};},[]);
 const lineups=useMemo(()=>data?.matches.filter(m=>m.starters.length===11&&m.year>=1982&&m.year<=2022)??[],[data]);
 const match=useMemo(()=>lineups.length?lineups[hashSeed(seed+":match")%lineups.length]:null,[lineups,seed]);
 const missingIndex=match?hashSeed(seed+":missing")%11:0;
 const missingPlayer=match?.starters[missingIndex]??"";
 const allNames=useMemo(()=>[...new Set(lineups.flatMap(m=>m.starters))],[lineups]);
 const optionCount=difficulty==="EASY"?4:difficulty==="STANDARD"?4:difficulty==="HARD"?6:8;
 const options=useMemo(()=>{
   if(!missingPlayer)return [];
   const decoys=shuffle(allNames.filter(name=>!match?.starters.includes(name)),hashSeed(seed+":decoys")).slice(0,optionCount-1);
   return shuffle([missingPlayer,...decoys],hashSeed(seed+":answers"));
 },[missingPlayer,allNames,match,seed,optionCount]);
 const rows=match?[[0],[1,2,3,4],[5,6,7],[8,9,10]].map(indexes=>indexes.map(i=>({name:match.starters[i],index:i}))):[];
 const choose=(value:string)=>{
   if(end||!match)return;const next=attempts+1;setAttempts(next);
   if(normalise(value)===normalise(missingPlayer)){setWon(true);setEnd(true);if(mode==="daily")onDaily("missing-xi",Math.max(150,1000-(next-1)*220));}
   else if(next>=3){setWon(false);setEnd(true);if(mode==="daily")onDaily("missing-xi",0);}
 };
 const reset=(newMode:Mode=mode,newDifficulty:MissingDifficulty=difficulty)=>{
   setDifficulty(newDifficulty);setAttempts(0);setEnd(false);setWon(false);
   if(newMode==="practice")setPracticeSeed(String(Math.floor(Math.random()*1e12)));
 };
 return <Frame account={account} game="missing-xi" eyebrow="HISTORIC STARTING XI / ONE NAME REMOVED" title="MISSING XI." description="A real World Cup starting line-up from 1982–2022. Ten names remain on the pitch. Find the missing starter." number="12" mode={mode} setMode={m=>{setMode(m);reset(m);}}>
 {done&&mode==="daily"?<Success title="LINE-UP COMPLETE." detail="Today's starting XI has been solved. Unlimited random World Cup practice is open." button="PRACTICE XI" onAgain={()=>{setMode("practice");reset("practice");}}/>:
  loadError?<Card className="arc-feedback"><b>WORLD CUP DATA UNAVAILABLE</b><p>{loadError}</p><button className="arc-button" onClick={()=>{setLoadError("");getWorldCupLineups().then(setData).catch(e=>setLoadError(String(e)));}}>RETRY LINE-UPS ↗</button></Card>:
  !match?<Card className="grid-loading"><motion.div animate={{rotate:360}} transition={{duration:1.5,repeat:Infinity,ease:"linear"}}>⚽</motion.div><b>OPENING THE WORLD CUP ARCHIVE</b><span>LOADING MATCHES AND STARTING ELEVENS…</span></Card>:
  <Card className="missing-game">
   <div className="arc-game-meta"><span>FIFA WORLD CUP · {match.year}</span><b>{3-attempts} ATTEMPTS LEFT</b></div>
   <div className="grid-difficulty">{MISSING_LEVELS.map(level=><button key={level} className={difficulty===level?"active":""} onClick={()=>reset(mode,level)}>{difficultyLabel(level)}</button>)}</div>
   <div className="missing-matchline"><div><small>ROUND</small><strong>{match.round||"MATCH"}</strong></div><div><small>OPPONENT</small><strong>{match.opponent}</strong></div><div><small>DATE</small><strong>{match.date}</strong></div><div><small>TEAM</small><strong>??????</strong></div></div>
   <div className="missing-formation-pitch">
    <div className="missing-pitch-markings"><i/><i/><i/><i/></div>
    {rows.map((row,rowIndex)=><div className={"formation-row "+["keeper","defence","midfield","forwards"][rowIndex]} key={rowIndex}>
      {row.map(({name,index})=>{
        const missing=index===missingIndex;
        return <motion.div className={"formation-player "+(missing?"missing-player-slot":"")} key={index} layout initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:index*.018}}>
          <div className="formation-shirt"><b>{missing?"??":String(index+1).padStart(2,"0")}</b></div>
          <div className="formation-club"><small>{missing?end?missingPlayer:"MISSING PLAYER":name}</small></div>
        </motion.div>;
      })}
    </div>)}
    <div className="formation-caption"><span>STARTING XI / 10 NAMES SHOWN</span><span>SCHEMATIC PITCH LAYOUT</span></div>
   </div>
   <p className="arc-muted">The source supplies the starting eleven but not reliable positional coordinates. The pitch is a visual arrangement, not a claim about the historical formation.</p>
   {!end?<><div className="missing-options">{options.map(name=><button key={name} onClick={()=>choose(name)}>{name}<i>↗</i></button>)}</div><div className="arc-game-foot"><span>{difficulty} · {optionCount} CHOICES</span><span>{lineups.length.toLocaleString("en-GB")} LINE-UP RECORDS</span></div></>:
    <div className="arc-feedback"><b>{won?"YOU FOUND THE MISSING PLAYER.":"THE MISSING PLAYER WAS "+missingPlayer.toUpperCase()+"."}</b><p>{missingPlayer} started for {match.team} against {match.opponent} in the {match.year} World Cup {match.round}.</p><button className="arc-button" onClick={()=>reset(mode)}>NEXT LINE-UP ↗</button></div>}
  </Card>}
 </Frame>;
}

function makeDynamicStrandsPack(players:GamePlayer[],seed:number):typeof STRANDS_PACKS[number]|null{
 const groups:{label:string;members:GamePlayer[]}[]=[];
 const addGroup=(label:string,items:GamePlayer[])=>{
   const unique=[...new Map(items.map(p=>[p.archiveId,p])).values()];
   if(unique.length>=10)groups.push({label,members:unique});
 };
 const byClub=new Map<string,{label:string;members:GamePlayer[]}>();
 const byNation=new Map<string,{label:string;members:GamePlayer[]}>();
 for(const p of players){
   for(const club of p.clubs){
     const key=normalise(club);if(!key)continue;
     const group=byClub.get(key)??{label:club,members:[]};group.members.push(p);byClub.set(key,group);
   }
   if(p.nationality&&p.nationality!=="Unlisted"){
     const key=normalise(p.nationality);const group=byNation.get(key)??{label:p.nationality,members:[]};
     group.members.push(p);byNation.set(key,group);
   }
 }
 for(const group of byClub.values())addGroup("CLUB / "+group.label,group.members);
 for(const group of byNation.values())addGroup("NATIONALITY / "+group.label,group.members);
 const orderedGroups=shuffle(groups,seed);
 for(let groupIndex=0;groupIndex<orderedGroups.length;groupIndex++){
   const group=orderedGroups[groupIndex];
   const orderedMembers=shuffle(group.members,seed+groupIndex*31);
   for(const anchor of orderedMembers){
     const spangram=anchor.name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z]/g,"");
     if(spangram.length!==13&&spangram.length!==14)continue;
     const target=48-spangram.length;
     const anchorSurname=anchor.surname.toUpperCase();
     const candidates=[...new Set(orderedMembers.filter(p=>p.archiveId!==anchor.archiveId)
       .map(p=>p.surname.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z]/g,""))
       .filter(word=>word.length>=3&&word.length<=7&&word!==anchorSurname))];
     if(candidates.length<8)continue;
     const dp:Map<number,string[]>[]=Array.from({length:9},()=>new Map<number,string[]>());
     dp[0].set(0,[]);
     for(const word of candidates){
       for(let count=7;count>=0;count--){
         for(const [sum,chosen] of Array.from(dp[count].entries())){
           const next=sum+word.length;
           if(next>target||dp[count+1].has(next))continue;
           dp[count+1].set(next,[...chosen,word]);
         }
       }
     }
     const words=dp[8].get(target);
     if(words&&new Set(words).size===8)return {spangram,words,theme:group.label+" / PLAYER CONNECTIONS"};
   }
 }
 return null;
}

function makeStrandsBoard(pack:typeof STRANDS_PACKS[number]){
 const cells=Array(48).fill("");const paths:number[][]=[];
 // Both spangram lengths start on the top edge and finish on the bottom edge.
 // The 14-letter route adds a top-edge entry cell, preserving the same terminal.
 const baseSpine=[0,8,16,24,32,40,41,42,43,44,45,46,47];
 const spine=pack.spangram.length===14?[1,...baseSpine]:baseSpine;
 const spineSet=new Set(spine);
 const rest:number[]=[];
 for(let r=0;r<5;r++){const cols=Array.from({length:7},(_,i)=>i+1);if(r%2)cols.reverse();for(const c of cols){const cell=r*8+c;if(!spineSet.has(cell))rest.push(cell);}}
 const words=[pack.spangram,...pack.words];let at=0;
 words.forEach((word,wi)=>{
   const path=wi===0?spine:rest.slice(at,at+word.length);
   if(wi>0)at+=word.length;
   if(path.length!==word.length)throw new Error("This Strands pack does not fit the 6 × 8 board.");
   paths.push(path);
   word.split("").forEach((letter,i)=>{cells[path[i]]=letter;});
 });
 if(cells.some(letter=>!letter))throw new Error("A Strands board has an empty letter cell.");
 return {cells,paths,words,spangram:pack.spangram};
}
function StrandsPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();const [boardNo,setBoardNo]=useState(0);const [selected,setSelected]=useState<number[]>([]);const pathRef=useRef<number[]>([]);const [dragging,setDragging]=useState(false);const [found,setFound]=useState<number[]>([]);const [wrong,setWrong]=useState(0);const [nudges,setNudges]=useState(0);const [finished,setFinished]=useState(false);const [notice,setNotice]=useState("");const [practiceSeed,setPracticeSeed]=useState(()=>String(Math.floor(Math.random()*1e12)));const done=account.daily[utcDay()]?.strands!==undefined;
 const seed=mode==="daily"?"STRANDS:"+utcDay()+":"+boardNo:"STRANDS:PRACTICE:"+practiceSeed+":"+boardNo;
 const {players:archivePlayers,loading,error,retry}=useArchivePlayers(true,mode==="daily"?ARCHIVE_POOL_SEED:ARCHIVE_POOL_SEED+":"+practiceSeed,1600);
 const pool=useMemo(()=>archivePlayers.map(archivePlayerToGamePlayer),[archivePlayers]);
 const dynamicPack=useMemo(()=>pool.length>=30?makeDynamicStrandsPack(pool,hashSeed(seed)):null,[pool,seed]);
 const staticOrder=useMemo(()=>shuffle(STRANDS_PACKS,hashSeed("STRANDS:"+utcDay())),[]);
 const pack=dynamicPack??(mode==="daily"?staticOrder[boardNo%staticOrder.length]:STRANDS_PACKS[hashSeed(seed)%STRANDS_PACKS.length]);
 const board=useMemo(()=>makeStrandsBoard(pack),[pack]);
 const solved=(index:number)=>found.includes(index);
 const isBlocked=(cell:number)=>board.paths.some((path,idx)=>solved(idx)&&path.includes(cell));
 const beginPath=(cell:number,event:React.PointerEvent<HTMLButtonElement>)=>{
   if(finished||isBlocked(cell))return;
   event.preventDefault();
   // Avoid pointer capture on the first tile: cross-tile pointerenter is needed for drag selection.
   pathRef.current=[cell];setSelected([cell]);setDragging(true);setNotice("");
 };
 const extendPath=(cell:number)=>{
   if(!dragging||finished||isBlocked(cell))return;
   const path=pathRef.current;const existing=path.indexOf(cell);
   if(existing>=0){const clipped=path.slice(0,existing+1);pathRef.current=clipped;setSelected(clipped);return;}
   const last=path[path.length-1];if(last===undefined)return;
   const r=Math.floor(last/8),c=last%8,rr=Math.floor(cell/8),cc=cell%8;
   if(Math.max(Math.abs(r-rr),Math.abs(c-cc))!==1)return;
   const next=[...path,cell];pathRef.current=next;setSelected(next);
 };
 const finishPath=()=>{
   if(!dragging)return;
   setDragging(false);const path=[...pathRef.current];pathRef.current=[];setSelected(path);
   const word=path.map(cell=>board.cells[cell]).join("");
   const foundIndex=board.words.findIndex((w,idx)=>!solved(idx)&&(w===word||w.split("").reverse().join("")===word));
   if(foundIndex>=0){
     const next=[...found,foundIndex];setFound(next);setSelected([]);setNotice("");
     if(next.length===9){setFinished(true);if(mode==="daily"&&boardNo===9)onDaily("strands",1000-nudges*80-wrong*15);}
   }else{setWrong(v=>v+1);setNotice(path.length>1?"No footballer on that path. Try another route.":"Drag through adjacent letters to make a name.");setSelected([]);}
 };
 const cancelPath=()=>{pathRef.current=[];setSelected([]);setDragging(false);};
 const nextBoard=()=>{setBoardNo(v=>v+1);pathRef.current=[];setSelected([]);setFound([]);setWrong(0);setNudges(0);setNotice("");setDragging(false);setFinished(false);};
 const hint=()=>{if(nudges>=3)return;setNudges(v=>v+1);};
 const currentDone=found.length===9;
 return <Frame account={account} game="strands" eyebrow="6 × 8 LETTER PUZZLE / 10 BOARDS" title="FOOTBALL STRANDS." description="Drag through touching letters to trace footballer surnames. Find the full-name spangram connecting the grid's edges." number="13" mode={mode} setMode={m=>{setMode(m);setBoardNo(0);if(m==="practice")setPracticeSeed(String(Math.floor(Math.random()*1e12)));pathRef.current=[];setSelected([]);setFound([]);setWrong(0);setNudges(0);setNotice("");setDragging(false);setFinished(false);}}>
 {done&&mode==="daily"?<Success title="TEN BOARDS CLEARED." detail="Your ten-puzzle Strands run is complete. Unlimited archive-generated practice is open." button="PRACTICE STRANDS" onAgain={()=>{setMode("practice");setPracticeSeed(String(Math.floor(Math.random()*1e12)));nextBoard();}}/>:
  <Card className="strands-game">
   <div className="arc-game-meta"><span>PUZZLE {boardNo+1} / 10</span><b>{found.length}/9 NAMES FOUND</b></div>
   <div className="strands-theme"><small>THE THEME</small><strong>{pack.theme}</strong><span>{dynamicPack?"Generated from shared club and nationality player groups.":"Curated fallback board while the archive pool is loading."} Drag from letter to letter; diagonal moves are allowed.</span></div>
   {loading&&pool.length===0&&<div className="strands-pool-note">LOADING PLAYER NAMES…</div>}
   <div className={"strands-grid "+(dragging?"is-dragging":"")} onPointerUp={finishPath} onPointerCancel={cancelPath} onContextMenu={e=>e.preventDefault()}>
    <svg className="strands-trail" viewBox="0 0 800 600" preserveAspectRatio="none" aria-hidden="true">
     {selected.length>1&&<polyline points={selected.map(cell=>{const row=Math.floor(cell/8),col=cell%8;return ((col+.5)/8*800)+","+((row+.5)/6*600);}).join(" ")} fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round"/>}
    </svg>
    {board.cells.map((letter,i)=>{
      const foundWord=found.findIndex(idx=>board.paths[idx].includes(i));const pathIndex=selected.indexOf(i);
      return <motion.button type="button" key={i} layout onPointerDown={e=>beginPath(i,e)} onPointerEnter={()=>extendPath(i)}
        className={(pathIndex>=0?"selected ":"")+(foundWord>=0?(foundWord===0?"spangram":"found"):"")}
        animate={{scale:pathIndex>=0?1.08:1}} transition={{type:"spring",stiffness:430,damping:26}}
        aria-label={"Row "+(Math.floor(i/8)+1)+", column "+(i%8+1)+", letter "+letter}>{letter}</motion.button>;
    })}
   </div>
   <div className="strands-actions"><button className="arc-quiet" onClick={cancelPath}>CLEAR PATH</button><button className="arc-button" onClick={hint} disabled={nudges>=3}>HINT {nudges}/3</button><button className="arc-quiet" onClick={nextBoard}>SKIP / NEXT ↗</button></div>
   {dragging&&<p className="strands-drag-live">KEEP DRAGGING · RELEASE TO CHECK</p>}
   {notice&&<div className="strands-feedback"><span>{notice}</span><button onClick={cancelPath}>DISMISS</button></div>}
   {nudges>0&&<p className="arc-muted">Nudge: an unfound name starts with {board.words.find((_word,i)=>!solved(i))?.[0]??"?"} and has {board.words.find((_word,i)=>!solved(i))?.length??5} letters. Each nudge reduces the run score.</p>}
   {currentDone&&<div className="arc-feedback"><b>BOARD {boardNo+1} COMPLETE.</b><p>SPANGRAM: {board.spangram}</p><button className="arc-button" onClick={boardNo===9?()=>{setFinished(true);if(mode==="daily")onDaily("strands",1000-nudges*80-wrong*15);}:nextBoard}>{boardNo===9?"FINISH TEN-BOARD RUN":"NEXT BOARD ↗"}</button></div>}
   <div className="strands-legend"><span><i className="blue"/> FOOTBALLER</span><span><i className="gold"/> SPANGRAM / FULL NAME</span></div>
   {error&&<div className="arc-feedback"><b>ARCHIVE FALLBACK</b><p>Curated Strands packs remain playable while the player pool is unavailable.</p><button className="arc-quiet" onClick={retry}>RETRY ARCHIVE</button></div>}
  </Card>}
 </Frame>;
}

type QuizDifficulty=QuizTier;
function makeTimedQuiz(bank: QuestionBank,difficulty:QuizDifficulty,seed:number,count=15):QuizQuestion[]{
 return makeQuestionRound(bank,difficulty,seed,count);
}
function QuickQuizPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();const [difficulty,setDifficulty]=useState<QuizDifficulty>("EASY");
 const [practiceSeed,setPracticeSeed]=useState(()=>String(Math.floor(Math.random()*1e12)));
 const [index,setIndex]=useState(0);const [chosen,setChosen]=useState("");const [locked,setLocked]=useState(false);
 const [score,setScore]=useState(0);const [seconds,setSeconds]=useState(10);const [typed,setTyped]=useState("");const [typingDone,setTypingDone]=useState(false);const [finished,setFinished]=useState(false);
 const done=account.daily[utcDay()]?.["timed-quiz"]!==undefined;
 const seed=mode==="daily"?"QUIZ:"+utcDay()+":"+difficulty:"QUIZ:PRACTICE:"+practiceSeed+":"+difficulty;
 const {bank,loading,error,retry}=useQuestionBank();
 const questions=useMemo(()=>bank?makeTimedQuiz(bank,difficulty,hashSeed(seed),15):[],[bank,difficulty,seed]);
 const question=questions[index];
 const progress=question?typed.length/question.question.length:0;
 const levels:QuizDifficulty[]=["EASY","MEDIUM","HARD","EXTREME"];
 useEffect(()=>{
   setIndex(0);setChosen("");setLocked(false);setScore(0);setSeconds(10);setTyped("");setTypingDone(false);setFinished(false);
 },[difficulty,mode,practiceSeed]);
 useEffect(()=>{
   if(!question||finished)return;
   setTyped("");setTypingDone(false);setSeconds(10);setChosen("");setLocked(false);
   let cursor=0;
   const timer=window.setInterval(()=>{
     cursor+=1;
     setTyped(question.question.slice(0,cursor));
     if(cursor>=question.question.length){window.clearInterval(timer);setTypingDone(true);}
   },24);
   return()=>window.clearInterval(timer);
 },[question?.question,finished]);
 useEffect(()=>{
   if(!typingDone||locked||finished)return;
   if(seconds<=0){setLocked(true);setChosen("");return;}
   const timer=window.setTimeout(()=>setSeconds(v=>Math.max(0,v-1)),1000);
   return()=>window.clearTimeout(timer);
 },[typingDone,locked,finished,seconds]);
 const choose=(value:string)=>{
   if(!typingDone||locked||finished||!question)return;
   setChosen(value);setLocked(true);
   if(value===question.answer)setScore(v=>v+100+(question.tier==="EXTREME"?100:question.tier==="HARD"?50:0));
 };
 const next=()=>{
   if(index+1>=questions.length){setFinished(true);if(mode==="daily")onDaily("timed-quiz",score);return;}
   setIndex(v=>v+1);
 };
 const restart=(newMode:Mode=mode,newDifficulty:QuizDifficulty=difficulty)=>{
   setDifficulty(newDifficulty);setIndex(0);setChosen("");setLocked(false);setScore(0);setSeconds(10);setTyped("");setTypingDone(false);setFinished(false);
   if(newMode==="practice")setPracticeSeed(String(Math.floor(Math.random()*1e12)));
 };
 const standardCount=questions.length;
 return <Frame account={account} game="timed-quiz" eyebrow="FIFTEEN QUESTIONS / TEN SECONDS EACH" title="THE QUICK QUIZ." description="A football question arrives like live commentary. Choose one of five answers before the clock runs out." number="16" mode={mode} setMode={m=>{setMode(m);restart(m);}}>
 {done&&mode==="daily"?<Success title="FULL-TIME." detail="Today's fifteen-question quiz has been banked. Unlimited practice is ready." button="PRACTICE QUIZ" onAgain={()=>{setMode("practice");restart("practice");}}/>:
  loading&&!bank?<Card className="quiz-loading"><motion.div animate={{scale:[1,1.08,1],rotate:[0,12,-12,0]}} transition={{duration:1.4,repeat:Infinity}}>⚽</motion.div><b>THE QUIZMASTER IS PICKING THE QUESTIONS</b><span>OPENING THE VALIDATED 3,200-QUESTION BANK…</span></Card>:
  error||!bank?<Card className="arc-feedback"><b>QUESTION BANK UNAVAILABLE</b><p>{error||"The validated question bank could not be opened."}</p><button className="arc-button" onClick={retry}>RETRY QUESTION BANK ↗</button></Card>:
  !questions.length?<Card className="arc-feedback"><b>NOT ENOUGH QUESTIONS FOR THIS RUN</b><p>There were not enough distinct player records to build a balanced round.</p><button className="arc-button" onClick={retry}>RETRY QUESTION BANK ↗</button></Card>:
  finished?<Success title="FULL-TIME." detail={"You scored "+score+" points across "+standardCount+" questions."} button="NEW QUIZ" onAgain={()=>restart(mode)}/>:
  <Card className="quiz-game">
   <div className="grid-difficulty">{levels.map(level=><button key={level} className={difficulty===level?"active":""} onClick={()=>restart(mode,level)}>{level==="MEDIUM"?"MEDIUM / STANDARD":level}</button>)}</div>
   <div className="arc-game-meta"><span>{bank.meta.distribution[difficulty].total} QUESTIONS / {bank.meta.distribution[difficulty].english} ENGLISH / {bank.meta.distribution[difficulty].international} OTHER LEAGUES</span><b>QUESTION {index+1} / {questions.length}</b></div>
   <div className="quiz-scoreboard"><div><small>YOUR SCORE</small><strong>{score}</strong></div><div><small>DIFFICULTY</small><b>{difficulty==="MEDIUM"?"MEDIUM / STANDARD":difficulty}</b></div><div><small>TIME LEFT</small><strong className={seconds<=3?"urgent":""}>{typingDone?seconds:"—"}</strong></div></div>
   <div className="quiz-question"><div className="quiz-type-cursor"/><h2>{typed}{!typingDone&&<i className="quiz-caret"/>}</h2><div className="quiz-progress"><i style={{width:(progress*100)+"%"}}/></div></div>
   {typingDone&&<motion.div className="quiz-options" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}>{question.options.map(option=><motion.button key={option} whileTap={{scale:.985}} onClick={()=>choose(option)} disabled={locked} className={locked&&option===question.answer?"correct":locked&&option===chosen?"wrong":""}>{option}</motion.button>)}</motion.div>}
   {locked&&<motion.div className={"arc-feedback "+(chosen===question.answer?"quiz-goal":"quiz-miss")} initial={{opacity:0,y:12,scale:.98}} animate={{opacity:1,y:0,scale:1}}><b>{chosen===question.answer?"GOAL! CORRECT.":chosen?"NOT THIS TIME.":"TIME'S UP."}</b><p>{question.explanation}</p><small>{question.source}</small><button className="arc-button" onClick={next}>{index+1===questions.length?"SEE FINAL SCORE":"NEXT QUESTION ↗"}</button></motion.div>}
   <div className="arc-game-foot"><span>{question?.category} / {question?.region==="ENGLISH"?"ENGLISH FOOTBALL":"OTHER EUROPEAN LEAGUES"}</span><span>ONE ANSWER / NO SECOND GO</span></div>
  </Card>}
 </Frame>;
}

type TournamentDifficulty="EASY"|"STANDARD"|"HARD"|"EXTREME";
const TOURNAMENT_LEVELS: TournamentDifficulty[]=["EASY","STANDARD","HARD","EXTREME"];
const lineupNameKey=(value:string)=>normalise(value);
function tournamentPositionGroup(raw:string):"keeper"|"defence"|"midfield"|"forwards"|""{
 const value=raw.toLocaleLowerCase();
 if(value.includes("goalkeeper")||value==="gk")return "keeper";
 if(value.includes("defend")||value.includes("back"))return "defence";
 if(value.includes("midfield")||value==="mf")return "midfield";
 if(value.includes("forward")||value.includes("striker")||value.includes("winger")||value.includes("attack"))return "forwards";
 return "";
}
function TournamentNationPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();
 const [difficulty,setDifficulty]=useState<TournamentDifficulty>("STANDARD");
 const [data,setData]=useState<Awaited<ReturnType<typeof getWorldCupLineups>>|null>(null);
 const [loadError,setLoadError]=useState("");
 const [clubRows,setClubRows]=useState<Map<string,string>>(new Map());
 const [positionRows,setPositionRows]=useState<Map<string,string>>(new Map());
 const [clubsLoading,setClubsLoading]=useState(false);
 const [clubLookupError,setClubLookupError]=useState("");
 const [clubLookupAttempt,setClubLookupAttempt]=useState(0);
 const [attempts,setAttempts]=useState(0);const [ended,setEnded]=useState(false);const [won,setWon]=useState(false);
 const [practiceSeed,setPracticeSeed]=useState(()=>String(Math.floor(Math.random()*1e12)));
 const done=account.daily[utcDay()]?.["tournament-nation"]!==undefined;
 const seed=mode==="daily"?"TOURNAMENT:"+utcDay()+":"+difficulty:"TOURNAMENT:PRACTICE:"+practiceSeed+":"+difficulty;
 useEffect(()=>{let live=true;getWorldCupLineups().then(v=>{if(live)setData(v);}).catch(e=>{if(live)setLoadError(e instanceof Error?e.message:"Tournament data unavailable.");});return()=>{live=false;};},[]);
 const match=useMemo(()=>{
   if(!data?.matches.length)return null;
   const eligible=data.matches.filter(m=>m.year>=1982&&m.year<=2022&&m.starters.length===11);
   return eligible[hashSeed(seed+":match")%eligible.length]??null;
 },[data,seed]);
 useEffect(()=>{
   if(!match){setClubRows(new Map());setPositionRows(new Map());setClubLookupError("");return;}
   let live=true;setClubsLoading(true);setClubRows(new Map());setPositionRows(new Map());setClubLookupError("");
   getCareerClubsAtYear(match.starters,match.year).then(records=>{
     if(!live)return;
     const clubs=new Map<string,string>();const positions=new Map<string,string>();
     for(const name of match.starters){
       const key=lineupNameKey(name);const found=records.get(key)??[];
       const distinctClubs=[...new Set(found.map(x=>x.club).filter(Boolean))];
       const distinctPositions=[...new Set(found.map(x=>x.position).filter(Boolean))];
       if(distinctClubs.length===1)clubs.set(key,distinctClubs[0]);
       if(distinctPositions.length===1)positions.set(key,distinctPositions[0]);
     }
     setClubRows(clubs);setPositionRows(positions);
   }).catch(problem=>{if(live){setClubRows(new Map());setPositionRows(new Map());setClubLookupError(problem instanceof Error?problem.message:"The historical club lookup failed.");}}).finally(()=>{if(live)setClubsLoading(false);});
   return()=>{live=false;};
 },[match?.id,clubLookupAttempt]);
 const teams=useMemo(()=>data?[...new Set(data.matches.map(m=>m.team).filter(Boolean))]:[],[data]);
 const optionCount=difficulty==="EASY"?3:difficulty==="STANDARD"?4:difficulty==="HARD"?6:8;
 const options=useMemo(()=>{
   if(!match)return [];
   const wrong=teams.filter(team=>team!==match.team);
   return shuffle([match.team,...shuffle(wrong,hashSeed(seed+":wrong")).slice(0,optionCount-1)],hashSeed(seed+":options"));
 },[match,teams,seed,optionCount]);
 const clueCount=difficulty==="EASY"?11:difficulty==="STANDARD"?9:difficulty==="HARD"?7:5;
 const clueNames=match?.starters??[];
 const visibleClueCount=clueNames.slice(0,clueCount).filter(name=>clubRows.has(lineupNameKey(name))).length;
 const lineupGroups=useMemo(()=>{
   if(!match)return [] as {name:string;index:number;role:string;club:string;showClue:boolean}[][];
   const players=match.starters.map((name,index)=>({
     name,index,role:positionRows.get(lineupNameKey(name))??"",
     club:clubRows.get(lineupNameKey(name))??"",showClue:index<clueCount
   }));
   const roles=["keeper","defence","midfield","forwards"] as const;
   const grouped=roles.map(role=>players.filter(p=>tournamentPositionGroup(p.role)===role));
   const roleCount=grouped.reduce((count,row)=>count+row.length,0);
   const valid=roleCount===11&&grouped[0].length===1&&grouped[1].length>=3&&grouped[1].length<=5&&grouped[2].length>=2&&grouped[2].length<=5&&grouped[3].length>=1&&grouped[3].length<=4;
   return valid?grouped:[players.slice(0,1),players.slice(1,5),players.slice(5,8),players.slice(8,11)];
 },[match?.id,positionRows,clubRows,clueCount]);
 const positionsVerified=Boolean(match&&match.starters.every(name=>Boolean(positionRows.get(lineupNameKey(name))))&&
   lineupGroups[0]?.length===1&&lineupGroups[1]?.length>=3&&lineupGroups[1]?.length<=5&&lineupGroups[2]?.length>=2&&lineupGroups[2]?.length<=5&&lineupGroups[3]?.length>=1);
 const choose=(team:string)=>{
   if(ended||!match)return;const tries=attempts+1;setAttempts(tries);
   if(team===match.team){setWon(true);setEnded(true);if(mode==="daily")onDaily("tournament-nation",Math.max(150,1000-(tries-1)*220));}
   else if(tries>=3){setWon(false);setEnded(true);if(mode==="daily")onDaily("tournament-nation",0);}
 };
 const reset=(newMode:Mode=mode,newDifficulty:TournamentDifficulty=difficulty)=>{
   setDifficulty(newDifficulty);setAttempts(0);setEnded(false);setWon(false);
   if(newMode==="practice")setPracticeSeed(String(Math.floor(Math.random()*1e12)));
 };
 return <Frame account={account} game="tournament-nation" eyebrow="WORLD CUP ARCHIVE / STARTING XI" title="TOURNAMENT NATION." description="Identify the country from a full historic World Cup starting XI. Each shirt gives you a club clue from that tournament year." number="15" mode={mode} setMode={m=>{setMode(m);reset(m);}}>
 {done&&mode==="daily"?<Success title="NATION IDENTIFIED." detail="Today's tournament challenge is complete. Practice draws from other recorded World Cup line-ups." button="PRACTICE" onAgain={()=>{setMode("practice");reset("practice");}}/>:
  loadError?<Card className="arc-feedback"><b>TOURNAMENT DATA UNAVAILABLE</b><p>{loadError}</p><button className="arc-button" onClick={()=>{setLoadError("");getWorldCupLineups().then(setData).catch(e=>setLoadError(String(e)));}}>RETRY DATA ↗</button></Card>:
  !match||!data?<Card className="grid-loading"><motion.div animate={{rotate:360}} transition={{duration:1.5,repeat:Infinity,ease:"linear"}}>⚽</motion.div><b>OPENING THE WORLD CUP ARCHIVE</b><span>Loading 1982–2022 starting line-ups.</span></Card>:
  <Card className="tournament-game">
   <div className="arc-game-meta"><span>FIFA WORLD CUP · {match.year}</span><b>{3-attempts} GUESSES LEFT</b></div>
   <div className="grid-difficulty">{TOURNAMENT_LEVELS.map(level=><button key={level} className={difficulty===level?"active":""} onClick={()=>reset(mode,level)}>{difficultyLabel(level)}</button>)}</div>
   <div className="tournament-match"><div><small>TOURNAMENT</small><b>FIFA WORLD CUP {match.year}</b></div><div><small>ROUND</small><b>{match.round||"MATCH"}</b></div><div><small>OPPONENT</small><b>{match.opponent}</b></div><div><small>DATE</small><b>{match.date}</b></div></div>
   <div className="tournament-pitch"><div className="tournament-pitch-lines"><i/><i/><i/></div>
    <div className="tournament-xi-rows">{lineupGroups.map((row,rowIndex)=><div className={"tournament-xi-row "+["keeper","defence","midfield","forwards"][rowIndex]} key={rowIndex}>
     {row.map(({name,index,role,club,showClue})=><motion.div className="tournament-shirt" key={name} initial={{opacity:0,y:10,scale:.9}} animate={{opacity:1,y:0,scale:1}} transition={{delay:index*.018}}>
       <div className="shirt-shape"><b>{String(index+1).padStart(2,"0")}</b></div>
       <div className="shirt-club">
        {showClue&&club?<><ClubBadge name={club} size={22}/><small>{club}</small></>:
         <small>{showClue?(clubsLoading?"LOOKING UP CLUB":"CLUB NOT RECORDED"):"CLUE HIDDEN"}</small>}
        {role&&<i className="shirt-position">{role}</i>}
       </div>
      </motion.div>)}
    </div>)}</div>
    <div className="tournament-xi-caption"><span>FULL STARTING XI / 11 PLAYERS</span><span>{visibleClueCount} / {Math.min(clueCount,match.starters.length)} CLUBS MATCHED / {match.year}</span></div>
   </div>
   {clubLookupError&&<div className="arc-feedback"><b>CLUB ARCHIVE MATCHING UNAVAILABLE</b><p>{clubLookupError} No unverified club names have been substituted.</p><button className="arc-quiet" onClick={()=>setClubLookupAttempt(value=>value+1)}>RETRY CLUB MATCHING ↻</button></div>}
   <p className="arc-muted">{positionsVerified?"Rows use the archive's broad player-position profiles; these are not confirmed match-day coordinates.":"The source supplies the starting eleven but not reliable match-day positions. The shirts use a clearly marked schematic 4-3-3 until enough profile positions are available."} Only exact player-name/year club matches are shown; missing clubs stay unrecorded.</p>
   {!ended?<><div className="tournament-options">{options.map(team=><button key={team} onClick={()=>choose(team)}>{team}<i>↗</i></button>)}</div><div className="arc-game-foot"><span>{difficulty} · {optionCount} NATIONAL TEAMS</span><span>{visibleClueCount} MATCHED / {Math.min(clueCount,match.starters.length)} CLUE SLOTS</span></div></>:
    <div className="arc-feedback"><b>{won?"YOU GOT THE NATION.":"THE NATION WAS "+match.team.toUpperCase()+"."}</b><p>{match.team} started against {match.opponent} at the {match.round} stage of the {match.year} World Cup.</p><button className="arc-button" onClick={()=>reset(mode)}>NEXT TOURNAMENT ↗</button></div>}
  </Card>}
 </Frame>;
}

function ScoutSignalPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();
 const [practiceSeed,setPracticeSeed]=useState(()=>String(Math.floor(Math.random()*1e12)));
 const [guess,setGuess]=useState("");
 const [history,setHistory]=useState<GamePlayer[]>([]);
 const [end,setEnd]=useState(false);
 const [won,setWon]=useState(false);
 const seed=mode==="daily"?"SCOUT:"+utcDay():"SCOUT:PRACTICE:"+practiceSeed;
 const {players:archivePlayers,loading,error,retry}=useArchivePlayers(true,mode==="daily"?ARCHIVE_POOL_SEED:ARCHIVE_POOL_SEED+":"+practiceSeed,1600);
 const done=account.daily[utcDay()]?.["scout-signal"]!==undefined;
 const archived=useMemo(()=>archivePlayers.map(archivePlayerToGamePlayer)
   .filter(p=>p.nationality!=="Unlisted"&&p.club!=="Unknown club"&&p.clubs.length>0),[archivePlayers]);
 const staticPool=useMemo(()=>PLAYER_DATABASE.map(p=>({
   ...p,archiveId:p.name,careerSpells:[],seasonStats:[],careerAppsRecorded:false,careerGoalsRecorded:false,leagueAppsRecorded:false,leagueGoalsRecorded:false,careerApps:0,careerGoals:0,leagueApps:0,leagueGoals:0,leagueGoalSeasons:0,leagueAssists:0,leagueAssistSeasons:0,
   statSeasons:0,firstYear:null,lastYear:null,caps:null,internationalGoals:null,birthDate:"",
   currentCountry:"",currentDivision:null
 } as GamePlayer)),[]);
 const pool=archived.length>=2?archived:staticPool;
 const target=pool[hashSeed(seed+":target")%pool.length];
 type SignalKey="nationality"|"careerClub"|"latestClub"|"position"|"league"|"ageBand";
 const sharedClubs=(p:GamePlayer)=>p.clubs.filter(c=>target.clubs.some(t=>normalise(t)===normalise(c)));
 const category=(key:SignalKey,p:GamePlayer)=>{
   if(key==="nationality")return Boolean(p.nationality&&p.nationality!=="Unlisted")&&p.nationality===target.nationality;
   if(key==="careerClub")return sharedClubs(p).length>0;
   if(key==="latestClub")return Boolean(p.club&&p.club!=="Unknown club")&&normalise(p.club)===normalise(target.club);
   if(key==="position")return Boolean(p.position)&&p.position===target.position;
   if(key==="league")return Boolean(p.league&&p.league!=="Unlisted")&&p.league===target.league;
   return p.ageBand===target.ageBand&&p.ageBand!=="Unknown";
 };
 const attrs:[SignalKey,string][]=[["nationality","NATION"],["careerClub","SHARED CLUB"],["latestClub","LATEST CLUB"],["position","POSITION"],["league","LEAGUE"],["ageBand","AGE BAND"]];
 const valueFor=(key:SignalKey,p:GamePlayer)=>{
   if(key==="nationality")return <span className="scout-value"><CountryFlag name={p.nationality}/><small>{p.nationality}</small></span>;
   if(key==="careerClub"){
     const common=sharedClubs(p);
     return common.length?<span className="scout-value"><ClubBadge name={common[0]} size={21}/><small>{common[0]}</small>{common.length>1&&<i>+{common.length-1}</i>}</span>:<small className="scout-no-match">NO MATCH</small>;
   }
   if(key==="latestClub")return <span className="scout-value"><ClubBadge name={p.club} size={21}/><small>{p.club}</small></span>;
   if(key==="position")return <small>{p.position}</small>;
   if(key==="league")return <small>{p.league}</small>;
   return <small>{p.ageBand}</small>;
 };
 const submit=(e:FormEvent)=>{
   e.preventDefault();
   const p=archiveGuess(guess,pool);
   if(!p||history.some(x=>x.archiveId===p.archiveId)||end)return;
   const next=[...history,p];setHistory(next);setGuess("");
   if(p.archiveId===target.archiveId){setWon(true);setEnd(true);if(mode==="daily")onDaily("scout-signal",Math.max(100,1000-(next.length-1)*90));}
   else if(next.length>=10){setEnd(true);if(mode==="daily")onDaily("scout-signal",0);}
 };
 const reset=()=>{
   if(mode==="daily"){setMode("practice");setPracticeSeed(String(Math.floor(Math.random()*1e12)));}
   else setPracticeSeed(String(Math.floor(Math.random()*1e12)));
   setGuess("");setHistory([]);setEnd(false);setWon(false);
 };
 const targetReady=archivePlayers.length>=2||Boolean(error);
 return <Frame account={account} game="scout-signal" eyebrow="ATTRIBUTE DEDUCTION / PLAYER HUNT" title="SCOUT SIGNAL." description="Guess the mystery player. Each guess lights up any matching football attributes, including club badges and nationality flags." number="14" mode={mode} setMode={m=>{setMode(m);setGuess("");setHistory([]);setEnd(false);setWon(false);if(m==="practice")setPracticeSeed(String(Math.floor(Math.random()*1e12)));}}>
 {done&&mode==="daily"?<Success title="SCOUTING REPORT COMPLETE." detail="Today's mystery is done. Unlimited practice is open." button="PRACTICE" onAgain={()=>{setMode("practice");setPracticeSeed(String(Math.floor(Math.random()*1e12)));}}/>:
  !targetReady&&loading?<Card className="scout-loading"><motion.div animate={{rotate:360}} transition={{duration:1.6,repeat:Infinity,ease:"linear"}}>⚽</motion.div><b>OPENING THE SCOUTING DATABASE</b><p>Loading a fresh player pool with career clubs, nationalities and recorded details.</p><span>THIS PLAYER POOL IS CACHED ON YOUR DEVICE FOR REPEAT VISITS.</span></Card>:
  <Card className="scout-game">
   <div className="arc-game-meta"><span>{10-history.length} GUESSES LEFT</span><b>{Math.max(0,1000-history.length*90)} PTS AVAILABLE</b></div>
   <div className="scout-target-note"><span>SCOUTING TARGET</span><b>IDENTITY HIDDEN</b><small>{archived.length>=2?archived.length.toLocaleString("en-GB")+" ARCHIVE PLAYERS IN THIS DRAW":"STARTER PLAYER LIST / ARCHIVE UNAVAILABLE"}</small></div>
   <div className="scout-column-head"><span>YOUR GUESS</span>{attrs.map(([,label])=><span key={label}>{label}</span>)}</div>
   <div className="scout-rows">{history.map(p=><motion.div className="scout-row" layout key={p.archiveId} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
     <b>{p.name}</b>{attrs.map(([key,label])=><span key={label} className={category(key,p)?"lit":"scout-cell"} title={label+": "+(key==="careerClub"?sharedClubs(p).join(", ")||"No shared club":key==="latestClub"?p.club:key==="nationality"?p.nationality:key==="position"?p.position:key==="league"?p.league:p.ageBand)}>{valueFor(key,p)}</span>)}
   </motion.div>)}</div>
   <form className="arc-guess-form" onSubmit={submit}><input list="scout-players" value={guess} onChange={e=>setGuess(e.target.value)} placeholder="Try a full name or surname…"/><datalist id="scout-players">{pool.map(p=><option key={p.archiveId} value={p.name}/>)}</datalist><button className="arc-button" disabled={!archiveGuess(guess,pool)||end}>SCAN PLAYER ↗</button></form>
   <p className="arc-muted">A shared club is a club listed in both careers. Latest club uses the archive's latest listed career spell; it is not a live transfer feed.</p>
   {error&&<div className="arc-feedback"><b>ARCHIVE FALLBACK</b><p>The large archive could not be reached, so the starter list is active instead.</p><button className="arc-quiet" onClick={retry}>RETRY DATABASE</button></div>}
   {end&&<div className="arc-feedback"><b>{won?"TARGET FOUND":"THE PLAYER WAS "+target.name}</b><p>{target.nationality} · {target.position} · {target.clubs.join(" → ")}</p><button className="arc-button" onClick={reset}>NEXT SCOUT REPORT ↗</button></div>}
  </Card>}
 </Frame>;
}

export function ArcadeApp(){
 const [account,setAccount]=useState<Account>(loadAccount);
 useEffect(()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(account));}catch{/* keep the session usable if storage is unavailable */}},[account]);
 useEffect(()=>{
   const now=new Date();
   const nextMidnight=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+1);
   const timer=window.setTimeout(()=>window.location.reload(),Math.max(1000,nextMidnight-Date.now()+50));
   return ()=>window.clearTimeout(timer);
 },[]);
 const onDaily=(game:GameId,score:number)=>setAccount(prev=>awardDaily(prev,game,score));
 const path=pageFromPath(window.location.pathname);
 if(path==="locker-room")return <MotionConfig reducedMotion="user"><AccountPage account={account} setAccount={setAccount}/></MotionConfig>;
 const pages:Record<string,React.ReactNode>={
  "lowball":<LowballPage account={account} onDaily={onDaily}/>,
  "the-climb":<ClimbPage account={account} onDaily={onDaily}/>,
  "draft-xi":<DraftPage account={account} onDaily={onDaily}/>,
  "career-file":<CareerFilePage dailyDone={account.daily[utcDay()]?.["career-file"]!==undefined} onDailyComplete={score=>onDaily("career-file",score)}/>,
  "footle":<FootlePage account={account} onDaily={onDaily}/>,
  "connections":<ConnectionsPage account={account} onDaily={onDaily}/>,
  "football-grid":<GridPage account={account} onDaily={onDaily}/>,
  "ladder":<LadderPage account={account} onDaily={onDaily}/>,
  "the-reveal":<RevealPage account={account} onDaily={onDaily}/>,
  "football-501":<FiveOhOnePage account={account} onDaily={onDaily}/>,
  "link-up":<LinkUpPage account={account} onDaily={onDaily}/>,
  "missing-xi":<MissingXIPage account={account} onDaily={onDaily}/>,
  "strands":<StrandsPage account={account} onDaily={onDaily}/>,
  "scout-signal":<ScoutSignalPage account={account} onDaily={onDaily}/>,
  "tournament-nation":<TournamentNationPage account={account} onDaily={onDaily}/>,
  "timed-quiz":<QuickQuizPage account={account} onDaily={onDaily}/>
 };
 return <MotionConfig reducedMotion="user">{pages[path]??<HomePage account={account}/>}</MotionConfig>;
}
