import { WebSocketServer, WebSocket } from 'ws';
import Socket2 from "./core/socket2";
import Chamadas from "./chamadas/inicial";
import { gerenciadorConexoes } from './core/gerenciadorConexoes';

import { db } from './firebaseConfig';

const chamadas = new Chamadas();

// async function testarBancoDeDados() {
//   const uid = 'jogador_123';
  
//   // Caminhos para as "pastas" e "arquivos"
//   const perfilRef = db.collection('usuarios').doc(uid);
//   const selecaoRef = perfilRef.collection('preferenciasSelecao').doc('copa_2026');

//   console.log("🚀 Iniciando testes no Firebase...");

//   // ==========================================
//   // 1. ESCRITA (Criar ou Sobrescrever) -> .set()
//   // ==========================================
// //   console.log("\n📝 1. Escrevendo dados...");
  
// //   // Salvando a raiz
// //   await perfilRef.set({
// //     username: "GamerBR_Teste"
// //   });

// //   // Salvando a subcoleção
// //   await selecaoRef.set({
// //     nomeSelecao: "Brasil",
// //     Grupo: "C",
// //     Posicao: null,
// //     '16Avos': null,
// //     oitavas: null,
// //     semi: null,
// //     final: null
// //   });
// //   console.log("✅ Dados criados! (Olhe o painel do Firebase)");

// //   // ==========================================
// //   // 2. LEITURA (Buscar os dados) -> .get()
// //   // ==========================================
// //   console.log("\n🔍 2. Lendo dados do banco...");
  
// //   const perfilSnap = await perfilRef.get();
// //   const selecaoSnap = await selecaoRef.get();

// //   if (perfilSnap.exists && selecaoSnap.exists) {
// //     console.log("✅ Perfil encontrado:", perfilSnap.data());
// //     console.log("✅ Seleção escolhida:", selecaoSnap.data());
// //   } else {
// //     console.log("❌ Documento não encontrado!");
// //   }

// //   // ==========================================
// //   // 3. ATUALIZAÇÃO (Mudar apenas um campo) -> .update()
// //   // ==========================================
// //   console.log("\n🔄 3. Atualizando dados...");
  
// //   // Imagina que o Brasil passou de fase
// //   await selecaoRef.update({
// //     'Posicao': 1
// //   });
// //   console.log("✅ Atualizado! O Brasil agora está classificado nas oitavas.");

//   // ==========================================
//   // 4. EXCLUSÃO (Deletar dados) -> .delete()
//   // ==========================================
//   // Descomente as duas linhas abaixo quando quiser testar a exclusão!
  
//   console.log("\n🗑️ 4. Excluindo dados...");
//   await selecaoRef.delete();
//   await perfilRef.delete();
//   console.log("✅ Dados apagados com sucesso!");
// }
// Chama a função para o teste rodar assim que salvar o arquivo
//testarBancoDeDados();

const socketPort = 5002;

const server = new WebSocketServer({ port: socketPort }, () => {
    console.log(`Servidor pronto na porta ${socketPort}`);
});

server.on('connection', (ws: WebSocket) => {
    console.log('Usuario conectado!');
    const socket = new Socket2(ws, { open: true });

    socket.on("INICIAL", (event) => {
        chamadas.verifDadosIniciais.Inicial(event, db, socket);
    });

    socket.on("UID", (event) => {
        chamadas.verifDadosIniciais.checarUid(event, socket);
    });

    socket.on("SIMULACAO", (event) => {
        chamadas.sumulacaoCopa.salvarSimulacao(event, socket);
    });

    socket.on('disconnect', () => {
        if (socket.id) {
            gerenciadorConexoes.remover(socket.id);            
            console.log(`Usuário [${socket.id}] desconectado.`);
        } else {
            console.log("Usuário Anônimo desconectou antes de logar.");
        }
    });
});
