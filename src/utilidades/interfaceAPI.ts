interface Filtros {
  season: string;
}

interface Resultado {
  count: number;
  first: string;
  last: string;
  played: number;
}

interface Area {
  id: number;
  name: string;
  code: string;
  flag: string | null;
}

interface Competicao {
  id: number;
  name: string;
  code: string;
  type: string;
  emblem: string;
}

interface Temporada {
  id: number;
  startDate: string;
  endDate: string;
  currentMatchday: number;
  winner: string | null;
}

interface Equipe {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

interface PlacarTempo {
  home: number | null;
  away: number | null;
}

interface Placar {
  winner: string | null;
  duration: string;
  fullTime: PlacarTempo;
  halfTime: PlacarTempo;
}

interface Odds {
  msg: string;
}

interface PartidaOriginal {
  area: Area;
  competition: Competicao;
  season: Temporada;
  id: number;
  utcDate: string;
  status: string;
  matchday: number;
  stage: string;
  group: string;
  lastUpdated: string;
  homeTeam: Equipe;
  awayTeam: Equipe;
  score: Placar;
  odds: Odds;
  referees: any[];
}

interface RespostaDaAPI {
  filters: Filtros;
  resultSet: Resultado;
  competition: Competicao;
  matches: PartidaOriginal[];
}