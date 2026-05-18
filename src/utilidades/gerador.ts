import * as sistemaDeArquivos from 'fs'; // Importando o módulo de File System do Node

interface AlocacaoTerceiros {
    [terceiroColocado: string]: string; // Exemplo: "3C": "1A"
}

interface MatrizDeTerceiros {
    [combinacaoDosGrupos: string]: AlocacaoTerceiros; // Exemplo: "A_B_C_D_E_F_G_H": { "3A": "1E", ... }
}

interface RegrasDaCopa {
    versao: number;
    formato_do_torneio: string;
    ultima_atualizacao: string;
    fase_de_grupos: Record<string, string[]>;
    matriz_terceiros_colocados: MatrizDeTerceiros;
}

const nomesDosGrupos: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

// Os 8 líderes de grupo que enfrentam os 3ºs colocados na Copa 2026 (Regra Oficial FIFA)
const vagasDosLideres: string[] = ['1A', '1B', '1D', '1E', '1G', '1I', '1K', '1L'];

function gerarCombinacoesMatematicas(listaDeGrupos: string[], tamanhoDaCombinacao: number): string[][] {
    const resultadoDasCombinacoes: string[][] = [];
    
    function combinar(indiceInicial: number, combinacaoAtual: string[]) {
    
        if (combinacaoAtual.length === tamanhoDaCombinacao) {
            resultadoDasCombinacoes.push([...combinacaoAtual]);
            return;
        }
        
        for (let i = indiceInicial; i < listaDeGrupos.length; i++) {
            combinacaoAtual.push(listaDeGrupos[i]);
            combinar(i + 1, combinacaoAtual);
            combinacaoAtual.pop();
        }
    }
    
    combinar(0, []);
    return resultadoDasCombinacoes;
}

function gerarArquivoJsonDaCopa() {
    const todasAsCombinacoes = gerarCombinacoesMatematicas(nomesDosGrupos, 8);
    const matrizFinalDeTerceiros: MatrizDeTerceiros = {};

    todasAsCombinacoes.forEach(combinacao => {
        const chaveDaCombinacao = combinacao.join('_');
        const alocacaoDesteCenario: AlocacaoTerceiros = {};

        let terceirosDisponiveis = combinacao.map(grupo => `3${grupo}`);
        
        vagasDosLideres.forEach(lider => {
            const grupoDoLider = lider.charAt(1); // Pega a letra do grupo (Ex: 'A' extraído de '1A')
            
            // Regra de Ouro: Um time não pode enfrentar alguém do próprio grupo original
            // Encontra o primeiro terceiro colocado que NÃO seja do mesmo grupo do líder
            const indiceEncontrado = terceirosDisponiveis.findIndex(terceiro => terceiro.charAt(1) !== grupoDoLider);
            
            if (indiceEncontrado !== -1) {
                const terceiroSorteado = terceirosDisponiveis[indiceEncontrado];
                alocacaoDesteCenario[terceiroSorteado] = lider; // Salva o confronto. Ex: "3C": "1A"
                
                // Remove este terceiro da lista para não ser sorteado novamente neste cenário
                terceirosDisponiveis.splice(indiceEncontrado, 1); 
            }
        });

        matrizFinalDeTerceiros[chaveDaCombinacao] = alocacaoDesteCenario;
    });

    // Montando o Objeto Final que será transformado em JSON
    const dadosFinaisDoJson: RegrasDaCopa = {
        versao: 1.0,
        formato_do_torneio: "copa_2026_48_selecoes",
        ultima_atualizacao: new Date().toISOString(),
        fase_de_grupos: {
            "A": ["A1", "A2", "A3", "A4"],
            "B": ["B2", "B2", "B3", "B4"],
            "C": ["C1", "C2", "C3", "C4"],
            "D": ["D1", "D2", "D3", "D4"],
            "E": ["E1", "E2", "E3", "E4"],
            "F": ["F1", "F2", "F3", "F4"],
            "G": ["G1", "G2", "G3", "G4"],
            "H": ["H1", "H2", "H3", "H4"],
            "I": ["I1", "I2", "I3", "I4"],
            "J": ["J1", "J2", "J3", "J4"],
            "K": ["K1", "K2", "K3", "K4"],
            "L": ["L1", "L2", "L3", "L4"]
        },
        matriz_terceiros_colocados: matrizFinalDeTerceiros
    };

    // Salvando o arquivo físico no computador/servidor
    const nomeDoArquivo = 'regras-copa-2026.json';
    sistemaDeArquivos.writeFileSync(nomeDoArquivo, JSON.stringify(dadosFinaisDoJson, null, 2));
    
    console.log(`✅ Sucesso! Arquivo '${nomeDoArquivo}' gerado com ${todasAsCombinacoes.length} rotas mapeadas.`);
}

// Executa a função principal
gerarArquivoJsonDaCopa();