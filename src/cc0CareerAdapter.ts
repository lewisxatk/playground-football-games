import type { ArchiveGamePlayer } from "./careerFileData";
import type { CC0CareerPlayer } from "./footballKnowledge";

/** Adapts only recorded CC0 club-membership statements; it never fills missing stats with invented values. */
export function cc0CareerToArchiveGamePlayer(profile:CC0CareerPlayer):ArchiveGamePlayer{
 const spells=profile.spells
  .filter(spell=>spell.club&&Number.isInteger(spell.startYear))
  .map((spell,index)=>({
   seq:index,years:spell.years,startYear:spell.startYear,endYear:spell.endYear,
   club:spell.club,clubLink:"",clubQid:spell.clubQid,loan:false,
   apps:null,goals:null,sourceTitle:profile.sourceItemUrl,sourceRevision:null
  }));
 const firstYear=spells.length?Math.min(...spells.map(spell=>spell.startYear??profile.firstYear??0)):profile.firstYear;
 const endYears=spells.map(spell=>spell.endYear??spell.startYear).filter((year):year is number=>typeof year==="number");
 const lastYear=endYears.length?Math.max(...endYears):profile.lastYear;
 const clubs=[...new Set(spells.map(spell=>spell.club))];
 return {
  id:profile.id,name:profile.name,fullName:profile.fullName||profile.name,
  nationality:profile.nationality||"",position:profile.position||"",
  clubs,spells,stats:[],seasonStats:[],
  currentClub:"",appearances:0,goals:0,careerAppearanceRows:0,careerGoalRows:0,
  leagueAppearanceRows:0,leagueGoalRows:0,leagueAppearances:0,leagueGoals:0,
  leagueGoalSeasons:0,seasons:spells.length,
  firstYear:firstYear||null,lastYear:lastYear??null,
  caps:null,internationalGoals:null,nationalRows:0,nationalTeams:[],
  birthDate:"",birthPrecision:null,birthPlace:"",heightCm:null,
  currentCountry:"",currentLeague:"",currentDivision:null
 };
}
