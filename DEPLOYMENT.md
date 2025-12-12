# Deployment no Railway - PoweringEG Platform

## Pré-requisitos

- Conta Railway (https://railway.app)
- Conta GitHub (repositório já criado)
- Base de dados Neon PostgreSQL configurada
- Token Railway fornecido: `d0b8e4ab-9d26-4555-a777-643d5ee3870b`

## Passo 1: Preparar o Repositório GitHub

O repositório já está criado e configurado:
- **URL**: https://github.com/OLDmamorim/powering-eg-platform
- **Branch principal**: main

## Passo 2: Criar Projeto no Railway

1. Aceder a https://railway.app
2. Fazer login com a conta
3. Clicar em "New Project"
4. Selecionar "Deploy from GitHub repo"
5. Escolher o repositório `OLDmamorim/powering-eg-platform`
6. Railway irá detetar automaticamente o projeto Node.js

## Passo 3: Configurar Variáveis de Ambiente

No painel do Railway, ir a **Variables** e adicionar:

### Variáveis Obrigatórias:

```
DATABASE_URL=postgresql://neondb_owner:SENHA@ep-cool-bonus-a2z5tnrj.eu-central-1.aws.neon.tech/neondb?sslmode=require
```
(Substituir pela connection string real do Neon)

```
JWT_SECRET=seu_secret_jwt_aqui
```
(Gerar um secret aleatório seguro)

```
VITE_APP_ID=id_da_aplicacao_manus
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
```

```
OWNER_OPEN_ID=seu_openid_manus
OWNER_NAME=Marco Amorim
```

```
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=sua_chave_api_manus
VITE_FRONTEND_FORGE_API_KEY=sua_chave_frontend
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
```

```
VITE_APP_TITLE=PoweringEG Platform
VITE_APP_LOGO=
```

### Variáveis Opcionais:

```
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=
```

## Passo 4: Configurar Build e Deploy

O Railway irá usar automaticamente o ficheiro `railway.json` que contém:

- **Build Command**: `pnpm install && pnpm build`
- **Start Command**: `pnpm start`
- **Port**: Railway atribui automaticamente (variável `PORT`)

## Passo 5: Deploy

1. Após configurar as variáveis, clicar em **Deploy**
2. Railway irá:
   - Clonar o repositório
   - Instalar dependências com pnpm
   - Executar build do frontend e backend
   - Iniciar o servidor
3. Aguardar conclusão do deploy (2-5 minutos)

## Passo 6: Obter URL da Aplicação

1. No painel Railway, ir a **Settings**
2. Na secção **Domains**, clicar em **Generate Domain**
3. Railway irá gerar um domínio público: `https://seu-projeto.up.railway.app`

## Passo 7: Configurar Base de Dados Neon

Certifica-te que a base de dados Neon está configurada:

1. Aceder a https://neon.tech
2. Verificar que o projeto está ativo
3. Copiar a **Connection String** para a variável `DATABASE_URL`
4. As migrações já foram executadas localmente

## Passo 8: Testar a Aplicação

1. Aceder ao URL gerado pelo Railway
2. Fazer login com a conta Manus
3. Verificar que o dashboard carrega corretamente
4. Testar criação de lojas e relatórios

## Troubleshooting

### Erro de Conexão à Base de Dados
- Verificar se `DATABASE_URL` está correta
- Confirmar que Neon permite conexões externas
- Verificar se `?sslmode=require` está no final da connection string

### Erro de Build
- Verificar logs no Railway
- Confirmar que todas as dependências estão no `package.json`
- Verificar se o Node.js version é compatível (v22)

### Aplicação não inicia
- Verificar se `PORT` está configurado (Railway define automaticamente)
- Verificar logs de runtime no Railway
- Confirmar que `pnpm start` funciona localmente

## Domínio Personalizado (Opcional)

Para usar um domínio próprio:

1. No Railway, ir a **Settings > Domains**
2. Clicar em **Custom Domain**
3. Adicionar o domínio (ex: `poweringeg.com`)
4. Configurar DNS do domínio:
   - Tipo: CNAME
   - Nome: @ ou www
   - Valor: domínio gerado pelo Railway

## Atualizações Futuras

Para fazer deploy de novas versões:

1. Fazer commit e push para o GitHub:
   ```bash
   git add .
   git commit -m "Nova funcionalidade"
   git push origin main
   ```

2. Railway irá automaticamente:
   - Detetar o novo commit
   - Fazer rebuild
   - Deploy da nova versão

## Suporte

Para questões sobre deployment:
- Railway Docs: https://docs.railway.app
- Neon Docs: https://neon.tech/docs
- GitHub Repo: https://github.com/OLDmamorim/powering-eg-platform
