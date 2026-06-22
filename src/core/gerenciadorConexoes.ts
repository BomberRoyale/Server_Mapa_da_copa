import Socket2 from "./socket2";
import * as IBD from "../models/interfaceBanco";

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

    public verificarOnline (uid: string): boolean{
        return this.conexoesAtivas.has(uid);
    }

    public transmitirParaTodos(evento: string, dados: any): void {
        const total = this.totalOnline();
        if (total === 0) return; // Ninguém online, não faz nada

        this.conexoesAtivas.forEach((socket, uid) => {
            try {
                socket.emit(evento, IBD.criarPayload(evento, true, dados));
            } catch (erro) {
                console.error(`❌ Erro ao enviar evento para o usuário [${uid}]:`, erro);
            }
        });

        console.log(`📡 [Megafone] Evento '${evento}' enviado para ${total} usuário(s) ativo(s).`);
    }
}

// Exporta uma única instância viva para o servidor inteiro usar
export const gerenciadorConexoes = new GerenciadorConexoes();