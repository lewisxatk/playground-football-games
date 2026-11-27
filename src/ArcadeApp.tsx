import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  PLAYER_DATABASE, FOOTBALL_GROUPS, LEAGUE_GOALS, CAREER_FILES, STRANDS_PACKS,
  type Player
} from "./playerData";
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
  {id:"football-grid",title:"FOOTBALL GRID",sub:"Nine squares. Nine football answers.",tone:"blue",tag:"GRID"},
  {id:"ladder",title:"THE LADDER",sub:"Put five players in stat order.",tone:"orange",tag:"RANKING"},
  {id:"the-reveal",title:"THE REVEAL",sub:"Uncover the mystery player, clue by clue.",tone:"pink",tag:"DEDUCTION"},
  {id:"football-501",title:"FOOTBALL 501",sub:"Count down without busting.",tone:"lime",tag:"COUNTDOWN"},
  {id:"link-up",title:"THE LINK UP",sub:"Find the player who connects two stars.",tone:"violet",tag:"CONNECTION"},
  {id:"missing-xi",title:"MISSING XI",sub:"One name is missing from a famous line-up.",tone:"blue",tag:"LINE-UP"},
  {id:"strands",title:"FOOTBALL STRANDS",sub:"Find the surnames. Find the full-name spangram.",tone:"orange",tag:"WORD SEARCH"},
  {id:"scout-signal",title:"SCOUT SIGNAL",sub:"Guess the footballer. Watch the attributes light up.",tone:"pink",tag:"ATTRIBUTE HUNT"}
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
function playerByName(name:string){return PLAYER_DATABASE.find(p=>normalise(p.name)===normalise(name)||p.aliases.some(a=>normalise(a)===normalise(name)));}
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
      <div className="arc-home-graphic"><div className="arc-graphic-label">THE PLAYGROUND / 14 GAME MODES</div><div className="arc-graphic-pitch"><i className="half"/><i className="centre"/><i className="box-one"/><i className="box-two"/><motion.span className="graphic-ball" animate={{x:[0,32,-20,0],y:[0,-15,8,0],rotate:[0,180,360]}} transition={{duration:5,repeat:Infinity,ease:"easeInOut"}}/></div><div className="arc-graphic-bottom"><span>GUESS / THINK / PLAY</span><b>↗</b><span>14 WAYS TO PLAY</span></div></div>
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
 const [mode,setMode]=useMode();const [step,setStep]=useState(0);const [score,setScore]=useState(0);const [pick,setPick]=useState<number|null>(null);const [runDone,setRunDone]=useState(false);
 const done=account.daily[utcDay()]?.lowball!==undefined;
 const rounds=useMemo(()=>{const bank=shuffle([...LEAGUE_GOALS],mode==="daily"?hashSeed("LOWBALL"+utcDay()):Math.floor(Math.random()*1e9));return Array.from({length:5},(_,i)=>bank.slice(i*2,i*2+2));},[mode]);
 const pair=rounds[step]??rounds[0];const correct=pair[0].value>pair[1].value?0:1;
 const choose=(i:number)=>{if(pick!==null||done&&mode==="daily")return;setPick(i);if(i===correct)setScore(v=>v+100+(step*15));};
 const next=()=>{if(step===4){setRunDone(true);if(mode==="daily")onDaily("lowball",score);return;}setStep(v=>v+1);setPick(null);};
 const restart=()=>{setStep(0);setScore(0);setPick(null);if(mode==="practice")setMode("practice");};
 return <Frame account={account} game="lowball" eyebrow="STAT FACE-OFF / QUICK FIRE" title="WHO'S GOT MORE?" description="Two players. One number. Pick the bigger Premier League goal total." number="01" mode={mode} setMode={m=>{setMode(m);restart();}}>
  {done&&mode==="daily"?<Success title="DAILY DONE." detail="You've banked today's Lowball challenge. Switch to practice for more duels." button="PRACTICE" onAgain={()=>setMode("practice")}/>:runDone?<Success title="FIVE DUELS DONE." detail={"You scored "+score+" points in this run."} button="RUN IT BACK" onAgain={restart}/>:<Card className="lb-panel"><div className="arc-game-meta"><span>DUEL {step+1} / 5</span><b>{score} PTS</b></div><div className="lb-vs"><div className="lb-player"><small>PLAYER A</small><strong>{pair[0].name}</strong><span>{pair[0].value} PL GOALS</span></div><div className="lb-vs-mark">VS</div><div className="lb-player"><small>PLAYER B</small><strong>{pair[1].name}</strong><span>{pair[1].value} PL GOALS</span></div></div><div className="lb-actions">{pair.map((p,i)=><button key={p.name} onClick={()=>choose(i)} disabled={pick!==null} className={pick===i?(i===correct?"correct":"wrong"):""}>MORE GOALS ↗</button>)}</div>{pick!==null&&<div className="arc-feedback"><b>{pick===correct?"YOU CALLED IT.":"NOT QUITE."}</b><p>{pair[correct].name} leads with {pair[correct].value} Premier League goals.</p><button className="arc-button" onClick={next}>{step===4?"BANK SCORE":"NEXT DUEL"} ↗</button></div>}</Card>}
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

function CareerPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();const [recordIndex,setRecordIndex]=useState(0);const [guess,setGuess]=useState("");const [attempts,setAttempts]=useState(0);const [revealed,setRevealed]=useState<number[]>([]);const [hinted,setHinted]=useState<string[]>([]);const [ended,setEnded]=useState(false);const [won,setWon]=useState(false);const done=account.daily[utcDay()]?.["career-file"]!==undefined;
 const record=CAREER_FILES[(mode==="daily"?hashSeed("CAREER"+utcDay())%CAREER_FILES.length:recordIndex)%CAREER_FILES.length];
 const guessesLeft=10-attempts,score=Math.max(0,1000-attempts*55-hinted.length*80-revealed.length*25);
 const clues=[{id:"nation",label:"Nationality",value:record.nationality,cost:80},{id:"position",label:"Position",value:record.position,cost:80},{id:"years",label:"Career span",value:record.years,cost:100},{id:"clubs",label:"Number of club spells",value:String(record.clubs.length),cost:90},{id:"first",label:"First listed senior club",value:record.clubs[0],cost:110},{id:"last",label:"Last listed senior club",value:record.clubs[record.clubs.length-1],cost:110}];
 const submit=(e:FormEvent)=>{e.preventDefault();if(!guess.trim()||ended)return;if(acceptedName(guess,[record.name,...record.name.split(" ").slice(-1)])){setWon(true);setEnded(true);if(mode==="daily")onDaily("career-file",score);}else{const next=attempts+1;setAttempts(next);setGuess("");if(next>=10){setEnded(true);if(mode==="daily")onDaily("career-file",0);}}};
 const newFile=()=>{setRecordIndex(v=>(v+1)%CAREER_FILES.length);setGuess("");setAttempts(0);setRevealed([]);setHinted([]);setEnded(false);setWon(false);};
 return <Frame account={account} game="career-file" eyebrow="MYSTERY / CAREER PATH" title="READ THE CAREER." description="A curated starter archive of famous multi-club careers. Reveal clubs and clues, then name the player." number="04" mode={mode} setMode={m=>{setMode(m);newFile();}}>
 {done&&mode==="daily"?<Success title="CASE FILED." detail="Today's Career File is complete. Switch to practice for another player." button="PRACTICE FILE" onAgain={()=>setMode("practice")}/>:<Card className="career-game"><div className="arc-game-meta"><span>CAREER DOSSIER / {record.clubs.length} CLUB SPELLS</span><b>{guessesLeft} GUESSES LEFT · {score} PTS</b></div><div className="career-clue-banner"><span>FREE CLUE</span><b>{record.clubs[0]} → {record.clubs[record.clubs.length-1]}</b><small>FIRST AND LAST CLUBS / NO POINTS COST</small></div><div className="career-path-list">{record.clubs.map((club,i)=><div key={i} className={revealed.includes(i)||ended?"shown":""}><span>{String(i+1).padStart(2,"0")}</span><b>{revealed.includes(i)||ended?club:"██████████"}</b><button disabled={revealed.includes(i)||ended} onClick={()=>{setRevealed(v=>[...v,i]);}}>REVEAL −25</button></div>)}</div><div className="career-hints">{clues.map(c=><button key={c.id} disabled={hinted.includes(c.id)||ended} onClick={()=>setHinted(v=>[...v,c.id])}><span>{c.label}{hinted.includes(c.id)&&<b>{c.value}</b>}</span><i>{hinted.includes(c.id)?"OPEN ✓":"−"+c.cost+" PTS"}</i></button>)}</div><form className="arc-guess-form" onSubmit={submit}><input value={guess} onChange={e=>setGuess(e.target.value)} placeholder="Full name or surname…" disabled={ended}/><button className="arc-button" disabled={!guess.trim()||ended}>LOCK IN ↗</button></form>{ended&&<div className="arc-feedback"><b>{won?"FILE CRACKED":"CASE CLOSED"} · {record.name}</b><p>{won?"Excellent reading.":"The mystery player was "+record.name+"."}</p><button className="arc-button" onClick={newFile}>NEXT FILE ↗</button></div>}</Card>}
 </Frame>;
}

const WORDS=[...new Set([...playerSurnames(),"MALEN","BARRY","DIAZ"])];
function wordleEval(guess:string,target:string){const result=Array(5).fill("absent");const letters=target.split("");for(let i=0;i<5;i++){if(guess[i]===target[i]){result[i]="correct";letters[i]="";}}for(let i=0;i<5;i++){if(result[i]==="correct")continue;const at=letters.indexOf(guess[i]);if(at>=0){result[i]="present";letters[at]="";}}return result;}
function FootlePage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();const [target,setTarget]=useState(()=>dailyFootle("daily"));const [typed,setTyped]=useState("");const [guesses,setGuesses]=useState<string[]>([]);const [end,setEnd]=useState(false);const done=account.daily[utcDay()]?.footle!==undefined;
 useEffect(()=>{setTarget(dailyFootle(mode));setTyped("");setGuesses([]);setEnd(false);},[mode]);
 const win=guesses.at(-1)===target;
 const submit=(e:FormEvent)=>{e.preventDefault();const word=typed.toUpperCase();if(word.length!==5||!WORDS.includes(word)||end)return;const next=[...guesses,word];setGuesses(next);setTyped("");if(word===target||next.length===6){setEnd(true);if(mode==="daily")onDaily("footle",word===target?Math.max(100,700-next.length*75):0);}};
 const resetPractice=()=>{setTarget(dailyFootle("practice"));setTyped("");setGuesses([]);setEnd(false);};
 return <Frame account={account} game="footle" eyebrow="THE FIVE-LETTER FOOTBALL WORD" title="FOOTLE." description="Find the five-letter football surname in six guesses. Daily for everyone. Unlimited practice whenever." number="05" mode={mode} setMode={setMode}>
 {done&&mode==="daily"?<Success title="TODAY'S FOOTLE IS DONE." detail="One shared daily word. Infinite practice is still open." button="UNLIMITED PRACTICE" onAgain={()=>setMode("practice")}/>:<Card className="footle-game"><div className="footle-board">{Array.from({length:6},(_,r)=><div className="footle-row" key={r}>{Array.from({length:5},(_,c)=>{const word=guesses[r];const color=word?wordleEval(word,target)[c]:"";return <div key={c} className={"footle-cell "+color}>{word?.[c]??(r===guesses.length?typed[c]??"":"")}</div>;})}</div>)}</div>{end&&<div className="arc-feedback"><b>{win?"YOU GOT IT.":"THE WORD WAS "+target}</b><p>{win?"A proper bit of football knowledge.":"Have another go in unlimited practice."}</p>{mode==="practice"&&<button className="arc-button" onClick={resetPractice}>NEXT WORD ↗</button>}</div>}<form className="footle-entry" onSubmit={submit}><input value={typed} onChange={e=>setTyped(e.target.value.replace(/[^a-z]/gi,"").slice(0,5))} placeholder="TYPE A 5-LETTER NAME" maxLength={5} disabled={end}/><button className="arc-button" disabled={typed.length!==5||end}>ENTER ↵</button></form><div className="footle-note">GREEN = RIGHT LETTER / RIGHT PLACE · AMBER = RIGHT LETTER / WRONG PLACE</div><div className="footle-wordbank">VALID PLAYER WORDS: {WORDS.join(" · ")}</div></Card>}
 </Frame>;
}

function ConnectionsPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();const [selected,setSelected]=useState<string[]>([]);const [found,setFound]=useState<number[]>([]);const [mistakes,setMistakes]=useState(0);const [finished,setFinished]=useState(false);const done=account.daily[utcDay()]?.connections!==undefined;
 const groups=FOOTBALL_GROUPS;const all=groups.flatMap(g=>g.members);const tiles=useMemo(()=>shuffle(all,mode==="daily"?hashSeed("CONNECTIONS"+utcDay()):Date.now()),[mode]);
 const submit=()=>{if(selected.length!==4||finished)return;const group=groups.findIndex(g=>selected.every(name=>g.members.includes(name)));if(group>=0&&!found.includes(group)){const next=[...found,group];setFound(next);setSelected([]);if(next.length===4){setFinished(true);if(mode==="daily")onDaily("connections",1000-mistakes*150);}}else{setMistakes(v=>v+1);setSelected([]);if(mistakes>=3){setFinished(true);if(mode==="daily")onDaily("connections",0);}}};
 return <Frame account={account} game="connections" eyebrow="SORT THE TOUCHLINE / 16 TILES" title="FIND THE CONNECTION." description="Four hidden football groups. Select four names that belong together. Four mistakes and the board is revealed." number="06" mode={mode} setMode={m=>{setMode(m);setSelected([]);setFound([]);setMistakes(0);setFinished(false);}}>
 {done&&mode==="daily"?<Success title="GROUPS FOUND." detail="Today's Connections board is complete. Go again in practice." button="PRACTICE" onAgain={()=>setMode("practice")}/>:<Card className="connections-game"><div className="arc-game-meta"><span>GROUPS FOUND {found.length}/4</span><b>MISTAKES {mistakes}/4</b></div><div className="connections-found">{found.map(i=><div key={i} className={groups[i].color}><small>{groups[i].name}</small><b>{groups[i].members.join(" · ")}</b></div>)}</div><div className="connections-grid">{tiles.filter(n=>!groups.some((g,i)=>found.includes(i)&&g.members.includes(n))).map(name=><button key={name} onClick={()=>setSelected(v=>v.includes(name)?v.filter(x=>x!==name):v.length<4?[...v,name]:v)} className={selected.includes(name)?"selected":""}>{name}</button>)}</div><div className="arc-game-foot"><span>{selected.length} / 4 SELECTED</span><button className="arc-button" onClick={submit} disabled={selected.length!==4||finished}>SUBMIT GROUP ↗</button><button className="arc-quiet" onClick={()=>setSelected([])}>CLEAR</button></div>{finished&&<div className="arc-feedback"><b>BOARD REVEALED</b>{groups.map(g=><p key={g.name}>{g.name}: {g.members.join(", ")}</p>)}</div>}</Card>}
 </Frame>;
}

const GRID_ROWS=["Arsenal","Chelsea","Liverpool"];const GRID_COLS=["France","Brazil","England"];
const GRID_ANSWERS=[
 [["Thierry Henry","henry"],["Gabriel Martinelli","martinelli"],["Bukayo Saka","saka"]],
 [["N'Golo Kanté","kante"],["David Luiz","david luiz"],["Frank Lampard","lampard"]],
 [["Mamadou Sakho","sakho"],["Alisson Becker","alisson"],["Steven Gerrard","gerrard"]]
];
function GridPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();const [values,setValues]=useState<string[]>(Array(9).fill(""));const [opened,setOpened]=useState<number[]>([]);const [active,setActive]=useState<number|null>(null);const [guess,setGuess]=useState("");const done=account.daily[utcDay()]?.["football-grid"]!==undefined;
 const check=()=>{if(active===null)return;const row=Math.floor(active/3),col=active%3;const accepted=GRID_ANSWERS[row][col];if(accepted.some(a=>normalise(a)===normalise(guess))){setValues(v=>v.map((x,i)=>i===active?accepted[0]:x));setOpened(v=>v.includes(active)?v:[...v,active]);setActive(null);setGuess("");if(opened.length===8&&mode==="daily"){onDaily("football-grid",900);}}else{setGuess("");}};
 return <Frame account={account} game="football-grid" eyebrow="CLUB × COUNTRY / 3 BY 3" title="FILL THE GRID." description="Each square asks for a player who represented the club and the country at the point where they meet." number="07" mode={mode} setMode={m=>{setMode(m);setValues(Array(9).fill(""));setOpened([]);setActive(null);setGuess("");}}>
 {done&&mode==="daily"?<Success title="GRID COMPLETE." detail="Nine names in the book. Practice is still open." button="PRACTICE GRID" onAgain={()=>setMode("practice")}/>:<Card className="grid-game"><div className="arc-game-meta"><span>9 ANSWERS / 9 CELLS</span><b>{opened.length}/9 FILLED</b></div><div className="football-grid-wrap"><div className="grid-corner">CLUB ↓<br/>NATION →</div>{GRID_COLS.map(c=><div className="grid-col-head" key={c}>{c}</div>)}{GRID_ROWS.map((r,ri)=><><div className="grid-row-head" key={r}>{r}</div>{GRID_COLS.map((c,ci)=>{const id=ri*3+ci;return <button key={id} className={"grid-cell "+(opened.includes(id)?"filled":"")+(active===id?" active":"")} onClick={()=>setActive(id)}><small>{r} × {c}</small><b>{values[id]||"?"}</b></button>;})}</>)}</div>{active!==null&&<div className="grid-answer"><small>{GRID_ROWS[Math.floor(active/3)]} × {GRID_COLS[active%3]}</small><input value={guess} onChange={e=>setGuess(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")check();}} placeholder="Enter a footballer…"/><button className="arc-button" onClick={check}>CHECK ↗</button></div>}<p className="arc-muted">One answer per square. Historical club membership counts. Try surnames or full names.</p></Card>}
 </Frame>;
}

function LadderPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();const [players,setPlayers]=useState(()=>shuffle(LEAGUE_GOALS,hashSeed("LADDER"+utcDay())).slice(0,5));const [done,setDone]=useState(false);const dailyDone=account.daily[utcDay()]?.ladder!==undefined;
 const move=(i:number,dir:number)=>setPlayers(old=>{const next=[...old],j=i+dir;if(j<0||j>=next.length)return old;[next[i],next[j]]=[next[j],next[i]];return next;});
 const submit=()=>{const right=[...players].sort((a,b)=>b.value-a.value);const correct=players.every((p,i)=>p.name===right[i].name);setDone(true);if(mode==="daily")onDaily("ladder",correct?1000:players.filter((p,i)=>p.name===right[i].name).length*200);};
 const reset=(selectedMode:Mode=mode)=>{setPlayers(shuffle(LEAGUE_GOALS,selectedMode==="daily"?hashSeed("LADDER"+utcDay()):Math.floor(Math.random()*1e9)).slice(0,5));setDone(false);};
 return <Frame account={account} game="ladder" eyebrow="ORDER THE NUMBERS / PREMIER LEAGUE" title="THE LADDER." description="Five names. One stat. Put the players in order from most Premier League goals to fewest." number="08" mode={mode} setMode={m=>{setMode(m);reset(m);}}>
 {dailyDone&&mode==="daily"?<Success title="TODAY'S ORDER IS LOCKED." detail="The Ladder is complete. Take on another five in practice." button="PRACTICE" onAgain={()=>setMode("practice")}/>:<Card className="ladder-game"><div className="arc-game-meta"><span>HIGHEST → LOWEST</span><b>DRAG WITH THE ARROWS</b></div><div className="ladder-list">{players.map((p,i)=><div key={p.name} className="ladder-item"><strong>{i+1}</strong><span>{p.name}</span><div><button onClick={()=>move(i,-1)} disabled={i===0}>↑</button><button onClick={()=>move(i,1)} disabled={i===4}>↓</button></div></div>)}</div>{done?<div className="arc-feedback"><b>THE CORRECT ORDER</b>{[...players].sort((a,b)=>b.value-a.value).map((p,i)=><p key={p.name}>{i+1}. {p.name} — {p.value}</p>)}<button className="arc-button" onClick={()=>reset()}>ANOTHER LADDER ↗</button></div>:<div className="arc-game-foot"><span>STAT: PREMIER LEAGUE GOALS</span><button className="arc-button" onClick={submit}>LOCK THE ORDER ↗</button></div>}</Card>}
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

function FiveOhOnePage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();const [remaining,setRemaining]=useState(501);const [picked,setPicked]=useState<string[]>([]);const [bust,setBust]=useState(false);const [finish,setFinish]=useState(false);const done=account.daily[utcDay()]?.["football-501"]!==undefined;
 const pool=useMemo(()=>shuffle(LEAGUE_GOALS,mode==="daily"?hashSeed("501"+utcDay()):Math.floor(Math.random()*1e9)),[mode]);
 const pick=(p:{name:string;value:number})=>{if(finish||bust||picked.includes(p.name))return;const next=remaining-p.value;if(next<0){setBust(true);return;}const count=picked.length+1;setPicked(v=>[...v,p.name]);setRemaining(next);if(next===0){setFinish(true);if(mode==="daily")onDaily("football-501",Math.max(100,1000-count*100));}};
 const bankRun=()=>{if(!picked.length||finish)return;setFinish(true);if(mode==="daily")onDaily("football-501",Math.max(0,1000-remaining*2));};
 const restart=()=>{setRemaining(501);setPicked([]);setBust(false);setFinish(false);};
 return <Frame account={account} game="football-501" eyebrow="COUNTDOWN / PREMIER LEAGUE GOALS" title="FOOTBALL 501." description="Use each player's Premier League goal total once. Get exactly to zero for the best score, or bank your closest safe finish." number="10" mode={mode} setMode={m=>{setMode(m);restart();}}>
 {done&&mode==="daily"?<Success title="COUNTDOWN BANKED." detail="Today's 501 is complete. Try another countdown in practice." button="PRACTICE" onAgain={()=>setMode("practice")}/>:<Card className="checkout-game"><div className="checkout-score"><small>REMAINING</small><strong>{remaining}</strong><div className="checkout-rings"><i/><i/><i/></div></div><div className="arc-game-meta"><span>PLAYERS USED {picked.length}</span><b>NO BUSTS ALLOWED</b></div><div className="checkout-cards">{pool.slice(0,6).map(p=><button key={p.name} disabled={picked.includes(p.name)||bust||finish} onClick={()=>pick(p)}><small>{p.name}</small><b>{p.value}</b><i>PL GOALS</i></button>)}</div>{bust&&<div className="arc-feedback"><b>BUST.</b><p>That pick would take you below zero. Your previous total is unchanged.</p><button className="arc-button" onClick={()=>setBust(false)}>TRY ANOTHER ↗</button></div>}{finish&&<Success title={remaining===0?"CHECKOUT!":"RUN BANKED."} detail={remaining===0?"You hit exactly zero.":"You finished "+remaining+" away from zero."} button="RUN IT BACK" onAgain={restart}/>}<div className="arc-game-foot"><span>PLAYER GOALS / EACH PLAYER ONCE</span><button className="arc-button" disabled={!picked.length||finish} onClick={bankRun}>BANK THIS RUN ↗</button><button className="arc-quiet" onClick={restart}>RESET COUNTDOWN</button></div></Card>}
 </Frame>;
}

const LINK_ROUNDS=[
 {start:"Mohamed Salah",end:"Luis Suárez",answer:"Philippe Coutinho",reason:"Coutinho shared a Liverpool dressing room with Salah and Luis Suárez."},
 {start:"Lionel Messi",end:"Kylian Mbappé",answer:"Neymar Jr",reason:"Neymar played alongside Messi at Barcelona and PSG, and Mbappé at PSG."},
 {start:"Cristiano Ronaldo",end:"Wayne Rooney",answer:"Carlos Tévez",reason:"Tévez played with both at Manchester United."},
 {start:"Thierry Henry",end:"Cesc Fàbregas",answer:"Robert Pires",reason:"Pires played with Henry at Arsenal and later shared a club spell with Cesc at Arsenal."}
];
function LinkUpPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();const [idx,setIdx]=useState(()=>hashSeed("LINK"+utcDay())%LINK_ROUNDS.length);const [guess,setGuess]=useState("");const [tries,setTries]=useState(0);const [end,setEnd]=useState(false);const [won,setWon]=useState(false);const done=account.daily[utcDay()]?.["link-up"]!==undefined;const q=LINK_ROUNDS[idx];
 const submit=(e:FormEvent)=>{e.preventDefault();if(end||!guess.trim())return;const correct=normalise(guess)===normalise(q.answer);const n=tries+1;setTries(n);setGuess("");if(correct||n>=5){setWon(correct);setEnd(true);if(mode==="daily")onDaily("link-up",correct?Math.max(100,1000-n*150):0);}};
 const reset=()=>{setIdx(mode==="daily"?hashSeed("LINK"+utcDay())%LINK_ROUNDS.length:(idx+1)%LINK_ROUNDS.length);setGuess("");setTries(0);setEnd(false);setWon(false);};
 return <Frame account={account} game="link-up" eyebrow="SHARED TEAM-MATES / PLAYER BRIDGE" title="THE LINK UP." description="One footballer played alongside both stars. Find the missing link." number="11" mode={mode} setMode={m=>{setMode(m);setIdx(m==="daily"?hashSeed("LINK"+utcDay())%LINK_ROUNDS.length:Math.floor(Math.random()*LINK_ROUNDS.length));setGuess("");setTries(0);setEnd(false);setWon(false);}}> 
 {done&&mode==="daily"?<Success title="LINK MADE." detail="Today's bridge has been solved. Practice another connection." button="PRACTICE" onAgain={()=>setMode("practice")}/>:<Card className="link-game"><div className="arc-game-meta"><span>FIND THE BRIDGE</span><b>{5-tries} GUESSES LEFT</b></div><div className="link-bridge"><div><small>START</small><strong>{q.start}</strong></div><i>↔</i><div><small>END</small><strong>{q.end}</strong></div></div><form className="arc-guess-form" onSubmit={submit}><input value={guess} onChange={e=>setGuess(e.target.value)} placeholder="Name the shared team-mate…" disabled={end}/><button className="arc-button" disabled={!guess.trim()||end}>CONNECT ↗</button></form>{end&&<div className="arc-feedback"><b>{won?"CONNECTED.":q.answer.toUpperCase()+" WAS THE LINK."}</b><p>{q.reason}</p><button className="arc-button" onClick={reset}>NEXT LINK ↗</button></div>}</Card>}
 </Frame>;
}

const MISSING_LINEUP=["Edwin van der Sar","Wes Brown","Rio Ferdinand","Nemanja Vidić","Patrice Evra","Owen Hargreaves","Michael Carrick","Paul Scholes","Cristiano Ronaldo","Wayne Rooney"];
const MISSING_OPTIONS=["Carlos Tévez","Ryan Giggs","Nani","Dimitar Berbatov"];
function MissingXIPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();const [chosen,setChosen]=useState("");const [end,setEnd]=useState(false);const correct="Carlos Tévez";const done=account.daily[utcDay()]?.["missing-xi"]!==undefined;
 const answer=(v:string)=>{if(end)return;setChosen(v);setEnd(true);if(mode==="daily")onDaily("missing-xi",v===correct?1000:0);};
 return <Frame account={account} game="missing-xi" eyebrow="HISTORIC LINE-UP / ONE PLAYER GONE" title="MISSING XI." description="Ten names from Manchester United's 2008 Champions League final starting team. Who completes the eleven?" number="12" mode={mode} setMode={setMode}>
 {done&&mode==="daily"?<Success title="LINE-UP COMPLETE." detail="You have named today's missing starter." button="PRACTICE" onAgain={()=>setMode("practice")}/>:<Card className="missing-game"><div className="arc-game-meta"><span>MANCHESTER UNITED / 2008 FINAL</span><b>10 / 11 SHOWN</b></div><div className="missing-pitch">{MISSING_LINEUP.map((p,i)=><div key={p}><small>{String(i+1).padStart(2,"0")}</small><b>{p}</b></div>)}<div className="missing-slot"><small>11</small><b>WHO'S MISSING?</b></div></div><div className="missing-options">{MISSING_OPTIONS.map(p=><button key={p} onClick={()=>answer(p)} disabled={end} className={end&&p===correct?"correct":end&&p===chosen?"wrong":""}>{p}</button>)}</div>{end&&<div className="arc-feedback"><b>{chosen===correct?"CORRECT.":"THE MISSING PLAYER WAS CARLOS TÉVEZ."}</b><button className="arc-button" onClick={()=>{setChosen("");setEnd(false);}}>PLAY AGAIN ↗</button></div>}</Card>}
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
 const [mode,setMode]=useMode();const [boardNo,setBoardNo]=useState(0);const [selected,setSelected]=useState<number[]>([]);const [found,setFound]=useState<number[]>([]);const [wrong,setWrong]=useState(0);const [nudges,setNudges]=useState(0);const [finished,setFinished]=useState(false);const done=account.daily[utcDay()]?.strands!==undefined;
 const order=useMemo(()=>shuffle(STRANDS_PACKS,hashSeed("STRANDS"+utcDay())),[]);
 const pack=mode==="daily"?order[boardNo%order.length]:STRANDS_PACKS[(boardNo+hashSeed("PRACTICESTRANDS"+boardNo))%STRANDS_PACKS.length];
 const board=useMemo(()=>makeStrandsBoard(pack),[pack]);
 const solved=(index:number)=>found.includes(index);
 const choose=(i:number)=>{if(finished||board.paths.some((path,idx)=>solved(idx)&&path.includes(i)))return;let next=[...selected];if(next.includes(i)){next=next.slice(0,next.indexOf(i)+1);}else if(!next.length){next=[i];}else{const last=next[next.length-1];const r=Math.floor(last/8),c=last%8,rr=Math.floor(i/8),cc=i%8;if(Math.max(Math.abs(r-rr),Math.abs(c-cc))===1)next.push(i);else next=[i];}setSelected(next);const word=next.map(n=>board.cells[n]).join("");const foundIndex=board.words.findIndex((w,idx)=>!solved(idx)&&(w===word||w.split("").reverse().join("")===word));if(foundIndex>=0){const result=[...found,foundIndex];setFound(result);setSelected([]);if(result.length===9){setFinished(true);if(mode==="daily"&&boardNo===9)onDaily("strands",1000-nudges*80-wrong*15);}}};
 const nextBoard=()=>{setBoardNo(v=>v+1);setSelected([]);setFound([]);setWrong(0);setNudges(0);setFinished(false);};
 const hint=()=>{if(nudges>=3)return;setNudges(v=>v+1);};
 const currentDone=found.length===9;
 return <Frame account={account} game="strands" eyebrow="6 × 8 LETTER PUZZLE / 10 BOARDS" title="FOOTBALL STRANDS." description="Find footballer surnames in the grid. One full player name is the spangram, connecting opposite sides." number="13" mode={mode} setMode={m=>{setMode(m);setBoardNo(0);setSelected([]);setFound([]);setWrong(0);setNudges(0);setFinished(false);}}>
 {done&&mode==="daily"?<Success title="TEN BOARDS CLEARED." detail="Your full ten-puzzle Strands run is complete for today." button="PRACTICE STRANDS" onAgain={()=>setMode("practice")}/>:<Card className="strands-game"><div className="arc-game-meta"><span>PUZZLE {boardNo+1} / 10</span><b>{found.length}/9 NAMES FOUND</b></div><div className="strands-theme"><small>THE THEME</small><strong>{pack.theme}</strong><span>Find all the footballers. The spangram uses their full name.</span></div><div className="strands-grid">{board.cells.map((letter,i)=>{const foundWord=found.findIndex(idx=>board.paths[idx].includes(i));return <button key={i} onClick={()=>choose(i)} className={(selected.includes(i)?"selected ":"")+(foundWord>=0?(foundWord===0?"spangram":"found"):"")}>{letter}</button>;})}</div><div className="strands-actions"><button className="arc-quiet" onClick={()=>setSelected([])}>CLEAR PATH</button><button className="arc-button" onClick={hint} disabled={nudges>=3}>HINT {nudges}/3</button></div>{nudges>0&&<p className="arc-muted">Nudge: an unfound name starts with {board.words.find((_word,i)=>!solved(i))?.[0]??"?"} and has {board.words.find((_word,i)=>!solved(i))?.length??5} letters. Each nudge reduces the run score.</p>}{selected.length>=3&&!board.words.includes(selected.map(i=>board.cells[i]).join(""))&&<div className="strands-feedback"><span>NOT A PLAYER NAME YET.</span><button onClick={()=>{setWrong(v=>v+1);setSelected([]);}}>CLEAR SELECTION</button></div>}{currentDone&&<div className="arc-feedback"><b>BOARD {boardNo+1} COMPLETE.</b><p>{board.words[0]?"SPANGRAM: "+board.words[0]:"All names found."}</p><button className="arc-button" onClick={boardNo===9?()=>{setFinished(true);if(mode==="daily")onDaily("strands",1000-nudges*80-wrong*15);}:nextBoard}>{boardNo===9?"FINISH TEN-BOARD RUN":"NEXT BOARD ↗"}</button></div>}<div className="strands-legend"><span><i className="blue"/> FOOTBALLER</span><span><i className="gold"/> SPANGRAM / FULL NAME</span></div></Card>}
 </Frame>;
}

function ScoutSignalPage({account,onDaily}:{account:Account;onDaily:(id:GameId,score:number)=>void}){
 const [mode,setMode]=useMode();const dailyPool=PLAYER_DATABASE.filter(p=>Boolean(p.club&&p.nationality));
 const [target,setTarget]=useState<Player>(dailyPool[hashSeed("SCOUT"+utcDay())%dailyPool.length]);const [guess,setGuess]=useState("");const [history,setHistory]=useState<Player[]>([]);const [end,setEnd]=useState(false);const [won,setWon]=useState(false);const done=account.daily[utcDay()]?.["scout-signal"]!==undefined;
 type SignalKey="nationality"|"careerClub"|"currentClub"|"position"|"league"|"ageBand";
 const category=(key:SignalKey,g:Player)=>key==="careerClub"?g.clubs.some(c=>target.clubs.includes(c)):key==="currentClub"?g.club===target.club:key==="nationality"?g.nationality===target.nationality:key==="position"?g.position===target.position:key==="league"?g.league===target.league:key==="ageBand"?g.ageBand===target.ageBand:false;
 const attrs:[SignalKey,string][]=[["nationality","NATION"],["careerClub","SHARED CLUB"],["currentClub","CURRENT CLUB"],["position","POSITION"],["league","LEAGUE"],["ageBand","AGE BAND"]];
 const submit=(e:FormEvent)=>{e.preventDefault();const p=playerByName(guess);if(!p||history.some(x=>x.name===p.name)||end)return;const next=[...history,p];setHistory(next);setGuess("");if(p.name===target.name){setWon(true);setEnd(true);if(mode==="daily")onDaily("scout-signal",Math.max(100,1000-(next.length-1)*90));}else if(next.length>=10){setEnd(true);if(mode==="daily")onDaily("scout-signal",0);}};
 const reset=()=>{setTarget(mode==="daily"?dailyPool[hashSeed("SCOUT"+utcDay())%dailyPool.length]:dailyPool[Math.floor(Math.random()*dailyPool.length)]);setGuess("");setHistory([]);setEnd(false);setWon(false);};
 return <Frame account={account} game="scout-signal" eyebrow="ATTRIBUTE DEDUCTION / PLAYER HUNT" title="SCOUT SIGNAL." description="Guess a footballer. Each guess tests nation, shared club, position, league and age band. Green means you've found a match." number="14" mode={mode} setMode={m=>{setMode(m);setTarget(m==="daily"?dailyPool[hashSeed("SCOUT"+utcDay())%dailyPool.length]:dailyPool[Math.floor(Math.random()*dailyPool.length)]);setGuess("");setHistory([]);setEnd(false);setWon(false);}}> 
 {done&&mode==="daily"?<Success title="SCOUTING REPORT COMPLETE." detail="Today's mystery is done. Take a new one in practice." button="PRACTICE" onAgain={()=>setMode("practice")}/>:<Card className="scout-game"><div className="arc-game-meta"><span>{10-history.length} GUESSES LEFT</span><b>{Math.max(0,1000-history.length*90)} PTS AVAILABLE</b></div><div className="scout-column-head"><span>YOUR GUESS</span>{attrs.map(([,label])=><span key={label}>{label}</span>)}</div><div className="scout-rows">{history.map(p=><div className="scout-row" key={p.name}><b>{p.name}</b>{attrs.map(([key,label])=><span key={label} className={category(key,p)?"lit":""}>{category(key,p)?"✓":"—"}</span>)}</div>)}</div><form className="arc-guess-form" onSubmit={submit}><input list="scout-players" value={guess} onChange={e=>setGuess(e.target.value)} placeholder="Try a player name…"/><datalist id="scout-players">{PLAYER_DATABASE.map(p=><option key={p.name} value={p.name}/>)}</datalist><button className="arc-button" disabled={!playerByName(guess)||end}>SCAN PLAYER ↗</button></form><p className="arc-muted">You can guess from the local player pool. Shared club means both players have that club in their listed career path.</p>{end&&<div className="arc-feedback"><b>{won?"TARGET FOUND":"THE PLAYER WAS "+target.name}</b><p>{target.nationality} · {target.position} · {target.clubs.join(" → ")}</p><button className="arc-button" onClick={reset}>NEXT SCOUT REPORT ↗</button></div>}</Card>}
 </Frame>;
}

export function ArcadeApp(){
 const [account,setAccount]=useState<Account>(loadAccount);
 useEffect(()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(account));}catch{/* keep the session usable if storage is unavailable */}},[account]);
 const onDaily=(game:GameId,score:number)=>setAccount(prev=>awardDaily(prev,game,score));
 const path=pageFromPath(window.location.pathname);
 if(path==="locker-room")return <AccountPage account={account} setAccount={setAccount}/>;
 const pages:Record<string,React.ReactNode>={
  "lowball":<LowballPage account={account} onDaily={onDaily}/>,
  "the-climb":<ClimbPage account={account} onDaily={onDaily}/>,
  "draft-xi":<DraftPage account={account} onDaily={onDaily}/>,
  "career-file":<CareerPage account={account} onDaily={onDaily}/>,
  "footle":<FootlePage account={account} onDaily={onDaily}/>,
  "connections":<ConnectionsPage account={account} onDaily={onDaily}/>,
  "football-grid":<GridPage account={account} onDaily={onDaily}/>,
  "ladder":<LadderPage account={account} onDaily={onDaily}/>,
  "the-reveal":<RevealPage account={account} onDaily={onDaily}/>,
  "football-501":<FiveOhOnePage account={account} onDaily={onDaily}/>,
  "link-up":<LinkUpPage account={account} onDaily={onDaily}/>,
  "missing-xi":<MissingXIPage account={account} onDaily={onDaily}/>,
  "strands":<StrandsPage account={account} onDaily={onDaily}/>,
  "scout-signal":<ScoutSignalPage account={account} onDaily={onDaily}/>
 };
 return pages[path]??<HomePage account={account}/>;
}
