
export interface Team { tla: string; }

export interface Score { fullTime: { home: number | null; away: number | null; }; winner?: string; }

export interface Match {
    id: number;
    status: string;
    stage: string;
    group?: string;
    matchday?: number;
    utcDate: string;
    minute?: number;
    homeTeam: Team;
    awayTeam: Team;
    score: Score;
}

export interface ApiResponse { matches: Match[]; }