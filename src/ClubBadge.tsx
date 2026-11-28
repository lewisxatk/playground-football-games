import { useEffect, useState } from "react";

const INDEX_URL = "/data/club-badges-index.json";
const RAW_ROOT = "https://raw.githubusercontent.com/JoseArroyave/football-logos/refs/heads/main/";
type LogoEntry = { path: string; key: string; country: string };
let indexPromise: Promise<LogoEntry[]> | null = null;

const normalise = (value: string) => value.toLocaleLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ")
  .replace(/[^a-z0-9]/g, "");

const aliases: Record<string, string> = {
  "liverpool": "logos/england/Liverpool_FC.svg",
  "manchesterunited": "logos/england/Manchester_United.svg",
  "manutd": "logos/england/Manchester_United.svg",
  "manchestercity": "logos/england/Manchester_City.svg",
  "mancity": "logos/england/Manchester_City.svg",
  "arsenal": "logos/england/Arsenal.svg",
  "chelsea": "logos/england/Chelsea.svg",
  "tottenham": "logos/england/Tottenham.svg",
  "tottenhamhotspur": "logos/england/Tottenham.svg",
  "spurs": "logos/england/Tottenham.svg",
  "real madrid": "logos/spain/Real_Madrid.svg",
  "realmadrid": "logos/spain/Real_Madrid.svg",
  "barcelona": "logos/spain/Barcelona.svg",
  "fcbarcelona": "logos/spain/Barcelona.svg",
  "atleticomadrid": "logos/spain/Atletico_Madrid.svg",
  "atletico": "logos/spain/Atletico_Madrid.svg",
  "bayernmunich": "logos/germany/Bayern_Munich.svg",
  "bayern": "logos/germany/Bayern_Munich.svg",
  "parissaintgermain": "logos/france/PSG.svg",
  "psg": "logos/france/PSG.svg",
  "juventus": "logos/italy/Juventus.svg",
  "napoli": "logos/italy/Napoli.svg",
  "asroma": "logos/italy/AS_Roma.svg",
  "roma": "logos/italy/AS_Roma.svg",
  "inter": "logos/italy/Inter.svg",
  "intermilan": "logos/italy/Inter.svg",
  "acmilan": "logos/italy/Milan.svg",
  "milan": "logos/italy/AC_Milan.svg",
  "borussiadortmund": "logos/germany/Borussia_Dortmund.svg",
  "dortmund": "logos/germany/Borussia_Dortmund.svg",
  "bayerleverkusen": "logos/germany/Bayer_Leverkusen.svg",
  "leverkusen": "logos/germany/Bayer_Leverkusen.svg",
  "ajax": "logos/netherlands/Ajax.svg",
  "psv": "logos/netherlands/PSV.svg",
  "feyenoord": "logos/netherlands/Feyenoord.svg",
  "sportingcp": "logos/portugal/Sporting_CP.svg",
  "fcporto": "logos/portugal/FC_Porto.svg",
  "psveindhoven": "logos/netherlands/PSV_Eindhoven.svg",
  "benfica": "logos/portugal/Benfica.svg",
  "porto": "logos/portugal/Porto.svg",
  "celtic": "logos/scotland/Celtic.svg",
  "rangers": "logos/scotland/Rangers.svg"
};

async function loadIndex(): Promise<LogoEntry[]> {
  if (!indexPromise) {
    indexPromise = fetch(INDEX_URL, { cache: "force-cache" })
      .then(async response => {
        if (!response.ok) throw new Error("Badge index unavailable");
        const paths = await response.json() as string[];
        return paths.map(path => {
          const bits = path.split("/");
          const filename = bits[bits.length - 1].replace(/\.svg$/i, "").replace(/_/g, " ");
          return { path, key: normalise(filename), country: bits[1] ?? "" };
        });
      }).catch(() => {
        indexPromise = null;
        return [];
      });
  }
  return indexPromise;
}

function resolve(entries: LogoEntry[], club: string, country?: string) {
  const key = normalise(club);
  if (!key) return "";
  const alias = aliases[key];
  if (alias) return alias;
  const exact = entries.filter(item => item.key === key);
  if (exact.length) return exact.find(item => country && item.country === country.toLowerCase())?.path ?? exact[0].path;

  const strip = (value: string) => value.replace(/(footballclub|fc|cf|afc|sc|ac)$/g, "");
  const loose = entries.filter(item => strip(item.key) === strip(key));
  if (loose.length) return loose.find(item => country && item.country === country.toLowerCase())?.path ?? loose[0].path;
  return "";
}

export function ClubBadge({ name, country, size = 34, className = "" }: {
  name: string; country?: string; size?: number; className?: string;
}) {
  const [path, setPath] = useState("");
  useEffect(() => {
    let live = true;
    loadIndex().then(entries => {
      if (live) setPath(resolve(entries, name, country));
    });
    return () => { live = false; };
  }, [name, country]);
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0] ?? "").join("").toUpperCase();
  return <span className={"pg-club-badge " + className} style={{ width: size, height: size }} title={name} aria-label={name}>
    {path
      ? <img src={RAW_ROOT + path} alt={name + " badge"} loading="lazy" />
      : <b>{initials || "FC"}</b>}
  </span>;
}

const FLAG: Record<string,string> = {
  "Argentina":"🇦🇷","Australia":"🇦🇺","Belgium":"🇧🇪","Brazil":"🇧🇷","Cameroon":"🇨🇲","Croatia":"🇭🇷",
  "Denmark":"🇩🇰","Egypt":"🇪🇬","England":"🏴","France":"🇫🇷","Germany":"🇩🇪","Ghana":"🇬🇭",
  "Ivory Coast":"🇨🇮","Italy":"🇮🇹","Japan":"🇯🇵","Mexico":"🇲🇽","Netherlands":"🇳🇱","Nigeria":"🇳🇬",
  "Norway":"🇳🇴","Poland":"🇵🇱","Portugal":"🇵🇹","Scotland":"🏴","Senegal":"🇸🇳","Serbia":"🇷🇸",
  "South Korea":"🇰🇷","Spain":"🇪🇸","Sweden":"🇸🇪","Switzerland":"🇨🇭","Uruguay":"🇺🇾","USA":"🇺🇸"
};
const FLAG_CODE:Record<string,string>={
 Albania:"al",Algeria:"dz",Andorra:"ad",Angola:"ao",Argentina:"ar",Armenia:"am",Australia:"au",Austria:"at",Azerbaijan:"az",
 Bahrain:"bh",Belarus:"by",Belgium:"be",Benin:"bj",Bolivia:"bo",Bosnia:"ba",Brazil:"br",Bulgaria:"bg",BurkinaFaso:"bf",Burundi:"bi",
 Cameroon:"cm",Canada:"ca",Chile:"cl",China:"cn",Colombia:"co",Comoros:"km",Congo:"cg",CostaRica:"cr",Croatia:"hr",Curacao:"cw",Cyprus:"cy",Czechia:"cz",
 Denmark:"dk",DRCongo:"cd",Ecuador:"ec",Egypt:"eg",ElSalvador:"sv",England:"gb-eng",Estonia:"ee",Ethiopia:"et",
 Finland:"fi",France:"fr",Gabon:"ga",Georgia:"ge",Germany:"de",Ghana:"gh",Greece:"gr",Guinea:"gn",GuineaBissau:"gw",
 Haiti:"ht",Honduras:"hn",Hungary:"hu",Iceland:"is",India:"in",Indonesia:"id",Iran:"ir",Iraq:"iq",Ireland:"ie",Israel:"il",Italy:"it",
 IvoryCoast:"ci",Jamaica:"jm",Japan:"jp",Jordan:"jo",Kazakhstan:"kz",Kenya:"ke",Kosovo:"xk",Latvia:"lv",Lebanon:"lb",Liberia:"lr",Libya:"ly",Lithuania:"lt",
 Luxembourg:"lu",Madagascar:"mg",Malawi:"mw",Malaysia:"my",Mali:"ml",Malta:"mt",Mexico:"mx",Moldova:"md",Montenegro:"me",Morocco:"ma",Mozambique:"mz",
 Namibia:"na",Nepal:"np",Netherlands:"nl",NewZealand:"nz",Nicaragua:"ni",Niger:"ne",Nigeria:"ng",NorthMacedonia:"mk",NorthernIreland:"gb-nir",Norway:"no",
 Oman:"om",Pakistan:"pk",Palestine:"ps",Panama:"pa",Paraguay:"py",Peru:"pe",Philippines:"ph",Poland:"pl",Portugal:"pt",Qatar:"qa",
 Romania:"ro",Russia:"ru",Rwanda:"rw",SaudiArabia:"sa",Scotland:"gb-sct",Senegal:"sn",Serbia:"rs",SierraLeone:"sl",Slovakia:"sk",Slovenia:"si",
 Somalia:"so",SouthAfrica:"za",SouthKorea:"kr",Spain:"es",SriLanka:"lk",Sudan:"sd",Suriname:"sr",Sweden:"se",Switzerland:"ch",Syria:"sy",
 Tanzania:"tz",Thailand:"th",Togo:"tg",TrinidadTobago:"tt",Tunisia:"tn",Turkey:"tr",Türkiye:"tr",Uganda:"ug",Ukraine:"ua",UnitedArabEmirates:"ae",
 UnitedStates:"us",Uruguay:"uy",Uzbekistan:"uz",Venezuela:"ve",Vietnam:"vn",Wales:"gb-wls",Zambia:"zm",Zimbabwe:"zw"
};
export function CountryFlag({ name, className = "" }:{name:string;className?:string}) {
  const key=name.toLowerCase().replace(/[^a-z]/g,"");
  const code=FLAG_CODE[key]??FLAG_CODE[name.replace(/[^A-Za-z]/g,"")];
  return <span className={"pg-country-flag "+className} aria-label={name} title={name}>
    {code?<img src={"https://flagcdn.com/w40/"+code+".png"} alt={name+" flag"} loading="lazy"/>:FLAG[name]??"🌍"}
  </span>;
}
