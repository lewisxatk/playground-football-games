import { useState } from "react";
import { motion } from "motion/react";
import CareerFilePage from "./CareerFilePage";

type Game = { number: string; title: string; description: string; tag: string; tone: string; icon: string; status: string };

const games: Game[] = [
  { number: "01", title: "LOWBALL", description: "Know your football? Prove it when the pressure is on.", tag: "QUICK FIRE", tone: "lime", icon: "↘", status: "PLAY NOW" },
  { number: "02", title: "THE CLIMB", description: "One wrong answer and the run is over. How far can you go?", tag: "STREAK", tone: "orange", icon: "↗", status: "READY" },
  { number: "03", title: "DRAFT XI", description: "Build a side. Make the picks. Back your football brain.", tag: "SQUAD BUILDER", tone: "blue", icon: "✳", status: "PLAY NOW" },
  { number: "04", title: "CAREER FILE", description: "Read the seasons. Unlock clues. Name the player.", tag: "PLAYER QUIZ", tone: "pink", icon: "?", status: "PLAY NOW" },
];


type StatCard = {name:string; club:string; nation:string; stat:number; label:string};
const duelRounds:StatCard[][] = [
 [{name:"Alan Shearer",club:"Newcastle United",nation:"England",stat:260,label:"Premier League goals"},{name:"Wayne Rooney",club:"Manchester United",nation:"England",stat:208,label:"Premier League goals"}],
 [{name:"Steven Gerrard",club:"Liverpool",nation:"England",stat:120,label:"Premier League goals"},{name:"Paul Scholes",club:"Manchester United",nation:"England",stat:107,label:"Premier League goals"}],
 [{name:"Thierry Henry",club:"Arsenal",nation:"France",stat:175,label:"Premier League goals"},{name:"Frank Lampard",club:"Chelsea",nation:"England",stat:177,label:"Premier League goals"}],
 [{name:"Mohamed Salah",club:"Liverpool",nation:"Egypt",stat:193,label:"Premier League goals"},{name:"Robbie Fowler",club:"Liverpool",nation:"England",stat:163,label:"Premier League goals"}]
];
function Lowball() {
 const [round,setRound]=useState(0); const [score,setScore]=useState(0); const [streak,setStreak]=useState(0); const [feedback,setFeedback]=useState("");
 const pair=duelRounds[round%duelRounds.length]; const choose=(idx:number)=>{if(feedback)return; const win=pair[idx].stat>pair[1-idx].stat; if(win){setScore(v=>v+100+streak*20);setStreak(v=>v+1);setFeedback("CORRECT — "+pair[idx].name+" has "+pair[idx].stat+" "+pair[idx].label.toLowerCase()+".");}else{setStreak(0);setFeedback("NOT QUITE — "+pair[1-idx].name+" leads with "+pair[1-idx].stat+".");}};
 const next=()=>{setRound(v=>v+1);setFeedback("");};
 return <div className="play-panel"><div className="play-panel-head"><span>LOWBALL / STAT FACE-OFF</span><span>SCORE {score} · STREAK {streak}</span></div><h3>WHO'S GOT <em>MORE?</em></h3><p className="play-sub">Pick the player with the higher total. One stat. No guesswork.</p><div className="duel-grid">{pair.map((p,i)=><button className="duel-card" key={p.name} onClick={()=>choose(i)} disabled={!!feedback}><span className="duel-number">0{i+1}</span><strong>{p.name}</strong><span>{p.club} · {p.nation}</span><b>?</b></button>)}</div><div className="duel-stat">{pair[0].label.toUpperCase()}</div>{feedback&&<div className="game-feedback">{feedback}<button onClick={next}>NEXT DUEL ↗</button></div>}</div>;
}
const climbQuestions=[
 {q:"Which club did Didier Drogba join from Marseille in 2004?",a:["Chelsea","Arsenal","Liverpool","Tottenham"],correct:"Chelsea",fact:"Drogba joined Chelsea in July 2004."},
 {q:"Which country did George Weah represent internationally?",a:["Nigeria","Liberia","Ghana","Cameroon"],correct:"Liberia",fact:"Weah is Liberia's most famous footballer and later became president."},
 {q:"Who scored the winning goal in the 2014 World Cup final?",a:["Lionel Messi","Mario Götze","Thomas Müller","Miroslav Klose"],correct:"Mario Götze",fact:"Götze scored in extra time against Argentina."},
 {q:"Which club is known as Los Colchoneros?",a:["Real Madrid","Sevilla","Atlético Madrid","Valencia"],correct:"Atlético Madrid",fact:"Los Colchoneros is the nickname of Atlético Madrid."},
 {q:"Who was the first Premier League club to go unbeaten for a full season?",a:["Chelsea","Arsenal","Manchester United","Liverpool"],correct:"Arsenal",fact:"Arsenal's Invincibles went unbeaten in 2003/04."}
];
function TheClimb(){
 const [step,setStep]=useState(0);const [lives,setLives]=useState(3);const [score,setScore]=useState(0);const [answer,setAnswer]=useState("");const [done,setDone]=useState(false);
 const q=climbQuestions[step%climbQuestions.length];
 const pick=(v:string)=>{if(answer||done)return;setAnswer(v);if(v===q.correct)setScore(s=>s+100+(lives*25));else setLives(l=>l-1);};
 const next=()=>{if(lives<=0||step===climbQuestions.length-1){setDone(true);return;}setStep(s=>s+1);setAnswer("");};
 const restart=()=>{setStep(0);setLives(3);setScore(0);setAnswer("");setDone(false);};
 return <div className="play-panel climb-panel"><div className="play-panel-head"><span>THE CLIMB / SURVIVAL QUIZ</span><span>{lives} LIVES · {score} PTS</span></div><div className="climb-progress">{climbQuestions.map((_,i)=><i key={i} className={i<=step?"filled":""}/>)}</div>{done?<div className="climb-end"><h3>RUN <em>COMPLETE.</em></h3><p>You climbed {step+1} questions and banked {score} points.</p><button className="solid-game-btn" onClick={restart}>RUN IT BACK ↻</button></div>:<><span className="career-kicker">QUESTION {step+1} / {climbQuestions.length}</span><h3>{q.q}</h3><div className="climb-answers">{q.a.map(v=><button key={v} className={answer===v?(v===q.correct?"answer-correct":"answer-wrong"):""} disabled={!!answer} onClick={()=>pick(v)}>{v}<span>↗</span></button>)}</div>{answer&&<div className="game-feedback">{answer===q.correct?"RIGHT ANSWER. ":"NOT THIS TIME. "}{q.fact}<button onClick={next}>{step===climbQuestions.length-1||lives<=0?"SEE RESULT":"NEXT QUESTION ↗"}</button></div>}</>}</div>;
}
const draftPool=[
 {name:"Alisson",pos:"GK",cost:8},{name:"Trent Alexander-Arnold",pos:"DEF",cost:9},{name:"Virgil van Dijk",pos:"DEF",cost:10},{name:"Rúben Dias",pos:"DEF",cost:9},{name:"Andrew Robertson",pos:"DEF",cost:8},{name:"Rodri",pos:"MID",cost:10},{name:"Kevin De Bruyne",pos:"MID",cost:10},{name:"Jude Bellingham",pos:"MID",cost:10},{name:"Bukayo Saka",pos:"FWD",cost:9},{name:"Erling Haaland",pos:"FWD",cost:11},{name:"Mohamed Salah",pos:"FWD",cost:11},{name:"Declan Rice",pos:"MID",cost:8},{name:"William Saliba",pos:"DEF",cost:8},{name:"Son Heung-min",pos:"FWD",cost:9},{name:"Bruno Fernandes",pos:"MID",cost:9},{name:"Ederson",pos:"GK",cost:7}
];
function DraftXI(){
 const [picked,setPicked]=useState<string[]>([]);
 const [locked,setLocked]=useState(false);
 const budget=85;const spent=draftPool.filter(p=>picked.includes(p.name)).reduce((n,p)=>n+p.cost,0);
 const toggle=(name:string)=>{if(locked)return;setPicked(old=>old.includes(name)?old.filter(x=>x!==name):old.length<11?[...old,name]:old);};
 const counts={GK:picked.filter(n=>draftPool.find(p=>p.name===n)?.pos==="GK").length,DEF:picked.filter(n=>draftPool.find(p=>p.name===n)?.pos==="DEF").length,MID:picked.filter(n=>draftPool.find(p=>p.name===n)?.pos==="MID").length,FWD:picked.filter(n=>draftPool.find(p=>p.name===n)?.pos==="FWD").length};
 const valid=counts.GK===1&&counts.DEF>=3&&counts.MID>=2&&counts.FWD>=1&&picked.length===11;
 return <div className="play-panel"><div className="play-panel-head"><span>DRAFT XI / SQUAD BUILDER</span><span>{picked.length}/11 SELECTED</span></div><h3>BUILD YOUR <em>BEST XI.</em></h3><p className="play-sub">Pick 11 players. Stay under £85m. Build a balanced side.</p><div className="draft-budget"><span>BUDGET USED</span><strong>£{spent}m <small>/ £{budget}m</small></strong><div><i style={{width:Math.min(100,spent/budget*100)+"%"}}/></div></div><div className="draft-layout"><div className="draft-pitch"><div className="draft-pitch-line"/><div className="draft-formation">4 — 3 — 3</div>{picked.map((name,i)=><div className={"draft-shirt shirt-"+i} key={name}><b>{draftPool.find(p=>p.name===name)?.pos}</b><span>{name.split(" ").slice(-1)[0]}</span></div>)}</div><div className="draft-list">{draftPool.map(p=><button key={p.name} onClick={()=>toggle(p.name)} className={picked.includes(p.name)?"picked":""} disabled={!picked.includes(p.name)&&(picked.length>=11||spent+p.cost>budget)}><span><b>{p.name}</b><small>{p.pos}</small></span><strong>£{p.cost}m</strong><i>{picked.includes(p.name)?"−":"+"}</i></button>)}</div></div><div className="draft-footer"><span>{locked?"YOUR XI IS LOCKED · NICE WORK":`GK ${counts.GK} · DEF ${counts.DEF} · MID ${counts.MID} · FWD ${counts.FWD}`}</span><button className="solid-game-btn" disabled={!valid||locked} onClick={()=>setLocked(true)}> {locked?"SQUAD SUBMITTED ✓":valid?"LOCK IN YOUR XI ↗":"COMPLETE YOUR XI"} </button></div></div>;
}

function HomePage() {
  const [active, setActive] = useState("ALL GAMES");
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);
  const [playing, setPlaying] = useState("");
  const filters = ["ALL GAMES", "QUICK FIRE", "STREAK", "PLAYER QUIZ"];
  const visible = active === "ALL GAMES" ? games : games.filter((g) => g.tag === active);
  const launch = (name:string) => { setPlaying(name); document.getElementById("game-player")?.scrollIntoView({behavior:"smooth",block:"start"}); };

  return (
    <main className="site-shell">
      <div className="topline"><span>THE HOME OF FOOTBALL FUN</span><span className="topline-right"><i className="live-dot" /> BUILT FOR THE LOVE OF THE GAME <span className="topline-star">✳</span></span></div>
      <header className="nav">
        <a className="wordmark" href="/" aria-label="Playground home">PLAY<span>GROUND</span><b>®</b></a>
        <nav className="nav-links" aria-label="Main navigation">
          <a className="nav-active" href="#games">THE GAMES</a><a href="#about">OUR WORLD</a><a href="#daily">DAILY PLAY</a>
        </nav>
        <a className="nav-cta" href="#games">PICK A GAME <span>↗</span></a>
        <button className="menu-button" aria-label="Menu">☰</button>
      </header>

      <section className="hero" id="about">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> FOOTBALL. NO HALF-TIME. <span className="eyebrow-stamp">EST. 2026</span></div>
          <h1>FOOTBALL<br/><em>IS A</em> <span className="highlight-word">PLAYGROUND.</span></h1>
          <p className="hero-intro">A little competition never hurt anyone. Quick games, big opinions and bragging rights that last all week.</p>
          <div className="hero-actions"><a className="button button-primary" href="#games">FIND YOUR GAME <span>↗</span></a><a className="text-link" href="#daily">WHAT'S THE DAILY? <span>↓</span></a></div>
          <div className="hero-footnote"><span className="footnote-star">✳</span><span>NO SCOUTING BADGES REQUIRED.<br/>JUST A PROPER LOVE OF FOOTBALL.</span></div>
        </div>
        <div className="hero-art" aria-label="Illustrated football pitch">
          <div className="art-topline"><span>FIG. 001 / THE BEAUTIFUL GAME</span><span>51°30'26.4"N</span></div>
          <div className="pitch">
            <div className="pitch-midline"/><div className="pitch-circle"/><div className="pitch-box pitch-box-left"/><div className="pitch-box pitch-box-right"/>
            <div className="orbit orbit-one"/><div className="orbit orbit-two"/>
            <div className="ball"><span>✳</span></div>
            <div className="player player-one"><span>9</span></div><div className="player player-two"><span>10</span></div><div className="player player-three"><span>7</span></div>
            <div className="scribble">GO<br/>ON!</div>
            <div className="art-label">PLAY<br/>YOUR<br/>WAY <b>↗</b></div>
          </div>
          <div className="art-bottomline"><span>KEEP IT MOVING.</span><span>PLAYGROUND CLUB ©26</span></div>
          <div className="sticker">GOOD<br/>GAME<br/><b>!</b></div>
        </div>
        <div className="hero-side-note">THE BEAUTIFUL GAME, WITH A TWIST — SCROLL TO PLAY ↓</div>
      </section>

      <section className="ticker" aria-label="Playground motto"><div className="ticker-track">{Array.from({length:8},(_,i)=><span key={i}>LESS SCROLLING <b>✳</b> MORE SCORING <b>✳</b> TALK IS CHEAP <b>✳</b></span>)}</div></section>

      <section className="games-section" id="games">
        <div className="section-head"><div><div className="eyebrow"><span className="eyebrow-line"/> THE LINE-UP / 001—004</div><h2>WHAT'S <em>YOUR</em><br/>NEXT MOVE?</h2></div><p>Four ways to test your football brain. Pick your poison, back yourself and see how you stack up.</p></div>
        <div className="filter-row" role="group" aria-label="Filter games">{filters.map((f)=><button key={f} className={active===f?"filter active":"filter"} onClick={()=>setActive(f)}>{f}<span>↗</span></button>)}</div>
        <div className="game-grid">{visible.map((g,i)=><motion.article key={g.number} className={`game-card ${g.tone}`} initial={{opacity:0,y:18}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.2}} transition={{duration:.45,delay:i*.07}}>
          <div className="card-top"><span>PG / GAME {g.number}</span><span className="card-status">{g.status}</span></div>
          <div className="game-symbol">{g.icon}</div>
          <div className="game-card-bottom"><span className="game-tag">{g.tag}</span><h3>{g.title}</h3><p>{g.description}</p><button onClick={()=>g.title === "CAREER FILE" ? window.location.assign("/career-file") : launch(g.title)} className="card-link" aria-label={`Play ${g.title}`}>↗</button></div>
        </motion.article>)}</div>
      </section>


      <section className="daily-section" id="daily"><div className="daily-left"><div className="eyebrow"><span className="eyebrow-line"/> THE DAILY / YOUR MOVE</div><h2>ONE DAY.<br/><em>ONE SHOT.</em><br/>ALL BRAGGING.</h2><p>A fresh challenge to get the group chat going. Get involved, compare scores and settle absolutely nothing.</p></div><div className="daily-ticket"><div className="ticket-header"><span>PLAYGROUND DAILY</span><span>NO. 001</span></div><div className="ticket-main"><span className="ticket-star">✳</span><span className="ticket-small">YOUR DAILY DOSE OF FOOTBALL</span><strong>READY<br/>WHEN<br/>YOU ARE.</strong><span className="ticket-arrow">↗</span></div><div className="ticket-footer"><span>ONE CHALLENGE. EVERY DAY.</span><span>PG—001</span></div></div></section>

      <section className="community"><div><div className="eyebrow"><span className="eyebrow-line"/> THE TOUCHLINE</div><h2>GOOD GAME.<br/><em>BETTER COMPANY.</em></h2><p>Be first to hear when new games and challenges drop.</p></div><form className="signup" onSubmit={(e)=>{e.preventDefault();if(email.trim())setJoined(true);}}><label htmlFor="email">YOUR EMAIL ADDRESS</label><div className="signup-row"><input id="email" type="email" placeholder="you@thetouchline.com" value={email} onChange={e=>setEmail(e.target.value)} required/><button type="submit">{joined?"YOU'RE IN ✓":"COUNT ME IN ↗"}</button></div><small>{joined?"You're on the list. See you on the touchline.":"No spam. Just the good stuff. Unsubscribe whenever."}</small></form></section>

      <footer className="footer"><a className="wordmark footer-mark" href="/">PLAY<span>GROUND</span><b>®</b></a><span>FOOTBALL, PLAYED DIFFERENTLY.</span><span>© PLAYGROUND 2026</span><a href="#about">BACK TO TOP ↑</a></footer>
    </main>
  );
}

export default App;


function App() {
  const path = window.location.pathname.replace(/\/+$/, "");
  return path === "/career-file" ? <CareerFilePage /> : <HomePage />;
}

export default App;
