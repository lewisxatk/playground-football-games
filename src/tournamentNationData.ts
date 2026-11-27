export type WorldCupLineup = {
  id:string;
  year:number;
  tournament:"FIFA World Cup";
  date:string;
  round:string;
  opponent:string;
  team:string;
  starters:string[];
};
export type WorldCupLineupFile = {
  source:string;
  sourceUrl:string;
  licence:string;
  generatedAt:string;
  years:number[];
  matches:WorldCupLineup[];
};
let lineupPromise:Promise<WorldCupLineupFile>|null=null;
export function getWorldCupLineups():Promise<WorldCupLineupFile>{
  if(!lineupPromise){
    lineupPromise=fetch("/data/worldcup-lineups.json",{cache:"force-cache"})
      .then(async response=>{
        if(!response.ok)throw new Error("World Cup starting line-ups are unavailable ("+response.status+").");
        const data=await response.json() as WorldCupLineupFile;
        if(!Array.isArray(data.matches)||!data.matches.length)throw new Error("The tournament line-up file contains no matches.");
        return data;
      }).catch(error=>{lineupPromise=null;throw error;});
  }
  return lineupPromise;
}
