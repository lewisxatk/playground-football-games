export type GridDifficulty = "EASY" | "HARD";
export type GridKind = "CLUB_NATION" | "CLUB_CLUB";
export type GridCandidate = {archiveId:string;clubs:string[];nationality:string;name:string};
export type GridPuzzle = {rows:string[];columns:string[];rowKind:"club";columnKind:"nation"|"club";answers:GridCandidate[][][];solutions:GridCandidate[];quality:number};
export function assignDistinctAnswers(cells:GridCandidate[][]):GridCandidate[]|null;
export function buildGridPuzzle(players:GridCandidate[],difficulty:GridDifficulty,kind:GridKind,seed:number):GridPuzzle|null;
export function archiveSeedHash(value:string):number;
export function sampleStaticPlayers<T extends {id:string}>(allPlayers:T[],seed:string,limit?:number):(T&{archiveId:string})[];
