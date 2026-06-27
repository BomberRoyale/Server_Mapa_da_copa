import * as fs from 'fs';

async function baixarBancoDoGithub(): Promise<void> {
    const url: string = "https://raw.githubusercontent.com/openfootball/world-cup.json/master/2026/worldcup.json";

    try {
        console.log("Conectando ao GitHub para baixar os dados da Copa...");
        
        const response: Response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erro ao acessar o GitHub: ${response.status}`);
        }

        // Usamos 'unknown' ou 'any' aqui, pois estamos trazendo um JSON genérico de fora
        const dados: unknown = await response.json();

        // Converte o objeto em string
        const conteudoJson: string = JSON.stringify(dados, null, 2);

        // Define o nome do arquivo
        const nomeArquivo: string = "banco_copa_aberto.json";
        
        // Escreve o arquivo no disco
        fs.writeFileSync(nomeArquivo, conteudoJson);

        console.log("✅ Sucesso Absoluto!");
        console.log(`O arquivo '${nomeArquivo}' foi criado na sua pasta com toda a base de dados.`);

    } catch (error: unknown) {
        // No TypeScript, o 'error' no catch é do tipo 'unknown', então precisamos verificar se é uma instância de Error
        if (error instanceof Error) {
            console.error("Falha ao baixar os dados:", error.message);
        } else {
            console.error("Falha ao baixar os dados (Erro Desconhecido):", error);
        }
    }
}

// Executa a função
baixarBancoDoGithub();