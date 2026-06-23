import Socket2 from "./../core/socket2";
import Dao from "./../models/dao";
import * as IBD from "../models/interfaceBanco";
import { gerenciadorConexoes } from "./../core/gerenciadorConexoes";
import * as fs from 'fs';

const dao = new Dao();

// 🔥 CONFIGURAÇÕES DE DIRETÓRIO E ARQUIVOS
const PASTA_DADOS = 'database/';
const ARQUIVO_OFICIAL = PASTA_DADOS + 'API_oficial_copa-2026.json';
const ARQUIVO_AO_VIVO = PASTA_DADOS + 'placares_ao_vivo.json';
const ARQUIVO_VERSAO = PASTA_DADOS + 'versao_tabela.json';


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
                    //Caso Token seja inválido ou vencido
                    if (result && (result as any).mensagem === "ERRO_TOKEN_EXPIRADO") {
                        console.log(`Bloqueando conexão: Token expirado para o socket ${socket.id}`);
                        socket.emit(dados.ev, IBD.criarPayload("ERRO_TOKEN_EXPIRADO", false, "Seu acesso expirou."));
                        return;
                    }

                    // Salvando para poder acessar depois
                    socket.id = result?.username;

                    // Validando se já está online
                    if (gerenciadorConexoes.verificarOnline(socket.id)) {
                        console.log("Usuário já conectado, erro!");
                        socket.emit(dados.ev, IBD.criarPayload("DuploLogin", false, "Você já está conectado em outro dispositivo."));
                        socket.destroy();
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
                let versaoServidor = 0;

                // 1. Lê a versão oficial usando a constante
                try {
                    const versaoServerInfo = JSON.parse(fs.readFileSync(ARQUIVO_VERSAO, 'utf-8'));
                    versaoServidor = versaoServerInfo.versao;
                } catch (erro) {
                    console.log("ℹ️ Tabela de versão ainda não gerada pelo Vigia. Assumindo versão padrão.");
                }

                // 2. Compara as versões
                if (versaoLocalCliente < versaoServidor) {
                    console.log(`📥 Usuário [${socket.id || 'Anonimo'}] desatualizado. Enviando nova Tabela Oficial...`);

                    // Lemos o arquivo completo usando a constante
                    const tabelaCompleta = JSON.parse(fs.readFileSync(ARQUIVO_OFICIAL, 'utf-8'));

                    socket.emit('SINCRONIZAR_TABELA', IBD.criarPayload("AtualizacaoNecessaria", true, {
                        versao: versaoServidor,
                        tabela: tabelaCompleta
                    }));
                } else {
                    console.log(`✅ Usuário [${socket.id || 'Anonimo'}] já está com a tabela atualizada.`);

                    socket.emit('SINCRONIZAR_TABELA', IBD.criarPayload("TabelaAtualizada", true, {
                        versao: versaoServidor
                    }));
                }

                // Placar ao vivo
                this.enviarPlacarAoVivo(socket);

            } catch (e) {
                console.error("❌ Erro ao checar versão da tabela:", e);
                socket.emit('SINCRONIZAR_TABELA', IBD.criarPayload("ErroServidor", false, "Falha ao ler arquivos do servidor."));
            }
        },

        enviarPlacarAoVivo(socket: Socket2) {
            try {
                // Verifica existência e lê usando a constante
                if (fs.existsSync(ARQUIVO_AO_VIVO)) {
                    const dadosAoVivo = fs.readFileSync(ARQUIVO_AO_VIVO, 'utf-8');
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