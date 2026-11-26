import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { getCandidates, getPlayer, getTransferHints, type Candidate, type LeagueCode, type Player, type Transfer } from "./careerFileData";
import "./career-file.css";

type Mode = "EASY" | "MEDIUM" | "HARD" | "CULT HERO" | "EXTREME";
type Row = { id:string; season:string; club:string; clubKey:string; loan:boolean; apps:number|null; goals:number|null; covered:boolean; spellApps:number|null; spellGoals:number|null };
type FreeNote = { id:string; label:string; value:string };
type Hint = { id:string; label:string; cost:number; value:string; available:boolean };

const MODES: { name:Mode; note:string; colour:string }[] = [
  {name:"EASY",note:"Global stars and household names",colour:"lime"},
  {name:"MEDIUM",note:"Big names, less obvious careers",colour:"blue"},
  {name:"HARD",note:"For serious football watchers",colour:"orange"},
  {name:"CULT HERO",note:"Fan favourites and cult careers",colour:"pink"},
  {name:"EXTREME",note:"Deep cuts from all five leagues",colour:"violet"}
];

const MODE_NAMES: Record<Exclude<Mode,"EXTREME">,string[]> = {
  EASY: [
    "Cristiano Ronaldo","Lionel Messi","Neymar","Kylian Mbappe","Mohamed Salah","Erling Haaland","Harry Kane",
    "Kevin De Bruyne","Robert Lewandowski","Luka Modric","Sergio Ramos","Zlatan Ibrahimovic","Luis Suarez",
    "Karim Benzema","Wayne Rooney","Thierry Henry","Ronaldinho","Andres Iniesta","Xavi","David Beckham",
    "Steven Gerrard","Frank Lampard","Didier Drogba","Gareth Bale","Eden Hazard","Antoine Griezmann",
    "Thomas Muller","Manuel Neuer","Toni Kroos","Andrea Pirlo","Francesco Totti","Zinedine Zidane",
    "Alessandro Del Piero"
  ],
  MEDIUM: [
    "Sadio Mane","Robin van Persie","David Silva","Angel Di Maria","Edinson Cavani","Carlos Tevez",
    "Fernando Torres","Yaya Toure","Cesc Fabregas","Mesut Ozil","Alexis Sanchez","Radamel Falcao",
    "Gerard Pique","Ivan Rakitic","Samuel Eto'o","Miroslav Klose","Arjen Robben","Franck Ribery",
    "Bastian Schweinsteiger","Wesley Sneijder","Diego Costa","Gonzalo Higuain","Mario Mandzukic",
    "Dani Alves","Marcelo","Vincent Kompany","Nemanja Vidic","Patrice Evra","Juan Mata","Edin Dzeko",
    "Marco Reus","Mario Gotze"
  ],
  HARD: [
    "Antonio Di Natale","Marek Hamsik","Claudio Marchisio","Ezequiel Lavezzi","Diego Milito","Jermain Defoe",
    "Darren Bent","Dimitar Berbatov","Santi Cazorla","Samir Nasri","Juan Roman Riquelme","Diego Forlan",
    "Mikel Arteta","Radja Nainggolan","Arda Turan","Javier Pastore","Ever Banega","Klaas-Jan Huntelaar",
    "Mario Gomez","Kevin Gameiro","Stevan Jovetic","Claudio Pizarro","Aritz Aduriz","Obafemi Martins",
    "Goran Pandev","Antonio Valencia","Giuseppe Rossi","Mauro Zarate"
  ],
  "CULT HERO": [
    "Juninho Pernambucano","Jay-Jay Okocha","Peter Crouch","Nani","Djibril Cisse","Roque Santa Cruz",
    "Antonio Cassano","Tuncay Sanli","Morten Gamst Pedersen","Steed Malbranque","Hossam Ghaly",
    "Nihat Kahveci","Shunsuke Nakamura","Guti","Simao Sabrosa","Ricardo Quaresma","Juan Valeron",
    "Javier Saviola","Elano","Kevin Kuranyi","Florent Malouda","Benjani","Yakubu","Youri Djorkaeff"
  ]
};
const LEAGUES: {label:string;code:LeagueCode}[] = [
  {label:"All top five",code:"ALL"},{label:"Premier League",code:"ENG-PL"},{label:"La Liga",code:"ESP-LL"},
  {label:"Serie A",code:"ITA-SA"},{label:"Bundesliga",code:"DEU-BL"},{label:"Ligue 1",code:"FRA-L1"}
];
const clean=(s:string)=>s.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
const yearOf=(s:string):number|null=>{const m=s.match(/(?:19|20)\d{2}/);return m?Number(m[0]):null;};
const fmt=(v:number|null|undefined)=>v==null?"—":v.toLocaleString("en-GB");
const ordered=(p:Player)=>[...p.spells].sort((a,b)=>(a.start??9999)-(b.start??9999)||a.seq-b.seq);
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
        if(spell.clubQid&&stat.clubQid)return spell.clubQid===stat.clubQid;
        if(spell.clubLink&&stat.clubLink)return clean(spell.clubLink)===clean(stat.clubLink);
        return clean(spell.club)===clean(stat.club);
      });
      rows.push({id:spell.seq+"-"+y,season:y+"/"+String((y+1)%100).padStart(2,"0"),
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
function isSamePlayerName(actual:string,curated:string){
  const a=clean(actual),b=clean(curated);
  if(a===b)return true;
  // Allow a longer formal name where the curated name contains both first and last names,
  // but never classify every player sharing a one-word name (for example, "Xavi").
  return b.includes(" ")&&(a.startsWith(b+" ")||b.startsWith(a+" "));
}
function fits(c:Candidate,m:Mode){
  if(c.statSeasons<2)return false;
  const isCurated=Object.values(MODE_NAMES).some(list=>list.some(name=>isSamePlayerName(c.name,name)));
  if(m==="EXTREME")return !isCurated;
  return MODE_NAMES[m].some(name=>isSamePlayerName(c.name,name));
}
function positionLabel(raw:string){
  const value=raw.toUpperCase();
  if(/GK|GOALKEEPER/.test(value))return "Goalkeeper";
  if(/DF|DEFENDER|BACK/.test(value))return "Defender";
  if(/MF|MIDFIELDER|MID/.test(value))return "Midfielder";
  if(/FW|FORWARD|STRIKER|ATTACK/.test(value))return "Forward";
  return raw.trim();
}
function randomFreeRows(rows:Row[]):string[]{
  const available=rows.filter(row=>row.covered&&(row.apps!==null||row.goals!==null));
  const shuffled=[...available].sort(()=>Math.random()-.5);
  const selected:Row[]=[];
  for(const row of shuffled){
    if(selected.length>=2)break;
    if(!selected.some(existing=>existing.clubKey===row.clubKey))selected.push(row);
  }
  for(const row of shuffled){
    if(selected.length>=2)break;
    if(!selected.some(existing=>existing.id===row.id))selected.push(row);
  }
  return selected.map(row=>row.id);
}
function makeFreeNote(player:Player):FreeNote|null{
  const career=ordered(player);
  const first=career[0],last=career[career.length-1];
  const broadPosition=positionLabel(player.position);
  const options:FreeNote[]=[];
  if(broadPosition)options.push({id:"position",label:"Position group",value:broadPosition});
  if(player.nationality)options.push({id:"nationality",label:"Nationality",value:player.nationality});
  if(first?.start&&last?.end)options.push({id:"span",label:"Career window",value:first.start+"–"+last.end});
  if(!options.length)return null;
  return options[Math.floor(Math.random()*options.length)];
}
function matches(input:string,p:Player){
  const g=clean(input);if(!g)return false;
  const accepted=new Set([clean(p.name),clean(p.fullName)]);
  for(const name of [p.name,p.fullName]){const bits=clean(name).split(" ");if(bits.length)accepted.add(bits[bits.length-1]);}
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

export default function CareerFilePage(){
  const [mode,setMode]=useState<Mode>("EASY");
  const [league,setLeague]=useState<LeagueCode>("ALL");
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
  const seen=useRef<Set<string>>(new Set());

  const newPlayer=useCallback(async(deck:Candidate[],selectedMode:Mode)=>{
    const options=deck.filter(c=>fits(c,selectedMode));
    if(!options.length)throw new Error("There are no verified "+selectedMode+" player files in this league selection yet. Try All Top Five or another difficulty.");
    let available=options.filter(c=>!seen.current.has(c.id));
    if(!available.length){seen.current.clear();available=options;setNote("The draw has cycled. Your used files are back in the mix.");}
    const draw=[...available].sort(()=>Math.random()-.5);
    setLoadingPlayer(true);
    let lastProblem="The player source did not contain two usable season-stat clues.";
    try{
      for(const choice of draw){
        seen.current.add(choice.id);
        try{
          const record=await getPlayer(choice.id);
          const timeline=makeRows(record);
          if(!timeline.length){lastProblem="The player had no readable career timeline.";continue;}
          const free=randomFreeRows(timeline);
          if(free.length<2){lastProblem="The player had fewer than two season records that could be matched to their club career.";continue;}
          const note=makeFreeNote(record);
          setPlayer(record);setRows(timeline);setFreeRows(free);setRevealed(free);setFreeNote(note);
          setOpened(note?[note.id]:[]);setRound(n=>n+1);setStatus("playing");
          return;
        }catch(problem){
          lastProblem=problem instanceof Error?problem.message:"Could not read this player's career file.";
        }
      }
      throw new Error("No complete player file could be drawn for "+selectedMode+". "+lastProblem+" Try another league or difficulty.");
    }finally{setLoadingPlayer(false);}
  },[]);

  useEffect(()=>{
    let live=true;seen.current.clear();setBusy(true);setError("");
    setPlayer(null);setRows([]);setOpened([]);setRevealed([]);setFreeRows([]);setFreeNote(null);setTransfers(null);setFeesError("");
    setGuess("");setAttempts(0);setScore(1000);setStatus("playing");setNote("");
    getCandidates(league).then(async list=>{if(!live)return;setPool(list);await newPlayer(list,mode);})
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
    if(matches(guess,player)){setStatus("won");setNote("FILE CRACKED. Nice read.");setGuess("");return;}
    const next=attempts+1;setAttempts(next);setScore(v=>Math.max(0,v-50));setNote("Not that one. Keep reading the file.");setGuess("");
    if(next>=10){setStatus("lost");setRevealed(rows.map(r=>r.id));}
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
    <section className="cf-controlbar">
      <div className="cf-control-title"><span>01 / CHOOSE YOUR COMPETITION</span><strong>WHERE DID THEY PLAY?</strong></div>
      <div className="cf-leagues">{LEAGUES.map(x=><button key={x.code} className={league===x.code?"active":""} onClick={()=>setLeague(x.code)}>{x.label}</button>)}</div>
    </section>
    <section className="cf-mode-area">
      <div className="cf-mode-title"><span>02 / SET THE DIFFICULTY</span><span>THE HARDER THE FILE, THE LESS OBVIOUS THE NAME</span></div>
      <div className="cf-mode-grid">{MODES.map((m,i)=><motion.button key={m.name}
        className={"cf-mode-card "+m.colour+(mode===m.name?" chosen":"")} onClick={()=>setMode(m.name)}
        whileHover={{y:-5,rotate:i%2?1:-1}} whileTap={{scale:.98}}>
        <span className="cf-mode-index">0{i+1} / PG</span><strong>{m.name}</strong><small>{m.note}</small><small className="cf-mode-count">{pool.length?pool.filter(c=>fits(c,m.name)).length+" FILES IN THE DRAW":"LOADING PLAYER POOL"}</small><i>{mode===m.name?"SELECTED ✓":"SELECT ↗"}</i>
      </motion.button>)}</div>
      <div className="cf-round-note"><span><b>{mode}</b> / {league==="ALL"?"ALL FIVE LEAGUES":LEAGUES.find(x=>x.code===league)?.label.toUpperCase()}</span><span>10 GUESSES · 1,000 STARTING POINTS · 2 FREE SEASONS</span></div>
    </section>
    <section className="cf-game-area">
      <div className="cf-game-heading"><div><span>03 / THE DOSSIER</span><h2>WHO'S THE<br/><em>PLAYER?</em></h2></div>
        <div className="cf-round-count"><small>FILE NUMBER</small><strong>{String(round||1).padStart(3,"0")}</strong><span>NEW FILE EACH ROUND</span></div>
      </div>
      {(busy||loadingPlayer)&&<div className="cf-loading"><motion.div animate={{rotate:360}} transition={{repeat:Infinity,duration:1.6,ease:"linear"}}>✳</motion.div>
        <b>{busy?"OPENING THE PLAYER ARCHIVE":"BUILDING THE CAREER FILE"}</b><span>Pulling the career, seasons and available statistics.</span></div>}
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
          <div className="cf-record-foot"><span>APPS / GOALS: WHERE A SEASON SOURCE EXISTS</span><span>— = NOT RECORDED</span></div>
          <div className="cf-source-note">Career-spell totals are shown separately from season totals. Season totals are only shown where the source has them; missing totals are not guessed. Source statistics are marked unverified. <a href={player.wikipediaUrl} target="_blank" rel="noreferrer">OPEN THE ORIGINAL PLAYER SOURCE ↗</a></div>
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
              {opened.includes("fees")&&(feesBusy?<p>Searching the transfer archive…</p>:feesError?<p>{feesError}</p>:transfers?.length?
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
        <p>Career timelines derive from OpenFootballBase. Its five major-league squad archive covers 2000/01 onwards; player infobox timelines can include earlier senior spells. Appearance and goal figures are published as found on English Wikipedia and are explicitly unverified. Wikipedia text is CC BY-SA 4.0; Wikidata is CC0. Player source pages and revisions are traceable.</p>
        <p>Transfer clues use Tiago Cumetti’s Football Transfers Dataset (2005–2024), collected from Transfermarkt pages. It is CC BY 4.0 and includes undisclosed or missing fees. No match does not mean a free transfer.</p>
        <a href="https://github.com/florentfougeres/OpenFootballBase-Data" target="_blank" rel="noreferrer">OPEN FOOTBALL DATA SOURCE ↗</a>
        <a href="https://doi.org/10.5281/zenodo.17921143" target="_blank" rel="noreferrer">TRANSFER DATA / DOI ↗</a>
      </div>
    </section>
    <footer className="cf-footer"><a href="/">PLAYGROUND®</a><span>FOOTBALL, PLAYED DIFFERENTLY.</span><a href="#top" onClick={e=>{e.preventDefault();window.scrollTo({top:0,behavior:"smooth"});}}>BACK TO KICK-OFF ↑</a></footer>
  </main>;
}