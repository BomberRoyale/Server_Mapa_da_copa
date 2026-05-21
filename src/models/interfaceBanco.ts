
export interface IPayload {
    ev: string;
    situacao: boolean;
    valor: any; 
}

export const criarPayload = (ev: string, situacao: boolean, valor: any): IPayload => {
    return { ev, situacao, valor };
};