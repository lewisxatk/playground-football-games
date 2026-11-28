import fs from "node:fs";
import path from "node:path";
import {buildGridPuzzle,sampleStaticPlayers,archiveSeedHash} from "../src/footballGridCore.js";
const root=path.resolve("public/data/player-shards");
const manifest=JSON.parse(fs.readFileSync(path.join(root,"manifest.json"),"utf8"));
const shards=manifest.shards.map(shard=>{const payload=JSON.parse(fs.readFileSync(path.join(root,shard.file),"utf8"));if(payload.source!=="OpenFootballBase-Data"||payload.releaseTag!==manifest.sourceRelease||payload.licence!=="CC BY-SA 4.0"||payload.players.length!==shard.count)throw new Error("Invalid archive shard: "+shard.file);return payload.players;});
const unique=[...new Map(shards.flat().filter(p=>p?.id&&p.name).map(p=>[p.id,p])).values()];
if(unique.length!==manifest.playerCount)throw new Error("Archive count mismatch: "+unique.length+" vs "+manifest.playerCount);
const results=[];const boardSets=new Map();const seedsPerCombination=50;const baseSeed="PLAYGROUND-GAME-POOL-2026-11";
for(const difficulty of ["EASY","HARD"])for(const kind of ["PREM_PREM","PREM_EUROPE","PREM_NATION"]){let generated=0,failed=0,invalid=0,sparse=0;const signatures=new Set();
 for(let i=0;i<seedsPerCombination;i++){const seed=baseSeed+":"+String(i)+":3200",start=archiveSeedHash(seed)%shards.length,selected=[];let count=0;for(let offset=0;offset<shards.length&&count<3200;offset++){const rows=shards[(start+offset)%shards.length];selected.push(...rows);count+=rows.length;}const pool=sampleStaticPlayers(selected,seed,3200);const puzzle=buildGridPuzzle(pool,difficulty,kind,archiveSeedHash("GRID:practice:"+String(i)+":"+difficulty+":"+kind));if(!puzzle){failed++;continue;}const flat=puzzle.answers.flat(),solutionIds=puzzle.solutions.map(p=>p.archiveId);if(flat.length!==16||solutionIds.length!==16||new Set(solutionIds).size!==16||flat.some(cell=>cell.length===0)){invalid++;continue;}if(flat.some(cell=>cell.length<2))sparse++;generated++;const sig=kind+"|"+[...puzzle.rows].map(x=>x.toLowerCase()).sort().join(",")+"|"+[...puzzle.columns].map(x=>x.toLowerCase()).sort().join(",");signatures.add(sig);}
 boardSets.set(difficulty+" "+kind,signatures);results.push({difficulty,kind,seeds:seedsPerCombination,generated,failed,invalid,sparseBoards:sparse,uniqueBoards:signatures.size,successRate:Number((generated/seedsPerCombination*100).toFixed(1))});}
const totalUnique=new Set([...boardSets.values()].flatMap(s=>[...s])).size;
const report={generatedAt:new Date().toISOString(),source:manifest.source,release:manifest.sourceRelease,archivePlayers:unique.length,sampleSize:3200,shardCount:shards.length,seedsPerCombination,results,totalUniqueBoardSignatures:totalUnique,target:250,targetMet:totalUnique>=250};
fs.mkdirSync("reports",{recursive:true});fs.writeFileSync("reports/football-grid-board-audit.json",JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify(report,null,2));
if(results.some(r=>r.generated===0||r.invalid>0)||!report.targetMet)process.exitCode=1;
