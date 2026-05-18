import * as admin from 'firebase-admin';
import * as path from 'path';

// O caminho '../firebase-key.json' continua correto porque este arquivo também está dentro da pasta 'src'
const serviceAccount = require(path.resolve(__dirname, '../firebase-key.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

console.log("🔥 Firebase Admin conectado com sucesso!");

// Exporta a instância do banco de dados para ser importada em outros arquivos
export const db = admin.firestore();

// Opcional: Exportar o próprio 'admin' caso precise de funções especiais dele no futuro (ex: timestamps)
export { admin };