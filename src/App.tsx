import { useState } from "react";
import { motion } from "motion/react";

type Game = { number: string; title: string; description: string; tag: string; tone: string; icon: string; status: string };

const games: Game[] = [
  { number: "01", title: "LOWBALL", description: "Know your football? Prove it when the pressure is on.", tag: "QUICK FIRE", tone: "lime", icon: "↘", status: "READY" },
  { number: "02", title: "THE CLIMB", description: "One wrong answer and the run is over. How far can you go?", tag: "STREAK", tone: "orange", icon: "↗", status: "READY" },
  { number: "03", title: "DRAFT XI", description: "Build a side. Make the picks. Back your football brain.", tag: "SQUAD BUILDER", tone: "blue", icon: "✳", status: "COMING UP" },
  { number: "04", title: "WHO AM I?", description: "Clues get easier. Your score gets smaller. Name the player.", tag: "PLAYER QUIZ", tone: "pink", icon: "?", status: "COMING UP" },
];

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
          <div className="game-card-bottom"><span className="game-tag">{g.tag}</span><h3>{g.title}</h3><p>{g.description}</p><a href="#daily" className="card-link" aria-label={`Explore ${g.title}`}>↗</a></div>
        </motion.article>)}</div>
      </section>

      <section className="daily-section" id="daily"><div className="daily-left"><div className="eyebrow"><span className="eyebrow-line"/> THE DAILY / YOUR MOVE</div><h2>ONE DAY.<br/><em>ONE SHOT.</em><br/>ALL BRAGGING.</h2><p>A fresh challenge to get the group chat going. Get involved, compare scores and settle absolutely nothing.</p></div><div className="daily-ticket"><div className="ticket-header"><span>PLAYGROUND DAILY</span><span>NO. 001</span></div><div className="ticket-main"><span className="ticket-star">✳</span><span className="ticket-small">YOUR DAILY DOSE OF FOOTBALL</span><strong>READY<br/>WHEN<br/>YOU ARE.</strong><span className="ticket-arrow">↗</span></div><div className="ticket-footer"><span>ONE CHALLENGE. EVERY DAY.</span><span>PG—001</span></div></div></section>

      <section className="community"><div><div className="eyebrow"><span className="eyebrow-line"/> THE TOUCHLINE</div><h2>GOOD GAME.<br/><em>BETTER COMPANY.</em></h2><p>Be first to hear when new games and challenges drop.</p></div><form className="signup" onSubmit={(e)=>{e.preventDefault();if(email.trim())setJoined(true);}}><label htmlFor="email">YOUR EMAIL ADDRESS</label><div className="signup-row"><input id="email" type="email" placeholder="you@thetouchline.com" value={email} onChange={e=>setEmail(e.target.value)} required/><button type="submit">{joined?"YOU'RE IN ✓":"COUNT ME IN ↗"}</button></div><small>{joined?"You're on the list. See you on the touchline.":"No spam. Just the good stuff. Unsubscribe whenever."}</small></form></section>

      <footer className="footer"><a className="wordmark footer-mark" href="/">PLAY<span>GROUND</span><b>®</b></a><span>FOOTBALL, PLAYED DIFFERENTLY.</span><span>© PLAYGROUND 2026</span><a href="#about">BACK TO TOP ↑</a></footer>
    </main>
  );
}

export default App;
