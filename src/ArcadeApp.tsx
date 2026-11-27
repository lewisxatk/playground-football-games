import { useEffect, useMemo, useState, useRef, type FormEvent, type ReactNode } from "react";
import { motion, AnimatePresence, Reorder, MotionConfig, animate, useMotionValue, useTransform } from "motion/react";
import {
  PLAYER_DATABASE, LEAGUE_GOALS, STRANDS_PACKS,
  type Player
} from "./playerData";
import { ClubBadge, CountryFlag } from "./ClubBadge";

import { cc0CareerToArchiveGamePlayer } from "./cc0CareerAdapter";
import type { ArchiveGamePlayer, ArchiveCareerSpell, ArchiveGameStat } from "./careerFileData";
import CareerFilePage from "./CareerFilePage";
import { getArchiveGamePlayers } from "./careerFileData";
import CultHeroPage from "./CultHeroPage";
import CultHeroCollectionPage from "./CultHeroCollectionPage";
import { useFootballKnowledge, useFootballQuizKnowledge, makeCC0QuizRound, makeCC0DailyQuizRound, type CC0QuizTier as QuizTier } from "./footballKnowledge";
import "./arcade.css";
import "./playground-upgrades.css";

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
const difficultyLabel=(level:string)=>level==="MEDIUM"?"MEDIUM / STANDARD":level;
const difficultyDescription=(level:string)=>({
 EASY:"Well-known players, major clubs and straightforward football facts.",
 MEDIUM:"Established careers, familiar records and less obvious choices.",
 HARD:"Tighter statistics, tougher career clues and specialist football knowledge.",
 EXTREME:"Rare records, detailed career chronology and questions for serious obsessives."
} as Record<string,string>)[level]??"";
const EMPTY_ACCOUNT: Account = { nickname:"PLAYER 01", createdAt:new Date().toISOString(), streak:0, bestStreak:0, lastDailyDate:"", daily:{}, totals:{} };
const GAME_LINKS = [
  {id:"lowball",title:"WHO'S GOT MORE?",sub:"Pick who has more recorded senior international goals.",tone:"lime",tag:"STAT FACE-OFF"},
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
  {id:"strands",title:"FOOTBALL STRANDS",sub:"Find players linked by a club or nation. Trace the theme.",tone:"orange",tag:"WORD SEARCH"},
  {id:"scout-signal",title:"SCOUT SIGNAL",sub:"Guess the footballer. Watch the attributes light up.",tone:"pink",tag:"ATTRIBUTE HUNT"},
  {id:"tournament-nation",title:"TOURNAMENT NATION",sub:"Name the country from a historic World Cup starting XI.",tone:"blue",tag:"INTERNATIONAL"},
  {id:"timed-quiz",title:"THE QUICK QUIZ",sub:"17 questions. English football first. No VAR.",tone:"orange",tag:"TIMED QUIZ"},
  {id:"cult-hero",title:"CULT HERO",sub:"Five clues. Name the player. Keep the card.",tone:"pink",tag:"PLAYER MYSTERY"}
] as const;
type GameId = typeof GAME_LINKS[number]["id"];
const normalise = (v:string) => v.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");

const countryLabel = (value:string) => {
  const stripped=value.trim()
    .replace(/^(?:drapeau de la|drapeau de|vlag van|flag of|bandera de|flagge von|fahne von)\s+/i,"")
    .replace(/\s+u-?(?:15|16|17|18|19|20|21|23)\b/ig,"")
    .replace(/\s+\d{4}\s*[-–/]\s*\d{2,4}.*$/,"").trim();
  const key=normalise(stripped);
  const labels:Record<string,string>={
    eng:"England",wal:"Wales",wls:"Wales",sco:"Scotland",nir:"Northern Ireland",
    esp:"Spain",espana:"Spain",es:"Spain",ger:"Germany",deu:"Germany",ned:"Netherlands",nld:"Netherlands",
    ita:"Italy",fra:"France",por:"Portugal",prt:"Portugal",bra:"Brazil",arg:"Argentina",uru:"Uruguay",
    bel:"Belgium",cro:"Croatia",srb:"Serbia",sui:"Switzerland",che:"Switzerland",civ:"Ivory Coast",cotedivoire:"Ivory Coast",
    kor:"South Korea",korea:"South Korea",republicofkorea:"South Korea",jpn:"Japan",usa:"United States",mex:"Mexico",mar:"Morocco",nga:"Nigeria",sen:"Senegal",
    gha:"Ghana",cmr:"Cameroon",irn:"Iran",aus:"Australia",can:"Canada",den:"Denmark",swe:"Sweden",nor:"Norway",
    pol:"Poland",ukr:"Ukraine",cze:"Czechia",rou:"Romania",tur:"Türkiye",gre:"Greece",sau:"Saudi Arabia",
    ksa:"Saudi Arabia",qat:"Qatar",chn:"China",hnd:"Honduras",hon:"Honduras",crc:"Costa Rica",ecu:"Ecuador",
    par:"Paraguay",chi:"Chile",bol:"Bolivia",per:"Peru",jam:"Jamaica",pan:"Panama",egy:"Egypt",alg:"Algeria",
    tun:"Tunisia",rsa:"South Africa",isl:"Iceland",aut:"Austria",hun:"Hungary",slo:"Slovenia",svk:"Slovakia",
    fin:"Finland",irl:"Republic of Ireland",alb:"Albania",mkd:"North Macedonia",bos:"Bosnia and Herzegovina",
    mne:"Montenegro",kos:"Kosovo",est:"Estonia",lva:"Latvia",ltu:"Lithuania",bul:"Bulgaria",isr:"Israel",
    uzb:"Uzbekistan",tha:"Thailand",ind:"India",cog:"Republic of the Congo",republiqueducongo:"Republic of the Congo",congo:"Republic of the Congo",gnb:"Guinea-Bissau",guineabissau:"Guinea-Bissau",cod:"DR Congo",democraticrepublicofthecongo:"DR Congo",drapeaufrance:"France",vlagvanjapan:"Japan",
  };
  const first=normalise(stripped.split(/[\s,(/-]+/)[0]??"");
  return labels[key]??labels[first]??stripped;
};
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
function todayPoints(account:Account){return Object.values(account.daily[utcDay()]??{}).reduce((total,score)=>total+score,0);}

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
    nationality:countryLabel(p.nationality||"Unlisted"),position:positionCode(p.position),
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
function cc0PlayerToGamePlayer(p:{id:string;name:string;aliases:string[];nationalities:string[];birthYears:number[];positions:string[];internationalGoalsRecorded?:number;worldCupStarts?:number;worldCupYears?:number[]}):GamePlayer{
 const parts=p.name.trim().split(/\s+/).filter(Boolean),surname=parts.at(-1)??p.name;
 const rawPosition=p.positions?.[0]??"";
 const position:Player["position"]=rawPosition==="G"||rawPosition==="GK"?"GK":rawPosition==="D"||rawPosition==="DF"?"DEF":rawPosition==="M"||rawPosition==="MF"?"MID":rawPosition==="F"||rawPosition==="FW"?"FWD":"" as Player["position"];
 const birthYear=p.birthYears?.[0]??null,age=birthYear===null?null:new Date().getUTCFullYear()-birthYear;
 const ageBand=age===null?"Unknown":age<20?"Teens":age<30?"20s":age<40?"30s":age<50?"40s":age<60?"50s":"60s+";
 const worldCupStarts=p.worldCupStarts??0,internationalGoals=p.internationalGoalsRecorded??0,years=p.worldCupYears??[];
 return {name:p.name,surname:surname.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z]/g,""),
 nationality:countryLabel(p.nationalities?.[0]??"Unlisted"),position,club:"Unknown club",league:"International",active:false,ageBand,clubs:[],aliases:[p.name,...(p.aliases??[])],archiveId:p.id,
 careerSpells:[],seasonStats:[],careerAppsRecorded:false,careerGoalsRecorded:false,leagueAppsRecorded:false,leagueGoalsRecorded:false,careerApps:worldCupStarts,careerGoals:internationalGoals,leagueApps:0,leagueGoals:0,leagueGoalSeasons:0,leagueAssists:0,leagueAssistSeasons:0,statSeasons:years.length,firstYear:years[0]??null,lastYear:years.at(-1)??null,caps:null,internationalGoals,birthDate:"",currentCountry:p.nationalities?.[0]??"",currentDivision:null};
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
function ScoreTicker({value,suffix=""}:{value:number;suffix?:string}){
  const count=useMotionValue(0);
  const display=useTransform(count,current=>Math.round(current).toLocaleString("en-GB")+suffix);
  useEffect(()=>{
    const controls=animate(count,value,{duration:.5,ease:"easeOut"});
    return ()=>controls.stop();
  },[count,value]);
  return <motion.span aria-label={value.toLocaleString("en-GB")+suffix}>{display}</motion.span>;
}

function HomePage({account}:{account:Account}){
  const done=todayGames(account);
  return <div className="arc-shell arc-home"><TopBar account={account}/><main className="arc-home-main">
    <motion.section className="arc-home-hero" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:.46,ease:"easeOut"}}><div><div className="arc-eyebrow"><span/> THE FOOTBALL ARCADE / EST. 2026</div><h1>NO HALF<br/><em>TIME.</em></h1><p>Quick games, proper football knowledge and a reason to come back tomorrow.</p><div className="arc-hero-actions"><a className="arc-button" href="/footle">PLAY TODAY'S FOOTLE ↗</a><a className="arc-text-link" href="#all-games">PICK YOUR GAME ↓</a></div></div>
      <div className="arc-home-graphic"><div className="arc-graphic-label">THE PLAYGROUND / 17 GAME MODES</div><div className="arc-graphic-pitch"><i className="half"/><i className="centre"/><i className="box-one"/><i className="box-two"/><motion.span className="graphic-ball" animate={{x:[0,32,-20,0],y:[0,-15,8,0],rotate:[0,180,360]}} transition={{duration:5,repeat:Infinity,ease:"easeInOut"}}/></div><div className="arc-graphic-bottom"><span>GUESS / THINK / PLAY</span><b>↗</b><span>17 WAYS TO PLAY</span></div></div>
    </motion.section>
    <section className="arc-daily-strip"><div><small>YOUR DAILY RECORD / UTC</small><motion.strong key={done} initial={{opacity:0,y:7}} animate={{opacity:1,y:0}}>{done} <i>/ 17</i></motion.strong><span>GAMES PLAYED TODAY</span></div><div><small>YOUR STREAK</small><motion.strong key={account.streak} initial={{opacity:0,y:7}} animate={{opacity:1,y:0}}>{account.streak} <i>days</i></motion.strong><span>BEST {account.bestStreak} DAYS</span></div><div><small>PLAYER NAME</small><strong className="nickname-stat">{account.nickname}</strong><span>LOCAL PLAYER SAVE · <ScoreTicker value={todayPoints(account)} suffix=" DAILY POINTS"/></span></div><a href="/locker-room">OPEN LOCKER ROOM ↗</a></section>
    <section id="all-games" className="arc-game-directory"><div className="arc-section-title"><div><span>01 / THE LINE-UP</span><h2>PICK YOUR<br/><em>GAME.</em></h2></div><p>Every game has its own page. Daily challenges reset at midnight GMT. Practice allowances vary by game.</p></div>
      <div className="arc-home-grid">{GAME_LINKS.map((game,i)=><motion.a href={"/"+game.id} key={game.id} className={"arc-game-tile "+game.tone+" pg-game-"+game.id} whileHover={{y:-5,rotate:i%2?1:-1}} whileTap={{scale:.985}}><div><small>PG / GAME {String(i+1).padStart(2,"0")}</small><span>{game.tag}</span></div><div className="arc-tile-art"><i>{["↗","Ⅲ","XI","?","A","▦","▤","↗","◉","501","↔","11","✳","◎","🏆","⏱","CH"][i]}</i></div><h3>{game.title}</h3><p>{game.sub}</p><b className="arc-tile-arrow">PLAY ↗</b></motion.a>)}</div>
    </section>
    <section className="arc-home-bottom"><div><small>THE PLAYGROUND / CLUBHOUSE</small><h2>KEEP YOUR<br/><em>RUN GOING.</em></h2><p>Your nickname, daily results and streak stay saved in this browser. No signup. Practice allowances vary by game.</p><a href="/locker-room" className="arc-button">YOUR LOCKER ROOM ↗</a></div><div className="arc-home-score"><span>🔥</span><strong>{account.streak}</strong><small>DAY STREAK</small></div></section>
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
  <Card><small className="arc-card-kicker">02 / TODAY'S SCORECARD · {utcDay()} GMT · <ScoreTicker value={todayPoints(account)} suffix=" TOTAL POINTS"/></small><div className="arc-score-list">{GAME_LINKS.map(g=><div key={g.id}><span>{g.title}</span><b>{account.daily[utcDay()]?.[g.id]!==undefined?account.daily[utcDay()][g.id]+" PTS":"NOT PLAYED"}</b></div>)}</div></Card>
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
 const {data:goalData,loading:poolLoading,error:poolError,retry}=useFootballKnowledge("goal-packs");
 const lowballPairs=goalData?.lowballPairs??[];
 type DuelStatPlayer={name:string;value:number;club:string;seasons:number;id:string};
 const fallbackPool:DuelStatPlayer[]=LEAGUE_GOALS.map(p=>({name:p.name,value:p.value,club:"Starter list",seasons:1,id:p.name}));
 const sourcePool=useMemo(()=>{
   const unique=new Map<string,DuelStatPlayer>();
   for(const pack of lowballPairs)for(const player of pack.players){const value=player.value??player.goals??player.internationalGoalsRecorded??0;if(value>0&&!unique.has(player.id))unique.set(player.id,{id:player.id,name:player.name,value,club:player.teams?.[0]??"International football",seasons:1})}
   return [...unique.values()];
 },[lowballPairs]);
 const level=Math.min(3,Math.floor(step/5));
 const levelNames=["EASY","MEDIUM / STANDARD","HARD","EXTREME"];
 const metric=sourcePool.length>=2?"RECORDED SENIOR INTERNATIONAL GOALS":"STARTER FALLBACK LIST";
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
 return <Frame account={account} game="lowball" eyebrow="STAT FACE-OFF / QUICK FIRE" title="WHO'S GOT MORE?" description="Two players. One number. Pick who has more recorded senior international goals. The source coverage is not a claim of complete career totals." number="01" mode={mode} setMode={m=>{setMode(m);restart(m);}}>
  {done&&mode==="daily"?<Success title="DAILY DONE." detail="Today's ten-duel challenge is banked. Practice runs are unlimited." button="PRACTICE" onAgain={()=>{setMode("practice");restart("practice");}}/>:
   poolLoading&&sourcePool.length===0?<Card className="lb-panel lb-loading"><motion.div className="lb-loading-ball" animate={{y:[0,-12,0],rotate:[0,180,360]}} transition={{duration:1.2,repeat:Infinity,ease:"easeInOut"}}>⚽</motion.div><b>SCOUTING THE ARCHIVE</b><p>Building a fresh pool of footballers and recorded stats…</p><span>THE FIRST LOAD CAN TAKE A LITTLE LONGER. NEXT VISITS USE A LOCAL CACHE.</span></Card>:
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
    {pick!==null&&<motion.div className={"arc-feedback "+(pick===correct?"quiz-goal":"quiz-miss")} initial={{opacity:0,y:14,scale:.97}} animate={{opacity:1,y:0,scale:1}} transition={{type:"spring",stiffness:240,damping:22}}><b>{pick===correct?"YOU CALLED IT. ⚽":"STREAK OVER."}</b><p>{pair[correct].name} has {pair[correct].value.toLocaleString("en-GB")} recorded senior international goals in the CC0 source records.</p><button className="arc-button" onClick={pick===correct?next:()=>{if(mode==="daily")onDaily("lowball",score);setRunDone(true);}}>{pick===correct?(mode==="daily"&&step===9?"BANK DAILY SCORE":"NEXT DUEL"):"SEE RUN RESULT"} ↗</button></motion.div>}
    <div className="lb-data-note"><b>{metric}</b><span>{sourcePool.length>=2?"Men’s senior full-international goals recorded in the CC0 source; coverage is not guaranteed complete.":"Manual starter fallback while the CC0 database is unavailable."}</span>{poolError&&<button onClick={retry}>RETRY DATABASE</button>}</div>
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
 const {data:climbData,loading,error,retry}=useFootballQuizKnowledge("the-climb");
 const bank=climbData?.questions??[];
 const questions=useMemo(()=>bank.length?makeCC0QuizRound(bank,difficulty,hashSeed(seed),5):[],[bank,difficulty,seed]);
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
 return <Frame account={account} game="the-climb" eyebrow="SURVIVAL QUIZ / FIVE QUESTIONS" title="KEEP CLIMBING." description="Five source-backed questions: English domestic football first, with international football alongside it. Three lives." number="02" mode={mode} setMode={m=>{setMode(m);restart(m);}}>
 {done&&mode==="daily"?<Success title="RUN COMPLETE." detail="Your daily climb is banked. Unlimited practice has fresh questions." button="PRACTICE RUN" onAgain={()=>{setMode("practice");restart("practice");}}/>:
  loading&&bank.length===0?<Card className="climb-loading"><motion.div animate={{y:[0,-10,0],rotate:[0,180,360]}} transition={{duration:1.4,repeat:Infinity}}>⚽</motion.div><b>OPENING THE CC0 MATCH ARCHIVE</b><span>CHECKING FOUR HISTORIC DIFFICULTY POOLS…</span></Card>:
  error||bank.length===0?<Card className="arc-feedback"><b>QUESTION BANK UNAVAILABLE</b><p>{error||"The CC0 football question pool could not be opened."}</p><button className="arc-button" onClick={retry}>RETRY MATCH DATABASE ↗</button></Card>:
  <Card className="climb-play">
   <div className="arc-game-meta"><span>QUESTION {step+1} / 5</span><b>{lives} LIVES · {score} PTS</b></div>
   <div className="grid-difficulty">{levels.map(level=><button key={level} className={difficulty===level?"active":""} onClick={()=>restart(mode,level)}>{difficultyLabel(level)}</button>)}</div>
   <p className="difficulty-note">{difficultyDescription(difficulty)}</p>
   <div className="climb-life-track">{[0,1,2].map(i=><i key={i} className={i<lives?"alive":""}/>)}</div>
   <div className="climb-source-line"><span>{question?.category??"FOOTBALL"}</span><span>{question?.region==="ENGLISH_DOMESTIC"?"ENGLISH DOMESTIC FOOTBALL":question?.category==="FIFA World Cup"?"FIFA WORLD CUP":"UEFA CHAMPIONS LEAGUE"}</span></div>
   <h2>{ended?"RUN COMPLETE.":question?.question??"No question available."}</h2>
   {ended?<div className="arc-feedback"><p>You climbed {step+1} questions and banked {score} points.</p><button className="arc-button" onClick={()=>restart(mode)}>RUN IT BACK ↻</button></div>:
    <><div className="climb-options">{question?.options.map(option=><motion.button key={option} whileTap={{scale:.985}} onClick={()=>choose(option)} disabled={!!answer} className={answer===option?(option===question.answer?"correct":"wrong"):""}>{option}<i>↗</i></motion.button>)}</div>
     {answer&&<motion.div className={"arc-feedback "+(answer===question.answer?"quiz-goal":"quiz-miss")} initial={{opacity:0,y:12,scale:.98}} animate={{opacity:1,y:0,scale:1}}><b>{answer===question.answer?"GOAL! RIGHT ANSWER.":"NOT THIS TIME."}</b><p>{question.explanation}</p><small>{question.source}</small><button className="arc-button" onClick={next}>{step===4||lives<=0?"SEE RESULT":"NEXT QUESTION"} ↗</button></motion.div>}
    </>}
   <p className="arc-muted">Source: pinned English domestic results and UEFA Champions League fixtures. International friendlies and unrelated national-team fixtures are excluded.</p>
   <div className="arc-game-foot"><span>5 QUESTIONS · 3 LIVES</span><span>{bank.filter(item=>item.tier===difficulty).length} MATCH QUESTIONS IN THIS TIER</span></div>
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
 const {data:playerStatsData,loading,error,retry}=useFootballKnowledge("player-stats");
 const draftPlayers=playerStatsData?.players??[];
 const cc0Pool=useMemo(()=>draftPlayers.map(cc0PlayerToGamePlayer)
   .filter(p=>["GK","DEF","MID","FWD"].includes(p.position)&&p.nationality!=="Unlisted")
   .map(p=>({...p,cost:draftCost(p),rating:Math.min(99,Math.round(35+Math.sqrt(Math.max(0,p.careerApps))*2+Math.sqrt(Math.max(0,p.careerGoals))*1.5))} as DraftCandidate)),[draftPlayers]);
 const fallbackPool=useMemo(()=>FALLBACK_DRAFT.map((p,i)=>({
   ...PLAYER_DATABASE.find(x=>normalise(x.name)===normalise(p.name))!,
   name:p.name,surname:p.name.split(" ").slice(-1)[0],position:p.pos as Player["position"],
   club:"Starter roster",league:"Starter game",active:true,ageBand:"Unknown",clubs:["Starter roster"],aliases:[p.name],
   archiveId:"fallback-"+i,careerSpells:[],seasonStats:[],careerAppsRecorded:false,careerGoalsRecorded:false,leagueAppsRecorded:false,leagueGoalsRecorded:false,careerApps:0,careerGoals:0,leagueApps:0,leagueGoals:0,leagueGoalSeasons:0,leagueAssists:0,leagueAssistSeasons:0,
   statSeasons:0,firstYear:null,lastYear:null,caps:null,internationalGoals:null,birthDate:"",currentCountry:"",currentDivision:null,
   cost:p.cost,rating:60
 } as DraftCandidate)),[]);
 const basePool=cc0Pool.length>=25?cc0Pool:fallbackPool;
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
 return <Frame account={account} game="draft-xi" eyebrow="SQUAD BUILDER / 4—3—3" title="PICK YOUR XI." description="Build a 4—3—3 from a CC0 international player pool. Credits are game values based on recorded international goals and World Cup starts, not market prices or transfer valuations." number="03" mode={mode} setMode={m=>{setMode(m);reset(m);}}>
 {done&&mode==="daily"?<Success title="SQUAD SUBMITTED." detail="Your daily Draft XI is banked. Unlimited practice draws a fresh squad pool." button="BUILD AGAIN" onAgain={()=>{setMode("practice");reset("practice");}}/>:
  <Card className="draft-game">
   <div className="arc-game-meta"><span>{picked.length} / 11 SELECTED</span><b>{counts.GK} GK · {counts.DEF} DEF · {counts.MID} MID · {counts.FWD} FWD</b></div>
   <div className="grid-difficulty">{DRAFT_LEVELS.map(level=><button key={level} className={difficulty===level?"active":""} onClick={()=>reset(mode,level)}>{difficultyLabel(level)}</button>)}</div>
   <div className="draft-budget"><div><small>GAME CREDITS USED</small><strong>{spent}<i> / {budget} credits</i></strong></div><span>{budget-spent} LEFT</span><div className="draft-budget-line"><i style={{width:Math.min(100,spent/budget*100)+"%"}}/></div></div>
   {loading&&cc0Pool.length===0?<div className="grid-loading"><motion.div animate={{rotate:360}} transition={{duration:1.5,repeat:Infinity,ease:"linear"}}>⚽</motion.div><b>BUILDING THE PLAYER MARKET</b><span>SELECTING A FRESH 4—3—3 PLAYER POOL…</span></div>:
    <div className="draft-game-layout">
     <div className="draft-game-pitch"><span>4 — 3 — 3 / {sortedSelected.length} PLAYERS</span><div className="draft-midline"/><div className="draft-circle"/>
      {sortedSelected.map((p,i)=><div className={"draft-player dp"+i} key={p.archiveId}><b>{p.position}</b><small>{p.surname}</small></div>)}
     </div>
     <div className="draft-pick-list">{roster.map(p=><button key={p.archiveId} onClick={()=>toggle(p.archiveId)} className={picked.includes(p.archiveId)?"chosen":""} disabled={!picked.includes(p.archiveId)&&(picked.length>=11||spent+p.cost>budget||locked)}>
       <span><b>{p.name}</b><small><CountryFlag name={p.nationality}/> {p.nationality} · {p.position}</small></span><strong>{p.cost}</strong><i>{picked.includes(p.archiveId)?"−":"+"}</i>
      </button>)}</div>
    </div>}
   <div className="arc-game-foot"><span>{locked?"YOUR XI IS LOCKED":valid?"SQUAD RULES MET":"1 GK · 4 DEF · 3 MID · 3 FWD REQUIRED"}</span><button className="arc-button" disabled={!valid||locked} onClick={()=>{setLocked(true);if(mode==="daily")onDaily("draft-xi",score);}}>LOCK IN XI ↗</button><button className="arc-quiet" onClick={()=>reset(mode)}>RESET</button><button className="arc-quiet" onClick={()=>{retry();reset(mode);}}>NEW POOL ↻</button></div>
   {locked&&<div className="arc-feedback"><b>SQUAD LOCKED · {score} POINTS</b><p>{spent} of {budget} game credits used. This is a custom game rating, not a real transfer-value ranking.</p><button className="arc-button" onClick={()=>reset(mode)}>BUILD ANOTHER SIDE ↗</button></div>}
   <p className="arc-muted">{cc0Pool.length>=25?"Players and positions are drawn from CC0 player and international-stat records.":"The CC0 position pool is unavailable; a small starter roster is active."} Game credits are derived from recorded international goals and World Cup starting appearances. They are not monetary fees.</p>
   {error&&<div className="arc-feedback"><b>CC0 POOL FALLBACK</b><p>{error}</p><button className="arc-quiet" onClick={retry}>RETRY CC0 PLAYER POOL</button></div>}
  </Card>}
 </Frame>;
}


const WORDS=[...new Set([...playerSurnames(),"MALEN","BARRY","DIAZ"])];
function wordleEval(guess:string,target:string){const result=Array(5).fill("absent");const letters=target.split("");for(let i=0;i<5;i++){if(guess[i]===target[i]){result[i]="correct";letters[i]="";}}for(let i=0;i<5;i++){if(result[i]==="correct")continue;const at=letters.indexOf(guess[i]);if(at>=0){result[i]="present";letters[at]="";}}return result;}
function FootlePage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();
 const [practiceSeed,setPracticeSeed]=useState(()=>String(Math.floor(Math.random()*1e12)));
 const [typed,setTyped]=useState("");const [guesses,setGuesses]=useState<string[]>([]);const [end,setEnd]=useState(false);const [wordError,setWordError]=useState("");const [hinted,setHinted]=useState<number[]>([]);
 const done=account.daily[utcDay()]?.footle!==undefined;
 const seed=mode==="daily"?"FOOTLE:"+utcDay():"FOOTLE:PRACTICE:"+practiceSeed;
 const {data:footleData,loading,error,retry}=useFootballKnowledge("footle");
 const bank=footleData?.answers??[];
 const target=bank.length?bank[hashSeed(seed+":answer")%bank.length]:WORDS[0];
 const win=guesses.at(-1)===target;
 const submitWord=()=>{
   const word=typed.toUpperCase();
   if(word.length!==5||guesses.includes(word)||end)return;
   // Any five-letter guess is accepted so players can test ordinary words and names, not only the answer bank.
   setWordError("");
   const next=[...guesses,word];setGuesses(next);setTyped("");
   if(word===target||next.length===6){setEnd(true);if(mode==="daily")onDaily("footle",word===target?Math.max(100,700-next.length*75-hinted.length*80):0);}
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
   setTyped("");setGuesses([]);setEnd(false);setWordError("");setHinted([]);
 };
 const updateTyped=(value:string)=>{setWordError("");setTyped(value.replace(/[^a-z]/gi,"").slice(0,5));};
 const hintLetter=()=>{
   if(hinted.length>=5||end)return;
   const index=[0,1,2,3,4].find(i=>!hinted.includes(i)&&!guesses.some(word=>word[i]===target[i]));
   if(index!==undefined)setHinted(old=>[...old,index]);
 };
 const scoreAvailable=Math.max(0,700-guesses.length*75-hinted.length*80);
 return <Frame account={account} game="footle" eyebrow="THE FIVE-LETTER FOOTBALL WORD" title="FOOTLE." description="Find the five-letter football surname in six guesses. Try any five-letter word or name to test letters — guesses are not restricted to the player answer list." number="05" mode={mode} setMode={m=>{setMode(m);restart(m);}}>
 {done&&mode==="daily"?<Success title="TODAY'S FOOTLE IS DONE." detail="One shared daily word. Infinite CC0-backed practice is still open." button="UNLIMITED PRACTICE" onAgain={()=>{setMode("practice");restart("practice");}}/>:
  loading&&bank.length===0?<Card className="footle-loading"><motion.div animate={{rotate:360}} transition={{duration:1.5,repeat:Infinity,ease:"linear"}}>⚽</motion.div><b>SCOUTING FIVE-LETTER NAMES</b><span>LOADING THE PREBUILT CC0 ANSWER BANK…</span></Card>:
  error&&bank.length===0?<Card className="arc-feedback"><b>FOOTLE DATA UNAVAILABLE</b><p>{error}</p><button className="arc-button" onClick={retry}>RETRY ANSWER BANK ↗</button></Card>:
  <Card className="footle-game">
   <div className="arc-game-meta"><span>6 GUESSES / 5 LETTERS</span><b>{scoreAvailable} PTS AVAILABLE</b></div>
   <div className="footle-board">{Array.from({length:6},(_,r)=><div className="footle-row" key={r}>{Array.from({length:5},(_,c)=>{const word=guesses[r];const colour=word?wordleEval(word,target)[c]:"";const character=word?.[c]??(r===guesses.length?typed[c]??"":"");return <motion.div key={r+"-"+c+"-"+character} initial={{opacity:.65,rotateX:character?70:0,y:character?-3:0}} animate={{opacity:1,rotateX:0,y:0}} transition={{duration:.24,delay:word?c*.07:0}} className={"footle-cell "+colour}>{character}</motion.div>;})}</div>)}</div>
   {end&&<motion.div className={"arc-feedback "+(win?"footle-win":"footle-over")} initial={{opacity:0,y:14,scale:.97}} animate={{opacity:1,y:0,scale:1}} transition={{duration:.28}}><b>{win?"GOAL! YOU GOT IT.":"THE WORD WAS "+target}</b><p>{win?"A proper bit of football knowledge. That's in the back of the net.":"One for the next round. Keep your streak alive."}</p>{win&&<motion.span className="footle-goal-ball" initial={{scale:0,rotate:-90}} animate={{scale:1,rotate:0}} transition={{type:"spring",stiffness:260,damping:12}}>⚽</motion.span>}{mode==="practice"&&<button className="arc-button" onClick={()=>restart("practice")}>NEXT WORD ↗</button>}</motion.div>}
   <form className="footle-entry" onSubmit={submit}><input type="text" inputMode="text" enterKeyHint="go" autoCapitalize="characters" autoComplete="off" spellCheck={false} value={typed} onChange={e=>updateTyped(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"||e.key==="Go"||e.key==="NumpadEnter"){e.preventDefault();e.currentTarget.form?.requestSubmit();}}} placeholder="ANY FIVE-LETTER WORD OR NAME" maxLength={5} disabled={end}/><button className="arc-button" type="submit" disabled={typed.length!==5||end||guesses.includes(typed.toUpperCase())}>ENTER ↵</button></form>
   {wordError&&<p className="footle-word-error" role="status">{wordError}</p>}
   <div className="footle-keyboard" aria-label="On-screen keyboard">{keyRows.map((row,i)=><div className="footle-key-row" key={row}>{row.split("").map(letter=><button type="button" key={letter} className={keyStatus(letter)} aria-label={letter+" key"} onClick={()=>!end&&updateTyped(typed+letter)}>{letter}</button>)}{i===2&&<><button type="button" className="wide-key" onClick={submitWord} disabled={end||typed.length!==5||guesses.includes(typed.toUpperCase())}>ENTER</button><button type="button" className="wide-key" aria-label="Delete last letter" onClick={()=>updateTyped(typed.slice(0,-1))} disabled={end}>⌫</button></>}</div>)}</div>
   <div className="footle-actions"><button className="arc-quiet" type="button" onClick={hintLetter} disabled={hinted.length>=5||end}>REVEAL A LETTER −80 PTS ({hinted.length}/5)</button><span>{bank.length} VALID PLAYER SURNAMES</span></div>{hinted.length>0&&<p className="arc-muted">LETTER INTEL: {hinted.map(i=>"slot "+(i+1)+" = "+target[i]).join(" · ")}</p>}<div className="footle-note">GREEN = RIGHT LETTER / RIGHT PLACE · AMBER = RIGHT LETTER / WRONG PLACE · GREY = NOT IN THE WORD</div>
   
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
 const {data:connectionData,loading,error,retry}=useFootballKnowledge("connections");
 const cc0Players=connectionData?.players??[];
 const connectionsPacks=connectionData?.packs??[];
 const pool=useMemo(()=>cc0Players.map(cc0PlayerToGamePlayer),[cc0Players]);
 const groups=useMemo(()=>{
   const pack=connectionsPacks.length?connectionsPacks[hashSeed(seed+":"+difficulty)%connectionsPacks.length]:null;
   if(!pack)return pool.length>=32?buildConnectionsGroups(pool,difficulty,hashSeed(seed+":"+difficulty)):[];
   const byId=new Map(pool.map(player=>[player.archiveId,player]));
   const colours=["gold","blue","pink","green"];
   const converted=pack.groups.map((group,index)=>({name:group.name,color:colours[index],members:group.memberIds.flatMap(id=>{const player=byId.get(id);return player?[player]:[];})}));
   return converted.length===4&&converted.every(group=>group.members.length===4)?converted:[];
 },[pool,connectionsPacks,difficulty,seed]);
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
    groups.length!==4?<div className="arc-feedback"><b>{error?"PLAYER ARCHIVE UNAVAILABLE":"NOT ENOUGH MATCHING PLAYERS"}</b><p>{error||"The current data draw doesn't contain four groups at this difficulty. Try another level or draw again."}</p><button className="arc-button" onClick={()=>{setGridReload(v=>v+1);reset(mode,difficulty);}}>RETRY DATABASE ↗</button></div>:
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
const GRID_LEVELS:GridDifficulty[]=["EASY","STANDARD","HARD","EXTREME"];
const HISTORIC_PREMIER_LEAGUE_CLUBS=[
 "Arsenal","Aston Villa","Barnsley","Birmingham City","Blackburn Rovers","Blackpool","Bolton Wanderers","Bournemouth",
 "Bradford City","Brentford","Brighton & Hove Albion","Burnley","Cardiff City","Charlton Athletic","Chelsea","Coventry City",
 "Crystal Palace","Derby County","Everton","Fulham","Huddersfield Town","Hull City","Ipswich Town","Leeds United","Leicester City",
 "Liverpool","Luton Town","Manchester City","Manchester United","Middlesbrough","Newcastle United","Norwich City","Nottingham Forest",
 "Oldham Athletic","Portsmouth","Queens Park Rangers","Reading","Sheffield United","Sheffield Wednesday","Southampton","Stoke City",
 "Sunderland","Swansea City","Tottenham Hotspur","Watford","West Bromwich Albion","West Ham United","Wigan Athletic","Wolverhampton Wanderers"
];
const gridClubKey=(value:string)=>normalise(value.replace(/&/g,"and")).replace(/\b(?:association football club|football club|f c|fc|afc|the)\\b/g," ").replace(/\s+/g," ").trim();
function archiveGamePlayerToGamePlayer(p:ArchiveGamePlayer):GamePlayer{
 const birthYear=p.birthDate?Number(p.birthDate.slice(0,4)):null,age=birthYear&&birthYear>1800?new Date().getUTCFullYear()-birthYear:null;
 const ageBand=age===null?"Unknown":age<20?"Teens":age<30?"20s":age<40?"30s":age<50?"40s":age<60?"50s":"60s+";
 const parts=p.name.trim().split(/\s+/).filter(Boolean),surname=parts.at(-1)??p.name;
 return {name:p.name,surname:surname.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z]/g,""),
  nationality:countryLabel(p.nationality||p.currentCountry||"Unlisted"),position:positionCode(p.position),club:p.currentClub||"Unknown club",
  league:p.currentLeague||"Unlisted",active:false,ageBand,clubs:p.clubs??[],aliases:[p.name,p.fullName??p.name],archiveId:p.id,
  careerSpells:p.spells??[],seasonStats:p.seasonStats??p.stats??[],careerAppsRecorded:p.appearances!==null,careerGoalsRecorded:p.goals!==null,
  leagueAppsRecorded:(p.leagueAppearanceRows??0)>0,leagueGoalsRecorded:(p.leagueGoalRows??0)>0,careerApps:p.appearances??0,
  careerGoals:p.goals??0,leagueApps:p.leagueAppearances??0,leagueGoals:p.leagueGoals??0,leagueGoalSeasons:p.leagueGoalSeasons??0,
  leagueAssists:p.leagueAssists??0,leagueAssistSeasons:p.leagueAssistSeasons??0,statSeasons:p.seasons??0,firstYear:p.firstYear??null,
  lastYear:p.lastYear??null,caps:p.caps??null,internationalGoals:p.internationalGoals??null,birthDate:p.birthDate??"",
  currentCountry:p.currentCountry??"",currentDivision:p.currentDivision??null};
}
function makeArchivePremierLeagueGrid(players:GamePlayer[],seed:number){
 const buckets=new Map<string,GamePlayer[]>(),clubLabels=new Map<string,string>();
 for(const player of players){
  const nation=player.nationality;if(!nation||nation==="Unlisted")continue;
  const seenClubs=new Set<string>();
  for(const spell of player.careerSpells){
   const key=gridClubKey(spell.club);if(!HISTORIC_PREMIER_LEAGUE_CLUBS.some(club=>gridClubKey(club)===key)||seenClubs.has(key))continue;
   seenClubs.add(key);clubLabels.set(key,HISTORIC_PREMIER_LEAGUE_CLUBS.find(club=>gridClubKey(club)===key)||spell.club);
   const bucketKey=key+":"+normalise(nation),list=buckets.get(bucketKey)??[];
   if(!list.some(existing=>existing.archiveId===player.archiveId))list.push(player);
   buckets.set(bucketKey,list);
  }
 }
 const eligible=HISTORIC_PREMIER_LEAGUE_CLUBS.map(club=>gridClubKey(club)).filter(key=>{
  const nations=new Set([...buckets.keys()].filter(bucket=>bucket.startsWith(key+":")).map(bucket=>bucket.slice(key.length+1)));
  return nations.size>=4;
 });
 if(eligible.length<4)return null;
 for(let attempt=0;attempt<4000;attempt++){
  const clubs=shuffle(eligible,seed+attempt*7919).slice(0,4);
  if(clubs.length!==4)continue;
  const common=[...new Set(clubs.flatMap(club=>[...buckets.keys()].filter(bucket=>bucket.startsWith(club+":")).map(bucket=>bucket.slice(club.length+1))))]
   .filter(nation=>clubs.every(club=>(buckets.get(club+":"+nation)?.length??0)>=1));
  if(common.length<4)continue;
  const countries=shuffle(common,seed+attempt*104729).slice(0,4);
  const answers=clubs.map(club=>countries.map(nation=>shuffle(buckets.get(club+":"+nation)??[],seed+attempt+club.length*nation.length).slice(0,12)));
  if(answers.some(row=>row.some(cell=>cell.length===0))||!hasUniqueGridAssignment(answers))continue;
  return {clubs:clubs.map(key=>clubLabels.get(key)??key),countries: countries.map(value=>players.find(player=>normalise(player.nationality)===value)?.nationality??value),answers};
 }
 return null;
}
function hasUniqueGridAssignment(rows:GamePlayer[][][]):boolean{
 const cells=rows.flat().map((players,index)=>({index,players:[...new Map(players.map(player=>[player.archiveId,player])).values()]}));
 if(cells.length!==16||cells.some(cell=>cell.players.length===0))return false;
 cells.sort((a,b)=>a.players.length-b.players.length||a.index-b.index);
 const assigned=new Map<string,number>();
 const place=(cellIndex:number,seen:Set<string>):boolean=>{
  for(const player of cells[cellIndex].players){
   const id=player.archiveId;if(seen.has(id))continue;seen.add(id);
   const previous=assigned.get(id);
   if(previous===undefined||place(previous,seen)){assigned.set(id,cellIndex);return true;}
  }
  return false;
 };
 return cells.every((_cell,index)=>place(index,new Set<string>()));
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
 const [archiveGridPlayers,setArchiveGridPlayers]=useState<GamePlayer[]>([]);
 const [archiveGridLoading,setArchiveGridLoading]=useState(true);
 const [archiveGridError,setArchiveGridError]=useState("");
 const [gridReload,setGridReload]=useState(0);
 const done=account.daily[utcDay()]?.["football-grid"]!==undefined;
 const seed=mode==="daily"?hashSeed("GRID:"+utcDay()+":"+difficulty):hashSeed("GRID:practice:"+practiceSeed+":"+difficulty);
 useEffect(()=>{
  let live=true;setArchiveGridLoading(true);setArchiveGridError("");
  getArchiveGamePlayers(4000,mode==="daily"?"PLAYGROUND-GRID:"+utcDay():"PLAYGROUND-GRID:PRACTICE:"+practiceSeed)
   .then(rows=>{if(live){setArchiveGridPlayers(rows.map(archiveGamePlayerToGamePlayer));setArchiveGridLoading(false)}})
   .catch(error=>{if(live){setArchiveGridError(error instanceof Error?error.message:"The career archive could not be loaded.");setArchiveGridLoading(false)}});
  return()=>{live=false};
 },[mode,practiceSeed,gridReload]);
 const playerPool=archiveGridPlayers;
 const puzzle=useMemo(()=>makeArchivePremierLeagueGrid(playerPool,seed),[playerPool,seed,difficulty]);
 
 const check=()=>{
   if(active===null||!guess.trim()||!puzzle)return;
   const row=Math.floor(active/4),col=active%4,accepted=puzzle.answers[row][col],player=archiveGuess(guess,accepted);
   if(player&&values.some((value,index)=>index!==active&&normalise(value)===normalise(player.name))){setGridNotice("That player is already used in another square. Every grid answer must be a different footballer.");return;}
   if(player){const label=player.name,next=opened.includes(active)?opened:[...opened,active];setValues(v=>v.map((x,i)=>i===active?label:x));setOpened(next);setActive(null);setGuess("");setGridNotice("");if(next.length===16&&mode==="daily")onDaily("football-grid",Math.max(100,1000-next.length*15));}
   else setGridNotice("That player does not have a verified Premier League spell at this club and the selected nationality.");
 };
 const reset=(newMode:Mode=mode,newDifficulty:GridDifficulty=difficulty)=>{
   setValues(Array(16).fill(""));setOpened([]);setActive(null);setGuess("");setGridNotice("");
   if(newMode==="practice")setPracticeSeed(String(Math.floor(Math.random()*1e12)));
   setDifficulty(newDifficulty);
 };
 return <Frame account={account} game="football-grid" eyebrow="ENGLISH CLUB × NATIONALITY / 4 BY 4" title="FILL THE GRID." description="Sixteen squares. Match a past or present Premier League club badge with a national flag. Enter any player with a verified spell for that club and that nationality." number="07" mode={mode} setMode={m=>{setMode(m);reset(m);}}>
 {done&&mode==="daily"?<Success title="GRID COMPLETE." detail="All sixteen cells are filled. Try a fresh grid in unlimited practice." button="PRACTICE GRID" onAgain={()=>{setMode("practice");reset("practice");}}/>:
  <Card className="grid-game">
   <div className="arc-game-meta"><span>16 ANSWERS / 16 CELLS</span><b>{opened.length}/16 FILLED</b></div>
   <div className="grid-difficulty">{GRID_LEVELS.map(level=><button key={level} className={difficulty===level?"active":""} onClick={()=>reset(mode,level)}>{difficultyLabel(level)}</button>)}</div>
   {archiveGridLoading&&playerPool.length===0?<div className="grid-loading"><motion.div animate={{rotate:360}} transition={{duration:1.5,repeat:Infinity,ease:"linear"}}>⚽</motion.div><b>BUILDING YOUR GRID</b><span>Finding past and present Premier League player intersections by club and national flag.</span></div>:
    puzzle?<><div className="football-grid-wrap grid-four"><div className="grid-corner">ENGLISH CLUB ↓<br/>NATION →</div>{puzzle.countries.map(country=><div className="grid-col-head" key={country}><CountryFlag name={country}/><span>{country}</span></div>)}{puzzle.clubs.map((club,ri)=><><div className="grid-row-head" key={"r"+ri}><ClubBadge name={club} size={30}/><b>{club}</b></div>{puzzle.countries.map((country,ci)=>{const id=ri*4+ci,doneCell=opened.includes(id);return <button key={id} className={"grid-cell "+(doneCell?"filled":"")+(active===id?" active":"")} onClick={()=>{setActive(id);setGuess("");setGridNotice("");}}><small>{club} × {country}</small><b>{values[id]||"?"}</b></button>;})}</>)}</div>
     <div className="grid-game-bottom"><span>{difficulty} · {puzzle.answers.flat().reduce((n,cell)=>n+cell.length,0)} ACCEPTED PLAYER/CELL MATCHES</span>{mode==="practice"&&<button className="arc-quiet" onClick={()=>reset(mode,difficulty)}>NEW GRID ↻</button>}</div>
     {active!==null&&<div className="grid-answer"><small>{puzzle.clubs[Math.floor(active/4)]} × {puzzle.countries[active%4]}</small><input value={guess} onChange={e=>setGuess(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")check();}} placeholder="Full name or surname…"/><button className="arc-button" onClick={check}>CHECK ↗</button></div>}
     {gridNotice&&<div className="arc-feedback"><b>NOT A MATCH.</b><p>{gridNotice}</p></div>}
     <p className="arc-muted">Every square is checked against a dated Premier League club spell and recorded nationality. There may be several valid answers per square, but you cannot reuse a footballer in another square. Source: OpenFootballBase-Data archive; season totals are unverified and attribution is shown in Career File.</p>
    </>:
    <div className="arc-feedback"><b>{archiveGridError?"CAREER ARCHIVE UNAVAILABLE":"NO VALID 4×4 GRID IN THIS DRAW"}</b><p>{archiveGridError||"This player sample did not produce sixteen unique Premier League intersections. Draw again to search a fresh sample."}</p><button className="arc-button" onClick={()=>{setGridReload(value=>value+1);reset(mode,difficulty);}}>RETRY / NEW DRAW ↗</button></div>}
  </Card>}
 </Frame>;
}

type LadderMetric="internationalGoals";
type LadderDifficulty="EASY"|"STANDARD"|"HARD"|"EXTREME";
type LadderEntry={id:string;name:string;value:number};
const LADDER_METRICS:{id:LadderMetric;label:string;short:string}[]=[{id:"internationalGoals",label:"Recorded senior international goals",short:"INTL GOALS"}];
function LadderPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();
 const [difficulty,setDifficulty]=useState<LadderDifficulty>("STANDARD");
 const [metric,setMetric]=useState<LadderMetric>("internationalGoals");
 const [practiceSeed,setPracticeSeed]=useState(()=>String(Math.floor(Math.random()*1e12)));
 const [players,setPlayers]=useState<LadderEntry[]>([]);
 const [submitted,setSubmitted]=useState(false);
 const done=account.daily[utcDay()]?.ladder!==undefined;
 const seed=mode==="daily"?"LADDER:"+utcDay():"LADDER:PRACTICE:"+practiceSeed;
 const {data:goalData,loading,error,retry}=useFootballKnowledge("goal-packs");
 const ladderPacks=goalData?.ladderPacks??[];
 const generated=useMemo(()=>{
   const candidates=ladderPacks.filter(pack=>{const values=pack.players.map(p=>p.value??0),range=(Math.max(...values)-Math.min(...values))/Math.max(1,Math.max(...values));return difficulty==="EASY"?range>=.45:difficulty==="STANDARD"?range>=.22&&range<.6:difficulty==="HARD"?range>=.08&&range<.32:range<.16});
   const source=candidates.length?candidates:ladderPacks;
   const pack=source.length?source[hashSeed(seed+":"+metric+":"+difficulty)%source.length]:null;
   return pack?pack.players.map(p=>({id:p.id,name:p.name,value:p.value??0})): [];
 },[ladderPacks,difficulty,metric,seed]);
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
 return <Frame account={account} game="ladder" eyebrow="ORDER THE NUMBERS / INTERNATIONAL ARCHIVE" title="THE LADDER." description="Drag five footballers into order by recorded senior international goals. Choose a difficulty and beat the source-backed ranking." number="08" mode={mode} setMode={m=>{setMode(m);reset(m);}}>
 {done&&mode==="daily"?<Success title="TODAY'S ORDER IS LOCKED." detail="The daily Ladder is complete. Unlimited practice uses fresh CC0 goal-record packs." button="PRACTICE" onAgain={()=>{setMode("practice");reset("practice");}}/>:
  <Card className="ladder-game">
   <div className="arc-game-meta"><span>{players.length}/5 PLAYERS LOADED</span><b>{difficulty} · {metricLabel.toUpperCase()}</b></div>
   <div className="grid-difficulty">{(["EASY","STANDARD","HARD","EXTREME"] as LadderDifficulty[]).map(level=><button key={level} className={difficulty===level?"active":""} onClick={()=>reset(mode,level,metric)}>{difficultyLabel(level)}</button>)}</div>
   <div className="ladder-control-row"><label>STAT<select value={metric} onChange={e=>reset(mode,difficulty,e.target.value as LadderMetric)}>{LADDER_METRICS.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label><span>HIGHEST → LOWEST</span></div>
   {loading&&ladderPacks.length===0?<div className="grid-loading"><motion.div animate={{rotate:360}} transition={{duration:1.5,repeat:Infinity,ease:"linear"}}>⚽</motion.div><b>SCOUTING THE LADDER</b><span>Building a fresh set from the CC0 international goal records.</span></div>:
    players.length<5?<div className="arc-feedback"><b>{error?"CC0 PLAYER DATABASE UNAVAILABLE":"NOT ENOUGH RECORDED GOAL DATA"}</b><p>{error||"The source does not contain enough unique players for this set. Try again later."}</p><button className="arc-button" onClick={()=>{retry();reset(mode,difficulty,metric);}}>RETRY / NEW SET ↗</button></div>:
    <>
     <Reorder.Group axis="y" values={players} onReorder={setPlayers} className="ladder-list">
      {players.map((p,i)=><Reorder.Item key={p.id} value={p} className="ladder-item" whileDrag={{scale:1.025,boxShadow:"0 10px 24px #0002",zIndex:5}}>
       <strong>{i+1}</strong><span>{p.name}</span><small className="ladder-grab">⠿ DRAG</small>
       <div><button aria-label={"Move "+p.name+" up"} onClick={()=>move(i,-1)} disabled={submitted||i===0}>↑</button><button aria-label={"Move "+p.name+" down"} onClick={()=>move(i,1)} disabled={submitted||i===4}>↓</button></div>
      </Reorder.Item>)}
     </Reorder.Group>
     {submitted?<div className="arc-feedback"><b>{score===1000?"PERFECT ORDER.":"ORDER REVEALED."} · {score}/1000</b>{expected.map((p,i)=><p key={p.id}>{i+1}. {p.name} — {p.value.toLocaleString("en-GB")}</p>)}</div>:<div className="arc-game-foot"><span>{metricLabel.toUpperCase()} / SOURCE COVERAGE VARIES</span><button className="arc-button" onClick={submit}>LOCK THE ORDER ↗</button></div>}
     <div className="arc-game-foot"><span>FRESH PLAYER SET</span><button className="arc-quiet" onClick={()=>reset(mode,difficulty,metric)}>NEW LADDER ↻</button></div>
     <p className="arc-muted">These are goals recorded in the CC0 men's senior international results source, not guaranteed complete career totals.</p>
    </>}
  </Card>}
 </Frame>;
}

function RevealPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();
 const [practiceSeed,setPracticeSeed]=useState(()=>String(Math.floor(Math.random()*1e12)));
 const [reveal,setReveal]=useState(0);const [guess,setGuess]=useState("");const [tries,setTries]=useState(0);const [end,setEnd]=useState(false);const [won,setWon]=useState(false);const [guessFeedback,setGuessFeedback]=useState("");
 const done=account.daily[utcDay()]?.["the-reveal"]!==undefined;
 const seed=mode==="daily"?"REVEAL:"+utcDay():"REVEAL:PRACTICE:"+practiceSeed;
 const {data:revealData,loading,error,retry}=useFootballKnowledge("the-reveal");
 const playerCards=revealData?.playerCards??[];
 const target=playerCards.length?playerCards[hashSeed(seed+":target")%playerCards.length]:null;
 const years=target?[...target.worldCups].sort((a,b)=>a-b):[];
 const clues=target?[
   {label:"National team",value:target.teams.join(" / ")},
   {label:"World Cup editions",value:years.join(", ")},
   {label:"Starting appearances",value:String(target.matchIds.length)},
   {label:"First appearance",value:String(years[0]??"Not recorded")},
   {label:"Most recent appearance",value:String(years.at(-1)??"Not recorded")}
 ].filter(c=>Boolean(c.value)):[];
 const score=Math.max(0,1000-reveal*100-tries*45);
 const restart=(newMode:Mode=mode)=>{
   if(newMode==="practice")setPracticeSeed(String(Math.floor(Math.random()*1e12)));
   setReveal(0);setGuess("");setTries(0);setEnd(false);setWon(false);setGuessFeedback("");
 };
 const submit=(e:FormEvent)=>{
   e.preventDefault();if(end||!guess.trim()||!target)return;
   const next=tries+1;setTries(next);
   const surname=target.name.trim().split(/\s+/).at(-1)??target.name;
   if(acceptedName(guess,[target.name,surname])){setWon(true);setEnd(true);setGuessFeedback("Correct — the player is identified.");if(mode==="daily")onDaily("the-reveal",score);}
   else if(next>=8){setEnd(true);setGuessFeedback("No guesses left. The player is revealed below.");if(mode==="daily")onDaily("the-reveal",0);}
   else setGuessFeedback("Not this time. Try the surname or full name again.");
   setGuess("");
 };
 const showNext=()=>{if(reveal<clues.length-1)setReveal(v=>v+1);};
 return <Frame account={account} game="the-reveal" eyebrow="BLUR / CLUE / IDENTIFY" title="THE REVEAL." description="A mystery player from the World Cup archive. Use their national team and tournament appearances, reveal more clues when you need them, then name the footballer." number="09" mode={mode} setMode={m=>{setMode(m);restart(m);}}>
 {done&&mode==="daily"?<Success title="MYSTERY SOLVED." detail="Today's Reveal is complete. World Cup archive practice has a fresh target." button="PRACTICE" onAgain={()=>{setMode("practice");restart("practice");}}/>:
  loading&&playerCards.length===0?<Card className="reveal-loading"><motion.div animate={{rotate:360}} transition={{duration:1.5,repeat:Infinity,ease:"linear"}}>⚽</motion.div><b>OPENING THE WORLD CUP DOSSIER</b><span>SCANNING VERIFIED STARTING-LINE-UP RECORDS…</span></Card>:
  !target?<Card className="arc-feedback"><b>{error?"FOOTBALL DATABASE UNAVAILABLE":"NO WORLD CUP PLAYER CARDS FOUND"}</b><p>{error||"The CC0 World Cup player pool could not be loaded. Try again."}</p><button className="arc-button" onClick={()=>{retry();restart(mode);}}>RETRY DATABASE ↗</button></Card>:
  <Card className="reveal-game">
   <div className="arc-game-meta"><span>CLUE {Math.min(reveal+1,clues.length)} / {clues.length}</span><b>{Math.max(0,8-tries)} GUESSES · {score} PTS AVAILABLE</b></div>
   <div className="reveal-portrait"><motion.div className={"reveal-silhouette r"+Math.min(3,reveal)} animate={{scale:[1,1.015,1]}} transition={{duration:3,repeat:Infinity,ease:"easeInOut"}}><span>{end?target.name.split(" ").map(x=>x[0]).join("").slice(0,2):"?"}</span></motion.div><small>WORLD CUP ARCHIVE / PORTRAIT NOT CONNECTED</small></div>
   <div className="reveal-clues">{clues.slice(0,reveal+1).map((c,i)=><motion.p key={c.label} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}}><span>0{i+1}</span><b>{c.label}:</b> {c.value}</motion.p>)}</div>
   <div className="reveal-actions"><button className="arc-quiet" onClick={showNext} disabled={reveal>=clues.length-1||end}>REVEAL NEXT CLUE −100 PTS</button><span>{clues.length-reveal-1} CLUES HIDDEN</span></div>
   <form className="arc-guess-form" onSubmit={submit}><input value={guess} onChange={e=>setGuess(e.target.value)} placeholder="Full name or surname…" disabled={end}/><button className="arc-button" disabled={!guess.trim()||end}>LOCK IN ↗</button></form>
   {guessFeedback&&!end&&<p className="reveal-guess-feedback">{guessFeedback}</p>}
   {end&&<div className="arc-feedback"><b>{won?"GOT THEM.": "THE PLAYER WAS "+target.name}</b><p>{won?"You identified the World Cup player.":"The player represented "+target.teams.join(" / ")+" in "+years.join(", ")+ "."}</p><button className="arc-button" onClick={()=>restart(mode)}>NEXT PLAYER ↗</button></div>}
   <p className="arc-muted">Clues come from recorded FIFA World Cup starting line-ups, not a complete club career or appearance record.</p>
  </Card>}
 </Frame>;
}

type CheckoutMetric="internationalGoals";
type CheckoutDifficulty="EASY"|"STANDARD"|"HARD"|"EXTREME";
type CheckoutPlayer={id:string;name:string;value:number;label:string};
function FiveOhOnePage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();const [difficulty,setDifficulty]=useState<CheckoutDifficulty>("STANDARD");
 const [metric,setMetric]=useState<CheckoutMetric>("internationalGoals");
 const [practiceSeed,setPracticeSeed]=useState(()=>String(Math.floor(Math.random()*1e12)));
 const [remaining,setRemaining]=useState(501);const [turnStart,setTurnStart]=useState(501);
 const [turnPicks,setTurnPicks]=useState<CheckoutPlayer[]>([]);const [used,setUsed]=useState<string[]>([]);
 const [busts,setBusts]=useState(0);const [bust,setBust]=useState(false);const [finish,setFinish]=useState(false);const [runBanked,setRunBanked]=useState(false);
 const done=account.daily[utcDay()]?.["football-501"]!==undefined;
 const seed=mode==="daily"?"501:"+utcDay():"501:PRACTICE:"+practiceSeed;
 const {data:goalData,loading,error,retry}=useFootballKnowledge("goal-packs");
 const football501Packs=goalData?.football501Packs??[];
 const pool=useMemo(()=>{
   const unique=new Map<string,CheckoutPlayer>();
   for(const pack of football501Packs)for(const player of pack.players){const value=player.value??player.goals??0;if(value>0&&!unique.has(player.id))unique.set(player.id,{id:player.id,name:player.name,value,label:player.label??"RECORDED SENIOR INTERNATIONAL GOALS"})}
   return [...unique.values()];
 },[football501Packs]);
 const maxValue=difficulty==="EASY"?100:difficulty==="STANDARD"?60:difficulty==="HARD"?35:20;
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
 return <Frame account={account} game="football-501" eyebrow="THREE DARTS / ONE CHECKOUT" title="FOOTBALL 501." description="Use recorded senior international goal totals as darts to work down from 501. Three picks make a visit. Busting below zero wipes the visit." number="10" mode={mode} setMode={m=>{setMode(m);reset(m);}}>
 {done&&mode==="daily"?<Success title="CHECKOUT BANKED." detail="Today's 501 challenge is complete. Practice is unlimited." button="PRACTICE" onAgain={()=>{setMode("practice");reset("practice");}}/>:
  <Card className="checkout-game">
   <div className="arc-game-meta"><span>VISIT / {Math.floor(used.length/3)+1}</span><b>{difficulty} · {"INTERNATIONAL GOALS RECORDED"}</b></div>
   <div className="grid-difficulty">{(["EASY","STANDARD","HARD","EXTREME"] as CheckoutDifficulty[]).map(level=><button key={level} className={difficulty===level?"active":""} onClick={()=>reset(mode,level,metric)}>{difficultyLabel(level)}</button>)}</div>
   <div className="checkout-scoreboard">
    <div className="checkout-target"><span>REMAINING</span><strong key={remaining}>{remaining}</strong><small>{remaining===0?"CHECKOUT!":remaining<=170?"ON THE FINISH":"301 / 501 CLUBHOUSE"}</small></div>
    <div className="checkout-dartboard"><div className="dart-ring ring-one"/><div className="dart-ring ring-two"/><div className="dart-ring ring-three"/><div className="dart-bull"/><motion.div className="dart-flight" animate={{x:[-30,6,0],y:[-26,4,0],rotate:[-35,8,0],opacity:[0,1,1]}} transition={{duration:.48,repeat:Infinity,repeatDelay:1.8}}/></div>
   </div>
   <div className="checkout-turn"><div><small>THIS VISIT</small><b>{turnPicks.length} / 3 DARTS</b></div><div className="checkout-dart-slots">{[0,1,2].map(i=><div className={turnPicks[i]?"hit":""} key={i}><small>DART {i+1}</small><b>{turnPicks[i]?turnPicks[i].value:"—"}</b></div>)}</div><div className="checkout-turn-total"><small>VISIT TOTAL</small><strong>{currentVisitTotal}</strong></div></div>
   {loading&&pool.length===0?<div className="grid-loading"><motion.div animate={{rotate:360}} transition={{duration:1.4,repeat:Infinity,ease:"linear"}}>⚽</motion.div><b>SCOUTING THE CC0 DARTS POOL</b><span>Collecting source-backed international goal records.</span></div>:
    <><div className="arc-game-meta"><span>CHOOSE A PLAYER AS YOUR NEXT DART</span><b>{options.length} OPTIONS</b></div><div className="checkout-cards">{options.map(p=><button key={p.id} disabled={turnPicks.length===3||finish||runBanked||bust} onClick={()=>pick(p)}><small>{p.name}</small><b>{p.value.toLocaleString("en-GB")}</b><i>{p.label}</i></button>)}</div></>}
   {bust&&<div className="arc-feedback"><b>BUST — VISIT WIPED.</b><p>Your total stays at {turnStart}. The three darts in that visit score zero.</p><button className="arc-button" onClick={()=>setBust(false)}>RESET DARTS ↗</button></div>}
   {visitEnded&&!finish&&<div className="arc-feedback"><b>VISIT COMPLETE · {currentVisitTotal} POINTS</b><p>You are now on {remaining}. Start the next visit when you're ready.</p><button className="arc-button" onClick={nextVisit}>NEXT VISIT ↗</button></div>}
   {(finish||runBanked)&&<div className="arc-feedback"><b>{remaining===0?"CHECKOUT!":"RUN BANKED."} · {score}/1000</b><p>{remaining===0?"Exactly zero — perfect finish.":"You finished "+remaining+" away from zero after "+busts+" busts."}</p><button className="arc-button" onClick={()=>reset(mode)}>ANOTHER RUN ↗</button></div>}
   <div className="arc-game-foot"><span>{used.length} PLAYERS USED · {busts} BUSTS</span><button className="arc-button" disabled={used.length===0||finish||runBanked} onClick={bankRun}>BANK SCORE ↗</button><button className="arc-quiet" onClick={()=>reset(mode)}>RESET</button></div>
   <p className="arc-muted">Recorded senior international goals from the CC0 source are not guaranteed complete career totals. This is a custom player-stat darts mode, not official PDC scoring.</p>
   {error&&<div className="arc-feedback"><b>CC0 STAT DATABASE UNAVAILABLE</b><p>The international goal-record pool could not be loaded.</p><button className="arc-quiet" onClick={retry}>RETRY DATABASE</button></div>}
  </Card>}
 </Frame>;
}

type LinkDifficulty="EASY"|"STANDARD"|"HARD"|"EXTREME";
function LinkUpPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();const [difficulty,setDifficulty]=useState<LinkDifficulty>("STANDARD");
 const [practiceSeed,setPracticeSeed]=useState(()=>String(Math.floor(Math.random()*1e12)));
 const [index,setIndex]=useState(0);const [score,setScore]=useState(0);const [penalty,setPenalty]=useState(0);
 const [wrongCount,setWrongCount]=useState(0);const [extraLifeUsed,setExtraLifeUsed]=useState(false);
 const [hintCount,setHintCount]=useState(0);const [answered,setAnswered]=useState(false);const [failed,setFailed]=useState(false);
 const [notice,setNotice]=useState("");const [finished,setFinished]=useState(false);
 const usageKey="playground.link-up.practice.v1";
 const [practiceUses,setPracticeUses]=useState<Record<string,number>>(()=>{
   try{const parsed=JSON.parse(localStorage.getItem(usageKey)||"{}");return parsed&&typeof parsed==="object"?parsed:{};}catch{return {};}
 });
 useEffect(()=>{try{localStorage.setItem(usageKey,JSON.stringify(practiceUses));}catch{/* local practice quota is best-effort */}},[practiceUses]);
 const practiceUsed=practiceUses[utcDay()]??0;
 const practiceLimitReached=mode==="practice"&&practiceUsed>=10;
 const done=account.daily[utcDay()]?.["link-up"]!==undefined;
 const seed=mode==="daily"?"LINK:"+utcDay():"LINK:PRACTICE:"+practiceSeed;
 const {data:careerData,loading,error,retry}=useFootballKnowledge("career-history");
 const pool=useMemo(()=> (careerData?.players??[]).map(profile=>archivePlayerToGamePlayer(cc0CareerToArchiveGamePlayer(profile))),[careerData]);
 const questions=useMemo(()=>{
   if(!careerData?.linkUpPacks?.length)return [];
   const byId=new Map(careerData.players.map(profile=>[profile.id,archivePlayerToGamePlayer(cc0CareerToArchiveGamePlayer(profile))]));
   const eligible=careerData.linkUpPacks.flatMap(pack=>{
     const start=byId.get(pack.startPlayerId),end=byId.get(pack.endPlayerId),answer=byId.get(pack.answerPlayerId);
     const options=pack.optionPlayerIds.flatMap(id=>{const player=byId.get(id);return player?[player]:[];});
     return start&&end&&answer&&options.length===pack.optionPlayerIds.length&&options.some(player=>player.archiveId===answer.archiveId)
       ?[{start,end,answer,startClub:pack.startClub,endClub:pack.endClub,options}]
       :[];
   });
   const ordered=shuffle(eligible,hashSeed(seed+":"+difficulty));
   const unique=Array.from(new Map(ordered.map(question=>[question.answer.archiveId,question])).values());
   return unique.slice(0,10);
 },[careerData,seed,difficulty]);
 const q=questions[index];
 const currentPoints=Math.max(0,1000-penalty);
 const answerSpell=(club:string)=>q?.answer.careerSpells.find(spell=>normalise(spell.club)===normalise(club));
 const spellWindow=(club:string)=>{const spell=answerSpell(club);return spell?spell.startYear+"–"+(spell.endYear??"end date not recorded"):"membership dates not recorded";};
 const hintValue=q?[
   q.answer.nationality||"Nationality not recorded",
   q.answer.position||"Position not recorded",
   q.startClub+": "+spellWindow(q.startClub)+" · "+q.endClub+": "+spellWindow(q.endClub),
   q.answer.firstYear!==null&&q.answer.lastYear!==null?q.answer.firstYear+"–"+q.answer.lastYear:"Career span not recorded"
 ][hintCount-1]??"": "";
 const canGuess=!answered&&!failed&&wrongCount<(extraLifeUsed?4:3);
 const completeQuestion=()=>{
   setAnswered(false);setFailed(false);setWrongCount(0);setPenalty(0);setExtraLifeUsed(false);setHintCount(0);setNotice("");
   if(index+1>=questions.length){
     setFinished(true);
     if(mode==="daily")onDaily("link-up",score);
     else setPracticeUses(old=>({...old,[utcDay()]:Math.min(10,(old[utcDay()]??0)+1)}));
   }else setIndex(v=>v+1);
 };
 const submit=(name:string)=>{
   if(!q||!canGuess)return;
   const key=normalise(name);
   const correct=[q.answer.name,q.answer.surname,...q.answer.aliases].some(alias=>normalise(alias)===key);
   if(correct){
     setAnswered(true);setNotice("Correct link found.");
     setScore(old=>old+currentPoints);
     return;
   }
   const next=wrongCount+1;setWrongCount(next);setPenalty(old=>old+100);
   setNotice("Not the link. −100 points. Keep looking.");
   if(next>=4&&extraLifeUsed)setFailed(true);
 };
 const useHint=()=>{
   if(!q||answered||failed||hintCount>=4)return;
   setHintCount(v=>v+1);setPenalty(v=>v+100);
 };
 const buyExtraLife=()=>{
   if(extraLifeUsed||wrongCount<2||answered||failed)return;
   setExtraLifeUsed(true);setPenalty(v=>v+100);setNotice("Extra life added. −100 points.");
 };
 const skipQuestion=()=>{
   if(!q||answered)return;
   setFailed(true);setNotice("Question skipped. The answer stays hidden.");
 };
 const reset=(newMode:Mode=mode,newDifficulty:LinkDifficulty=difficulty)=>{
   setMode(newMode);setDifficulty(newDifficulty);setIndex(0);setScore(0);setPenalty(0);
   setWrongCount(0);setExtraLifeUsed(false);setHintCount(0);setAnswered(false);setFailed(false);setFinished(false);setNotice("");
   if(newMode==="practice")setPracticeSeed(String(Math.floor(Math.random()*1e12)));
 };
 return <Frame account={account} game="link-up" eyebrow="SHARED TEAM-MATES / TEN CONNECTIONS" title="THE LINK UP." description="Connect two players through one team-mate with overlapping spells at English clubs. Every link is English-football based, with four progressive hints if you get stuck." number="11" mode={mode} setMode={m=>reset(m)}>
 {done&&mode==="daily"?<Success title="TEN LINKS COMPLETE." detail="Today's ten-question Link Up challenge is banked. Ten practice runs are available each day on this device." button="PRACTICE" onAgain={()=>reset("practice")}/>:
  loading&&pool.length===0?<div className="grid-loading"><motion.div animate={{rotate:360}} transition={{duration:1.4,repeat:Infinity,ease:"linear"}}>⚽</motion.div><b>CONNECTING CAREERS</b><span>Finding verified overlapping club-membership records in the CC0 career archive.</span></div>:
  error&&pool.length===0?<Card className="arc-feedback"><b>CC0 CAREER ARCHIVE UNAVAILABLE</b><p>{error}</p><button className="arc-button" onClick={retry}>RETRY CC0 ARCHIVE ↗</button></Card>:
  practiceLimitReached?<Card className="arc-result"><small>PRACTICE LIMIT REACHED</small><h2>THAT'S TEN RUNS.</h2><p>You have completed ten free ten-question Link Up runs today on this device. The allowance resets at 00:00 GMT.</p></Card>:
  finished?<Success title="FULL-TIME." detail={"You scored "+score+" points across "+questions.length+" connections."+(mode==="practice"?" Practice run "+practiceUsed+" of 10 used today.":"")} button="NEW TEN-LINK RUN" onAgain={()=>reset(mode)}/>:
  questions.length!==10||!q?<Card className="arc-feedback"><b>{error?"CC0 CAREER ARCHIVE UNAVAILABLE":"NOT ENOUGH VERIFIED CC0 LINKS FOR A FULL TEN-QUESTION RUN"}</b><p>{error||"The English-club career snapshot did not produce ten unique, unambiguous bridge players. Retry the source or return when the next snapshot is available."}</p><button className="arc-button" onClick={()=>{retry();reset(mode,difficulty);}}>RETRY LINK ARCHIVE ↗</button></Card>:
  <Card className="link-game">
   {mode==="practice"&&<div className="grid-difficulty">{(["EASY","STANDARD","HARD","EXTREME"] as LinkDifficulty[]).map(level=><button key={level} className={difficulty===level?"active":""} onClick={()=>reset(mode,level)}>{level==="STANDARD"?"MEDIUM / STANDARD":level}</button>)}</div>}
   <div className="arc-game-meta"><span>{mode==="daily"?"DAILY LINK":"PRACTICE · "+difficulty} · QUESTION {index+1}/10</span><b><ScoreTicker value={score} suffix=" PTS"/></b></div>
   <div className="link-score-row"><span>QUESTION VALUE</span><b><ScoreTicker value={currentPoints}/> / 1,000</b><span>{wrongCount} WRONG · {hintCount} HINTS</span></div>
   <div className="link-bridge">
    <div><small>START PLAYER</small><strong>{q.start.name}</strong><span className="link-club-evidence"><ClubBadge name={q.startClub} size={22}/>{q.startClub}</span></div>
    <i>↔</i>
    <div><small>END PLAYER</small><strong>{q.end.name}</strong><span className="link-club-evidence"><ClubBadge name={q.endClub} size={22}/>{q.endClub}</span></div>
   </div>
   <div className="link-evidence"><span>FIND THE ONE PLAYER WHO OVERLAPPED BOTH ENDPOINTS. · {q.options.length} OPTIONS</span><b>ARCHIVE WINDOW / {q.startClub} + {q.endClub}</b></div>
   {!answered&&!failed&&<div className="missing-options">{q.options.map(p=><button type="button" key={p.archiveId} onClick={()=>submit(p.name)} disabled={!canGuess}>{p.name}</button>)}</div>}
   {notice&&<p className={"link-notice "+(answered?"correct":"")}>{notice}</p>}
   {hintCount>0&&!answered&&<div className="link-hint"><small>HINT {hintCount}/4 · −100 PTS</small><b>{["NATION","POSITION","ENGLISH CLUB SPELL WINDOWS","CAREER SPAN"][hintCount-1]}: {hintValue}</b></div>}
   {!answered&&!failed&&<div className="link-tools">
     <button className="arc-quiet" onClick={useHint} disabled={hintCount>=4}>HINT −100 PTS</button>
     {wrongCount>=2&&!extraLifeUsed&&<button className="arc-button" onClick={buyExtraLife}>BUY ONE EXTRA LIFE −100</button>}
     {wrongCount>=3&&<button className="arc-quiet" onClick={skipQuestion}>SKIP WITHOUT REVEAL</button>}
   </div>}
   {answered&&<div className="arc-feedback quiz-goal"><b>BRIDGE FOUND. +{currentPoints} PTS</b><p>{q.answer.name} has recorded overlapping career spells with {q.start.name} at {q.startClub}, and with {q.end.name} at {q.endClub}. This uses archive year overlap, not minute-by-minute appearance data.</p><button className="arc-button" onClick={completeQuestion}>{index===9?"FINISH DAILY RUN":"NEXT LINK ↗"}</button></div>}
   {failed&&<div className="arc-feedback quiz-miss"><b>LINK SKIPPED · NO POINTS</b><p>The answer is not revealed. Keep your points and move on to the next connection.</p><button className="arc-button" onClick={completeQuestion}>{index===9?"FINISH RUN":"NEXT LINK ↗"}</button></div>}
   <p className="arc-muted">A wrong guess or hint costs 100 points. After two wrong guesses you can buy one extra attempt. The correct player is revealed only after you solve the link.</p>
   <div className="arc-game-foot"><span>{mode==="daily"?"DAILY CHALLENGE":Math.max(0,10-practiceUsed)+" PRACTICE RUNS LEFT TODAY"}</span><span>10 QUESTIONS · 1,000 STARTING PTS EACH</span></div>
  </Card>}
 </Frame>;
}

type MissingDifficulty="EASY"|"STANDARD"|"HARD"|"EXTREME";
const MISSING_LEVELS:MissingDifficulty[]=["EASY","STANDARD","HARD","EXTREME"];
function MissingXIPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();const [difficulty,setDifficulty]=useState<MissingDifficulty>("STANDARD");
 const {data:worldCupData,loading,error,retry}=useFootballKnowledge("world-cup");const [attempts,setAttempts]=useState(0);const [end,setEnd]=useState(false);const [won,setWon]=useState(false);
 const [practiceSeed,setPracticeSeed]=useState(()=>String(Math.floor(Math.random()*1e12)));
 const done=account.daily[utcDay()]?.["missing-xi"]!==undefined;
 const seed=mode==="daily"?"MISSING-XI:"+utcDay()+":"+difficulty:"MISSING-XI:PRACTICE:"+practiceSeed+":"+difficulty;

 const lineups=useMemo(()=>worldCupData?.lineups.filter(m=>m.starters.length===11&&m.year>=1982&&m.year<=2026)??[],[worldCupData]);
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
 return <Frame account={account} game="missing-xi" eyebrow="HISTORIC STARTING XI / ONE NAME REMOVED" title="MISSING XI." description="A real World Cup starting line-up from 1982–2026. Ten names remain on the pitch. Find the missing starter." number="12" mode={mode} setMode={m=>{setMode(m);reset(m);}}>
 {done&&mode==="daily"?<Success title="LINE-UP COMPLETE." detail="Today's starting XI has been solved. Unlimited random World Cup practice is open." button="PRACTICE XI" onAgain={()=>{setMode("practice");reset("practice");}}/>:
  error?<Card className="arc-feedback"><b>WORLD CUP DATA UNAVAILABLE</b><p>{error}</p><button className="arc-button" onClick={retry}>RETRY LINE-UPS ↗</button></Card>:
  loading||!match?<Card className="grid-loading"><motion.div animate={{rotate:360}} transition={{duration:1.5,repeat:Infinity,ease:"linear"}}>⚽</motion.div><b>OPENING THE WORLD CUP ARCHIVE</b><span>LOADING MATCHES AND STARTING ELEVENS…</span></Card>:
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

function makeStrandsBoard(pack:typeof STRANDS_PACKS[number]){
 const words=[pack.spangram,...pack.words];
 const baseCycle:Array<[number,number]>=[];
 for(let col=0;col<6;col++)baseCycle.push([0,col]);
 for(let row=1;row<8;row++){
  const cols=row%2===1?[5,4,3,2,1]:[1,2,3,4,5];
  for(const col of cols)baseCycle.push([row,col]);
 }
 baseCycle.push([7,0]);
 for(let row=6;row>=1;row--)baseCycle.push([row,0]);
 if(baseCycle.length!==48)throw new Error("Strands Hamiltonian path must cover 48 cells.");
 const seed=hashSeed(pack.id+":STRANDS");
 const deterministicShuffle=<T,>(items:T[],value:number):T[]=>{
  const copy=[...items];let state=value>>>0;
  for(let i=copy.length-1;i>0;i--){state=(Math.imul(state,1664525)+1013904223)>>>0;const j=state%(i+1);[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy;
 };
 const layouts=deterministicShuffle([0,1,2,3,4,5,6,7],seed);
 let orderedCells:number[]|null=null;
 for(const layout of layouts){
  const flipH=(layout&1)!==0,flipV=(layout&2)!==0,reverse=(layout&4)!==0;
  const cycle=baseCycle.map(([row,col])=>[flipV?7-row:row,flipH?5-col:col] as [number,number]);
  const direction=reverse?-1:1;
  const starts=deterministicShuffle(Array.from({length:48},(_,index)=>index),seed+layout*101);
  for(const start of starts){
   const first=cycle[start],last=cycle[(start+direction*(words[0].length-1)+96)%48];
   if(first[0]!==0||last[0]!==7)continue;
   orderedCells=Array.from({length:48},(_,offset)=>{
    const [row,col]=cycle[(start+direction*offset+96)%48];
    return row*6+col;
   });
   break;
  }
  if(orderedCells)break;
 }
 if(!orderedCells)throw new Error("Could not place the Strands spangram from the top to bottom edge.");
 const paths:number[][]=Array(words.length);
 let cursor=0;
 paths[0]=orderedCells.slice(0,words[0].length);cursor=words[0].length;
 const remainingWords=deterministicShuffle(words.slice(1),seed+991);
 const remainingOrder=deterministicShuffle(words.map((_word,index)=>index).slice(1),seed+1997);
 const byWord=new Map<number,string>();
 remainingOrder.forEach((index,position)=>byWord.set(index,remainingWords[position]));
 for(const index of remainingOrder){
  const word=byWord.get(index)!;
  paths[index]=orderedCells.slice(cursor,cursor+word.length);
  cursor+=word.length;
 }
 if(cursor!==48||new Set(paths.flat()).size!==48)throw new Error("Strands words do not partition the 6 × 8 board.");
 const cells=Array(48).fill("");
 paths.forEach((path,index)=>byWord.has(index)?byWord.get(index)!.split("").forEach((letter,position)=>{cells[path[position]]=letter;}):words[index].split("").forEach((letter,position)=>{cells[path[position]]=letter;}));
 if(cells.some(letter=>!letter))throw new Error("A Strands board has an empty letter cell.");
 return {cells,paths,words,spangram:pack.spangram};
}
function StrandsPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();const [boardNo,setBoardNo]=useState(0);const [selected,setSelected]=useState<number[]>([]);const pathRef=useRef<number[]>([]);const [dragging,setDragging]=useState(false);const [found,setFound]=useState<number[]>([]);const [hintedWords,setHintedWords]=useState<number[]>([]);const [bonusWords,setBonusWords]=useState<string[]>([]);const [bonusHintsUsed,setBonusHintsUsed]=useState(0);const [finished,setFinished]=useState(false);const [notice,setNotice]=useState("");const [practiceSeed,setPracticeSeed]=useState(()=>String(Math.floor(Math.random()*1e12)));const [bonusDictionary,setBonusDictionary]=useState<Set<string>>(()=>new Set());const [dictionaryReady,setDictionaryReady]=useState(false);const done=account.daily[utcDay()]?.strands!==undefined;
 useEffect(()=>{let live=true;fetch("/data/english-wordlist.cc0.txt",{cache:"force-cache"}).then(response=>{if(!response.ok)throw new Error("Dictionary unavailable");return response.text()}).then(content=>{if(live){setBonusDictionary(new Set(content.split(/\s+/).map(word=>word.trim().toLowerCase()).filter(Boolean));setDictionaryReady(true)}}).catch(()=>{if(live)setDictionaryReady(true)});return()=>{live=false}},[]);
 const seed=mode==="daily"?"STRANDS:"+utcDay()+":"+boardNo:"STRANDS:PRACTICE:"+practiceSeed+":"+boardNo;
 const {data:strandsData,loading,error,retry}=useFootballKnowledge("strands");
 const strandsPacks=strandsData?.packs??[];
 const englishLeaguePacks=useMemo(()=>strandsPacks.filter(pack=>pack.theme==="A MATCHDAY ROLL CALL"),[strandsPacks]);
 const useEnglishLeaguePack=englishLeaguePacks.length>0&&hashSeed(seed+":english-leagues")%100<80;
 const preferredStrandsPacks=useEnglishLeaguePack?englishLeaguePacks:strandsPacks;
 const staticOrder=useMemo(()=>shuffle(STRANDS_PACKS,hashSeed("STRANDS:"+utcDay())),[]);
 const pack=preferredStrandsPacks.length?preferredStrandsPacks[hashSeed(seed)%preferredStrandsPacks.length]:(mode==="daily"?staticOrder[boardNo%staticOrder.length]:STRANDS_PACKS[hashSeed(seed)%STRANDS_PACKS.length]);
 const board=useMemo(()=>makeStrandsBoard(pack),[pack]);
 const solved=(index:number)=>found.includes(index);
 const isBlocked=(cell:number)=>board.paths.some((path,idx)=>solved(idx)&&path.includes(cell));
 const beginPath=(cell:number,event:React.PointerEvent<HTMLButtonElement>)=>{
   if(finished||isBlocked(cell))return;
   event.preventDefault();
   // Capture on the board, then hit-test the tile under the pointer for reliable mobile drag selection.
   try{(event.currentTarget.parentElement as HTMLDivElement|null)?.setPointerCapture(event.pointerId);}catch{/* older browsers may not support capture */}
   pathRef.current=[cell];setSelected([cell]);setDragging(true);setNotice("");
 };
 const extendPath=(cell:number)=>{
   if(!dragging||finished||isBlocked(cell))return;
   const path=pathRef.current;const existing=path.indexOf(cell);
   if(existing>=0){const clipped=path.slice(0,existing+1);pathRef.current=clipped;setSelected(clipped);return;}
   const last=path[path.length-1];if(last===undefined)return;
   const r=Math.floor(last/6),c=last%6,rr=Math.floor(cell/6),cc=cell%6;
   if(Math.max(Math.abs(r-rr),Math.abs(c-cc))!==1)return;
   const next=[...path,cell];pathRef.current=next;setSelected(next);
 };
 const handlePointerMove=(event:React.PointerEvent<HTMLDivElement>)=>{
   if(!dragging)return;
   const tile=document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>("[data-strands-cell]");
   if(tile){const cell=Number(tile.dataset.strandsCell);if(Number.isInteger(cell))extendPath(cell);}
 };
 const finishPath=()=>{
   if(!dragging)return;
   setDragging(false);const path=[...pathRef.current];pathRef.current=[];setSelected(path);
   const word=path.map(cell=>board.cells[cell]).join("");
   const isThemeWord=board.words.some(w=>w===word||w.split("").reverse().join("")===word);
   const foundIndex=board.words.findIndex((w,idx)=>!solved(idx)&&(w===word||w.split("").reverse().join("")===word));
   if(foundIndex>=0){
     const next=[...found,foundIndex];setFound(next);setSelected([]);setNotice("");
     if(next.length===board.words.length){setFinished(true);if(mode==="daily")onDaily("strands",1000);}
   }else if(!isThemeWord&&path.length>=4&&/^[A-Z]+$/.test(word)&&!bonusWords.includes(word)&&bonusWords.length<60&&bonusDictionary.has(word.toLowerCase())){
     const next=[...bonusWords,word];setBonusWords(next);setSelected([]);
     const earned=Math.floor(next.length/3);
     setNotice(earned>bonusHintsUsed?"BONUS WORD: "+word+" · HINT UNLOCKED.":"BONUS WORD: "+word+" · "+(next.length%3)+"/3 TOWARDS YOUR NEXT HINT.");
   }else{setNotice(!dictionaryReady?"THE WORD CHECKER IS LOADING — TRY AGAIN IN A MOMENT.":path.length>=4?"NOT A RECOGNISED WORD. TRY A DIFFERENT LETTER PATH.":"DRAG THROUGH ADJACENT LETTERS TO MAKE A WORD.");setSelected([]);}
 };
 const cancelPath=()=>{pathRef.current=[];setSelected([]);setDragging(false);};
 const nextBoard=()=>{setBoardNo(v=>v+1);pathRef.current=[];setSelected([]);setFound([]);setHintedWords([]);setBonusWords([]);setBonusHintsUsed(0);setNotice("");setDragging(false);setFinished(false);};
 const hint=()=>{if(finished)return;if(Math.floor(bonusWords.length/3)<=bonusHintsUsed){setNotice("Find three recognised English words of four or more letters to earn a hint.");return;}const next=board.paths.findIndex((_path,index)=>!found.includes(index)&&!hintedWords.includes(index));if(next>=0){setHintedWords(old=>[...old,next]);setBonusHintsUsed(v=>v+1);setNotice("SCOUTING REPORT: the full letter path of a new hidden theme word is circled.");}};
 const currentDone=found.length===board.words.length;
 const hintedCells=hintedWords.flatMap(index=>board.paths[index]??[]);
 return <Frame account={account} game="strands" eyebrow="6 × 8 LETTER PUZZLE / DAILY THEME" title="FOOTBALL STRANDS." description="A retro football word-search. Trace hidden football names, make real English bonus words anywhere on the board, and earn hints when you get stuck." number="13" mode={mode} setMode={m=>{setMode(m);setBoardNo(0);if(m==="practice")setPracticeSeed(String(Math.floor(Math.random()*1e12)));pathRef.current=[];setSelected([]);setFound([]);setHintedWord(null);setBonusWords([]);setBonusHintsUsed(0);setNotice("");setDragging(false);setFinished(false);}}>
 {done&&mode==="daily"?<Success title="DAILY BOARD CLEARED." detail="Today’s themed Strands board is complete. Fresh club and nation practice boards are available." button="PRACTICE STRANDS" onAgain={()=>{setMode("practice");setPracticeSeed(String(Math.floor(Math.random()*1e12)));nextBoard();}}/>:
  <Card className="strands-game">
   <div className="arc-game-meta"><span>{mode==="daily"?"TODAY’S BOARD":"PRACTICE BOARD "+(boardNo+1)}</span><b>{found.length}/{board.words.length} NAMES FOUND</b></div><div className="strands-bonus-meter"><b>SCOUTING WORDS</b><span>{bonusWords.length%3}/3 TO NEXT HINT</span><small>{bonusWords.length} BONUS WORDS · {Math.max(0,Math.floor(bonusWords.length/3)-bonusHintsUsed)} HINTS READY</small></div>
   <div className="strands-theme"><small>THE THEME</small><strong>{pack.theme}</strong><span>{strandsPacks.length?"Prebuilt CC0 football name pack.":"Fallback football word board."} Select adjacent letters in any direction; diagonal links are allowed.</span></div>
   {loading&&strandsPacks.length===0&&<div className="strands-pool-note">LOADING CC0 STRANDS PACKS…</div>}
   <div className={"strands-grid "+(dragging?"is-dragging":"")} onPointerMove={handlePointerMove} onPointerUp={finishPath} onPointerCancel={cancelPath} onContextMenu={e=>e.preventDefault()}>
    <svg className="strands-trail" viewBox="0 0 600 800" preserveAspectRatio="none" aria-hidden="true">
     {selected.length>1&&<polyline points={selected.map(cell=>{const row=Math.floor(cell/6),col=cell%6;return ((col+.5)/6*600)+","+((row+.5)/8*800);}).join(" ")} fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round"/>}
    </svg>
    {board.cells.map((letter,i)=>{
      const foundWord=found.findIndex(idx=>board.paths[idx].includes(i));const pathIndex=selected.indexOf(i);const isHinted=hintedCells.includes(i);
      return <motion.button type="button" key={i} layout onPointerDown={e=>beginPath(i,e)} onPointerEnter={()=>extendPath(i)} data-strands-cell={i}
        className={(pathIndex>=0?"selected ":"")+(isHinted?" hinted ":"")+(foundWord>=0?(foundWord===0?"spangram":"found"):"")}
        animate={{scale:pathIndex>=0?1.08:1}} transition={{type:"spring",stiffness:430,damping:26}}
        aria-label={"Row "+(Math.floor(i/6)+1)+", column "+(i%6+1)+", letter "+letter}>{letter}</motion.button>;
    })}
   </div>
   <div className="strands-actions"><button className="arc-quiet" onClick={cancelPath}>CLEAR PATH</button><button className="arc-button" onClick={hint} disabled={Math.floor(bonusWords.length/3)<=bonusHintsUsed||finished}>USE EARNED HINT ({bonusHintsUsed}/{Math.floor(bonusWords.length/3)})</button>{mode==="practice"&&<button className="arc-quiet" onClick={nextBoard}>SKIP / NEXT ↗</button>}</div>
   {dragging&&<p className="strands-drag-live">KEEP DRAGGING · RELEASE TO CHECK</p>}
   {notice&&<div className="strands-feedback"><span>{notice}</span><button onClick={cancelPath}>DISMISS</button></div>}
   {hintedWords.length>0&&<p className="arc-muted">SCOUTING REPORT: {hintedWords.length} hidden answer path{hintedWords.length===1?" is":"s are"} circled. Trace the connected letters yourself.</p>}{bonusWords.length>0&&<p className="strands-bonus-list">BONUS WORDS FOUND: {bonusWords.join(" · ")}</p>}
   {currentDone&&<div className="arc-feedback"><b>{mode==="daily"?"DAILY BOARD COMPLETE.":"BOARD COMPLETE."}</b><p>SPANGRAM: {board.spangram} · SCORE: 1,000 PTS</p>{mode==="practice"&&<button className="arc-button" onClick={nextBoard}>NEXT PUZZLE ↗</button>}</div>}
   <div className="strands-legend"><span><i className="blue"/> FOOTBALLER</span><span><i className="gold"/> SPANGRAM / FULL NAME</span></div>
   {error&&<div className="arc-feedback"><b>CC0 STRANDS SHARD UNAVAILABLE</b><p>The curated fallback board remains playable while the game pack loads.</p><button className="arc-quiet" onClick={retry}>RETRY PACKS</button></div>}
  </Card>}
 </Frame>;
}

type QuizDifficulty=QuizTier;
const quizSeconds=(tier:QuizTier)=>tier==="EXTREME"?30:tier==="HARD"?25:tier==="MEDIUM"?15:10;
const quizPoints=(tier:QuizTier)=>tier==="EXTREME"?300:tier==="HARD"?200:tier==="MEDIUM"?150:100;
function QuickQuizPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();const [difficulty,setDifficulty]=useState<QuizDifficulty>("EASY");
 const [practiceSeed,setPracticeSeed]=useState(()=>String(Math.floor(Math.random()*1e12)));
 const [index,setIndex]=useState(0);const [chosen,setChosen]=useState("");const [locked,setLocked]=useState(false);
 const [score,setScore]=useState(0);const [seconds,setSeconds]=useState(15);const [typed,setTyped]=useState("");const [typingDone,setTypingDone]=useState(false);const [finished,setFinished]=useState(false);
 const done=account.daily[utcDay()]?.["timed-quiz"]!==undefined;
 const seed=mode==="daily"?"QUIZ:"+utcDay():"QUIZ:PRACTICE:"+practiceSeed+":"+difficulty;
 const {data:quizData,loading,error,retry}=useFootballQuizKnowledge("timed-quiz");
 const bank=quizData?.questions??[];
 const questions=useMemo(()=>bank.length===0?[]:mode==="daily"?makeCC0DailyQuizRound(bank,hashSeed(seed)):makeCC0QuizRound(bank,difficulty,hashSeed(seed),10),[bank,mode,difficulty,seed]);
 const question=questions[index];
 const progress=question?typed.length/question.question.length:0;
 const levels:QuizDifficulty[]=["EASY","MEDIUM","HARD","EXTREME"];
 useEffect(()=>{
   setIndex(0);setChosen("");setLocked(false);setScore(0);setSeconds(15);setTyped("");setTypingDone(false);setFinished(false);
 },[difficulty,mode,practiceSeed]);
 useEffect(()=>{
   if(!question||finished)return;
   setTyped("");setTypingDone(false);setSeconds(quizSeconds(question.tier));setChosen("");setLocked(false);
   let cursor=0;
   const timer=window.setInterval(()=>{
     cursor+=1;setTyped(question.question.slice(0,cursor));
     if(cursor>=question.question.length){window.clearInterval(timer);setTypingDone(true);}
   },18);
   return()=>window.clearInterval(timer);
 },[question?.id,finished]);
 useEffect(()=>{
   if(!typingDone||locked||finished)return;
   if(seconds<=0){setLocked(true);setChosen("");return;}
   const timer=window.setTimeout(()=>setSeconds(v=>Math.max(0,v-1)),1000);
   return()=>window.clearTimeout(timer);
 },[typingDone,locked,finished,seconds]);
 const choose=(value:string)=>{
   if(!typingDone||locked||finished||!question)return;
   setChosen(value);setLocked(true);
   if(value===question.answer)setScore(v=>v+quizPoints(question.tier));
 };
 const next=()=>{
   if(index+1>=questions.length){setFinished(true);if(mode==="daily")onDaily("timed-quiz",score);return;}
   setIndex(v=>v+1);
 };
 const restart=(newMode:Mode=mode,newDifficulty:QuizDifficulty=difficulty)=>{
   setDifficulty(newDifficulty);setIndex(0);setChosen("");setLocked(false);setScore(0);setSeconds(15);setTyped("");setTypingDone(false);setFinished(false);
   if(newMode==="practice")setPracticeSeed(String(Math.floor(Math.random()*1e12)));
 };
 return <Frame account={account} game="timed-quiz" eyebrow="17 DAILY QUESTIONS / ENGLISH FOOTBALL FIRST" title="THE QUICK QUIZ." description="English leagues dominate: fifteen of today’s seventeen questions are English domestic, with just two selected Champions League or World Cup questions. Practice rounds follow the same English-first mix." number="16" mode={mode} setMode={m=>{setMode(m);restart(m);}}>
 {done&&mode==="daily"?<Success title="FULL-TIME." detail="Today's 17-question English-first quiz has been banked. Practice runs are ten questions each." button="PRACTICE QUIZ" onAgain={()=>{setMode("practice");restart("practice");}}/>:
  loading&&!bank?<Card className="quiz-loading"><motion.div animate={{scale:[1,1.08,1],rotate:[0,12,-12,0]}} transition={{duration:1.4,repeat:Infinity}}>⚽</motion.div><b>THE QUIZMASTER IS PICKING THE QUESTIONS</b><span>OPENING THE VALIDATED FOOTBALL QUESTION BANK…</span></Card>:
  error||bank.length===0?<Card className="arc-feedback"><b>QUESTION BANK UNAVAILABLE</b><p>{error||"The validated football question bank could not be opened."}</p><button className="arc-button" onClick={retry}>RETRY QUESTION BANK ↗</button></Card>:
  !questions.length?<Card className="arc-feedback"><b>NOT ENOUGH QUESTIONS FOR THIS RUN</b><p>The bank did not contain enough distinct player records for this round.</p><button className="arc-button" onClick={retry}>RETRY QUESTION BANK ↗</button></Card>:
  finished?<Success title="FULL-TIME." detail={"You scored "+score+" points across "+questions.length+" questions."} button="NEW QUIZ" onAgain={()=>restart(mode)}/>:
  <Card className="quiz-game">
   {mode==="practice"?<div className="grid-difficulty">{levels.map(level=><button key={level} className={difficulty===level?"active":""} onClick={()=>restart(mode,level)}>{level==="MEDIUM"?"MEDIUM / STANDARD":level}</button>)}</div>:
    <div className="quiz-daily-mix"><span>5 EASY</span><span>5 MEDIUM</span><span>5 HARD</span><span>2 EXTREME</span></div>}
   <div className="arc-game-meta"><span>{mode==="daily"?"DAILY MIX":"10-QUESTION PRACTICE"} · {quizPoints(question.tier)} PTS FOR A CORRECT ANSWER</span><b>QUESTION {index+1} / {questions.length}</b></div>
   <div className="quiz-scoreboard"><div><small>YOUR SCORE</small><strong><ScoreTicker value={score}/></strong></div><div><small>DIFFICULTY</small><b>{question.tier==="MEDIUM"?"MEDIUM / STANDARD":question.tier}</b></div><div><small>TIME LEFT</small><strong className={seconds<=3?"urgent":""}>{typingDone?seconds:"—"}</strong></div></div>
   <div className="quiz-question"><div className="quiz-type-cursor"/><h2>{typed}{!typingDone&&<i className="quiz-caret"/>}</h2><div className="quiz-progress"><i style={{width:(progress*100)+"%"}}/></div></div>
   {typingDone&&<motion.div className="quiz-options" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}>{question.options.map(option=><motion.button key={option} whileTap={{scale:.985}} onClick={()=>choose(option)} disabled={locked} className={locked&&option===question.answer?"correct":locked&&option===chosen?"wrong":""}>{option}</motion.button>)}</motion.div>}
   {locked&&<motion.div className={"arc-feedback "+(chosen===question.answer?"quiz-goal":"quiz-miss")} initial={{opacity:0,y:12,scale:.98}} animate={{opacity:1,y:0,scale:1}}><b>{chosen===question.answer?"GOAL! CORRECT.":chosen?"NOT THIS TIME.":"TIME'S UP."}</b><p>{question.explanation}</p><small>{question.source}</small><button className="arc-button" onClick={next}>{index+1===questions.length?"SEE FINAL SCORE":"NEXT QUESTION ↗"}</button></motion.div>}
   <div className="arc-game-foot"><span>{question.region==="ENGLISH_DOMESTIC"?"ENGLISH DOMESTIC FOOTBALL":question.category}</span><span>{quizSeconds(question.tier)} SECONDS · {quizPoints(question.tier)} PTS</span></div>
  </Card>}
 </Frame>;
}

type TournamentDifficulty="EASY"|"STANDARD"|"HARD"|"EXTREME";
const TOURNAMENT_LEVELS: TournamentDifficulty[]=["EASY","STANDARD","HARD","EXTREME"];
function TournamentNationPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();
 const [difficulty,setDifficulty]=useState<TournamentDifficulty>("STANDARD");
 const [practiceSeed,setPracticeSeed]=useState(()=>String(Math.floor(Math.random()*1e12)));
 const [practiceRunActive,setPracticeRunActive]=useState(false);
 const {data:worldCupData,loading,error,retry}=useFootballKnowledge("world-cup");
 const [attempts,setAttempts]=useState(0);
 const [ended,setEnded]=useState(false);
 const [won,setWon]=useState(false);
 const maxGuesses=5;
 const tournamentUsageKey="playground.tournament-nation.practice.v1";
 const [practicePlays,setPracticePlays]=useState<Record<string,number>>(()=>{
   try{const value=JSON.parse(localStorage.getItem(tournamentUsageKey)||"{}");return value&&typeof value==="object"?value:{};}catch{return {};}
 });
 useEffect(()=>{try{localStorage.setItem(tournamentUsageKey,JSON.stringify(practicePlays));}catch{/* keep practice available if storage is disabled */}},[practicePlays]);
 const practiceCount=practicePlays[utcDay()]??0;
 const practiceLimitReached=mode==="practice"&&!ended&&!practiceRunActive&&practiceCount>=5;
 const done=account.daily[utcDay()]?.["tournament-nation"]!==undefined;
 const seed=mode==="daily"?"TOURNAMENT:"+utcDay():"TOURNAMENT:PRACTICE:"+practiceSeed;
 const match=useMemo(()=>{
   if(!worldCupData?.lineups.length)return null;
   const eligible=worldCupData.lineups.filter(item=>item.year>=1982&&item.year<=2026&&item.starters.length===11);
   return eligible.length?eligible[hashSeed(seed+":match")%eligible.length]??null:null;
 },[worldCupData,seed]);
 const teams=useMemo(()=>worldCupData?[...new Set(worldCupData.lineups.map(item=>item.team).filter(Boolean))]:[],[worldCupData]);
 const optionCount=difficulty==="EASY"?3:difficulty==="STANDARD"?4:difficulty==="HARD"?6:8;
 const options=useMemo(()=>{
   if(!match)return[];
   const wrong=teams.filter(team=>team!==match.team);
   return shuffle([match.team,...shuffle(wrong,hashSeed(seed+":wrong")).slice(0,optionCount-1)],hashSeed(seed+":options"));
 },[match,teams,seed,optionCount]);
 const clueCount=difficulty==="EASY"?11:difficulty==="STANDARD"?9:difficulty==="HARD"?7:5;
 const lineupGroups=useMemo(()=>{
   if(!match)return [] as {name:string;index:number;showClue:boolean}[][];
   const players=match.starters.map((name,index)=>({name,index,showClue:index<clueCount}));
   return [players.slice(0,4),players.slice(4,8),players.slice(8,11)];
 },[match?.id,clueCount]);
 const visibleClueCount=match?Math.min(clueCount,match.starters.length):0;
 const choose=(team:string)=>{
   if(ended||!match)return;
   const tries=attempts+1;setAttempts(tries);
   if(team===match.team){
     setWon(true);setEnded(true);setPracticeRunActive(false);
     if(mode==="daily")onDaily("tournament-nation",Math.max(150,1000-(tries-1)*220));
   }else if(tries>=maxGuesses){
     setWon(false);setEnded(true);setPracticeRunActive(false);
     if(mode==="daily")onDaily("tournament-nation",0);
   }
 };
 const reset=(newMode:Mode=mode,newDifficulty:TournamentDifficulty=difficulty)=>{
   const changingDifficulty=newMode===mode&&newMode==="practice"&&practiceRunActive&&newDifficulty!==difficulty;
   setDifficulty(newDifficulty);setAttempts(0);setEnded(false);setWon(false);
   if(newMode!=="practice"){setPracticeRunActive(false);return;}
   if(changingDifficulty)return;
   if((practicePlays[utcDay()]??0)>=5){setPracticeRunActive(false);return;}
   setPracticePlays(old=>({...old,[utcDay()]:Math.min(5,(old[utcDay()]??0)+1)}));
   setPracticeRunActive(true);setPracticeSeed(String(Math.floor(Math.random()*1e12)));
 };
 return <Frame account={account} game="tournament-nation" eyebrow="WORLD CUP ARCHIVE / STARTING XI" title="TOURNAMENT NATION." description="Identify the country from a historic World Cup starting XI. Reveal a few player names, use the match context, and work out the team." number="15" mode={mode} setMode={m=>{setMode(m);reset(m);}}>
 {done&&mode==="daily"?<Success title="NATION IDENTIFIED." detail="Today's tournament challenge is complete. Five CC0 World Cup practice runs are also available each day." button="PRACTICE" onAgain={()=>{setMode("practice");reset("practice");}}/>:
  practiceLimitReached?<Card className="arc-result"><small>DAILY PRACTICE LIMIT</small><h2>FIVE MATCHES PLAYED.</h2><p>You have used all five free Tournament Nation practice runs today. The allowance resets at 00:00 GMT.</p></Card>:
  error?<Card className="arc-feedback"><b>TOURNAMENT DATA UNAVAILABLE</b><p>{error}</p><button className="arc-button" onClick={retry}>RETRY DATA ↗</button></Card>:
  loading||!match||!worldCupData?<Card className="grid-loading"><motion.div animate={{rotate:360}} transition={{duration:1.5,repeat:Infinity,ease:"linear"}}>⚽</motion.div><b>OPENING THE WORLD CUP ARCHIVE</b><span>Loading 1982–2026 starting line-ups.</span></Card>:
  <Card className="tournament-game">
   <div className="arc-game-meta"><span>FIFA WORLD CUP · {match.year}</span><b>{maxGuesses-attempts} GUESSES LEFT · {mode==="practice"?Math.max(0,5-practiceCount)+" RUNS LEFT TODAY":"DAILY GAME"}</b></div>
   <div className="grid-difficulty">{TOURNAMENT_LEVELS.map(level=><button key={level} className={difficulty===level?"active":""} onClick={()=>reset(mode,level)}>{difficultyLabel(level)}</button>)}</div>
   <div className="tournament-match"><div><small>TOURNAMENT</small><b>FIFA WORLD CUP {match.year}</b></div><div><small>ROUND</small><b>{match.round||"MATCH"}</b></div><div><small>OPPONENT</small><b>{match.opponent}</b></div><div><small>DATE</small><b>{match.date}</b></div></div>
   <div className="tournament-pitch">
    <div className="tournament-pitch-lines"><i/><i/><i/></div>
    <div className="tournament-xi-rows">{lineupGroups.map((row,rowIndex)=><div className="tournament-xi-row" key={rowIndex}>
     {row.map(({name,index,showClue})=><motion.div className="tournament-shirt" key={name} initial={{opacity:0,y:10,scale:.9}} animate={{opacity:1,y:0,scale:1}} transition={{delay:index*.018}}>
       <div className="shirt-shape"><b>{String(index+1).padStart(2,"0")}</b></div>
       <div className="shirt-club">{showClue?<small>{name}</small>:<small>CLUE HIDDEN</small>}</div>
      </motion.div>)}
    </div>)}</div>
    <div className="tournament-xi-caption"><span>FULL STARTING XI / 11 PLAYERS</span><span>{visibleClueCount} / 11 PLAYER NAMES REVEALED</span></div>
   </div>
   <p className="arc-muted">All eleven starters, match date, opponent and tournament round come from the CC0 World Cup line-up source. No inferred club history or match-day position clues are used.</p>
   {!ended?<><div className="tournament-options">{options.map(team=><button key={team} onClick={()=>choose(team)}>{team}<i>↗</i></button>)}</div><div className="arc-game-foot"><span>{difficulty} · {optionCount} NATIONAL TEAMS</span><span>{visibleClueCount} PLAYER NAMES VISIBLE</span></div></>:
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
 const {data:playerStatsData,loading,error,retry}=useFootballKnowledge("player-stats");
 const scoutPlayers=playerStatsData?.players??[];
 const done=account.daily[utcDay()]?.["scout-signal"]!==undefined;
 const pool=useMemo(()=>scoutPlayers.map(cc0PlayerToGamePlayer).filter(p=>p.nationality!=="Unlisted"&&p.position),[scoutPlayers]);
 const guessPool=pool;
 const target=pool.length?pool[hashSeed(seed+":target")%pool.length]:null;
 type SignalKey="nationality"|"position"|"ageBand"|"internationalGoals"|"worldCupStarts"|"worldCupEra";
 const goalsBand=(value:number)=>value===0?"0 recorded":value<=5?"1–5":value<=10?"6–10":value<=20?"11–20":"21+";
 const startsBand=(value:number)=>value===0?"No World Cup starts":value<=2?"1–2":value<=5?"3–5":value<=10?"6–10":"11+";
 const eraBand=(value:number|null)=>value===null?"No World Cup start":Math.floor(value/10)*10+"s";
 const category=(key:SignalKey,p:GamePlayer)=>{
   if(!target)return false;
   if(key==="nationality")return p.nationality!=="Unlisted"&&countryLabel(p.nationality)===countryLabel(target.nationality);
   if(key==="position")return Boolean(p.position)&&p.position===target.position;
   if(key==="ageBand")return p.ageBand!=="Unknown"&&p.ageBand===target.ageBand;
   if(key==="internationalGoals")return goalsBand(p.internationalGoals??0)===goalsBand(target.internationalGoals??0);
   if(key==="worldCupStarts")return startsBand(p.careerApps)===startsBand(target.careerApps);
   return eraBand(p.firstYear)===eraBand(target.firstYear);
 };
 const attrs:[SignalKey,string][]=[["nationality","NATION"],["position","POSITION"],["ageBand","AGE BAND"],["internationalGoals","INTL GOALS RECORDED"],["worldCupStarts","WORLD CUP STARTS"],["worldCupEra","WORLD CUP ERA"]];
 const valueFor=(key:SignalKey,p:GamePlayer)=>{
   if(key==="nationality")return <span className="scout-value"><CountryFlag name={p.nationality}/><small>{p.nationality}</small></span>;
   if(key==="position")return <small>{p.position||"Not recorded"}</small>;
   if(key==="ageBand")return <small>{p.ageBand}</small>;
   if(key==="internationalGoals")return <small>{goalsBand(p.internationalGoals??0)}</small>;
   if(key==="worldCupStarts")return <small>{startsBand(p.careerApps)}</small>;
   return <small>{eraBand(p.firstYear)}</small>;
 };
 const submit=(e:FormEvent)=>{
   e.preventDefault();if(!target)return;
   const found=archiveGuess(guess,guessPool),name=guess.trim();
   if(!name||name.length<2||end)return;
   const p=found??({...pool[0],archiveId:"typed:"+normalise(name),name,surname:name.split(/\s+/).slice(-1)[0],nationality:"Unlisted",club:"Unknown club",clubs:[],position:"" as GamePlayer["position"],league:"Unlisted",ageBand:"Unknown",careerSpells:[]} as unknown as GamePlayer);
   if(history.some(x=>normalise(x.name)===normalise(p.name)))return;
   const next=[...history,p];setHistory(next);setGuess("");
   if(p.archiveId===target.archiveId){setWon(true);setEnd(true);if(mode==="daily")onDaily("scout-signal",Math.max(100,1000-(next.length-1)*90));}
   else if(next.length>=10){setEnd(true);if(mode==="daily")onDaily("scout-signal",0);}
 };
 const reset=()=>{
   if(mode==="daily"){setMode("practice");setPracticeSeed(String(Math.floor(Math.random()*1e12)));}
   else setPracticeSeed(String(Math.floor(Math.random()*1e12)));
   setGuess("");setHistory([]);setEnd(false);setWon(false);
 };
 return <Frame account={account} game="scout-signal" eyebrow="ATTRIBUTE DEDUCTION / PLAYER HUNT" title="SCOUT SIGNAL." description="Guess the mystery player. Each guess lights up their nation, position, age band and source-backed international or World Cup records. No unverified club clues." number="14" mode={mode} setMode={m=>{setMode(m);setGuess("");setHistory([]);setEnd(false);setWon(false);if(m==="practice")setPracticeSeed(String(Math.floor(Math.random()*1e12)));}}>
 {done&&mode==="daily"?<Success title="SCOUTING REPORT COMPLETE." detail="Today's mystery is done. Unlimited CC0 player practice is open." button="PRACTICE" onAgain={()=>{setMode("practice");setPracticeSeed(String(Math.floor(Math.random()*1e12)));}}/>:
  loading&&pool.length===0?<Card className="scout-loading"><motion.div animate={{rotate:360}} transition={{duration:1.6,repeat:Infinity,ease:"linear"}}>⚽</motion.div><b>OPENING THE CC0 SCOUTING DATABASE</b><p>Loading player identities, positions, birth years and recorded international stats.</p><span>THE SOURCE POOL IS CACHED ON YOUR DEVICE FOR REPEAT VISITS.</span></Card>:
  pool.length<2?<Card className="arc-feedback"><b>CC0 SCOUTING DATABASE UNAVAILABLE</b><p>{error||"The source did not provide enough positioned player records for this game."}</p><button className="arc-button" onClick={retry}>RETRY DATABASE ↗</button></Card>:
  <Card className="scout-game">
   <div className="arc-game-meta"><span>{10-history.length} GUESSES LEFT</span><b>{Math.max(0,1000-history.length*90)} PTS AVAILABLE</b></div>
   <div className="scout-target-note"><span>SCOUTING TARGET</span><b>IDENTITY HIDDEN</b><small>{pool.length.toLocaleString("en-GB")} CC0 POSITIONED PLAYERS IN THIS DRAW</small></div>
   <div className="scout-column-head"><span>YOUR GUESS</span>{attrs.map(([,label])=><span key={label}>{label}</span>)}</div>
   <div className="scout-rows">{history.map(p=><motion.div className="scout-row" layout key={p.archiveId} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
     <b>{p.name}</b>{attrs.map(([key,label])=><span key={label} className={p.archiveId.startsWith("typed:")?"scout-cell":category(key,p)?"lit":"scout-cell"} title={p.archiveId.startsWith("typed:")?"This player is outside the current CC0 draw":label}>{p.archiveId.startsWith("typed:")?<small className="scout-no-match">NOT IN DRAW</small>:valueFor(key,p)}</span>)}
   </motion.div>)}</div>
   <form className="arc-guess-form" onSubmit={submit}><input list="scout-players" value={guess} onChange={e=>setGuess(e.target.value)} placeholder="Try a full name or surname…"/><datalist id="scout-players">{guessPool.map(p=><option key={p.archiveId} value={p.name}/>)}</datalist><button className="arc-button" disabled={guess.trim().length<2||end}>SCAN PLAYER ↗</button></form>
   <p className="arc-muted">Goal totals are the goals recorded in the CC0 senior international source, not guaranteed complete career totals. World Cup starts come from recorded starting line-ups.</p>
   {error&&<div className="arc-feedback"><b>DATABASE WARNING</b><p>{error}</p><button className="arc-quiet" onClick={retry}>RETRY DATABASE</button></div>}
   {end&&target&&<div className="arc-feedback"><b>{won?"TARGET FOUND":"THE PLAYER WAS "+target.name}</b><p>{target.nationality} · {target.position} · {target.internationalGoals??0} goals recorded · {target.careerApps} World Cup starts</p><button className="arc-button" onClick={reset}>NEXT SCOUT REPORT ↗</button></div>}
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
 const pages:Record<string,React.ReactNode>={
  "locker-room":<AccountPage account={account} setAccount={setAccount}/>,
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
  "timed-quiz":<QuickQuizPage account={account} onDaily={onDaily}/>,
  "cult-hero":<CultHeroPage dailyDone={account.daily[utcDay()]?.["cult-hero"]!==undefined} onDailyComplete={score=>onDaily("cult-hero",score)}/>,
  "cult-hero-collection":<CultHeroCollectionPage/>
 };
 return <MotionConfig reducedMotion="user"><AnimatePresence mode="wait" initial={false}><motion.div key={path} className="pg-route-stage" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:.22,ease:"easeOut"}}>{pages[path]??<HomePage account={account}/>}</motion.div></AnimatePresence></MotionConfig>;
}
