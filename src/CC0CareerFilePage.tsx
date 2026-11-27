import { useMemo, useState, type FormEvent } from "react";
import { useFootballKnowledge, type CC0CareerPlayer } from "./footballKnowledge";
import "./career-file.css";

type Mode = "EASY" | "MEDIUM" | "HARD" | "EXTREME";
const MODES:Mode[]=["EASY","MEDIUM","HARD","EXTREME"];
const recentKey="playground.career-file.cc0.recent.v1";
const clean=(value:string)=>value.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
function hash(value:string){let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function matches(guess:string,player:CC0CareerPlayer){const key=clean(guess);return [player.name,player.fullName,...player.aliases].some(name=>clean(name)===key)}
function modeEligible(player:CC0CareerPlayer,mode:Mode){
 const clubs=new Set(player.spells.map(spell=>spell.clubQid)).size;
 return mode==="EASY"?clubs>=5:mode==="MEDIUM"?clubs>=4:mode==="HARD"?clubs>=3:clubs>=2;
}
export default function CareerFilePage({dailyDone=false,onDailyComplete}:{dailyDone?:boolean;onDailyComplete?:(score:number)=>void}){
 const {data,error,loading,retry}=useFootballKnowledge("career-history");
 const [mode,setMode]=useState<Mode>("EASY");
 const [playMode,setPlayMode]=useState<"daily"|"practice">("daily");
 const [practiceSeed,setPracticeSeed]=useState(()=>Math.random().toString(36).slice(2));
 const [guess,setGuess]=useState("");
 const [attempts,setAttempts]=useState(0);
 const [score,setScore]=useState(1000);
 const [revealed,setRevealed]=useState<string[]>([]);
 const [opened,setOpened]=useState<string[]>([]);
 const [status,setStatus]=useState<"playing"|"won"|"lost">("playing");
 const [note,setNote]=useState("");
 const [round,setRound]=useState(0);
 const day=new Date().toISOString().slice(0,10);
 const seed=playMode==="daily"?"CAREER-FILE:"+day+":"+mode:"CAREER-FILE:PRACTICE:"+practiceSeed+":"+mode;
 const pool=useMemo(()=>data?.careerFileCandidates??[],[data]);
 const candidates=useMemo(()=>pool.filter(player=>modeEligible(player,mode)),[pool,mode]);
 const recent=useMemo(()=>{try{const value=JSON.parse(localStorage.getItem(recentKey)||"[]");return new Set(Array.isArray(value)?value.filter((x):x is string=>typeof x==="string"):[])}catch{return new Set<string>()}},[round,practiceSeed]);
 const target=useMemo(()=>{
  if(!candidates.length)return null;
  const draw=practiceSeed+"|"+seed+"|"+round;
  const unused=candidates.filter(player=>!recent.has(player.id));
  const source=unused.length?unused:candidates;
  return [...source].sort((a,b)=>hash(draw+":"+a.id)-hash(draw+":"+b.id))[0]??null;
 },[candidates,practiceSeed,seed,round,recent]);
 const spells=target?[...target.spells].sort((a,b)=>a.startYear-b.startYear||a.club.localeCompare(b.club)):[];
 const visible=spells.filter(spell=>revealed.includes(spell.id)||spells.indexOf(spell)<(mode==="EXTREME"?1:2));
 const unlock=(id:string)=>{if(status!=="playing"||revealed.includes(id))return;setRevealed(previous=>[...previous,id]);setScore(value=>Math.max(0,value-35));};
 const hint=(id:string,value:string)=>{if(status!=="playing"||opened.includes(id))return;setOpened(previous=>[...previous,id]);setNote(value);setScore(previous=>Math.max(0,previous-100));};
 const submit=(event:FormEvent)=>{event.preventDefault();if(!target||!guess.trim()||status!=="playing")return;if(matches(guess,target)){setStatus("won");setNote("FILE CRACKED. The player has been identified.");if(!dailyDone)onDailyComplete?.(score);try{const old=JSON.parse(localStorage.getItem(recentKey)||"[]");localStorage.setItem(recentKey,JSON.stringify([...new Set([...(Array.isArray(old)?old:[]),target.id])].slice(-500)))}catch{};return;}const next=attempts+1;setAttempts(next);setScore(value=>Math.max(0,value-50));setGuess("");setNote("Not that one. Read the dated club history again.");if(next>=10){setStatus("lost");if(!dailyDone)onDailyComplete?.(0);}};
 const next=()=>{if(status==="playing")return;setRound(value=>value+1);setGuess("");setAttempts(0);setScore(1000);setRevealed([]);setOpened([]);setNote("");setStatus("playing");};
 const resetPractice=()=>{setPracticeSeed(Math.random().toString(36).slice(2));setRound(0);setGuess("");setAttempts(0);setScore(1000);setRevealed([]);setOpened([]);setNote("");setStatus("playing");};
 return <main className="cf-page cf-cc0-page" id="top">
  <div className="cf-grain" aria-hidden="true"/>
  <header className="cf-topbar"><a className="cf-brand" href="/">PLAY<span>GROUND</span><b>®</b></a><div className="cf-toplinks"><a href="/">THE ARCADE</a><span>/</span><strong>CAREER FILE</strong></div><div className="cf-topright"><i className="cf-live"/> CC0 CAREER ARCHIVE / 01</div></header>
  <section className="cf-hero"><div className="cf-hero-copy"><div className="cf-eyebrow"><i/> THE PLAYER IDENTITY GAME <span>CC0 / WIKIDATA</span></div><h1>CAREER<br/><em>FILE.</em></h1><p>One career path. A sequence of dated club spells. One name to find. No invented appearances, goals or transfer fees.</p><div className="cf-hero-foot"><b>SELECT A FILE.</b><span>DON'T GUESS. INVESTIGATE.</span></div></div><div className="cf-hero-art"><div className="cf-score-strip"><span>PG / SCOUTING DEPT.</span><span>DATED CLUB HISTORY <i/></span></div><div className="cf-mini-pitch"><div className="cf-halfway"/><div className="cf-centre-circle"/><div className="cf-box left"/><div className="cf-box right"/><div className="cf-pitch-note">THE<br/>CAREER.</div></div><div className="cf-art-bottom"><span>EVERY CLUB TELLS A STORY</span><b>↗</b><span>CC0 DATA</span></div></div></section>
  {dailyDone&&<div className="cf-daily-complete">TODAY'S CAREER FILE IS BANKED · PRACTICE REMAINS OPEN</div>}
  <section className="cf-mode-area"><div className="cf-mode-title"><span>01 / DAILY OR PRACTICE</span><span>ONE SHARED DAILY FILE · UNLIMITED PRACTICE</span></div><div className="cf-cc0-playmode"><button className={playMode==="daily"?"active":""} onClick={()=>{setPlayMode("daily");setRound(0);setRevealed([]);setOpened([]);setAttempts(0);setScore(1000);setStatus("playing");setNote("");}}>DAILY FILE {dailyDone?"✓":""}</button><button className={playMode==="practice"?"active":""} onClick={()=>{setPlayMode("practice");resetPractice();}}>PRACTICE / UNLIMITED</button></div><div className="cf-mode-title"><span>02 / SET THE CAREER DEPTH</span><span>MORE CLUBS · MORE HISTORY TO RECONSTRUCT</span></div><div className="cf-mode-grid">{MODES.map((item,index)=><button key={item} className={"cf-mode-card "+["lime","blue","orange","violet"][index]+(mode===item?" chosen":"")} onClick={()=>{setMode(item);setRound(0);setRevealed([]);setOpened([]);setAttempts(0);setScore(1000);setStatus("playing");setNote("");}}><span className="cf-mode-index">0{index+1} / PG</span><strong>{item}</strong><small>{item==="EASY"?"Five or more recorded clubs":item==="MEDIUM"?"Four or more recorded clubs":item==="HARD"?"Three or more recorded clubs":"Two or more recorded clubs"}</small><small className="cf-mode-count">{candidates.length.toLocaleString("en-GB")} FILES IN THE DRAW</small><i>{mode===item?"SELECTED ✓":"SELECT ↗"}</i></button>)}</div><div className="cf-round-note"><span><b>{mode}</b> / CC0 DATED CLUB SPELLS</span><span>10 GUESSES · 1,000 STARTING POINTS · {mode==="EXTREME"?"1 FREE CLUB":"2 FREE CLUBS"}</span></div></section>
  <section className="cf-game-area">
   {dailyDone&&playMode==="daily"?<div className="cf-error"><b>TODAY’S CAREER FILE IS BANKED</b><p>Your daily result is saved. Switch to practice for a fresh career file.</p><button onClick={()=>{setPlayMode("practice");resetPractice();}}>START PRACTICE ↗</button></div>:loading?<div className="cf-loading"><b>OPENING THE CC0 CAREER ARCHIVE…</b><span>Loading dated club-membership records.</span></div>:error?<div className="cf-error"><b>CAREER ARCHIVE UNAVAILABLE</b><p>{error}</p><button onClick={retry}>RETRY DATABASE ↗</button></div>:!target?<div className="cf-error"><b>NO CAREER FILES IN THIS DRAW</b><p>{data?.meta?.error||"The current CC0 snapshot does not contain enough dated club histories for this difficulty. Try another level or refresh the database."}</p><button onClick={()=>{retry();setRound(value=>value+1);}}>RETRY ARCHIVE ↗</button></div>:<div className="cf-file-card">
    <div className="cf-file-meta"><span>CAREER FILE / {mode}</span><b>{attempts}/10 WRONG · {score.toLocaleString("en-GB")} PTS</b></div>
    <div className="cf-file-intro"><small>UNKNOWN PLAYER / {spells.length} RECORDED CLUB SPELLS</small><h2>{status==="won"||status==="lost"?target.name:"WHOSE CAREER IS THIS?"}</h2><p>{status==="won"?"FILE CRACKED.":status==="lost"?"THE PLAYER HAS BEEN REVEALED.":"Rebuild the player's career from the dated club-membership records below."}</p></div>
    <div className="cf-timeline">{spells.map((spell,index)=><div key={spell.id} className={"cf-timeline-row "+(visible.some(item=>item.id===spell.id)?"revealed":"concealed")}><span>{String(index+1).padStart(2,"0")}</span>{visible.some(item=>item.id===spell.id)?<><b>{spell.club}</b><em>{spell.startYear}–{spell.endYear??"?"}</em></>:<><b>CLUB RECORD HIDDEN</b><button onClick={()=>unlock(spell.id)} disabled={status!=="playing"}>REVEAL −35 PTS</button></>}</div>)}</div>
    <div className="cf-hints"><button onClick={()=>hint("clubs",target.spells.length+" dated club-membership statements are recorded.")} disabled={opened.includes("clubs")||status!=="playing"}>CLUB COUNT −100</button><button onClick={()=>hint("span",(target.firstYear??"Unknown")+"–"+(target.lastYear??"Unknown")+" is the recorded career span.")} disabled={opened.includes("span")||status!=="playing"}>CAREER SPAN −100</button><button onClick={()=>hint("nation",target.nationality||"Nationality not recorded in this source.")} disabled={opened.includes("nation")||status!=="playing"}>NATIONALITY −100</button></div>
    <form className="cf-guess-form" onSubmit={submit}><input value={guess} onChange={event=>setGuess(event.target.value)} placeholder="Enter player name…" disabled={status!=="playing"}/><button disabled={!guess.trim()||status!=="playing"}>LOCK IN ↗</button></form>
    {note&&<p className="cf-cc0-note">{note}</p>}
    {(status==="won"||status==="lost")&&<div className="cf-result"><b>{status==="won"?"FILE CRACKED · "+score.toLocaleString("en-GB")+" POINTS":"PLAYER IDENTIFIED · NO POINTS"}</b><p>These are Wikidata dated club-membership statements. They do not prove match appearances or the exact dates a player joined or left a club.</p><button onClick={next}>NEXT PLAYER ↗</button><button onClick={resetPractice}>NEW PRACTICE DRAW</button></div>}
    <p className="cf-cc0-source">SOURCE: WIKIDATA · CC0 1.0 UNIVERSAL · MEMBERSHIP STATEMENTS WITH START/END QUALIFIERS</p>
   </div>}
  </section>
  <footer className="cf-footer"><span>PLAYGROUND / CAREER FILE · {playMode.toUpperCase()}</span><span>DATA SCOPE: DATED CLUB MEMBERSHIP · NOT SEASON APPEARANCES</span></footer>
 </main>;
}
