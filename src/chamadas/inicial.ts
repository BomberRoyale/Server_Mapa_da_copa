import Socket2 from "./../core/socket2";
import Dao from "./../models/dao";
import * as IBD from "../models/interfaceBanco";
import { gerenciadorConexoes } from "./../core/gerenciadorConexoes";
import * as fs from 'fs';

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
                .then(async (result) => {
                    // Salvando para poder acessar depois
                    socket.id = result?.username;

                    // Validando se já está online
                    if (gerenciadorConexoes.verificarOnline(socket.id)) {
                        socket.emit(dados.ev, IBD.criarPayload("DuploLogin", false, "Você já está conectado em outro dispositivo."));
                        return;
                    }

                    // criando arquivo para guardar futuramente as preferências.
                    (result as any).preferenciasSelecao = {};

                    // Salvando para poder acessar depois
                    socket.jogador = result;

                    //Salvando na lista de usuários online.
                    gerenciadorConexoes.adicionar(socket.id, socket);

                    socket.emit('UID', IBD.criarPayload("Confirmado", true, result));
                })
                .catch(err => {
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
        },
        listarSimulacoes(dados: any, socket: Socket2) {
            if (!socket.id) {
                socket.emit('LISTAR_SIMULACOES', IBD.criarPayload("NaoAutorizado", false, "Usuário não autenticado."));
                return;
            }

            console.log(`Buscando simulações sob demanda para o jogador: ${socket.id}`);

            dao.simularCopa.buscarHistorico(socket.id)
                .then((result) => {
                    // Atualiza a memória do servidor com os dados frescos
                    if (socket.jogador) {
                        socket.jogador.preferenciasSelecao = result;
                    }

                    // Envia a lista para a Unity
                    socket.emit('LISTAR_SIMULACOES', IBD.criarPayload("Sucesso", true, result));
                })
                .catch(err => {
                    console.error("Erro ao buscar histórico:", err);
                    socket.emit('LISTAR_SIMULACOES', IBD.criarPayload("ErroServidor", false, "Falha ao recuperar simulações do banco."));
                });
        }
    };
    sincronizacao = {
        checarTabela(dados: any, socket: Socket2) {
            // Se for um usuário novo que acabou de instalar o app, a versão local será 0  
            const versaoLocalCliente = dados.versaoTabela || 0;

            try {
                // 1. Lê a versão oficial que o Vigia Master gerou
                const versaoServerInfo = JSON.parse(fs.readFileSync('versao_tabela.json', 'utf-8'));
                const versaoServidor = versaoServerInfo.versao;

                // 2. Compara as versões
                if (versaoLocalCliente < versaoServidor) {
                    console.log(`📥 Usuário [${socket.id || 'Anonimo'}] desatualizado. Enviando nova Tabela Oficial...`);

                    // Cliente desatualizado! Lemos o arquivo completo de 40kb
                    const tabelaCompleta = JSON.parse(fs.readFileSync('API_oficial_copa-2026.json', 'utf-8'));

                    // Respondemos entregando a versão nova e a tabela completa
                    socket.emit('SINCRONIZAR_TABELA', IBD.criarPayload("AtualizacaoNecessaria", true, {
                        versao: versaoServidor,
                        tabela: tabelaCompleta
                    }));
                } else {
                    // O cliente já tem a versão mais recente, não precisa gastar banda mandando a tabela
                    console.log(`✅ Usuário [${socket.id || 'Anonimo'}] já está com a tabela atualizada.`);

                    socket.emit('SINCRONIZAR_TABELA', IBD.criarPayload("TabelaAtualizada", true, {
                        versao: versaoServidor
                    }));
                }
                //Placar ao vivo
                this.enviarPlacarAoVivo(socket);
                
            } catch (e) {
                console.error("❌ Erro ao checar versão da tabela:", e);
                socket.emit('SINCRONIZAR_TABELA', IBD.criarPayload("ErroServidor", false, "Falha ao ler arquivos do servidor."));
            }
        },
        enviarPlacarAoVivo(socket: Socket2) {
            try {
                // Verifica se o arquivo físico do Radar existe
                if (fs.existsSync('placares_ao_vivo.json')) {
                    const dadosAoVivo = fs.readFileSync('placares_ao_vivo.json', 'utf-8');
                    const placares = JSON.parse(dadosAoVivo);

                    if (placares.length > 0) {
                        console.log(`⚽ Jogo rolando! Sincronizando placar ao vivo para [${socket.id}]`);

                        socket.emit('SINCRONIZAR_AO_VIVO', IBD.criarPayload("PlacarAtual", true, placares));
                    }
                }
            } catch (e) {
                console.error("❌ Erro ao tentar ler o placar ao vivo para novo usuário:", e);
                socket.emit('SINCRONIZAR_AO_VIVO', IBD.criarPayload("ErroServidor", false, "Erro ao checar placares"));
            }
        }
    };
}