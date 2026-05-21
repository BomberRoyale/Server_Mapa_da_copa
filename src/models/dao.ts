
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
}