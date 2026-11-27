import { useEffect, useMemo, useState } from "react";
import type { ArchiveGamePlayer } from "./careerFileData";
import { useArchivePlayers } from "./useArchivePlayers";
import {
  addCultHeroCard,
  buildCultHeroMysteries,
  readCultHeroCollection,
  type CultHeroCard,
} from "./cultHeroUtils";
import "./cult-hero.css";

type RevealStage = "idle" | "opening" | "revealed";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
}

function CollectionCard({ card, index }: { card: CultHeroCard; index: number }) {
  return (
    <article className="ch-owned-card" style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
      <div className="ch-owned-card-top"><span>CH / ARCHIVE</span><span>#{String(index + 1).padStart(3, "0")}</span></div>
      <div className="ch-owned-monogram">{initials(card.name)}</div>
      <h3>{card.name}</h3>
      <p>{card.nationality} · {card.position}</p>
      <div className="ch-owned-league">{card.league || "ARCHIVE PLAYER"}</div>
      <div className="ch-owned-clubs">{card.clubs.slice(0, 3).join(" / ") || "Career clubs not recorded"}</div>
    </article>
  );
}

export default function CultHeroCollectionPage() {
  const { players, loading, error, retry } = useArchivePlayers(true, "CULT-HERO-COLLECTION-PACKS-2026-11", 8000);
  const eligible = useMemo(() => buildCultHeroMysteries(players, "CULT-HERO-COLLECTION-PACKS-2026-11", 8000), [players]);
  const [collection, setCollection] = useState<CultHeroCard[]>(() => readCultHeroCollection());
  const [stage, setStage] = useState<RevealStage>("idle");
  const [pendingPlayer, setPendingPlayer] = useState<ArchiveGamePlayer | null>(null);
  const [pendingLeague, setPendingLeague] = useState("");
  const [wasAdded, setWasAdded] = useState(false);
  const [statusNote, setStatusNote] = useState("");

  useEffect(() => {
    if (stage !== "opening" || !pendingPlayer) return;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const timer = window.setTimeout(() => {
      const result = addCultHeroCard(pendingPlayer, "pack", pendingLeague);
      setCollection(result.collection);
      setWasAdded(result.added);
      setStage("revealed");
    }, reducedMotion ? 120 : 2380);
    return () => window.clearTimeout(timer);
  }, [stage, pendingPlayer, pendingLeague]);

  const openPack = () => {
    if (loading || stage === "opening" || eligible.length === 0) return;
    const owned = new Set(collection.map(card => card.playerId));
    const unseen = eligible.filter(item => !owned.has(item.player.id));
    const source = unseen.length ? unseen : eligible;
    const selected = source[Math.floor(Math.random() * source.length)];
    if (!selected) return;
    setPendingPlayer(selected.player);
    setPendingLeague(selected.league);
    setWasAdded(false);
    setStatusNote(unseen.length ? "" : "You've collected every player in this current archive sample. This reveal will show a duplicate.");
    setStage("opening");
  };

  const closeReveal = () => {
    setStage("idle");
    setPendingPlayer(null);
  };

  return (
    <div className="arc-shell arc-cult-hero ch-collection-page">
      <header className="arc-top ch-topbar">
        <a className="arc-brand" href="/" aria-label="PLAYGROUND home">PLAY<span>GROUND</span><b>®</b></a>
        <div className="arc-top-center"><span className="arc-live-dot" /> CULT HERO / THE COLLECTION ROOM</div>
        <div className="arc-top-right">
          <a className="ch-top-link" href="/cult-hero">MYSTERY PLAYER ↗</a>
          <a className="ch-top-link ch-top-back" href="/">ALL GAMES</a>
        </div>
      </header>

      <main className="arc-main ch-main">
        <div className="arc-page-heading ch-heading">
          <div className="arc-eyebrow"><span /> CULT HERO / PLAYER ARCHIVE</div>
          <div className="arc-heading-line">
            <div>
              <h1>THE CABINET<span className="ch-heading-period">.</span></h1>
              <p>A growing archive of players you have discovered. Open a sealed pack to reveal one player card and add it to your collection.</p>
            </div>
            <div className="arc-file-no"><small>COLLECTION</small><b>{String(collection.length).padStart(2, "0")}</b></div>
          </div>
        </div>

        <section className="ch-collection-layout">
          <div className="ch-pack-column">
            <div className="ch-panel-label">THE ARCHIVE PACK / SINGLE CARD EDITION</div>
            <div className={`ch-pack-stage ${stage === "opening" ? "is-opening" : ""} ${stage === "revealed" ? "is-revealed" : ""}`}>
              {stage !== "revealed" ? (
                <div className="ch-pack-object" aria-label={stage === "opening" ? "Opening Cult Hero pack" : "Sealed Cult Hero pack"}>
                  <div className="ch-pack-card-back">
                    <span className="ch-pack-card-index">PLAYER ARCHIVE / 001</span>
                    <div className="ch-pack-card-mark">CH</div>
                    <span className="ch-pack-card-foot">CULT HERO®</span>
                  </div>
                  <div className="ch-pack-foil">
                    <div className="ch-pack-foil-top">
                      <span>CULT HERO®</span><b>PLAYER ARCHIVE</b>
                    </div>
                    <div className="ch-pack-foil-centre">
                      <strong>CH</strong>
                      <span>FOOTBALL<br />IS FULL OF STORIES.</span>
                    </div>
                    <div className="ch-pack-foil-bottom">
                      <span>SEALED EDITION</span><span>NO. 001</span>
                    </div>
                    <i className="ch-pack-tear-line" />
                    <i className="ch-pack-tear-left" />
                    <i className="ch-pack-tear-right" />
                  </div>
                </div>
              ) : pendingPlayer ? (
                <article className="ch-revealed-card" aria-live="polite">
                  <div className="ch-revealed-card-top"><span>CULT HERO / PLAYER ARCHIVE</span><span>FILE / 001</span></div>
                  <div className="ch-revealed-art">
                    <div className="ch-revealed-watermark">CH</div>
                    <span>PLAYER PROFILE</span>
                    <strong>{initials(pendingPlayer.name)}</strong>
                    <i>ARCHIVE EDITION</i>
                  </div>
                  <div className="ch-revealed-copy">
                    <h2>{pendingPlayer.name}</h2>
                    <p>{pendingPlayer.nationality} <span>·</span> {pendingPlayer.position}</p>
                    <div className="ch-owned-league">{pendingLeague || "BIG FIVE ARCHIVE"}</div>
                    <div className="ch-revealed-clubs">{Array.from(new Set((pendingPlayer.spells ?? []).map(spell => spell.club?.trim()).filter((club): club is string => Boolean(club)))).slice(0, 5).join(" / ")}</div>
                    <div className="ch-revealed-footer"><b>{wasAdded ? "ADDED TO YOUR CABINET" : "ALREADY IN YOUR CABINET"}</b><span>NO. {collection.length.toString().padStart(3, "0")}</span></div>
                  </div>
                </article>
              ) : null}
            </div>

            {stage === "idle" && (
              <div className="ch-pack-action">
                <p>One player. One reveal. No points, coins or paid packs in this prototype.</p>
                <button className="arc-button" onClick={openPack} disabled={loading || eligible.length === 0}>OPEN THE PACK <span>↗</span></button>
              </div>
            )}
            {stage === "opening" && (
              <div className="ch-pack-action is-opening-copy" aria-live="polite">
                <p>Breaking the seal. The player file is being revealed.</p>
                <span className="ch-opening-progress"><i /></span>
              </div>
            )}
            {stage === "revealed" && pendingPlayer && (
              <div className="ch-pack-action">
                <p>{statusNote || (wasAdded ? "This player is now part of your collection." : "You already own this player. No duplicate was added.")}</p>
                <button className="arc-button" onClick={closeReveal}>BACK TO THE CABINET ↗</button>
                <button className="arc-quiet" onClick={() => { closeReveal(); }}>CLOSE REVEAL</button>
              </div>
            )}
            {loading && <p className="ch-data-note">Loading verified career profiles for the pack preview…</p>}
            {error && <div className="ch-data-error"><b>ARCHIVE UNAVAILABLE</b><p>{error}</p><button className="arc-quiet" onClick={retry}>RETRY ↻</button></div>}
          </div>

          <aside className="ch-collection-aside">
            <div className="ch-panel-label">YOUR COLLECTION</div>
            <div className="ch-collection-count"><strong>{collection.length.toLocaleString("en-GB")}</strong><span>PLAYER FILES</span></div>
            <p>Cards earned through Mystery Player and the pack preview are stored in this browser. Cloud sync and trading are not part of this first prototype.</p>
            <div className="ch-collection-divider" />
            <div className="ch-collection-stat"><span>ARCHIVE SAMPLE</span><b>{eligible.length.toLocaleString("en-GB")} CLUE-READY RECORDS</b></div>
            <div className="ch-collection-stat"><span>PACK FORMAT</span><b>ONE PLAYER / ONE CARD</b></div>
            <div className="ch-collection-stat"><span>ART DIRECTION</span><b>EDITORIAL / MATERIAL-LED</b></div>
            <a href="/cult-hero">PLAY MYSTERY PLAYER ↗</a>
          </aside>
        </section>

        <section className="ch-owned-section">
          <div className="ch-owned-heading"><div><span>THE PERSONAL ARCHIVE</span><h2>YOUR PLAYER<br />FILES.</h2></div><p>{collection.length ? `${collection.length} player ${collection.length === 1 ? "file" : "files"} collected on this browser.` : "Your cabinet is empty. Find a player in Mystery Player or open your first archive pack."}</p></div>
          {collection.length > 0 ? (
            <div className="ch-owned-grid">
              {collection.slice(0, 60).map((card, index) => <CollectionCard key={card.playerId} card={card} index={index} />)}
            </div>
          ) : (
            <div className="ch-empty-cabinet"><span>CH / 00</span><b>NOTHING ON THE SHELF. YET.</b><p>The first player card will appear here after a correct mystery answer or pack reveal.</p></div>
          )}
          {collection.length > 60 && <p className="ch-data-note">Showing the latest 60 of {collection.length} collected players.</p>}
        </section>
      </main>
      <footer className="arc-footer"><a href="/">PLAYGROUND®</a><span>YOUR CABINET IS STORED LOCALLY ON THIS DEVICE.</span><a href="/cult-hero">MYSTERY PLAYER ↗</a></footer>
    </div>
  );
}
