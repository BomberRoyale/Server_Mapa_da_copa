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
            .then(async(result) =>{
                // Salvando para poder acessar depois
                socket.id = result?.username;

                // Validando se já está online
                if (gerenciadorConexoes.verificarOnline(socket.id)) {
                    socket.emit(dados.ev, IBD.criarPayload("DuploLogin", false, "Você já está conectado em outro dispositivo."));
                    return;
                }

                //Fazendo uma busca pelas preferencias para salvá-las caso as tenha.
                try {
                    const historico = await dao.simularCopa.buscarHistorico(socket.id);            
                    // Injeta o histórico dentro do resultado principal!
                    (result as any).preferenciasSelecao = historico;
                    console.log(JSON.stringify(historico, null, 2));
                } catch (err) {
                    console.error("Erro ao buscar histórico, iniciando vazio:", err);
                    (result as any).preferenciasSelecao = {};
                }

                // Salvando para poder acessar depois
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
    sumulacaoCopa = {
        salvarSimulacao(dados: any, socket: Socket2) {
            if (!socket.id) {
                socket.emit('SIMULACAO', IBD.criarPayload("NaoAutorizado", false, "Usuário não autenticado."));
                return;
            }
            const ano: string = dados.ano; 
            const simulacao: IBD.SimularCopa = dados.simulacao; 

            if (!ano || !simulacao || !simulacao.nomeSelecao) {
            socket.emit('Erro', IBD.criarPayload("DadosInvalidos", false, "Ano ou dados da simulação ausentes."));
                return;
            }

            const timeFormatado = simulacao.nomeSelecao.toLowerCase().replace(/\s/g, "");
            const nomeDocumento = `${ano}_${timeFormatado}`;
            
            if (!socket.jogador.preferenciasSelecao) {
                socket.jogador.preferenciasSelecao = {};
            }
            const estadoAnterior = socket.jogador.preferenciasSelecao[nomeDocumento];
            
            socket.jogador.preferenciasSelecao[nomeDocumento] = simulacao;
            socket.emit('SIMULACAO', IBD.criarPayload("Sucesso", true, simulacao));
            
            dao.simularCopa.salvarCaminho(socket.id, nomeDocumento, simulacao)
            .then(() => {                                
                console.log(`💾 Simulação de ${simulacao.nomeSelecao} (${ano}) salva com sucesso para: ${socket.id}`);
            })
            .catch(err => {
                console.log("Erro ao salvar simulação no banco:", err);
                if (estadoAnterior) {
                    socket.jogador.preferenciasSelecao[nomeDocumento] = estadoAnterior;
                } else {
                    delete socket.jogador.preferenciasSelecao[nomeDocumento];
                }

                // Verificar como tratar depois no C#
                socket.emit('SIMULACAO', IBD.criarPayload("FalhaGravacaoBanco", false, {
                    mensagem: "Erro ao sincronizar dados com o servidor em nuvem.",
                    documentoFalho: nomeDocumento,
                    ano: ano,
                    simulacao: simulacao
                }));
            });
        }
    };        
}