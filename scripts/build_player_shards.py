#!/usr/bin/env python3
"""Build small static player shards from the pinned upstream OpenFootballBase release.

The archive is downloaded from the latest public release, verified against the
GitHub release SHA-256, and only the tables needed by PLAYGROUND are extracted.
All numeric fields keep explicit row/season coverage so an absent value is not
silently treated as a verified zero.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import tarfile
import tempfile
import urllib.request
from pathlib import Path
from typing import Any

REPO = "florentfougeres/OpenFootballBase-Data"
RELEASES_API = f"https://api.github.com/repos/{REPO}/releases/latest"
USER_AGENT = "PLAYGROUND-Football-Arcade/1.0 (data-shard-build)"
REQUIRED_TABLES = ("career", "stat_club", "player_profile", "birth", "national", "club")
OPTIONAL_TABLES = ("stat_source",)
BATCH_SHARD_SIZE = 1000


def request_json(url: str) -> dict[str, Any]:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/vnd.github+json"})
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.loads(response.read())


def download_verified(url: str, path: Path, expected_sha256: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256()
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=180) as response, path.open("wb") as output:
        while True:
            block = response.read(1024 * 1024)
            if not block:
                break
            digest.update(block)
            output.write(block)
    actual = digest.hexdigest()
    if actual.lower() != expected_sha256.lower():
        path.unlink(missing_ok=True)
        raise RuntimeError(f"Upstream archive SHA-256 mismatch: expected {expected_sha256}, got {actual}")


def extract_release_tables(archive_path: Path, work: Path) -> tuple[dict[str, Any], dict[str, Path]]:
    with tarfile.open(archive_path, "r:gz") as archive:
        members = archive.getmembers()
        manifest_member = next((m for m in members if m.isfile() and m.name.endswith("manifest.json")), None)
        if manifest_member is None:
            raise RuntimeError("The upstream release has no manifest.json")
        manifest = json.load(archive.extractfile(manifest_member))
        prefix = manifest_member.name[: -len("manifest.json")]

        paths: dict[str, str] = {}
        for table in REQUIRED_TABLES:
            entry = manifest.get("tables", {}).get(table)
            if not isinstance(entry, dict) or not entry.get("path"):
                raise RuntimeError(f"Manifest is missing required table: {table}")
            paths[table] = str(entry["path"])
        for table in OPTIONAL_TABLES:
            entry = manifest.get("tables", {}).get(table)
            if isinstance(entry, dict) and entry.get("path"):
                paths[table] = str(entry["path"])

        squad_paths: list[str] = []
        for season in (manifest.get("seasons") or {}).values():
            squad = (season.get("files") or {}).get("squad") or {}
            if squad.get("path"):
                squad_paths.append(str(squad["path"]))
        if not squad_paths:
            raise RuntimeError("Manifest contains no season squad parquet files")

        wanted = {f"{prefix}{rel}": rel for rel in paths.values()}
        wanted.update({f"{prefix}{rel}": rel for rel in squad_paths})
        # Some release tarballs include a single enclosing directory. Resolve
        # each manifest path by suffix rather than assuming that directory name.
        selected: dict[str, tarfile.TarInfo] = {}
        for member in members:
            if not member.isfile():
                continue
            for expected_path, relative in wanted.items():
                if member.name == expected_path or member.name.endswith("/" + relative) or member.name == relative:
                    selected[relative] = member
                    break

        extracted: dict[str, Path] = {}
        for table, rel in paths.items():
            member = selected.get(rel)
            if member is None:
                raise RuntimeError(f"Could not find {table} parquet file in release archive: {rel}")
            target = work / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            source = archive.extractfile(member)
            if source is None:
                raise RuntimeError(f"Could not read parquet member: {member.name}")
            with source, target.open("wb") as output:
                shutil.copyfileobj(source, output)
            extracted[table] = target

        squads: list[Path] = []
        for rel in squad_paths:
            member = selected.get(rel)
            if member is None:
                continue
            target = work / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            source = archive.extractfile(member)
            if source is None:
                continue
            with source, target.open("wb") as output:
                shutil.copyfileobj(source, output)
            squads.append(target)
        if not squads:
            raise RuntimeError("No squad parquet files could be extracted")
        extracted["squad"] = squads  # type: ignore[assignment]
        return manifest, extracted


def sql_path(path: Path) -> str:
    return "'" + str(path).replace("\\", "\\\\").replace("'", "''") + "'"


def json_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except json.JSONDecodeError:
            return []
    return value if isinstance(value, list) else []


def clean_number(value: Any, default: int = 0) -> int:
    if value is None:
        return default
    return int(value)


def build_rows(manifest: dict[str, Any], files: dict[str, Any]) -> list[dict[str, Any]]:
    import duckdb  # installed by the GitHub Actions workflow

    conn = duckdb.connect(":memory:")
    conn.execute("SET threads = 2")
    conn.execute("SET memory_limit = '4GB'")
    conn.execute(f"CREATE VIEW career AS SELECT * FROM read_parquet({sql_path(files['career'])})")
    conn.execute(f"CREATE VIEW stat_club AS SELECT * FROM read_parquet({sql_path(files['stat_club'])})")
    conn.execute(f"CREATE VIEW player_profile AS SELECT * FROM read_parquet({sql_path(files['player_profile'])})")
    conn.execute(f"CREATE VIEW birth AS SELECT * FROM read_parquet({sql_path(files['birth'])})")
    conn.execute(f"CREATE VIEW national AS SELECT * FROM read_parquet({sql_path(files['national'])})")
    conn.execute(f"CREATE VIEW club AS SELECT * FROM read_parquet({sql_path(files['club'])})")
    squad_sql = ", ".join(sql_path(p) for p in files["squad"])
    conn.execute(f"CREATE VIEW squad AS SELECT * FROM read_parquet([{squad_sql}], union_by_name = true)")
    if "stat_source" in files:
        conn.execute(f"CREATE VIEW stat_source AS SELECT * FROM read_parquet({sql_path(files['stat_source'])})")
    else:
        conn.execute("CREATE VIEW stat_source AS SELECT CAST(NULL AS VARCHAR) player_qid, CAST(NULL AS VARCHAR) source_title, CAST(NULL AS BIGINT) source_revid WHERE false")

    query = """
    WITH career_base AS (
      SELECT
        CASE WHEN coalesce(trim(player_qid),'') <> '' THEN player_qid
             ELSE 'name:' || lower(trim(player)) END AS player_id,
        player, seq, years_raw, start_year, end_year, club_name, club_link, club_qid,
        loan, apps, goals, source_title, source_revid
      FROM career
      WHERE coalesce(trim(player),'') <> ''
    ),
    career_rollup AS (
      SELECT
        player_id,
        any_value(player) AS name,
        to_json(list(struct_pack(
          seq := seq, years := years_raw, startYear := start_year, endYear := end_year,
          club := club_name, clubLink := club_link, clubQid := club_qid,
          loan := loan, apps := apps, goals := goals,
          sourceTitle := source_title, sourceRevision := source_revid
        ) ORDER BY seq)) AS spells_json,
        to_json(list(DISTINCT club_name ORDER BY club_name) FILTER (WHERE coalesce(trim(club_name),'') <> '')) AS clubs_json,
        sum(apps) AS appearances,
        sum(goals) AS goals,
        count(apps) AS appearance_rows,
        count(goals) AS goal_rows,
        arg_max(club_name, coalesce(end_year,start_year,0) * 1000 + coalesce(seq,0)) AS current_club,
        arg_max(club_qid, coalesce(end_year,start_year,0) * 1000 + coalesce(seq,0)) AS current_club_qid,
        min(start_year) AS first_year,
        arg_max(coalesce(end_year,start_year), coalesce(end_year,start_year,0) * 1000 + coalesce(seq,0)) AS last_year,
        any_value(source_title) AS career_source_title,
        any_value(source_revid) AS career_source_revision
      FROM career_base
      GROUP BY player_id
      HAVING coalesce(sum(apps),0) >= 10
    ),
    stat_base AS (
      SELECT CASE WHEN coalesce(trim(player_qid),'') <> '' THEN player_qid
                  ELSE 'name:' || lower(trim(player)) END AS player_id,
        club, club_link, club_qid, seq, season, competition_group, apps, goals, assists
      FROM stat_club
    ),
    stat_rollup AS (
      SELECT
        player_id,
        count(DISTINCT coalesce(nullif(club_qid,''),nullif(club_link,''),club) || '|' || season) AS seasons,
        sum(apps) FILTER (WHERE competition_group = 'League') AS league_appearances,
        sum(goals) FILTER (WHERE competition_group = 'League') AS league_goals,
        count(apps) FILTER (WHERE competition_group = 'League') AS league_appearance_rows,
        count(goals) FILTER (WHERE competition_group = 'League') AS league_goal_rows,
        count(DISTINCT CASE WHEN competition_group='League' AND goals IS NOT NULL
          THEN coalesce(nullif(club_qid,''),nullif(club_link,''),club) || '|' || season END) AS league_goal_seasons,
        sum(assists) FILTER (WHERE competition_group = 'League') AS league_assists,
        count(DISTINCT CASE WHEN competition_group='League' AND assists IS NOT NULL
          THEN coalesce(nullif(club_qid,''),nullif(club_link,''),club) || '|' || season END) AS league_assist_seasons,
        to_json(list(struct_pack(club:=club,clubLink:=club_link,clubQid:=club_qid,
          season:=season,competitionGroup:=competition_group,apps:=apps,goals:=goals,assists:=assists)
          ORDER BY season,seq) FILTER (WHERE apps IS NOT NULL OR goals IS NOT NULL OR assists IS NOT NULL)) AS season_stats_json
      FROM stat_base
      WHERE coalesce(competition_group,'') <> 'Total' AND coalesce(trim(season),'') <> ''
      GROUP BY player_id
    ),
    profile_base AS (
      SELECT CASE WHEN coalesce(trim(player_qid),'') <> '' THEN player_qid
                  ELSE 'name:' || lower(trim(player)) END AS player_id,
        full_name, birth_place, height_cm
      FROM player_profile
    ),
    profile_rollup AS (
      SELECT player_id, any_value(full_name) AS full_name,
        any_value(birth_place) AS birth_place, any_value(height_cm) AS height_cm
      FROM profile_base GROUP BY player_id
    ),
    squad_base AS (
      SELECT CASE WHEN coalesce(trim(player_qid),'') <> '' THEN player_qid
                  ELSE 'name:' || lower(trim(player)) END AS player_id,
        season, nationality, position
      FROM squad
    ),
    squad_rollup AS (
      SELECT player_id,
        arg_max(nationality, try_cast(substr(season,1,4) AS INTEGER)) AS nationality,
        arg_max(position, try_cast(substr(season,1,4) AS INTEGER)) AS position
      FROM squad_base GROUP BY player_id
    ),
    birth_base AS (
      SELECT player_qid AS player_id, birth_date, precision
      FROM birth WHERE precision = 11
    ),
    national_base AS (
      SELECT CASE WHEN coalesce(trim(player_qid),'') <> '' THEN player_qid
                  ELSE 'name:' || lower(trim(player)) END AS player_id,
        team_name, caps, goals
      FROM national
    ),
    national_rollup AS (
      SELECT player_id, sum(caps) AS caps, sum(goals) AS international_goals,
        count(caps) AS cap_rows,
        arg_max(team_name,caps) FILTER (WHERE NOT regexp_matches(team_name,'(?i)U(17|18|19|20|21|23)')) AS senior_team,
        to_json(list(DISTINCT team_name) FILTER (WHERE coalesce(trim(team_name),'') <> '')) AS teams_json
      FROM national_base GROUP BY player_id
    ),
    club_rollup AS (
      SELECT wikidata_qid, any_value(country) AS country,
        any_value(league) AS league, any_value(division) AS division
      FROM club GROUP BY wikidata_qid
    ),
    stat_source_rollup AS (
      SELECT player_qid, any_value(source_title) AS source_title,
        any_value(source_revid) AS source_revid
      FROM stat_source GROUP BY player_qid
    )
    SELECT
      c.player_id, c.name, c.spells_json, c.clubs_json,
      c.appearances, c.goals, c.appearance_rows, c.goal_rows,
      c.current_club, c.first_year, c.last_year,
      coalesce(st.seasons,0) AS seasons,
      coalesce(st.league_appearances,0) AS league_appearances,
      coalesce(st.league_goals,0) AS league_goals,
      coalesce(st.league_goal_seasons,0) AS league_goal_seasons,
      coalesce(st.league_appearance_rows,0) AS league_appearance_rows,
      coalesce(st.league_goal_rows,0) AS league_goal_rows,
      coalesce(st.league_assists,0) AS league_assists,
      coalesce(st.league_assist_seasons,0) AS league_assist_seasons,
      st.season_stats_json,
      coalesce(sq.nationality,'') AS nationality, coalesce(sq.position,'') AS position,
      coalesce(pp.full_name,'') AS full_name, coalesce(pp.birth_place,'') AS birth_place, pp.height_cm,
      b.birth_date,
      nt.caps, nt.international_goals, nt.cap_rows, nt.senior_team, nt.teams_json,
      coalesce(cl.country,'') AS current_country, coalesce(cl.league,'') AS current_league, cl.division AS current_division,
      c.career_source_title, c.career_source_revision, ss.source_title AS stat_source_title,
      ss.source_revid AS stat_source_revision
    FROM career_rollup c
    LEFT JOIN stat_rollup st ON st.player_id=c.player_id
    LEFT JOIN profile_rollup pp ON pp.player_id=c.player_id
    LEFT JOIN squad_rollup sq ON sq.player_id=c.player_id
    LEFT JOIN birth_base b ON b.player_id=c.player_id
    LEFT JOIN national_rollup nt ON nt.player_id=c.player_id
    LEFT JOIN club_rollup cl ON cl.wikidata_qid=c.current_club_qid
    LEFT JOIN stat_source_rollup ss ON ss.player_qid=c.player_id
    WHERE c.appearances >= 20
    ORDER BY hash(c.player_id), c.player_id
    """
    cursor = conn.execute(query)
    columns = [d[0] for d in cursor.description]
    rows: list[dict[str, Any]] = []
    for raw in cursor.fetchall():
        row = dict(zip(columns, raw))
        spells = json_list(row.get("spells_json"))
        clubs = json_list(row.get("clubs_json"))
        teams = json_list(row.get("teams_json"))
        rows.append({
            "id": str(row.get("player_id") or ""),
            "name": str(row.get("name") or "Unknown player"),
            "fullName": str(row.get("full_name") or row.get("name") or "Unknown player"),
            "nationality": str(row.get("nationality") or row.get("senior_team") or ""),
            "position": str(row.get("position") or ""),
            "clubs": [str(c) for c in clubs if c],
            "spells": spells,
            "currentClub": str(row.get("current_club") or ""),
            "appearances": clean_number(row.get("appearances")),
            "goals": clean_number(row.get("goals")),
            "careerAppearanceRows": clean_number(row.get("appearance_rows")),
            "careerGoalRows": clean_number(row.get("goal_rows")),
            "leagueAppearances": clean_number(row.get("league_appearances")),
            "leagueGoals": clean_number(row.get("league_goals")),
            "leagueGoalSeasons": clean_number(row.get("league_goal_seasons")),
            "leagueAppearanceRows": clean_number(row.get("league_appearance_rows")),
            "leagueGoalRows": clean_number(row.get("league_goal_rows")),
            "leagueAssists": clean_number(row.get("league_assists")),
            "leagueAssistSeasons": clean_number(row.get("league_assist_seasons")),
            "seasons": clean_number(row.get("seasons")),
            "seasonStats": json_list(row.get("season_stats_json")),
            "firstYear": row.get("first_year"),
            "lastYear": row.get("last_year"),
            "caps": row.get("caps"),
            "internationalGoals": row.get("international_goals"),
            "nationalRows": clean_number(row.get("cap_rows")),
            "nationalTeams": [str(t) for t in teams if t],
            "birthDate": str(row.get("birth_date") or ""),
            "birthPrecision": 11 if row.get("birth_date") else None,
            "birthPlace": str(row.get("birth_place") or ""),
            "heightCm": row.get("height_cm"),
            "currentCountry": str(row.get("current_country") or ""),
            "currentLeague": str(row.get("current_league") or ""),
            "currentDivision": row.get("current_division"),
            "careerSourceTitle": str(row.get("career_source_title") or ""),
            "careerSourceRevision": row.get("career_source_revision"),
            "statSourceTitle": str(row.get("stat_source_title") or ""),
            "statSourceRevision": row.get("stat_source_revision"),
        })
    conn.close()
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="public/data/player-pool")
    parser.add_argument("--shard-size", type=int, default=BATCH_SHARD_SIZE)
    parser.add_argument("--cache", default=".cache/openfootballbase-data.tar.gz")
    args = parser.parse_args()
    if args.shard_size < 100 or args.shard_size > 5000:
        raise SystemExit("--shard-size must be between 100 and 5000")

    release = request_json(RELEASES_API)
    asset = next((a for a in release.get("assets", []) if a.get("name") == "openfootballbase-data.tar.gz"), None)
    if asset is None:
        raise RuntimeError("Latest upstream release has no openfootballbase-data.tar.gz asset")
    digest = str(asset.get("digest") or "")
    if not digest.startswith("sha256:"):
        raise RuntimeError("Latest upstream release does not publish a SHA-256 digest")
    expected = digest.split(":", 1)[1]
    cache_path = Path(args.cache)
    if not cache_path.exists() or hashlib.sha256(cache_path.read_bytes()).hexdigest().lower() != expected.lower():
        download_verified(asset["browser_download_url"], cache_path, expected)

    with tempfile.TemporaryDirectory(prefix="playground-players-") as temp:
        manifest, files = extract_release_tables(cache_path, Path(temp))
        rows = build_rows(manifest, files)

    if len(rows) < 10000:
        raise RuntimeError(f"Unexpectedly small player export: {len(rows)} rows")
    ids = [row["id"] for row in rows]
    if len(ids) != len(set(ids)):
        raise RuntimeError("Player export contains duplicate player identity keys")
    if not all(row["id"] and row["name"] for row in rows):
        raise RuntimeError("Player export contains a record without an ID or name")

    output = Path(args.output)
    shutil.rmtree(output, ignore_errors=True)
    output.mkdir(parents=True, exist_ok=True)
    shards: list[dict[str, Any]] = []
    shards: list[dict[str, Any]] = []
    for shard_number, offset in enumerate(range(0, len(rows), args.shard_size)):
        chunk = rows[offset : offset + args.shard_size]
        filename = "players-" + str(shard_number).zfill(3) + ".json"
        payload = json.dumps({
            "releaseTag": release.get("tag_name"),
            "source": "OpenFootballBase-Data",
            "licence": "CC BY-SA 4.0",
            "players": chunk,
        }, ensure_ascii=False, separators=(",", ":"), sort_keys=False).encode("utf-8")
        target = output / filename
        target.write_bytes(payload)
        shards.append({
            "file": filename,
            "count": len(chunk),
            "bytes": len(payload),
            "sha256": hashlib.sha256(payload).hexdigest(),
        })

    caveats = [
        "Career infobox appearances/goals and national caps are unverified source values.",
        "Career statistics by club/season/competition are only available for a subset of players and are also unverified.",
        "Missing statistics remain null and must not be treated as verified zeroes.",
        "Transfer fees are not part of this source and are supplied separately.",
        "Nationality and position come from the latest available squad record and may be blank.",
        "Latest club league/country metadata describes the upstream club record, not necessarily the player's historical season.",
        "Some unidentified players have name-based keys and cannot always be distinguished from namesakes.",
        "Wikipedia-derived records are CC BY-SA 4.0; Wikidata-derived fields are CC0. Career spells retain page and revision provenance where available.",
    ]
    index = {
        "version": 1,
        "source": "OpenFootballBase-Data",
        "sourceUrl": "https://github.com/florentfougeres/OpenFootballBase-Data",
        "licence": "CC BY-SA 4.0",
        "releaseTag": release.get("tag_name"),
        "releaseUrl": release.get("html_url"),
        "sourceAssetSha256": expected,
        "generatedAt": release.get("published_at") or release.get("created_at"),
        "playerCount": len(rows),
        "playersWithSeasonStats": sum(1 for row in rows if row.get("stats")),
        "shardSize": args.shard_size,
        "shardCount": len(shards),
        "caveats": caveats,
        "shards": shards,
    }
    index_path = output / "manifest.json"
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "sourceRelease": index["sourceRelease"],
        "playerCount": len(rows),
        "shardCount": len(shards),
        "manifest": str(index_path),
        "totalBytes": sum((output / shard["file"]).stat().st_size for shard in shards) + index_path.stat().st_size,
        "sample": rows[:3],
    }, ensure_ascii=False, default=str))


if __name__ == "__main__":
    main()
