import * as sistemaDeArquivos from 'fs';

// Substitua pela chave que você vai receber no seu e-mail ao criar a conta
const MEU_TOKEN = 'cdca2359edc14f5b95097665f37b2f77'; 

// 'WC' é o código oficial da Copa do Mundo (World Cup) na API deles
const ID_COMPETICAO = 'WC'; 

async function buscarJogosDaCopa() {
    // Endpoint que traz todas as partidas da competição
    const url = `https://api.football-data.org/v4/competitions/${ID_COMPETICAO}/matches`;

    try {
        console.log("📡 Conectando na API do Football-Data...");
        
        const resposta = await fetch(url, {
            method: 'GET',
            headers: {
                // É aqui que você prova que tem autorização
                'X-Auth-Token': MEU_TOKEN 
            }
        });

        if (!resposta.ok) {
            throw new Error(`Erro na requisição: ${resposta.status}`);
        }

        const dadosJson = await resposta.json();
        
        // Exibe o JSON bonitinho no console
        console.log("✅ Dados recebidos com sucesso!");
        //console.log(JSON.stringify(dadosJson, null, 2));

        const nomeDoArquivo = 'regras-copa-2026_API_26-06.json';
        sistemaDeArquivos.writeFileSync(nomeDoArquivo, JSON.stringify(dadosJson, null, 2));
        

    } catch (erro) {
        console.error("❌ Falha ao buscar dados:", erro);
    }
}

// Executa a função
buscarJogosDaCopa();