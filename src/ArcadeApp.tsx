import { useEffect, useMemo, useState, useRef, type FormEvent, type ReactNode } from "react";
import { motion, AnimatePresence, Reorder } from "motion/react";
import {
  PLAYER_DATABASE, LEAGUE_GOALS, STRANDS_PACKS,
  type Player
} from "./playerData";
import { ClubBadge, CountryFlag } from "./ClubBadge";
import { useArchivePlayers } from "./useArchivePlayers";
import { getWorldCupLineups } from "./tournamentNationData";
import type { ArchiveGamePlayer, ArchiveCareerSpell } from "./careerFileData";
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
const EMPTY_ACCOUNT: Account = { nickname:"PLAYER 01", createdAt:new Date().toISOString(), streak:0, bestStreak:0, lastDailyDate:"", daily:{}, totals:{} };
const GAME_LINKS = [
  {id:"lowball",title:"LOWBALL",sub:"Higher or lower. No second guesses.",tone:"lime",tag:"QUICK FIRE"},
  {id:"the-climb",title:"THE CLIMB",sub:"Five questions. Three lives.",tone:"orange",tag:"SURVIVAL"},
  {id:"draft-xi",title:"DRAFT XI",sub:"Build an XI inside the game budget.",tone:"blue",tag:"SQUAD BUILDER"},
  {id:"career-file",title:"CAREER FILE",sub:"Read the club journey. Find the player.",tone:"pink",tag:"MYSTERY"},
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
  careerApps:number;
  careerGoals:number;
  leagueApps:number;
  leagueGoals:number;
  leagueGoalSeasons:number;
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
  return "MID";
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
    ageBand,clubs:p.clubs,aliases:[name,surname].filter(Boolean),
    archiveId:p.id,careerSpells:p.spells??[],careerApps:p.appearances,careerGoals:p.goals,leagueApps:p.leagueAppearances,
    leagueGoals:p.leagueGoals,leagueGoalSeasons:p.leagueGoalSeasons,statSeasons:p.seasons,firstYear:p.firstYear,lastYear:p.lastYear,
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
function dailyFootle(mode:Mode){const bank=playerSurnames();return mode==="daily"?bank[hashSeed("FOOTLE:"+utcDay())%bank.length]:bank[Math.floor(Math.random()*bank.length)];}
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
  return <div className={"arc-shell arc-"+game}><TopBar account={account}/><main className="arc-main"><GameHeading eyebrow={eyebrow} title={title} description={description} number={number}/><ModeSwitch mode={mode} setMode={setMode} complete={done}/>{children}</main><footer className="arc-footer"><a href="/">PLAYGROUND®</a><span>THE DAILY CHANGES AT 00:00 GMT · DAILY SCORES & STREAK SAVED ON THIS DEVICE</span><a href="/locker-room">LOCKER ROOM ↗</a></footer></div>;
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
    <section className="arc-daily-strip"><div><small>YOUR DAILY RECORD / UTC</small><strong>{done} <i>/ 14</i></strong><span>GAMES PLAYED TODAY</span></div><div><small>YOUR STREAK</small><strong>{account.streak} <i>days</i></strong><span>BEST {account.bestStreak} DAYS</span></div><div><small>PLAYER NAME</small><strong className="nickname-stat">{account.nickname}</strong><span>LOCAL PLAYER SAVE</span></div><a href="/locker-room">OPEN LOCKER ROOM ↗</a></section>
    <section id="all-games" className="arc-game-directory"><div className="arc-section-title"><div><span>01 / THE LINE-UP</span><h2>PICK YOUR<br/><em>GAME.</em></h2></div><p>Every game has its own page. Daily challenges reset together at midnight GMT. Practice whenever you like.</p></div>
      <div className="arc-home-grid">{GAME_LINKS.map((game,i)=><motion.a href={"/"+game.id} key={game.id} className={"arc-game-tile "+game.tone} whileHover={{y:-5,rotate:i%2?1:-1}} whileTap={{scale:.985}}><div><small>PG / GAME {String(i+1).padStart(2,"0")}</small><span>{game.tag}</span></div><div className="arc-tile-art"><i>{["↗","Ⅲ","XI","?","A","▦","▤","↗","◉","501","↔","11","✳","◎"][i]}</i></div><h3>{game.title}</h3><p>{game.sub}</p><b className="arc-tile-arrow">PLAY ↗</b></motion.a>)}</div>
    </section>
    <section className="arc-home-bottom"><div><small>THE PLAYGROUND / CLUBHOUSE</small><h2>KEEP YOUR<br/><em>RUN GOING.</em></h2><p>Your nickname, daily results and streak stay saved in this browser. Practice is unlimited. No signup. Just get playing.</p><a href="/locker-room" className="arc-button">YOUR LOCKER ROOM ↗</a></div><div className="arc-home-score"><span>🔥</span><strong>{account.streak}</strong><small>DAY STREAK</small></div></section>
    </main><footer className="arc-footer"><a href="/">PLAYGROUND®</a><span>FOOTBALL, PLAYED DIFFERENTLY.</span><a href="/locker-room">YOUR ACCOUNT ↗</a></footer></div>;
}

function AccountPage({account,setAccount}:{account:Account;setAccount:(a:Account)=>void}){
 const [name,setName]=useState(account.nickname);
 const update=(e:FormEvent)=>{e.preventDefault();setAccount({...account,nickname:name.trim().slice(0,18)||"PLAYER 01"});};
 return <div className="arc-shell arc-locker"><TopBar account={account}/><main className="arc-main"><GameHeading eyebrow="THE CLUBHOUSE / YOUR SAVE" title="LOCKER ROOM." description="Your local player card. Your nickname, daily scores and streak stay in this browser." number="PROFILE"/>
  <Card className="arc-profile-card"><div className="arc-profile-mark">PG</div><div className="arc-profile-details"><small>PLAYER CARD / LOCAL SAVE</small><h2>{account.nickname}</h2><p>PLAYER SINCE {new Date(account.createdAt).toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</p></div><div className="arc-profile-stats"><div><b>{account.streak}</b><span>STREAK</span></div><div><b>{account.bestStreak}</b><span>BEST</span></div><div><b>{Object.values(account.totals).reduce((n,v)=>n+v,0)}</b><span>GAMES</span></div></div></Card>
  <Card><small className="arc-card-kicker">01 / YOUR PLAYER NAME</small><form className="arc-name-form" onSubmit={update}><input value={name} onChange={e=>setName(e.target.value)} maxLength={18} placeholder="Choose a nickname"/><button className="arc-button">SAVE NAME ↗</button></form><p className="arc-muted">This is a local save on this device and browser. It does not currently sync between phones or computers.</p></Card>
  <Card><small className="arc-card-kicker">02 / TODAY'S SCORECARD · {utcDay()} GMT</small><div className="arc-score-list">{GAME_LINKS.map(g=><div key={g.id}><span>{g.title}</span><b>{account.daily[utcDay()]?.[g.id]!==undefined?account.daily[utcDay()][g.id]+" PTS":"NOT PLAYED"}</b></div>)}</div></Card>
  <Card><small className="arc-card-kicker">03 / YOUR RECORD</small><div className="arc-record-grid">{GAME_LINKS.map(g=><div key={g.id}><span>{g.title}</span><strong>{account.totals[g.id]??0}</strong><small>COMPLETIONS</small></div>)}</div></Card>
  <p className="arc-muted">Daily streaks roll over at exactly 00:00 GMT (UTC), not local phone midnight. Practice rounds do not affect your streak. Clearing browser data can erase this local save.</p>
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
 const {players:archivePlayers,loading:poolLoading,error:poolError,retry:retryPool}=useArchivePlayers(true,seed,1600);
 const archivePool=useMemo(()=>archivePlayers.map(archivePlayerToGamePlayer)
   .filter(p=>p.leagueGoalSeasons>=2&&p.leagueGoals>=0&&p.name!=="Unknown player"),[archivePlayers]);
 type DuelStatPlayer={name:string;value:number;club:string;seasons:number;id:string};
 const fallbackPool:DuelStatPlayer[]=LEAGUE_GOALS.map(p=>({name:p.name,value:p.value,club:"Premier League archive",seasons:1,id:p.name}));
 const sourcePool:DuelStatPlayer[]=archivePool.length>=2
   ?archivePool.map(p=>({name:p.name,value:p.leagueGoals,club:p.club,seasons:p.leagueGoalSeasons,id:p.archiveId}))
   :fallbackPool;
 const level=Math.min(3,Math.floor(step/5));
 const levelNames=["EASY","STANDARD","HARD","EXTREME"];
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
    <div className="arc-game-meta"><span>{mode==="daily"?"DAILY DUEL "+(step+1)+" / 10":"STREAK "+step+" · "+levelNames[level]}</span><b>{score} PTS</b></div>
    <div className="lb-streak-meter">{[0,1,2,3].map(i=><span key={i} className={i<=level?"on":""}>{i===0?"EASY":i===1?"STD":i===2?"HARD":"EXTREME"}</span>)}</div>
    <div className="lb-vs">
     <div className="lb-player"><small>PLAYER A</small><strong>{pair[0].name}</strong><span>{pick!==null?pair[0].value.toLocaleString("en-GB")+" GOALS":"— — —"}</span><i>{pair[0].club}</i></div>
     <div className="lb-vs-mark">VS</div>
     <div className="lb-player"><small>PLAYER B</small><strong>{pair[1].name}</strong><span>{pick!==null?pair[1].value.toLocaleString("en-GB")+" GOALS":"— — —"}</span><i>{pair[1].club}</i></div>
    </div>
    <div className="lb-actions">{pair.map((p,i)=><button key={p.id} onClick={()=>choose(i)} disabled={pick!==null} className={pick===null?"":i===correct?"correct":"wrong"}>MORE GOALS ↗</button>)}</div>
    {pick!==null&&<div className="arc-feedback"><b>{pick===correct?"YOU CALLED IT.":"STREAK OVER."}</b><p>{pair[correct].name} has {pair[correct].value.toLocaleString("en-GB")} recorded league goals in the source records.</p><button className="arc-button" onClick={pick===correct?next:()=>{if(mode==="daily")onDaily("lowball",score);setRunDone(true);}}>{pick===correct?(mode==="daily"&&step===9?"BANK DAILY SCORE":"NEXT DUEL"):"SEE RUN RESULT"} ↗</button></div>}
    <div className="lb-data-note"><b>{metric}</b><span>{archivePool.length>=2?"Source rows with recorded league statistics; season coverage varies by player.":"Starter fallback list while the shared archive is unavailable."}</span>{poolError&&<button onClick={retryPool}>RETRY ARCHIVE</button>}</div>
   </Card>}
 </Frame>;
}

const CLIMB_Q=[
 {q:"Which club did Didier Drogba join in 2004?",a:["Chelsea","Arsenal","Liverpool","Tottenham"],correct:"Chelsea",fact:"Drogba joined Chelsea from Marseille in July 2004."},
 {q:"Which country did George Weah represent?",a:["Nigeria","Liberia","Ghana","Cameroon"],correct:"Liberia",fact:"Weah represented Liberia internationally."},
 {q:"Who scored the extra-time winner in the 2014 World Cup final?",a:["Lionel Messi","Mario Götze","Thomas Müller","Miroslav Klose"],correct:"Mario Götze",fact:"Götze scored the winner against Argentina."},
 {q:"Which club are known as Los Colchoneros?",a:["Real Madrid","Sevilla","Atlético Madrid","Valencia"],correct:"Atlético Madrid",fact:"Los Colchoneros is Atlético Madrid's nickname."},
 {q:"Which club went unbeaten through the 2003/04 Premier League season?",a:["Chelsea","Arsenal","Manchester United","Liverpool"],correct:"Arsenal",fact:"Arsenal's Invincibles completed the season unbeaten."},
 {q:"Which country won Euro 2004?",a:["Portugal","Greece","Italy","Czech Republic"],correct:"Greece",fact:"Greece beat hosts Portugal in the final."},
 {q:"Which club did Andrea Pirlo join after leaving AC Milan in 2011?",a:["Inter","Juventus","Roma","Napoli"],correct:"Juventus",fact:"Pirlo joined Juventus on a free transfer."},
 {q:"Who won the 1998 Ballon d'Or?",a:["Zinedine Zidane","Ronaldo Nazário","David Beckham","Dennis Bergkamp"],correct:"Zinedine Zidane",fact:"Zidane won after France's World Cup victory."}
];
function ClimbPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();const [step,setStep]=useState(0);const [lives,setLives]=useState(3);const [score,setScore]=useState(0);const [answer,setAnswer]=useState("");const [ended,setEnded]=useState(false);
 const done=account.daily[utcDay()]?.["the-climb"]!==undefined;
 const questions=useMemo(()=>shuffle(CLIMB_Q,mode==="daily"?hashSeed("CLIMB"+utcDay()):Math.floor(Math.random()*1e9)).slice(0,5),[mode]);
 const q=questions[step];
 const choose=(a:string)=>{if(answer||ended)return;setAnswer(a);if(a===q.correct)setScore(s=>s+100+lives*25);else setLives(v=>v-1);};
 const next=()=>{if(lives<=0||step===4){setEnded(true);if(mode==="daily")onDaily("the-climb",score);return;}setStep(v=>v+1);setAnswer("");};
 const restart=()=>{setStep(0);setLives(3);setScore(0);setAnswer("");setEnded(false);};
 return <Frame account={account} game="the-climb" eyebrow="SURVIVAL QUIZ / FIVE QUESTIONS" title="KEEP CLIMBING." description="Five questions. Three lives. Every correct answer takes you higher." number="02" mode={mode} setMode={m=>{setMode(m);restart();}}>
 {done&&mode==="daily"?<Success title="RUN COMPLETE." detail="Your daily climb is banked. Unlimited practice is always open." button="PRACTICE RUN" onAgain={()=>setMode("practice")}/>:<Card className="climb-play"><div className="arc-game-meta"><span>QUESTION {step+1} / 5</span><b>{lives} LIVES · {score} PTS</b></div><div className="climb-life-track">{[0,1,2].map(i=><i key={i} className={i<lives?"alive":""}/>)}</div><h2>{ended?"RUN COMPLETE.":q.q}</h2>{ended?<div className="arc-feedback"><p>You climbed {step+1} questions and banked {score} points.</p><button className="arc-button" onClick={restart}>RUN IT BACK ↻</button></div>:<><div className="climb-options">{q.a.map(a=><button key={a} onClick={()=>choose(a)} disabled={!!answer} className={answer===a?(a===q.correct?"correct":"wrong"):""}>{a}<i>↗</i></button>)}</div>{answer&&<div className="arc-feedback"><b>{answer===q.correct?"RIGHT ANSWER.":"NOT THIS TIME."}</b><p>{q.fact}</p><button className="arc-button" onClick={next}>{step===4||lives<=0?"SEE RESULT":"NEXT QUESTION"} ↗</button></div>}</>}</Card>}
 </Frame>;
}

const DRAFT_POOL=[
 {name:"Alisson",pos:"GK",cost:8},{name:"Trent Alexander-Arnold",pos:"DEF",cost:9},{name:"Virgil van Dijk",pos:"DEF",cost:10},{name:"Rúben Dias",pos:"DEF",cost:9},{name:"Andrew Robertson",pos:"DEF",cost:8},{name:"Rodri",pos:"MID",cost:10},{name:"Kevin De Bruyne",pos:"MID",cost:10},{name:"Jude Bellingham",pos:"MID",cost:10},{name:"Bukayo Saka",pos:"FWD",cost:9},{name:"Erling Haaland",pos:"FWD",cost:11},{name:"Mohamed Salah",pos:"FWD",cost:11},{name:"Declan Rice",pos:"MID",cost:8},{name:"William Saliba",pos:"DEF",cost:8},{name:"Son Heung-min",pos:"FWD",cost:9},{name:"Bruno Fernandes",pos:"MID",cost:9},{name:"Ederson",pos:"GK",cost:7}
];
function DraftPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();const [picked,setPicked]=useState<string[]>([]);const [locked,setLocked]=useState(false);const done=account.daily[utcDay()]?.["draft-xi"]!==undefined;
 const budget=85,spent=DRAFT_POOL.filter(p=>picked.includes(p.name)).reduce((n,p)=>n+p.cost,0);
 const counts={GK:picked.filter(n=>DRAFT_POOL.find(p=>p.name===n)?.pos==="GK").length,DEF:picked.filter(n=>DRAFT_POOL.find(p=>p.name===n)?.pos==="DEF").length,MID:picked.filter(n=>DRAFT_POOL.find(p=>p.name===n)?.pos==="MID").length,FWD:picked.filter(n=>DRAFT_POOL.find(p=>p.name===n)?.pos==="FWD").length};
 const valid=counts.GK===1&&counts.DEF>=3&&counts.MID>=2&&counts.FWD>=1&&picked.length===11;
 const reset=()=>{setPicked([]);setLocked(false);};
 const toggle=(name:string)=>{if(locked)return;setPicked(old=>old.includes(name)?old.filter(x=>x!==name):old.length<11?[...old,name]:old);};
 return <Frame account={account} game="draft-xi" eyebrow="SQUAD BUILDER / BUDGET GAME" title="PICK YOUR XI." description="Build a balanced team inside the game budget. These are fictional game prices, not transfer valuations." number="03" mode={mode} setMode={m=>{setMode(m);reset();}}>
 {done&&mode==="daily"?<Success title="SQUAD SUBMITTED." detail="Your daily Draft XI is complete. Build another side in practice mode." button="BUILD AGAIN" onAgain={()=>setMode("practice")}/>:<Card className="draft-game"><div className="arc-game-meta"><span>{picked.length} / 11 SELECTED</span><b>{counts.GK} GK · {counts.DEF} DEF · {counts.MID} MID · {counts.FWD} FWD</b></div><div className="draft-budget"><div><small>BUDGET USED</small><strong>{spent}<i> / {budget} units</i></strong></div><span>{budget-spent} LEFT</span><div className="draft-budget-line"><i style={{width:Math.min(100,spent/budget*100)+"%"}}/></div></div><div className="draft-game-layout"><div className="draft-game-pitch"><span>4 — 3 — 3</span><div className="draft-midline"/><div className="draft-circle"/>{picked.map((name,i)=><div className={"draft-player dp"+i} key={name}><b>{DRAFT_POOL.find(p=>p.name===name)?.pos}</b><small>{name.split(" ").slice(-1)[0]}</small></div>)}</div><div className="draft-pick-list">{DRAFT_POOL.map(p=><button key={p.name} onClick={()=>toggle(p.name)} className={picked.includes(p.name)?"chosen":""} disabled={!picked.includes(p.name)&&(picked.length>=11||spent+p.cost>budget||locked)}><span><b>{p.name}</b><small>{p.pos}</small></span><strong>{p.cost}</strong><i>{picked.includes(p.name)?"−":"+"}</i></button>)}</div></div><div className="arc-game-foot"><span>{locked?"YOUR XI IS LOCKED":valid?"SQUAD RULES MET":"1 GK · 3 DEF · 2 MID · 1 FWD MINIMUM"}</span><button className="arc-button" disabled={!valid||locked} onClick={()=>{setLocked(true);if(mode==="daily")onDaily("draft-xi",Math.max(0,1000-(spent*5)));}}>LOCK IN XI ↗</button><button className="arc-quiet" onClick={reset}>RESET</button></div></Card>}
 </Frame>;
}


const WORDS=[...new Set([...playerSurnames(),"MALEN","BARRY","DIAZ"])];
function wordleEval(guess:string,target:string){const result=Array(5).fill("absent");const letters=target.split("");for(let i=0;i<5;i++){if(guess[i]===target[i]){result[i]="correct";letters[i]="";}}for(let i=0;i<5;i++){if(result[i]==="correct")continue;const at=letters.indexOf(guess[i]);if(at>=0){result[i]="present";letters[at]="";}}return result;}
function FootlePage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();const [target,setTarget]=useState(()=>dailyFootle("daily"));const [typed,setTyped]=useState("");const [guesses,setGuesses]=useState<string[]>([]);const [end,setEnd]=useState(false);const done=account.daily[utcDay()]?.footle!==undefined;
 useEffect(()=>{setTarget(dailyFootle(mode));setTyped("");setGuesses([]);setEnd(false);},[mode]);
 const win=guesses.at(-1)===target;
 const submitWord=()=>{const word=typed.toUpperCase();if(word.length!==5||!WORDS.includes(word)||end)return;const next=[...guesses,word];setGuesses(next);setTyped("");if(word===target||next.length===6){setEnd(true);if(mode==="daily")onDaily("footle",word===target?Math.max(100,700-next.length*75):0);}};
 const submit=(e:FormEvent)=>{e.preventDefault();submitWord();};
 const keyStatus=(letter:string)=>{
   let status="";
   for(const guess of guesses){const index=guess.indexOf(letter);if(index<0)continue;
     const colors=wordleEval(guess,target);
     if([...guess].some((value,i)=>value===letter&&colors[i]==="correct"))return "correct";
     if([...guess].some((value,i)=>value===letter&&colors[i]==="present"))status="present";
     else if(!status)status="absent";
   }
   return status;
 };
 const keyRows=["QWERTYUIOP","ASDFGHJKL","ZXCVBNM"];
 const resetPractice=()=>{setTarget(dailyFootle("practice"));setTyped("");setGuesses([]);setEnd(false);};
 return <Frame account={account} game="footle" eyebrow="THE FIVE-LETTER FOOTBALL WORD" title="FOOTLE." description="Find the five-letter football surname in six guesses. Daily for everyone. Unlimited practice whenever." number="05" mode={mode} setMode={setMode}>
 {done&&mode==="daily"?<Success title="TODAY'S FOOTLE IS DONE." detail="One shared daily word. Infinite practice is still open." button="UNLIMITED PRACTICE" onAgain={()=>setMode("practice")}/>:<Card className="footle-game"><div className="footle-board">{Array.from({length:6},(_,r)=><div className="footle-row" key={r}>{Array.from({length:5},(_,c)=>{const word=guesses[r];const color=word?wordleEval(word,target)[c]:"";return <div key={c} className={"footle-cell "+color}>{word?.[c]??(r===guesses.length?typed[c]??"":"")}</div>;})}</div>)}</div>{end&&<div className="arc-feedback"><b>{win?"YOU GOT IT.":"THE WORD WAS "+target}</b><p>{win?"A proper bit of football knowledge.":"Have another go in unlimited practice."}</p>{mode==="practice"&&<button className="arc-button" onClick={resetPractice}>NEXT WORD ↗</button>}</div>}<form className="footle-entry" onSubmit={submit}><input value={typed} onChange={e=>setTyped(e.target.value.replace(/[^a-z]/gi,"").slice(0,5))} placeholder="TYPE A 5-LETTER NAME" maxLength={5} disabled={end}/><button className="arc-button" disabled={typed.length!==5||end}>ENTER ↵</button></form><div className="footle-keyboard" aria-label="On-screen keyboard">{keyRows.map((row,i)=><div className="footle-key-row" key={row}>{row.split("").map(letter=><button type="button" key={letter} className={keyStatus(letter)} aria-label={letter+" key"} onClick={()=>!end&&setTyped(v=>(v+letter).slice(0,5))}>{letter}</button>)}{i===2&&<><button type="button" className="wide-key" onClick={submitWord} disabled={end||typed.length!==5}>ENTER</button><button type="button" className="wide-key" aria-label="Delete last letter" onClick={()=>setTyped(v=>v.slice(0,-1))} disabled={end}>⌫</button></>}</div>)}</div><div className="footle-note">GREEN = RIGHT LETTER / RIGHT PLACE · AMBER = RIGHT LETTER / WRONG PLACE · GREY = NOT IN THE WORD</div></Card>}
 </Frame>;
}

type ConnectionsDifficulty="EASY"|"STANDARD"|"HARD"|"EXTREME";
type DynamicGroup={name:string;color:string;members:GamePlayer[]};
function buildConnectionsGroups(players:GamePlayer[],difficulty:ConnectionsDifficulty,seed:number):DynamicGroup[]{
 const byCountry=new Map<string,GamePlayer[]>();
 for(const p of players){
   if(!p.nationality||p.nationality==="Unlisted")continue;
   const list=byCountry.get(p.nationality)??[];
   if(!list.some(x=>x.archiveId===p.archiveId))list.push(p);
   byCountry.set(p.nationality,list);
 }
 const limits:{min:number;max:number}={
   EASY:{min:55,max:Number.POSITIVE_INFINITY},
   STANDARD:{min:22,max:65},
   HARD:{min:8,max:30},
   EXTREME:{min:4,max:14}
 }[difficulty];
 let nations=Array.from(byCountry.entries()).filter(([,items])=>items.length>=limits.min&&items.length<=limits.max);
 if(nations.length<4)nations=Array.from(byCountry.entries()).filter(([,items])=>items.length>=4);
 if(nations.length<4)return [];
 const chosen=shuffle(nations,seed).slice(0,4);
 const colors=["gold","blue","pink","green"];
 const groups=chosen.map(([country,members],i)=>({
   name:"NATIONALITY · "+country.toUpperCase(),
   color:colors[i],
   members:shuffle(members,seed+i*97).slice(0,4)
 }));
 const unique=groups.flatMap(g=>g.members).map(p=>p.archiveId);
 if(unique.length!==16||new Set(unique).size!==16)return [];
 return groups;
}
function ConnectionsPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();const [difficulty,setDifficulty]=useState<ConnectionsDifficulty>("STANDARD");
 const [selected,setSelected]=useState<string[]>([]);const [found,setFound]=useState<number[]>([]);
 const [mistakes,setMistakes]=useState(0);const [finished,setFinished]=useState(false);
 const [practiceSeed,setPracticeSeed]=useState(()=>String(Math.floor(Math.random()*1e12)));
 const [notice,setNotice]=useState("");const done=account.daily[utcDay()]?.connections!==undefined;
 const seed=mode==="daily"?"CONNECTIONS:"+utcDay():"CONNECTIONS:PRACTICE:"+practiceSeed;
 const {players:archivePlayers,loading,error,retry}=useArchivePlayers(true,seed,1600);
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
     const nextMistakes=mistakes+1;setMistakes(nextMistakes);setSelected([]);setNotice("Not quite — those four names do not share one nationality group.");
     if(nextMistakes>=4){setFinished(true);if(mode==="daily")onDaily("connections",0);}
   }
 };
 const reset=(newMode:Mode=mode,newDifficulty:ConnectionsDifficulty=difficulty)=>{
   setDifficulty(newDifficulty);setSelected([]);setFound([]);setMistakes(0);setFinished(false);setNotice("");
   if(newMode==="practice")setPracticeSeed(String(Math.floor(Math.random()*1e12)));
 };
 return <Frame account={account} game="connections" eyebrow="SORT THE TOUCHLINE / 16 TILES" title="FIND THE CONNECTION." description="Sixteen footballers. Four hidden nationality groups. Find all four sets, with unlimited new archive draws in practice." number="06" mode={mode} setMode={m=>{setMode(m);reset(m);}}>
 {done&&mode==="daily"?<Success title="GROUPS FOUND." detail="Today's Connections board is complete. Go again in unlimited practice." button="PRACTICE" onAgain={()=>{setMode("practice");reset("practice");}}/>:
  <Card className="connections-game">
   <div className="arc-game-meta"><span>GROUPS FOUND {found.length}/4</span><b>MISTAKES {mistakes}/4</b></div>
   <div className="grid-difficulty">{(["EASY","STANDARD","HARD","EXTREME"] as ConnectionsDifficulty[]).map(level=><button key={level} className={difficulty===level?"active":""} onClick={()=>reset(mode,level)}>{level}</button>)}</div>
   {loading&&groups.length===0?<div className="grid-loading"><motion.div animate={{rotate:360}} transition={{duration:1.5,repeat:Infinity,ease:"linear"}}>⚽</motion.div><b>BUILDING CONNECTIONS</b><span>Finding four distinct nationality groups in the archive.</span></div>:
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

type GridDifficulty="EASY"|"STANDARD"|"HARD"|"EXTREME";
type GridPuzzle={clubs:string[];countries:string[];answers:GamePlayer[][][];quality:number};
const GRID_LEVELS:GridDifficulty[]=["EASY","STANDARD","HARD","EXTREME"];
function buildGridPuzzle(players:GamePlayer[],difficulty:GridDifficulty,seed:number):GridPuzzle|null{
 const clubCounts=new Map<string,number>(),countryCounts=new Map<string,number>();
 for(const p of players){
   for(const club of new Set(p.clubs.filter(Boolean)))clubCounts.set(club,(clubCounts.get(club)??0)+1);
   if(p.nationality&&p.nationality!=="Unlisted")countryCounts.set(p.nationality,(countryCounts.get(p.nationality)??0)+1);
 }
 const minClub=[12,7,4,2][GRID_LEVELS.indexOf(difficulty)];
 const minCountry=[14,8,4,2][GRID_LEVELS.indexOf(difficulty)];
 const clubs=Array.from(clubCounts.entries()).filter(([,n])=>n>=minClub).map(([name])=>name);
 const countries=Array.from(countryCounts.entries()).filter(([,n])=>n>=minCountry).map(([name])=>name);
 if(clubs.length<4||countries.length<4)return null;
 let best:GridPuzzle|null=null;
 for(let attempt=0;attempt<3500;attempt++){
   const chosenClubs=shuffle(clubs,seed+attempt*17).slice(0,4);
   const chosenCountries=shuffle(countries,seed+attempt*31+11).slice(0,4);
   const answers=chosenClubs.map(club=>chosenCountries.map(country=>
     players.filter(p=>p.nationality===country&&p.clubs.some(c=>normalise(c)===normalise(club)))
   ));
   if(answers.some(row=>row.some(cell=>cell.length===0)))continue;
   const minimum=Math.min(...answers.flat().map(cell=>cell.length));
   const maximum=Math.max(...answers.flat().map(cell=>cell.length));
   const rarity=(chosenClubs.reduce((n,c)=>n+(clubCounts.get(c)??0),0)+chosenCountries.reduce((n,c)=>n+(countryCounts.get(c)??0),0));
   const quality=difficulty==="EASY"?minimum*100-maximum+rarity/1000:
     difficulty==="STANDARD"?minimum*50-maximum+rarity/1000:
     difficulty==="HARD"?-maximum+minimum*10-rarity/1000:
     -minimum*5-maximum-rarity/1000;
   if(!best||quality>best.quality)best={clubs:chosenClubs,countries:chosenCountries,answers,quality};
   if(difficulty==="EASY"&&minimum>=5)break;
   if(difficulty==="STANDARD"&&minimum>=3)break;
   if(difficulty==="HARD"&&minimum===1&&maximum<=5)break;
   if(difficulty==="EXTREME"&&minimum===1&&maximum<=3)break;
 }
 return best;
}
function GridPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();
 const [difficulty,setDifficulty]=useState<GridDifficulty>("STANDARD");
 const [values,setValues]=useState<string[]>(Array(16).fill(""));
 const [opened,setOpened]=useState<number[]>([]);
 const [active,setActive]=useState<number|null>(null);
 const [guess,setGuess]=useState("");
 const [practiceSeed,setPracticeSeed]=useState(()=>String(Math.floor(Math.random()*1e12)));
 const [gridNotice,setGridNotice]=useState("");
 const done=account.daily[utcDay()]?.["football-grid"]!==undefined;
 const seed=mode==="daily"?hashSeed("GRID:"+utcDay()+":"+difficulty):hashSeed("GRID:practice:"+practiceSeed+":"+difficulty);
 const {players:archivePlayers,loading,error,retry}=useArchivePlayers(true,mode==="daily"?"GRID:"+utcDay():"GRID:PRACTICE:"+practiceSeed,1600);
 const playerPool=useMemo(()=>archivePlayers.map(archivePlayerToGamePlayer),[archivePlayers]);
 const puzzle=useMemo(()=>playerPool.length>=40?buildGridPuzzle(playerPool,difficulty,seed):null,[playerPool,difficulty,seed]);
 const check=()=>{
   if(active===null||!guess.trim()||!puzzle)return;
   const row=Math.floor(active/4),col=active%4;
   const accepted=puzzle.answers[row][col];
   const player=archiveGuess(guess,accepted);
   if(player){
     const label=player.name;
     const next=opened.includes(active)?opened:[...opened,active];
     setValues(v=>v.map((x,i)=>i===active?label:x));setOpened(next);setActive(null);setGuess("");setGridNotice("");
     if(next.length===16&&mode==="daily")onDaily("football-grid",Math.max(100,1000-next.length*15));
   }else setGridNotice("That player doesn't fit this club × nationality square. Try another name.");
 };
 const reset=(newMode:Mode=mode,newDifficulty:GridDifficulty=difficulty)=>{
   setValues(Array(16).fill(""));setOpened([]);setActive(null);setGuess("");setGridNotice("");
   if(newMode==="practice")setPracticeSeed(String(Math.floor(Math.random()*1e12)));
   setDifficulty(newDifficulty);
 };
 return <Frame account={account} game="football-grid" eyebrow="CLUB × NATIONALITY / 4 BY 4" title="FILL THE GRID." description="Sixteen squares. Name a footballer who played for the club and represented the nationality at the top." number="07" mode={mode} setMode={m=>{setMode(m);reset(m);}}>
 {done&&mode==="daily"?<Success title="GRID COMPLETE." detail="All sixteen cells are filled. Try a fresh grid in unlimited practice." button="PRACTICE GRID" onAgain={()=>{setMode("practice");reset("practice");}}/>:
  <Card className="grid-game">
   <div className="arc-game-meta"><span>16 ANSWERS / 16 CELLS</span><b>{opened.length}/16 FILLED</b></div>
   <div className="grid-difficulty">{GRID_LEVELS.map(level=><button key={level} className={difficulty===level?"active":""} onClick={()=>reset(mode,level)}>{level}</button>)}</div>
   {loading&&playerPool.length===0?<div className="grid-loading"><motion.div animate={{rotate:360}} transition={{duration:1.5,repeat:Infinity,ease:"linear"}}>⚽</motion.div><b>BUILDING YOUR GRID</b><span>Finding valid clubs and nationalities from the player archive.</span></div>:
    puzzle?<><div className="football-grid-wrap grid-four"><div className="grid-corner">CLUB ↓<br/>NATION →</div>{puzzle.countries.map(c=><div className="grid-col-head" key={c}><CountryFlag name={c}/><span>{c}</span></div>)}{puzzle.clubs.map((club,ri)=><><div className="grid-row-head" key={"r"+ri}><ClubBadge name={club} size={28}/><span>{club}</span></div>{puzzle.countries.map((country,ci)=>{const id=ri*4+ci;const doneCell=opened.includes(id);return <button key={id} className={"grid-cell "+(doneCell?"filled":"")+(active===id?" active":"")} onClick={()=>{setActive(id);setGuess("");setGridNotice("");}}><small>{club} × {country}</small><b>{values[id]||"?"}</b></button>;})}</>)}</div>
     <div className="grid-game-bottom"><span>{difficulty} · {puzzle.answers.flat().reduce((n,c)=>n+c.length,0)} ACCEPTED PLAYER/CELL MATCHES</span><button className="arc-quiet" onClick={()=>reset(mode,difficulty)}>NEW GRID ↻</button></div>
     {active!==null&&<div className="grid-answer"><small>{puzzle.clubs[Math.floor(active/4)]} × {puzzle.countries[active%4]}</small><input value={guess} onChange={e=>setGuess(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")check();}} placeholder="Full name or surname…"/><button className="arc-button" onClick={check}>CHECK ↗</button></div>}
     {gridNotice&&<div className="arc-feedback"><b>NOT A MATCH.</b><p>{gridNotice}</p></div>}
     <p className="arc-muted">Any player in the archive who satisfies both clues is accepted. Club history and nationality are based on recorded career data; the archive does not cover every player or season equally.</p>
    </>:
    <div className="arc-feedback"><b>{error?"PLAYER ARCHIVE UNAVAILABLE":"NO VALID 4×4 GRID IN THIS DRAW"}</b><p>{error||"This difficulty/selection did not produce sixteen non-empty intersections. Try another level or draw again."}</p><button className="arc-button" onClick={()=>{retry();reset(mode,difficulty);}}>RETRY / NEW DRAW ↗</button></div>}
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
 const {players:archivePlayers,loading,error,retry}=useArchivePlayers(true,seed,1600);
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
   <div className="grid-difficulty">{(["EASY","STANDARD","HARD","EXTREME"] as LadderDifficulty[]).map(level=><button key={level} className={difficulty===level?"active":""} onClick={()=>reset(mode,level,metric)}>{level}</button>)}</div>
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
 const [mode,setMode]=useMode();const [record,setRecord]=useState<Player>(PLAYER_DATABASE[hashSeed("REVEAL"+utcDay())%PLAYER_DATABASE.length]);const [reveal,setReveal]=useState(0);const [guess,setGuess]=useState("");const [tries,setTries]=useState(0);const [end,setEnd]=useState(false);const [won,setWon]=useState(false);const done=account.daily[utcDay()]?.["the-reveal"]!==undefined;
 const clues=[record.nationality+" international",record.position+" by trade",record.clubs.slice(0,2).join(" → "),record.league==="Retired"?"A former professional":"Last listed at "+record.club];
 const restart=(selectedMode:Mode=mode)=>{setRecord(selectedMode==="daily"?PLAYER_DATABASE[hashSeed("REVEAL"+utcDay())%PLAYER_DATABASE.length]:PLAYER_DATABASE[Math.floor(Math.random()*PLAYER_DATABASE.length)]);setReveal(0);setGuess("");setTries(0);setEnd(false);setWon(false);};
 const submit=(e:FormEvent)=>{e.preventDefault();if(end||!guess.trim())return;const next=tries+1;setTries(next);if(acceptedName(guess,[record.name,...record.aliases])){setWon(true);setEnd(true);if(mode==="daily")onDaily("the-reveal",Math.max(100,900-reveal*100-next*40));}else if(next>=8){setEnd(true);if(mode==="daily")onDaily("the-reveal",0);}setGuess("");};
 return <Frame account={account} game="the-reveal" eyebrow="BLUR / CLUE / IDENTIFY" title="THE REVEAL." description="A mystery player. Four career clues. Identify them before your available points run down." number="09" mode={mode} setMode={m=>{setMode(m);restart(m);}}>
 {done&&mode==="daily"?<Success title="MYSTERY SOLVED." detail="Today's Reveal is complete. Practice has a fresh player." button="PRACTICE" onAgain={()=>setMode("practice")}/>:<Card className="reveal-game"><div className="arc-game-meta"><span>CLUE {reveal+1} / 4</span><b>{Math.max(0,900-reveal*100-tries*40)} PTS AVAILABLE</b></div><div className="reveal-portrait"><div className={"reveal-silhouette r"+reveal}><span>{end?record.name.split(" ").map(x=>x[0]).join("").slice(0,2):"?"}</span></div><small>PLAYER IMAGE / PORTRAIT NOT CONNECTED</small></div><div className="reveal-clues">{clues.slice(0,reveal+1).map((c,i)=><p key={i}><span>0{i+1}</span>{c}</p>)}</div><button className="arc-quiet" onClick={()=>setReveal(v=>Math.min(3,v+1))} disabled={reveal>=3||end}>REVEAL NEXT CLUE −100 PTS</button><form className="arc-guess-form" onSubmit={submit}><input value={guess} onChange={e=>setGuess(e.target.value)} placeholder="Who is the player?" disabled={end}/><button className="arc-button">GUESS ↗</button></form>{end&&<div className="arc-feedback"><b>{won?"GOT THEM.":"THE PLAYER WAS "+record.name}</b><button className="arc-button" onClick={()=>restart()}>NEXT PLAYER ↗</button></div>}</Card>}
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
 const {players:archivePlayers,loading,error,retry}=useArchivePlayers(true,seed,1600);
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
   <div className="grid-difficulty">{(["EASY","STANDARD","HARD","EXTREME"] as CheckoutDifficulty[]).map(level=><button key={level} className={difficulty===level?"active":""} onClick={()=>reset(mode,level,metric)}>{level}</button>)}</div>
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
 const {players:archivePlayers,loading,error,retry}=useArchivePlayers(true,seed,1600);
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

type MissingSpot={name:string;number:string;role:"GK"|"DEF"|"MID"|"FWD"};
const MISSING_FORMATION:{group:"keeper"|"defence"|"midfield"|"forwards";players:MissingSpot[]}[]=[
 {group:"keeper",players:[{name:"Edwin van der Sar",number:"01",role:"GK"}]},
 {group:"defence",players:[
  {name:"Patrice Evra",number:"03",role:"DEF"},{name:"Nemanja Vidić",number:"15",role:"DEF"},
  {name:"Rio Ferdinand",number:"05",role:"DEF"},{name:"Wes Brown",number:"06",role:"DEF"}]},
 {group:"midfield",players:[
  {name:"Owen Hargreaves",number:"04",role:"MID"},{name:"Michael Carrick",number:"16",role:"MID"},
  {name:"Paul Scholes",number:"18",role:"MID"},{name:"Cristiano Ronaldo",number:"07",role:"MID"}]},
 {group:"forwards",players:[
  {name:"Wayne Rooney",number:"10",role:"FWD"},{name:"WHO'S MISSING?",number:"32",role:"FWD"}]}
];
const MISSING_OPTIONS=["Carlos Tévez","Ryan Giggs","Nani","Anderson"];
function MissingXIPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();const [chosen,setChosen]=useState("");const [attempts,setAttempts]=useState(0);const [end,setEnd]=useState(false);const [won,setWon]=useState(false);
 const correct="Carlos Tévez";const done=account.daily[utcDay()]?.["missing-xi"]!==undefined;
 const answer=(value:string)=>{
   if(end)return;const next=attempts+1;setAttempts(next);setChosen(value);
   if(normalise(value)===normalise(correct)){setWon(true);setEnd(true);if(mode==="daily")onDaily("missing-xi",Math.max(200,1000-(next-1)*250));}
   else if(next>=3){setEnd(true);if(mode==="daily")onDaily("missing-xi",0);}
 };
 const restart=()=>{setChosen("");setAttempts(0);setEnd(false);setWon(false);};
 return <Frame account={account} game="missing-xi" eyebrow="HISTORIC LINE-UP / FIND THE NUMBER 32" title="MISSING XI." description="One player has been removed from Manchester United's official 2008 Champions League final starting formation. Fill the shirt." number="12" mode={mode} setMode={m=>{setMode(m);restart();}}>
 {done&&mode==="daily"?<Success title="LINE-UP COMPLETE." detail="Today's historical starting XI is complete. Practice is unlimited." button="PRACTICE XI" onAgain={()=>{setMode("practice");restart();}}/>:
  <Card className="missing-game">
   <div className="arc-game-meta"><span>21 MAY 2008 · MOSCOW</span><b>{3-attempts} ATTEMPTS LEFT</b></div>
   <div className="missing-matchline"><div><small>FINAL</small><strong>MANCHESTER UNITED 1–1 CHELSEA</strong></div><div><small>AFTER EXTRA TIME</small><strong>UNITED WON 6–5 ON PENALTIES</strong></div></div>
   <div className="missing-formation-pitch">
    <div className="missing-pitch-markings"><i/><i/><i/><i/></div>
    {MISSING_FORMATION.map(row=><div className={"formation-row "+row.group} key={row.group}>
      {row.players.map(player=>{
        const missing=player.name==="WHO'S MISSING?";
        return <motion.div className={"formation-player "+(missing?"missing-player-slot":"")} key={player.number} layout>
          <div className="formation-shirt"><b>{player.number}</b></div>
          <div className="formation-club"><ClubBadge name="Manchester United" size={19}/><small>{missing?end?correct:"MISSING PLAYER":player.name}</small></div>
          <span>{player.role}</span>
        </motion.div>;
      })}
    </div>)}
    <div className="formation-caption"><span>4—4—2 SHAPE / OFFICIAL STARTING XI ORDER</span><span>NO. 32 IS HIDDEN</span></div>
   </div>
   {!end?<><div className="missing-options">{MISSING_OPTIONS.map(name=><button key={name} onClick={()=>answer(name)}>{name}<i>↗</i></button>)}</div><p className="arc-muted">The question uses the UEFA line-up published for the final on 21 May 2008. The displayed formation is a simplified 4—4—2 layout.</p></>:
    <div className="arc-feedback"><b>{won?"YOU FOUND THE MISSING PLAYER.":"THE MISSING PLAYER WAS CARLOS TÉVEZ."}</b><p>{won?"A proper piece of Champions League history.":"Tévez started alongside Wayne Rooney in the 2008 final."}</p><button className="arc-button" onClick={restart}>PLAY THE XI AGAIN ↗</button></div>}
  </Card>}
 </Frame>;
}

function makeStrandsBoard(pack:typeof STRANDS_PACKS[number]){
 const cells=Array(48).fill("");const paths:number[][]=[];
 // The 13-letter spanagram runs up the left touchline and across the bottom.
 // One 14-letter full name adds the bottom-right return cell.
 const baseSpine=[0,8,16,24,32,40,41,42,43,44,45,46,47];
 const spine=pack.spangram.length===14?[...baseSpine,39]:baseSpine;
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
 const [mode,setMode]=useMode();const [boardNo,setBoardNo]=useState(0);const [selected,setSelected]=useState<number[]>([]);const pathRef=useRef<number[]>([]);const [dragging,setDragging]=useState(false);const [found,setFound]=useState<number[]>([]);const [wrong,setWrong]=useState(0);const [nudges,setNudges]=useState(0);const [finished,setFinished]=useState(false);const [notice,setNotice]=useState("");const done=account.daily[utcDay()]?.strands!==undefined;
 const order=useMemo(()=>shuffle(STRANDS_PACKS,hashSeed("STRANDS"+utcDay())),[]);
 const pack=mode==="daily"?order[boardNo%order.length]:STRANDS_PACKS[(boardNo+hashSeed("PRACTICESTRANDS"+boardNo))%STRANDS_PACKS.length];
 const board=useMemo(()=>makeStrandsBoard(pack),[pack]);
 const solved=(index:number)=>found.includes(index);
 const isBlocked=(cell:number)=>board.paths.some((path,idx)=>solved(idx)&&path.includes(cell));
 const beginPath=(cell:number,event:React.PointerEvent<HTMLButtonElement>)=>{
   if(finished||isBlocked(cell))return;
   event.preventDefault();
   pathRef.current=[cell];setSelected([cell]);setDragging(true);setNotice("");
 };
 const extendPath=(cell:number)=>{
   if(!dragging||finished||isBlocked(cell))return;
   const path=pathRef.current;
   const existing=path.indexOf(cell);
   if(existing>=0){const clipped=path.slice(0,existing+1);pathRef.current=clipped;setSelected(clipped);return;}
   const last=path[path.length-1];if(last===undefined)return;
   const r=Math.floor(last/8),c=last%8,rr=Math.floor(cell/8),cc=cell%8;
   if(Math.max(Math.abs(r-rr),Math.abs(c-cc))!==1)return;
   const next=[...path,cell];pathRef.current=next;setSelected(next);
 };
 const finishPath=()=>{
   if(!dragging)return;
   setDragging(false);
   const path=[...pathRef.current];pathRef.current=[];setSelected(path);
   const word=path.map(cell=>board.cells[cell]).join("");
   const foundIndex=board.words.findIndex((w,idx)=>!solved(idx)&&(w===word||w.split("").reverse().join("")===word));
   if(foundIndex>=0){
     const next=[...found,foundIndex];setFound(next);setSelected([]);setNotice("");
     if(next.length===9){setFinished(true);if(mode==="daily"&&boardNo===9)onDaily("strands",1000-nudges*80-wrong*15);}
   }else{
     setWrong(v=>v+1);setNotice(path.length>1?"No footballer on that path. Try another route.":"Drag through adjacent letters to make a name.");setSelected([]);
   }
 };
 const cancelPath=()=>{pathRef.current=[];setSelected([]);setDragging(false);};
 const nextBoard=()=>{setBoardNo(v=>v+1);pathRef.current=[];setSelected([]);setFound([]);setWrong(0);setNudges(0);setNotice("");setFinished(false);};
 const hint=()=>{if(nudges>=3)return;setNudges(v=>v+1);};
 const currentDone=found.length===9;
 return <Frame account={account} game="strands" eyebrow="6 × 8 LETTER PUZZLE / 10 BOARDS" title="FOOTBALL STRANDS." description="Drag through touching letters to trace footballer surnames. Find the full-name spangram connecting the grid's edges." number="13" mode={mode} setMode={m=>{setMode(m);setBoardNo(0);pathRef.current=[];setSelected([]);setFound([]);setWrong(0);setNudges(0);setNotice("");setDragging(false);setFinished(false);}}>
 {done&&mode==="daily"?<Success title="TEN BOARDS CLEARED." detail="Your ten-puzzle Strands run is complete. Unlimited practice is open." button="PRACTICE STRANDS" onAgain={()=>{setMode("practice");nextBoard();}}/>:
  <Card className="strands-game">
   <div className="arc-game-meta"><span>PUZZLE {boardNo+1} / 10</span><b>{found.length}/9 NAMES FOUND</b></div>
   <div className="strands-theme"><small>THE THEME</small><strong>{pack.theme}</strong><span>Drag from letter to letter. Diagonal moves are allowed; the path must stay connected.</span></div>
   <div className={"strands-grid "+(dragging?"is-dragging":"")} onPointerUp={finishPath} onPointerCancel={cancelPath} onContextMenu={e=>e.preventDefault()}>
    <svg className="strands-trail" viewBox="0 0 800 600" preserveAspectRatio="none" aria-hidden="true">
     {selected.length>1&&<polyline points={selected.map(cell=>{const row=Math.floor(cell/8),col=cell%8;return ((col+.5)/8*800)+","+((row+.5)/6*600);}).join(" ")} fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round"/>}
    </svg>
    {board.cells.map((letter,i)=>{
      const foundWord=found.findIndex(idx=>board.paths[idx].includes(i));
      const pathIndex=selected.indexOf(i);
      return <motion.button type="button" key={i} layout onPointerDown={e=>beginPath(i,e)} onPointerEnter={()=>extendPath(i)}
        className={(pathIndex>=0?"selected ":"")+(foundWord>=0?(foundWord===0?"spangram":"found"):"")}
        animate={{scale:pathIndex>=0?1.08:1,rotate:foundWord>=0?0:0}}
        transition={{type:"spring",stiffness:430,damping:26}}
        aria-label={"Row "+(Math.floor(i/8)+1)+", column "+(i%8+1)+", letter "+letter}>{letter}</motion.button>;
    })}
   </div>
   <div className="strands-actions"><button className="arc-quiet" onClick={cancelPath}>CLEAR PATH</button><button className="arc-button" onClick={hint} disabled={nudges>=3}>HINT {nudges}/3</button></div>
   {dragging&&<p className="strands-drag-live">KEEP DRAGGING · RELEASE TO CHECK</p>}
   {notice&&<div className="strands-feedback"><span>{notice}</span><button onClick={cancelPath}>DISMISS</button></div>}
   {nudges>0&&<p className="arc-muted">Nudge: an unfound name starts with {board.words.find((_word,i)=>!solved(i))?.[0]??"?"} and has {board.words.find((_word,i)=>!solved(i))?.length??5} letters. Each nudge reduces the run score.</p>}
   {currentDone&&<div className="arc-feedback"><b>BOARD {boardNo+1} COMPLETE.</b><p>SPANGRAM: {board.spangram}</p><button className="arc-button" onClick={boardNo===9?()=>{setFinished(true);if(mode==="daily")onDaily("strands",1000-nudges*80-wrong*15);}:nextBoard}>{boardNo===9?"FINISH TEN-BOARD RUN":"NEXT BOARD ↗"}</button></div>}
   <div className="strands-legend"><span><i className="blue"/> FOOTBALLER</span><span><i className="gold"/> SPANGRAM / FULL NAME</span></div>
  </Card>}
 </Frame>;
}



type QuizDifficulty="EASY"|"MEDIUM"|"HARD"|"EXTREME"|"STANDARD";
type QuizQuestion={tier:Exclude<QuizDifficulty,"STANDARD">;question:string;answer:string;options:string[];explanation:string;source:string};
function makeTimedQuiz(players:GamePlayer[],difficulty:QuizDifficulty,seed:number):QuizQuestion[]{
 const tiers:Exclude<QuizDifficulty,"STANDARD">[]=difficulty==="STANDARD"?["EASY","EASY","EASY","EASY","EASY","MEDIUM","MEDIUM","MEDIUM","MEDIUM","MEDIUM","HARD","HARD","HARD","HARD","HARD"]:Array(15).fill(difficulty) as Exclude<QuizDifficulty,"STANDARD">[];
 const output:QuizQuestion[]=[];
 const make=(tier:Exclude<QuizDifficulty,"STANDARD">,player:GamePlayer,index:number):QuizQuestion|null=>{
   let answer="",question="",source="OpenFootballBase player profile / career archive";
   let fieldPool:string[]=[];
   let explanation="";
   if(tier==="EASY"){
     answer=player.nationality;
     if(!answer||answer==="Unlisted")return null;
     question="Which nationality is recorded for "+player.name+"?";
     fieldPool=players.map(p=>p.nationality).filter(v=>v&&v!=="Unlisted");
     explanation=player.name+" is listed with "+answer+" nationality in the player profile.";
   }else if(tier==="MEDIUM"){
     answer=player.club;
     if(!answer||answer==="Unknown club")return null;
     question="Which club is most recently listed in "+player.name+"'s career record?";
     fieldPool=players.map(p=>p.club).filter(v=>v&&v!=="Unknown club");
     explanation=player.club+" is the latest club spell recorded for "+player.name+" in this archive.";
   }else if(tier==="HARD"){
     answer=player.league;
     if(!answer||answer==="Unlisted")return null;
     question="Which league is recorded for "+player.club+" in "+player.name+"'s latest listed club spell?";
     fieldPool=players.map(p=>p.league).filter(v=>v&&v!=="Unlisted");
     explanation="The archive lists "+player.club+" in "+answer+" for this player record.";
   }else{
     if(player.firstYear===null)return null;
     answer=Math.floor(player.firstYear/10)*10+"s";
     question="Which decade does "+player.name+"'s first recorded career year fall in?";
     fieldPool=players.filter(p=>p.firstYear!==null).map(p=>Math.floor((p.firstYear??0)/10)*10+"s");
     explanation="The earliest career year recorded for "+player.name+" is "+player.firstYear+", which falls in the "+answer+".";
     source="OpenFootballBase career history; earliest listed senior club spell";
   }
   const wrong=[...new Set(fieldPool.filter(value=>normalise(value)!==normalise(answer)))];
   if(wrong.length<4)return null;
   const options=shuffle([answer,...shuffle(wrong,seed+index*31).slice(0,4)],seed+index*101);
   return {tier,question,answer,options,explanation,source};
 };
 const pools:Record<Exclude<QuizDifficulty,"STANDARD">,GamePlayer[]>={
   EASY:players.filter(p=>p.nationality!=="Unlisted"),
   MEDIUM:players.filter(p=>p.club!=="Unknown club"),
   HARD:players.filter(p=>p.league!=="Unlisted"),
   EXTREME:players.filter(p=>p.firstYear!==null)
 };
 tiers.forEach((tier,index)=>{
   const sorted=pools[tier];
   const ordered=shuffle(sorted,seed+index*47);
   let built:QuizQuestion|null=null;
   for(const p of ordered.slice(0,80)){
     built=make(tier,p,index);
     if(built)break;
   }
   if(built)output.push(built);
 });
 return output;
}
function QuickQuizPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();const [difficulty,setDifficulty]=useState<QuizDifficulty>("STANDARD");
 const [practiceSeed,setPracticeSeed]=useState(()=>String(Math.floor(Math.random()*1e12)));
 const [index,setIndex]=useState(0);const [chosen,setChosen]=useState("");const [locked,setLocked]=useState(false);
 const [score,setScore]=useState(0);const [seconds,setSeconds]=useState(10);const [typed,setTyped]=useState("");const [typingDone,setTypingDone]=useState(false);const [finished,setFinished]=useState(false);
 const done=account.daily[utcDay()]?.["timed-quiz"]!==undefined;
 const seed=mode==="daily"?"QUIZ:"+utcDay()+":"+difficulty:"QUIZ:PRACTICE:"+practiceSeed+":"+difficulty;
 const {players,loading,error,retry}=useArchivePlayers(true,seed,1600);
 const pool=useMemo(()=>players.map(archivePlayerToGamePlayer),[players]);
 const questions=useMemo(()=>pool.length>=20?makeTimedQuiz(pool,difficulty,hashSeed(seed)):[],[pool,difficulty,seed]);
 const question=questions[index];
 const progress=question?typed.length/question.question.length:0;
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
 return <Frame account={account} game="timed-quiz" eyebrow="FIFTEEN QUESTIONS / TEN SECONDS EACH" title="THE QUICK QUIZ." description="A football question arrives like a live commentary feed. Read it, pick one of five answers before the clock runs out." number="16" mode={mode} setMode={m=>{setMode(m);restart(m);}}>
 {done&&mode==="daily"?<Success title="FULL-TIME." detail="Today's fifteen-question quiz has been banked. Unlimited practice has fresh archive questions." button="PRACTICE QUIZ" onAgain={()=>{setMode("practice");restart("practice");}}/>:
  loading&&pool.length===0?<Card className="quiz-loading"><motion.div animate={{scale:[1,1.08,1],rotate:[0,12,-12,0]}} transition={{duration:1.4,repeat:Infinity}}>⚽</motion.div><b>THE QUIZMASTER IS PICKING THE QUESTIONS</b><span>BUILDING FROM THE FOOTBALL PLAYER ARCHIVE…</span></Card>:
  !questions.length?<Card className="arc-feedback"><b>{error?"PLAYER ARCHIVE UNAVAILABLE":"NOT ENOUGH VERIFIED FIELDS FOR THIS DRAW"}</b><p>{error||"The current pool did not produce enough questions with five distinct answer choices. Try another difficulty or retry the archive."}</p><button className="arc-button" onClick={retry}>RETRY QUESTION BANK ↗</button></Card>:
  finished?<Success title="FULL-TIME." detail={"You scored "+score+" points across "+standardCount+" questions."} button="NEW QUIZ" onAgain={()=>restart(mode)}/>:
  <Card className="quiz-game">
   <div className="arc-game-meta"><span>{difficulty==="STANDARD"?"5 EASY · 5 MEDIUM · 5 HARD":difficulty+" QUESTION RUN"}</span><b>QUESTION {index+1} / {questions.length}</b></div>
   <div className="quiz-scoreboard"><div><small>YOUR SCORE</small><strong>{score}</strong></div><div><small>TIER</small><b>{question?.tier}</b></div><div><small>TIME LEFT</small><strong className={seconds<=3?"urgent":""}>{typingDone?seconds:"—"}</strong></div></div>
   <div className="quiz-question"><div className="quiz-type-cursor"/><h2>{typed}{!typingDone&&<i className="quiz-caret"/>}</h2><div className="quiz-progress"><i style={{width:(progress*100)+"%"}}/></div></div>
   {typingDone&&<motion.div className="quiz-options" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}>{question.options.map(option=><button key={option} onClick={()=>choose(option)} disabled={locked} className={locked&&option===question.answer?"correct":locked&&option===chosen?"wrong":""}>{option}</button>)}</motion.div>}
   {locked&&<div className="arc-feedback"><b>{chosen===question.answer?"CORRECT.":chosen?"NOT THIS TIME.":"TIME'S UP."}</b><p>{question.explanation}</p><small>{question.source}</small><button className="arc-button" onClick={next}>{index+1===questions.length?"SEE FINAL SCORE":"NEXT QUESTION ↗"}</button></div>}
   <div className="arc-game-foot"><span>ARCHIVE-GENERATED / {question?.source}</span><span>ONE ANSWER / NO SECOND GO</span></div>
  </Card>}
 </Frame>;
}

type TournamentDifficulty="EASY"|"STANDARD"|"HARD"|"EXTREME";
const TOURNAMENT_LEVELS: TournamentDifficulty[]=["EASY","STANDARD","HARD","EXTREME"];
const lineupNameKey=(value:string)=>normalise(value);
function TournamentNationPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();
 const [difficulty,setDifficulty]=useState<TournamentDifficulty>("STANDARD");
 const [data,setData]=useState<Awaited<ReturnType<typeof getWorldCupLineups>>|null>(null);
 const [loadError,setLoadError]=useState("");
 const [clubRows,setClubRows]=useState<Map<string,string>>(new Map());
 const [clubsLoading,setClubsLoading]=useState(false);
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
   if(!match){setClubRows(new Map());return;}
   let live=true;setClubsLoading(true);setClubRows(new Map());
   getCareerClubsAtYear(match.starters,match.year).then(records=>{
     if(!live)return;const rows=new Map<string,string>();
     for(const name of match.starters){const found=records.get(lineupNameKey(name))??[];const distinct=[...new Set(found.map(x=>x.club).filter(Boolean))];if(distinct.length===1)rows.set(lineupNameKey(name),distinct[0]);}
     setClubRows(rows);
   }).catch(()=>{if(live)setClubRows(new Map());}).finally(()=>{if(live)setClubsLoading(false);});
   return()=>{live=false;};
 },[match?.id]);
 const teams=useMemo(()=>data?[...new Set(data.matches.map(m=>m.team).filter(Boolean))]:[],[data]);
 const optionCount=difficulty==="EASY"?3:difficulty==="STANDARD"?4:difficulty==="HARD"?6:8;
 const options=useMemo(()=>{
   if(!match)return [];
   const wrong=teams.filter(team=>team!==match.team);
   return shuffle([match.team,...shuffle(wrong,hashSeed(seed+":wrong")).slice(0,optionCount-1)],hashSeed(seed+":options"));
 },[match,teams,seed,optionCount]);
 const clueCount=difficulty==="EASY"?11:difficulty==="STANDARD"?9:difficulty==="HARD"?7:5;
 const clueNames=match?match.starters.slice(0,clueCount):[];
 const known=clueNames.filter(name=>clubRows.has(lineupNameKey(name))).length;
 const choose=(team:string)=>{
   if(ended||!match)return;const tries=attempts+1;setAttempts(tries);
   if(team===match.team){setWon(true);setEnded(true);if(mode==="daily")onDaily("tournament-nation",Math.max(150,1000-(tries-1)*220));}
   else if(tries>=3){setWon(false);setEnded(true);if(mode==="daily")onDaily("tournament-nation",0);}
 };
 const reset=(newMode:Mode=mode,newDifficulty:TournamentDifficulty=difficulty)=>{
   setDifficulty(newDifficulty);setAttempts(0);setEnded(false);setWon(false);
   if(newMode==="practice")setPracticeSeed(String(Math.floor(Math.random()*1e12)));
 };
 return <Frame account={account} game="tournament-nation" eyebrow="WORLD CUP ARCHIVE / STARTING XI" title="TOURNAMENT NATION." description="A historic World Cup starting XI. Each shirt reveals the club recorded for that player at the tournament year. Name the country." number="15" mode={mode} setMode={m=>{setMode(m);reset(m);}}>
 {done&&mode==="daily"?<Success title="NATION IDENTIFIED." detail="Today's tournament challenge is complete. Practice draws from other recorded World Cup line-ups." button="PRACTICE" onAgain={()=>{setMode("practice");reset("practice");}}/>:
  loadError?<Card className="arc-feedback"><b>TOURNAMENT DATA UNAVAILABLE</b><p>{loadError}</p><button className="arc-button" onClick={()=>{setLoadError("");getWorldCupLineups().then(setData).catch(e=>setLoadError(String(e)));}}>RETRY DATA ↗</button></Card>:
  !match||!data?<Card className="grid-loading"><motion.div animate={{rotate:360}} transition={{duration:1.5,repeat:Infinity,ease:"linear"}}>⚽</motion.div><b>OPENING THE WORLD CUP ARCHIVE</b><span>Loading 1982–2022 starting line-ups.</span></Card>:
  <Card className="tournament-game">
   <div className="arc-game-meta"><span>FIFA WORLD CUP · {match.year}</span><b>{3-attempts} GUESSES LEFT</b></div>
   <div className="grid-difficulty">{TOURNAMENT_LEVELS.map(level=><button key={level} className={difficulty===level?"active":""} onClick={()=>reset(mode,level)}>{level}</button>)}</div>
   <div className="tournament-match"><div><small>TOURNAMENT</small><b>FIFA WORLD CUP {match.year}</b></div><div><small>ROUND</small><b>{match.round||"MATCH"}</b></div><div><small>OPPONENT</small><b>{match.opponent}</b></div><div><small>DATE</small><b>{match.date}</b></div></div>
   <div className="tournament-pitch"><div className="tournament-pitch-lines"><i/><i/><i/></div>
    <div className="tournament-xi-grid">{clueNames.map((name,i)=>{
      const club=clubRows.get(lineupNameKey(name));
      return <motion.div className={"tournament-shirt t-shirt-"+i} key={name} initial={{opacity:0,y:10,scale:.9}} animate={{opacity:1,y:0,scale:1}} transition={{delay:i*.025}}>
       <div className="shirt-shape"><b>{String(i+1).padStart(2,"0")}</b></div>
       <div className="shirt-club">{club?<><ClubBadge name={club} size={22}/><small>{club}</small></>:<small>{clubsLoading?"LOOKING UP CLUB":"CLUB NOT RECORDED"}</small>}</div>
      </motion.div>;
    })}</div>
    <div className="tournament-xi-caption"><span>STARTING XI / {known} OF {clueNames.length} CLUBS MATCHED</span><span>CLUB CLUES / {match.year}</span></div>
   </div>
   <p className="arc-muted">The source provides starting-line-up order, not exact on-pitch positions. Club clues appear only where an exact player-name and year overlap is found in the career archive. Unknown clubs are not guessed.</p>
   {!ended?<><div className="tournament-options">{options.map(team=><button key={team} onClick={()=>choose(team)}>{team}<i>↗</i></button>)}</div><div className="arc-game-foot"><span>{difficulty} · {optionCount} NATIONAL TEAMS</span><span>{clueNames.length} CLUB CLUES SHOWN</span></div></>:
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
 const {players:archivePlayers,loading,error,retry}=useArchivePlayers(true,seed,1600);
 const done=account.daily[utcDay()]?.["scout-signal"]!==undefined;
 const archived=useMemo(()=>archivePlayers.map(archivePlayerToGamePlayer)
   .filter(p=>p.nationality!=="Unlisted"&&p.club!=="Unknown club"&&p.clubs.length>0),[archivePlayers]);
 const staticPool=useMemo(()=>PLAYER_DATABASE.map(p=>({
   ...p,archiveId:p.name,careerSpells:[],careerApps:0,careerGoals:0,leagueApps:0,leagueGoals:0,leagueGoalSeasons:0,
   statSeasons:0,firstYear:null,lastYear:null,caps:null,internationalGoals:null,birthDate:"",
   currentCountry:"",currentDivision:null
 } as GamePlayer)),[]);
 const pool=archived.length>=2?archived:staticPool;
 const target=pool[hashSeed(seed+":target")%pool.length];
 type SignalKey="nationality"|"careerClub"|"latestClub"|"position"|"league"|"ageBand";
 const sharedClubs=(p:GamePlayer)=>p.clubs.filter(c=>target.clubs.some(t=>normalise(t)===normalise(c)));
 const category=(key:SignalKey,p:GamePlayer)=>{
   if(key==="nationality")return p.nationality===target.nationality;
   if(key==="careerClub")return sharedClubs(p).length>0;
   if(key==="latestClub")return normalise(p.club)===normalise(target.club);
   if(key==="position")return p.position===target.position;
   if(key==="league")return p.league===target.league;
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
 if(path==="locker-room")return <AccountPage account={account} setAccount={setAccount}/>;
 const pages:Record<string,React.ReactNode>={
  "lowball":<LowballPage account={account} onDaily={onDaily}/>,
  "the-climb":<ClimbPage account={account} onDaily={onDaily}/>,
  "draft-xi":<DraftPage account={account} onDaily={onDaily}/>,
  "career-file":<CareerFilePage/>,
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
 return pages[path]??<HomePage account={account}/>;
}
