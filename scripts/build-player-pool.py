#!/usr/bin/env python3
"""Export OpenFootballBase player/career records to 64 compact static JSON shards."""
from __future__ import annotations
import argparse, datetime as dt, hashlib, json, pathlib, tarfile, tempfile
from typing import Any
import duckdb

SOURCE="OpenFootballBase-Data"
SOURCE_URL="https://github.com/florentfougeres/OpenFootballBase-Data"
LICENCE="CC BY-SA 4.0"
SHARD_COUNT=64
CAVEATS=[
 "Career spells, appearance/goal totals and international caps are Wikipedia-infobox values and unverified.",
 "Detailed season statistics cover only a subset of players and competitions (mainly Champions League club players from seven major countries since 2010).",
 "Missing values remain null/not recorded; they are not zero.",
 "Transfer fees are not part of this source and are supplied separately.",
 "Club-season statistics are as published and may be incomplete."
]

def safe_extract(archive:pathlib.Path,dest:pathlib.Path)->None:
 root=dest.resolve()
 with tarfile.open(archive,"r:gz") as tar:
  members=tar.getmembers()
  for member in members:
   target=(dest/member.name).resolve()
   if root not in target.parents and target!=root:
    raise RuntimeError("Unsafe path in archive: "+member.name)
  tar.extractall(dest)

def locate(root:pathlib.Path):
 for p in root.rglob("manifest.json"):
  try:
   m=json.loads(p.read_text(encoding="utf-8"))
   if isinstance(m.get("tables"),dict) and "career" in m["tables"]:
    return p.parent,m
  except Exception: pass
 raise RuntimeError("The release archive has no valid data manifest.")

def literal(path:pathlib.Path)->str:
 return "'"+str(path).replace("'","''")+"'"

def clean(value:Any)->Any:
 if value is None or isinstance(value,(str,int,float,bool)): return value
 if isinstance(value,(dt.date,dt.datetime)): return value.isoformat()
 if isinstance(value,dict): return {str(k):clean(v) for k,v in value.items()}
 if isinstance(value,(list,tuple)): return [clean(v) for v in value]
 try:
  if value!=value: return None
 except Exception: pass
 return str(value)

def build(archive:pathlib.Path,out:pathlib.Path,release_tag:str)->None:
 out.mkdir(parents=True,exist_ok=True)
 with tempfile.TemporaryDirectory(prefix="pg-player-data-") as tmp:
  root=pathlib.Path(tmp)
  print("Extracting upstream archive…",flush=True)
  safe_extract(archive,root)
  base,manifest=locate(root)
  names=("career","stat_club","player_profile","birth","national","club")
  paths={}
  for name in names:
   entry=manifest["tables"].get(name) or {}
   rel=entry.get("path")
   if not rel: raise RuntimeError("Missing table path: "+name)
   paths[name]=(base/rel).resolve()
   if not paths[name].is_file(): raise RuntimeError("Missing Parquet: "+str(paths[name]))
  db=duckdb.connect(":memory:")
  for name,path in paths.items():
   db.execute(f"CREATE VIEW {name} AS SELECT * FROM read_parquet({literal(path)})")
  print("Aggregating career, statistics, player identity and club metadata…",flush=True)
  sql="""
  WITH career_rollup AS (
   SELECT COALESCE(NULLIF(TRIM(player_qid),''),'name:'||player) id,
    any_value(player) name,
    list(struct_pack(club:=club_name,startYear:=start_year,endYear:=end_year,
      clubLink:=club_link,clubQid:=club_qid,loan:=loan)
      ORDER BY COALESCE(start_year,9999),seq) spells,
    SUM(apps) appearances,SUM(goals) goals,COUNT(apps) appearance_rows,COUNT(goals) goal_rows,
    COUNT(DISTINCT club_name) club_count,
    arg_max(club_name,COALESCE(end_year,start_year,0)) current_club,
    arg_max(club_qid,COALESCE(end_year,start_year,0)) current_club_qid,
    MIN(start_year) first_year,MAX(end_year) last_year
   FROM career WHERE COALESCE(TRIM(player),'')<>'' GROUP BY 1
  ), stat_rollup AS (
   SELECT COALESCE(NULLIF(TRIM(player_qid),''),'name:'||player) id,
    COUNT(DISTINCT CASE WHEN apps IS NOT NULL OR goals IS NOT NULL
      THEN COALESCE(NULLIF(club_qid,''),NULLIF(club_link,''),club)||'|'||season END) stat_seasons,
    SUM(CASE WHEN competition_group='League' THEN apps END) league_appearances,
    SUM(CASE WHEN competition_group='League' THEN goals END) league_goals,
    COUNT(CASE WHEN competition_group='League' AND apps IS NOT NULL THEN 1 END) league_appearance_rows,
    COUNT(CASE WHEN competition_group='League' AND goals IS NOT NULL THEN 1 END) league_goal_rows,
    COUNT(DISTINCT CASE WHEN competition_group='League' AND goals IS NOT NULL
      THEN COALESCE(NULLIF(club_qid,''),NULLIF(club_link,''),club)||'|'||season END) league_goal_seasons,
    list(struct_pack(club:=club,clubLink:=club_link,clubQid:=club_qid,season:=season,
      competitionGroup:=competition_group,apps:=apps,goals:=goals,assists:=assists)
      ORDER BY season,seq) FILTER (WHERE COALESCE(competition_group,'')<>'Total'
       AND (apps IS NOT NULL OR goals IS NOT NULL OR assists IS NOT NULL)) stats
   FROM stat_club GROUP BY 1
  ), profile_rollup AS (
   SELECT COALESCE(NULLIF(TRIM(player_qid),''),'name:'||player) id,
    any_value(full_name) full_name,any_value(nationality) nationality,
    any_value(position) position,any_value(birth_place) birth_place
   FROM player_profile GROUP BY 1
  ), birth_rollup AS (
   SELECT player_qid,any_value(birth_date) birth_date FROM birth
   WHERE precision=11 GROUP BY player_qid
  ), national_rollup AS (
   SELECT COALESCE(NULLIF(TRIM(player_qid),''),'name:'||player) id,
    SUM(caps) caps,SUM(goals) international_goals FROM national GROUP BY 1
  ), club_rollup AS (
   SELECT wikidata_qid,any_value(country) country,any_value(league) league,
    any_value(division) division FROM club GROUP BY wikidata_qid
  )
  SELECT c.id,c.name,COALESCE(p.full_name,c.name) full_name,
   COALESCE(p.nationality,'') nationality,COALESCE(p.position,'') position,
   COALESCE(p.birth_place,'') birth_place,c.spells,c.appearances,c.goals,
   c.appearance_rows,c.goal_rows,c.club_count,c.current_club,c.current_club_qid,
   c.first_year,c.last_year,s.stat_seasons,s.league_appearances,s.league_goals,
   s.league_appearance_rows,s.league_goal_rows,s.league_goal_seasons,s.stats,
   n.caps,n.international_goals,b.birth_date,
   COALESCE(cl.country,'') current_country,COALESCE(cl.league,'') current_league,
   cl.division current_division
  FROM career_rollup c
  LEFT JOIN stat_rollup s ON s.id=c.id
  LEFT JOIN profile_rollup p ON p.id=c.id
  LEFT JOIN birth_rollup b ON b.player_qid=c.id
  LEFT JOIN national_rollup n ON n.id=c.id
  LEFT JOIN club_rollup cl ON cl.wikidata_qid=c.current_club_qid
  ORDER BY c.id
  """
  result=db.execute(sql).fetchall()
  columns=[d[0] for d in db.description]
  buckets=[[] for _ in range(SHARD_COUNT)]
  stat_players=0
  for raw in result:
   row=dict(zip(columns,raw))
   spells=clean(row.get("spells") or [])
   clubs=[]
   for spell in spells:
    club=spell.get("club")
    if club and club not in clubs: clubs.append(club)
   stats=clean(row.get("stats") or [])
   if stats: stat_players+=1
   player={
    "id":str(row["id"]),"name":str(row.get("name") or row.get("full_name") or "Unknown player"),
    "fullName":str(row.get("full_name") or row.get("name") or ""),
    "nationality":str(row.get("nationality") or ""),"position":str(row.get("position") or ""),
    "birthPlace":str(row.get("birth_place") or ""),"clubs":clubs,"spells":spells,"stats":stats,
    "currentClub":str(row.get("current_club") or ""),
    "appearances":clean(row.get("appearances")),"goals":clean(row.get("goals")),
    "appearanceRows":int(row.get("appearance_rows") or 0),"goalRows":int(row.get("goal_rows") or 0),
    "clubCount":int(row.get("club_count") or 0),"firstYear":clean(row.get("first_year")),
    "lastYear":clean(row.get("last_year")),"seasons":int(row.get("stat_seasons") or 0),
    "leagueAppearances":clean(row.get("league_appearances")),"leagueGoals":clean(row.get("league_goals")),
    "leagueAppearanceRows":int(row.get("league_appearance_rows") or 0),
    "leagueGoalRows":int(row.get("league_goal_rows") or 0),
    "leagueGoalSeasons":int(row.get("league_goal_seasons") or 0),
    "caps":clean(row.get("caps")),"internationalGoals":clean(row.get("international_goals")),
    "birthDate":str(row.get("birth_date") or ""),"currentCountry":str(row.get("current_country") or ""),
    "currentLeague":str(row.get("current_league") or ""),"currentDivision":clean(row.get("current_division"))
   }
   bucket=int(hashlib.sha1(player["id"].encode()).hexdigest()[:8],16)%SHARD_COUNT
   buckets[bucket].append(player)
  db.close()
 shard_meta=[];total_bytes=0
 for i,players in enumerate(buckets):
  players.sort(key=lambda p:p["id"])
  filename=f"players-{i:02d}.json"
  payload={"releaseTag":release_tag,"source":SOURCE,"licence":LICENCE,"players":players}
  encoded=json.dumps(payload,ensure_ascii=False,separators=(",",":")).encode("utf-8")
  (out/filename).write_bytes(encoded)
  total_bytes+=len(encoded)
  shard_meta.append({"file":filename,"count":len(players),"bytes":len(encoded)})
 player_count=sum(len(x) for x in buckets)
 summary={"version":1,"source":SOURCE,"sourceUrl":SOURCE_URL,"licence":LICENCE,
  "releaseTag":release_tag,"generatedAt":dt.datetime.now(dt.timezone.utc).isoformat(),
  "playerCount":player_count,"playersWithSeasonStats":stat_players,
  "shardCount":SHARD_COUNT,"shards":shard_meta,"caveats":CAVEATS}
 (out/"manifest.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print(f"Generated {player_count:,} players; {stat_players:,} have season statistics; "
       f"{SHARD_COUNT} shards / {total_bytes:,} uncompressed bytes.",flush=True)

if __name__=="__main__":
 parser=argparse.ArgumentParser()
 parser.add_argument("--archive",required=True,type=pathlib.Path)
 parser.add_argument("--out",default=pathlib.Path("public/data/player-pool"),type=pathlib.Path)
 parser.add_argument("--release-tag",required=True)
 args=parser.parse_args()
 build(args.archive,args.out,args.release_tag)
