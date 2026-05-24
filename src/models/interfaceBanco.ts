
export interface IPayload {
    ev: string;
    situacao: boolean;
    valor: any; 
}

export const criarPayload = (ev: string, situacao: boolean, valor: any): IPayload => {
    return { ev, situacao, valor };
};

export interface IdUsuario{
    username: string;
    dataCriacao: any;
}

export const criarIDUsuario = (username: string, dataCriacao: any): IdUsuario => {
    return {username, dataCriacao};
};

export interface SimularCopa{
    nomeSelecao: string,
    grupo: string,
    posicao: number,
    dezesseisAvos: string,    
    oitavas: string,
    quartas: string,
    semi: string,
    final: string;
}

// export const criarSimulacaoCopa = (
//     nomeSelecao: string,
//     grupo: string,
//     posicao: number,
//     dezesseisAvos:string,
//     oitavas: string,
//     quartas: string,
//     semi: string,
//     final: string
// ): SimularCopa => {
//     return {nomeSelecao, grupo, posicao, dezesseisAvos, oitavas, semi, final}
// }