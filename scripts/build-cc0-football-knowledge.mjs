import { createHash } from "node:crypto";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, relative } from "node:path";
const ROOT=process.cwd(), P=resolve(ROOT,".sources/openfootball-players"), C=resolve(ROOT,".sources/openfootball-clubs"), IR=resolve(ROOT,".sources/international-results");
const TODAY=new Date().toISOString().slice(0,10), OUT=resolve(ROOT,"public/data");
const SOURCES={players:{repo:"openfootball/players",commit:"125d20f7cc06cac7e758b40df535a7695632680a",licence:"CC0-1.0",url:"https://github.com/openfootball/players"},clubs:{repo:"openfootball/clubs",commit:"ae3800227c449447b3a337fc0aac79a8f02f4c8b",licence:"CC0-1.0",url:"https://github.com/openfootball/clubs"},worldCup:{repo:"openfootball/worldcup.json",licence:"CC0-1.0",url:"https://github.com/openfootball/worldcup.json",file:"public/data/worldcup-lineups.json"},internationalResults:{repo:"martj42/international_results",commit:"ca84241bb3eed854a1956a2fab442fe4daad40dd",licence:"CC0-1.0",url:"https://github.com/martj42/international_results"}};
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
 for(const row of rows){const date=row.date,home=row.home_team,away=row.away_team,homeScore=Number(row.home_score),awayScore=Number(row.away_score),tournament=row.tournament;if(!date||!home||!away||row.home_score===""||row.away_score===""||!Number.isInteger(homeScore)||!Number.isInteger(awayScore)||!tournament)continue;const key=[date,norm(home),norm(away),norm(tournament)].join("|");if(map.has(key))continue;map.set(key,{id:id("international-match",key),date,year:Number(date.slice(0,4)),home,away,homeScore,awayScore,tournament,city:row.city,country:row.country,neutral:String(row.neutral).toLowerCase()==="true",source:SOURCES.internationalResults})}
 return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));
}

async function parseInternationalGoals(players){
 const rows=parseCsv(await readFile(resolve(IR,"goalscorers.csv"),"utf8"));
 const aliases=new Map();
 for(const player of players)for(const name of [player.name,...(player.aliases||[])])aliases.set(norm(name),player);
 const aggregates=new Map(),events=new Set();let accepted=0,duplicates=0,ownGoals=0;
 for(const row of rows){
  const date=String(row.date||"").trim(),team=String(row.team||"").trim(),scorer=String(row.scorer||"").trim();
  const home=String(row.home_team||"").trim(),away=String(row.away_team||"").trim(),minute=String(row.minute||"").trim();
  if(!date||!team||!scorer||!/^\d{4}-\d{2}-\d{2}$/.test(date))continue;
  if(["true","1","yes"].includes(String(row.own_goal||"").trim().toLowerCase())){ownGoals++;continue;}
  const eventKey=[date,norm(home),norm(away),norm(team),norm(scorer),minute,String(row.penalty||"")].join("|");
  if(events.has(eventKey)){duplicates++;continue;}events.add(eventKey);accepted++;
  let player=aliases.get(norm(scorer));
  if(!player){
   player={id:id("player",scorer),name:scorer,aliases:[],nationalities:[],birthYears:[],positions:[],source:SOURCES.internationalResults.repo,sourceCommit:SOURCES.internationalResults.commit,licence:"CC0-1.0"};
   players.push(player);aliases.set(norm(scorer),player);
  }
  const entry=aggregates.get(player.id)||{id:player.id,name:player.name,goals:0,penaltyGoals:0,nonPenaltyGoals:0,teams:[],years:[],matches:[],source:SOURCES.internationalResults.repo,sourceCommit:SOURCES.internationalResults.commit,licence:"CC0-1.0",scope:"Recorded goals in men's senior full internationals, 1872–2024; source coverage is not guaranteed complete."};
  entry.goals++;
  if(["true","1","yes"].includes(String(row.penalty||"").trim().toLowerCase()))entry.penaltyGoals++;else entry.nonPenaltyGoals++;
  const year=Number(date.slice(0,4));if(!entry.years.includes(year))entry.years.push(year);
  if(!entry.teams.some(x=>norm(x)===norm(team)))entry.teams.push(team);
  const match=[date,home,away].join(" · ");if(!entry.matches.includes(match))entry.matches.push(match);
  aggregates.set(player.id,entry);
 }
 const scorers=[...aggregates.values()].sort((a,b)=>b.goals-a.goals||a.name.localeCompare(b.name));
 return {scorers,meta:{acceptedGoalEvents:accepted,duplicateGoalRows:duplicates,ownGoalsExcluded:ownGoals,uniqueScorers:scorers.length,eligibleScorers:scorers.filter(x=>x.goals>=2).length}};
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
 const ukTeams=new Set(["england","scotland","wales","northern ireland"]);
 const questions=matches.map(match=>{
  const answer=match.homeScore+"-"+match.awayScore;
  const distractors=scorelines.filter(score=>score!==answer).sort((a,b)=>createHash("sha256").update(match.id+a).digest("hex").localeCompare(createHash("sha256").update(match.id+b).digest("hex"))).slice(0,4);
  if(distractors.length!==4)return null;
  const options=[answer,...distractors].sort((a,b)=>createHash("sha256").update(match.id+a).digest("hex").localeCompare(createHash("sha256").update(match.id+b).digest("hex")));
  const tier=match.year>=2000?"EASY":match.year>=1980?"MEDIUM":match.year>=1950?"HARD":"EXTREME";
  const region=ukTeams.has(norm(match.home))||ukTeams.has(norm(match.away))?"UK":"INTERNATIONAL";
  return{id:id("international-question",match.id),factId:match.id,playerId:match.id,tier,region,category:match.tournament,question:"What was the full-time score when "+match.home+" played "+match.away+" on "+match.date+" in "+match.tournament+"?",answer,options,explanation:match.home+" "+answer.replace("-", "–")+" "+match.away+". Penalty shoot-outs are not included.",source:"https://github.com/martj42/international_results/blob/"+SOURCES.internationalResults.commit+"/results.csv",matchId:match.id,eventDate:match.date};
 }).filter(Boolean);
 const uk=questions.filter(q=>q.region==="UK").sort((a,b)=>a.id.localeCompare(b.id));
 const international=questions.filter(q=>q.region==="INTERNATIONAL").sort((a,b)=>a.id.localeCompare(b.id));
 const split=(items)=>{const a=[],b=[];items.forEach((item,index)=>(index%2?a:b).push(item));return[a,b]};
 const [ukA,ukB]=split(uk),[intA,intB]=split(international);
 return {all:questions,climb:[...ukA,...intA],timed:[...ukB,...intB]};
}

async function parsePlayers(){const files=(await walk(P)).filter(p=>/(?:players|\.up)\.txt$/i.test(p));const map=new Map();for(const path of files){const text=await readFile(path,"utf8");let nation=relative(P,path).split(/[\\/]/)[0].replace(/[-_]/g," ");for(const raw of text.split(/\r?\n/)){const line=raw.trim();if(!line)continue;if(/^=\s*/.test(line)){nation=country(line);continue}if(excluded(line))continue;const body=line.split("##")[0].trim(),parts=body.includes("|")?body.split("|").map(x=>x.trim()).filter(Boolean):body.split(",").map(x=>x.trim()).filter(Boolean);const name=parts[0]?.replace(/\s*,?\s*b\.\s*(?:\d{1,2}\s+[A-Za-z]{3}\s+)?\d{4}.*$/i,"").trim();if(!name||name.length<3||name.length>70)continue;const key=norm(name),birth=body.match(/\bb\.\s*(?:\d{1,2}\s+[A-Za-z]{3}\s+)?(\d{4})\b/i);const position=parts.length>1&&/^(?:G|GK|D|DF|M|MF|F|FW)(?:\s*\|\s*(?:G|GK|D|DF|M|MF|F|FW))*$/i.test(parts[1])?parts[1].split("|").map(x=>x.trim().toUpperCase()):[];const row=map.get(key)||{id:id("player",key),name,aliases:[],nationalities:[],birthYears:[],positions:[],source:SOURCES.players.repo,sourceCommit:SOURCES.players.commit,licence:"CC0-1.0"};for(const a of parts.slice(1)){const alias=a.replace(/\s*,?\s*b\.\s*(?:\d{1,2}\s+[A-Za-z]{3}\s+)?\d{4}.*$/i,"").trim();if(alias&&norm(alias)!==key&&!/^(?:G|GK|D|DF|M|MF|F|FW)$/.test(alias.toUpperCase())&&!row.aliases.some(x=>norm(x)===norm(alias)))row.aliases.push(alias)}if(nation&&!row.nationalities.some(x=>norm(x)===norm(nation)))row.nationalities.push(nation);if(birth&&!row.birthYears.includes(+birth[1]))row.birthYears.push(+birth[1]);for(const p of position)if(!row.positions.includes(p))row.positions.push(p);map.set(key,row)}}return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name))}
async function parseClubs(){const files=(await walk(C)).filter(p=>/clubs\.wiki\.txt$/i.test(p));const map=new Map();for(const path of files){const text=await readFile(path,"utf8");let nation=relative(C,path).split(/[\\/]/)[0].replace(/[-_]/g," ");for(const raw of text.split(/\r?\n/)){const line=raw.trim();if(!line)continue;if(/^=\s*/.test(line)){nation=country(line);continue}if(excluded(line)||line.length<3||line.length>100||line.includes("|")||/^(?:club|team|name|country)/i.test(line))continue;const name=line.replace(/\s+#.*$/,"").trim(),key=norm(name);if(!key)continue;const row=map.get(key)||{id:id("club",key),name,countries:[],source:SOURCES.clubs.repo,sourceCommit:SOURCES.clubs.commit,licence:"CC0-1.0"};if(nation&&!row.countries.some(x=>norm(x)===norm(nation)))row.countries.push(nation);map.set(key,row)}}return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name))}
function makeConnections(clubs){const byCountry=new Map();for(const club of clubs)for(const c of club.countries){const k=norm(c),g=byCountry.get(k)||{label:c,clubs:[]};g.clubs.push(club.name);byCountry.set(k,g)}const groups=[...byCountry.values()].map(g=>({...g,clubs:[...new Set(g.clubs)].sort()})).filter(g=>g.clubs.length>=4).sort((a,b)=>a.label.localeCompare(b.label));const packs=[],seen=new Set();for(let seed=0;packs.length<500&&seed<15000&&groups.length>=4;seed++){const chosen=[];for(let j=0;j<4;j++){const g=groups[(seed*7+j*Math.max(1,Math.floor(groups.length/4)))%groups.length];if(!chosen.some(x=>norm(x.label)===norm(g.label)))chosen.push(g)}for(const g of groups)if(chosen.length<4&&!chosen.includes(g))chosen.push(g);if(chosen.length!==4)continue;const categories=chosen.map((g,j)=>{const start=(seed*(j+3)*5)%g.clubs.length;return{label:g.label,members:Array.from({length:4},(_,n)=>g.clubs[(start+n)%g.clubs.length])}});const all=categories.flatMap(g=>g.members);if(new Set(all.map(norm)).size!==16)continue;const sig=categories.map(g=>g.members.map(norm).sort().join(",")).sort().join("|");if(seen.has(sig))continue;seen.add(sig);packs.push({id:id("connections",sig),source:SOURCES.clubs.repo,licence:"CC0-1.0",groups:categories})}return packs}

function seededShuffle(items,seed){const copy=[...items];let state=seed>>>0;const random=()=>{state=(state+0x6D2B79F5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296};for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]}return copy}
function makePlayerConnections(players){
 const buckets=new Map();
 const add=(dimension,value,player)=>{if(!value)return;const key=dimension+":"+value,entry=buckets.get(key)||{dimension,value,members:[]};entry.members.push(player.id);buckets.set(key,entry)};
 for(const p of players){for(const nation of p.nationalities||[])add("NATIONALITY",nation,p);for(const position of p.positions||[]){const label=({G:"GOALKEEPER",GK:"GOALKEEPER",D:"DEFENDER",DF:"DEFENDER",M:"MIDFIELDER",MF:"MIDFIELDER",F:"FORWARD",FW:"FORWARD"})[position]||position;add("POSITION",label,p)}}
 const options=[...buckets.values()].map(x=>({...x,members:[...new Set(x.members)]})).filter(x=>x.members.length>=4);
 const packs=[],seen=new Set();
 for(let seed=1;seed<6000&&packs.length<500;seed++){
  const ordered=seededShuffle(options,seed*7919+17),used=new Set(),groups=[];
  for(const option of ordered){if(groups.length===4)break;const candidates=seededShuffle(option.members,seed*37+option.value.length*13);const members=candidates.filter(member=>!used.has(member)).slice(0,4);if(members.length!==4)continue;members.forEach(member=>used.add(member));groups.push({name:option.dimension+" · "+option.value.toUpperCase(),dimension:option.dimension,value:option.value,memberIds:members})}
  if(groups.length!==4||used.size!==16)continue;
  const signature=groups.map(g=>g.name+":"+g.memberIds.slice().sort().join(",")).sort().join("|");
  if(seen.has(signature))continue;seen.add(signature);packs.push({id:id("connections-players",signature),source:SOURCES.players.repo,licence:"CC0-1.0",groups});
 }
 return packs;
}

function makeGridPacks(players){
 const positionMap={G:"GK",GK:"GK",D:"DEF",DF:"DEF",M:"MID",MF:"MID",F:"FWD",FW:"FWD"},positions=["GK","DEF","MID","FWD"],buckets=new Map();
 for(const player of players){const position=positionMap[player.positions?.[0]];const nation=player.nationalities?.[0];if(!position||!nation)continue;const key=position+":"+norm(nation),entry=buckets.get(key)||{position,nation,members:[]};entry.members.push(player.id);buckets.set(key,entry)}
 const byNation=new Map();for(const entry of buckets.values()){const group=byNation.get(norm(entry.nation))||{label:entry.nation,counts:{}};group.counts[entry.position]=entry.members.length;byNation.set(norm(entry.nation),group)}
 const eligible=[...byNation.values()].filter(group=>positions.every(position=>(group.counts[position]||0)>=4)).map(group=>group.label).sort();
 const packs=[],seen=new Set();
 for(let seed=1;seed<12000&&packs.length<500;seed++){
  const countries=seededShuffle(eligible,seed*1013+71).slice(0,4);if(countries.length!==4)continue;
  const answers=positions.map(position=>countries.map(country=>{const members=buckets.get(position+":"+norm(country))?.members||[];return seededShuffle(members,seed*97+position.length+country.length).slice(0,4)}));
  if(answers.some(row=>row.some(cell=>cell.length!==4)))continue;
  const signature=positions.join(",")+"|"+countries.map(norm).join("|")+"|"+answers.flat(2).join(",");
  if(seen.has(signature))continue;seen.add(signature);
  packs.push({id:id("football-grid",signature),positions,countries,answers,source:SOURCES.players.repo,licence:"CC0-1.0"});
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
const internationalMatches=await parseInternationalResults();
const internationalQuiz=buildInternationalQuiz(internationalMatches);
const internationalGoals=await parseInternationalGoals(players);
const internationalGoalPacks=makeInternationalGoalPacks(internationalGoals.scorers);
const lineupData=JSON.parse(await readFile(resolve(ROOT,"public/data/worldcup-lineups.json"),"utf8"));
const lineups=(lineupData.matches||[]).filter(m=>m?.id&&m.team&&m.opponent&&Number.isInteger(m.year)&&Array.isArray(m.starters)&&m.starters.length===11&&new Set(m.starters.map(norm)).size===11);

const playerIndex=new Map(players.map(player=>[norm(player.name),player]));
for(const scorer of internationalGoals.scorers){const player=playerIndex.get(norm(scorer.name));if(player){player.internationalGoalsRecorded=scorer.goals;player.internationalTeams=scorer.teams}}
const getOrCreatePlayer=(name,teams=[],source=SOURCES.players)=>{const key=norm(name);let player=playerIndex.get(key);if(!player){player={id:id("player",key),name,aliases:[],nationalities:[],birthYears:[],positions:[],source:source.repo,sourceCommit:source.commit||"",licence:"CC0-1.0"};players.push(player);playerIndex.set(key,player)}for(const team of teams)if(team&&!player.nationalities.some(n=>norm(n)===norm(team)))player.nationalities.push(team);return player};
const worldCupStatMap=new Map();
for(const match of lineups)for(const name of match.starters){const key=norm(name),stat=worldCupStatMap.get(key)||{name,starts:0,years:new Set(),teams:new Set()};stat.starts++;stat.years.add(match.year);stat.teams.add(match.team);worldCupStatMap.set(key,stat)}
for(const stat of worldCupStatMap.values()){const player=getOrCreatePlayer(stat.name,[...stat.teams],SOURCES.worldCup);player.worldCupStarts=stat.starts;player.worldCupYears=[...stat.years].sort((a,b)=>a-b);player.worldCupTeams=[...stat.teams]}
const goalPlayers=internationalGoals.scorers.filter(p=>p.goals>=2);
const statPlayers=players.filter(p=>(p.internationalGoalsRecorded??0)>0||(p.worldCupStarts??0)>0);
const positionPlayers=statPlayers.filter(p=>(p.positions||[]).some(pos=>["G","GK","D","DF","M","MF","F","FW"].includes(pos))&&p.nationalities?.length);

const nations=[...new Set(lineups.flatMap(m=>[m.team,m.opponent]))].sort();
const quiz=lineups.map(m=>{const answer=m.opponent,distractors=nations.filter(n=>norm(n)!==norm(answer)).sort((a,b)=>createHash("sha256").update(m.id+a).digest("hex").localeCompare(createHash("sha256").update(m.id+b).digest("hex"))).slice(0,3);if(distractors.length!==3)return null;const choices=[answer,...distractors].sort((a,b)=>createHash("sha256").update(m.id+a).digest("hex").localeCompare(createHash("sha256").update(m.id+b).digest("hex")));return{id:id("wc-question",m.id),factId:id("wc-match",m.id),question:"Which team did "+m.team+" face in the "+m.year+" FIFA World Cup match on "+m.date+"?",answer,choices,explanation:m.team+" faced "+answer+" in the "+m.year+" FIFA World Cup.",competition:"FIFA World Cup",year:m.year,eventDate:m.date,source:SOURCES.worldCup}});
const validQuiz=quiz.filter(Boolean),footle=players.filter(p=>p.name.length>=4&&p.name.length<=22&&/^[\p{L}][\p{L}'’ .-]+$/u.test(p.name));
const uniqueFootleAnswers=[...new Set(footle.flatMap(p=>[p.name,...(p.aliases||[])]).map(value=>(value.trim().split(/\s+/).at(-1)||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z]/g,"")).filter(word=>word.length===5))].sort();
const cards=new Map();for(const m of lineups)for(const name of m.starters){const k=norm(name),r=cards.get(k)||{id:id("wc-player",k),name,worldCups:[],teams:[],matchIds:[]};if(!r.worldCups.includes(m.year))r.worldCups.push(m.year);if(!r.teams.includes(m.team))r.teams.push(m.team);if(!r.matchIds.includes(m.id))r.matchIds.push(m.id);cards.set(k,r)}
const clubConnections=makeConnections(clubs);
const playerConnections=makePlayerConnections(players);
const gridPacks=makeGridPacks(players);
const strands=makeStrandsPacks(players);
const report={generatedAt:TODAY,policy:"CC0-only pinned source whitelist; licence does not guarantee factual accuracy",counts:{players:players.length,clubs:clubs.length,footlePlayerRecords:footle.length,footleAnswers:uniqueFootleAnswers.length,worldCupLineups:lineups.length,worldCupPlayerCards:cards.size,worldCupQuestions:validQuiz.length,internationalMatches:internationalMatches.length,internationalGoalEvents:internationalGoals.meta.acceptedGoalEvents,internationalGoalScorers:internationalGoals.meta.uniqueScorers,internationalScorersForGames:internationalGoals.meta.eligibleScorers,lowballPacks:internationalGoalPacks.lowball.length,ladderPacks:internationalGoalPacks.ladder.length,football501Packs:internationalGoalPacks.football501.length,climbQuestions:internationalQuiz.climb.length,timedQuizQuestions:internationalQuiz.timed.length,connectionsPacks:playerConnections.length,gridPacks:gridPacks.length,strandsPacks:strands.length,clubCountryPacks:clubConnections.length},games:{"football-grid":{packs:gridPacks},footle:{unit:"unique five-letter surname",count:uniqueFootleAnswers.length,ready:uniqueFootleAnswers.length>=500,integrated:true},"the-climb":{unit:"question",count:internationalQuiz.climb.length,ready:internationalQuiz.climb.length>=500,integrated:true},"timed-quiz":{unit:"question",count:internationalQuiz.timed.length,ready:internationalQuiz.timed.length>=500,integrated:true},connections:{unit:"puzzle-pack",count:playerConnections.length,ready:playerConnections.length>=500,integrated:true},"missing-xi":{unit:"puzzle-pack",count:lineups.length,ready:lineups.length>=500,integrated:true},"tournament-nation":{unit:"puzzle-pack",count:lineups.length,ready:lineups.length>=500,integrated:true},"the-reveal":{unit:"player-card",count:cards.size,ready:cards.size>=500,integrated:true},"link-up":{unit:"puzzle-pack",count:lineups.length,ready:lineups.length>=500,integrated:false},strands:{unit:"puzzle-pack",count:strands.length,ready:strands.length>=500,integrated:true},"football-grid":{unit:"puzzle-pack",count:gridPacks.length,ready:gridPacks.length>=500,integrated:true,format:"position × nationality"},lowball:{unit:"challenge-pack",count:internationalGoalPacks.lowball.length,ready:internationalGoalPacks.lowball.length>=500,integrated:true,metric:"recorded senior international goals"},ladder:{unit:"challenge-pack",count:internationalGoalPacks.ladder.length,ready:internationalGoalPacks.ladder.length>=500,integrated:true,metric:"recorded senior international goals"},"football-501":{unit:"challenge-pack",count:internationalGoalPacks.football501.length,ready:internationalGoalPacks.football501.length>=500,integrated:true,metric:"recorded senior international goals"},"draft-xi":{unit:"candidate-player",count:positionPlayers.length,ready:positionPlayers.length>=500,integrated:true,metric:"position, international goals and World Cup starts; draft credits are game values"},"career-file":{unit:"player-card",count:0,ready:false,integrated:false,reason:"needs dated career spells"},"cult-hero":{unit:"player-card",count:0,ready:false,integrated:false,reason:"needs dated club-spell histories"},"scout-signal":{unit:"player-card",count:positionPlayers.length,ready:positionPlayers.length>=500,integrated:true,metric:"position, nation, age band, international goals and World Cup starts"}}};
for(const [k,n] of [["players",players.length],["Footle answers",uniqueFootleAnswers.length],["World Cup lineups",lineups.length],["World Cup questions",validQuiz.length],["The Climb questions",internationalQuiz.climb.length],["Timed Quiz questions",internationalQuiz.timed.length],["International goal scorers",goalPlayers.length],["Positioned stat players",positionPlayers.length],["Connections packs",playerConnections.length],["Football Grid packs",gridPacks.length],["Strands packs",strands.length],["International goal scorers",goalPlayers.length],["Positioned stat players",positionPlayers.length]])if(n<500)throw new Error(k+" below 500: "+n);
const database={schemaVersion:1,generatedAt:TODAY,idPolicy:"Stable SHA-256-derived IDs from normalised canonical names and source-scoped fact keys.",sourceRegistry:SOURCES,licencePolicy:"Only source repositories whose data licence is CC0-1.0 are imported. No club crest or portrait rights are included.",accuracyWarning:"CC0 is a reuse status, not a factual accuracy warranty. Review source data before publication.",report,players,clubs,worldCup:{lineups,playerCards:[...cards.values()]},internationalResults:{matches:internationalMatches,scorers:internationalGoals.scorers,scorerMeta:internationalGoals.meta},games:{footle:{answers:uniqueFootleAnswers.map(answer=>({id:id("footle-answer",answer),answer,source:SOURCES.players.repo,licence:"CC0-1.0"}))},quiz:{questions:validQuiz}, "the-climb":{questions:internationalQuiz.climb}, "timed-quiz":{questions:internationalQuiz.timed},"draft-xi":{players:positionPlayers.map(p=>({id:p.id,name:p.name,aliases:p.aliases||[],positions:p.positions,nationalities:p.nationalities,birthYears:p.birthYears,worldCupYears:p.worldCupYears||[],internationalGoalsRecorded:p.internationalGoalsRecorded??0,worldCupStarts:p.worldCupStarts??0,source:p.source}))},"scout-signal":{players:positionPlayers.map(p=>({id:p.id,name:p.name,positions:p.positions,nationalities:p.nationalities,birthYears:p.birthYears,internationalGoalsRecorded:p.internationalGoalsRecorded??0,worldCupStarts:p.worldCupStarts??0,source:p.source}))},connections:{packs:playerConnections,clubCountryPacks:clubConnections},strands:{packs:strands},lowball:{pairs:internationalGoalPacks.lowball},ladder:{packs:internationalGoalPacks.ladder},"football-501":{packs:internationalGoalPacks.football501},"missing-xi":{packs:lineups},"tournament-nation":{packs:lineups},"the-reveal":{cards:[...cards.values()]},"link-up":{packs:lineups.map(m=>({id:id("link-up",m.id),matchId:m.id,team:m.team,opponent:m.opponent,year:m.year,players:m.starters}))}}};
await mkdir(OUT,{recursive:true});await writeFile(resolve(OUT,"football-knowledge.cc0.json"),JSON.stringify(database));await writeFile(resolve(OUT,"football-knowledge-report.json"),JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify(report,null,2));
