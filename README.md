# PoweringEG Platform

Plataforma completa de gestão de supervisões de lojas da Express Glass com análise automática por IA.

## 🚀 Funcionalidades

### Painel Admin
- **Gestão de Lojas**: Criar, editar e eliminar lojas (nome, morada, contacto, email)
- **Gestão de Gestores**: Criar, editar e eliminar gestores
- **Associações**: Associar lojas aos gestores
- **Visualização de Relatórios**: Acesso a todos os relatórios gerados

### Painel Gestor
- **Minhas Lojas**: Visualizar lojas atribuídas
- **Relatório Livre**: Criar relatórios rápidos com descrição livre e pendentes
- **Relatório Completo**: Formulário multi-página com 12 secções:
  - EPIs e Fardamento
  - Kit de Primeiros Socorros
  - Consumíveis
  - Espaço Físico (WC, Cacifos, Equipamentos)
  - Reclamações de Clientes
  - Vendas Complementares
  - Análise de Fichas de Serviço
  - Documentação Obrigatória
  - Reunião Quinzenal
  - Resumo da Supervisão
  - Colaboradores Presentes
  - Pendentes
- **Meus Relatórios**: Histórico de relatórios criados

### Funcionalidades Partilhadas
- **Relatórios com IA**: Análise automática com períodos configuráveis:
  - Diário
  - Semanal
  - Mensal
  - Trimestral
  
  Análises incluem:
  - Lojas mais/menos visitadas
  - Frequência de visitas
  - Pontos positivos e negativos
  - KM percorridos (estimativa)
  - Sugestões de melhoria

- **Gestão de Pendentes**: Sistema de acompanhamento de items pendentes por loja

## 🛠️ Stack Tecnológica

### Frontend
- React 19
- TypeScript
- TailwindCSS 4
- Wouter (routing)
- shadcn/ui (componentes)
- tRPC (comunicação type-safe)

### Backend
- Node.js 22
- Express 4
- tRPC 11
- Drizzle ORM
- PostgreSQL (Neon)

### IA
- OpenAI API (via Manus LLM)
- Análise estruturada com JSON Schema

## 📦 Instalação Local

```bash
# Clonar repositório
git clone https://github.com/OLDmamorim/powering-eg-platform.git
cd powering-eg-platform

# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com as credenciais

# Executar migrações
pnpm db:push

# Iniciar servidor de desenvolvimento
pnpm dev
```

Aceder a http://localhost:3000

## 🚢 Deployment

Ver [DEPLOYMENT.md](./DEPLOYMENT.md) para instruções completas de deployment no Railway.

### Resumo Rápido

1. Criar projeto no Railway
2. Conectar repositório GitHub
3. Configurar variáveis de ambiente
4. Deploy automático

## 📊 Base de Dados

### Tabelas

- `users`: Utilizadores com roles (admin/gestor)
- `lojas`: Lojas da rede Express Glass
- `gestores`: Gestores de loja
- `gestor_lojas`: Associações gestor-loja (many-to-many)
- `relatorios_livres`: Relatórios rápidos
- `relatorios_completos`: Relatórios detalhados multi-página
- `pendentes`: Items pendentes por loja

## 🔐 Autenticação

Sistema de autenticação com dois níveis de acesso:

- **Admin**: Acesso total (gestão de lojas, gestores, visualização de todos os relatórios)
- **Gestor**: Acesso às suas lojas e criação de relatórios

Autenticação via Manus OAuth.

## 📱 Responsividade

Interface otimizada para:
- Desktop (1920x1080+)
- Tablet (768x1024)
- Mobile (375x667+)

## 🧪 Testes

```bash
# Executar testes
pnpm test

# Executar testes em modo watch
pnpm test:watch
```

## 📝 Estrutura do Projeto

```
powering_eg_platform/
├── client/                 # Frontend React
│   ├── public/            # Assets estáticos
│   └── src/
│       ├── components/    # Componentes reutilizáveis
│       ├── pages/         # Páginas da aplicação
│       ├── lib/           # Utilitários e configurações
│       └── App.tsx        # Rotas principais
├── server/                # Backend Node.js
│   ├── _core/            # Configurações core
│   ├── db.ts             # Funções de base de dados
│   ├── routers.ts        # Routers tRPC
│   └── aiService.ts      # Serviço de IA
├── drizzle/              # Schema e migrações
│   └── schema.ts         # Definição de tabelas
└── shared/               # Código partilhado
```

## 🤝 Contribuir

1. Fork o projeto
2. Criar branch de feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit das alterações (`git commit -m 'Adicionar nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abrir Pull Request

## 📄 Licença

MIT License - ver ficheiro LICENSE para detalhes

## 👥 Autores

- **Marco Amorim** - Express Glass
- Desenvolvido com Manus AI

## 🆘 Suporte

Para questões e suporte:
- GitHub Issues: https://github.com/OLDmamorim/powering-eg-platform/issues
- Email: mramorim78@gmail.com

## 🗺️ Roadmap

- [ ] Sistema de notificações por email
- [ ] Exportação de relatórios em PDF
- [ ] Dashboard com gráficos interativos
- [ ] Aplicação mobile nativa
- [ ] Integração com sistemas de gestão existentes
