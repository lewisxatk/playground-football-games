const normalise = value => String(value ?? "").toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
const clubKey = value => normalise(value).replace(/(?:footballclub|fc|afc)$/,"");
function rng(seed){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function shuffle(items,seed){const a=[...items],r=rng(seed);for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const PREMIER_LEAGUE_CLUBS=new Set(["arsenal","aston villa","birmingham city","blackburn rovers","blackpool","bolton wanderers","bournemouth","bradford city","brighton","brighton and hove albion","burnley","cardiff city","charlton athletic","chelsea","coventry city","crystal palace","derby county","everton","fulham","huddersfield town","hull city","ipswich town","leeds united","leicester city","liverpool","manchester city","manchester united","middlesbrough","newcastle united","norwich city","nottingham forest","oldham athletic","portsmouth","queens park rangers","qpr","reading","sheffield united","sheffield wednesday","southampton","stoke city","sunderland","swansea city","tottenham hotspur","watford","west bromwich albion","west ham united","wigan athletic","wimbledon","wolverhampton wanderers","wolves"].map(clubKey));
export function assignDistinctAnswers(cells){
 if(cells.length!==16)return null;
 const playerToCell=new Map(),cellToPlayer=Array(cells.length);
 const order=cells.map((c,i)=>({i,candidates:[...new Map(c.filter(p=>p?.archiveId).map(p=>[p.archiveId,p])).values()]})).sort((a,b)=>a.candidates.length-b.candidates.length);
 const assign=(cell,seen)=>{for(const player of order.find(entry=>entry.i===cell).candidates){const id=player.archiveId;if(seen.has(id))continue;seen.add(id);const previous=playerToCell.get(id);if(!previous||assign(previous.cell,seen)){playerToCell.set(id,{player,cell});cellToPlayer[cell]=player;return true;}}return false;};
 for(const entry of order)if(!assign(entry.i,new Set()))return null;
 return cellToPlayer.every(Boolean)?cellToPlayer:null;
}
export function buildGridPuzzle(players,difficulty,kind,seed){
 const clubPlayers=new Map(),nationPlayers=new Map(),clubNames=new Map(),nationNames=new Map(),clubPairs=new Map(),clubNationPairs=new Map(),clubNeighbors=new Map();
 for(const player of players){
  const clubs=[...new Set((player.clubs??[]).filter(Boolean))],nation=player.nationality;
  if(nation&&nation!=="Unlisted"){const nk=normalise(nation);nationNames.set(nk,nation);const list=nationPlayers.get(nk)??[];list.push(player);nationPlayers.set(nk,list);}
  for(const club of clubs){const ck=clubKey(club);if(!ck)continue;clubNames.set(ck,club);const list=clubPlayers.get(ck)??[];list.push(player);clubPlayers.set(ck,list);
   if(nation&&nation!=="Unlisted"){const key=ck+"::"+normalise(nation),matches=clubNationPairs.get(key)??[];matches.push(player);clubNationPairs.set(key,matches);}}
  if(kind!=="PREM_NATION")for(let a=0;a<clubs.length;a++)for(let b=a+1;b<clubs.length;b++){const ka=clubKey(clubs[a]),kb=clubKey(clubs[b]);if(!ka||!kb||ka===kb)continue;const key=[ka,kb].sort().join("::"),list=clubPairs.get(key)??[];list.push(player);clubPairs.set(key,list);const as=clubNeighbors.get(ka)??new Set();as.add(kb);clubNeighbors.set(ka,as);const bs=clubNeighbors.get(kb)??new Set();bs.add(ka);clubNeighbors.set(kb,bs);}
 }
 const easy=difficulty==="EASY",minPool=easy?3:1;
 const EUROPEAN_CLUBS=new Set(["ajax","psv","feyenoord","real madrid","barcelona","atletico madrid","athletic bilbao","sevilla","valencia","villarreal","bayern munich","borussia dortmund","bayer leverkusen","rb leipzig","schalke 04","juventus","inter","inter milan","ac milan","napoli","roma","lazio","paris saint-germain","psg","marseille","monaco","benfica","porto","sporting cp","celtic","rangers","galatasaray","fenerbahce","besiktas"].map(clubKey));
 const isPrem=key=>PREMIER_LEAGUE_CLUBS.has(clubKey(key)); const isEuropean=key=>EUROPEAN_CLUBS.has(clubKey(key));
 const clubKeys=[...clubPlayers.entries()].filter(([,v])=>v.length>=minPool).map(([k])=>k),nationKeys=[...nationPlayers.entries()].filter(([,v])=>v.length>=minPool).map(([k])=>k);
 const clubRarity=k=>clubPlayers.get(k)?.length??0,nationRarity=k=>nationPlayers.get(k)?.length??0;
 const rowKeys=[...clubKeys].filter(isPrem).sort((a,b)=>easy?clubRarity(b)-clubRarity(a):clubRarity(a)-clubRarity(b));
 const colKeys=kind==="PREM_NATION"?nationKeys.sort((a,b)=>easy?nationRarity(b)-nationRarity(a):nationRarity(a)-nationRarity(b)):[...clubKeys].filter(kind==="PREM_PREM"?isPrem:isEuropean).sort((a,b)=>easy?clubRarity(b)-clubRarity(a):clubRarity(a)-clubRarity(b));
 if(rowKeys.length<4||colKeys.length<4)return null;
 const rowPool=rowKeys.slice(0,easy?120:180),colPool=colKeys.slice(0,easy?120:180);let best=null;const attempts=2400;
 for(let attempt=0;attempt<attempts;attempt++){
  let chosenRows,chosenCols;
  if(kind!=="PREM_NATION"){
    chosenRows=shuffle(rowPool,seed+attempt*19).slice(0,4);
    const common=[...(clubNeighbors.get(chosenRows[0])??[])].filter(candidate=>!chosenRows.includes(candidate)&&chosenRows.every(row=>clubNeighbors.get(row)?.has(candidate)));
    chosenCols=shuffle(common.filter(key=>colPool.includes(key)),seed+attempt*37+7).slice(0,4);
  } else {
    // Build from the column side: choose four nations first, then rebuild
    // the row set from clubs that genuinely intersect every chosen nation.
    // This avoids wasting attempts on four clubs with no shared nation set.
    chosenCols=shuffle(colPool,seed+attempt*37+7).slice(0,4);
    const common=rowPool.filter(row=>chosenCols.every(col=>kind==="PREM_NATION"?(clubNationPairs.get(row+"::"+col)?.length??0)>0:(clubPairs.get([row,col].sort().join("::"))?.length??0)>0));
    chosenRows=shuffle(common,seed+attempt*19+13).slice(0,4);
  }
  if(chosenCols.length!==4)continue;
  const hasFormerClub=chosenRows.some(key=>PREMIER_LEAGUE_CLUBS.has(key)),hasRareNation=kind==="PREM_NATION"&&chosenCols.some(key=>nationRarity(key)<=18);
  if(!easy&&!hasFormerClub&&!hasRareNation)continue;
  const answers=chosenRows.map(row=>chosenCols.map(col=>kind==="PREM_NATION"?(clubNationPairs.get(row+"::"+col)??[]):(clubPairs.get([row,col].sort().join("::"))??[])));
  if(answers.some(row=>row.some(cell=>cell.length===0)))continue;
  const flat=answers.flat(),solutions=assignDistinctAnswers(flat);if(!solutions)continue;
  const counts=flat.map(cell=>cell.length),min=Math.min(...counts),max=Math.max(...counts),average=counts.reduce((sum,n)=>sum+n,0)/counts.length;
  const quality=easy?-Math.abs(average-7)*12+min*2-max*.25:-max*8+min*2+(hasFormerClub?30:0)+(hasRareNation?18:0);
  const puzzle={rows:chosenRows.map(k=>clubNames.get(k)??k),columns:chosenCols.map(k=>kind==="PREM_NATION"?(nationNames.get(k)??k):(clubNames.get(k)??k)),rowKind:"club",columnKind:kind==="PREM_NATION"?"nation":"club",answers,solutions,quality};
  if(!best||quality>best.quality)best=puzzle;
  if(easy?min>=2&&max<=18&&average>=4&&average<=11:min>=1&&max<=8)break;
 }
 return best;
}
export function archiveSeedHash(value){let hash=2166136261;for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619);}return hash>>>0;}
export function sampleStaticPlayers(allPlayers,seed,limit=3200){return [...allPlayers].sort((a,b)=>archiveSeedHash(seed+":"+a.id)-archiveSeedHash(seed+":"+b.id)).slice(0,limit).map(p=>({...p,archiveId:p.id}));}
