import { useState } from "react";
import { motion } from "motion/react";

type Game = { number: string; title: string; description: string; tag: string; tone: string; icon: string; status: string };

const games: Game[] = [
  { number: "01", title: "LOWBALL", description: "Know your football? Prove it when the pressure is on.", tag: "QUICK FIRE", tone: "lime", icon: "↘", status: "READY" },
  { number: "02", title: "THE CLIMB", description: "One wrong answer and the run is over. How far can you go?", tag: "STREAK", tone: "orange", icon: "↗", status: "READY" },
  { number: "03", title: "DRAFT XI", description: "Build a side. Make the picks. Back your football brain.", tag: "SQUAD BUILDER", tone: "blue", icon: "✳", status: "COMING UP" },
  { number: "04", title: "CAREER FILE", description: "Read the seasons. Unlock clues. Name the player.", tag: "PLAYER QUIZ", tone: "pink", icon: "?", status: "COMING UP" },
];


type CareerPlayer = {
  name: string; difficulty: string; category: string; nationality: string; position: string; age: number; status: string;
  seasons: { season: string; club: string; apps: number; goals: number }[];
  spotlight: string; spotlightClub: string; spotlightApps: number; spotlightGoals: number;
};
const careerPlayers: CareerPlayer[] = [
  { name: "Mohamed Salah", difficulty: "EASY", category: "STAR", nationality: "Egypt", position: "Forward", age: 34, status: "Current player",
    seasons: [
      {season:"2017/18",club:"Liverpool",apps:52,goals:44},{season:"2018/19",club:"Liverpool",apps:52,goals:27},
      {season:"2019/20",club:"Liverpool",apps:48,goals:23},{season:"2020/21",club:"Liverpool",apps:51,goals:31},
      {season:"2021/22",club:"Liverpool",apps:51,goals:31},{season:"2022/23",club:"Liverpool",apps:51,goals:30},
      {season:"2023/24",club:"Liverpool",apps:44,goals:25},{season:"2024/25",club:"Liverpool",apps:52,goals:34}
    ], spotlight:"2017/18",spotlightClub:"Liverpool",spotlightApps:52,spotlightGoals:44 },
  { name: "Kevin De Bruyne", difficulty: "MEDIUM", category: "PLAYMAKER", nationality: "Belgium", position: "Midfielder", age: 35, status: "Current player",
    seasons: [
      {season:"2015/16",club:"Manchester City",apps:41,goals:16},{season:"2016/17",club:"Manchester City",apps:49,goals:7},
      {season:"2017/18",club:"Manchester City",apps:52,goals:12},{season:"2018/19",club:"Manchester City",apps:32,goals:6},
      {season:"2019/20",club:"Manchester City",apps:48,goals:16},{season:"2020/21",club:"Manchester City",apps:40,goals:10},
      {season:"2021/22",club:"Manchester City",apps:45,goals:19},{season:"2022/23",club:"Manchester City",apps:49,goals:10}
    ], spotlight:"2021/22",spotlightClub:"Manchester City",spotlightApps:45,spotlightGoals:19 },
  { name: "Steven Gerrard", difficulty: "HARD", category: "CLUB LEGEND", nationality: "England", position: "Midfielder", age: 46, status: "Retired",
    seasons: [
      {season:"2000/01",club:"Liverpool",apps:50,goals:10},{season:"2001/02",club:"Liverpool",apps:45,goals:4},
      {season:"2002/03",club:"Liverpool",apps:54,goals:7},{season:"2003/04",club:"Liverpool",apps:47,goals:6},
      {season:"2004/05",club:"Liverpool",apps:43,goals:13},{season:"2005/06",club:"Liverpool",apps:53,goals:23},
      {season:"2006/07",club:"Liverpool",apps:51,goals:11},{season:"2007/08",club:"Liverpool",apps:52,goals:21}
    ], spotlight:"2005/06",spotlightClub:"Liverpool",spotlightApps:53,spotlightGoals:23 },
  { name: "Matt Le Tissier", difficulty: "CULT HERO", category: "ONE-CLUB ICON", nationality: "England", position: "Forward", age: 57, status: "Retired",
    seasons: [
      {season:"1989/90",club:"Southampton",apps:44,goals:24},{season:"1990/91",club:"Southampton",apps:43,goals:23},
      {season:"1991/92",club:"Southampton",apps:51,goals:15},{season:"1992/93",club:"Southampton",apps:44,goals:18},
      {season:"1993/94",club:"Southampton",apps:40,goals:25},{season:"1994/95",club:"Southampton",apps:32,goals:6}
    ], spotlight:"1993/94",spotlightClub:"Southampton",spotlightApps:40,spotlightGoals:25 }
];
function CareerFile() {
  const [difficulty, setDifficulty] = useState("EASY");
  const [round, setRound] = useState(0);
  const [guess, setGuess] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(100);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [result, setResult] = useState("");
  const player = careerPlayers.find(p => p.difficulty === difficulty) ?? careerPlayers[0];
  const hints = [
    { id:"nationality", label:"Nationality", value:player.nationality, cost:10 },
    { id:"position", label:"Position", value:player.position, cost:10 },
    { id:"age", label:"Age", value:`${player.age} · ${player.status}`, cost:15 },
    { id:"spotlight", label:"Season spotlight", value:`${player.spotlight} · ${player.spotlightClub} · ${player.spotlightApps} apps · ${player.spotlightGoals} goals`, cost:20 }
  ];
  const used = revealed.reduce((total,id)=>total+(hints.find(h=>h.id===id)?.cost ?? 0),0);
  const points = Math.max(0, score - used);
  const submit = () => {
    if (!guess.trim() || result) return;
    const normal = (v:string) => v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z ]/g,"").trim();
    const correct = normal(guess) === normal(player.name) || normal(player.name).split(" ").some(part=>part.length>3 && normal(guess)===part);
    if (correct) setResult("correct");
    else { setAttempts(a=>a+1); setScore(s=>Math.max(0,s-10)); if (attempts>=4) setResult("missed"); }
    setGuess("");
  };
  const next = () => { setRound(r=>r+1); setGuess(""); setAttempts(0); setScore(100); setRevealed([]); setResult(""); };
  const changeDifficulty = (v:string) => { setDifficulty(v); setRound(0); setGuess(""); setAttempts(0); setScore(100); setRevealed([]); setResult(""); };
  const unlock = (id:string) => { if (!revealed.includes(id) && !result) setRevealed(old=>[...old,id]); };
  return <div className="career-game">
    <div className="career-toolbar"><div><span className="career-kicker">CHOOSE YOUR FILE</span><div className="career-modes">{["EASY","MEDIUM","HARD","CULT HERO"].map(mode=><button key={mode} className={difficulty===mode?"career-mode selected":"career-mode"} onClick={()=>changeDifficulty(mode)}>{mode}</button>)}</div></div><div className="career-score"><span>YOUR SCORE</span><strong>{points}<small> PTS</small></strong></div></div>
    <div className="career-main">
      <div className="career-record">
        <div className="record-top"><span>PLAYER CAREER / SEASON RECORD</span><span>FILE {String(round+1).padStart(2,"0")}</span></div>
        <div className="record-title"><div><span className="career-kicker">MYSTERY PLAYER</span><h3>WHO'S<br/><em>THE PLAYER?</em></h3></div><div className="silhouette">?</div></div>
        <div className="career-table-wrap"><table className="career-table"><thead><tr><th>SEASON</th><th>CLUB</th><th>APPS</th><th>GOALS</th></tr></thead><tbody>{player.seasons.map((s,i)=><tr key={s.season}><td>{s.season}</td><td>{s.club}</td><td>{s.apps}</td><td>{s.goals}</td></tr>)}</tbody></table></div>
        <div className="record-foot"><span>COMPETITIVE APPEARANCES & GOALS</span><span>DATA SAMPLE / SEE SOURCES</span></div>
      </div>
      <div className="career-side">
        <div className="career-panel"><span className="career-kicker">MAKE YOUR CALL</span><label htmlFor="career-guess">NAME THE FOOTBALLER</label><form className="career-guess-row" onSubmit={e=>{e.preventDefault();submit();}}><input id="career-guess" value={guess} onChange={e=>setGuess(e.target.value)} placeholder="Type a player's name…" disabled={!!result}/><button disabled={!!result || !guess.trim()}>GUESS ↗</button></form><div className="career-attempts"><span>{5-attempts} GUESSES LEFT</span><span>−10 PTS PER WRONG GUESS</span></div>{result==="correct"&&<div className="career-result success">THAT'S IT. {player.name.toUpperCase()} — YOU GOT IT WITH {points} POINTS.</div>}{result==="missed"&&<div className="career-result">OUT OF GUESSES. THE PLAYER WAS {player.name.toUpperCase()}.</div>}</div>
        <div className="career-panel hints-panel"><div className="hints-heading"><span className="career-kicker">UNLOCK A CLUE</span><span>CLUES COST POINTS</span></div>{hints.map(h=><div className="hint-row" key={h.id}><div><strong>{h.label}</strong>{revealed.includes(h.id)&&<p>{h.value}</p>}</div><button onClick={()=>unlock(h.id)} disabled={revealed.includes(h.id)||!!result}>{revealed.includes(h.id)?"UNLOCKED":`−${h.cost} PTS ↗`}</button></div>)}</div>
        <div className="career-actions"><button className="career-reset" onClick={next}>{result?"NEXT PLAYER ↗":"RESET ROUND ↻"}</button><span>WRONG ANSWERS ALSO COST 10 POINTS</span></div>
      </div>
    </div>
    <div className="career-disclaimer">PLAYGROUND PREVIEW · Sample career records for testing the game mechanic. Full player database, source auditing and additional hard-mode rounds are the next data task.</div>
  </div>;
}

function App() {
  const [active, setActive] = useState("ALL GAMES");
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);
  const filters = ["ALL GAMES", "QUICK FIRE", "STREAK", "PLAYER QUIZ"];
  const visible = active === "ALL GAMES" ? games : games.filter((g) => g.tag === active);

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
          <div className="game-card-bottom"><span className="game-tag">{g.tag}</span><h3>{g.title}</h3><p>{g.description}</p><a href={g.title === "CAREER FILE" ? "#career-file" : "#daily"} className="card-link" aria-label={`Explore ${g.title}`}>↗</a></div>
        </motion.article>)}</div>
      </section>


      <section className="career-section" id="career-file">
        <div className="career-heading">
          <div><div className="eyebrow"><span className="eyebrow-line"/> NEW GAME / PLAYER IDENTITY</div><h2>CAREER <em>FILE.</em></h2><p>Every season leaves a trace. Study the numbers, unlock the clues and name the player before your points disappear.</p></div>
          <div className="career-stamp">PG<br/>PLAYER<br/>ARCHIVE<br/><b>№ 01</b></div>
        </div>
        <CareerFile />
      </section>

      <section className="daily-section" id="daily"><div className="daily-left"><div className="eyebrow"><span className="eyebrow-line"/> THE DAILY / YOUR MOVE</div><h2>ONE DAY.<br/><em>ONE SHOT.</em><br/>ALL BRAGGING.</h2><p>A fresh challenge to get the group chat going. Get involved, compare scores and settle absolutely nothing.</p></div><div className="daily-ticket"><div className="ticket-header"><span>PLAYGROUND DAILY</span><span>NO. 001</span></div><div className="ticket-main"><span className="ticket-star">✳</span><span className="ticket-small">YOUR DAILY DOSE OF FOOTBALL</span><strong>READY<br/>WHEN<br/>YOU ARE.</strong><span className="ticket-arrow">↗</span></div><div className="ticket-footer"><span>ONE CHALLENGE. EVERY DAY.</span><span>PG—001</span></div></div></section>

      <section className="community"><div><div className="eyebrow"><span className="eyebrow-line"/> THE TOUCHLINE</div><h2>GOOD GAME.<br/><em>BETTER COMPANY.</em></h2><p>Be first to hear when new games and challenges drop.</p></div><form className="signup" onSubmit={(e)=>{e.preventDefault();if(email.trim())setJoined(true);}}><label htmlFor="email">YOUR EMAIL ADDRESS</label><div className="signup-row"><input id="email" type="email" placeholder="you@thetouchline.com" value={email} onChange={e=>setEmail(e.target.value)} required/><button type="submit">{joined?"YOU'RE IN ✓":"COUNT ME IN ↗"}</button></div><small>{joined?"You're on the list. See you on the touchline.":"No spam. Just the good stuff. Unsubscribe whenever."}</small></form></section>

      <footer className="footer"><a className="wordmark footer-mark" href="/">PLAY<span>GROUND</span><b>®</b></a><span>FOOTBALL, PLAYED DIFFERENTLY.</span><span>© PLAYGROUND 2026</span><a href="#about">BACK TO TOP ↑</a></footer>
    </main>
  );
}

export default App;
