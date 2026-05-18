import * as fs from 'fs';

//Omitindo um atributo somente de Equipe
type EquipeLimpa = Omit<Equipe, 'crest'>;

//Omitindo coisas da partida (matches)
type PartidaLimpa = Omit<PartidaOriginal, 'odds' | 'referees' | 'area' | 'competition' | 'season' | 'homeTeam' | 'awayTeam'> & {
  homeTeam: EquipeLimpa;
  awayTeam: EquipeLimpa;
};

//Json completo
const jsonRecebidoTeste = `{ "filters": {
    "season": "2026"
  },
  "resultSet": {
    "count": 104,
    "first": "2026-06-11",
    "last": "2026-07-19",
    "played": 0
  },
  "competition": {
    "id": 2000,
    "name": "FIFA World Cup",
    "code": "WC",
    "type": "CUP",
    "emblem": "https://crests.football-data.org/wm26.png"
  },
  "matches": [
    {
      "area": {
        "id": 2267,
        "name": "World",
        "code": "INT",
        "flag": null
      },
      "competition": {
        "id": 2000,
        "name": "FIFA World Cup",
        "code": "WC",
        "type": "CUP",
        "emblem": "https://crests.football-data.org/wm26.png"
      },
      "season": {
        "id": 2398,
        "startDate": "2026-06-11",
        "endDate": "2026-07-19",
        "currentMatchday": 1,
        "winner": null
      },
      "id": 537327,
      "utcDate": "2026-06-11T19:00:00Z",
      "status": "TIMED",
      "matchday": 1,
      "stage": "GROUP_STAGE",
      "group": "GROUP_A",
      "lastUpdated": "2025-12-06T20:20:44Z",
      "homeTeam": {
        "id": 769,
        "name": "Mexico",
        "shortName": "Mexico",
        "tla": "MEX",
        "crest": "https://crests.football-data.org/769.svg"
      },
      "awayTeam": {
        "id": 774,
        "name": "South Africa",
        "shortName": "South Africa",
        "tla": "RSA",
        "crest": "https://crests.football-data.org/9396.svg"
      },
      "score": {
        "winner": null,
        "duration": "REGULAR",
        "fullTime": {
          "home": null,
          "away": null
        },
        "halfTime": {
          "home": null,
          "away": null
        }
      },
      "odds": {
        "msg": "Activate Odds-Package in User-Panel to retrieve odds."
      },
      "referees": []
    }]
}`; 
const jsonRecebido = fs.readFileSync('./regras-copa-2026_API.json', 'utf-8');

// Minha interface acimilando a da API
const dadosCompletos: RespostaDaAPI = JSON.parse(jsonRecebido);

//Separano para limpar o que for necesário
const LimpaddorPartidas: PartidaLimpa[] = dadosCompletos.matches.map((partida: PartidaOriginal) => {
        
    const {odds, area, competition, season, referees, homeTeam, awayTeam, score, ...restoDaPartida} = partida;

    //Limpado atributos separadamente
    const { crest: crestHome, ...homeLimpo } = homeTeam;
    const { crest: crestAway, ...awayLimpo } = awayTeam;

    //Reconstruindo partidas
    return {
        ...restoDaPartida,
        homeTeam: homeLimpo,
        awayTeam: awayLimpo,
        score
    };
});

//Remontando tudo
const respostaFinalCompleta = {...dadosCompletos, matches: LimpaddorPartidas};

//console.log(JSON.stringify(respostaFinalCompleta, null, 2));
const nomeDoArquivo = 'regras-copa-2026_API_Atualizado.json';
fs.writeFileSync(nomeDoArquivo, JSON.stringify(respostaFinalCompleta, null, 2));