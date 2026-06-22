import cron from 'node-cron';
import * as fs from 'fs';
import { Match, ApiResponse } from './interfaceAPI';
import { dicionarioTimes } from './dicionarioTimes';
import { gerenciadorConexoes } from '../core/gerenciadorConexoes';

const MEU_TOKEN: string = 'cdca2359edc14f5b95097665f37b2f77';
const ID_COMPETICAO: string = 'WC';
const TEMPO_ATUALIZACAO_RADAR: number = 60000; // 1 minuto

// Tipando as variáveis de memória do servidor
let radarGlobal: NodeJS.Timeout | null = null;
let jogosEmAndamento: Set<number> = new Set<number>();
let jogosAgendados: Set<number> = new Set<number>();
let placaresMemoria: Record<number, string> = {};
let versaoDaTabelaOficial: number = Date.now();
let cacheBaseOficial: any[] = [];

const PASTA_DADOS = 'database/';
const ARQUIVO_OFICIAL = PASTA_DADOS + 'API_oficial_copa-2026.json';
const ARQUIVO_AO_VIVO = PASTA_DADOS + 'placares_ao_vivo.json';
const ARQUIVO_VERSAO = PASTA_DADOS + 'versao_tabela.json';

// function limparDadosDaCopa(dadosBrutos: ApiResponse) {
//     return dadosBrutos.matches.map((jogo: Match, index: number) => {
//         return {
//             id: index + 1,
//             id_oficial: jogo.id,
//             local: "A definir",
//             data: jogo.utcDate,
//             rodada: {
//                 fase: jogo.stage,
//                 numero_jogo: jogo.matchday || null,
//                 nome_rodada: null,
//                 grupo: jogo.group || null
//             },
//             match: {
//                 "1": jogo.homeTeam.tla,
//                 "2": jogo.awayTeam.tla
//             },
//             resultados: {
//                 "1": jogo.score.fullTime.home,
//                 "2": jogo.score.fullTime.away,
//                 vencedor: jogo.score?.winner || null
//             }
//         };
//     });
// }

function extrairResultadosAoVivo(dadosBrutos: ApiResponse, jogosAtivos: Set<number>, baseLocal: any[]) {
    return dadosBrutos.matches
        .filter((jogo: Match) => jogosAtivos.has(jogo.id))
        .map((jogo: Match) => {
            // Busca o jogo na nossa base local para garantir o nome 100% exato e traduzido
            const jogoLocal = baseLocal.find((j: any) => j.id_oficial === jogo.id);

            return {
                id_oficial: jogo.id,
                casa: jogoLocal ? jogoLocal.match["1"] : "Casa",
                visitante: jogoLocal ? jogoLocal.match["2"] : "Visitante",
                resultados: {
                    "1": jogo.score?.fullTime?.home ?? null,
                    "2": jogo.score?.fullTime?.away ?? null,
                    vencedor: jogo.score?.winner || null
                },
                minuto: jogo.minute || "Ao vivo"
            };
        });
}

function transmitirParaUnity(tipoEvento: string, dados: any): void {
    gerenciadorConexoes.transmitirParaTodos(tipoEvento, dados);
    console.log(`[GATILHO WEBSOCKET RESERVADO] Evento: ${tipoEvento} | Dados:`, dados);
}

// ==========================================
// 4. COMUNICAÇÃO COM A API
// ==========================================
async function buscarNaApi(filtros: string = '', tentativasMaximas: number = 3): Promise<ApiResponse | null> {
    const url = `https://api.football-data.org/v4/competitions/${ID_COMPETICAO}/matches${filtros}`;
    const tempoDeEsperaMs = 15000; // 15 segundos

    for (let tentativaAtual = 1; tentativaAtual <= tentativasMaximas; tentativaAtual++) {
        try {
            const resposta = await fetch(url, {
                method: 'GET',
                headers: { 'X-Auth-Token': MEU_TOKEN }
            });

            if (!resposta.ok) {
                throw new Error(`Erro HTTP: ${resposta.status} - ${resposta.statusText}`);
            }

            // Se deu tudo certo, retorna os dados e sai da função imediatamente
            return (await resposta.json()) as ApiResponse;

        } catch (erro: any) {
            console.error(`❌ Erro na API (Tentativa ${tentativaAtual}/${tentativasMaximas}):`, erro.message);

            // Se for a última tentativa, desiste e retorna nulo para não travar o servidor
            if (tentativaAtual === tentativasMaximas) {
                console.error("🚨 Limite de tentativas atingido. Abortando busca na API por enquanto.");
                return null;
            }

            // Se ainda tem tentativas, espera os 15 segundos antes de girar o laço de novo
            console.log(`⏳ Aguardando 15 segundos para tentar novamente...`);
            await new Promise(resolve => setTimeout(resolve, tempoDeEsperaMs));
        }
    }

    return null;
}

// ==========================================
// 5. MOTOR DO RADAR DE GOLS
// ==========================================
function gerenciarRadar(): void {
    if (jogosEmAndamento.size > 0 && radarGlobal === null) {
        console.log("📡 Ligando o Radar Global de Gols...");

        // 1. Extraímos toda a lógica para uma constante interna
        const executarVarreduraRadar = async () => {
            console.log(`[${new Date().toLocaleTimeString()}] 🔎 Radar girando: Buscando dados na API...`);

            const dataAtual = new Date();

            // Ontem
            const dataOntem = new Date(dataAtual);
            dataOntem.setDate(dataOntem.getDate() - 1);
            const ontemBrasil = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(dataOntem);

            // Amanhã (A mágica que resolve o fuso UTC)
            const dataAmanha = new Date(dataAtual);
            dataAmanha.setDate(dataAmanha.getDate() + 1);
            const amanhaBrasil = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(dataAmanha);

            // Busca uma janela de 3 dias para blindar qualquer jogo da madrugada
            const dados = await buscarNaApi(`?dateFrom=${ontemBrasil}&dateTo=${amanhaBrasil}`, 2);
            if (!dados) return;

            const placaresSomenteAoVivo = extrairResultadosAoVivo(dados, jogosEmAndamento, cacheBaseOficial);
            fs.writeFileSync(ARQUIVO_AO_VIVO, JSON.stringify(placaresSomenteAoVivo));

            // const teste = dados.matches
            //     .filter((jogo: Match) => jogosEmAndamento.has(jogo.id)) // 🔥 Troque aqui para a sacola do radar!
            //     .map((jogo: Match) => {
            //         return `${jogo.homeTeam?.tla} e ${jogo.awayTeam?.tla}`;
            //     });

            // console.log(teste);

            dados.matches.forEach((jogo: Match) => {
                if (!jogosEmAndamento.has(jogo.id)) return;

                const jogoReferencia = cacheBaseOficial.find((j: any) => j.id_oficial === jogo.id);
                const nomeCasa = jogoReferencia ? jogoReferencia.match["1"] : "Casa";
                const nomeVisitante = jogoReferencia ? jogoReferencia.match["2"] : "Visitante";

                // Lógica 1: Fim de jogo
                if (jogo.status === 'FINISHED') {
                    console.log(`🛑 Fim de jogo (${jogo.id})! Removendo do radar.`);
                    jogosEmAndamento.delete(jogo.id);
                    transmitirParaUnity("STATUS_PARTIDA", {
                        id: jogo.id,
                        casa: nomeCasa,
                        visitante: nomeVisitante,
                        placar: jogo.score.fullTime,
                        status: "finalizada"
                    });
                    vigiaMaster(true);
                    return;
                }

                // Lógica 2: Detecção de gols
                const novoHome = jogo.score?.fullTime?.home;
                const novoAway = jogo.score?.fullTime?.away;

                if (novoHome !== undefined && novoHome !== null && novoAway !== undefined && novoAway !== null) {
                    const placarAtual = `${novoHome}-${novoAway}`;
                    const placarAnterior = placaresMemoria[jogo.id];

                    if (placarAnterior && placarAnterior !== placarAtual) {

                        const partesAnterior = placarAnterior.split('-');
                        const antigoHome = parseInt(partesAnterior[0]);
                        const antigoAway = parseInt(partesAnterior[1]);

                        if (novoHome > antigoHome) {
                            console.log(`⚽ GOOOOOL do time da Casa (${nomeCasa})!`);
                            transmitirParaUnity("GOL", {
                                idJogo: jogo.id,
                                casa: nomeCasa,
                                visitante: nomeVisitante,
                                placar: jogo.score.fullTime,
                                minuto: jogo.minute || "Ao vivo",
                                autorDoGol: nomeCasa
                            });
                        }

                        if (novoAway > antigoAway) {
                            console.log(`⚽ GOOOOOL do time Visitante (${nomeVisitante})!`);
                            transmitirParaUnity("GOL", {
                                idJogo: jogo.id,
                                casa: nomeCasa,
                                visitante: nomeVisitante,
                                placar: jogo.score.fullTime,
                                minuto: jogo.minute || "Ao vivo",
                                autorDoGol: nomeVisitante
                            });
                        }
                    }

                    placaresMemoria[jogo.id] = placarAtual;
                }
            });

            // Desliga se não há mais jogos rolando
            if (jogosEmAndamento.size === 0 && radarGlobal !== null) {
                console.log("💤 Nenhum jogo rolando. Desligando radar.");
                fs.writeFileSync(ARQUIVO_AO_VIVO, JSON.stringify([])); // Limpando placar ao vivo
                clearInterval(radarGlobal);
                radarGlobal = null;
            }
        };

        // 2. A MÁGICA ACONTECE AQUI: Executa a função instantaneamente! 🔥
        executarVarreduraRadar();

        // 3. Só então agendamos o temporizador para cuidar dos próximos ciclos
        radarGlobal = setInterval(executarVarreduraRadar, TEMPO_ATUALIZACAO_RADAR);
    }
}

// ==========================================
// 6. O RELÓGIO MASTER (VIGIA + AGENDADOR)
// ==========================================
async function vigiaMaster(forcarAtualizacao: boolean = false): Promise<void> {

    if (jogosEmAndamento.size > 0 && !forcarAtualizacao) return;

    if (jogosEmAndamento.size === 0) {
        fs.writeFileSync(ARQUIVO_AO_VIVO, JSON.stringify([])); // Limpando placar ao vivo
    }

    console.log(`[${new Date().toLocaleTimeString()}] 🕵️‍♂️ Vigia Master: Analisando chaveamentos e agenda...`);

    let baseLocal;
    try {
        baseLocal = JSON.parse(fs.readFileSync(ARQUIVO_OFICIAL, 'utf-8'));
        cacheBaseOficial = baseLocal;
    } catch (e) {
        return;
    }

    // 1. ROTA GLOBAL (Tem cache. Usamos SÓ para olhar as chaves do futuro)
    const dadosGlobais = await buscarNaApi('');

    // 2. ROTA FRESCA (Sem cache! Traz o status real do jogo de hoje)
    const dataAtual = new Date();
    const dataOntem = new Date(dataAtual); dataOntem.setDate(dataOntem.getDate() - 1);
    const dataAmanha = new Date(dataAtual); dataAmanha.setDate(dataAmanha.getDate() + 1);
    const ontemBrasil = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(dataOntem);
    const amanhaBrasil = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(dataAmanha);

    const dadosHoje = await buscarNaApi(`?dateFrom=${ontemBrasil}&dateTo=${amanhaBrasil}`);

    if (!dadosGlobais || !dadosGlobais.matches || !dadosHoje || !dadosHoje.matches) return;

    let teveMudanca = false;

    // --- BLOCO ÚNICO DE PROCESSAMENTO ---
    baseLocal.forEach((jogoLocal: any) => {
        if (!jogoLocal.id_oficial) return;

        const jogoFresco = dadosHoje.matches.find((j: Match) => j.id === jogoLocal.id_oficial);
        const jogoGlobal = dadosGlobais.matches.find((j: Match) => j.id === jogoLocal.id_oficial);

        // ==========================================
        // A) LÓGICA DE JOGOS E PLACARES FINAIS (Confia apenas no jogoFresco)
        // ==========================================
        if (jogoFresco) {

            // Consolida o Placar Final de verdade (porque o jogoFresco nunca mente)
            if (jogoFresco.status === 'FINISHED' && jogoLocal.resultados["vencedor"] === null) {
                console.log(`✅ Placar final consolidado: Jogo ${jogoLocal.id}`);
                jogoLocal.resultados["1"] = jogoFresco.score?.fullTime?.home ?? null;
                jogoLocal.resultados["2"] = jogoFresco.score?.fullTime?.away ?? null;
                jogoLocal.resultados["vencedor"] = jogoFresco.score?.winner || null;
                teveMudanca = true;
            }

            const horaAtual = Date.now();
            const janelaDeAcao = 60 * 60 * 1000;
            const horaDoJogoLocal = new Date(jogoLocal.data).getTime();
            const tempoDeEspera = horaDoJogoLocal - horaAtual;

            // A sua trava perfeita, agora usando a variável correta e fresca
            const estaRolando = (jogoFresco.status === 'IN_PLAY' || jogoFresco.status === 'PAUSED') && jogoLocal.resultados["vencedor"] === null;
            const estaAgendado = (jogoFresco.status === 'SCHEDULED' || jogoFresco.status === 'TIMED');

            if (estaRolando && !jogosEmAndamento.has(jogoLocal.id_oficial)) {
                console.log(`⚠️ Recuperação! O jogo ${jogoLocal.match["1"]} x ${jogoLocal.match["2"]} já começou! Transferindo pro Radar...`);
                jogosEmAndamento.add(jogoLocal.id_oficial);
                placaresMemoria[jogoLocal.id_oficial] = jogoFresco.score?.fullTime ?
                    `${jogoFresco.score.fullTime.home}-${jogoFresco.score.fullTime.away}` : "0-0";
                gerenciarRadar();
            }
            else if (estaAgendado && tempoDeEspera > 0 && tempoDeEspera <= janelaDeAcao) {
                if (!jogosAgendados.has(jogoLocal.id_oficial)) {
                    console.log(`⏳ Agendado: ${jogoLocal.match["1"]} x ${jogoLocal.match["2"]} começa em ${Math.round(tempoDeEspera / 60000)} min.`);
                    jogosAgendados.add(jogoLocal.id_oficial);

                    setTimeout(() => {
                        console.log(`⏱️ Bola rolando! Radar ativado para o Jogo ID: ${jogoLocal.id_oficial}.`);
                        jogosAgendados.delete(jogoLocal.id_oficial);
                        jogosEmAndamento.add(jogoLocal.id_oficial);
                        placaresMemoria[jogoLocal.id_oficial] = "0-0";
                        transmitirParaUnity("STATUS_PARTIDA", {
                            id: jogoFresco.id,
                            casa: jogoLocal.match["1"],
                            visitante: jogoLocal.match["2"],
                            placar: jogoFresco.score?.fullTime,
                            status: "iniciada"
                        });

                        gerenciarRadar();
                    }, tempoDeEspera);
                }
            }
        }

        // ==========================================
        // B) ATUALIZAÇÃO DE CHAVEAMENTO (Confia no jogoGlobal)
        // ==========================================
        if (jogoLocal.id >= 73 && jogoGlobal) {
            const siglaCasa = jogoGlobal.homeTeam?.tla;
            const siglaFora = jogoGlobal.awayTeam?.tla;

            if (siglaCasa && siglaFora) {
                const nomeCasaTraduzido = dicionarioTimes[siglaCasa] || siglaCasa;
                const nomeForaTraduzido = dicionarioTimes[siglaFora] || siglaFora;

                if (jogoLocal.match["1"] !== nomeCasaTraduzido || jogoLocal.match["2"] !== nomeForaTraduzido) {
                    console.log(`🔄 Chaveamento atualizado (Jogo ${jogoLocal.id}): para [${nomeCasaTraduzido} x ${nomeForaTraduzido}]`);
                    jogoLocal.match["1"] = nomeCasaTraduzido;
                    jogoLocal.match["2"] = nomeForaTraduzido;
                    teveMudanca = true;
                }
            }
        }
    });

    if (teveMudanca) {
        fs.writeFileSync(ARQUIVO_OFICIAL, JSON.stringify(baseLocal, null, 2));
        versaoDaTabelaOficial = Date.now();
        fs.writeFileSync(ARQUIVO_VERSAO, JSON.stringify({ versao: versaoDaTabelaOficial }));

        console.log(`✅ Arquivo oficial salvo! Nova versão da tabela: ${versaoDaTabelaOficial}`);
        transmitirParaUnity("ATUALIZAR_CHAVEAMENTO", { novaVersao: versaoDaTabelaOficial });
    }
}

export function iniciarMotorDaCopa() {
    console.log(`🚀 Servidor TypeScript de Monitoramento Híbrido Iniciado.`);

    // Dá a primeira olhada nas chaves e nos jogos assim que o servidor liga
    vigiaMaster();

    // Liga o Relógio Master a cada 10 minutos (Seu único cron agora!)
    cron.schedule('*/10 * * * *', async () => {
        await vigiaMaster();
    });
}
