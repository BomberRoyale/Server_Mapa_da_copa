import Socket2 from "./socket2";

class GerenciadorConexoes {
    // Lista de Usuarios conectados
    private conexoesAtivas = new Map<string, Socket2>();

    public adicionar(uid: string, socket: Socket2): void {
        this.conexoesAtivas.set(uid, socket);
        console.log(`📡 Usuário [${uid}] conectado. Total online: ${this.totalOnline()}`);
    }
    
    public remover(uid: string): void {
        if (this.conexoesAtivas.has(uid)) {
            this.conexoesAtivas.delete(uid);
            console.log(`🧹 Usuário [${uid}] desconectou. Memória limpa. Total online: ${this.totalOnline()}`);
        }
    }
    
    public obterConexao(uid: string): Socket2 | undefined {
        return this.conexoesAtivas.get(uid);
    }

    public totalOnline(): number {
        return this.conexoesAtivas.size;
    }
    
    public obterTodasConexoes(): Map<string, Socket2> {
        return this.conexoesAtivas;
    }
}

// Exporta uma única instância viva para o servidor inteiro usar
export const gerenciadorConexoes = new GerenciadorConexoes();