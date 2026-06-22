FROM node:20-alpine AS builder
WORKDIR /app

# Copia configurações de dependências
COPY package*.json ./

# Instala as dependências normais e o TypeScript globalmente
RUN npm install
RUN npm install -g typescript

# Copia o código fonte
COPY src/ ./src/
COPY tsconfig.json ./

# Executa a compilação (isso vai gerar a pasta /app/build lá dentro)
RUN tsc


FROM node:20-alpine
WORKDIR /app

COPY package*.json ./

# Instala APENAS dependências de produção (economiza muita RAM)
RUN npm install --omit=dev

# O TRUQUE DE MESTRE: Copia a pasta build pronta do Estágio 1 para cá
COPY --from=builder /app/build ./build

# Copia a chave do Firebase
COPY firebase-key.json ./firebase-key.json

COPY database/ ./database/

ENV TZ="America/Sao_Paulo"

EXPOSE 5002

CMD ["node", "build/server.js"]