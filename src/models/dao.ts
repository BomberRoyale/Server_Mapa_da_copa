import { admin, db } from "../firebaseConfig";
import * as IBD from "../models/interfaceBanco";

export default class Dao {

    buscaGenerico = {

        buscaInicial: async (uid: string, db: any) => {
            const perfilRef = db.collection('usuarios').doc(uid);
            const perfilSnap = await perfilRef.get();

            if (perfilSnap.exists) {
                console.log("✅ Perfil encontrado:", perfilSnap.data());
                return perfilSnap.data();
            }
            return null;
        }
    };
    checaUsuario = {
        verificaUid: async (token: string) => {
            // Validando toke em uid
            try {
                const decodificado = await admin.auth().verifyIdToken(token);
                const uid = decodificado.uid;

                const userDoc = await db.collection('usuarios').doc(uid).get();
                // Verificando se já existe
                if (!userDoc.exists) {
                    const dadosIniciais = IBD.criarIDUsuario
                        (uid, admin.firestore.FieldValue.serverTimestamp());

                    await db.collection('usuarios').doc(uid).set(dadosIniciais);
                    return dadosIniciais;
                }
                else {
                    // Já existe BD para esse uid
                    return userDoc.data();
                }

            } catch (erro) {
                return { mensagem: "ERRO_TOKEN_EXPIRADO" };
            }

        }
    };
    simularCopa = {
        salvarCaminho: async (uid: string, nomeDocumento: string, dadosSimulacao: any) => {
            //Gera se não existe
            const docRef = db.collection('usuarios').doc(uid)
                .collection('preferenciasSelecao').doc(nomeDocumento);

            //Grava o que precisa, não apaga o que tem.
            await docRef.set(dadosSimulacao, { merge: true });

            return dadosSimulacao;
        },

        buscarHistorico: async (uid: string) => {
            const docRef = db.collection('usuarios').doc(uid).collection('preferenciasSelecao');
            const snapshot = await docRef.get();

            let historico: any = {};

            // Varre todos os documentos (ex: "2026_brasil", "2026_franca") e coloca no dicionário
            snapshot.forEach(doc => {
                historico[doc.id] = doc.data();
            });

            return historico;
        }
    }
}

