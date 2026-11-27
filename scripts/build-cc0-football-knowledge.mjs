import { createHash } from "node:crypto";
import { readdir, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { resolve, relative } from "node:path";
const ROOT=process.cwd(), P=resolve(ROOT,".sources/openfootball-players"), C=resolve(ROOT,".sources/openfootball-clubs"), IR=resolve(ROOT,".sources/international-results"), ENGLAND=resolve(ROOT,".sources/openfootball-england"), CHAMPIONS=resolve(ROOT,".sources/openfootball-champions-league"), WORLD_CUP=resolve(ROOT,".sources/openfootball-worldcup");
const TODAY=new Date().toISOString().slice(0,10), OUT=resolve(ROOT,"public/data");
const SOURCES={players:{repo:"openfootball/players",commit:"125d20f7cc06cac7e758b40df535a7695632680a",licence:"CC0-1.0",url:"https://github.com/openfootball/players"},clubs:{repo:"openfootball/clubs",commit:"ae3800227c449447b3a337fc0aac79a8f02f4c8b",licence:"CC0-1.0",url:"https://github.com/openfootball/clubs"},worldCup:{repo:"openfootball/worldcup.json",commit:"516d3825c3bd23fdc298c4014e84bde78f2d4965",licence:"CC0-1.0",url:"https://github.com/openfootball/worldcup.json",file:"public/data/worldcup-lineups.json"},internationalResults:{repo:"martj42/international_results",commit:"ca84241bb3eed854a1956a2fab442fe4daad40dd",licence:"CC0-1.0",url:"https://github.com/martj42/international_results",file:"results.csv"},england:{repo:"openfootball/england",commit:"9ee7a0c351805c99cc334478a9bf04b7d0432fec",licence:"CC0-1.0",url:"https://github.com/openfootball/england"},championsLeague:{repo:"openfootball/champions-league",commit:"abfaeddc2ee3d14f99ecc163c9ddb46cb4d67cef",licence:"CC0-1.0",url:"https://github.com/openfootball/champions-league"},wikidata:{repo:"Wikidata",licence:"CC0-1.0",url:"https://www.wikidata.org/wiki/Wikidata:Licensing",endpoint:"https://query-next.wikidata.org/sparql",retrievedAt:TODAY}};
const norm=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
const id=(kind,value)=>kind+"_"+createHash("sha256").update(norm(value)).digest("hex").slice(0,16);
const walk=async dir=>{let out=[];let entries=[];try{entries=await readdir(dir,{withFileTypes:true})}catch{return out}for(const e of entries){const p=resolve(dir,e.name);if(e.isDirectory())out.push(...await walk(p));else if(e.isFile()&&e.name.endsWith(".txt"))out.push(p)}return out};
const excluded=s=>!s||s.startsWith("#")||/^[=\-_*▪\s]+$/.test(s)||/^(?:http|source:|updated:|note:)/i.test(s);
const country=s=>s.replace(/^\s*=\s*/,"").replace(/\s*#.*$/,"").trim();

function parseCsv(text){
 const lines=text.split(/\r?\n/).filter(Boolean);if(!lines.length)return[];
 const parseLine=line=>{const values=[];let value="",quoted=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(quoted&&line[i+1]==='"'){value+='"';i++}else quoted=!quoted}else if(ch===","&&!quoted){values.push(value);value=""}else value+=ch}values.push(value);return values};
 const headers=parseLine(lines[0]);return lines.slice(1).map(line=>{const values=parseLine(line),row={};headers.forEach((header,index)=>row[header]=values[index]??"");return row});
}


async function parseInternationalResults(){
 const rows=parseCsv(await readFile(resolve(IR,"results.csv"),"utf8")),map=new Map();
 for(const row of rows){const date=row.date,home=row.home_team,away=row.away_team,homeScore=Number(row.home_score),awayScore=Number(row.away_score),tournament=row.tournament;if(!date||!home||!away||row.home_score===""||row.away_score===""||!Number.isInteger(homeScore)||!Number.isInteger(awayScore)||!tournament)continue;const key=[date,norm(home),norm(away),norm(tournament)].join("|");if(map.has(key))continue;map.set(key,{id:id("international-match",key),date,year:Number(date.slice(0,4)),home,away,homeScore,awayScore,tournament,city:row.city,country:row.country,neutral:String(row.neutral).toLowerCase()==="true",sourceKey:"internationalResults",sourceFile:"results.csv"})}
 return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));
}

async function parseEnglishMatches(){
 const files=(await walk(ENGLAND)).filter(path=>{
  const rel=relative(ENGLAND,path).split(String.fromCharCode(92)).join("/");
  if(rel.startsWith("rsssf/")||rel.includes("/squads/")||/-full\.txt$/i.test(rel))return false;
  return /(?:^|\/)(?:[1-4]-(?:premierleague|championship|league1|league2|division1|division2|division3|division4)|eflcup|facup)\.txt$/i.test(rel);
 });
 const monthMap={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
 const records=new Map();
 for(const path of files){
  const rel=relative(ENGLAND,path).split(String.fromCharCode(92)).join("/");
  const seasonMatch=rel.match(/(?:^|\/)(\d{4})-(\d{2})\//);
  if(!seasonMatch)continue;
  const seasonStart=Number(seasonMatch[1]);let seasonEnd=Math.floor(seasonStart/100)*100+Number(seasonMatch[2]);if(seasonEnd<=seasonStart)seasonEnd+=100;
  const filename=rel.split("/").at(-1)||"";
  let competition="";
  if(/premierleague/i.test(filename))competition="Premier League";
  else if(/championship/i.test(filename))competition="Championship";
  else if(/division1/i.test(filename))competition="First Division";
  else if(/division2/i.test(filename))competition="Second Division";
  else if(/division3/i.test(filename))competition="Third Division";
  else if(/division4/i.test(filename))competition="Fourth Division";
  else if(/league1/i.test(filename))competition="League One";
  else if(/league2/i.test(filename))competition="League Two";
  else if(/eflcup/i.test(filename))competition="EFL Cup";
  else if(/facup/i.test(filename))competition="FA Cup";
  if(!competition)continue;
  const content=await readFile(path,"utf8");let currentDate="";const lines=content.split(/\r?\n/);
  for(let lineIndex=0;lineIndex<lines.length;lineIndex++){
   const line=lines[lineIndex].trim();if(!line||line.startsWith("#")||line.startsWith("=")||line.startsWith("▪"))continue;
   const day=line.match(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Za-z]{3})\s+(\d{1,2})(?:\s+(\d{4}))?$/);
   if(day){const month=monthMap[day[1]];if(!month)continue;const year=day[3]?Number(day[3]):month>=7?seasonStart:seasonEnd;currentDate=year+"-"+String(month).padStart(2,"0")+"-"+String(Number(day[2])).padStart(2,"0");continue;}
   if(!currentDate)continue;
   const match=line.match(/^(?:\d{1,2}:\d{2}\s+)?(.+?)\s+(\d+)-(\d+)(?:\s+\([^)]*\))?\s+(.+?)\s*$/i);
   if(!match)continue;const cleanTeam=value=>value.trim().replace(/\s+FC$/i,"");
   const home=cleanTeam(match[1]),homeScore=Number(match[2]),awayScore=Number(match[3]),away=cleanTeam(match[4]);
   if(!home||!away||homeScore>30||awayScore>30)continue;
   const key=[competition,seasonStart,currentDate,norm(home),norm(away)].join("|");if(records.has(key))continue;
   const sourceRow=rel+":"+String(lineIndex+1);
   records.set(key,{id:id("english-match",key),date:currentDate,year:Number(currentDate.slice(0,4)),home,away,homeScore,awayScore,tournament:competition+" "+seasonStart+"/"+String(seasonEnd).slice(-2),competition,season:seasonStart+"/"+String(seasonEnd).slice(-2),region:"ENGLISH_DOMESTIC",neutral:false,sourceKey:"england",sourceFile:rel,sourceRow});
  }
 }
 return [...records.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.competition.localeCompare(b.competition)||a.home.localeCompare(b.home));
}
async function parseEuropeanClubMatches(){
 const files=(await walk(CHAMPIONS)).filter(path=>/(?:^|\/)(?:cl|el|conf|clq|elq|confq)\.txt$/i.test(relative(CHAMPIONS,path).replace(/\\/g,"/")));
 const monthMap={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
 const records=new Map();
 for(const path of files){
  const rel=relative(CHAMPIONS,path).replace(/\\/g,"/");
  const seasonMatch=rel.match(/(?:^|\/)(\d{4})-(\d{2})\//);
  if(!seasonMatch)continue;
  const seasonStart=Number(seasonMatch[1]);let seasonEnd=Math.floor(seasonStart/100)*100+Number(seasonMatch[2]);if(seasonEnd<=seasonStart)seasonEnd+=100;
  const filename=rel.split("/").at(-1)||"";
  const code=filename.replace(/\.txt$/i,"").toLowerCase();
  const competition=({cl:"UEFA Champions League",clq:"UEFA Champions League Qualifying",el:"UEFA Europa League",elq:"UEFA Europa League Qualifying",conf:"UEFA Conference League",confq:"UEFA Conference League Qualifying"})[code];
  if(!competition)continue;
  const content=await readFile(path,"utf8");let currentDate="",stage="";
  const lines=content.split(/\r?\n/);
  for(let lineIndex=0;lineIndex<lines.length;lineIndex++){
   const line=lines[lineIndex].trim();
   if(!line||line.startsWith("#")||line.startsWith("="))continue;
   if(line.startsWith("▪")){stage=line.replace(/^▪\s*/,"");continue;}
   const day=line.match(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Za-z]{3})\s+(\d{1,2})(?:\s+(\d{4}))?$/);
   if(day){const month=monthMap[day[1]];if(!month)continue;const year=day[3]?Number(day[3]):month>=7?seasonStart:seasonEnd;currentDate=year+"-"+String(month).padStart(2,"0")+"-"+String(Number(day[2])).padStart(2,"0");continue;}
   if(!currentDate)continue;
   const match=line.match(/^(?:\d{1,2}:\d{2}\s+)?(.+?)\s+v\s+(.+?)\s+(\d+)-(\d+)(?:\s+\([^)]*\))?(?:\s+(?:aet|pens?|penalties))?\s*$/i);
   if(!match)continue;
   const cleanTeam=value=>value.trim().replace(/\s+\([A-Z]{3}\)$/i,"").replace(/\s+FC$/i,"");
   const home=cleanTeam(match[1]),away=cleanTeam(match[2]),homeScore=Number(match[3]),awayScore=Number(match[4]);
   if(!home||!away||homeScore>30||awayScore>30)continue;
   const key=[competition,seasonStart,currentDate,norm(home),norm(away)].join("|");if(records.has(key))continue;
   const sourceRow=rel+":"+String(lineIndex+1);
   records.set(key,{id:id("uefa-club-match",key),date:currentDate,year:Number(currentDate.slice(0,4)),home,away,homeScore,awayScore,tournament:competition+" "+seasonStart+"/"+String(seasonEnd).slice(-2),competition,season:seasonStart+"/"+String(seasonEnd).slice(-2),region:"INTERNATIONAL",sourceKey:"championsLeague",sourceFile:rel,sourceRow,round:stage});
  }
 }
 return [...records.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.competition.localeCompare(b.competition)||a.home.localeCompare(b.home));
}

async function parseInternationalGoals(players){
 const rows=parseCsv(await readFile(resolve(IR,"goalscorers.csv"),"utf8"));
 const aliases=new Map();
 for(const player of players)for(const name of [player.name,...(player.aliases||[])])aliases.set(norm(name),player);
 const aggregates=new Map(),events=new Set(),goalEvents=[];let accepted=0,duplicates=0,ownGoals=0;
 for(const row of rows){
  const date=String(row.date||"").trim(),team=String(row.team||"").trim(),scorer=String(row.scorer||"").trim();
  const home=String(row.home_team||"").trim(),away=String(row.away_team||"").trim(),minute=String(row.minute||"").trim();
  if(!date||!team||!scorer||!/^\d{4}-\d{2}-\d{2}$/.test(date))continue;
  const ownGoal=["true","1","yes"].includes(String(row.own_goal||"").trim().toLowerCase());
  const penalty=["true","1","yes"].includes(String(row.penalty||"").trim().toLowerCase());
  const eventKey=[date,norm(home),norm(away),norm(team),norm(scorer),minute,String(penalty),String(ownGoal)].join("|");
  if(events.has(eventKey)){duplicates++;continue;}events.add(eventKey);
  goalEvents.push({id:id("international-goal-event",eventKey),date,year:Number(date.slice(0,4)),home,away,team,scorer,minute,penalty,ownGoal,eligibleForScorerTotals:!ownGoal,sourceKey:"internationalResults"});
  if(ownGoal){ownGoals++;continue;}
  accepted++;
  let player=aliases.get(norm(scorer));
  if(!player){
   player={id:id("player",scorer),name:scorer,aliases:[],nationalities:[],birthYears:[],positions:[],source:SOURCES.internationalResults.repo,sourceCommit:SOURCES.internationalResults.commit,licence:"CC0-1.0"};
   players.push(player);aliases.set(norm(scorer),player);
  }
  const entry=aggregates.get(player.id)||{id:player.id,name:player.name,goals:0,penaltyGoals:0,nonPenaltyGoals:0,teams:[],years:[],matches:[],source:SOURCES.internationalResults.repo,sourceCommit:SOURCES.internationalResults.commit,licence:"CC0-1.0",scope:"Recorded goals in men's senior full internationals, 1872–2024; source coverage is not guaranteed complete."};
  entry.goals++;
  if(penalty)entry.penaltyGoals++;else entry.nonPenaltyGoals++;
  const year=Number(date.slice(0,4));if(!entry.years.includes(year))entry.years.push(year);
  if(!entry.teams.some(x=>norm(x)===norm(team)))entry.teams.push(team);
  const match=[date,home,away].join(" · ");if(!entry.matches.includes(match))entry.matches.push(match);
  aggregates.set(player.id,entry);
 }
 const scorers=[...aggregates.values()].sort((a,b)=>b.goals-a.goals||a.name.localeCompare(b.name));
 return {scorers,events:goalEvents,meta:{acceptedGoalEvents:accepted,uniqueGoalEvents:goalEvents.length,duplicateGoalRows:duplicates,ownGoalsExcluded:ownGoals,uniqueScorers:scorers.length,eligibleScorers:scorers.filter(x=>x.goals>=2).length}};
}
function makeInternationalGoalPacks(scorers){
 const eligible=scorers.filter(player=>player.goals>=2),lowball=[],ladder=[],football501=[];
 const pairSeen=new Set(),ladderSeen=new Set(),checkoutSeen=new Set();
 if(eligible.length<500)return{lowball,ladder,football501};
 for(let seed=1;seed<20000&&lowball.length<750;seed++){
  const draw=seededShuffle(eligible,seed*7919+23),a=draw[0],b=draw[1];
  if(!a||!b||a.id===b.id||a.goals===b.goals)continue;
  const signature=[a.id,b.id].sort().join("|");if(pairSeen.has(signature))continue;pairSeen.add(signature);
  lowball.push({id:id("lowball",signature),players:[a,b].map(p=>({id:p.id,name:p.name,value:p.goals})),metric:"recorded senior international goals",source:SOURCES.internationalResults});
 }
 for(let seed=1;seed<20000&&ladder.length<750;seed++){
  const draw=seededShuffle(eligible,seed*3571+61).slice(0,5);
  if(draw.length!==5||new Set(draw.map(p=>p.id)).size!==5||new Set(draw.map(p=>p.goals)).size!==5)continue;
  const signature=draw.map(p=>p.id).sort().join("|");if(ladderSeen.has(signature))continue;ladderSeen.add(signature);
  ladder.push({id:id("ladder",signature),players:draw.map(p=>({id:p.id,name:p.name,value:p.goals})),metric:"recorded senior international goals",source:SOURCES.internationalResults});
 }
 for(let seed=1;seed<20000&&football501.length<750;seed++){
  const draw=seededShuffle(eligible,seed*2377+83).slice(0,12);
  if(draw.length!==12||new Set(draw.map(p=>p.id)).size!==12)continue;
  const signature=draw.map(p=>p.id).sort().join("|");if(checkoutSeen.has(signature))continue;checkoutSeen.add(signature);
  football501.push({id:id("football-501",signature),players:draw.map(p=>({id:p.id,name:p.name,value:p.goals,label:"RECORDED SENIOR INTERNATIONAL GOALS"})),metric:"recorded senior international goals",source:SOURCES.internationalResults});
 }
 return{lowball,ladder,football501};
}

function buildInternationalQuiz(matches){
 const scorelines=[...new Set(matches.map(m=>m.homeScore+"-"+m.awayScore))];
 const allTeams=[...new Set(matches.flatMap(m=>[m.home,m.away]).filter(Boolean))];
 const teamsBySource=new Map(),teamsByCompetition=new Map();
 for(const match of matches){
  const sourceKey=match.sourceKey??"unknown";
  const sourceTeams=teamsBySource.get(sourceKey)??new Set();
  sourceTeams.add(match.home);sourceTeams.add(match.away);teamsBySource.set(sourceKey,sourceTeams);
  const competitionKey=[sourceKey,match.competition??""].join("|");
  const competitionTeams=teamsByCompetition.get(competitionKey)??new Set();
  competitionTeams.add(match.home);competitionTeams.add(match.away);teamsByCompetition.set(competitionKey,competitionTeams);
 }
 const totals=[...new Set(matches.map(m=>String(m.homeScore+m.awayScore)))];
 const margins=[...new Set(matches.map(m=>String(Math.abs(m.homeScore-m.awayScore))))];

 const pickOptions=(answer,candidates,key)=>{
  const answerValue=String(answer);
  if(!Array.isArray(candidates))return null;
  const cleanCandidates=[...new Map(candidates.map(value=>[norm(value),String(value)])).values()];
  if(cleanCandidates.length<5)return null;
  const seed=parseInt(createHash("sha256").update(key).digest("hex").slice(0,8),16)>>>0;
  const distractors=[];let index=seed%cleanCandidates.length;
  for(let attempt=0;attempt<cleanCandidates.length&&distractors.length<4;attempt++){
   const value=String(cleanCandidates[index]);
   if(value!==answerValue&&!distractors.includes(value))distractors.push(value);
   index=(index+1)%cleanCandidates.length;
  }
  if(distractors.length!==4)return null;
  return [answerValue,...distractors].sort((a,b)=>createHash("sha256").update(key+a).digest("hex").localeCompare(createHash("sha256").update(key+b).digest("hex")));
 };
 const questions=matches.map(match=>{
  const selector=parseInt(createHash("sha256").update(match.id).digest("hex").slice(0,2),16)%4;
  let answer,question,explanation,options,questionType;
  const competitionKey=[match.sourceKey??"unknown",match.competition??""].join("|");
  const competitionPool=teamsByCompetition.get(competitionKey);
  const sourcePool=teamsBySource.get(match.sourceKey);
  const teamCandidates=[...(competitionPool??[])];
  if(selector===0){
   questionType="scoreline";answer=match.homeScore+"-"+match.awayScore;
   question="What was the final score when "+match.home+" played "+match.away+" on "+match.date+"?";
   explanation=match.home+" "+answer.replace("-", "–")+" "+match.away+". Penalty shoot-out scores are not included.";
   options=pickOptions(answer,scorelines,match.id);
  }else if(selector===1){
   questionType="match-winner";answer=match.homeScore===match.awayScore?"Draw":match.homeScore>match.awayScore?match.home:match.away;
   question=match.homeScore===match.awayScore?"Which result did "+match.home+" and "+match.away+" record on "+match.date+"?":"Which team won when "+match.home+" played "+match.away+" on "+match.date+"?";
   explanation=match.home+" "+match.homeScore+"–"+match.awayScore+" "+match.away+". "+(answer==="Draw"?"The match finished level.":answer+" recorded the win.");
   options=pickOptions(answer,[...teamCandidates,"Draw"],match.id);
  }else if(selector===2){
   questionType="total-goals";answer=String(match.homeScore+match.awayScore);
   question="How many goals were scored when "+match.home+" met "+match.away+" on "+match.date+"?";
   explanation="The match finished "+match.homeScore+"–"+match.awayScore+", making "+answer+" goals in total.";
   options=pickOptions(answer,totals,match.id);
  }else{
   questionType="goal-margin";answer=String(Math.abs(match.homeScore-match.awayScore));
   question="What was the goal difference in the match between "+match.home+" and "+match.away+" on "+match.date+"?";
   explanation="The final score was "+match.homeScore+"–"+match.awayScore+", a margin of "+answer+" goal"+(answer==="1"?"":"s")+".";
   options=pickOptions(answer,margins,match.id);
  }
  if(!options)return null;
  const tier=match.sourceKey==="england"?(match.year>=2015?"EASY":match.year>=2005?"MEDIUM":match.year>=1995?"HARD":"EXTREME"):(match.year>=2000?"EASY":match.year>=1980?"MEDIUM":match.year>=1950?"HARD":"EXTREME");
  const region=match.region??"INTERNATIONAL";
  const source=match.sourceKey==="england"?SOURCES.england:match.sourceKey==="championsLeague"?SOURCES.championsLeague:SOURCES.internationalResults;
  return{id:id("international-question",match.id),factId:match.id,playerId:match.id,tier,region,category:match.tournament,questionType,question,answer,options,explanation,source:source.url+"/blob/"+source.commit+"/"+(match.sourceFile??"results.csv"),matchId:match.id,eventDate:match.date};
 }).filter(Boolean);
 const englishDomestic=questions.filter(q=>q.region==="ENGLISH_DOMESTIC").sort((a,b)=>a.id.localeCompare(b.id));
 const international=questions.filter(q=>q.region==="INTERNATIONAL").sort((a,b)=>a.id.localeCompare(b.id));
 const split=(items)=>{const a=[],b=[];items.forEach((item,index)=>(index%2?a:b).push(item));return[a,b]};
 const [englishA,englishB]=split(englishDomestic),[intA,intB]=split(international);
 return {all:questions,climb:[...englishA,...intA],timed:[...englishB,...intB]};
}

async function parsePlayers(){const files=(await walk(P)).filter(p=>/(?:players|\.up)\.txt$/i.test(p));const map=new Map();for(const path of files){const text=await readFile(path,"utf8");let nation=relative(P,path).split(/[\\/]/)[0].replace(/[-_]/g," ");for(const raw of text.split(/\r?\n/)){const line=raw.trim();if(!line)continue;if(/^=\s*/.test(line)){nation=country(line);continue}if(excluded(line))continue;const body=line.split("##")[0].trim(),parts=body.includes("|")?body.split("|").map(x=>x.trim()).filter(Boolean):body.split(",").map(x=>x.trim()).filter(Boolean);const name=parts[0]?.replace(/\s*,?\s*b\.\s*(?:\d{1,2}\s+[A-Za-z]{3}\s+)?\d{4}.*$/i,"").trim();if(!name||name.length<3||name.length>70)continue;const key=norm(name),birth=body.match(/\bb\.\s*(?:\d{1,2}\s+[A-Za-z]{3}\s+)?(\d{4})\b/i);const position=parts.length>1&&/^(?:G|GK|D|DF|M|MF|F|FW)(?:\s*\|\s*(?:G|GK|D|DF|M|MF|F|FW))*$/i.test(parts[1])?parts[1].split("|").map(x=>x.trim().toUpperCase()):[];const row=map.get(key)||{id:id("player",key),name,aliases:[],nationalities:[],birthYears:[],positions:[],source:SOURCES.players.repo,sourceCommit:SOURCES.players.commit,licence:"CC0-1.0"};for(const a of parts.slice(1)){const alias=a.replace(/\s*,?\s*b\.\s*(?:\d{1,2}\s+[A-Za-z]{3}\s+)?\d{4}.*$/i,"").trim();if(alias&&alias!=="-"&&!alias.includes("@")&&!/^\d/.test(alias)&&!/^b\./i.test(alias)&&norm(alias)!==key&&!/^(?:G|GK|D|DF|M|MF|F|FW)$/.test(alias.toUpperCase())&&/[A-Za-z].+\s+[A-Za-z]/.test(alias)&&!row.aliases.some(x=>norm(x)===norm(alias)))row.aliases.push(alias)}if(nation&&!row.nationalities.some(x=>norm(x)===norm(nation)))row.nationalities.push(nation);if(birth&&!row.birthYears.includes(+birth[1]))row.birthYears.push(+birth[1]);for(const p of position)if(!row.positions.includes(p))row.positions.push(p);map.set(key,row)}}return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name))}
async function parseClubs(){const files=(await walk(C)).filter(p=>/clubs\.wiki\.txt$/i.test(p));const map=new Map();for(const path of files){const text=await readFile(path,"utf8");let nation=relative(C,path).split(/[\\/]/)[0].replace(/[-_]/g," ");for(const raw of text.split(/\r?\n/)){const line=raw.trim();if(!line)continue;if(/^=\s*/.test(line)){nation=country(line);continue}if(excluded(line)||line.length<3||line.length>100||line.includes("|")||/^(?:club|team|name|country)/i.test(line))continue;const name=line.replace(/\s+#.*$/,"").trim(),key=norm(name);if(!key)continue;const row=map.get(key)||{id:id("club",key),name,countries:[],source:SOURCES.clubs.repo,sourceCommit:SOURCES.clubs.commit,licence:"CC0-1.0"};if(nation&&!row.countries.some(x=>norm(x)===norm(nation)))row.countries.push(nation);map.set(key,row)}}return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name))}

async function fetchWikidataCareers(players){
 const query=`SELECT ?player ?playerLabel ?statement ?club ?clubLabel ?start ?end
  (GROUP_CONCAT(DISTINCT ?nationalityLabel; separator="|") AS ?nationalities) WHERE {
  ?player wdt:P106 wd:Q937857; p:P54 ?statement.
  ?statement ps:P54 ?club; pq:P580 ?start.
  OPTIONAL { ?statement pq:P582 ?end. }
  OPTIONAL { ?player wdt:P27 ?nationality. }
  ?club wdt:P31/wdt:P279* wd:Q476028.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
 } GROUP BY ?player ?playerLabel ?statement ?club ?clubLabel ?start ?end LIMIT 50000`;
 const meta={status:"not-run",endpoint:SOURCES.wikidata.endpoint,retrievedAt:TODAY,rawRows:0,acceptedSpells:0,players:0,eligibleCareerFile:0,eligibleCultHero:0,error:null};
 let bindings=[];
 const endpoints=[SOURCES.wikidata.endpoint,"https://query.wikidata.org/sparql"];
 let lastError=null;
 for(const endpoint of endpoints){
  try{
   const url=new URL(endpoint);
   url.searchParams.set("query",query);
   url.searchParams.set("format","json");
   url.searchParams.set("timeout","60s");
   const response=await fetch(url,{headers:{
    "Accept":"application/sparql-results+json",
    "User-Agent":"PLAYGROUND-Football-Games/0.1 (https://github.com/lewisxatk/playground-football-games)"
   },signal:AbortSignal.timeout(65000)});
   if(!response.ok)throw new Error(endpoint+" returned HTTP "+response.status);
   const payload=await response.json();
   const rows=payload?.results?.bindings??[];
   if(!Array.isArray(rows))throw new Error(endpoint+" returned an unexpected SPARQL result shape.");
   bindings=rows;meta.status="success";meta.endpoint=endpoint;meta.rawRows=rows.length;lastError=null;break;
  }catch(error){lastError=error instanceof Error?error.message:String(error);console.warn("Wikidata endpoint failed:",lastError)}
 }
 if(lastError){meta.status="unavailable";meta.error=lastError;console.warn("Wikidata career import unavailable; other CC0 game pools remain buildable.");return {players:[],meta};}

 const byName=new Map();
 for(const player of players){const key=norm(player.name);if(!key)continue;const list=byName.get(key)||[];list.push(player);byName.set(key,list)}
 const profiles=new Map(),spellsSeen=new Set(),nationalitiesByQid=new Map();
 for(const row of bindings){
  const qid=String(row.player?.value??"").split("/").at(-1)||"";
  const labels=String(row.nationalities?.value??"").split("|").map(value=>value.trim()).filter(Boolean);
  if(!/^Q\d+$/.test(qid)||!labels.length)continue;
  const known=nationalitiesByQid.get(qid)||[];
  for(const label of labels)if(!known.some(value=>norm(value)===norm(label)))known.push(label);
  nationalitiesByQid.set(qid,known);
 }
 const dateYear=value=>{
  const match=String(value??"").match(/(?:\+|-)?(\d{4})-/);
  if(!match)return null;const year=Number(match[1]);
  return Number.isInteger(year)&&year>=1800&&year<=2100?year:null;
 };
 for(const row of bindings){
  const qid=String(row.player?.value??"").split("/").at(-1)||"";
  const playerName=String(row.playerLabel?.value??"").trim();
  const clubQid=String(row.club?.value??"").split("/").at(-1)||"";
  const club=String(row.clubLabel?.value??"").trim();
  const statement=String(row.statement?.value??"").split("/").at(-1)||"";
  const startYear=dateYear(row.start?.value);
  const endYear=row.end?.value?dateYear(row.end.value):null;
  if(!/^Q\d+$/.test(qid)||!/^Q\d+$/.test(clubQid)||!statement||!playerName||!club||startYear===null)continue;
  if(endYear!==null&&endYear<startYear)continue;
  const spellKey=qid+"|"+statement;if(spellsSeen.has(spellKey))continue;spellsSeen.add(spellKey);
  let profile=profiles.get(qid);
  if(!profile){
   const matches=byName.get(norm(playerName))??[];
   let entity=matches.length===1&&!matches[0].wikidataId?matches[0]:null;
   if(!entity){
    entity={id:"wikidata-player_"+qid,name:playerName,aliases:[],nationalities:[],birthYears:[],positions:[],
     source:SOURCES.wikidata.repo,sourceCommit:"live-query-snapshot-"+TODAY,licence:"CC0-1.0"};
    players.push(entity);const list=byName.get(norm(playerName))||[];list.push(entity);byName.set(norm(playerName),list);
   }else entity.wikidataId=qid;
   profile={
    id:"wikidata-career_"+qid,playerId:entity.id,qid,name:playerName,fullName:playerName,
    nationality:entity.nationalities?.[0]??nationalitiesByQid.get(qid)?.[0]??"",
    nationalities:[...new Map([...(entity.nationalities??[]),...(nationalitiesByQid.get(qid)??[])].map(value=>[norm(value),value])).values()],
    position:entity.positions?.[0]??"",
    aliases:[playerName,...(entity.aliases??[])],birthYears:entity.birthYears??[],
    spells:[],source:SOURCES.wikidata.repo,licence:"CC0-1.0",sourceItemUrl:"https://www.wikidata.org/wiki/"+qid,
    sourceRetrievedAt:TODAY
   };
   profiles.set(qid,profile);
  }
  profile.spells.push({
   id:id("wikidata-spell",spellKey),statementId:statement,clubId:"wikidata-club_"+clubQid,
   clubQid,club,startYear,endYear,years:startYear+"–"+(endYear??"?"),
   source:"Wikidata P54 with P580/P582 qualifiers",licence:"CC0-1.0"
  });
  meta.acceptedSpells++;
 }
 const careerPlayersRaw=[...profiles.values()].map(profile=>{
  const seen=new Set(),spells=profile.spells.filter(spell=>{
   const key=spell.clubQid+"|"+spell.startYear+"|"+(spell.endYear??"");
   if(seen.has(key))return false;seen.add(key);return true;
  }).sort((a,b)=>a.startYear-b.startYear||a.club.localeCompare(b.club)||a.id.localeCompare(b.id));
  return {...profile,spells,clubs:[...new Set(spells.map(spell=>spell.club))],
   firstYear:spells.length?spells[0].startYear:null,lastYear:spells.length?Math.max(...spells.map(spell=>spell.endYear??spell.startYear)):null};
 }).filter(profile=>profile.spells.length>=2&&new Set(profile.spells.map(spell=>spell.clubQid)).size>=2)
  .sort((a,b)=>a.id.localeCompare(b.id));
 const nameCounts=new Map();for(const player of careerPlayersRaw){const key=norm(player.name);nameCounts.set(key,(nameCounts.get(key)||0)+1)}
 const careerPlayers=careerPlayersRaw.filter(player=>nameCounts.get(norm(player.name))===1);
 meta.players=careerPlayers.length;
 meta.eligibleCareerFile=careerPlayers.filter(p=>p.spells.length>=2&&new Set(p.spells.map(s=>s.clubQid)).size>=2).length;
 meta.eligibleCultHero=meta.eligibleCareerFile;
 return {players:careerPlayers,meta};
}
function makeWikidataLinkPacks(careerPlayers,englishClubNames,target=750){
 const byClub=new Map();
 for(const player of careerPlayers)for(const spell of player.spells){
  if(!englishClubNames.has(clubKey(spell.club)))continue;
  const key=spell.clubQid,list=byClub.get(key)||[];
  if(spell.startYear!==null)list.push({player,spell});
  byClub.set(key,list);
 }
 const overlaps=(a,b)=>{
  const aStart=a.startYear,aEnd=a.endYear??a.startYear,bStart=b.startYear,bEnd=b.endYear??b.startYear;
  return Math.max(aStart,bStart)<=Math.min(aEnd,bEnd);
 };
 const uniqueBridge=(start,end,startSpell,endSpell,answer)=>{
  const startClub=byClub.get(startSpell.clubQid)||[],endClub=byClub.get(endSpell.clubQid)||[];
  const overlappingStart=new Set(startClub.filter(x=>overlaps(x.spell,startSpell)).map(x=>x.player.id));
  const overlappingEnd=new Set(endClub.filter(x=>overlaps(x.spell,endSpell)).map(x=>x.player.id));
  // The endpoints themselves must not satisfy the bridge clue.
  if(overlappingStart.has(start.id)&&overlappingEnd.has(start.id))return false;
  if(overlappingStart.has(end.id)&&overlappingEnd.has(end.id))return false;
  const bridgeIds=[...overlappingStart].filter(id=>overlappingEnd.has(id)&&id!==start.id&&id!==end.id);
  return bridgeIds.length===1&&bridgeIds[0]===answer.id;
 };
 const ordered=seededShuffle(careerPlayers,20261127),packs=[],usedAnswers=new Set(),usedSignatures=new Set();
 for(const answer of ordered){
  if(packs.length>=target)break;
  if(usedAnswers.has(answer.id))continue;
  const spells=answer.spells.filter(spell=>spell.clubQid&&spell.startYear!==null);
  let found=null;
  for(let i=0;i<spells.length&&!found;i++)for(let j=i+1;j<spells.length&&!found;j++){
   const first=spells[i],second=spells[j];
   if(first.clubQid===second.clubQid)continue;
   // Keep the proposed bridge player in both candidate sets so the
   // intersection can prove that this player is the unique connection.
   // Endpoints are excluded later when selecting the two displayed stars.
   const startCandidates=(byClub.get(first.clubQid)||[]).filter(x=>overlaps(first,x.spell));
   const endCandidates=(byClub.get(second.clubQid)||[]).filter(x=>overlaps(second,x.spell));
   // Find the bridge by set intersection first; avoid the previous O(A×B)
   // Cartesian product across every pair of players at two busy clubs.
   const startById=new Map(startCandidates.map(x=>[x.player.id,x]));
   const bridgeIds=[...new Set(endCandidates.map(x=>x.player.id))].filter(playerId=>startById.has(playerId));
   if(bridgeIds.length!==1||bridgeIds[0]!==answer.id)continue;
   const startChoices=seededShuffle(startCandidates.filter(x=>x.player.id!==answer.id),hashCode(answer.id+first.id)).slice(0,12);
   const endChoices=seededShuffle(endCandidates.filter(x=>x.player.id!==answer.id),hashCode(answer.id+second.id)).slice(0,12);
   let pair=null;
   for(const a of startChoices){const b=endChoices.find(x=>x.player.id!==a.player.id);if(b){pair={a,b};break;}}
   if(!pair)continue;
   const decoys=seededShuffle(careerPlayers.filter(p=>p.id!==answer.id&&p.id!==pair.a.player.id&&p.id!==pair.b.player.id),hashCode(answer.id+pair.a.player.id+pair.b.player.id)).slice(0,5);
   if(decoys.length<5)continue;
   const signature=[answer.id,pair.a.player.id,pair.b.player.id,first.clubQid,second.clubQid].join("|");
   if(usedSignatures.has(signature))continue;
   usedSignatures.add(signature);
   found={
    id:id("link-up-puzzle",signature),answerPlayerId:answer.id,
    startPlayerId:pair.a.player.id,endPlayerId:pair.b.player.id,
    startClub:first.club,startClubId:first.clubQid,endClub:second.club,endClubId:second.clubQid,
    optionPlayerIds:seededShuffle([answer,...decoys],hashCode(signature)).map(p=>p.id),
    explanation:"The connecting player has overlapping dated membership records at both clubs. The periods are recorded in Wikidata statements, not match-by-match appearance records.",
    source:SOURCES.wikidata,licence:"CC0-1.0"
   };
  }
  if(found){packs.push(found);usedAnswers.add(answer.id);}
 }
 return packs;
}
function hashCode(value){return parseInt(createHash("sha256").update(String(value)).digest("hex").slice(0,8),16)>>>0;}

function makeConnections(clubs){const byCountry=new Map();for(const club of clubs)for(const c of club.countries){const k=norm(c),g=byCountry.get(k)||{label:c,clubs:[]};g.clubs.push(club.name);byCountry.set(k,g)}const groups=[...byCountry.values()].map(g=>({...g,clubs:[...new Set(g.clubs)].sort()})).filter(g=>g.clubs.length>=4).sort((a,b)=>a.label.localeCompare(b.label));const packs=[],seen=new Set();for(let seed=0;packs.length<500&&seed<15000&&groups.length>=4;seed++){const chosen=[];for(let j=0;j<4;j++){const g=groups[(seed*7+j*Math.max(1,Math.floor(groups.length/4)))%groups.length];if(!chosen.some(x=>norm(x.label)===norm(g.label)))chosen.push(g)}for(const g of groups)if(chosen.length<4&&!chosen.includes(g))chosen.push(g);if(chosen.length!==4)continue;const categories=chosen.map((g,j)=>{const start=(seed*(j+3)*5)%g.clubs.length;return{label:g.label,members:Array.from({length:4},(_,n)=>g.clubs[(start+n)%g.clubs.length])}});const all=categories.flatMap(g=>g.members);if(new Set(all.map(norm)).size!==16)continue;const sig=categories.map(g=>g.members.map(norm).sort().join(",")).sort().join("|");if(seen.has(sig))continue;seen.add(sig);packs.push({id:id("connections",sig),source:SOURCES.clubs.repo,licence:"CC0-1.0",groups:categories})}return packs}

function seededShuffle(items,seed){const copy=[...items];let state=seed>>>0;const random=()=>{state=(state+0x6D2B79F5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296};for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]}return copy}
function makePlayerConnections(players){
 const buckets=new Map();
 const add=(dimension,value,player)=>{if(!value)return;const key=dimension+":"+value,entry=buckets.get(key)||{key,dimension,value,members:[]};entry.members.push(player.id);buckets.set(key,entry)};
 for(const player of players){
  const nation=player.nationalities?.[0];if(nation)add("NATIONALITY",nation,player);
  const raw=player.positions?.[0],position=({G:"GOALKEEPER",GK:"GOALKEEPER",D:"DEFENDER",DF:"DEFENDER",M:"MIDFIELDER",MF:"MIDFIELDER",F:"FORWARD",FW:"FORWARD"})[raw]||"";if(position)add("POSITION",position,player);
 }
 const options=[...buckets.values()].map(option=>{const members=[...new Set(option.members)];return {...option,members,memberSet:new Set(members)}}).filter(option=>option.members.length>=4);
 const packs=[],seen=new Set();
 for(let seed=1;seed<30000&&packs.length<500;seed++){
  const ordered=seededShuffle(options,seed*7919+17);let chosen=null,exclusive=null;
  for(let offset=0;offset<=ordered.length-4&&!chosen;offset++){
   const candidate=ordered.slice(offset,offset+4);
   const groups=candidate.map(option=>{const members=option.members.filter(id=>candidate.every(other=>other.key===option.key||!other.memberSet.has(id)));return seededShuffle(members,seed*37+option.value.length*13).slice(0,4)});
   if(groups.every(group=>group.length===4)){chosen=candidate;exclusive=groups;}
  }
  if(!chosen||!exclusive)continue;
  const groups=chosen.map((option,index)=>({name:option.dimension+" · "+option.value.toUpperCase(),dimension:option.dimension,value:option.value,memberIds:exclusive[index]}));
  const members=groups.flatMap(group=>group.memberIds);if(members.length!==16||new Set(members).size!==members.length)continue;
  const signature=groups.map(group=>group.name+":"+group.memberIds.slice().sort().join(",")).sort().join("|");
  if(seen.has(signature))continue;seen.add(signature);packs.push({id:id("connections-players",signature),source:SOURCES.players.repo,licence:"CC0-1.0",ambiguityChecked:true,groups});
 }
 return packs;
}
function makeGridPacks(players){
 const positionMap={G:"GK",GK:"GK",D:"DEF",DF:"DEF",M:"MID",MF:"MID",F:"FWD",FW:"FWD"},positions=["GK","DEF","MID","FWD"],buckets=new Map();
 for(const player of players){const position=positionMap[player.positions?.[0]],nation=player.nationalities?.[0];if(!position||!nation)continue;const key=position+":"+norm(nation),entry=buckets.get(key)||{position,nation,members:[]};entry.members.push(player.id);buckets.set(key,entry)}
 const byNation=new Map();for(const entry of buckets.values()){const group=byNation.get(norm(entry.nation))||{label:entry.nation,counts:{}};group.counts[entry.position]=entry.members.length;byNation.set(norm(entry.nation),group)}
 const eligible=[...byNation.values()].filter(group=>positions.every(position=>(group.counts[position]||0)>=4)).map(group=>group.label).sort();
 if(eligible.length<4)return[];
 const packs=[],seen=new Set(),comboCount=eligible.length*(eligible.length-1)*(eligible.length-2)*(eligible.length-3)/24,variants=Math.max(1,Math.ceil(520/comboCount));
 let combo=0;
 outer:for(let a=0;a<eligible.length-3;a++)for(let b=a+1;b<eligible.length-2;b++)for(let c=b+1;c<eligible.length-1;c++)for(let d=c+1;d<eligible.length;d++){
  const countries=[eligible[a],eligible[b],eligible[c],eligible[d]];
  for(let variant=0;variant<variants;variant++){
   const seed=(combo+1)*7919+(variant+1)*104729;
   const answers=positions.map(position=>countries.map(country=>seededShuffle(buckets.get(position+":"+norm(country))?.members||[],seed+position.length+country.length).slice(0,4)));
   if(answers.some(row=>row.some(cell=>cell.length!==4)))continue;
   const signature=positions.join(",")+"|"+countries.map(norm).join("|")+"|"+answers.flat(2).join(",");
   if(seen.has(signature))continue;seen.add(signature);
   packs.push({id:id("football-grid",signature),positions,countries,answers,source:SOURCES.players.repo,licence:"CC0-1.0"});
   if(packs.length>=500)break outer;
  }
  combo++;
 }
 return packs;
}

const clubKey=value=>norm(value).replace(/\b(?:association football club|football club|a f c|afc|f c|fc)\b/g," ").replace(/\s+/g," ").trim();
function makeClubNationGridPacks(careerPlayers,englishClubNames,target=500,preferredClubNames=new Set()){
 const buckets=new Map(),clubNationCounts=new Map();
 for(const player of careerPlayers){
  const nations=[...new Map([...(player.nationalities??[]),player.nationality??""].filter(Boolean).map(value=>[norm(value),value])).values()];
  if(!nations.length)continue;
  for(const spell of player.spells){
   const keyClub=clubKey(spell.club);if(!englishClubNames.has(keyClub))continue;
   const club=clubNationCounts.get(keyClub)||{name:spell.club,nations:new Set()};
   for(const nation of nations){
    const key=keyClub+":"+norm(nation),list=buckets.get(key)||[];
    if(!list.some(item=>item.id===player.id))list.push({id:player.id,name:player.name});
    buckets.set(key,list);club.nations.add(norm(nation));
   }
   clubNationCounts.set(keyClub,club);
  }
 }
 const eligible=[...clubNationCounts.values()].filter(club=>club.nations.size>=4).sort((a,b)=>Number(preferredClubNames.has(clubKey(b.name)))-Number(preferredClubNames.has(clubKey(a.name)))||b.nations.size-a.nations.size).slice(0,80);
 let qualifyingClubCombos=0,maxCommonNations=0;
 for(let a=0;a<eligible.length-3;a++)for(let b=a+1;b<eligible.length-2;b++)for(let d=b+1;d<eligible.length-1;d++)for(let e=d+1;e<eligible.length;e++){
  const clubs=[eligible[a],eligible[b],eligible[d],eligible[e]];
  const common=[...new Set(clubs.flatMap(club=>[...club.nations]))].filter(nation=>clubs.every(club=>(buckets.get(clubKey(club.name)+":"+nation)||[]).length>=1));
  maxCommonNations=Math.max(maxCommonNations,common.length);if(common.length>=4)qualifyingClubCombos++;
 }
 console.log("Football Grid eligibility:",JSON.stringify({careerPlayers:careerPlayers.length,englishClubsWithFourNations:eligible.length,englishPlayersWithNationality:careerPlayers.filter(player=>player.nationality).length,clubNationBuckets:buckets.size,qualifyingClubCombos,maxCommonNations,topClubs:eligible.slice(0,8).map(club=>({name:club.name,nations:club.nations.size}))}));
 if(eligible.length<4)return[];
 const packs=[],seen=new Set();
 for(let seed=1;seed<30000&&packs.length<target;seed++){
  const clubs=seededShuffle(eligible,seed*7919).slice(0,4);
  if(new Set(clubs.map(club=>clubKey(club.name))).size!==4)continue;
  const commonNations=[...new Set(clubs.flatMap(club=>[...club.nations]))]
   .filter(nation=>clubs.every(club=>(buckets.get(clubKey(club.name)+":"+nation)||[]).length>=2));
  if(commonNations.length<4)continue;
  const nations=seededShuffle(commonNations,seed*104729).slice(0,4);
  const answers=[];let valid=true;
  for(const club of clubs){
   const row=[];
   for(const nation of nations){
    const candidates=seededShuffle(buckets.get(clubKey(club.name)+":"+nation)||[],seed+club.name.length*nation.length+row.length*31)
      .slice(0,Math.min(12,buckets.get(clubKey(club.name)+":"+nation).length)).map(player=>player.id);
    if(candidates.length<2||new Set(candidates).size!==candidates.length){valid=false;break;}
    row.push(candidates);
   }
   if(!valid)break;answers.push(row);
  }
  if(!valid)continue;
  const signature=clubs.map(club=>clubKey(club.name)).join("|")+"|"+nations.join("|")+"|"+answers.flat(2).join(",");
  if(seen.has(signature))continue;seen.add(signature);
  packs.push({id:id("premier-league-nation-grid",signature),clubs:clubs.map(club=>club.name),countries:nations,answers,source:SOURCES.wikidata.url,licence:"CC0-1.0"});
 }
 return packs;
}

function makeEnglishLeagueStrandsPacks(careerPlayers,englishClubNames,target=500){
 const surnames=[...new Set(careerPlayers.filter(player=>player.spells.some(spell=>englishClubNames.has(clubKey(spell.club))))
  .map(player=>(player.name.trim().split(/\s+/).at(-1)||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z]/g,""))
  .filter(word=>word.length>=3&&word.length<=9))].sort();
 const spangram="ENGLISHLEAGUE",targetLetters=48-spangram.length,packs=[],seen=new Set();
 for(let seed=1;seed<20000&&packs.length<target;seed++){
  const candidates=seededShuffle(surnames,seed*104729+17).slice(0,Math.min(220,surnames.length));
  const dp=Array.from({length:9},()=>new Map());dp[0].set(0,[]);
  for(const word of candidates){for(let count=8;count>=1;count--){for(const [sum,chosen] of dp[count-1]){const next=sum+word.length;if(next>targetLetters||dp[count].has(next))continue;dp[count].set(next,[...chosen,word]);}}}
  let words=null;for(let count=6;count<=8;count++){const found=dp[count].get(targetLetters);if(found&&new Set(found).size===count){words=found;break;}}
  if(!words)continue;
  const signature=spangram+"|"+words.slice().sort().join(",");
  if(seen.has(signature))continue;seen.add(signature);
  packs.push({id:id("strands-english-leagues",signature),spangram,words,theme:"A MATCHDAY ROLL CALL",source:SOURCES.wikidata.repo,licence:"CC0-1.0"});
 }
 return packs;
}

function makeStrandsPacks(players){
 const byNation=new Map();
 for(const p of players){const nation=p.nationalities?.[0];if(!nation)continue;const key=norm(nation),entry=byNation.get(key)||{label:nation,words:new Set()};const surname=(p.name.trim().split(/\s+/).at(-1)||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z]/g,"");if(surname.length>=3&&surname.length<=8)entry.words.add(surname);byNation.set(key,entry)}
 const groups=[...byNation.values()].map(g=>({...g,words:[...g.words]})).filter(g=>g.words.length>=6).map(g=>{const base=g.label.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z]/g,"");const spangram=[base+"FOOTBALL",base+"PLAYERS"].find(word=>word.length===13||word.length===14);return spangram?{...g,spangram,target:48-spangram.length}:null}).filter(Boolean);
 const packs=[],seen=new Set();
 for(let seed=1;seed<12000&&packs.length<500;seed++){const ordered=seededShuffle(groups,seed*101+7);for(const group of ordered){const candidates=seededShuffle(group.words,seed*31+group.label.length*19);const dp=Array.from({length:9},()=>new Map());dp[0].set(0,[]);for(const word of candidates){for(let count=8;count>=1;count--){for(const [sum,chosen] of dp[count-1]){const next=sum+word.length;if(next>group.target||dp[count].has(next))continue;dp[count].set(next,[...chosen,word])}}}let words=null;for(let count=6;count<=8;count++){const found=dp[count].get(group.target);if(found&&new Set(found).size===count){words=found;break}}if(!words)continue;const signature=group.spangram+"|"+words.slice().sort().join(",");if(seen.has(signature))continue;seen.add(signature);packs.push({id:id("strands",signature),spangram:group.spangram,words,theme:"PLAYERS WHO REPRESENTED "+group.label,source:SOURCES.players.repo,licence:"CC0-1.0"});break}}
 return packs;
}

const players=await parsePlayers(),clubs=await parseClubs();
const wikidataCareerImport=await fetchWikidataCareers(players);
const careerPlayers=wikidataCareerImport.players;
const hasMultiSeasonCareer=p=>p.spells.length>=2&&new Set(p.spells.map(spell=>spell.clubQid)).size>=2&&p.firstYear!==null&&p.lastYear!==null&&p.lastYear-p.firstYear>=1;
const careerFileCandidates=careerPlayers.filter(hasMultiSeasonCareer);
const cultHeroCandidates=careerPlayers.filter(hasMultiSeasonCareer);
const [internationalMatches,englishMatches,europeanClubMatches]=await Promise.all([parseInternationalResults(),parseEnglishMatches(),parseEuropeanClubMatches()]);
// The English match archive is the authoritative whitelist for English clubs; do not trust broad Wikidata country labels for game eligibility.
const englishClubNames=new Set([...clubs.filter(club=>club.countries.some(country=>norm(country)==="england")).map(club=>club.name),...englishMatches.flatMap(match=>[match.home,match.away])].map(clubKey));
const linkUpPacks=makeWikidataLinkPacks(careerPlayers,englishClubNames,750);
const allMatches=[...internationalMatches,...englishMatches,...europeanClubMatches].sort((a,b)=>a.date.localeCompare(b.date));
const internationalQuiz=buildInternationalQuiz([...englishMatches,...europeanClubMatches.filter(match=>match.competition==="UEFA Champions League")]);
const internationalGoals=await parseInternationalGoals(players);
const internationalGoalPacks=makeInternationalGoalPacks(internationalGoals.scorers);
const lineupData=JSON.parse(await readFile(resolve(ROOT,"public/data/worldcup-lineups.json"),"utf8"));
const legacyLineups=(lineupData.matches||[]).filter(m=>m?.id&&m.team&&m.opponent&&Number.isInteger(m.year)&&Array.isArray(m.starters)&&m.starters.length===11&&new Set(m.starters.map(norm)).size===11).map(match=>({...match,matchId:id("world-cup-match",match.date+"|"+[norm(match.team),norm(match.opponent)].sort().join("|")),sourceKey:"worldCup",sourceFile:match.year+"/worldcup-full.json"}));
const currentWorldCup=JSON.parse(await readFile(resolve(WORLD_CUP,"2026/worldcup-full.json"),"utf8"));
const currentLineups=(currentWorldCup.matches||[]).flatMap(match=>{
 const teams=[{team:match.team1,opponent:match.team2,lineup:match.lineup?.[0]},{team:match.team2,opponent:match.team1,lineup:match.lineup?.[1]}];
 return teams.map(entry=>{
  const starters=(entry.lineup?.starter||[]).map(player=>player.name).filter(Boolean);
  if(!entry.team||!entry.opponent||starters.length!==11||new Set(starters.map(norm)).size!==11)return null;
  const key=["2026",match.date,norm(entry.team),norm(entry.opponent)].join("|");
  return{id:id("world-cup-lineup",key),matchId:id("world-cup-match",match.date+"|"+[norm(match.team1),norm(match.team2)].sort().join("|")),year:2026,date:match.date,team:entry.team,opponent:entry.opponent,starters,tournament:"FIFA World Cup",round:match.round||"World Cup 2026",sourceKey:"worldCup",sourceFile:"2026/worldcup-full.json",sourceRow:key};
 }).filter(Boolean);
});
const lineups=[...legacyLineups,...currentLineups];

const playerIndex=new Map(players.map(player=>[norm(player.name),player]));
const playerById=new Map(players.map(player=>[player.id,player]));
for(const scorer of internationalGoals.scorers){const player=playerById.get(scorer.id);if(player){player.internationalGoalsRecorded=scorer.goals;player.internationalTeams=scorer.teams}}
const getOrCreatePlayer=(name,teams=[],source=SOURCES.players)=>{const key=norm(name);let player=playerIndex.get(key);if(!player){player={id:id("player",key),name,aliases:[],nationalities:[],birthYears:[],positions:[],source:source.repo,sourceCommit:source.commit||"",licence:"CC0-1.0"};players.push(player);playerIndex.set(key,player)}for(const team of teams)if(team&&!player.nationalities.some(n=>norm(n)===norm(team)))player.nationalities.push(team);return player};
const worldCupStatMap=new Map();
for(const match of lineups)for(const name of match.starters){const key=norm(name),stat=worldCupStatMap.get(key)||{name,starts:0,years:new Set(),teams:new Set()};stat.starts++;stat.years.add(match.year);stat.teams.add(match.team);worldCupStatMap.set(key,stat)}
for(const stat of worldCupStatMap.values()){const player=getOrCreatePlayer(stat.name,[...stat.teams],SOURCES.worldCup);player.worldCupStarts=stat.starts;player.worldCupYears=[...stat.years].sort((a,b)=>a-b);player.worldCupTeams=[...stat.teams]}
const goalPlayers=internationalGoals.scorers.filter(p=>p.goals>=2);
const statPlayers=players.filter(p=>(p.internationalGoalsRecorded??0)>0||(p.worldCupStarts??0)>0);
const positionPlayers=statPlayers.filter(p=>(p.positions||[]).some(pos=>["G","GK","D","DF","M","MF","F","FW"].includes(pos))&&p.nationalities?.length);

const nations=[...new Set(lineups.flatMap(m=>[m.team,m.opponent]))].sort();
const uniqueWorldCupMatches=[...new Map(lineups.map(match=>[match.matchId,match])).values()];
const quiz=uniqueWorldCupMatches.map(m=>{const answer=m.opponent,distractors=nations.filter(n=>norm(n)!==norm(answer)).sort((a,b)=>createHash("sha256").update(m.id+a).digest("hex").localeCompare(createHash("sha256").update(m.id+b).digest("hex"))).slice(0,3);if(distractors.length!==3)return null;const choices=[answer,...distractors].sort((a,b)=>createHash("sha256").update(m.id+a).digest("hex").localeCompare(createHash("sha256").update(m.id+b).digest("hex")));return{id:id("wc-question",m.matchId),factId:id("wc-match",m.matchId),question:"Which team did "+m.team+" face in the "+m.year+" FIFA World Cup match on "+m.date+"?",answer,choices,explanation:m.team+" faced "+answer+" in the "+m.year+" FIFA World Cup.",competition:"FIFA World Cup",year:m.year,eventDate:m.date,source:SOURCES.worldCup.url+"/blob/"+SOURCES.worldCup.commit+"/"+(m.sourceFile??(m.year+"/worldcup-full.json")),sourceKey:"worldCup",sourceRow:m.sourceRow??m.id}});
const validQuiz=quiz.filter(Boolean);
const worldCupQuizPool=seededShuffle(validQuiz,20261127).slice(0,200).map(question=>{
 const extra=nations.filter(nation=>!question.choices.some(choice=>norm(choice)===norm(nation)))
  .sort((a,b)=>createHash("sha256").update(question.id+a).digest("hex").localeCompare(createHash("sha256").update(question.id+b).digest("hex")))[0];
 if(!extra)return null;
 const options=[...question.choices,extra].sort((a,b)=>createHash("sha256").update(question.id+a).digest("hex").localeCompare(createHash("sha256").update(question.id+b).digest("hex")));
 const tier=question.year>=2010?"EASY":question.year>=2000?"MEDIUM":question.year>=1980?"HARD":"EXTREME";
 return{id:question.id+"-quiz",factId:question.factId,playerId:question.factId,tier,region:"INTERNATIONAL",category:"FIFA World Cup",question:question.question,answer:question.answer,options,explanation:question.explanation,source:question.source,matchId:question.factId,eventDate:question.eventDate};
}).filter(Boolean);
worldCupQuizPool.forEach((question,index)=>(index%2?internationalQuiz.timed:internationalQuiz.climb).push(question));
const footle=players.filter(p=>p.name.length>=4&&p.name.length<=22&&/^[\p{L}][\p{L}'’ .-]+$/u.test(p.name));
const englishFootleAnswers=[...new Set(careerPlayers.filter(player=>player.spells.some(spell=>englishClubNames.has(clubKey(spell.club))))
 .flatMap(player=>[player.name,...(player.aliases||[])])
 .map(value=>(value.trim().split(/\s+/).at(-1)||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z]/g,""))
 .filter(word=>word.length===5))].sort();
const globalFootleAnswers=[...new Set(footle.flatMap(player=>[player.name,...(player.aliases||[])])
 .map(value=>(value.trim().split(/\s+/).at(-1)||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z]/g,""))
 .filter(word=>word.length===5))].sort();
const uniqueFootleAnswers=englishFootleAnswers.length>=500?englishFootleAnswers:[...englishFootleAnswers,...globalFootleAnswers.filter(word=>!englishFootleAnswers.includes(word))];
const cards=new Map();for(const m of lineups)for(const name of m.starters){const k=norm(name),r=cards.get(k)||{id:id("wc-player",k),name,worldCups:[],teams:[],matchIds:[]};if(!r.worldCups.includes(m.year))r.worldCups.push(m.year);if(!r.teams.includes(m.team))r.teams.push(m.team);if(!r.matchIds.includes(m.id))r.matchIds.push(m.id);cards.set(k,r)}
const clubConnections=makeConnections(clubs);
const playerConnections=makePlayerConnections(players);
const premierLeagueClubNames=new Set(englishMatches.filter(match=>match.competition==="Premier League").flatMap(match=>[match.home,match.away]).map(clubKey));
const gridPacks=[];
const premierLeagueClubs=[...new Set(englishMatches.filter(match=>match.competition==="Premier League").flatMap(match=>[match.home,match.away]))].sort();
const englishLeagueClubs=[...new Set(englishMatches.filter(match=>/^(?:Premier League|Championship|League One|League Two|First Division|Second Division|Third Division|Fourth Division)$/i.test(match.competition)).flatMap(match=>[match.home,match.away]))].sort();
const englishLeagueStrands=makeEnglishLeagueStrandsPacks(careerPlayers,englishClubNames,500);
const strands=[...englishLeagueStrands,...makeStrandsPacks(players).slice(0,Math.max(0,Math.ceil(englishLeagueStrands.length/4)))];
const report={generatedAt:TODAY,policy:"CC0-only source whitelist for the quiz and match shards; the runtime player archive is CC BY-SA 4.0 and the Wikidata career snapshot is live-query data with retrieved timestamp",wikidataCareerImport:wikidataCareerImport.meta,counts:{players:players.length,clubs:clubs.length,wikidataCareerRows:wikidataCareerImport.meta.rawRows,wikidataCareerPlayers:careerPlayers.length,careerFileCandidates:careerFileCandidates.length,cultHeroCandidates:cultHeroCandidates.length,linkUpPacks:linkUpPacks.length,footlePlayerRecords:footle.length,footleAnswers:uniqueFootleAnswers.length,worldCupLineups:lineups.length,worldCupPlayerCards:cards.size,worldCupQuestions:validQuiz.length,internationalMatches:internationalMatches.length,englishMatches:englishMatches.length,europeanClubMatches:europeanClubMatches.length,totalMatchFacts:allMatches.length,englishDomesticMatchFacts:allMatches.filter(match=>match.region==="ENGLISH_DOMESTIC").length,internationalMatchFacts:allMatches.filter(match=>match.region!=="ENGLISH_DOMESTIC").length,internationalGoalEvents:internationalGoals.meta.uniqueGoalEvents,eligibleScoringEvents:internationalGoals.meta.acceptedGoalEvents,ownGoalsExcluded:internationalGoals.meta.ownGoalsExcluded,duplicateGoalRows:internationalGoals.meta.duplicateGoalRows,internationalGoalScorers:internationalGoals.meta.uniqueScorers,internationalScorersForGames:internationalGoals.meta.eligibleScorers,lowballPacks:internationalGoalPacks.lowball.length,ladderPacks:internationalGoalPacks.ladder.length,football501Packs:internationalGoalPacks.football501.length,climbQuestions:internationalQuiz.climb.length,timedQuizQuestions:internationalQuiz.timed.length,connectionsPacks:playerConnections.length,gridPacks:gridPacks.length,strandsPacks:strands.length,englishLeagueStrands:englishLeagueStrands.length,clubCountryPacks:clubConnections.length},games:{footle:{unit:"unique five-letter surname",count:uniqueFootleAnswers.length,ready:uniqueFootleAnswers.length>=500,integrated:true},"the-climb":{unit:"question",count:internationalQuiz.climb.length,ready:internationalQuiz.climb.length>=500,integrated:true},"timed-quiz":{unit:"question",count:internationalQuiz.timed.length,ready:internationalQuiz.timed.length>=500,integrated:true},connections:{unit:"puzzle-pack",count:playerConnections.length,ready:playerConnections.length>=500,integrated:true},"missing-xi":{unit:"puzzle-pack",count:lineups.length,ready:lineups.length>=500,integrated:true},"tournament-nation":{unit:"puzzle-pack",count:lineups.length,ready:lineups.length>=500,integrated:true},"the-reveal":{unit:"player-card",count:cards.size,ready:cards.size>=500,integrated:true},"link-up":{unit:"puzzle-pack",count:linkUpPacks.length,ready:linkUpPacks.length>=500,integrated:linkUpPacks.length>=500,reason:linkUpPacks.length>=500?undefined:"Wikidata career overlap pool currently below 500 packs"}, "career-file":{unit:"player-card",count:careerFileCandidates.length,ready:careerFileCandidates.length>=500,integrated:careerFileCandidates.length>=500,reason:careerFileCandidates.length>=500?undefined:"Wikidata career pool currently below 500 eligible players"}, "cult-hero":{unit:"player-card",count:cultHeroCandidates.length,ready:cultHeroCandidates.length>=500,integrated:cultHeroCandidates.length>=500,reason:cultHeroCandidates.length>=500?undefined:"Wikidata career pool currently below 500 eligible players"},strands:{unit:"puzzle-pack",count:strands.length,ready:strands.length>=500,integrated:true},"football-grid":{unit:"runtime archive-generated puzzle",count:careerPlayers.length,ready:true,integrated:true,format:"past and present Premier League club × national flag; unique players enforced at runtime"},lowball:{unit:"challenge-pack",count:internationalGoalPacks.lowball.length,ready:internationalGoalPacks.lowball.length>=500,integrated:true,metric:"recorded senior international goals"},ladder:{unit:"challenge-pack",count:internationalGoalPacks.ladder.length,ready:internationalGoalPacks.ladder.length>=500,integrated:true,metric:"recorded senior international goals"},"football-501":{unit:"challenge-pack",count:internationalGoalPacks.football501.length,ready:internationalGoalPacks.football501.length>=500,integrated:true,metric:"recorded senior international goals"},"draft-xi":{unit:"candidate-player",count:positionPlayers.length,ready:positionPlayers.length>=500,integrated:true,metric:"position, international goals and World Cup starts; draft credits are game values"},"scout-signal":{unit:"player-card",count:positionPlayers.length,ready:positionPlayers.length>=500,integrated:true,metric:"position, nation, age band, international goals and World Cup starts"}}};
for(const [k,n] of [["players",players.length],["Footle answers",uniqueFootleAnswers.length],["World Cup lineups",lineups.length],["World Cup player cards",cards.size],["World Cup questions",validQuiz.length],["The Climb questions",internationalQuiz.climb.length],["Timed Quiz questions",internationalQuiz.timed.length],["International goal scorers",goalPlayers.length],["Positioned stat players",positionPlayers.length],["Connections packs",playerConnections.length],["Strands packs",strands.length],["Lowball packs",internationalGoalPacks.lowball.length],["Ladder packs",internationalGoalPacks.ladder.length],["Football 501 packs",internationalGoalPacks.football501.length],["English domestic matches",englishMatches.length],["UEFA club matches",europeanClubMatches.length],["Career File candidates",careerFileCandidates.length],["Cult Hero candidates",cultHeroCandidates.length],["Link Up packs",linkUpPacks.length]])if(n<500)throw new Error(k+" below 500: "+n);
const quizFactIds=[...internationalQuiz.climb,...internationalQuiz.timed].map(q=>q.factId);if(new Set(quizFactIds).size!==quizFactIds.length)throw new Error("The Climb and Timed Quiz share duplicate match facts.");
const uniqueValues=values=>new Set(values).size===values.length;
if(!uniqueValues(players.map(player=>player.id)))throw new Error("Duplicate canonical player IDs found.");
if(!uniqueValues(clubs.map(club=>club.id)))throw new Error("Duplicate canonical club IDs found.");
if(!uniqueValues(uniqueFootleAnswers))throw new Error("Footle answer pool contains duplicates.");
for(const question of validQuiz){if(!question.id||!question.factId||!Array.isArray(question.choices)||question.choices.length!==4||!uniqueValues(question.choices)||question.choices.filter(option=>option===question.answer).length!==1)throw new Error("World Cup match question failed validation: "+question.id);}
if(!uniqueValues(internationalMatches.map(match=>match.id)))throw new Error("Duplicate international match IDs found.");
if(!uniqueValues(internationalGoals.events.map(event=>event.id)))throw new Error("Duplicate international goal event IDs found.");
if(!uniqueValues(lineups.map(match=>match.id)))throw new Error("Duplicate World Cup line-up IDs found.");
if(!uniqueValues(linkUpPacks.map(pack=>pack.id)))throw new Error("Duplicate Link Up pack IDs found.");
for(const question of [...internationalQuiz.climb,...internationalQuiz.timed]){
 if(!question.id||!question.factId||!question.source||!question.eventDate||!Array.isArray(question.options)||question.options.length!==5||!uniqueValues(question.options)||question.options.filter(option=>option===question.answer).length!==1)throw new Error("Quiz question failed answer-choice/provenance validation: "+question.id);
}
for(const pack of playerConnections){
 const groups=pack.groups||[],members=groups.flatMap(group=>group.memberIds||[]);
 if(groups.length!==4||groups.some(group=>group.memberIds?.length!==4)||members.length!==16||!uniqueValues(members))throw new Error("Connections pack is not four distinct groups of four: "+pack.id);
}
for(const pack of gridPacks){
 if(pack.clubs.length!==4||pack.countries.length!==4||pack.answers.length!==4||pack.answers.some(row=>row.length!==4||row.some(cell=>cell.length<2||!uniqueValues(cell))))throw new Error("Football Grid pack has an incomplete cell or too few verified players: "+pack.id);
}
for(const pack of strands){
 const words=[pack.spangram,...pack.words];
 if(pack.words.length<6||pack.words.length>8||!uniqueValues(words)||words.reduce((total,word)=>total+word.length,0)!==48)throw new Error("Strands pack does not fill a unique 6×8 board: "+pack.id);
}
for(const pack of internationalGoalPacks.lowball)if(pack.players.length!==2||!uniqueValues(pack.players.map(player=>player.id))||pack.players[0].value===pack.players[1].value)throw new Error("Lowball pair failed validation: "+pack.id);
for(const pack of internationalGoalPacks.ladder)if(pack.players.length!==5||!uniqueValues(pack.players.map(player=>player.id))||!uniqueValues(pack.players.map(player=>player.value)))throw new Error("Ladder pack failed validation: "+pack.id);
for(const pack of internationalGoalPacks.football501)if(pack.players.length!==12||!uniqueValues(pack.players.map(player=>player.id)))throw new Error("Football 501 pack failed validation: "+pack.id);
for(const player of careerPlayers)if(player.spells.length<2||new Set(player.spells.map(spell=>spell.clubQid)).size<2)throw new Error("Career player is missing two dated club records: "+player.id);
for(const pack of linkUpPacks){
 const options=pack.optionPlayerIds||[];
 if(options.length!==6||!uniqueValues(options)||!options.includes(pack.answerPlayerId)||options.includes(pack.startPlayerId)||options.includes(pack.endPlayerId)||pack.answerPlayerId===pack.startPlayerId||pack.answerPlayerId===pack.endPlayerId||pack.startPlayerId===pack.endPlayerId)throw new Error("Link Up pack failed unique bridge/options validation: "+pack.id);
}
const common={schemaVersion:1,generatedAt:TODAY,sourceRegistry:SOURCES,licencePolicy:"The CC0 data shards include no third-party crests, player portraits or logos. The separate runtime player archive and UI badge assets retain their own licences.",accuracyWarning:"CC0 does not guarantee factual accuracy. International goal values are goals recorded in the source, not complete career totals. World Cup starts are not full caps."};
const connectionIds=new Set(playerConnections.flatMap(pack=>pack.groups.flatMap(group=>group.memberIds)));

const connectionPlayers=players.filter(player=>connectionIds.has(player.id));

const positionPlayerRows=positionPlayers.map(p=>({id:p.id,name:p.name,aliases:p.aliases||[],positions:p.positions,nationalities:p.nationalities,birthYears:p.birthYears,worldCupYears:p.worldCupYears||[],internationalGoalsRecorded:p.internationalGoalsRecorded??0,worldCupStarts:p.worldCupStarts??0,source:p.source}));
const quizTiers=["EASY","MEDIUM","HARD","EXTREME"];
const makeQuizTierShards=(game,questions)=>quizTiers.flatMap(tier=>{
 const items=questions.filter(question=>question.tier===tier);
 if(tier==="EASY"){
  const midpoint=Math.ceil(items.length/2);
  return [
   [game+"-easy-1",{...common,questions:items.slice(0,midpoint)}],
   [game+"-easy-2",{...common,questions:items.slice(midpoint)}]
  ];
 }
 return [[game+"-"+tier.toLowerCase(),{...common,questions:items}]];
});
const quizShards=Object.fromEntries([
 ...makeQuizTierShards("the-climb",internationalQuiz.climb),
 ...makeQuizTierShards("timed-quiz",internationalQuiz.timed)
]);
for(const [game,questions] of [["the-climb",internationalQuiz.climb],["timed-quiz",internationalQuiz.timed]])for(const tier of quizTiers){const count=questions.filter(question=>question.tier===tier).length;if(count<500)throw new Error(game+" "+tier+" shard below 500 questions: "+count);}
const shards={
 core:{...common,players,clubs},
 matches:{...common,matches:internationalMatches},
 "english-matches":{...common,matches:englishMatches},
 "european-club-matches":{...common,matches:europeanClubMatches},
 "goal-events":{...common,events:internationalGoals.events,scorers:internationalGoals.scorers},
 "world-cup":{...common,lineups},
 footle:{...common,answers:uniqueFootleAnswers,answerRecords:uniqueFootleAnswers.map(answer=>({id:id("footle-answer",answer),answer,source:SOURCES.players.repo,sourceCommit:SOURCES.players.commit,licence:"CC0-1.0"}))},
 connections:{...common,players:connectionPlayers,packs:playerConnections},
 strands:{...common,packs:strands},
 "football-grid-clubs":{...common,premierLeagueClubs,englishLeagueClubs},
 ...quizShards,
 "the-reveal":{...common,playerCards:[...cards.values()]},
 "goal-packs":{...common,lowballPairs:internationalGoalPacks.lowball,ladderPacks:internationalGoalPacks.ladder,football501Packs:internationalGoalPacks.football501},
 "player-stats":{...common,players:positionPlayerRows},
 "career-history":{...common,meta:wikidataCareerImport.meta,players:careerPlayers,linkUpPacks}
};
await mkdir(OUT,{recursive:true});
await Promise.all(["football-knowledge.cc0.json","football-knowledge-the-climb.cc0.json","football-knowledge-timed-quiz.cc0.json","football-knowledge-the-climb-easy.cc0.json","football-knowledge-timed-quiz-easy.cc0.json"].map(file=>rm(resolve(OUT,file),{force:true})));
const shardManifest={};
for(const [key,data] of Object.entries(shards)){
 const file="football-knowledge-"+key+".cc0.json";
 const content=JSON.stringify(data);
 const bytes=Buffer.byteLength(content);
 if(bytes>24*1024*1024)throw new Error("Shard "+key+" exceeds the safe Cloudflare Pages asset size: "+bytes+" bytes.");
 await writeFile(resolve(OUT,file),content);
 const recordCounts=Object.fromEntries(Object.entries(data).filter(([,value])=>Array.isArray(value)).map(([name,value])=>[name,value.length]));
 shardManifest[key]={file:"/data/"+file,bytes,sha256:createHash("sha256").update(content).digest("hex"),recordCounts};
}
const manifest={schemaVersion:1,buildPipelineVersion:2,generatedAt:TODAY,idPolicy:"Stable SHA-256-derived IDs from canonicalised names or source-scoped fact keys; source IDs retained where supplied.",licencePolicy:"CC0-1.0 data only in these generated shards; the runtime player archive and UI badge assets retain separate licences.",accuracyWarning:"CC0 does not guarantee completeness or factual accuracy. Career records are dated membership statements, not appearances; international goals are recorded source events, not guaranteed career totals.",sourceRegistry:SOURCES,shards:shardManifest};
await writeFile(resolve(OUT,"football-knowledge-manifest.cc0.json"),JSON.stringify(manifest,null,2)+"\n");
await writeFile(resolve(OUT,"football-knowledge-report.json"),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({report,manifest:{shards:Object.keys(shardManifest).length,bytes:Object.values(shardManifest).reduce((sum,shard)=>sum+shard.bytes,0)}},null,2));
