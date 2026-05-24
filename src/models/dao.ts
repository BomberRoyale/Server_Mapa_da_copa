import { admin, db } from "../firebaseConfig";

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
    verificaUid: async(token: string) =>{
        // Validando toke em uid
        const decodificado = await admin.auth().verifyIdToken(token);
        const uid = decodificado.uid;

        const userDoc = await db.collection('usuarios').doc(uid).get();
        // Verificando se já existe
        if (!userDoc.exists) { 
            const dadosIniciais = {
                username: uid,
                dataCriacao: admin.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection('usuarios').doc(uid).set(dadosIniciais);
            return dadosIniciais;
        } 
        else {
            // Já existe BD para esse uid
            return userDoc.data();
        }
    }
};
}

