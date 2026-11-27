export type Player = {
  name: string;
  surname: string;
  nationality: string;
  position: "GK" | "DEF" | "MID" | "FWD";
  club: string;
  league: string;
  active: boolean;
  ageBand: string;
  clubs: string[];
  aliases: string[];
};

export const PLAYER_DATABASE: Player[] = [
  {name:"Virgil van Dijk",surname:"VANDIJK",nationality:"Netherlands",position:"DEF",club:"Liverpool",league:"Premier League",active:true,ageBand:"30s",clubs:["Groningen","Celtic","Southampton","Liverpool"],aliases:["van dijk","virgil van dijk"]},
  {name:"Mohamed Salah",surname:"SALAH",nationality:"Egypt",position:"FWD",club:"Liverpool",league:"Premier League",active:true,ageBand:"30s",clubs:["Basel","Chelsea","Fiorentina","Roma","Liverpool"],aliases:["salah","mo salah","mohamed salah"]},
  {name:"Donyell Malen",surname:"MALEN",nationality:"Netherlands",position:"FWD",club:"Roma",league:"Serie A",active:true,ageBand:"20s",clubs:["PSV Eindhoven","Borussia Dortmund","Aston Villa","Roma"],aliases:["malen","donyell malen"]},
  {name:"Bradley Barcola",surname:"BARCOLA",nationality:"France",position:"FWD",club:"Liverpool",league:"Premier League",active:true,ageBand:"20s",clubs:["Lyon","Paris Saint-Germain","Liverpool"],aliases:["barcola","bradley barcola"]},
  {name:"Sadio Mané",surname:"MANE",nationality:"Senegal",position:"FWD",club:"Al-Nassr",league:"Saudi Pro League",active:true,ageBand:"30s",clubs:["Metz","Salzburg","Southampton","Liverpool","Bayern Munich","Al-Nassr"],aliases:["mane","sadio mane"]},
  {name:"Roberto Firmino",surname:"FIRMINO",nationality:"Brazil",position:"FWD",club:"Al-Ahli",league:"Saudi Pro League",active:true,ageBand:"30s",clubs:["Hoffenheim","Liverpool","Al-Ahli"],aliases:["firmino","bobby firmino"]},
  {name:"Alisson Becker",surname:"BECKER",nationality:"Brazil",position:"GK",club:"Liverpool",league:"Premier League",active:true,ageBand:"30s",clubs:["Roma","Liverpool"],aliases:["alisson","alisson becker"]},
  {name:"Trent Alexander-Arnold",surname:"ALEXANDERARNOLD",nationality:"England",position:"DEF",club:"Real Madrid",league:"La Liga",active:true,ageBand:"20s",clubs:["Liverpool","Real Madrid"],aliases:["trent","alexander arnold","trent alexander arnold"]},
  {name:"Xabi Alonso",surname:"ALONSO",nationality:"Spain",position:"MID",club:"Retired",league:"Retired",active:false,ageBand:"40s",clubs:["Real Sociedad","Liverpool","Real Madrid","Bayern Munich"],aliases:["xabi alonso","alonso"]},
  {name:"Steven Gerrard",surname:"GERRARD",nationality:"England",position:"MID",club:"Retired",league:"Retired",active:false,ageBand:"40s",clubs:["Liverpool","LA Galaxy"],aliases:["gerrard","steven gerrard"]},
  {name:"Fernando Torres",surname:"TORRES",nationality:"Spain",position:"FWD",club:"Retired",league:"Retired",active:false,ageBand:"40s",clubs:["Atlético Madrid","Liverpool","Chelsea","AC Milan"],aliases:["torres","fernando torres"]},
  {name:"Luis Suárez",surname:"SUAREZ",nationality:"Uruguay",position:"FWD",club:"Inter Miami",league:"MLS",active:true,ageBand:"30s",clubs:["Ajax","Liverpool","Barcelona","Atlético Madrid","Grêmio","Inter Miami"],aliases:["suarez","luis suarez"]},
  {name:"Kevin De Bruyne",surname:"DEBRUYNE",nationality:"Belgium",position:"MID",club:"Napoli",league:"Serie A",active:true,ageBand:"30s",clubs:["Chelsea","Werder Bremen","Wolfsburg","Manchester City","Napoli"],aliases:["kdb","de bruyne","kevin de bruyne"]},
  {name:"Erling Haaland",surname:"HAALAND",nationality:"Norway",position:"FWD",club:"Manchester City",league:"Premier League",active:true,ageBand:"20s",clubs:["Molde","Salzburg","Borussia Dortmund","Manchester City"],aliases:["haaland","erling haaland"]},
  {name:"Phil Foden",surname:"FODEN",nationality:"England",position:"MID",club:"Manchester City",league:"Premier League",active:true,ageBand:"20s",clubs:["Manchester City"],aliases:["foden","phil foden"]},
  {name:"Rodri",surname:"RODRI",nationality:"Spain",position:"MID",club:"Manchester City",league:"Premier League",active:true,ageBand:"20s",clubs:["Villarreal","Atlético Madrid","Manchester City"],aliases:["rodri","rodrigo hernandez"]},
  {name:"Jude Bellingham",surname:"BELLINGHAM",nationality:"England",position:"MID",club:"Real Madrid",league:"La Liga",active:true,ageBand:"20s",clubs:["Birmingham City","Borussia Dortmund","Real Madrid"],aliases:["bellingham","jude bellingham"]},
  {name:"Vinícius Júnior",surname:"VINICIUS",nationality:"Brazil",position:"FWD",club:"Real Madrid",league:"La Liga",active:true,ageBand:"20s",clubs:["Flamengo","Real Madrid"],aliases:["vinicius","vinicius junior","vini jr"]},
  {name:"Luka Modrić",surname:"MODRIC",nationality:"Croatia",position:"MID",club:"AC Milan",league:"Serie A",active:true,ageBand:"40s",clubs:["Dinamo Zagreb","Tottenham","Real Madrid","AC Milan"],aliases:["modric","luka modric"]},
  {name:"Karim Benzema",surname:"BENZEMA",nationality:"France",position:"FWD",club:"Al-Ittihad",league:"Saudi Pro League",active:true,ageBand:"30s",clubs:["Lyon","Real Madrid","Al-Ittihad"],aliases:["benzema","karim benzema"]},
  {name:"Cristiano Ronaldo",surname:"RONALDO",nationality:"Portugal",position:"FWD",club:"Al-Nassr",league:"Saudi Pro League",active:true,ageBand:"40s",clubs:["Sporting CP","Manchester United","Real Madrid","Juventus","Al-Nassr"],aliases:["ronaldo","cristiano ronaldo","cr7"]},
  {name:"Lionel Messi",surname:"MESSI",nationality:"Argentina",position:"FWD",club:"Inter Miami",league:"MLS",active:true,ageBand:"30s",clubs:["Barcelona","Paris Saint-Germain","Inter Miami"],aliases:["messi","lionel messi"]},
  {name:"Neymar Jr",surname:"NEYMAR",nationality:"Brazil",position:"FWD",club:"Santos",league:"Brazil",active:true,ageBand:"30s",clubs:["Santos","Barcelona","Paris Saint-Germain","Al-Hilal"],aliases:["neymar","neymar junior"]},
  {name:"Kylian Mbappé",surname:"MBAPPE",nationality:"France",position:"FWD",club:"Real Madrid",league:"La Liga",active:true,ageBand:"20s",clubs:["Monaco","Paris Saint-Germain","Real Madrid"],aliases:["mbappe","kylian mbappe"]},
  {name:"Harry Kane",surname:"KANE",nationality:"England",position:"FWD",club:"Bayern Munich",league:"Bundesliga",active:true,ageBand:"30s",clubs:["Tottenham","Bayern Munich"],aliases:["kane","harry kane"]},
  {name:"Son Heung-min",surname:"SON",nationality:"South Korea",position:"FWD",club:"LAFC",league:"MLS",active:true,ageBand:"30s",clubs:["Hamburg","Bayer Leverkusen","Tottenham","LAFC"],aliases:["son","heung min son","sonny"]},
  {name:"Thierry Henry",surname:"HENRY",nationality:"France",position:"FWD",club:"Retired",league:"Retired",active:false,ageBand:"40s",clubs:["Monaco","Juventus","Arsenal","Barcelona","New York Red Bulls"],aliases:["henry","thierry henry"]},
  {name:"Patrick Vieira",surname:"VIEIRA",nationality:"France",position:"MID",club:"Retired",league:"Retired",active:false,ageBand:"40s",clubs:["AC Milan","Arsenal","Juventus","Inter","Manchester City"],aliases:["vieira","patrick vieira"]},
  {name:"Dennis Bergkamp",surname:"BERGKAMP",nationality:"Netherlands",position:"FWD",club:"Retired",league:"Retired",active:false,ageBand:"50s",clubs:["Ajax","Inter","Arsenal"],aliases:["bergkamp","dennis bergkamp"]},
  {name:"Robert Pires",surname:"PIRES",nationality:"France",position:"MID",club:"Retired",league:"Retired",active:false,ageBand:"50s",clubs:["Metz","Marseille","Arsenal","Villarreal"],aliases:["pires","robert pires"]},
  {name:"Bukayo Saka",surname:"SAKA",nationality:"England",position:"FWD",club:"Arsenal",league:"Premier League",active:true,ageBand:"20s",clubs:["Arsenal"],aliases:["saka","bukayo saka"]},
  {name:"Declan Rice",surname:"RICE",nationality:"England",position:"MID",club:"Arsenal",league:"Premier League",active:true,ageBand:"20s",clubs:["West Ham","Arsenal"],aliases:["rice","declan rice"]},
  {name:"Didier Drogba",surname:"DROGBA",nationality:"Ivory Coast",position:"FWD",club:"Retired",league:"Retired",active:false,ageBand:"40s",clubs:["Le Mans","Guingamp","Marseille","Chelsea","Shanghai Shenhua","Galatasaray","Montreal Impact"],aliases:["drogba","didier drogba"]},
  {name:"Frank Lampard",surname:"LAMPARD",nationality:"England",position:"MID",club:"Retired",league:"Retired",active:false,ageBand:"40s",clubs:["West Ham","Chelsea","Manchester City","New York City FC"],aliases:["lampard","frank lampard"]},
  {name:"John Terry",surname:"TERRY",nationality:"England",position:"DEF",club:"Retired",league:"Retired",active:false,ageBand:"40s",clubs:["Chelsea","Aston Villa"],aliases:["terry","john terry"]},
  {name:"N'Golo Kanté",surname:"KANTE",nationality:"France",position:"MID",club:"Al-Ittihad",league:"Saudi Pro League",active:true,ageBand:"30s",clubs:["Leicester City","Chelsea","Al-Ittihad"],aliases:["kante","ngolo kante"]},
  {name:"Eden Hazard",surname:"HAZARD",nationality:"Belgium",position:"FWD",club:"Retired",league:"Retired",active:false,ageBand:"30s",clubs:["Lille","Chelsea","Real Madrid"],aliases:["hazard","eden hazard"]},
  {name:"David Beckham",surname:"BECKHAM",nationality:"England",position:"MID",club:"Retired",league:"Retired",active:false,ageBand:"50s",clubs:["Manchester United","Real Madrid","LA Galaxy","AC Milan","Paris Saint-Germain"],aliases:["beckham","david beckham"]},
  {name:"Wayne Rooney",surname:"ROONEY",nationality:"England",position:"FWD",club:"Retired",league:"Retired",active:false,ageBand:"40s",clubs:["Everton","Manchester United","DC United","Derby County"],aliases:["rooney","wayne rooney"]},
  {name:"Zlatan Ibrahimović",surname:"IBRAHIMOVIC",nationality:"Sweden",position:"FWD",club:"Retired",league:"Retired",active:false,ageBand:"40s",clubs:["Ajax","Juventus","Inter","Barcelona","AC Milan","Paris Saint-Germain","Manchester United","LA Galaxy"],aliases:["ibrahimovic","zlatan"]},
  {name:"Kaká",surname:"KAKA",nationality:"Brazil",position:"MID",club:"Retired",league:"Retired",active:false,ageBand:"40s",clubs:["AC Milan","Real Madrid","Orlando City"],aliases:["kaka","ricardo kaka"]},
  {name:"Andrés Iniesta",surname:"INIESTA",nationality:"Spain",position:"MID",club:"Retired",league:"Retired",active:false,ageBand:"40s",clubs:["Barcelona","Vissel Kobe","Emirates Club"],aliases:["iniesta","andres iniesta"]},
  {name:"Xavi Hernández",surname:"XAVI",nationality:"Spain",position:"MID",club:"Retired",league:"Retired",active:false,ageBand:"40s",clubs:["Barcelona","Al Sadd"],aliases:["xavi","xavi hernandez"]},
  {name:"Gerard Piqué",surname:"PIQUE",nationality:"Spain",position:"DEF",club:"Retired",league:"Retired",active:false,ageBand:"30s",clubs:["Manchester United","Barcelona"],aliases:["pique","gerard pique"]},
  {name:"Sergio Ramos",surname:"RAMOS",nationality:"Spain",position:"DEF",club:"Monterrey",league:"Liga MX",active:true,ageBand:"30s",clubs:["Sevilla","Real Madrid","Paris Saint-Germain","Sevilla","Monterrey"],aliases:["ramos","sergio ramos"]},
  {name:"Andrea Pirlo",surname:"PIRLO",nationality:"Italy",position:"MID",club:"Retired",league:"Retired",active:false,ageBand:"40s",clubs:["Brescia","Inter","AC Milan","Juventus","New York City FC"],aliases:["pirlo","andrea pirlo"]},
  {name:"Gianluigi Buffon",surname:"BUFFON",nationality:"Italy",position:"GK",club:"Retired",league:"Retired",active:false,ageBand:"40s",clubs:["Parma","Juventus","Paris Saint-Germain"],aliases:["buffon","gigi buffon"]},
  {name:"Francesco Totti",surname:"TOTTI",nationality:"Italy",position:"FWD",club:"Retired",league:"Retired",active:false,ageBand:"40s",clubs:["Roma"],aliases:["totti","francesco totti"]},
  {name:"Antonio Di Natale",surname:"DINATALE",nationality:"Italy",position:"FWD",club:"Retired",league:"Retired",active:false,ageBand:"40s",clubs:["Empoli","Udinese"],aliases:["di natale","antonio di natale"]},
  {name:"Jay-Jay Okocha",surname:"OKOCHA",nationality:"Nigeria",position:"MID",club:"Retired",league:"Retired",active:false,ageBand:"50s",clubs:["Eintracht Frankfurt","Fenerbahçe","Paris Saint-Germain","Bolton Wanderers"],aliases:["okocha","jay jay okocha"]},
  {name:"Peter Crouch",surname:"CROUCH",nationality:"England",position:"FWD",club:"Retired",league:"Retired",active:false,ageBand:"40s",clubs:["Liverpool","Portsmouth","Tottenham","Stoke City"],aliases:["crouch","peter crouch"]},
  {name:"Miroslav Klose",surname:"KLOSE",nationality:"Germany",position:"FWD",club:"Retired",league:"Retired",active:false,ageBand:"40s",clubs:["Werder Bremen","Bayern Munich","Lazio"],aliases:["klose","miroslav klose"]},
  {name:"Arjen Robben",surname:"ROBBEN",nationality:"Netherlands",position:"FWD",club:"Retired",league:"Retired",active:false,ageBand:"40s",clubs:["Chelsea","Real Madrid","Bayern Munich"],aliases:["robben","arjen robben"]},
  {name:"Franck Ribéry",surname:"RIBERY",nationality:"France",position:"FWD",club:"Retired",league:"Retired",active:false,ageBand:"40s",clubs:["Marseille","Bayern Munich","Salernitana"],aliases:["ribery","franck ribery"]},
  {name:"Sergio Agüero",surname:"AGUERO",nationality:"Argentina",position:"FWD",club:"Retired",league:"Retired",active:false,ageBand:"30s",clubs:["Atlético Madrid","Manchester City","Barcelona"],aliases:["aguero","kun aguero"]},
  {name:"David Silva",surname:"SILVA",nationality:"Spain",position:"MID",club:"Retired",league:"Retired",active:false,ageBand:"30s",clubs:["Valencia","Manchester City","Real Sociedad"],aliases:["david silva","silva"]},
  {name:"Yaya Touré",surname:"TOURE",nationality:"Ivory Coast",position:"MID",club:"Retired",league:"Retired",active:false,ageBand:"40s",clubs:["Barcelona","Manchester City"],aliases:["yaya toure","toure"]},
  {name:"Santi Cazorla",surname:"CAZORLA",nationality:"Spain",position:"MID",club:"Oviedo",league:"Spain",active:true,ageBand:"40s",clubs:["Villarreal","Málaga","Arsenal","Villarreal","Al Sadd","Oviedo"],aliases:["cazorla","santi cazorla"]},
  {name:"Robin van Persie",surname:"VANPERSIE",nationality:"Netherlands",position:"FWD",club:"Retired",league:"Retired",active:false,ageBand:"40s",clubs:["Arsenal","Manchester United","Fenerbahçe","Feyenoord"],aliases:["van persie","robin van persie"]}
];

export const FOOTBALL_GROUPS = [
  {name:"Liverpool captains",color:"gold",members:["Steven Gerrard","Jordan Henderson","Virgil van Dijk","Graeme Souness"]},
  {name:"Barcelona midfield icons",color:"blue",members:["Xavi Hernández","Andrés Iniesta","Sergio Busquets","Pep Guardiola"]},
  {name:"Chelsea forwards",color:"pink",members:["Didier Drogba","Gianfranco Zola","Diego Costa","Jimmy Floyd Hasselbaink"]},
  {name:"Real Madrid goalkeepers",color:"green",members:["Iker Casillas","Keylor Navas","Thibaut Courtois","Diego López"]}
];

export const LEAGUE_GOALS = [
  {name:"Alan Shearer",value:260},
  {name:"Harry Kane",value:213},
  {name:"Wayne Rooney",value:208},
  {name:"Mohamed Salah",value:193},
  {name:"Andrew Cole",value:187},
  {name:"Sergio Agüero",value:184},
  {name:"Frank Lampard",value:177},
  {name:"Thierry Henry",value:175},
  {name:"Robbie Fowler",value:163},
  {name:"Jermain Defoe",value:162}
];

export const CAREER_FILES = [
  {name:"Thierry Henry",nationality:"France",position:"Forward",years:"1994–2014",clubs:["Monaco","Juventus","Arsenal","Barcelona","New York Red Bulls"]},
  {name:"Steven Gerrard",nationality:"England",position:"Midfielder",years:"1998–2016",clubs:["Liverpool","LA Galaxy"]},
  {name:"Didier Drogba",nationality:"Ivory Coast",position:"Forward",years:"1998–2018",clubs:["Le Mans","Guingamp","Marseille","Chelsea","Shanghai Shenhua","Galatasaray","Chelsea","Montreal Impact","Phoenix Rising"]},
  {name:"Kaká",nationality:"Brazil",position:"Midfielder",years:"2001–2017",clubs:["AC Milan","Real Madrid","AC Milan","Orlando City"]},
  {name:"Zlatan Ibrahimović",nationality:"Sweden",position:"Forward",years:"1999–2023",clubs:["Ajax","Juventus","Inter","Barcelona","AC Milan","Paris Saint-Germain","Manchester United","LA Galaxy","AC Milan"]},
  {name:"David Beckham",nationality:"England",position:"Midfielder",years:"1992–2013",clubs:["Manchester United","Real Madrid","LA Galaxy","AC Milan","Paris Saint-Germain"]},
  {name:"Sergio Agüero",nationality:"Argentina",position:"Forward",years:"2003–2021",clubs:["Atlético Madrid","Manchester City","Barcelona"]},
  {name:"Robin van Persie",nationality:"Netherlands",position:"Forward",years:"2001–2019",clubs:["Arsenal","Manchester United","Fenerbahçe","Feyenoord"]}
];

export const STRANDS_PACKS = [
  {spangram:"VIRGILVANDIJK",words:["MESSI","SALAH","RODRI","KANE","SAKA","MATA","KAKA","GUTI"],theme:"Modern Premier League names"},
  {spangram:"KEVINDEBRUYNE",words:["HENRY","TERRY","VIDIC","OWEN","COLE","LAHM","KANE","NANI"],theme:"Premier League greats"},
  {spangram:"ERLINGHAALAND",words:["KLOSE","RAMOS","VARDY","KANE","MATA","GUTI","PEPE","LAHM"],theme:"Players with famous surnames"},
  {spangram:"STEVENGERRARD",words:["TERRY","VIDIC","PIRES","NANI","COLE","OWEN","KOKE","XAVI"],theme:"One-name football icons"},
  {spangram:"EDINSONCAVANI",words:["SALAH","MESSI","KLOSE","MATA","KAKA","GUTI","PEPE","LAHM"],theme:"Football surnames"},
  {spangram:"ALISSONBECKER",words:["KLOSE","VARDY","TERRY","NANI","COLE","OWEN","XAVI","PEPE"],theme:"From the pitch"},
  {spangram:"DANIELEDEROSSI",words:["TERRY","VIDIC","NANI","COLE","OWEN","XAVI","KANE","MATA"],theme:"European football names"},
  {spangram:"THOMASROSICKY",words:["HENRY","TERRY","KLOSE","KANE","MATA","GUTI","PEPE","LAHM"],theme:"Cult football favourites"},
  {spangram:"PATRICKVIEIRA",words:["VARDY","KLOSE","SALAH","NANI","COLE","OWEN","XAVI","KANE"],theme:"Midfield and attack"},
  {spangram:"VIRGILVANDIJK",words:["MESSI","NESTA","RODRI","SAKA","MATA","KAKA","GUTI","KANE"],theme:"Famous football names"}
];
