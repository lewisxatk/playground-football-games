const normalise = value => String(value ?? "").toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
function rng(seed){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function shuffle(items,seed){const a=[...items],r=rng(seed);for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const FORMER_PL_CLUBS=new Set(["blackburn rovers","bolton wanderers","portsmouth","wigan athletic","reading","blackpool","birmingham city","middlesbrough","stoke city","norwich city","sunderland","west bromwich albion","hull city","cardiff city","swansea city","watford","sheffield united","sheffield wednesday","charlton athletic","bradford city","wimbledon","oldham athletic","barnsley","coventry city","derby county","queens park rangers","qpr","leicester city","southampton","ipswich town","luton town","huddersfield town","crystal palace","burnley","wolves","wolverhampton wanderers","nottingham forest","fulham"].map(normalise));
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
  for(const club of clubs){const ck=normalise(club);if(!ck)continue;clubNames.set(ck,club);const list=clubPlayers.get(ck)??[];list.push(player);clubPlayers.set(ck,list);
   if(nation&&nation!=="Unlisted"){const key=ck+"::"+normalise(nation),matches=clubNationPairs.get(key)??[];matches.push(player);clubNationPairs.set(key,matches);}}
  if(kind==="CLUB_CLUB")for(let a=0;a<clubs.length;a++)for(let b=a+1;b<clubs.length;b++){const ka=normalise(clubs[a]),kb=normalise(clubs[b]);if(!ka||!kb||ka===kb)continue;const key=[ka,kb].sort().join("::"),list=clubPairs.get(key)??[];list.push(player);clubPairs.set(key,list);const as=clubNeighbors.get(ka)??new Set();as.add(kb);clubNeighbors.set(ka,as);const bs=clubNeighbors.get(kb)??new Set();bs.add(ka);clubNeighbors.set(kb,bs);}
 }
 const easy=difficulty==="EASY",minPool=easy?3:1;
 const clubKeys=[...clubPlayers.entries()].filter(([,v])=>v.length>=minPool).map(([k])=>k),nationKeys=[...nationPlayers.entries()].filter(([,v])=>v.length>=minPool).map(([k])=>k);
 const clubRarity=k=>clubPlayers.get(k)?.length??0,nationRarity=k=>nationPlayers.get(k)?.length??0;
 const rowKeys=kind==="CLUB_CLUB"?[...clubKeys].sort((a,b)=>easy?(clubNeighbors.get(b)?.size??0)-(clubNeighbors.get(a)?.size??0):Number(FORMER_PL_CLUBS.has(b))-Number(FORMER_PL_CLUBS.has(a))||clubRarity(a)-clubRarity(b)):[...clubKeys].sort((a,b)=>easy?clubRarity(b)-clubRarity(a):Number(FORMER_PL_CLUBS.has(b))-Number(FORMER_PL_CLUBS.has(a))||clubRarity(a)-clubRarity(b));
 const colKeys=kind==="CLUB_NATION"?nationKeys.sort((a,b)=>easy?nationRarity(b)-nationRarity(a):nationRarity(a)-nationRarity(b)):[...clubKeys].sort((a,b)=>easy?clubRarity(b)-clubRarity(a):Number(FORMER_PL_CLUBS.has(b))-Number(FORMER_PL_CLUBS.has(a))||clubRarity(a)-clubRarity(b));
 if(rowKeys.length<4||colKeys.length<4)return null;
 const rowPool=rowKeys.slice(0,easy?120:180),colPool=colKeys.slice(0,easy?120:180);let best=null;const attempts=kind==="CLUB_CLUB"?2400:2000;
 for(let attempt=0;attempt<attempts;attempt++){
  const chosenRows=shuffle(rowPool,seed+attempt*19).slice(0,4);let chosenCols;
  if(kind==="CLUB_CLUB"){const common=[...(clubNeighbors.get(chosenRows[0])??[])].filter(candidate=>!chosenRows.includes(candidate)&&chosenRows.every(row=>clubNeighbors.get(row)?.has(candidate)));chosenCols=shuffle(common.filter(key=>colPool.includes(key)),seed+attempt*37+7).slice(0,4);}
  else {
    // Pick nations genuinely shared by all four selected clubs.
    // Drawing from the entire nation pool made 4x4 intersections extremely rare.
    const common=[...nationKeys].filter(candidate=>chosenRows.every(row=>
      (clubNationPairs.get(row+"::"+candidate)?.length??0)>0));
    chosenCols=shuffle(common.filter(key=>colPool.includes(key)),seed+attempt*37+7).slice(0,4);
  }
  if(chosenCols.length!==4)continue;
  const hasFormerClub=[...chosenRows,...chosenCols].some(key=>FORMER_PL_CLUBS.has(key)),hasRareNation=kind==="CLUB_NATION"&&chosenCols.some(key=>nationRarity(key)<=18);
  if(!easy&&!hasFormerClub&&!hasRareNation)continue;
  const answers=chosenRows.map(row=>chosenCols.map(col=>kind==="CLUB_NATION"?(clubNationPairs.get(row+"::"+col)??[]):(clubPairs.get([row,col].sort().join("::"))??[])));
  if(answers.some(row=>row.some(cell=>cell.length===0)))continue;
  const flat=answers.flat(),solutions=assignDistinctAnswers(flat);if(!solutions)continue;
  const counts=flat.map(cell=>cell.length),min=Math.min(...counts),max=Math.max(...counts),average=counts.reduce((sum,n)=>sum+n,0)/counts.length;
  const quality=easy?-Math.abs(average-7)*12+min*2-max*.25:-max*8+min*2+(hasFormerClub?30:0)+(hasRareNation?18:0);
  const puzzle={rows:chosenRows.map(k=>clubNames.get(k)??k),columns:chosenCols.map(k=>kind==="CLUB_NATION"?(nationNames.get(k)??k):(clubNames.get(k)??k)),rowKind:"club",columnKind:kind==="CLUB_NATION"?"nation":"club",answers,solutions,quality};
  if(!best||quality>best.quality)best=puzzle;
  if(easy?min>=2&&max<=18&&average>=4&&average<=11:min>=1&&max<=8)break;
 }
 return best;
}
export function archiveSeedHash(value){let hash=2166136261;for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619);}return hash>>>0;}
export function sampleStaticPlayers(allPlayers,seed,limit=3200){return [...allPlayers].sort((a,b)=>archiveSeedHash(seed+":"+a.id)-archiveSeedHash(seed+":"+b.id)).slice(0,limit).map(p=>({...p,archiveId:p.id}));}
