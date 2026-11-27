import { useMemo, useState, type FormEvent } from "react";
import { useArchivePlayers } from "./useArchivePlayers";
import {
  addCultHeroCard,
  buildCultHeroMysteries,
  cultHeroUtcDay,
  normaliseCultHeroAnswer,
  readCultHeroCollection,
} from "./cultHeroUtils";
import "./cult-hero.css";

type Props = {
  dailyDone: boolean;
  onDailyComplete: (score: number) => void;
};

type RoundStatus = "playing" | "won" | "lost";

const CLUE_POINTS = [1000, 800, 600, 400, 200];

function freshPracticeSeed() {
  return Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
}

export default function CultHeroPage({ dailyDone, onDailyComplete }: Props) {
  const [mode, setMode] = useState<"daily" | "practice">("daily");
  const [practiceSeed, setPracticeSeed] = useState(freshPracticeSeed);
  const day = cultHeroUtcDay();
  const poolSeed = mode === "daily" ? "CULT-HERO-DAILY-" + day : "CULT-HERO-PRACTICE-" + practiceSeed;
  const { players, loading, error, retry } = useArchivePlayers(true, poolSeed, 8000);
  const mysteries = useMemo(() => buildCultHeroMysteries(players, poolSeed, 5), [players, poolSeed]);

  const [roundIndex, setRoundIndex] = useState(0);
  const [clueIndex, setClueIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [guess, setGuess] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [status, setStatus] = useState<RoundStatus>("playing");
  const [roundScore, setRoundScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [wins, setWins] = useState(0);
  const [runComplete, setRunComplete] = useState(false);
  const [cardAdded, setCardAdded] = useState(false);
  const [collectionCount, setCollectionCount] = useState(() => readCultHeroCollection().length);
  const current = mysteries[roundIndex];

  const resetRun = (nextMode: "daily" | "practice") => {
    setMode(nextMode);
    if (nextMode === "practice") setPracticeSeed(freshPracticeSeed());
    setRoundIndex(0);
    setClueIndex(0);
    setAttempts(0);
    setGuess("");
    setGuesses([]);
    setStatus("playing");
    setRoundScore(0);
    setTotalScore(0);
    setWins(0);
    setRunComplete(false);
    setCardAdded(false);
  };

  const submitGuess = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!current || status !== "playing" || attempts >= 5) return;
    const raw = guess.trim();
    if (!raw) return;
    const answer = normaliseCultHeroAnswer(raw);
    if (guesses.some(value => normaliseCultHeroAnswer(value) === answer)) return;

    const player = current.player;
    const nameParts = player.name.trim().split(/\s+/);
    const surname = nameParts[nameParts.length - 1] ?? "";
    const surnameIsUnique = mysteries.filter(item => {
      const parts = item.player.name.trim().split(/\s+/);
      return normaliseCultHeroAnswer(parts[parts.length - 1] ?? "") === normaliseCultHeroAnswer(surname);
    }).length === 1;
    const accepted = [player.name, player.fullName ?? ""];
    if (surnameIsUnique) accepted.push(surname);
    const correct = accepted.some(name => normaliseCultHeroAnswer(name) === answer);

    setGuesses(previous => [...previous, raw]);
    setGuess("");

    if (correct) {
      const earned = CLUE_POINTS[clueIndex] ?? 200;
      setStatus("won");
      setRoundScore(earned);
      setTotalScore(previous => previous + earned);
      setWins(previous => previous + 1);
      const result = addCultHeroCard(player, "mystery");
      setCardAdded(result.added);
      setCollectionCount(result.collection.length);
      return;
    }

    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    if (nextAttempts >= 5) {
      setStatus("lost");
      setRoundScore(0);
    } else {
      setClueIndex(previous => Math.min(previous + 1, 4));
    }
  };

  const nextRound = () => {
    if (status === "playing" || runComplete) return;
    if (roundIndex >= 4) {
      setRunComplete(true);
      if (mode === "daily") onDailyComplete(totalScore);
      return;
    }
    setRoundIndex(previous => previous + 1);
    setClueIndex(0);
    setAttempts(0);
    setGuess("");
    setGuesses([]);
    setStatus("playing");
    setRoundScore(0);
    setCardAdded(false);
  };

  const startNewPractice = () => resetRun("practice");
  const dailyLocked = mode === "daily" && dailyDone;

  return (
    <div className="arc-shell arc-cult-hero">
      <header className="arc-top ch-topbar">
        <a className="arc-brand" href="/" aria-label="PLAYGROUND home">PLAY<span>GROUND</span><b>®</b></a>
        <div className="arc-top-center"><span className="arc-live-dot" /> CULT HERO / MYSTERY PLAYER</div>
        <div className="arc-top-right">
          <a className="ch-top-link" href="/cult-hero-collection">YOUR COLLECTION ↗</a>
          <a className="ch-top-link ch-top-back" href="/">ALL GAMES</a>
        </div>
      </header>

      <main className="arc-main ch-main">
        <div className="arc-page-heading ch-heading">
          <div className="arc-eyebrow"><span /> THE FOOTBALL ARCHIVE / PLAYER MYSTERY</div>
          <div className="arc-heading-line">
            <div>
              <h1>CULT HERO<span className="ch-heading-period">.</span></h1>
              <p>Five familiar names across Europe’s big five. Follow the career clues and name each footballer.</p>
            </div>
            <div className="arc-file-no"><small>GAME FILE</small><b>17</b></div>
          </div>
        </div>

        <div className="ch-intro-strip">
          <span>BIG FIVE LEAGUE POOL.</span>
          <span>FAMILIAR FOOTBALLERS.</span>
          <span>FIVE MYSTERIES.</span>
        </div>

        <div className="arc-mode-switch ch-mode-switch">
          <button className={mode === "daily" ? "active" : ""} onClick={() => resetRun("daily")}>DAILY FIVE {dailyDone ? "✓" : ""}</button>
          <button className={mode === "practice" ? "active" : ""} onClick={() => resetRun("practice")}>PRACTICE / UNLIMITED</button>
          <a href="/cult-hero-collection">COLLECTION ROOM ↗</a>
        </div>

        {dailyLocked && !runComplete ? (
          <section className="ch-complete-panel">
            <div className="ch-panel-label">TODAY'S CHALLENGE / RECORDED</div>
            <h2>YOU'VE DONE<br />TODAY'S FIVE.</h2>
            <p>Your daily result is already saved on this device. The archive is still open for unlimited practice.</p>
            <button className="arc-button" onClick={startNewPractice}>START PRACTICE ↗</button>
          </section>
        ) : loading ? (
          <section className="ch-loading-panel">
            <div className="ch-loading-mark">CH<span> / </span>17</div>
            <h2>OPENING THE<br />PLAYER ARCHIVE.</h2>
            <p>Preparing career records and clue-ready player profiles.</p>
            <div className="ch-loading-line"><i /></div>
          </section>
        ) : error ? (
          <section className="ch-complete-panel">
            <div className="ch-panel-label">ARCHIVE CONNECTION</div>
            <h2>THE FILE<br />DIDN'T OPEN.</h2>
            <p>{error} No mystery has been generated from incomplete data.</p>
            <button className="arc-button" onClick={retry}>RETRY PLAYER ARCHIVE ↻</button>
          </section>
        ) : mysteries.length < 5 ? (
          <section className="ch-complete-panel">
            <div className="ch-panel-label">PLAYER DATA CHECK</div>
            <h2>NOT ENOUGH<br />VERIFIED FILES.</h2>
            <p>The current archive sample has {mysteries.length} clue-ready profiles. Retry the archive rather than generating guesses from incomplete career records.</p>
            <button className="arc-button" onClick={retry}>RETRY PLAYER ARCHIVE ↻</button>
          </section>
        ) : runComplete ? (
          <section className="ch-results-panel">
            <div className="ch-panel-label">{mode === "daily" ? "DAILY FIVE / COMPLETE" : "PRACTICE RUN / COMPLETE"}</div>
            <h2>{wins === 5 ? "FIVE FOR FIVE." : wins === 0 ? "BACK TO THE ARCHIVE." : "GOOD FOOTBALL KNOWLEDGE."}</h2>
            <div className="ch-results-score"><strong>{totalScore.toLocaleString("en-GB")}</strong><span>POINTS</span></div>
            <p>You identified {wins} of five players. {mode === "daily" ? "Today's score has been added to your PLAYGROUND record on this device." : "Practice results do not affect the daily streak."}</p>
            <div className="ch-result-actions">
              {mode === "practice" && <button className="arc-button" onClick={startNewPractice}>NEW PRACTICE RUN ↻</button>}
              <a className="arc-quiet" href="/cult-hero-collection">VIEW YOUR COLLECTION ↗</a>
            </div>
          </section>
        ) : current ? (
          <>
            <div className="ch-progress-row">
              <div><span>DAILY DISCOVERIES</span><strong>{String(roundIndex + 1).padStart(2, "0")} <i>/ 05</i></strong></div>
              <div><span>YOUR RUN</span><strong>{wins} <i>FOUND</i></strong></div>
              <div><span>COLLECTED</span><strong>{collectionCount.toLocaleString("en-GB")}</strong></div>
            </div>

            <section className="ch-game-layout">
              <div className="ch-mystery-panel">
                <div className="ch-panel-top">
                  <span>MYSTERY PLAYER / {String(roundIndex + 1).padStart(2, "0")}</span>
                  <span>{mode === "daily" ? day : "PRACTICE"}</span>
                </div>
                <div className="ch-mystery-title">
                  <div className="ch-monogram">?</div>
                  <div><span>PLAYER FILE / IDENTITY WITHHELD</span><h2>WHO AM I?</h2></div>
                </div>
                <div className="ch-clue-heading"><b>CAREER CLUES</b><span>{Math.min(clueIndex + 1, 5)} / 05 REVEALED</span></div>
                <ol className="ch-clue-list">
                  {current.clues.map((clue, index) => (
                    <li key={index} className={index <= clueIndex || status !== "playing" ? "is-visible" : "is-locked"}>
                      <span className="ch-clue-number">{String(index + 1).padStart(2, "0")}</span>
                      <p>{index <= clueIndex || status !== "playing" ? clue : "Clue locked — make a guess to reveal the next detail."}</p>
                    </li>
                  ))}
                </ol>
                {status === "playing" ? (
                  <>
                    <form className="ch-guess-form" onSubmit={submitGuess}>
                      <label htmlFor="cult-hero-guess">YOUR ANSWER</label>
                      <div className="ch-guess-row">
                        <input id="cult-hero-guess" autoComplete="off" autoCapitalize="words" spellCheck={false} value={guess} onChange={event => setGuess(event.target.value)} placeholder="Enter the footballer's name…" />
                        <button className="arc-button" type="submit" disabled={!guess.trim()}>SUBMIT ↗</button>
                      </div>
                    </form>
                    <div className="ch-attempt-row"><span>{5 - attempts} GUESSES REMAINING</span><span>{CLUE_POINTS[clueIndex]} POINTS AVAILABLE</span></div>
                    {guesses.length > 0 && <div className="ch-previous-guesses"><span>PREVIOUS GUESSES</span>{guesses.slice(-3).map((value, index) => <i key={index}>{value}</i>)}</div>}
                  </>
                ) : (
                  <div className={status === "won" ? "ch-feedback is-correct" : "ch-feedback is-missed"}>
                    <span>{status === "won" ? "PLAYER IDENTIFIED" : "FILE CLOSED"}</span>
                    <h3>{current.player.name}</h3>
                    <p>{status === "won" ? `Correct. You earned ${roundScore.toLocaleString("en-GB")} points.` : "The five guesses are used. Read the career record, then move on to the next player."}</p>
                    {status === "won" && <div className="ch-reward-note">{cardAdded ? "CARD ADDED TO YOUR COLLECTION" : "ALREADY IN YOUR COLLECTION"} · <a href="/cult-hero-collection">VIEW CARD ↗</a></div>}
                    <div className="ch-player-facts">
                      <span>{current.player.nationality}</span>
                      <span>{current.player.position}</span>
                      <span>{current.player.clubs.slice(0, 4).join(" / ")}</span>
                    </div>
                    <button className="arc-button" onClick={nextRound}>{roundIndex === 4 ? "FINISH THE RUN" : "NEXT MYSTERY ↗"}</button>
                  </div>
                )}
              </div>

              <aside className="ch-side-panel">
                <div className="ch-side-number">0{roundIndex + 1}<span> / 05</span></div>
                <div className="ch-side-rule" />
                <h3>THE<br /><em>OBJECTIVE.</em></h3>
                <p>Work through a player's career trail. Every incorrect guess reveals another verified detail and reduces the points available.</p>
                <div className="ch-score-table">
                  <div><span>CLUE 01</span><b>1,000</b></div>
                  <div><span>CLUE 02</span><b>800</b></div>
                  <div><span>CLUE 03</span><b>600</b></div>
                  <div><span>CLUE 04</span><b>400</b></div>
                  <div><span>CLUE 05</span><b>200</b></div>
                </div>
                <div className="ch-side-foot">SOURCE-LED PLAYER RECORDS<br />NO MADE-UP CAREER FACTS</div>
              </aside>
            </section>
          </>
        ) : null}

        <section className="ch-bottom-note">
          <div><b>THE COLLECTION ROOM</b><p>Every correctly identified player can be kept in your local card collection.</p></div>
          <a href="/cult-hero-collection">OPEN THE COLLECTION ↗</a>
        </section>
      </main>
      <footer className="arc-footer"><a href="/">PLAYGROUND®</a><span>PLAYER FACTS ARE LIMITED TO THE AVAILABLE ARCHIVE RECORD.</span><a href="/cult-hero-collection">COLLECTION ↗</a></footer>
    </div>
  );
}
