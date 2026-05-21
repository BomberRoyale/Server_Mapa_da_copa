import Socket2 from "./../core/socket2";
import Dao from "./../models/dao";
import * as InterfaceBD from "../models/interfaceBanco";

const dao = new Dao();

export default class Chamadas {
      
   verifDadosIniciais = {
    Inicial(dados: any, db: any, socket: Socket2) {
        
        dao.buscaGenerico.buscaInicial(dados.token, db)
            .then((result) => { 
                if (result) {
                    socket.emit('INICIAL', 
                        InterfaceBD.criarPayload("Confirmado", true, result));
                } else {
                    console.log("Usuário não encontrado no banco.");
                    socket.emit('INICIAL', 
                        InterfaceBD.criarPayload("NaoEncontrado", false, "O usuário não possui dados salvos."));
                }
            })
            .catch(err => {                
                console.log("Erro ao buscar no banco:", err);
                socket.emit('INICIAL', 
                    InterfaceBD.criarPayload("ErroServidor", false, "Falha na comunicação com o banco."));
            });
        }
    };
}