import Socket2 from "./../core/socket2";
import Dao from "./../models/dao";
import * as IBD from "../models/interfaceBanco";
import { gerenciadorConexoes } from "./../core/gerenciadorConexoes";

const dao = new Dao();

export default class Chamadas {
      
   verifDadosIniciais = {
        Inicial(dados: any, db: any, socket: Socket2) {            
            dao.buscaGenerico.buscaInicial(dados.token, db)
                .then((result) => { 
                    if (result) {
                        socket.emit('INICIAL', 
                            IBD.criarPayload("Confirmado", true, result));
                    } else {
                        console.log("Usuário não encontrado no banco.");
                        socket.emit('INICIAL', IBD.criarPayload
                            ("NaoEncontrado", false, "O usuário não possui dados salvos."));
                    }
                })
                .catch(err => {                
                    console.log("Erro ao buscar no banco:", err);
                    socket.emit('INICIAL', IBD.criarPayload
                        ("ErroServidor", false, "Falha na comunicação com o banco."));
                });
        },
        checarUid(dados: any, socket: Socket2) {
            dao.checaUsuario.verificaUid(dados.token)
            .then((result) =>{
                // Salvando para poder acessar depois
                socket.id = result?.username;
                socket.jogador = result;

                //Salvando na lista de usuários online.
                gerenciadorConexoes.adicionar(socket.id, socket);

                socket.emit('UID', IBD.criarPayload("Confirmado", true, result));
            })
            .catch(err =>{
                console.log("Erro ao buscar no banco:", err);
                    socket.emit('UID', IBD.criarPayload
                        ("ErroServidor", false, "Falha na comunicação com o banco."));
            });
        }
            
    };
        
}