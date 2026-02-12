# PoweringEG Platform - TODO

## Fase 1: Configuração Inicial
- [x] Criar repositório GitHub
- [ ] Configurar credenciais Railway, Neon e Netlify

## Fase 2: Base de Dados
- [x] Schema: Tabela de lojas (nome, morada, contacto, email)
- [x] Schema: Tabela de gestores (nome, email, morada)
- [x] Schema: Tabela de associações gestor-loja
- [x] Schema: Tabela de relatórios livres
- [x] Schema: Tabela de relatórios completos
- [x] Schema: Tabela de pendentes por loja
- [x] Executar migrações no Neon

## Fase 3: Autenticação e Controlo de Acesso
- [x] Configurar roles (Admin/Gestor) no schema users
- [x] Implementar middleware de autorização
- [x] Criar procedimentos protegidos para Admin
- [x] Criar procedimentos protegidos para Gestor

## Fase 4: Painel Admin
- [x] CRUD de lojas (criar, listar, editar, eliminar)
- [x] CRUD de gestores (criar, listar, editar, eliminar)
- [x] Interface para associar lojas aos gestores
- [x] Visualização de todos os relatórios gerados
- [x] Dashboard com estatísticas gerais

## Fase 5: Painel Gestor
- [x] Relatório Livre: seleção de loja
- [x] Relatório Livre: data/hora automática
- [x] Relatório Livre: campo de descrição livre
- [x] Relatório Livre: campo de pendentes
- [x] Relatório Completo: estrutura multi-página
- [x] Relatório Completo: página EPIs e Fardamento
- [x] Relatório Completo: página Kit 1ºs Socorros
- [x] Relatório Completo: página Consumíveis
- [x] Relatório Completo: página Espaço Físico
- [x] Relatório Completo: página Reclamações
- [x] Relatório Completo: página Vendas Complementares
- [x] Relatório Completo: página Fichas de Serviço
- [x] Relatório Completo: página Documentação Obrigatória
- [x] Relatório Completo: página Reunião Quinzenal
- [x] Relatório Completo: página Resumo e Colaboradores
- [x] Relatório Completo: campo de pendentes
- [x] Dashboard do gestor com suas lojas

## Fase 6: Sistema de Pendentes
- [x] Listagem de pendentes por loja
- [x] Marcar pendentes como resolvidos
- [x] Filtrar pendentes por loja
- [x] Histórico de pendentes

## Fase 7: IA e Relatórios Automáticos
- [x] Relatório diário com IA
- [x] Relatório semanal com IA
- [x] Relatório mensal com IA
- [x] Relatório trimestral com IA
- [x] Análise de lojas mais/menos visitadas
- [x] Cálculo de frequência de visitas
- [x] Identificação de items positivos/negativos
- [x] Cálculo de KM percorridos entre lojas
- [x] Sugestões inteligentes da IA

## Fase 8: Sistema de Notificações
- [ ] Configurar serviço de email (requer SMTP externo: SendGrid/Mailgun/AWS SES)
- [ ] Envio de relatório completo para loja visitada
- [ ] Envio de relatório completo para gestor
- [ ] Notificações de pendentes

NOTA: Sistema de email requer configuração externa no deployment

## Fase 9: Responsividade e UX
- [x] Layout responsivo para desktop
- [x] Layout responsivo para mobile
- [x] Navegação intuitiva
- [x] Estados de loading
- [x] Tratamento de erros
- [x] Feedback visual de ações

## Fase 10: Deployment
- [x] Configurar repositório GitHub
- [ ] Configurar Railway para backend
- [ ] Configurar Neon para base de dados
- [ ] Configurar Netlify para frontend
- [ ] Variáveis de ambiente

## Fase 11: Testes e Entrega
- [ ] Testes de autenticação
- [ ] Testes de CRUD
- [ ] Testes de relatórios
- [ ] Testes de IA
- [ ] Testes de email
- [ ] Documentação final
- [ ] Checkpoint final

## Deployment Railway
- [x] Criar ficheiro railway.json
- [x] Criar ficheiro DEPLOYMENT.md com instruções completas
- [x] Criar ficheiro README.md com documentação
- [x] Fazer push para GitHub
- [x] Fornecer instruções de deploy

## Ajustes Solicitados
- [x] Remover campo morada de lojas
- [x] Remover campo morada de gestores
- [x] Atualizar formulários
- [x] Executar migração da base de dados

## Criação Manual de Gestores
- [x] Adicionar botão "Novo Gestor" na página Gestores
- [x] Criar formulário com campos Nome e Email
- [x] Implementar lógica de criação de user + gestor
- [x] Permitir associação de lojas após criação

## Correção de Erro SQL
- [x] Remover colunas latitude, longitude, ativa das queries de lojas
- [x] Verificar schema de lojas no drizzle
- [x] Testar criação de lojas e gestores

## Correção de Erro ao Listar Gestores
- [x] Corrigir getAllGestores() para fazer JOIN com users
- [x] Testar criação de gestor

## Indicador de Versão
- [x] Adicionar versão no canto inferior direito do DashboardLayout

## Correção Final de Listagem de Gestores
- [x] Simplificar getAllGestores() para retornar apenas id, nome, email, role
- [x] Testar criação e listagem sem erros

## Ajustes Finais
- [x] Alterar cor da versão de cinza para preto
- [x] Corrigir createGestor() - erro ao fazer INSERT

## Investigação de Erro Persistente
- [x] Verificar logs do servidor
- [x] Identificar causa exata do erro SQL (campos duplicados no SELECT)
- [x] Corrigir definitivamente (usar aliases específicos)

## Correção Definitiva de Erro SQL v1.7
- [x] Reescrever todas as funções de gestores em db.ts com aliases únicos
- [x] Corrigir createGestor() - eliminar variáveis result duplicadas
- [x] Corrigir getAllGestores() - usar aliases explícitos (gestorId, userName, etc)
- [x] Corrigir getGestoresByLojaId() - usar aliases para todos os campos
- [x] Corrigir resolvePendente() - usar dataResolucao em vez de resolvidoEm
- [x] Testar criação de gestor com sucesso (Fábio Dias criado)
- [x] Verificar listagem de gestores sem erros SQL

## Funcionalidade de Promoção a Admin v1.8
- [x] Adicionar função promoteGestorToAdmin() no backend (server/db.ts)
- [x] Adicionar mutation promoteToAdmin no router de gestores (server/routers.ts)
- [x] Adicionar botão "Promover a Admin" na página Gestores (frontend)
- [x] Adicionar diálogo de confirmação antes de promover
- [x] Testar promoção de gestor a admin (3 testes passaram)
- [x] Criar checkpoint v1.8

## Bug v1.8.2 - Lojas não aparecem para gestor
- [ ] Investigar função getLojasByGestorId ou similar
- [ ] Verificar se associação está a ser guardada corretamente na tabela gestor_lojas
- [ ] Corrigir query ou lógica de carregamento
- [ ] Testar com gestor "Teste" e loja "Guimarães"

## Autenticação Restrita v1.9
- [x] Modificar OAuth callback para verificar email existente antes de criar user
- [x] Atualizar openId de users "pending" quando fazem primeiro login
- [x] Rejeitar logins de emails não registados pelo admin (página /login-nao-autorizado)
- [x] Eliminar user duplicado (420018 eliminado)
- [x] Atualizar gestor "Teste" para apontar ao user correto (420030)
- [x] Testar fluxo completo de login

## Bug v1.9.1 - Erro SQL na criação de Relatório Livre
- [x] Identificar origem do erro NaN na query de relatório livre
- [x] Corrigir função createRelatorioLivre no db.ts (com fallback)
- [x] Corrigir função createRelatorioCompleto no db.ts (com fallback)
- [x] Corrigir função createLoja no db.ts (com fallback)
- [x] Corrigir função createPendente no db.ts (com fallback)
- [ ] Testar criação de relatório livre

## Funcionalidade v1.9.2 - Relatórios em Cards Expansíveis
- [x] Alterar página Relatórios (admin) para mostrar cards compactos
- [x] Alterar página MeusRelatorios (gestor) para mostrar cards compactos
- [x] Implementar expansão ao clicar para ver conteúdo completo (Collapsible)
- [x] Testar visualização em ambas as páginas

## Funcionalidades v2.0 - Filtros, PDF e Fotos
- [x] Filtros de pesquisa por loja nos relatórios
- [x] Filtros de pesquisa por data (intervalo) nos relatórios
- [x] Filtros de pesquisa por gestor nos relatórios (admin)
- [x] Exportar relatório individual para PDF (botão Download)
- [x] Exportar múltiplos relatórios para PDF (lote)
- [x] Adicionar campo de fotos no schema de relatórios
- [x] Upload de fotos no formulário de relatório livre
- [x] Upload de fotos no formulário de relatório completo
- [x] Visualização de fotos nos cards de relatório
- [x] Testar todas as funcionalidades

## Funcionalidades v2.1 - Notificações, Gráficos e Relatório Mensal
- [x] Sistema de notificações push para pendentes há mais de 7 dias (alerta visual)
- [x] Criar componente de alerta no dashboard para pendentes antigos
- [x] Dashboard com gráfico de evolução de visitas ao longo do tempo (linha)
- [x] Dashboard com gráfico de pendentes por loja (barras)
- [x] Exportar relatório mensal consolidado em PDF
- [x] Resumo por loja no relatório mensal
- [x] Estatísticas de visitas e pendentes no relatório mensal
- [x] Testar todas as funcionalidades

## Funcionalidades v2.2 - Comparação, Email e Modo Escuro
- [x] Comparação mensal com variação percentual nos cards de estatísticas (já implementado em v2.1)
- [x] Indicadores visuais de subida/descida (setas verdes/vermelhas) (já implementado em v2.1)
- [x] Sistema de notificações semanal ao owner (via notifyOwner - já implementado)
- [x] Resumo de pendentes e visitas na notificação (weeklyReport.ts)
- [x] Toggle de modo escuro/claro (botão flutuante no canto inferior direito)
- [x] Persistir preferência de tema no localStorage (via ThemeProvider)
- [x] Testar todas as funcionalidades

## Funcionalidades v2.3 - Melhorias nos Relatórios
- [x] Remover km percorridos do relatório de IA
- [x] Adicionar campo "Pontos Positivos a Destacar" no relatório completo
- [x] Adicionar campo "Pontos Negativos a Destacar" no relatório completo
- [x] Incluir análise dos pontos positivos/negativos no relatório de IA
- [x] Testar todas as alterações

## Funcionalidades v2.4 - Histórico, Alertas e Exportação PDF
- [x] Histórico de pontos destacados por loja (evolução ao longo do tempo)
- [x] Página dedicada para visualizar histórico de pontos positivos/negativos
- [x] Estatísticas de pontos por loja com cards interativos
- [x] Sistema de alertas automáticos para lojas com 3+ pontos negativos consecutivos
- [x] Notificação ao admin quando alerta é disparado (após criar relatório completo)
- [x] Alertas incluídos no relatório semanal
- [x] Exportar relatório IA para PDF
- [x] Botão de download PDF na página de Relatórios IA
- [x] Testar todas as funcionalidades

## Funcionalidades v2.5 - Melhorias Visuais e Dashboard de Alertas
- [x] Cores suaves nos cards do dashboard para melhor distinção visual
- [x] Filtro por período no histórico de pontos (seletor de datas)
- [x] Comparação entre lojas (vista lado-a-lado)
- [x] Dashboard de alertas dedicado
- [x] Estados de alerta: "pendente" e "resolvido"
- [x] Testar todas as funcionalidades

## Funcionalidades v2.6 - Notificações e Configurações de Alertas
- [x] Badge de contagem de alertas pendentes no menu lateral
- [x] Atualização em tempo real do badge quando alertas mudam (a cada 30s)
- [x] Página de configurações de alertas
- [x] Configurar threshold de pontos negativos consecutivos
- [x] Guardar configurações na base de dados
- [x] Testar todas as funcionalidades

## Correção v2.6.1 - Cores dos Cards
- [x] Aumentar intensidade das cores nos cards do dashboard
- [x] Garantir boa visibilidade em modo escuro
- [x] Testar em ambos os modos (claro e escuro)

## Funcionalidade v2.6.2 - Animação nos Cards
- [x] Animação de pulse suave nos cards quando há dados novos
- [x] Piscar suavemente para chamar atenção a mudanças
- [x] Testar animação

## Funcionalidade v2.6.3 - Cards Clicáveis
- [x] Tornar cards do dashboard clicáveis
- [x] Navegar para página correspondente ao clicar
- [x] Adicionar efeito hover para indicar interatividade
- [x] Testar navegação

## Funcionalidades v2.7 - Breadcrumbs e Atalhos de Teclado
- [x] Breadcrumbs de navegação no topo das páginas
- [x] Trilho de navegação para facilitar retorno
- [x] Atalhos de teclado para navegação rápida
- [x] D=Dashboard, L=Lojas, G=Gestores, R=Relatórios, P=Pendentes, I=IA, H=Histórico, A=Alertas
- [x] Indicador visual dos atalhos disponíveis (botão com ícone de teclado)
- [x] Testar todas as funcionalidades

## Funcionalidades v2.8 - Sistema de Itens Não Vistos
- [x] Adicionar campo 'visto' ao schema de relatórios livres
- [x] Adicionar campo 'visto' ao schema de relatórios completos
- [x] Adicionar campo 'visto' ao schema de pendentes
- [x] Criar procedure para marcar como visto ao visualizar
- [x] Atualizar dashboard para contar apenas itens não vistos
- [x] Cards mostram contagem de novos (não vistos) com badge colorido
- [x] Ao clicar no card ou ver lista, marcar como vistos automaticamente
- [x] Testar todas as funcionalidades

## Funcionalidades v2.9 - Filtro de Não Vistos
- [x] Adicionar opção de filtrar apenas itens não vistos na lista de relatórios
- [x] Adicionar opção de filtrar apenas itens não vistos na lista de pendentes
- [x] Toggle visual para alternar entre "Todos" e "Não vistos"
- [x] Manter estado do filtro durante a sessão
- [x] Testar todas as funcionalidades

## Funcionalidades v3.0 - Gestão de Relatórios
- [x] Adicionar funcionalidade de apagar relatórios livres
- [x] Adicionar funcionalidade de apagar relatórios completos
- [x] Adicionar funcionalidade de editar relatórios livres
- [x] Adicionar funcionalidade de editar relatórios completos
- [x] Reorganizar visualização para admin: mostrar "Gestor → Loja"
- [x] Reorganizar visualização para gestor: mostrar apenas "Loja"
- [x] Adicionar confirmação antes de apagar
- [x] Testar todas as funcionalidades

## Funcionalidade v3.0.1 - Título Personalizado
- [x] Alterar título do dashboard para mostrar nome do utilizador
- [x] Testar alteração

## Funcionalidade v3.1 - Dica IA no Dashboard
- [x] Criar procedure backend para gerar dica personalizada com IA
- [x] Analisar dados do dashboard (pendentes, relatórios, alertas) para contexto
- [x] Adicionar componente de dica abaixo do "Bem-vindo"
- [x] Atualizar dica periodicamente ou ao carregar página (botão de refresh)
- [x] Testar funcionalidade

## Correção v3.1.1 - Dicas Diferenciadas por Role
- [x] Admin: Dicas baseadas em novos relatórios, pendentes, alertas e dados da plataforma
- [x] Gestores: Dicas de gestão, motivação e boas práticas para as lojas
- [x] Testar ambos os tipos de dicas

## Funcionalidade v3.2 - Envio de Relatório por Email
- [x] Adicionar campo de email ao cadastro de lojas (já existe)
- [x] Criar serviço de geração de HTML do relatório
- [x] Criar serviço de envio de email
- [x] Adicionar botão "Enviar" no final de cada relatório livre
- [x] Mostrar confirmação após envio bem-sucedido (toast)
- [x] Testar funcionalidade completa

## Funcionalidade v3.3 - Editar Gestores
- [x] Adicionar procedure de update para gestores no backend
- [ ] Criar modal de edição com campos: nome, email, telefone
- [ ] Adicionar botão de editar na lista de gestores
- [ ] Validar campos antes de guardar
- [ ] Testar funcionalidade completa

## Funcionalidade v3.3 - Edição de Gestores
- [x] Adicionar botão de editar na tabela de gestores
- [x] Criar modal de edição com campos Nome e Email
- [x] Implementar mutation de atualização no frontend
- [x] Endpoint de update já existente no backend
- [x] Função updateGestor já existente no db.ts
- [x] Validação de email no formulário
- [x] Toast de sucesso/erro após atualização
- [x] Criar testes unitários para edição de gestores
- [x] Testar funcionalidade completa

## Funcionalidades Inovadoras v3.4

### 2.2 Previsão de Problemas com IA
- [x] Criar função de análise de padrões históricos
- [x] Gerar alertas preditivos baseados em tendências
- [x] Mostrar previsões no dashboard do admin
- [x] Card "Previsões da Semana" com código de cores

### 2.3 Sugestões de Melhoria Automáticas
- [x] Analisar conteúdo do relatório após submissão
- [x] Gerar sugestões contextuais com IA
- [x] Guardar histórico de sugestões
- [ ] Mostrar sugestões em modal/toast após criar relatório (pendente UI)

### 4.3 Feed de Atividade para Admin
- [x] Criar tabela de atividades no schema
- [x] Registar atividades: visitas, pendentes resolvidos, alertas
- [x] Componente de timeline no dashboard admin
- [ ] Atualização em tempo real do feed (futuro)

### 6.1 Agendamento Automático de Visitas
- [x] Criar lógica de sugestão de visitas baseada em critérios
- [x] Considerar: tempo desde última visita, pendentes, alertas
- [x] Gerar plano semanal às sextas-feiras
- [x] Interface para visualizar e aceitar/modificar plano
- [ ] Notificar gestores com plano sugerido (futuro)

## Remoção - Plano de Visitas v3.5

- [x] Remover link do menu lateral (DashboardLayout.tsx)
- [x] Remover rota do App.tsx
- [x] Remover página PlanoVisitas.tsx
- [x] Manter tabelas e serviços no backend (podem ser úteis futuramente)

## Renomeação PWA v6.4.5
- [x] Renomear "Assistente IA" para "PoweringEG" na página de instalação PWA
- [x] Alterar manifest para nome "PoweringEG" (nome da app instalada)

## Bug v6.4.4 - Traduções em falta no modal de edição de loja
- [x] Corrigir labels common.descricao, common.nome, common.email, common.guardar
- [x] Verificar se há outras traduções em falta (duplicação da chave 'common' no pt.json)

## Bug v6.4.2 - Botão de instalação PWA não funciona
- [x] Melhorar lógica de deteção do evento beforeinstallprompt
- [x] Adicionar fallback mais robusto quando evento não é capturado
- [x] Criar service worker dedicado para o Assistente IA
- [x] Corrigir start_url no manifest
- [x] Adicionar modo debug para diagnóstico
- [x] Testar em diferentes browsers

## Bug v6.4.1 - Manifest PWA do Assistente IA
- [x] Corrigir manifest PWA para mostrar "Assistente IA" durante instalação (atualmente mostra "Tarefas")

## Botão de Instalação PWA v6.4
- [x] Corrigir visibilidade do botão PWA em mobile (não está visível na interface)
- [x] Adicionar botão de instalação PWA na página Assistente IA
- [ ] Tornar botão de instalação PWA mais visível no AssistenteWidget

## Tradução Completa v5.0
- [ ] Traduzir TODOS os textos hardcoded em TODAS as páginas da aplicação
- [ ] Atualizar ficheiros de tradução PT e EN

## Bug v4.2 - Envio de Email de Relatório mostra "0 gestores"
- [x] Corrigir getAllGestores() para retornar email no campo correto
- [x] O backend procura gestor.email mas getAllGestores retorna user.email
- [ ] Testar envio de email após correção

## Bug - Erro React hooks na página ReuniõesGestores
- [x] Corrigir early return antes dos hooks (linha 30)
- [x] Mover verificação de user para depois de todos os hooks

## Bug v3.7.1 - Erro map undefined em Relatórios IA
- [x] Corrigir erro "Cannot read properties of undefined (reading 'map')" na página Relatórios IA
- [x] Adicionar verificações de null/undefined antes de usar .map()

## Gráficos no Portal - Histórico da Loja v3.6

- [x] Adicionar gráfico de Taxa de Reparação na página Histórico da Loja
- [x] Adicionar gráfico de Vendas Complementares na página Histórico da Loja
- [x] Adicionar alerta visual para % escovas abaixo de 7.5% nos gráficos

## Modal de Sugestões Pós-Relatório v3.6

- [x] Criar endpoint para obter sugestões por relatório
- [x] Criar componente SugestoesModal
- [x] Integrar modal no RelatorioLivre após submissão
- [x] Integrar modal no RelatorioCompleto após submissão
- [x] Testar funcionalidade completa

## Sistema de Categorização de Relatórios v3.7

### Estrutura de Dados
- [x] Criar tabela de categorias no schema
- [x] Adicionar campos categoria e estado aos relatórios
- [x] Criar funções de base de dados para categorias

### Campo de Categoria com Autocomplete
- [x] Endpoint para listar categorias existentes
- [x] Endpoint para atualizar categoria do relatório
- [x] Componente de autocomplete com sugestões

### Estados de Acompanhamento
- [x] Estados: Acompanhar, Em Tratamento, Tratado
- [x] Endpoint para atualizar estado
- [x] UI para alterar estado nos relatórios

### Página de Categorias
- [x] Nova página no menu admin
- [x] Agrupamento de relatórios por categoria
- [x] Filtros por estado
- [x] Contadores por categoria/estado

## Pendentes ao Criar Relatório v3.8

### Funcionalidade
- [x] Ao selecionar loja, mostrar pendentes ativos dessa loja
- [x] Cada pendente com opção: "Resolvido" ou "Continua até próxima visita"
- [x] Integrar no RelatorioLivre
- [x] Integrar no RelatorioCompleto
- [x] Atualizar estado dos pendentes ao submeter relatório

## Visualização de Relatórios nas Categorias v3.9

### Bug/Melhoria
- [ ] Permitir clicar no relatório para ver conteúdo completo
- [ ] Criar modal com detalhes do relatório
- [ ] Mostrar descrição, pendentes, fotos e dados completos

## Visualização de Relatórios nas Categorias v3.9

- [x] Criar modal de detalhes do relatório (RelatorioDetalheModal)
- [x] Adicionar endpoints getById para relatórios livres e completos
- [x] Adicionar clique no card para abrir modal
- [x] Mostrar todos os campos do relatório no modal
- [x] Mostrar fotos e pendentes no modal

## Melhorias nas Categorias v4.0

### Edição de Categoria Inline
- [x] Adicionar campo editável de categoria no modal de detalhes
- [x] Usar componente CategoriaAutocomplete existente
- [x] Atualizar categoria ao sair do campo

### Comentários do Admin
- [x] Adicionar campo comentarioAdmin ao schema de relatórios
- [x] Criar endpoint para atualizar comentário
- [x] Campo de texto no modal para adicionar/editar comentário
- [x] Mostrar comentário existente no modal

### Exportar Categoria para PDF
- [x] Botão de exportar na página de Categorias
- [x] Gerar HTML com todos os relatórios da categoria
- [x] Incluir resumo estatístico no início do documento

## Melhorias Categorias e Pendentes Admin v4.1

### Cards Clicáveis como Filtro
- [x] Tornar cards de estatísticas clicáveis
- [x] Ao clicar, filtrar relatórios por estado correspondente
- [x] Destacar card selecionado visualmente

### Adicionar Pendentes no Modal de Relatório
- [x] Botão para criar novo pendente no modal de detalhes
- [x] Formulário para adicionar descrição do pendente
- [x] Associar pendente à loja do relatório

### Separador Pendentes no Menu Admin
- [x] Criar página PendentesAdmin.tsx
- [x] Listar todos os pendentes de todas as lojas
- [x] Filtros por loja, estado (resolvido/pendente)
- [x] Adicionar link no menu lateral do admin

## Notificações e Prazos nos Pendentes v4.2

### Notificação ao Gestor
- [x] Enviar notificação quando admin cria pendente
- [x] Identificar gestor responsável pela loja
- [x] Usar sistema de notificações existente (atividade registada)

### Prazo nos Pendentes
- [x] Adicionar campo dataLimite ao schema de pendentes
- [x] UI para definir prazo ao criar pendente
- [x] Destaque visual para pendentes vencidos ou próximos do vencimento
- [x] Badge de alerta nos pendentes com prazo expirado

## Bug Fix - Meus Relatórios v4.3

- [x] Corrigir exibição do nome da loja na página Meus Relatórios (mostra "Loja" em vez do nome real)

## Melhorias Meus Relatórios v4.4

### Filtro por Loja
- [x] Dropdown para selecionar loja específica
- [x] Opção "Todas as lojas" para limpar filtro
- [x] Aplicar filtro em ambas as tabs (Livres e Completos)

### Pesquisa por Texto
- [x] Campo de pesquisa para buscar pela descrição
- [x] Pesquisa em tempo real enquanto digita
- [x] Filtro aplicado automaticamente

### Ordenação
- [x] Botões para ordenar por data (recente/antigo)
- [x] Botão para ordenar por loja (A-Z)
- [x] Dropdown com opções de ordenação

## Bug Fix - Pendentes Gestor v4.5

- [x] Corrigir exibição do nome da loja na página Pendentes do gestor (mostra "Loja" em vez do nome real)

## Correções v4.6

### Checkbox Pendente Editável
- [x] Permitir desmarcar checkbox do pendente após marcar
- [x] Adicionar mutation para desmarcar pendente como não resolvido

### Data/Hora Personalizada nos Relatórios
- [ ] Adicionar campo de data/hora nos formulários de relatório
- [ ] Usar data/hora escolhida em vez de automática
- [ ] Validar que data não é futura

## Funcionalidades v4.6 - Data/Hora Personalizada e Pendentes Editáveis
- [x] Checkbox de pendentes editável (já estava implementado - unresolve mutation)
- [x] Adicionar campo de data/hora personalizada no formulário de Relatório Livre
- [x] Adicionar campo de data/hora personalizada no formulário de Relatório Completo
- [x] Validação para não permitir datas futuras (max=data atual)
- [x] Usar data personalizada se fornecida, senão usar data atual
- [x] Corrigir bug no createGestor - adicionar fallback para userId e gestorId quando insertId é NaN
- [x] Criar testes unitários para data/hora personalizada (4 testes passaram)
- [x] Testar criação de relatórios com data personalizada

## Bug v4.6.1 - Erro ao Enviar Email de Relatório
- [x] Investigar causa do erro "Falha ao enviar email" nos relatórios livres
- [x] Verificar função sendEmail no emailService.ts
- [x] Identificado: API de email da Manus não existe (404)
- [x] Configurar Gmail SMTP como alternativa
- [x] Adicionar credenciais SMTP como secrets (egpowering@gmail.com)
- [x] Instalar nodemailer
- [x] Reescrever sendEmail para usar Gmail SMTP
- [x] Testar envio de email com sucesso (teste passou)

## Funcionalidade v4.7.1 - Confirmação Automática de Envio de Email
- [x] Adicionar diálogo de confirmação após criar relatório livre
- [x] Adicionar diálogo de confirmação após criar relatório completo
- [x] Perguntar "Deseja enviar este relatório por email para a loja?"
- [x] Botões: "Enviar Email" e "Não Enviar"
- [x] Criar componente EmailConfirmDialog
- [x] Adicionar mutation enviarEmail para relatórios completos
- [x] Fluxo: Email Dialog → Sugestões Modal → Meus Relatórios

## Melhoria v4.8.1 - Rodapé de Email Personalizado
- [x] Alterar rodapé do email de relatório livre para mostrar nome do gestor
- [x] Alterar rodapé do email de relatório completo para mostrar nome do gestor
- [x] Formato: "Relatório enviado por [Nome do Gestor] via PoweringEG Platform - [Data/Hora]"
- [x] Aplicado em ambos os templates com uma única edição

## Funcionalidade v4.8.2 - Fotos nos Emails de Relatórios
- [x] Atualizar template HTML de relatório livre para incluir seção de fotos
- [x] Atualizar template HTML de relatório completo para incluir seção de fotos
- [x] Adicionar parâmetro fotos nas funções de geração de HTML
- [x] Parsear fotos do JSON no backend
- [x] Atualizar mutations enviarEmail para buscar e passar fotos
- [x] Grid responsivo de fotos no email (200px por foto)
- [x] Fotos só aparecem se o relatório tiver fotos anexadas

## Funcionalidade v4.9.1 - Compressão Automática de Fotos
- [x] Adicionar biblioteca browser-image-compression ao projeto
- [x] Implementar função de compressão no RelatorioLivre.tsx
- [x] Implementar função de compressão no RelatorioCompleto.tsx
- [x] Configurar: max 1920px largura, max 1MB, formato JPEG
- [x] Remover validação de 5MB (já não necessária com compressão)
- [x] Usar Web Worker para não bloquear UI durante compressão

## Funcionalidade v4.11 - Lembretes Quinzenais de Relatório IA
- [x] Adicionar campo lastReminderDate na tabela gestores
- [x] Migrar schema com db:push (migração 0013)
- [x] Criar funções checkReminderNeeded e updateReminderDate no db.ts
- [x] Criar procedures checkReminder e dismissReminder no backend
- [x] Criar componente ReminderDialog no frontend
- [x] Integrar verificação automática no Dashboard
- [x] Popup aparece de 15 em 15 dias sugerindo relatório IA
- [x] Botão "Gerar Relatório IA" redireciona para /relatorios-ia
- [x] Botão "Lembrar Mais Tarde" atualiza lastReminderDate
- [x] Design elegante com ícone Sparkles e lista de benefícios

## Funcionalidade v5.0 - Relatórios por Voz (Ponto 4)
- [x] Criar componente VoiceRecorder com gravação de áudio
- [x] Implementar upload automático para S3
- [x] Criar backend de transcrição usando Whisper API
- [x] Criar processamento inteligente com LLM para estruturar relatórios
- [x] Adicionar router voiceTranscription no backend
- [x] Integrar VoiceRecorder no Relatório Livre
- [x] Integrar VoiceRecorder no Relatório Completo
- [x] Adicionar handler de transcrição que preenche campos automaticamente
- [x] Componente mostra feedback visual (tempo, tamanho, estado)
- [x] Processamento automático preenche descrição, categoria, estado, pendentes

## Funcionalidade v5.1 - Análise Automática de Fotos
- [x] Criar backend para análise de imagens com Vision API (GPT-4 Vision)
- [x] Identificar problemas visíveis (vidros rachados, desorganização, sinalética)
- [x] Gerar pendentes sugeridos automaticamente
- [x] Adicionar descrições contextuais às fotos
- [x] Integrar análise no upload de fotos do Relatório Livre
- [x] Integrar análise no upload de fotos do Relatório Completo
- [x] Mostrar resultados da análise ao gestor com toasts
- [x] Pendentes sugeridos adicionados automaticamente à lista

## Funcionalidade v5.2 - Histórico Inteligente da Loja
- [x] Criar página "Histórico da Loja" no menu Relatórios (apenas gestor)
- [x] Seletor de loja na página
- [x] Backend: buscar todos os relatórios da loja (livres + completos + pendentes)
- [x] Backend: processar com IA para gerar resumo inteligente
- [x] Mostrar evolução ao longo do tempo dividida em períodos
- [x] Identificar problemas recorrentes com frequência e gravidade
- [x] Destacar pontos fortes consistentes
- [x] Analisar tendências e padrões
- [x] Gerar recomendações prioritárias com justificativa
- [x] Design visual atrativo com cards coloridos e ícones

## Melhoria v5.2.1 - Histórico da Loja para Admin
- [x] Adicionar item "Histórico da Loja" no menu do admin
- [x] Atualizar página para mostrar todas as lojas ao admin (não apenas as do gestor)
- [x] Admin pode selecionar qualquer loja da rede (9 lojas)
- [x] Análise baseada em relatórios de todos os gestores
- [x] Alterar procedure de gestorProcedure para protectedProcedure
- [x] Item aparece no menu do admin

## Ajuste v5.2.2 - Remover Campo Contacto das Lojas
- [x] Remover campo contacto do formulário de criação de loja
- [x] Remover campo contacto do formulário de edição de loja
- [x] Remover campo contacto da visualização de detalhes da loja (tabela)
- [x] Atualizar validações no backend (remover contacto de create/update)
- [x] Remover coluna Contacto da tabela de lojas
- [x] Manter apenas email como campo de contacto
- [x] Campo contacto continua na BD mas não aparece na UI

## Funcionalidade v5.5 - Seleção Múltipla de Lojas nos Relatórios
- [ ] Adicionar campo lojasIds (TEXT, opcional) ao schema
- [ ] Migrar schema com db:push
- [ ] Substituir Select por multi-select no Relatório Livre
- [ ] Substituir Select por multi-select no Relatório Completo
- [ ] Atualizar backend para guardar array em lojasIds
- [ ] Primeira loja do array vai para lojaId (compatibilidade)
- [ ] Testar criação de relatório com múltiplas lojas
- [ ] Apenas para novos relatórios (sem efeito retroativo)

## Funcionalidade v5.3 - Seleção Múltipla de Lojas nos Relatórios
- [x] Adicionar campo lojasIds (TEXT com JSON array) ao schema de relatoriosLivres
- [x] Adicionar campo lojasIds (TEXT com JSON array) ao schema de relatoriosCompletos
- [x] Substituir Select simples por multi-select com checkboxes no Relatório Livre
- [x] Substituir Select simples por multi-select com checkboxes no Relatório Completo
- [x] Atualizar backend para aceitar lojasIds array no create de relatórios livres
- [x] Atualizar backend para aceitar lojasIds array no create de relatórios completos
- [x] Guardar primeira loja em lojaId para compatibilidade com queries existentes
- [x] Guardar array completo de lojas em lojasIds como JSON
- [x] Registar atividades para todas as lojas selecionadas
- [x] Criar testes unitários (5 testes passaram com sucesso)
- [x] Testar criação de relatório com múltiplas lojas
- [x] Testar criação de relatório com apenas 1 loja (compatibilidade)
- [x] Testar rejeição de relatório sem lojas selecionadas

## Bug v5.3.1 - Erro na página Meus Relatórios
- [x] Identificar componente Select que causa erro "value prop must not be an empty string"
- [x] Corrigir Select para aceitar valor vazio ou usar valor padrão ("todas")
- [x] Atualizar lógica de filtro para considerar "todas" como sem filtro
- [x] Testar página Meus Relatórios sem erros
- [x] Guardar checkpoint

## Bug v5.3.2 - Erro ao processar áudio no Relatório por Voz
- [x] Investigar causa do erro "Erro ao processar áudio. Tente novamente."
- [x] Corrigir VoiceRecorder para usar tRPC client em vez de fetch manual
- [x] Verificar implementação do backend de transcrição
- [x] Criar testes unitários para validação (5 testes passaram)
- [x] Guardar checkpoint

## Bug v5.3.3 - Erro persistente ao processar áudio (após correção v5.3.2)
- [ ] Verificar logs do servidor para identificar erro exato
- [ ] Adicionar logging detalhado no VoiceRecorder e backend
- [ ] Verificar se variáveis de ambiente estão corretas
- [ ] Corrigir problema identificado
- [ ] Testar com áudio real gravado no mobile
- [ ] Guardar checkpoint

## Bug v5.3.4 - Erro ao fazer upload do áudio para S3
- [x] Identificado problema: upload direto do frontend para S3 falhava
- [x] Implementado novo endpoint tRPC uploadAudio no backend
- [x] Upload agora passa pelo backend (mais seguro e confiável)
- [x] Blob convertido para base64 e enviado via tRPC
- [x] Backend faz upload para S3 usando storagePut
- [x] Guardar checkpoint para publicação

## Bug v5.3.5 - Erro "Buffer is not defined" no frontend
- [x] Identificado problema: Buffer não existe no browser (apenas Node.js)
- [x] Substituído Buffer.from() por FileReader (API nativa do browser)
- [x] FileReader.readAsDataURL converte blob para base64
- [x] Removido prefixo "data:audio/...;base64," do resultado
- [x] Guardar checkpoint e publicar

## Bug v5.3.6 - Erro "Transcription service request failed"
- [x] Verificar logs do servidor (sem logs encontrados)
- [x] Adicionar logging detalhado na função transcribeAudio
- [x] Logs adicionados em todas as etapas (validação, download, API call)
- [ ] Publicar checkpoint com logging
- [ ] Testar com áudio real e verificar logs
- [ ] Identificar causa exata do erro
- [ ] Corrigir problema identificado

## Bug v5.3.7 - Formato webm rejeitado pela API Whisper
- [x] Identificado erro: "Invalid file format" apesar de webm estar na lista
- [x] Alterada ordem de preferência: mp4 > wav > mpeg > webm
- [x] Melhorada função getFileExtension para limpar codecs
- [x] Adicionado logging de mimeType e nome de ficheiro
- [x] Testado com sucesso no PC (transcrição funcionou)
- [x] Guardar checkpoint e publicar

## Funcionalidade v5.4 - Importação de Lojas por Excel
- [ ] Criar endpoint backend para processar ficheiro Excel
- [ ] Validar formato e dados do Excel (nome, localização obrigatórios)
- [ ] Criar interface frontend com botão de upload
- [ ] Adicionar preview de lojas antes de importar
- [ ] Testar com ficheiro de exemplo
- [ ] Criar documentação de formato esperado
- [ ] Guardar checkpoint

## Funcionalidade v5.4 - Importação de Lojas por Excel ✅
- [x] Criar endpoint backend para processar ficheiro Excel
- [x] Validar formato e dados do Excel (nome obrigatório, email opcional)
- [x] Criar interface frontend com botão de upload
- [x] Adicionar preview de lojas antes de importar
- [x] Testar com ficheiro de exemplo (5 testes unitários passaram)
- [x] Criar documentação de formato esperado (botão de template)
- [x] Guardar checkpoint (v5.4 - 8bce2ad2)

## Correção v5.4.1 - Ajustes na Importação de Excel
- [x] Remover campo Localização do template Excel
- [x] Remover coluna Localização do preview
- [x] Template deve ter apenas: Nome (coluna A) e Email (coluna B)
- [x] Verificar se loja com mesmo nome já existe antes de criar
- [x] Ignorar duplicados em vez de criar ou dar erro
- [x] Atualizar testes unitários (6 testes passaram)
- [x] Guardar checkpoint (v5.4.1 - 14d14293)

## Correção v5.4.2 - Contagem de Gestores
- [x] Corrigir contagem de gestores no dashboard para excluir admins
- [x] Filtrar apenas users com role='gestor' (não contar role='admin')
- [x] Verificar outras queries que possam estar a contar admins como gestores
- [x] Testar contagem no dashboard (agora mostra 6 gestores)
- [x] Guardar checkpoint (v5.4.2 - d0941068)

## Funcionalidade v5.5 - Compressão Automática de Fotos
- [x] Remover limite de 5MB no upload de fotos (texto atualizado)
- [x] Implementar compressão de imagens no frontend (browser-image-compression já estava instalado)
- [x] Comprimir para máximo 1920px de largura/altura
- [x] Qualidade JPEG: 80% (balanço qualidade/tamanho)
- [x] Mostrar progresso durante compressão (toast automático)
- [ ] Testar com fotos grandes (10MB+) de telemóvel (requer teste no mobile)
- [x] Guardar checkpoint (v5.5 - 01c37117)

## Funcionalidade v5.6 - Tirar Foto Diretamente pela Câmara
- [x] Adicionar botão "Tirar Foto" separado de "Carregar Ficheiro"
- [x] Usar atributo capture="environment" para câmara traseira
- [x] Manter botão "Carregar Ficheiro" para galeria
- [x] Aplicar em RelatorioLivre.tsx
- [x] Aplicar em RelatorioCompleto.tsx
- [ ] Testar no telemóvel (requer teste no mobile)
- [x] Guardar checkpoint (v5.6 - 8b5c5329)

## Correção v5.6.1 - Links dos Cards de Relatórios no Dashboard
- [x] Separar navegação dos cards de Relatórios Livres e Completos
- [x] Card "Relatórios Livres" vai para /relatorios?tipo=livres
- [x] Card "Relatórios Completos" vai para /relatorios?tipo=completos
- [x] Página Relatorios lê query param e abre aba correspondente
- [x] Guardar checkpoint (v5.6.1 - 34e37625)

## Funcionalidade v5.7 - Resumo Global com IA
- [x] Criar página ResumoGlobal.tsx
- [x] Adicionar rota /resumo-global no App.tsx
- [x] Adicionar item no menu lateral (DashboardLayout) para gestores
- [x] Criar endpoint backend para gerar resumo com IA (resumoGlobalService.ts)
- [x] Agregar dados de todos os relatórios (livres + completos) dos últimos 30 dias
- [x] Gerar análise IA: resumo executivo, pontos positivos/negativos, ações recomendadas, insights
- [x] Estatísticas: total visitas, pendentes ativos, lojas visitadas, taxa resolução
- [x] Design da página com cards e visualizações
- [x] Criar testes unitários (2 testes passaram)
- [x] Guardar checkpoint (v5.7 - 433302b9)

## Bug v5.7.1 - Botões de Foto Não Funcionam no Mobile
- [x] Adicionar logs de debug detalhados
- [x] Adicionar validação de env vars (FORGE_API_URL, FORGE_API_KEY)
- [x] Logs de compressão (tamanho antes/depois)
- [x] Logs de resposta do servidor
- [x] Aplicar em RelatorioLivre.tsx e RelatorioCompleto.tsx
- [x] Testar no mobile e verificar console do browser
- [x] Problema identificado: endpoint /storage/upload retorna 404
- [x] Guardar checkpoint (v5.7.1 - e957d9b3)

## Bug v5.7.2 - Corrigir Endpoint de Upload (404)
- [x] Verificar endpoint correto da API Forge para upload (/v1/storage/upload com query param path)
- [x] Criar endpoint backend dedicado (photoAnalysis.uploadPhoto)
- [x] Usar storagePut do backend em vez de fetch direto do frontend
- [x] Converter foto para base64 e enviar via tRPC
- [x] Atualizar RelatorioLivre.tsx
- [x] Atualizar RelatorioCompleto.tsx
- [x] Remover imports não usados (FORGE_API_URL, FORGE_API_KEY)
- [ ] Testar upload novamente no mobile
- [x] Guardar checkpoint (v5.7.2 - a7680ef3)

## Melhoria v5.7.3 - Ordenar Lojas Alfabeticamente
- [x] Ordenar lista de lojas por nome (A-Z) em RelatorioLivre.tsx
- [x] Ordenar lista de lojas por nome (A-Z) em RelatorioCompleto.tsx
- [x] Guardar checkpoint (v5.7.3 - eda69faa)

## Correção v5.7.4 - Fotos como Anexos em Emails
- [x] Modificar envio de emails para anexar fotos diretamente
- [x] Fazer download das fotos do S3 antes de enviar email
- [x] Adicionar fotos como attachments no nodemailer (base64)
- [x] Remover fotos inline do template HTML
- [x] Adicionar mensagem informativa sobre anexos
- [x] Aplicar em Relatório Livre e Relatório Completo
- [ ] Testar envio de email com múltiplas fotos (requer teste real)
- [x] Guardar checkpoint (v5.7.4 - f90ccbe7)
- [x] Atualizar número de versão no DashboardLayout.tsx

## Funcionalidade v5.8 - Relatório IA por Categorias para Board
- [x] Adicionar botão "Gerar Relatório IA" na página Categorias
- [x] Criar endpoint backend para gerar relatório por categorias (relatorioCategoriasService.ts)
- [x] Agregar pendentes por categoria e status (acompanhar, tratado, etc.)
- [x] Calcular métricas: total por categoria, taxa resolução
- [x] Gerar análise IA estruturada:
  - Resumo executivo por categoria
  - Categorias críticas (mais pendentes ativos)
  - Tendências (aumento/diminuição vs período anterior)
  - Comparação entre zonas por categoria
  - Recomendações prioritárias para board
- [x] Interface para visualizar relatório gerado (Dialog com Streamdown)
- [x] Opção de descarregar Markdown
- [x] Criar testes unitários (2 testes passaram em 34s)
- [x] Guardar checkpoint (v5.8 - 71b682c1)

## Funcionalidade v5.9 - Histórico de Relatórios IA por Categorias
- [x] Criar tabela no banco de dados para armazenar relatórios IA gerados
- [x] Campos: id, conteudo, createdAt, geradoPor (userId), versao
- [x] Salvar relatório IA automaticamente após geração
- [x] Criar endpoint para listar histórico (ordenado por data DESC)
- [x] Adicionar secção "Histórico de Relatórios IA" na página Categorias
- [x] Mostrar lista com: data, gerado por, botão "Visualizar"
- [x] Dialog de visualização para relatórios históricos
- [x] Expandir/colapsar lista (mostrar 3 por padrão)
- [x] Criar testes unitários (2 testes passaram em 12.5s)
- [x] Guardar checkpoint (v5.9 - 7758366a)

## Funcionalidade v5.10 - Gráficos Visuais no Relatório IA por Categorias
- [x] Modificar endpoint para retornar dados estruturados para gráficos
- [x] Calcular dados: distribuição status, taxa resolução, top 5 críticas
- [x] Instalar react-chartjs-2 e chart.js
- [x] Criar componente GraficosRelatorioIA.tsx com Chart.js
- [x] Gráfico 1: Distribuição de status por categoria (barras empilhadas)
- [x] Gráfico 2: Taxa de resolução por categoria (barras horizontais com cores)
- [x] Gráfico 3: Top 5 categorias críticas (barras)
- [x] Integrar gráficos no dialog RelatorioIACategorias com Tabs
- [x] Tabs: Gráficos (padrão) e Análise IA
- [x] Criar testes unitários (4 testes)
- [x] Guardar checkpoint (v5.10 - adff0927)

## Funcionalidade v5.11 - Visualização Completa de Pendentes Gerados por IA
- [x] Criar componente Dialog para visualizar pendente completo (VisualizarPendente.tsx)
- [x] Mostrar texto completo do pendente
- [x] Adicionar botão de editar com modo edição inline
- [x] Tornar pendentes clicáveis com ícone Eye
- [x] Aplicar em RelatorioLivre.tsx
- [x] Testar visualização (status OK, sem erros TypeScript)
- [x] Guardar checkpoint (v5.11 - eaabd3bf)

## Bug v5.11 - Pendentes Sem Loja (Admin)
- [x] Investigar por que pendentes aparecem como "Sem loja" para admin
- [x] Verificar query getPendentes() e joins com tabela lojas
- [x] Corrigir associação de loja aos pendentes
- [x] Testar visualização de pendentes no painel admin

## Funcionalidade v5.13 - Histórico de Relatórios IA para Gestores
- [x] Criar procedure getRelatoriosIAByGestor() no backend
- [x] Filtrar relatórios IA apenas das lojas do gestor
- [x] Criar página HistoricoRelatoriosIA.tsx para gestores
- [x] Adicionar filtros: tipo (semanal/mensal/trimestral), período (data início/fim)
- [x] Cards expansíveis para visualizar conteúdo completo de cada relatório
- [x] Botão de download PDF para cada relatório
- [x] Adicionar link no menu lateral do gestor
- [x] Testar funcionalidade completa

## Funcionalidade v5.14 - Comparação de Relatórios IA
- [x] Adicionar botão "Comparar" na página Histórico IA
- [x] Criar página ComparacaoRelatoriosIA.tsx
- [x] Implementar seleção de dois relatórios via dropdown/select
- [x] Layout lado-a-lado (split view) com scroll sincronizado
- [x] Destacar visualmente diferenças entre períodos (cores diferentes nos headers)
- [x] Botão para exportar comparação para PDF
- [x] Testar funcionalidade completa

## Funcionalidade v5.15 - Marcadores de Destaque na Comparação
- [x] Adicionar botão "Adicionar Marcador" em cada relatório
- [x] Implementar campo de texto para nota/comentário do marcador
- [x] Sistema de cores para categorizar marcadores (importante, atenção, positivo, negativo)
- [x] Lista de marcadores criados abaixo de cada relatório
- [x] Persistir marcadores no localStorage por sessão
- [x] Botão para limpar todos os marcadores
- [x] Testar funcionalidade completa

## Bug v5.16 - Páginas IA sem DashboardLayout
- [x] Envolver HistoricoRelatoriosIA.tsx com DashboardLayout
- [x] Envolver ComparacaoRelatoriosIA.tsx com DashboardLayout
- [x] Testar navegação entre páginas

## Funcionalidade v5.17 - Periodicidade Mínima de Relatórios
- [x] Adicionar campos minimoRelatoriosLivres e minimoRelatoriosCompletos ao schema lojas
- [x] Migrar schema com db:push
- [x] Criar função calcularProgressoRelatorios() no backend
- [x] Criar função verificarAtrasos() para detectar lojas em atraso
- [x] Atualizar UI de edição de loja (admin) com campos de mínimos
- [x] Criar card de progresso no dashboard do gestor
- [x] Implementar banner de alertas no topo quando há atrasos
- [x] Lógica: alertar quando metade do mês passou sem atingir proporcional
- [x] Testar cenários: sem mínimo (0), com mínimo, em dia, em atraso

## Bug v5.18 - Layout Relatórios IA Board Pequeno no PC
- [x] Identificar componente de visualização de relatórios IA board
- [x] Remover limitação de largura do prose (max-w-none não funcionava)
- [x] Aplicar style maxWidth: 100% para forçar largura completa
- [x] Corrigir HistoricoRelatoriosIA.tsx e ComparacaoRelatoriosIA.tsx
- [x] Testar responsividade em diferentes resoluções

## Funcionalidade v5.19 - Gestão de Utilizadores (Admin)
- [x] Criar procedure getAllUsers() no backend
- [x] Criar procedure updateUser() para editar nome, email, role
- [x] Criar página GestaoUtilizadores.tsx para admin
- [x] Tabela com todos os utilizadores (id, nome, email, role, data criação)
- [x] Modal/formulário de edição de utilizador
- [x] Dropdown para alterar role (user, gestor, admin)
- [x] Adicionar link no menu lateral do admin
- [x] Interface pronta para atualizar email do Mauro Furtado
- [x] Testar funcionalidade completa

## Funcionalidade v5.20 - Eliminar Utilizadores
- [x] Criar procedure deleteUser() no backend
- [x] Adicionar mutation delete no router utilizadores
- [x] Adicionar botão "Eliminar" na tabela de utilizadores
- [x] Dialog de confirmação antes de eliminar
- [x] Testar funcionalidade completa

## Bug v5.21 - Lojas Atribuídas Aparecem Disponíveis
- [x] Identificar componente de atribuição de lojas a gestores
- [x] Filtrar lojas já atribuídas (gestorId não null) da lista de seleção
- [x] BUG CORRIGIDO: gestorId não estava disponível no frontend
- [x] Modificar getAllLojas() para fazer LEFT JOIN com gestorLojas
- [x] Retornar gestorId em cada loja (NULL se não atribuída)
- [x] Testar que filtro funciona corretamente

## Funcionalidade v5.23 - Admin Criar Relatórios para Qualquer Loja
- [ ] Adicionar links "Relatórios" no menu lateral do admin
- [ ] Admin pode aceder páginas RelatorioLivre e RelatorioCompleto
- [ ] Admin vê dropdown com TODAS as lojas (não apenas as suas)
- [ ] Modificar queries para incluir dados do autor (user.name, user.role)
- [ ] Adicionar badge/indicador "Criado por Admin" nos relatórios
- [ ] Gestores veem todos os relatórios das suas lojas (incluindo os do admin)
- [ ] Testar criação de relatório pelo admin e visualização pelo gestor

## Funcionalidade v5.23 - Admin Criar Relatórios para Qualquer Loja
- [x] Adicionar links "Relatórios" no menu lateral do admin
- [x] Admin pode aceder páginas RelatorioLivre e RelatorioCompleto
- [x] Admin vê dropdown com TODAS as lojas (não apenas as suas)
- [x] Modificar queries para incluir dados do autor (user.name, user.role)
- [x] Adicionar badge/indicador "Criado por Admin" nos relatórios
- [x] Gestores veem todos os relatórios das suas lojas (incluindo os do admin)
- [x] Modificar getRelatoriosLivresByGestorId para buscar por lojas atribuídas
- [x] Modificar getRelatoriosCompletosByGestorId para buscar por lojas atribuídas
- [x] Criar testes unitários (4 testes passaram)
- [x] Testar criação de relatório pelo admin e visualização pelo gestor

## Funcionalidade v5.24 - Notificação Email ao Gestor (Relatório Admin)
- [x] Identificar quando admin cria relatório (verificar role do user)
- [x] Buscar email do gestor responsável pela loja
- [x] Criar template de email de notificação
- [x] Enviar email automático após criação do relatório
- [x] Incluir link direto para visualizar o relatório
- [x] Testar envio de email em ambos os tipos de relatório (livre e completo)
- [x] Criar testes unitários (3 testes passaram)

## Funcionalidade v5.25 - Comentários/Notas do Admin nos Relatórios
- [x] Adicionar campo notasAdmin ao schema de relatórios livres (já existia)
- [x] Adicionar campo notasAdmin ao schema de relatórios completos (já existia)
- [x] Adicionar campo ao input schema das mutations (backend)
- [x] Adicionar campo de texto no formulário de relatório livre (admin)
- [x] Adicionar campo de texto no formulário de relatório completo (admin)
- [x] Remover restrições de acesso para admin criar relatórios
- [x] Mostrar notas do admin na página Relatórios (admin)
- [x] Mostrar notas do admin na página Meus Relatórios (gestor)
- [x] Destacar visualmente as notas do admin (fundo roxo)
- [x] Criar testes unitários (5 testes passaram)

## Bug v5.26 - Admin não consegue selecionar lojas nos formulários de relatórios
- [x] Investigar query de lojas usada nos formulários (getByGestor)
- [x] Verificar se admin tem acesso a todas as lojas
- [x] Corrigir query para retornar todas as lojas quando user é admin
- [x] Modificado server/routers.ts - lojas.getByGestor agora retorna getAllLojas() para admin
- [x] Criar testes unitários (3 testes passaram)
- [x] Validar que gestor continua vendo apenas suas lojas

## Bug v5.27 - Nome de utilizador exibido incorretamente
- [ ] Dashboard mostra "mamorim" (parte do email) em vez do nome completo
- [ ] Investigar de onde vem o nome exibido
- [ ] Verificar se user.name está correto na base de dados
- [ ] Corrigir componente que exibe o nome do utilizador
- [ ] Testar com gestores e admin

## Bug v5.27 - Nome de utilizador exibido incorretamente
- [x] Dashboard mostra "mamorim" (parte do email) em vez do nome completo do gestor
- [x] Investigar de onde vem o nome exibido no dashboard
- [x] Problema identificado: OAuth sobrescreve nome com userInfo.name do provider
- [x] Corrigido server/_core/oauth.ts para preservar nome existente na BD
- [x] Agora usa existingUserByEmail.name em vez de userInfo.name

## Bug v5.28 - Admin não consegue selecionar lojas (continuação v5.26)
- [x] Campo de seleção de lojas aparece vazio
- [x] Verificar se query getByGestor retorna dados para admin
- [x] Problema identificado: verificação de ctx.gestor ANTES de verificar role admin
- [x] Corrigido server/routers.ts - invertida ordem de verificação
- [x] Admin agora vê todas as lojas antes de verificar ctx.gestor
- [x] Testes unitários passaram (3 testes)

## Tarefa v5.29 - Restaurar nomes corretos dos gestores na BD
- [x] Verificar quais users têm nome incorreto (parte do email)
- [x] Criado script fix-names.mjs para investigar
- [x] Identificado 1 user afetado: mamorim@expressglass.pt (ID: 420030)
- [x] Atualizado nome para "Marco Amorim" via SQL
- [x] Correção do OAuth (v5.27) previne problema em futuros logins

## Funcionalidade v5.30 - Melhorias na Página de Lojas (Gestor)
- [x] Tornar card "Minhas Lojas" clicável no dashboard do gestor
- [x] Corrigido redirecionamento de /lojas para /minhas-lojas
- [x] Ordenar lojas alfabeticamente na listagem
- [x] Mostrar relatórios mínimos (mensais) na visualização da loja
- [x] Mostrar minimoRelatoriosLivres e minimoRelatoriosCompletos separadamente
- [x] Adicionar botão de edição em cada loja (Dialog com formulário)
- [x] Permitir editar email da loja (gestor)
- [x] Permitir editar nome, morada, contacto (gestor)
- [x] Relatórios mínimos editáveis APENAS por admin (campo read-only para gestor)
- [x] Admin já tem formulário completo em Lojas.tsx (linhas 332-357)

## Funcionalidade v5.31 - Indicador Visual de Cumprimento de Relatórios Mínimos
- [x] Criar query para contar relatórios livres do mês atual por loja
- [x] Criar query para contar relatórios completos do mês atual por loja
- [x] Criada função contarRelatoriosMesAtualPorLoja em server/db.ts
- [x] Suporta lojaId direto e lojasIds JSON (múltiplas lojas)
- [x] Adicionar tRPC procedure lojas.contarRelatoriosMesAtual
- [x] Adicionar badges verde/vermelho na página MinhasLojas
- [x] Criado componente BadgeCumprimento com CheckCircle2/AlertCircle
- [x] Badge verde quando loja cumpre mínimos (≥ mínimo exigido)
- [x] Badge vermelho quando loja está abaixo do mínimo (< mínimo exigido)
- [x] Mostrar números: "X/Y" (realizados/mínimo)
- [x] Criar testes unitários (4 testes passaram)

## Bug v5.32 - Inconsistência entre Resumo Global e Dashboard
- [x] Resumo Global mostrava "14 relatórios" (últimos 30 dias)
- [x] Dashboard mostrava "8 livres + 2 completos = 10" (mês atual)
- [x] Causa identificada: períodos diferentes (30 dias vs mês calendário)
- [x] Alterado resumoGlobalService.ts para usar mês atual
- [x] Atualizado labels "Últimos 30 dias" para "Este mês"
- [x] Agora ambos mostram números consistentes (mês atual)
- [x] Alinhado com sistema de relatórios mínimos mensais

## Bug v5.33 - Discrepância persistente após v5.32
- [x] Resumo Global mostrava "14 visitas" (todos os gestores)
- [x] Dashboard mostrava "8 livres + 2 completos = 10" (apenas gestor logado)
- [x] Pendentes também estavam inconsistentes (0 vs 11)
- [x] Causa: Dashboard filtra por gestor, Resumo Global contava TODOS os gestores
- [x] Corrigido resumoGlobalService.ts para usar getRelatoriosLivresByGestorId
- [x] Corrigido para usar getRelatoriosCompletosByGestorId
- [x] Criada função getPendentesByGestorId em server/db.ts
- [x] Corrigido filtro de pendentes ativos (status -> resolvido)
- [x] Agora todos os números são consistentes entre páginas

## Bug v5.34 - Relatórios IA não aparecem no Histórico IA
- [ ] Relatório IA gerado na página "Relatórios IA"
- [ ] Histórico IA mostra "Nenhum relatório IA encontrado"
- [ ] Verificar se relatórios são guardados na tabela relatorios_ia
- [ ] Verificar query de listagem no Histórico IA
- [ ] Corrigir salvamento ou query de listagem
- [ ] Testar geração e visualização no histórico


## Bug v5.34 - Relatórios IA não aparecem no Histórico IA ✅ RESOLVIDO
- [x] Relatório IA gerado na página "Relatórios IA"
- [x] Histórico IA mostra "Nenhum relatório IA encontrado"
- [x] Criada nova tabela relatorios_ia no schema
- [x] Adicionadas funções CRUD para relatórios IA no db.ts
- [x] Modificado router para salvar automaticamente após gerar
- [x] Atualizada página HistoricoRelatoriosIA para converter JSON para markdown
- [x] Criados testes unitários (5 testes passaram)
- [x] Testado salvamento e visualização no histórico


## Melhoria v5.35 - Nome do Menu "Relatórios Gestores" para Admin
- [x] Alterar nome do menu "Relatórios" para "Relatórios Gestores" quando utilizador é admin
- [x] Manter "Relatórios" para gestores
- [x] Testar visualização em ambos os perfis


## Melhoria v5.36 - Atualizar Nome da Plataforma para 2.0
- [x] Alterar "PoweringEG Platform" para "PoweringEG Platform 2.0" no Dashboard
- [x] Verificar outros locais onde o nome aparece (HistoricoRelatoriosIA, Relatorios, RelatoriosIA)
- [x] Testar visualização


## Melhoria v5.37 - Adicionar Logo ExpressGlass no Topo
- [x] Copiar logo para pasta public do projeto
- [x] Adicionar logo no header do DashboardLayout (lado direito)
- [x] Garantir responsividade mobile (logo não quebra interface)
- [x] Testar em diferentes tamanhos de ecrã


## Melhoria v5.38 - Favicon e Logo nos Emails
- [x] Criar favicon a partir do logo ExpressGlass
- [x] Configurar favicon no index.html
- [x] Adicionar logo ExpressGlass nos emails de relatórios (livre e completo)
- [x] Upload do logo para CDN pública
- [x] Testar visualização do favicon no navegador


## Melhoria v5.39 - Reposicionar Logo Desktop
- [x] Remover logo fixo do canto superior direito em desktop
- [x] Adicionar logo no header junto ao título "Olá, [nome]"
- [x] Logo maior (h-12) e sem fundo/borda
- [x] Testar visualização em desktop


## Ajuste v5.40 - Logo Depois do Nome
- [x] Mover logo da esquerda para a direita do título "Olá, [nome]"
- [x] Testar visualização


## Ajuste v5.41 - Aumentar Tamanho do Logo
- [x] Aumentar logo de h-10 para h-14 (56px)
- [x] Testar visualização


## Ajuste v5.42 - Ocultar Logo em Mobile
- [x] Adicionar classe hidden md:block ao logo no conteúdo
- [x] Manter apenas logo do header mobile visível
- [x] Testar em mobile e desktop


## Feature v5.43 - Coluna Gestor na Página Lojas (Admin)
- [x] Verificar schema da tabela lojas (campo gestorId via gestor_lojas)
- [x] Modificar query no backend para incluir nome do gestor (JOIN com gestores e users)
- [x] Adicionar coluna "Gestor" na tabela frontend
- [x] Mostrar nome do gestor ou campo vazio se não atribuído
- [x] Testar visualização


## Ajuste v5.44 - Uma Loja = Um Gestor
- [x] Modificar getAllLojas para buscar gestor separadamente com LIMIT 1
- [x] Garantir que cada loja mostre apenas um gestor
- [x] Testar visualização


## Bug v5.45 - Pendentes Sem Estado no Relatório Livre ✅ RESOLVIDO
- [x] Investigar página RelatorioLivre.tsx
- [x] Identificar que erro é sobre pendentes EXISTENTES (não novos)
- [x] Melhorar mensagem de erro para indicar quantos pendentes precisam de estado
- [x] Adicionar scroll automático para secção "Pendentes desta Loja"
- [x] Testar submissão de relatório com pendentes


## Bug v5.46 - Pendentes Não Aparecem com Múltiplas Lojas ✅ RESOLVIDO
- [x] Investigar condição `lojasIds.length === 1` no RelatorioLivre
- [x] Modificar para mostrar pendentes de TODAS as lojas selecionadas
- [x] Agrupar pendentes por loja com nome da loja no título
- [x] Testar com 2-3 lojas selecionadas


## Feature v5.47 - Pré-selecionar "Continua" nos Pendentes
- [x] Modificar PendentesLoja para inicializar status como "continua" em vez de null
- [x] Utilizador pode alterar individualmente para "resolvido"
- [x] Testar submissão rápida sem precisar clicar em todos os pendentes


## Bug v5.48 - Relatório com 3 Lojas Conta como 1 Relatório ✅ RESOLVIDO
- [x] Investigar router de criação de relatório livre
- [x] Verificar se cria apenas 1 registro (CONFIRMADO - bug encontrado)
- [x] Modificar para criar um relatório individual por cada loja selecionada
- [x] Testar contagem no dashboard e histórico de cada loja


## Feature v5.49 - Sistema de Resumos Globais
- [x] Criar tabela `resumos_globais` no schema
- [x] Criar router `resumosGlobais` com procedures (gerar, listar, getById, getUltimoPorPeriodo)
- [x] Implementar lógica de geração com IA (mensal/trimestral/semestral/anual)
- [x] Adicionar funções CRUD no db.ts
- [x] Criar página "Resumos Globais" para gerar novos resumos
- [x] Criar página "Histórico Resumos Globais" para consultar
- [x] Adicionar lembretes no Dashboard quando for altura de gerar
- [x] Adicionar rotas no App.tsx e menu no DashboardLayout
- [x] Testar geração e visualização de resumos


## Correção v6.1 - Lembretes Resumos Globais para Gestores
- [x] Alterar lembretes para aparecerem nos PRIMEIROS 5 dias de cada período (não últimos)
- [x] Permitir gestores gerarem resumos globais (não apenas admin)
- [x] Adicionar verificação se resumo do período anterior já foi gerado
- [x] Mostrar lembretes apenas se resumo ainda não foi gerado
- [x] Atualizar permissões no router resumosGlobais.gerar (protectedProcedure)
- [x] Atualizar lógica de lembretes no Dashboard.tsx
- [x] Testar funcionalidade completa

## Limpeza v6.2 - Remover Resumo Global Antigo
- [x] Remover item "Resumo Global" do menu lateral (DashboardLayout.tsx)
- [x] Manter apenas "Resumos Globais" (novo sistema)
- [x] Testar menu

## Feature v6.3 - Sistema de Reuniões Operacionais
### Backend
- [x] Criar tabela `reunioes_gestores` (data, presenças, outrosPresentes, conteudo, resumoIA, tags, criadoPor)
- [x] Criar tabela `reunioes_lojas` (data, lojaIds, presenças, conteudo, resumoIA, tags, criadoPor)
- [x] Criar tabela `acoes_reunioes` (reuniaoId, tipo, descricao, gestorIds, status)
- [x] Criar serviço de IA para gerar resumo de reunião (tópicos, ações)
- [x] Criar router `reunioesGestores` (criar, editar, listar, getById, atribuirAcoes)
- [x] Criar router `reunioesLojas` (criar, editar, listar, getById, getMiniResumo)
- [x] Adicionar funções CRUD em db.ts
- [x] Sistema de ações criado (integração com pendentes adiada)

### Frontend
- [x] Criar página ReuniõesGestores (formulário + histórico)
- [x] Criar página ReuniõesLojas (formulário + histórico)
- [x] Implementar seleção de presenças (gestores pré-selecionados)
- [x] Implementar mini resumo da reunião anterior
- [x] Implementar sistema de tags
- [ ] Implementar atribuição de ações a gestores (UI)
- [ ] Implementar envio de email e download PDF
- [x] Adicionar menu lateral (Reuniões Gestores e Reuniões Lojas)
- [x] Adicionar rotas no App.tsx

### Testes
- [x] Criar testes unitários para reuniões (6 testes passaram)
- [x] Validar estrutura de routers e serviços
- [x] Validar funções CRUD no db.ts

## Feature v6.4 - Funcionalidades Avançadas de Reuniões
### Backend
- [x] Adicionar procedure para enviar email de reunião de gestores (com seleção de destinatários)
- [x] Adicionar procedure para enviar email de reunião de lojas
- [x] Adicionar procedure para gerar PDF de reunião
- [x] Criar serviço de geração de PDF com resumo formatado

### Frontend
- [x] Implementar modal de atribuição de ações aos gestores
- [x] Implementar modal de envio de email (reuniões gestores) com seleção de gestores
- [x] Implementar modal de envio de email (reuniões lojas)
- [x] Implementar download de PDF funcional
- [x] Integrar botões e modais nas páginas de reuniões
- [x] Menu lateral mantido simples (sem gavetas)

### Testes
- [x] Criar testes unitários (8 testes passaram)
- [x] Validar procedures de email e PDF
- [x] Validar função de geração de PDF

## Correção v6.5 - Navegação nas Páginas de Reuniões
- [x] Envolver ReuniõesGestores.tsx com DashboardLayout
- [x] Envolver ReuniõesLojas.tsx com DashboardLayout
- [x] Testar navegação entre páginas

## Feature v6.6 - Filtros no Histórico de Reuniões
### Backend
- [x] Atualizar procedure listar de reuniões de gestores com filtros
- [x] Atualizar procedure listar de reuniões de lojas com filtros
- [x] Adicionar filtros: dataInicio, dataFim, tags, criadoPor, pesquisa

### Frontend
- [x] Criar componente de filtros reutilizável
- [x] Adicionar filtros na página ReuniõesGestores
- [x] Adicionar filtros na página ReuniõesLojas
- [x] Implementar pesquisa por texto no conteúdo
- [x] Adicionar botão "Limpar Filtros"

### Testes
- [x] Verificar funcionalidade no browser
- [x] Validar integração frontend-backend

## Correções Reuniões de Lojas
- [x] Filtrar lojas disponíveis por gestor (não mostrar todas as 70 lojas)
- [x] Aumentar tamanho da caixa de conteúdo da reunião (Textarea maior)

## Sistema de Anexos em Reuniões
- [x] Adicionar campo 'anexos' ao schema de reunioes_gestores (JSON array)
- [x] Adicionar campo 'anexos' ao schema de reunioes_lojas (JSON array)
- [x] Criar endpoint de upload de anexos no backend
- [x] Adicionar componente de upload no formulário de Reuniões Gestores
- [x] Adicionar componente de upload no formulário de Reuniões Lojas
- [x] Exibir anexos no histórico de reuniões (cards expansíveis)
- [ ] Incluir anexos nos PDFs de reuniões
- [ ] Incluir anexos nos emails de reuniões
- [ ] Criar testes unitários para upload de anexos

## Ordenação Alfabética de Lojas
- [x] Ordenar lojas alfabeticamente nas queries de base de dados (getAllLojas, getLojasByGestorId)
- [x] Ordenar lojas alfabeticamente nos dropdowns de seleção (Reuniões, Relatórios)
- [x] Ordenar lojas alfabeticamente nas listagens e tabelas
- [x] Verificar ordenação em todos os componentes que usam lojas

## Correção de Erro no Logout
- [x] Investigar erro React #300 ao fazer sign out
- [x] Corrigir fluxo de navegação após logout
- [x] Garantir limpeza correta do estado da aplicação
- [x] Testar logout em diferentes cenários

## Correção de Checkboxes de Gestores
- [x] Identificar por que nomes de gestores não aparecem nos checkboxes
- [x] Corrigir renderização para mostrar nome ao lado de cada checkbox
- [x] Testar em Reuniões de Gestores (admin)

## Ordenação Alfabética de Gestores
- [x] Adicionar ordenação alfabética na query getAllGestores (backend)
- [x] Verificar se frontend precisa de ordenação adicional
- [x] Testar em Reuniões de Gestores e outras páginas

## Módulo de Resultados
- [x] Criar tabelas resultados_mensais na base de dados
- [x] Implementar processamento automático de Excel (colunas A-N, folha Faturados)
- [x] Criar routers tRPC para upload e consulta de resultados
- [x] Criar página de upload para admin
- [x] Criar dashboard de resultados para gestores (próxima iteração)
- [x] Implementar filtros (loja, período, zona) (próxima iteração)
- [x] Implementar comparação entre períodos (próxima iteração)
- [x] Adicionar gráficos de evolução e performance (próxima iteração)
- [x] Testar com Excel real de Dezembro 2025


## Dashboard de Resultados - Visualização e Filtros (Fase 2)

### Backend
- [x] Criar função getEvolucaoMensal() - evolução de métricas por loja
- [x] Criar função getRankingLojas() - ranking por métrica específica
- [x] Criar função compararLojas() - comparar duas lojas
- [x] Criar função getResultadosPorZona() - agregar por zona geográfica
- [x] Criar função getEstatisticasPeriodo() - estatísticas gerais
- [x] Adicionar procedures tRPC para dashboard de resultados

### Frontend
- [x] Criar página ResultadosDashboard.tsx
- [x] Implementar filtros (período, loja, zona)
- [x] Adicionar gráfico de evolução mensal (linha)
- [x] Adicionar gráfico de comparação vs objetivos (barras)
- [x] Adicionar cards de métricas principais
- [x] Implementar ranking de lojas
- [x] Adicionar comparação entre períodos
- [x] Adicionar rota /resultados-dashboard
- [x] Adicionar item no menu lateral

### Testes
- [x] Criar testes para queries de evolução
- [x] Criar testes para rankings
- [x] Criar testes para comparações


## Comparação Lado-a-Lado de Lojas v4.1

### Frontend
- [x] Criar página ComparacaoLojas.tsx
- [x] Adicionar seleção de 2 lojas (dropdowns)
- [x] Adicionar seleção de período (mês/ano)
- [x] Implementar cards paralelos com métricas de cada loja
- [x] Criar gráficos de barras comparativos
- [x] Adicionar indicadores de diferença (%, setas, cores)
- [x] Implementar análise automática com resumo textual
- [x] Adicionar rota /comparacao-lojas
- [x] Adicionar item no menu lateral

### Testes
- [x] Criar testes para comparação de lojas
- [x] Validar cálculos de diferenças percentuais


## Correção - Navegação após Upload v4.1.1

- [x] Adicionar DashboardLayout à página ResultadosUpload
- [x] Adicionar botão "Voltar ao Dashboard" após upload concluído
- [x] Testar navegação


## Correção - Filtro de Loja no Dashboard v4.1.2

- [x] Analisar lógica atual do filtro de loja
- [x] Fazer filtro de loja afetar tabela de ranking
- [x] Testar filtro em todos os componentes


## Filtro "Apenas minhas lojas" para Gestores v4.2

### Backend
- [x] Criar query getEvolucaoAgregadaPorGestor() - soma de todas lojas do gestor
- [x] Adicionar procedure tRPC para evolução agregada

### Frontend
- [x] Adicionar opção "Apenas minhas lojas" no filtro (só para gestores)
- [x] Implementar lógica de agregação quando opção selecionada
- [x] Filtrar ranking para mostrar apenas lojas do gestor
- [x] Atualizar gráfico de evolução com dados agregados


## Exportação de Relatório "Minhas Lojas" v4.3

### Backend
- [x] Criar função para gerar dados de exportação agregados
- [ ] Criar endpoint tRPC para exportar PDF (skipped - apenas Excel)
- [x] Criar endpoint tRPC para exportar Excel
- [ ] Formatar dados para PDF (skipped - apenas Excel)
- [x] Formatar dados para Excel (múltiplas folhas)

### Frontend
- [x] Adicionar botão "Exportar Relatório" (visível quando "Apenas minhas lojas" selecionado)
- [x] Implementar download de ficheiro Excel gerado
- [x] Adicionar loading state durante geração
- [ ] Menu dropdown com opções PDF e Excel (skipped - apenas Excel)

- [x] Corrigir filtro de lojas no Dashboard de Resultados (gestores): adicionar "Minhas Lojas" e "Todas as Lojas" no início do dropdown

- [x] Pré-selecionar "Minhas Lojas" por padrão para gestores no Dashboard de Resultados
- [x] Adicionar badges de contagem ao lado de cada opção do filtro de lojas (ex: "Minhas Lojas (5)", "Todas as Lojas (70)")

- [x] Implementar comparação temporal no Dashboard de Resultados (até 3 meses lado-a-lado)

- [x] Bug: Adicionar opção "Minhas Lojas" no dropdown de filtro do Dashboard de Resultados (para gestores)
- [x] Bug: Fazer filtro de loja afetar TODOS os dados (estatísticas, ranking, zona), não apenas gráfico de evolução

- [ ] Bug CRÍTICO: Opção "Minhas Lojas" não aparece no dropdown do Dashboard de Resultados para gestores

## Correção v4.7 - Filtro "Minhas Lojas" no Dashboard de Resultados
- [x] Corrigir opção "Minhas Lojas" para aparecer SEMPRE para gestores
- [x] Pré-selecionar "Minhas Lojas" automaticamente quando gestor abre a página
- [x] Filtrar dados corretamente quando "Minhas Lojas" está selecionado

## Correção v4.8 - Badge "Todas as Lojas" mostra total do país
- [x] Corrigir badge de "Todas as Lojas" para mostrar 69 (total do país) em vez de 14 (lojas do gestor)
- [x] Garantir que selecionar "Todas as Lojas" mostra dados de todas as 69 lojas

## Bug v4.8.1 - Filtro "Todas as Lojas" não funciona
- [x] Corrigir lógica: quando "Todas as Lojas" selecionado, não passar filtro de lojas (mostrar dados globais)
- [x] Garantir que estatísticas, ranking e gráficos mostram dados de todas as 69 lojas


## Bug v4.8.2 - Aparecem 69 lojas em vez de 70
- [x] Investigar porque aparecem 69 lojas no Dashboard de Resultados em vez de 70
- [x] Verificar se todas as 70 lojas estão no ficheiro Excel importado
- [x] Verificar se todas as 70 lojas foram importadas para a BD
- [x] Corrigir a causa raiz da discrepância
- [x] Corrigir taxa de reparação no Dashboard de Resultados (deve ser 28% do Excel, não 19.6%)
- [x] Corrigir erro no envio de email do relatório livre (Falha ao enviar email)
- [x] Melhorar funcionalidade de edição de relatórios (modal para ver e editar antes de enviar)
- [x] Adicionar botões de edição visíveis na página Meus Relatórios do gestor
- [x] Corrigir Dashboard Resultados: mostrar todas as lojas do gestor no ranking quando "Minhas Lojas" selecionado
- [x] Incluir vendas complementares no Dashboard de Resultados (importação Excel + visualização)

## Resumos Globais - Incluir Análise de Resultados v5.20
- [x] Incluir dados de resultados mensais (serviços, objetivos, taxa reparação) na análise IA dos Resumos Globais

## Seleção Múltipla para Eliminar Lojas e Gestores v5.21
- [x] Criar endpoint backend para eliminar múltiplas lojas
- [x] Criar endpoint backend para eliminar múltiplos gestores
- [x] Adicionar checkboxes na página de Lojas
- [x] Adicionar botão 'Eliminar Selecionados' na página de Lojas
- [x] Adicionar checkboxes na página de Gestores
- [x] Adicionar botão 'Eliminar Selecionados' na página de Gestores

## Remoção - Resumos Globais v5.22
- [x] Remover itens de Resumos Globais do menu lateral
- [x] Remover rotas de Resumos Globais do App.tsx


## Relatórios IA com Resultados v5.23
- [x] Adicionar análise de Resultados aos Relatórios IA dos gestores
- [x] Incluir métricas: serviços, objetivos, taxa reparação, vendas complementares
- [x] Testar geração de relatório IA com dados de Resultados


## Sistema de Reuniões Quinzenais para Lojas v5.24
- [ ] Adicionar role 'loja' ao schema de users
- [ ] Criar tabela de reuniões quinzenais (reunioes_lojas)
- [ ] Criar tabela de pendentes de loja (pendentes_loja)
- [ ] Sistema de autenticação para lojas via email
- [ ] Interface de reunião para lojas (menu restrito)
- [ ] Gestão de pendentes (marcar resolvido/pendente)
- [ ] Histórico de reuniões anteriores
- [ ] Vista de consulta para admin/gestor
- [ ] Alertas de lojas sem reunião há mais de 15 dias
- [ ] Envio automático de email ao gestor ao concluir reunião
- [ ] Testar fluxo completo


## Reuniões Quinzenais para Lojas (v5.23)
- [x] Criar schema de tabelas para reuniões quinzenais
- [x] Criar tabela de tokens de acesso para lojas
- [x] Criar tabela de pendentes de loja
- [x] Implementar sistema de autenticação via token
- [x] Criar routers para reuniões quinzenais
- [x] Criar página Portal da Loja (acesso público via token)
- [x] Criar página de gestão de reuniões quinzenais (admin/gestor)
- [x] Implementar envio automático de email ao concluir reunião
- [x] Adicionar menu de Reuniões Quinzenais ao sidebar

## Tokens de Acesso para Lojas (v5.24)
- [x] Criar tabela tokens_acesso_lojas no schema (já existia)
- [x] Implementar funções CRUD de tokens no db.ts (já existia + listarTokensLojaByGestor)
- [x] Criar router tokensLoja com endpoints (atualizado para gestores)
- [x] Adicionar separador "Tokens de Acesso" na página Reuniões Quinzenais
- [x] Interface para criar/listar/ativar/desativar tokens
- [x] Botão "Enviar por Email" que envia token para email da loja
- [x] Gestores só veem tokens das suas lojas, admin vê todos

## Correções v5.25 - Permissões de Gestores
- [x] Permitir gestores editarem email das suas lojas (não só admin)
- [x] Mostrar todas as lojas do gestor na tab Tokens (mesmo sem token)
- [x] Permitir gestores criarem tokens para suas lojas
- [x] Bug: Pendentes não aparecem no Portal da Loja (mostra 0 quando existem pendentes)

## Sistema To-Do Colaborativo v5.13
- [ ] Schema: Tabela de categorias de To-Do (configuráveis)
- [ ] Schema: Tabela de To-Do com atribuições
- [ ] DB: Funções CRUD para categorias
- [ ] DB: Funções CRUD para To-Do
- [ ] Router: Procedures para gestão de categorias
- [ ] Router: Procedures para gestão de To-Do
- [ ] UI Admin: Página de To-Do com filtros (por loja, atribuído, estado, categoria)
- [ ] UI Admin: Criar/editar tarefas com atribuição
- [ ] UI Admin: Gestão de categorias
- [ ] Portal Loja: Secção To-Do com tarefas atribuídas
- [ ] Portal Loja: Marcar como concluída ou devolver ao criador
- [ ] Notificações: Email quando tarefa é atribuída
- [ ] Testar fluxo completo

## Melhorias To-Do v5.24
- [x] To-Do: Cards clicáveis como filtros de estado
- [x] To-Do: Filtro de lojas mostra apenas lojas do gestor (não todas)

## Melhorias To-Do v5.25
- [x] To-Do: Destacar loja atribuída no card da tarefa (mais visível)

## Melhorias Portal Loja v5.26
- [x] Portal Loja: Criar card To-Do com contagem de tarefas pendentes
- [x] Portal Loja: Remover cards de reuniões (Total Reuniões, Última Reunião)
- [x] Portal Loja: Cards clicáveis como filtros

## Melhorias Portal Loja v5.27
- [x] Portal Loja: Animação pulse suave nos cards quando há tarefas não vistas
- [x] Portal Loja: Mini-lista das 3 tarefas mais urgentes nos cards
- [x] Portal Loja: Botão de ação rápida no card To-Do (Iniciar tarefa)

## Portal Loja - Criar Tarefas v5.28
- [x] Portal Loja: Botão "Nova Tarefa" para loja criar tarefas
- [x] Portal Loja: Modal de criação com título, descrição, categoria e prioridade
- [x] Portal Loja: Tarefa criada pela loja é automaticamente atribuída ao gestor responsável
- [x] Backend: Endpoint para loja criar tarefa (via token de acesso)

## Widget PWA To-Do v5.29
- [x] PWA: Configurar manifest.json para instalação no telemóvel
- [x] PWA: Criar service worker para funcionamento offline
- [x] PWA: Página widget compacta com lista de tarefas To-Do
- [x] PWA: Botão "Adicionar ao Ecrã Inicial" no Portal da Loja
- [x] PWA: Ícones para Android e iOS
- [x] PWA: Atualização automática das tarefas (30 segundos)

## Widget PWA To-Do para Gestores v5.30
- [x] PWA Gestor: Página widget compacta (/todo-widget) com lista de tarefas
- [x] PWA Gestor: Botão "Instalar App" na página To-Do dos gestores
- [x] PWA Gestor: Atualização automática das tarefas a cada 30 segundos
- [x] PWA Gestor: Interface otimizada para mobile com ações rápidas
- [x] PWA Gestor: Filtros por loja e estado

## Bug v5.31 - Lojas sem gestor não aparecem para atribuição
- [x] Investigar query de lojas disponíveis no modal "Gerir Lojas"
- [x] Corrigir lógica para mostrar todas as lojas (com e sem gestor)
- [x] Adicionar indicador visual quando loja já tem outro gestor
- [x] Testar atribuição de lojas ao Rui Adrião


## Bug v5.32 - Modal "Gerir Lojas" abre vazio
- [x] Investigar porque lojas não carregam no modal
- [x] Verificar query de lojas disponíveis
- [x] Corrigir carregamento de lojas (adicionado loading state e responsividade)
- [x] Testar no desktop (funciona)


## Bug v5.33 - Associação de lojas não grava
- [ ] Investigar função associateLoja no backend
- [ ] Verificar logs de erro no servidor
- [ ] Corrigir gravação na base de dados
- [ ] Testar associação de lojas


## Bug v5.33 - Associação de lojas parece não gravar
- [x] Investigar porque associações parecem não ser gravadas - CONFIRMADO: associações estão a gravar corretamente na BD
- [x] Verificar mutação associateLoja - funciona corretamente
- [x] Adicionar invalidação da lista de lojas após associação para atualizar visualização imediata
- [x] Testar associação - Rui Adriao tem 4 lojas associadas na BD (Abrantes, Sm castanheira do ribatejo, Sm pesados porto, Viseu sm)


## v5.34 - Melhorias no modal "Gerir Lojas"
- [x] Campo de pesquisa para filtrar lojas rapidamente
- [x] Contador de lojas atribuídas ao gestor no cabeçalho

## Bug v5.34.1 - Atribuída a: vazio no modal Gerir Lojas
- [x] Mostrar sempre nome do gestor atribuído (mesmo que seja o próprio)

## Bug v5.34.2 - Correção definitiva "Atribuída a:" vazio
- [x] Corrigir lógica para usar isAssociated em vez de loja.gestorId
- [x] Mostrar nome do gestor selecionado quando loja está associada a ele

## Bug v5.34.3 - Lista de Lojas não mostra gestor para algumas lojas
- [ ] Investigar query getAllLojas
- [ ] Corrigir para buscar gestor da tabela gestor_lojas em vez de loja.gestorId

## Limpeza de Dados v5.35
- [x] Identificar associações órfãs na tabela gestor_lojas
- [x] Eliminar associações com gestores inválidos (gestorId 120004)
- [x] Verificar resultado da limpeza

## Bug v5.36 - Portal da Loja tokens não funcionam
- [ ] Investigar redirecionamento ao clicar em criar reunião/tarefa
- [ ] Corrigir autenticação por token no Portal da Loja
- [ ] Testar funcionalidade completa
- [x] Corrigir bug Portal da Loja - tokens não funcionavam ao criar reunião/tarefa (adicionado endpoint público listarPublico)
- [x] Corrigir bug: tarefas criadas pela loja mostram nome do gestor em vez do nome da loja como criador
- [x] Corrigir exibição do nome da loja nas tarefas criadas pela loja (ainda mostra gestor)
- [x] Adicionar indicador visual (badge/destaque) para tarefas criadas pela loja

## Melhorias To-Do v2
- [x] Separação de visibilidade: Admin não vê tarefas loja↔gestor
- [x] Destaque visual "Para Mim": borda colorida + badge nas tarefas recebidas
- [x] Animação pulse para tarefas não vistas + marcar como visto ao clicar
- [x] Botão flutuante (FAB) para criação rápida de tarefas


## Correções To-Do v2.1
- [x] Dropdown de utilizadores vazio - mostrar admins e gestores para atribuição
- [x] Animação pulse muito subtil - mudar para amarelo intenso e mais visível
- [x] Totalizadores não atualizam - invalidar queries após criar tarefa

## Melhorias To-Do v2.2
- [x] Botão atalho Tarefas no Dashboard com contador e animação amarela
- [x] Botão FAB com texto "Nova Tarefa" em vez de apenas "+"
- [x] Filtrar dropdown de utilizadores para excluir Marco Amorim (Admin) e utilizadores de teste
- [x] Eliminar utilizadores de teste da base de dados (Gestor Teste IA e List Test Name)
- [x] Adicionar botão/destaque de Minhas Tarefas no Portal da Loja
- [x] Adicionar botão "Minhas Tarefas" no header do Portal da Loja
- [x] Adicionar banner de alerta para tarefas urgentes no Portal da Loja
- [x] Adicionar botão flutuante de acesso rápido às tarefas no Portal da Loja

## Limpeza de Dados de Teste
- [x] Identificar utilizadores de teste na base de dados
- [x] Identificar lojas de teste na base de dados
- [x] Eliminar relatórios associados a dados de teste
- [x] Eliminar lojas de teste
- [x] Eliminar utilizadores de teste



## Eliminação em Lote de Utilizadores
- [x] Adicionar checkboxes para seleção múltipla na tabela de utilizadores
- [x] Adicionar botão de eliminação em lote
- [x] Criar endpoint backend para eliminar múltiplos utilizadores
- [x] Diálogo de confirmação para eliminação em lote

## Atalho Relatório Board no Dashboard Admin

## Dashboard de Resultados - Média Mensal
- [x] Adicionar média mensal de serviços quando múltiplos meses selecionados

## Filtros Temporais - Seleção Múltipla de Meses v3.7
- [x] Criar componente reutilizável FiltroMesesCheckbox
- [x] Atualizar backend para suportar múltiplos meses (array de mês/ano)
- [x] Substituir filtros em RelatoriosIA.tsx
- [x] Substituir filtros em ResumosGlobais.tsx
- [x] Substituir filtros em HistoricoLoja.tsx
- [x] Substituir filtros em HistoricoPontos.tsx
- [x] Substituir filtros em RelatorioIAResultados.tsx
- [x] Testar todas as páginas com novo sistema de filtros
- [x] Substituir botão "Relatório Mensal" por "Relatório Board" no Dashboard do Admin
- [x] Replicar funcionalidade do botão existente na página Categorias

## Reorganização do Menu Lateral
- [x] Mover "Histórico da Loja" para junto da secção de Resultados

## Bug - Reuniões das Lojas não aparecem no Histórico
- [ ] Investigar porque reuniões criadas pelas lojas não aparecem para gestor/admin
- [ ] Corrigir query ou lógica de listagem
- [x] Modal de reuniões quinzenais não mostra conteúdo (temas, decisões, planos de ação)
- [ ] Bug: Reunião enviada ID 1 tem campos de conteúdo vazios na BD (dados não foram guardados antes de enviar)

## Correção v5.12 - Bug Reuniões Quinzenais não guardam dados ao Concluir e Enviar
- [x] Identificar problema: dados não eram guardados quando clicava diretamente em "Concluir e Enviar"
- [x] Causa: ReuniaoEditor não passava ID correto quando reunião era recém-criada
- [x] Solução: Adicionar key ao ReuniaoEditor para forçar re-montagem
- [x] Solução: Passar reuniaoAtualId como prop e usar como fallback no onConcluir
- [x] Solução: Modificar botão Concluir para passar reuniaoId junto com os dados
- [x] Testar: Reunião 60011 enviada com dados corretos
- [x] Remover logs de debug do frontend e backend
- [x] Corrigir formatação do PDF dos Resumos Globais para ter aspeto profissional com títulos e secções

## Melhorias PDF Resumos Globais v6.1
- [ ] Adicionar logótipo ExpressGlass no cabeçalho do PDF
- [ ] Adicionar gráficos de evolução de métricas ao longo do período
- [ ] Testar geração do PDF com as novas funcionalidades


## Melhorias PDF Resumos Globais v6.1
- [x] Adicionar logótipo ExpressGlass no cabeçalho do PDF
- [x] Adicionar gráficos de evolução de métricas ao longo do período
- [x] Testar geração do PDF com as novas funcionalidades


## Funcionalidade v6.3 - Relatório de Ocorrências Estruturais
- [x] Criar tabela ocorrencias_estruturais no schema (id, gestorId, tema, descricao, abrangencia, impacto, fotos, criadoEm)
- [x] Criar tabela temas_ocorrencias para guardar temas criados pelos gestores (autocomplete)
- [x] Implementar funções CRUD no db.ts (createOcorrencia, getAllOcorrencias, getTemasOcorrencias, etc)
- [x] Criar router ocorrenciasEstruturais com procedures (criar, listar, getTemas)
- [x] Criar página OcorrenciaEstrutural.tsx para criar nova ocorrência
- [x] Implementar autocomplete de temas (igual às categorias do admin)
- [x] Criar página HistoricoOcorrencias.tsx para listar ocorrências
- [x] Adicionar itens ao menu lateral (grupo Ocorrências)
- [x] Testar criação de ocorrência com novo tema
- [x] Testar autocomplete de temas existentes
- [x] Criar checkpoint v6.3

## Funcionalidade v6.4 - Ocorrências Estruturais nos Relatórios IA
- [x] Criar função para buscar ocorrências estruturais do período
- [x] Modificar serviço de Relatórios IA para incluir dados de ocorrências
- [x] Atualizar prompt da IA para analisar padrões de ocorrências
- [x] Adicionar secção "Análise de Ocorrências Estruturais" no relatório gerado
- [x] Testar geração de Relatório IA com ocorrências
- [x] Criar checkpoint v6.4


## Funcionalidade v6.5 - Mover Ocorrências para Menu Relatórios
- [x] Mover "Nova Ocorrência" e "Histórico Ocorrências" do grupo Ocorrências para grupo Relatórios
- [x] Remover grupo Ocorrências do menu lateral
- [x] Testar navegação
- [x] Criar checkpoint v6.5


## Funcionalidade v6.6 - Melhorias Ocorrências Estruturais
- [x] Gestor: Contagem de ocorrências apenas das registadas pelo próprio (não total)
- [x] Gestor: Cards clicáveis para abrir detalhes da ocorrência
- [x] Gestor: Permitir edição de ocorrência após gravação
- [x] Gestor: Opção de enviar por email após gravar (Titulo: "Ocorrência de [Nome Gestor] - [Tema]")
- [x] Admin: Contagem total de todas as ocorrências (já está correto)
- [x] Admin: Permitir edição de ocorrências
- [x] Admin: Anexos abrem em popup/modal (não em nova janela)
- [x] Gestor: Anexos abrem em popup/modal (não em nova janela)
- [x] Relatórios IA: Destaque de ocorrências por tema no relatório de board
- [x] Relatórios IA: Destaque de ocorrências por tema nos relatórios gerais
- [x] Testar todas as funcionalidades
- [x] Criar checkpoint v6.6


## v6.7 - Quadro Resultados Mês Anterior no Dashboard
- [x] Criar endpoint para buscar resultados do mês anterior
- [x] Adicionar quadro no Dashboard com métricas do mês anterior
- [x] Mostrar: Total Serviços, Taxa Reparação, Desvio vs Objetivo
- [x] Testar e criar checkpoint

## v6.8 - Resultados do Mês Anterior para Gestores

- [x] Adicionar quadro de Resultados do Mês Anterior no Dashboard do Gestor
- [x] Mostrar métricas das lojas do gestor (não todas as lojas)
- [x] Preencher espaço vazio ao lado do "Progresso de Relatórios"
- [x] Testar e criar checkpoint


## Bug Fix - Email de Ocorrências v6.9
- [x] Corrigir erro 'Notification content must be at most 20000 characters' ao enviar email de ocorrências
- [x] Truncar conteúdo do email quando exceder o limite

- [x] Corrigir email de ocorrências para usar SMTP Gmail (egpowering@gmail.com)
- [x] Corrigir destinatário para admin real (Mauro Furtado, não Marco Amorim Admin)
- [x] Corrigir template HTML para renderizar corretamente (não mostrar código)
- [x] Aplicar layout profissional consistente com outros emails

## Bug Fix - Anexos no Email de Ocorrências v6.9.2
- [x] Corrigir anexos no email de ocorrências para que abram corretamente
- [x] Verificar se anexos estão a ser incluídos como attachments do nodemailer

## Melhorias To-Do e Portal da Loja v6.10
- [x] Título do email de ocorrências: remover "Estrutural"
- [x] Tarefas To-Do: adicionar gestão de status (Em Progresso, Devolver, etc.)
- [x] Tarefas To-Do: permitir adicionar conteúdo ao mudar status para reenviar à loja
- [x] Tarefas To-Do: loja deve ver quando gestor abriu e mudou status
- [x] Portal da Loja: adicionar histórico de tarefas enviadas para o gestor
- [x] Portal da Loja: permitir criar tarefas internas (para a própria loja, sem enviar ao gestor)
- [x] Reuniões da Loja: campos de preenchimento obrigatório
- [x] Reuniões da Loja: cor do cabeçalho do email (já estava correto - azul #2563eb)

## Melhorias Portal da Loja - Tarefas v6.11
- [x] Unificar tarefas numa única lista (remover tabs separadas)
- [x] Usar filtros para definir o que a loja vê (internas, enviadas, recebidas, etc.)
- [x] Botões de criação lado a lado: "Nova Tarefa Interna" e "Nova Tarefa para Gestor"
- [x] Loja pode responder quando gestor responde a uma tarefa (bidirecional)
- [x] Testar e criar checkpoint

## Anexos nas Tarefas do Portal da Loja v6.12
- [x] Adicionar campo anexos ao schema de todos
- [x] Criar endpoint de upload de anexos para tarefas
- [x] Criar componente de upload no frontend
- [x] Integrar upload no formulário de criação de tarefas (Nova para Gestor e Nova Interna)
- [x] Exibir anexos nas tarefas existentes
- [x] Testar e criar checkpoint

## Correção de Bugs Dashboard de Resultados v6.13
- [x] Corrigir erro 404 ao clicar em "Ver Dashboard Completo"
- [x] Corrigir inconsistência de valores entre Dashboard principal e Dashboard de Resultados
- [x] Testar e criar checkpoint

## Manutenção v6.1
- [x] Atualizar versão do portal de v6.0 para v6.1
- [x] Limpar lojas de teste da base de dados (36 lojas)
- [x] Limpar gestores/utilizadores de teste da base de dados (24 users)


## Bug v6.2 - Botão Minhas Tarefas pisca incorretamente
- [ ] Contador mostra "2" mesmo sem tarefas novas por ler
- [ ] Botão pisca a amarelo quando gestor muda status ou adiciona obs (não deveria)
- [ ] Só deve piscar quando há tarefas RECEBIDAS não vistas


## Bug v6.2 - Botão Minhas Tarefas pisca incorretamente
- [x] Contador mostra "2" mesmo sem tarefas novas por ler
- [x] Botão pisca a amarelo quando gestor muda status ou adiciona obs (não deveria)
- [x] Só deve piscar quando há tarefas RECEBIDAS não vistas
- [x] Adicionado campo vistoGestor ao schema de todos
- [x] Corrigida função countTodosPendentesAtribuidosAMim para excluir tarefas criadas pelo próprio utilizador
- [x] Adicionada lógica de marcar como visto pelo gestor ao visualizar tarefa

## Bug v6.3 - Lojas não conseguem responder a tarefas recebidas dos gestores
- [ ] Lojas só conseguem responder a tarefas que elas próprias criaram
- [ ] Corrigir para permitir resposta a tarefas RECEBIDAS (criadas pelo gestor para a loja)
- [ ] Verificar lógica de permissões no Portal da Loja
- [x] Criado endpoint adicionarObservacao no backend para tarefas recebidas
- [x] Adicionado botão "Adicionar Obs." / "Editar Obs." para tarefas recebidas no Portal da Loja
- [x] Adicionado Dialog para escrever observação
- [x] Adicionada visualização da observação da loja em tarefas recebidas
- [x] Testes unitários passaram (5/5)

## Bug: Tarefas do gestor não aparecem no Portal da Loja
- [ ] Investigar lógica de listagem de tarefas no Portal da Loja
- [ ] Corrigir filtro para mostrar tarefas atribuídas à loja pelo gestor
- [ ] Testar correção

## Funcionalidades v6.2 - Filtro Mês Anterior e Análise de Resultados
- [ ] Adicionar filtro 'Mês Anterior' nos Relatórios IA
- [ ] Adicionar filtro 'Mês Anterior' nos Resumos Globais
- [ ] Criar secção de Resultados nos Relatórios IA com análise profissional
- [ ] Incluir gráficos de evolução e comparação (melhor/pior loja, maior/menor evolução)
- [ ] Adicionar Relatório IA no Dashboard de Resultados
- [ ] Filtros temporais no Dashboard: mês anterior, mês atual, trimestre, semestre, ano
- [ ] Testar todas as funcionalidades


## Funcionalidades v6.2 - Filtros Temporais e Análise de Resultados nos Relatórios IA
- [x] Adicionar filtro "Mês Anterior" nos Relatórios IA
- [x] Adicionar filtro "Mês Anterior" nos Resumos Globais
- [x] Adicionar filtros "Semestral" e "Anual" nos Relatórios IA
- [x] Criar secção de Comparação de Lojas nos Relatórios IA com:
  - [x] Melhor loja (mais serviços)
  - [x] Pior loja (menos serviços)
  - [x] Maior evolução vs mês anterior
  - [x] Menor evolução vs mês anterior
  - [x] Estatísticas: total lojas, acima/abaixo do objetivo, taxa de sucesso
  - [x] Gráfico de barras Top 10 lojas por serviços (verde/vermelho por desvio)
- [x] Adicionar Relatório IA no Dashboard de Resultados com:
  - [x] Filtros temporais: Mês Anterior, Mês Atual, Trimestre, Semestre, Ano
  - [x] Comparação de lojas com cards visuais
  - [x] Gráfico de ranking de serviços
  - [x] Análise de lojas em destaque e lojas que precisam atenção
- [x] Atualizar schemas de BD para novos períodos (relatorios_ia, resumos_globais)
- [x] Executar migrações da base de dados


## Funcionalidades v6.3 - PDF, Alertas e Histórico
- [x] Exportar Relatório IA para PDF com gráficos incluídos
- [x] Sistema de alertas automáticos de performance (notificar quando loja cai abaixo de limiar)
- [x] Gráfico de comparação histórica (evolução mensal ao longo do tempo)

## Funcionalidade v3.7 - Cópia de Email para Gestor
- [x] Enviar cópia do email de ocorrências estruturais para o próprio gestor que reportou

## Bug - Evolução Histórica
- [x] Corrigir valores de Total Serviços e Total Objetivos que mostram concatenação em vez de soma

## Bug - Taxa de Reparação no Dashboard do Gestor
- [x] Corrigir Taxa de Reparação que mostra 0.2% em vez do valor correto no card "Resultados Dezembro 2025"
- [x] Mover Relatório IA de Resultados do Dashboard para menu Resultados

## Filtros Avançados no Relatório IA de Resultados
- [ ] Adicionar filtro por zona geográfica
- [ ] Adicionar filtro por gestor (lojas atribuídas ao gestor)
- [ ] Adicionar filtro "Todo o País" (visão global)
- [ ] Atualizar análise IA para considerar filtros selecionados

## Filtros Avançados no Relatório IA de Resultados v6.2
- [x] Filtro por zona (lojas dessa zona)
- [x] Filtro por gestor (lojas atribuídas ao gestor)
- [x] Filtro todo o país (sem filtro)
- [x] Interface de seleção de filtros no frontend
- [x] Backend para suportar filtros na geração de relatório IA
- [x] Query para obter zonas distintas
- [x] Query para obter gestores para filtro
- [x] Badge mostrando filtro aplicado no relatório

## Melhoria Analítica do Relatório IA de Resultados v6.3
- [x] Reformular prompt da IA para análise quantitativa profunda
- [x] Lojas em Destaque baseado em DADOS de resultados (serviços, taxa reparação, desvio objetivo)
- [x] Lojas que Precisam Atenção baseado em DADOS de resultados (não situações operacionais)
- [ ] Análise de tendências de serviços (crescimento/decréscimo por loja)
- [ ] Análise de cumprimento de objetivos por loja
- [x] Ranking detalhado com métricas quantitativas
- [x] Comparação de performance entre lojas do mesmo filtro
- [ ] Identificação de padrões de sazonalidade
- [ ] Recomendações baseadas em dados numéricos
- [ ] Testar nova análise com dados reais

## Filtro por Zona com Seleção Múltipla v6.4
- [x] Identificar zonas disponíveis nos dados de resultados
- [x] Criar endpoint para listar zonas únicas
- [x] Implementar seleção múltipla de zonas no frontend
- [x] Adicionar opção "Nacional" (todo o país)
- [x] Filtrar dados por zonas selecionadas no backend
- [x] Atualizar análise IA para considerar zonas filtradas
- [x] Testar combinação de filtros (mês + múltiplas zonas)

## Relatório IA de Resultados - Análise Completa e Profissional v6.5
- [ ] Rankings TOP 5 e BOTTOM 5 por loja:
  - [ ] Melhor taxa de reparação
  - [ ] Melhores resultados globais (serviços vs objetivo)
  - [ ] Melhores vendas complementares
  - [ ] Piores resultados vs objetivo
  - [ ] Maior crescimento vs mês anterior
- [ ] Análise comparativa por zona com métricas agregadas
- [ ] Métricas detalhadas individuais por loja
- [ ] Análise de tendências e evolução mensal
- [ ] Secção de insights profissionais e recomendações específicas
- [ ] Melhorar prompt do LLM para análise mais profunda e estruturada
- [ ] Redesenhar interface com secções analíticas expandidas
- [ ] Exportar PDF com todas as análises detalhadas


## Melhorias Relatório IA de Resultados v4.2
- [x] Rankings detalhados por loja (TOP 5 e BOTTOM 5)
- [x] Ranking de cumprimento de objetivo
- [x] Ranking de taxa de reparação
- [x] Ranking de vendas complementares
- [x] Ranking de crescimento vs mês anterior
- [x] Análise detalhada por zona com tabela comparativa
- [x] Insights IA mais profundos e analíticos
- [x] Alertas críticos identificados pela IA
- [x] Recomendações estratégicas detalhadas
- [x] Gráficos de visualização (barras e donut)
- [x] Secções colapsáveis para melhor navegação
- [x] Estatísticas de vendas complementares agregadas
- [x] KPIs principais com cards visuais
- [x] Líder e menor performance destacados
- [x] Análise de tendências e crescimento

## Ajustes Relatório IA de Resultados v4.3
- [x] Filtros temporais sempre do período anterior por defeito
- [x] Mês Anterior como opção principal
- [x] Trimestre Anterior como opção
- [x] Semestre Anterior como opção
- [x] Ano Anterior como opção
- [x] Mês Atual apenas para análise ocasional
- [x] Filtro por gestor específico (já existia)
- [x] Dropdown com lista de gestores (já existia)
- [x] Filtrar lojas atribuídas ao gestor selecionado (já existia)

## Análise Loja a Loja no Relatório IA v4.4
- [ ] Verificar estrutura atual do relatório IA de resultados
- [ ] Adicionar secção de análise individual por loja
- [ ] Incluir resumo de performance por loja (serviços, objetivo, desvio, taxa reparação)
- [ ] Mostrar tendência vs período anterior
- [ ] Ordenar lojas por performance ou alfabeticamente
- [ ] Testar com dados reais

## Análise Loja a Loja no Relatório IA v4.4 - CONCLUÍDO
- [x] Verificar estrutura atual do relatório IA de resultados
- [x] Adicionar secção de análise individual por loja
- [x] Incluir resumo de performance por loja (serviços, objetivo, desvio, taxa reparação)
- [x] Mostrar status (Acima/Abaixo do objetivo)
- [x] Ordenar lojas por performance ou alfabeticamente
- [x] Testar com dados reais

## Filtros na Análise Loja a Loja v4.5
- [x] Gestor: filtro Nacional (todas as lojas)
- [x] Gestor: filtro Minhas Lojas (apenas lojas atribuídas)
- [x] Admin: filtro Nacional (todas as lojas)
- [x] Admin: filtro por Gestor (lojas de um gestor específico)
- [x] Admin: filtro por Zona (lojas de uma zona específica)
- [x] Testar filtros para ambos os roles (admin testado: Nacional, Por Gestor, Por Zona)

## Filtros Temporais na Análise Loja a Loja v4.6
- [ ] Adicionar dropdown de período na secção Análise Loja a Loja
- [ ] Opções: Mês Anterior, Trimestre Anterior, Semestre Anterior, Ano Anterior
- [ ] Filtrar dados da tabela pelo período selecionado
- [ ] Atualizar resumo rápido com dados do período
- [ ] Testar filtros temporais combinados com filtros de zona/gestor

## Bug v5.4.1 - Filtros Análise Loja a Loja para Gestores
- [ ] Gestores devem ver filtros 'Nacional' e 'Minhas Lojas' na secção Análise Loja a Loja
- [ ] Por defeito, gestor deve começar com 'Minhas Lojas' selecionado (não 'Nacional')


## Bug Fix - Relatório IA Resultados (Filtro Minhas Lojas)
- [x] Bug: Relatório IA de Resultados não filtra corretamente por 'Minhas Lojas' para gestores - analisa 70 lojas em vez das 14 atribuídas
- [ ] O backend (routers.ts) passa gestorId para gerarRelatorioComIA, mas não passa lojasIds
- [ ] O aiService.ts quando recebe gestorId busca relatórios do gestor, mas busca TODOS os dados de ranking sem filtrar
- [ ] Corrigir para passar lojasIds do gestor ao backend

- [ ] Uniformizar filtros temporais em toda a aplicação (mês atual, mês anterior, trimestre anterior, semestre anterior, ano anterior)

## Uniformização de Filtros Temporais v6.2
- [x] Uniformizar filtros temporais em toda a aplicação
- [x] HistoricoPontos.tsx: Alterar de "7d, 30d, 90d, all" para "Mês Atual, Mês Anterior, Trimestre Anterior, Semestre Anterior, Ano Anterior"
- [x] RelatoriosIA.tsx: Alterar de "diário, semanal, mensal..." para "Mês Atual, Mês Anterior, Trimestre Anterior, Semestre Anterior, Ano Anterior"
- [x] ResumosGlobais.tsx: Alterar de "mensal, trimestral, semestral, anual" para "Mês Atual, Mês Anterior, Trimestre Anterior, Semestre Anterior, Ano Anterior"
- [x] Dashboard.tsx: Atualizar lembretes de resumos globais para usar novos nomes de períodos
- [x] Backend: Atualizar tipos de período em routers.ts, db.ts, resumoGlobalService.ts
- [x] Schema: Atualizar enum de período na tabela resumos_globais
- [x] Migração: Atualizar dados existentes na base de dados

## Relatório Board Completo para Administração v6.3
- [ ] Análise da estrutura atual do Relatório Board
- [ ] Implementar filtro temporal (Mês Atual, Mês Anterior, Trimestre Anterior, Semestre Anterior, Ano Anterior)
- [ ] Secção 1: Resumo Executivo com KPIs principais
- [ ] Secção 2: Análise de Relatórios (livres e completos)
- [ ] Secção 3: Análise por Gestor (performance individual)
- [ ] Secção 4: Análise de Categorias (distribuição e tendências)
- [ ] Secção 5: Análise de Ocorrências Estruturais (impacto e temas)
- [ ] Secção 6: Análise de Resultados (vendas e serviços)
- [ ] Secção 7: Análise de Pendentes (taxa de resolução)
- [ ] Gráficos interativos (barras, linhas, donut)
- [ ] Indicadores visuais (cores, badges, ícones)
- [ ] Recomendações estratégicas da IA
- [ ] Exportação para PDF profissional
- [ ] Testar relatório completo


## Relatório Board Completo para Administração v3.9
- [x] Backend: Serviço de dados agregados com filtros temporais (relatorioBoardService.ts)
- [x] Backend: Análise por gestor (performance individual com score 0-100)
- [x] Backend: Análise de relatórios (livres e completos por gestor e loja)
- [x] Backend: Análise de categorias (distribuição e taxa de resolução)
- [x] Backend: Análise de ocorrências (impacto, abrangência, temas frequentes)
- [x] Backend: Análise de resultados comerciais (serviços, objetivos, vendas)
- [x] Backend: Análise de pendentes (ativos, resolvidos, antigos, por loja)
- [x] Backend: KPIs executivos completos
- [x] Frontend: Página com 7 tabs organizadas (RelatorioBoard.tsx)
- [x] Frontend: Tab Resumo com KPIs, indicadores e evolução temporal (6 meses)
- [x] Frontend: Tab Gestores com score de performance e tabela detalhada
- [x] Frontend: Tab Relatórios com contagem e top 15 lojas
- [x] Frontend: Tab Categorias com gráfico de distribuição por estado
- [x] Frontend: Tab Ocorrências com gráfico de impacto e estatísticas
- [x] Frontend: Tab Pendentes com gráfico de pendentes por loja
- [x] Frontend: Tab Análise IA com geração automática de relatório executivo
- [x] Filtro de período temporal (Mês Atual, Mês Anterior, Trimestre, Semestre, Ano)
- [x] Gráficos interativos com Chart.js (Line, Bar, Doughnut)
- [x] Download de relatório IA em Markdown
- [x] Regenerar análise IA com botão dedicado
- [x] Link no menu lateral e no Dashboard
- [x] Testar todas as funcionalidades

## Correções Relatório Board v6.4
- [x] Bug: Nomes dos gestores apareciam como "Desconhecido" - corrigido para usar gestor.user.name
- [x] Bug: Análise IA usava "Gestor A" em vez do nome real - adicionada instrução explícita no prompt
- [x] Bug: Taxa de reparação - verificado, mostra valores corretos (0% quando não há dados de resultados)

## Melhorias Relatório Board v6.5
- [x] Usar mesmo relatório IA da página Categorias no Relatório Board
- [x] Guardar relatórios gerados no histórico (como na página Categorias)
- [x] Incluir categorias com status "A Acompanhar" no relatório para discussão no board
- [x] Excluir categorias "Em Tratamento" ou "Tratado" do relatório

- [x] Corrigir Taxa de Reparação Média no Relatório Board (mostrar 20% em vez de 0.2%)
- [x] Adicionar botão de exportação para PDF no Relatório Board

## Melhorias Visualização Relatórios Históricos v6.6
- [x] Remover botão Exportar PDF do header do Relatório Board
- [x] Melhorar modal de visualização de relatórios históricos (janela completa)
- [x] Adicionar botão de download PDF no modal de visualização

## Correções v6.2 - Botões Relatório Board e Categorias
- [x] Substituir botão "Descarregar Markdown" por "Descarregar PDF" na tab Análise IA
- [x] Implementar função handleDownloadAnaliseIAPDF para exportar análise IA em PDF formatado
- [x] Remover botão "Gerar Relatório IA para Board" da página Categorias
- [x] Corrigir Taxa de Reparação Média no Relatório Board (multiplicar por 100 para mostrar percentagem correta)
- [x] Bug: Mónica Correira e Rui Adriao não aparecem na tabela de Performance por Gestor do Relatório Board (corrigido: remover slice(0,5) no prompt da IA)
- [x] Remover botão 'Gerar Relatório IA para Board' da página Relatório Board
- [ ] Corrigir texto '[Seu Nome/Consultoria]' no Relatório Executivo para Board
- [ ] Corrigir texto '[Seu Nome/Consultoria]' no Relatório Board para mostrar nome do utilizador
- [x] Verificar e corrigir formatação do PDF descarregado do Relatório Board
- [x] Melhorar PDF do Relatório IA de Resultados para incluir gráficos, cores e layout visual igual à interface web
- [x] Remover cabeçalho roxo exagerado do PDF do Relatório IA de Resultados - design mais sóbrio
- [x] Consolidar layout do Relatório IA de Resultados para gestores (mesmo design profissional do PDF)
- [x] Corrigir PDF do Relatório IA de Resultados para gestores - aplicar mesmo layout profissional que admins
- [x] Bug: Filtros temporais (Trimestre, Semestre, Ano) no Relatório IA Resultados não retornam dados
- [x] Histórico da Loja: Adicionar filtro temporal (Mês, Trimestre, Semestre, Ano)
- [x] Histórico da Loja: Análise IA completa com dados operacionais, resultados, comerciais, pendentes e problemas

## Melhorias Histórico da Loja v6.6
- [x] Exportar PDF do Histórico da Loja com análise IA completa
- [x] Comparação entre períodos no Histórico da Loja (ex: Q4 2024 vs Q4 2025)

## Melhorias PDF Histórico da Loja v6.7
- [x] Reescrever exportação PDF para ficar igual à visualização do portal
- [x] Incluir todas as secções: métricas, resultados, análise comercial, alertas, problemas, pontos fortes, tendências, recomendações
- [x] Layout profissional com cores e organização clara

## Bug Fix v6.8 - Email Relatório Completo Incompleto
- [x] Analisar template de email do Relatório Completo
- [x] Identificar campos em falta (avaliações, resumo, pontos positivos/negativos)
- [x] Corrigir função de geração de HTML do email
- [x] Testar envio de email completo

## Bug Fix: Caracteres estranhos no PDF do Histórico da Loja
- [x] Identificar função de geração do PDF do Histórico da Loja
- [x] Remover emojis dos títulos das secções ou substituir por texto
- [x] Testar geração do PDF sem caracteres estranhos


- [x] Adicionar % Serviços de escovas ao Dashboard de Resultados (importante para prémio trimestral)
- [x] Alterar objetivo mínimo de % Serviços de Escovas de 30%/5% para 7.5%

## Filtros Temporais - Relatório Board
- [x] Substituir filtros predefinidos por seleção múltipla de meses no Relatório Board

## Filtros Temporais - Apenas 2025
- [x] Filtrar meses disponíveis para mostrar apenas 2025 em diante (remover 2024)
- [x] Corrigir filtro de meses para mostrar apenas meses com dados disponíveis (não meses futuros)
- [ ] Implementar seleção múltipla de meses no Dashboard de Resultados (checkboxes como nas outras páginas)

## Funcionalidades v6.2 - Seleção Múltipla de Meses no Dashboard de Resultados
- [x] Implementar seleção múltipla de meses no Dashboard de Resultados (checkboxes como nas outras páginas)
- [x] Criar endpoints para estatísticas com múltiplos meses (estatisticasMultiplosMeses)
- [x] Criar endpoints para ranking com múltiplos meses (rankingMultiplosMeses)
- [x] Criar endpoints para totais globais com múltiplos meses (totaisGlobaisMultiplosMeses)
- [x] Atualizar frontend para usar FiltroMesesCheckbox
- [x] Testar agregação de dados com múltiplos meses selecionados

## Funcionalidade v6.3 - Apagar Relatórios para Gestores
- [x] Adicionar botão de apagar relatórios na página Meus Relatórios
- [x] Implementar diálogo de confirmação antes de eliminar
- [x] Gestor só pode apagar os seus próprios relatórios
- [x] Testar funcionalidade

## Edição de Relatórios Completos (Gestor) v6.4
- [x] Adicionar botão de editar relatórios completos na página Meus Relatórios
- [x] Implementar modal de edição com campos editáveis
- [x] Adicionar botão de reenviar email após edição
- [x] Testar funcionalidade completa


## Correção Legendas PDF Histórico da Loja v6.5
- [x] Identificar código de geração do PDF
- [x] Remover emojis/setas que não são suportados pela fonte
- [x] Substituir por texto legível (ex: "estável", "subida", "descida")
- [x] Testar exportação do PDF

- [x] Corrigir textos cortados no PDF do Histórico da Loja
- [x] Corrigir sobreposição de títulos com badges no PDF
- [x] Implementar word wrap adequado nas descrições

## Gráficos de Evolução no PDF do Histórico da Loja
- [x] Adicionar gráficos de evolução mensal ao PDF do Histórico da Loja

## Melhorias Gráficos PDF Histórico da Loja v6.3
- [x] Remover gráfico de pendentes do PDF
- [x] Adicionar gráfico de taxa de reparação mensal
- [x] Destacar % escovas com alerta quando abaixo de 7.5% (retira prémio)

## Gráficos Histórico da Loja - Quantidades v6.7

- [x] Adicionar quantidade de escovas vendidas ao gráfico de Vendas Complementares
- [x] Mostrar valores absolutos além das percentagens
- [x] Enviar emails automaticamente ao criar ocorrência estrutural (admin + cópia gestor)
- [x] Uniformizar filtros temporais na página Relatórios IA do admin (checkboxes de meses) - Já estava implementado
- [x] Corrigir layout do email de ocorrências - adicionar título visível
- [x] Reorganizar layout mobile do Dashboard - botões Tarefas e Relatório lado a lado
- [x] Alterar botão do topo do Dashboard de Relatório Board para Relatórios IA
- [x] Corrigir Atividade Recente no Dashboard para incluir relatórios completos (atualmente só mostra relatórios livres)

## Bug v6.1.1 - Notificação de Tarefas no Dashboard
- [x] Adicionar contador de tarefas pendentes no botão "Tarefas" do Dashboard
- [x] Adicionar animação de piscar quando há tarefas pendentes (animate-pulse já existia)
- [x] Testar funcionalidade
- [x] Corrigir animação pulse do botão Minhas Tarefas para só piscar quando há tarefas não vistas

## Chatbot IA para Consultas de Dados
- [ ] Criar endpoint backend para processar perguntas em linguagem natural
- [ ] Implementar lógica de busca de dados baseada na pergunta
- [ ] Integrar com LLM para interpretar perguntas e formatar respostas
- [ ] Criar interface de chat no Dashboard de Resultados
- [x] Testar com diferentes tipos de perguntas


## Funcionalidades v6.2 - Chatbot IA para Consultas de Dados
- [x] Criar serviço de chatbot (chatbotService.ts) com processamento de linguagem natural
- [x] Implementar interpretação de perguntas com IA (identificar loja, mês, ano, tipo de consulta)
- [x] Criar endpoint tRPC para processar perguntas (resultados.perguntarChatbot)
- [x] Criar endpoint para sugestões de perguntas (resultados.getSugestoesChatbot)
- [x] Criar componente ResultadosChatbot.tsx com interface de chat
- [x] Integrar chatbot no Dashboard de Resultados (botão flutuante)
- [x] Suporte para perguntas sobre serviços, rankings, taxas de reparação
- [x] Histórico de conversação no chat
- [x] Sugestões de perguntas pré-definidas
- [x] Testes unitários para chatbotService
- [x] Testar com perguntas reais (Viana, ranking, etc.)

## Funcionalidades v6.3 - Chatbot IA Abrangente
- [x] Expandir chatbotService para consultar todos os dados (relatórios, pendentes, lojas, gestores, ocorrências, reuniões, tarefas)
- [x] Criar página dedicada para o chatbot (/assistente-ia)
- [x] Adicionar item "Assistente IA" no topo do menu lateral (primeira opção)
- [x] Suporte para perguntas sobre relatórios livres e completos
- [x] Suporte para perguntas sobre pendentes
- [x] Suporte para perguntas sobre lojas e gestores
- [x] Suporte para perguntas sobre ocorrências estruturais
- [x] Suporte para perguntas sobre tarefas To-Do
- [x] Testar com diferentes tipos de perguntas

## Bug Fix - Assistente IA não acede a resultados por loja
- [x] Investigar porque o chatbot não consegue consultar resultados mensais por loja
- [x] Corrigir função de consulta de dados de resultados no chatbotService
- [x] Testar com pergunta sobre resultados de Viana do Castelo em Outubro 2025
- [x] Corrigir Assistente IA para consultar TODAS as lojas da rede (não apenas as do gestor logado)

## Melhorias no Assistente IA - Dados Adicionais
- [x] Adicionar vendas complementares ao contexto do chatbot
- [x] Adicionar associação gestor-loja ao contexto do chatbot
- [x] Testar com perguntas sobre vendas e gestores


## Melhorias no Assistente IA - Histórico de Visitas e Comparação de Vendas
- [x] Adicionar histórico de visitas por gestor ao contexto do chatbot
- [x] Adicionar comparação entre períodos de vendas complementares
- [x] Testar com perguntas sobre visitas e evolução de vendas


## Bug Fix - Nome do Gestor "undefined" no Assistente IA
- [x] Corrigir bug onde o nome do gestor aparece como "undefined" no chatbot
- [ ] Testar com perguntas sobre gestores

## Reuniões de Lojas - Lista Compacta
- [x] Mostrar reuniões em lista compacta (apenas nome/data)
- [x] Expandir conteúdo completo apenas ao clicar na reunião
- [ ] Corrigir Relatórios IA que não funcionam para gestores e admin
- [ ] Melhorar Relatórios IA com resumo detalhado, análise do conteúdo e quantidade por loja

## Correção Relatórios IA v6.6
- [x] Melhorar função gerarRelatorioComIAMultiplosMeses para usar análise completa
- [x] Incluir resumo detalhado do conteúdo dos relatórios
- [x] Incluir quantidade de relatórios por loja
- [x] Incluir análise baseada nos dados reais dos relatórios
- [x] Corrigir erro TypeScript na função gerarDicaDashboard
- [x] Testar geração de relatórios IA


## Correção Relatórios IA Gestores v6.6
- [x] Criar função gerarRelatorioIAGestor específica para gestores
- [x] Análise qualitativa baseada nos relatórios do próprio gestor (não do país)
- [x] Mostrar pontos positivos e negativos destacados nos relatórios
- [x] Mostrar pendentes criados e resolvidos no período
- [x] Análise IA personalizada com sugestões e mensagem motivacional
- [x] Renderização condicional no frontend (gestor vs admin)
- [x] Remover estatísticas numéricas do país para gestores


## Correção Relatórios IA Gestores v6.7
- [x] Corrigir campos de pontos destacados (usar pontosPositivos/pontosNegativos em vez de pontosPositivosDestacar/pontosNegativosDestacar)
- [x] Corrigir função gerarRelatorioIAGestor para usar nomes de campos corretos do schema


## Bug - Relatórios IA sem conteúdo
- [ ] Investigar porque Relatórios IA mostram "Sem dados suficientes"
- [ ] Verificar se há dados de supervisões/relatórios na base de dados
- [ ] Corrigir lógica de geração de conteúdo nos Relatórios IA
- [ ] Testar que os dados aparecem corretamente após correção


## Bug - Relatórios IA para Gestores não mostram dados
- [ ] Página RelatoriosIA.tsx não suporta formato de resposta de gestor (tipoRelatorio: 'gestor')
- [ ] Campos esperados pela UI: resumo, lojaMaisVisitada, lojaMenosVisitada, pontosPositivos, pontosNegativos
- [ ] Campos recebidos de gestor: resumoGeral, pontosDestacados.positivos/negativos, relatorios.lojasVisitadas
- [ ] Solução: Adaptar UI para detectar tipoRelatorio e mostrar dados corretos


## Bug - Relatórios IA para Gestores v6.2
- [x] Identificar problema: página mostra secções de admin em vez de gestor
- [x] Adicionar fallback para buscar gestor diretamente quando ctx.gestor não existe
- [x] Adicionar logs de debug no router gerarMultiplosMeses
- [x] Adicionar logs de debug no frontend RelatoriosIA.tsx
- [ ] Testar com conta de gestor após publicação


## Melhorias Relatórios IA para Gestores v6.3
- [ ] Adicionar lista de lojas visitadas com frequência de visitas
- [ ] Adicionar contagem de pendentes resolvidos vs por resolver
- [ ] Adicionar estatísticas mais detalhadas (relatórios por loja, etc.)
- [ ] Testar com conta de gestor

## Correção Relatórios IA Gestor v6.3.1
- [x] Mostrar quantidades resumidas de pendentes (resolvidos vs por resolver) - sem listar todos
- [x] Adicionar gráficos de visitas por loja
- [x] Adicionar gráficos de pendentes por loja
- [x] Destacar pendentes mais antigos (atenção urgente)
- [x] Mostrar pontos positivos e negativos destacados
- [x] Atualizar PDF para incluir todos estes dados

## Reuniões de Gestores - Sistema de Tópicos Colaborativos v6.4

- [x] Criar tabela topicosReuniaoGestores no schema (gestorId, titulo, descricao, estado, reuniaoId)
- [x] Criar endpoints para gestores submeterem tópicos
- [x] Criar página para gestores verem e submeterem tópicos pendentes
- [x] Modificar página de Reuniões Gestores para admin ver tópicos pendentes
- [x] Implementar marcação de tópicos como "analisado" pelo admin
- [x] Implementar geração de relatório com IA após reunião
- [x] Implementar criação automática de pendentes para gestores
- [x] Implementar confirmação de tópicos discutidos/não discutidos
- [x] Implementar libertação de tópicos para próxima reunião
- [x] Implementar exportação PDF do relatório
- [x] Implementar envio de relatório por email aos gestores

## Melhoria - Enviar email de reunião também ao admin
- [x] Adicionar admin que criou a reunião como destinatário automático do email
- [x] Buscar email do admin a partir do criadoPorId da reunião

## Relatórios Admin visíveis para Gestor
- [x] Verificar que relatórios criados pelo admin aparecem no histórico do gestor da loja (já implementado - filtra por lojaId)
- [x] Verificar que pendentes criados pelo admin ficam visíveis para o gestor responsável pela loja (já implementado - filtra por gestorLojas)

## Alertas de Tarefas no Portal da Loja
- [x] Adicionar campo vistoLoja ao schema de tarefas (já existia)
- [x] Criar endpoint para contar tarefas não vistas pela loja
- [x] Adicionar alerta visual (badge, animação pulse) no Portal da Loja
- [x] Marcar tarefas como vistas quando a loja as visualiza



## Idioma Inglés no Portal da Loja
- [x] Criar ficheiros de tradução (PT e EN)
- [x] Implementar contexto de idioma com persistência
- [x] Adicionar seletor de idioma no header do Portal
- [x] Traduzir todos os textos do Portal para inglés (tabs e header)
- [x] Testar alternância entre idiomas (testes unitários passaram)


## Idioma Inglês em Toda a Aplicação
- [x] Expandir ficheiros de tradução (PT e EN) para toda a aplicação
- [x] Adicionar seletor de idioma ao DashboardLayout (header)
- [x] Traduzir menu lateral (todos os itens)
- [x] Traduzir Dashboard principal
- [ ] Traduzir páginas de gestão (Lojas, Gestores, Relatórios, etc.)
- [ ] Testar alternância entre idiomas em toda a aplicação

## Tradução Completa para Inglês v6.0 (Jan 2026)
- [x] Expandir ficheiros de tradução PT e EN
- [x] Traduzir página Lojas
- [x] Traduzir página Gestores
- [x] Traduzir página Relatorios
- [x] Traduzir página RelatorioLivre
- [x] Traduzir página Pendentes
- [x] Traduzir página MinhasLojas
- [x] Traduzir página AssistenteIA
- [x] Traduzir página Todos
- [x] Traduzir página MeusRelatorios
- [x] Traduzir página GestaoUtilizadores

## Tradução Completa - Fase 2 (Jan 2026)
- [ ] Traduzir página HistoricoPontos
- [ ] Traduzir página HistoricoLoja
- [ ] Traduzir página HistoricoRelatoriosIA
- [ ] Traduzir página ResultadosDashboard
- [ ] Traduzir página ResultadosUpload
- [ ] Traduzir página ComparacaoLojas
- [ ] Traduzir página RelatorioIAResultados
- [ ] Traduzir página ReuniõesGestores
- [ ] Traduzir página ReuniõesLojas
- [ ] Traduzir página OcorrenciasEstruturais
- [ ] Traduzir página HistoricoOcorrencias
- [ ] Traduzir página RelatoriosIA
- [ ] Traduzir página ResumosGlobais
- [ ] Traduzir página RelatorioBoard
- [ ] Traduzir página Categorias
- [ ] Traduzir página RelatorioCompleto
- [ ] Traduzir página TopicosReuniao
- [ ] Adicionar seletor de idioma visível no header

## Tradução Completa - Fase 2 CONCLUÍDA (Jan 2026)
- [x] Traduzir página HistoricoPontos
- [x] Traduzir página HistoricoLoja (toasts e imports)
- [x] Traduzir página RelatoriosIA (toasts e imports)
- [x] Adicionar import useLanguage a 21 páginas restantes
- [x] Adicionar seletor de idioma visível no header (desktop e mobile)
- [x] Seletor de idioma no Breadcrumbs (desktop)
- [x] Seletor de idioma no header móvel do DashboardLayout

## Tradução Completa - Fase 3 (Jan 2026)
- [x] Traduzir página ReuniõesGestores
- [x] Traduzir página ReuniõesLojas
- [x] Traduzir página OcorrenciasEstruturais
- [x] Traduzir página HistoricoOcorrencias
- [x] Traduzir página ResultadosDashboard
- [x] Traduzir página ResultadosUpload
- [ ] Traduzir página ComparacaoLojas
- [x] Traduzir página RelatorioIAResultados (parcial)
- [x] Traduzir página Categorias
- [ ] Traduzir página RelatorioCompleto
- [x] Traduzir página TopicosReuniao
- [ ] Traduzir página ResumosGlobais
- [ ] Traduzir página RelatorioBoard
- [ ] Traduzir página HistoricoRelatoriosIA
- [ ] Traduzir página ComparacaoRelatoriosIA


## Tradução Completa - Fase 4 (Jan 2026) - TODAS AS PÁGINAS
- [ ] Traduzir Dashboard completamente (todos os textos hardcoded)
- [ ] Traduzir página ComparacaoLojas
- [ ] Traduzir página RelatorioCompleto
- [ ] Traduzir página ResumosGlobais
- [ ] Traduzir página RelatorioBoard
- [ ] Traduzir página HistoricoRelatoriosIA
- [ ] Traduzir página ComparacaoRelatoriosIA
- [ ] Traduzir página PortalLoja completamente
- [ ] Traduzir componentes partilhados (modais, filtros, etc.)
- [ ] Verificar e completar todas as páginas já traduzidas parcialmente
- [ ] Atualizar ficheiros PT e EN com todas as chaves em falta

## Tradução Completa PT/EN v4.x

- [x] Traduzir todos os toasts hardcoded no Dashboard
- [x] Traduzir toasts em ConfiguracoesAlertas
- [x] Traduzir toasts em DashboardAlertas
- [x] Traduzir toasts em HistoricoLoja
- [x] Traduzir toasts em PendentesAdmin
- [x] Traduzir toasts em PortalLoja
- [x] Traduzir toasts em RelatorioLivre
- [x] Traduzir toasts em RelatorioCompleto
- [x] Traduzir toasts em ReunioesQuinzenais
- [x] Traduzir toasts em Todos
- [x] Traduzir toasts em TodoWidget
- [x] Traduzir toasts em PortalLojaWidget
- [x] Traduzir toasts em AnexosUpload
- [x] Traduzir toasts em AtribuirAcoesModal
- [x] Traduzir toasts em EnviarEmailModal
- [x] Traduzir toasts em HistoricoRelatoriosIA (componente)
- [x] Traduzir toasts em RelatorioDetalheModal
- [x] Traduzir toasts em RelatorioIACategorias
- [x] Traduzir toasts em VoiceRecorder
- [x] Corrigir erros TypeScript em HistoricoRelatoriosIA


## Tradução Completa PT/EN v5.0 - CONCLUÍDA (Jan 2026)
- [x] Traduzir 104 textos hardcoded em 39 ficheiros
- [x] Atualizar Breadcrumbs.tsx com traduções dinâmicas
- [x] Atualizar FiltroMesesCheckbox.tsx com nomes de meses PT/EN
- [x] Atualizar EstadoAcompanhamento.tsx com labels PT/EN
- [x] Adicionar useLanguage() a componentes sem acesso a language
- [x] Corrigir erros TypeScript (6 → 0 erros)
- [x] Testar alternância de idioma PT/EN
- [x] Verificar que todos os textos estão traduzidos

## Correção de Traduções i18n - Versão Inglesa
- [ ] Traduzir "Relatório" → "Report" no botão do dashboard
- [ ] Traduzir "Lojas e Gestores" → "Stores and Managers"
- [ ] Traduzir "Relatórios" → "Reports"
- [ ] Traduzir "Pendentes" → "Pending"
- [ ] Traduzir "Ocorrências" → "Occurrences"
- [ ] Traduzir "Tarefas To-Do" → "To-Do Tasks"
- [ ] Traduzir "Resultados" → "Results"
- [ ] Traduzir "Histórico da Loja" → "Store History"
- [ ] Traduzir "Configurar Análise" → "Configure Analysis"
- [ ] Traduzir "Período (selecione meses)" → "Period (select months)"
- [ ] Traduzir "Loja" → "Store"
- [ ] Traduzir "Gerar Análise IA" → "Generate AI Analysis"
- [ ] Traduzir "Comparar Período" → "Compare Period"
- [ ] Traduzir "Histórico de Relatórios IA" → "AI Reports History"
- [ ] Traduzir "Comparar Relatórios" → "Compare Reports"
- [ ] Traduzir "Filtros de Período" → "Period Filters"
- [ ] Traduzir "Data Início" → "Start Date"
- [ ] Traduzir "Data Fim" → "End Date"
- [ ] Traduzir "Lojas * (pode selecionar várias)" → "Stores * (can select multiple)"
- [ ] Traduzir "Gerar Relatório" → "Generate Report"
- [ ] Traduzir "Nenhum relatório gerado" → "No report generated"
- [ ] Traduzir textos do AI Assistant
- [ ] Traduzir textos do Complete Report
- [ ] Traduzir textos do AI Results Report
- [ ] Verificar todos os componentes com texto hardcoded em português



## Correção de Traduções i18n v6.3
- [x] Corrigir ficheiro en.json - adicionar traduções em falta
- [x] Corrigir página HistoricoLoja - textos hardcoded
- [x] Corrigir página HistoricoRelatoriosIA - textos hardcoded
- [x] Corrigir página RelatoriosIA - textos hardcoded
- [x] Corrigir página AssistenteIA - textos hardcoded
- [x] Corrigir página RelatorioIAResultados - textos hardcoded
- [x] Corrigir página Dashboard - botão Relatório e textos de resultados
- [x] Corrigir página RelatorioCompleto - label de lojas
- [x] Corrigir componente DashboardLayout - tooltip do botão de tema
- [x] Corrigir componente KeyboardShortcutsHelp - todos os textos
- [x] Adicionar suporte a idioma nas sugestões do chatbot (chatbotService.ts)
- [x] Atualizar procedimento sugestoes para aceitar parâmetro de idioma
- [x] Mesclar secções common duplicadas no en.json

## Funcionalidade - Gravação de Voz no Assistente IA
- [x] Adicionar botão de gravação de voz no chatbot
- [x] Integrar com API Whisper para transcrição
- [x] Enviar transcrição como pergunta ao chatbot

- [ ] Bug: Botão de tarefas na página inicial (Dashboard) não mostra indicador de novas tarefas a piscar


## Chatbot como Assistente de Ajuda v5.5
- [x] Adicionar conhecimento de navegação da plataforma ao chatbot
- [x] Incluir instruções de como criar relatórios livres
- [x] Incluir instruções de como criar relatórios completos
- [x] Incluir instruções de como adicionar lojas e gestores
- [x] Incluir instruções de como resolver pendentes
- [x] Incluir instruções de como usar relatórios IA
- [x] Incluir instruções de atalhos de teclado
- [x] Incluir instruções de exportação PDF e envio de email
- [x] Testar funcionalidade
- [x] Bug: Layout mobile do Assistente IA desconfigurado - header cortado, input cortado
- [x] Melhoria: Skeleton loading nas sugestões do Assistente IA
- [x] Bug: Botão "Minhas Tarefas" no Dashboard não pisca quando há tarefas novas não vistas (corrigido default da coluna vistoGestor na BD)

## Bug v6.4 - Botão Tarefas pisca amarelo incorretamente
- [x] Investigar porque tarefas 120001 e 120002 têm vistoGestor=0 na BD mas na UI aparecem como vistas
- [x] Corrigir lógica de marcação como visto ou corrigir dados na BD


## Ajuste Layout Assistente IA Mobile v6.5
- [x] Ajustar layout do Assistente IA em mobile (tabelas cortadas, texto não visível completo)
- [x] Widget PWA do Assistente IA para instalação no telemóvel


## Correção Sobreposição Botão PWA v6.4.2
- [x] Reorganizar botão de instalação PWA para não sobrepor categorias em mobile
- [x] Mover botão para posição que não interfira com a interface (agora no topo direito)
## BUG CRÍTICO v6.5.1 - PWA Assistente IA instala como Widget Tarefas
- [x] Investigar porque o manifest do Assistente não está a ser usado na instalação
- [x] Criar solução definitiva para separar os dois PWAs
- [ ] Testar instalação do PWA do Assistente IA

## Bug v6.5.2 - PWA Assistente IA mostra nome errado
- [x] PWA Assistente IA mostra "PoweringEG - Tarefas" em vez de "Assistente IA" na instalação
- [x] Botão de instalar PWA só aparece após refresh, não na primeira visita
- [x] Usar hook usePWAInstallAssistente específico em vez do genérico
- [x] Melhorar captura do evento beforeinstallprompt na primeira visita

## Bug v6.5.3 - Botão de instalação PWA ainda não funciona
- [x] Investigar porque o evento beforeinstallprompt não é capturado
- [x] Melhorar página HTML dedicada com instruções de instalação manual
- [x] Adicionar instruções para Chrome/Edge e iOS
- [x] Melhorar hook usePWAInstallAssistente com fallback para página dedicada
- [x] Nota: O problema é do rate limiting (429) no ambiente de preview, não do código
- [x] BUG: Instalação PWA do Assistente IA no Android - mostrar instruções manuais quando prompt não disponível


## Bug v6.4.5 - Layout Assistente IA no desktop
- [x] Caixa de texto não visível sem scroll no desktop
- [x] Ajustar layout para input ficar sempre visível na parte inferior
- [x] Implementar scroll automático para mensagens (já existia)

## Bug v6.5.4 - Nome do ícone PWA no telemóvel
- [x] Corrigir nome do ícone PWA que mostra "Assistente IA" em vez de "PoweringEG"

## Funcionalidade v6.6 - Assistente IA com Contexto Personalizado
- [x] Modificar assistente IA para distinguir perguntas pessoais vs nacionais
- [x] Perguntas sobre "meus pendentes", "meus relatórios" devem filtrar pelo gestor logado
- [x] Perguntas gerais/nacionais continuam a mostrar dados agregados
- [x] Passar informação do gestor logado para o contexto da IA
- [x] Testar separação de contexto


## Bug v6.6.1 - Scroll automático no chatbot PoweringEG
- [x] Implementar scroll automático quando novas mensagens são adicionadas
- [x] Scroll deve ir para o fundo automaticamente após cada resposta
- [x] Manter scroll suave (smooth) para melhor UX
- [x] Bug: Scroll automático não funciona no chatbot - utilizador tem que descer manualmente quando o texto é grande

## Bug v6.6.2 - Layout Mobile do Chatbot (Texto Cortado)
- [x] Corrigir texto cortado na margem direita em respostas longas
- [x] Adicionar scroll horizontal para tabelas
- [x] Melhorar word-wrap para textos grandes
- [x] Testar em dispositivos móveis

## Bug v6.6.3 - Layout Mobile do Chatbot (Correção Definitiva)
- [x] Corrigir texto cortado na margem direita em respostas longas
- [x] Implementar scroll horizontal funcional para tabelas
- [x] Garantir word-wrap correto para títulos e parágrafos
- [ ] Testar em dispositivos móveis reais

## Bug v6.6.4 - Layout Mobile do Widget PWA (Correção Final)
- [x] Identificar que o problema está no AssistenteWidget.tsx (widget PWA) e não na página normal
- [x] Adicionar classes CSS específicas para o widget (.widget-chat-container, .widget-message, .widget-message-content)
- [ ] Testar em dispositivo móvel real


## Bug v6.6.4 - Layout Mobile do Widget PWA (Correção Final)
- [x] Identificar que o problema está no AssistenteWidget.tsx (widget PWA) e não na página normal
- [x] Adicionar classes CSS específicas para o widget
- [x] Implementar estilos para forçar quebra de linha e overflow
- [ ] Testar em dispositivo móvel real

## UI v6.7 - Mover botão de tema
- [x] Mover botão de modo escuro/claro para o header junto ao seletor de idioma
- [x] Remover botão flutuante do canto inferior direito

## Remoção v6.8 - Sistema de Atalhos de Teclado
- [x] Remover componente KeyboardShortcutsHelp
- [x] Remover importação e uso do componente no DashboardLayout
- [x] Testar que a aplicação funciona sem erros

## Widget Chatbot v6.5
- [x] Adicionar suporte para modo claro/escuro ao widget do chatbot PoweringEG

## Modo Demo v6.7 - Portal de Demonstração
- [x] Criar contexto DemoContext para controlar modo demo
- [x] Criar ficheiro de dados fictícios (lojas, gestores, resultados, relatórios)
- [x] Implementar hook useDemoMode para verificar se está em modo demo
- [x] Criar provider que substitui dados reais por fictícios quando em modo demo
- [x] Ativar modo demo via URL (?demo=true) ou utilizador específico
- [x] Integrar modo demo no Dashboard
- [x] Integrar modo demo nas páginas de Lojas e Gestores
- [x] Integrar modo demo nos Resultados
- [x] Integrar modo demo nos Relatórios
- [x] Testar modo demo completo
- [x] Documentar como ativar/desativar modo demo
- [x] Corrigir traduções em falta na página Histórico da Loja (chaves como configurarAnalise, periodoSelecioneMeses, etc.)
- [x] Adicionar secção de recomendações IA em texto no final do Histórico da Loja
- [x] Adicionar traduções em falta na página Nova Ocorrência Estrutural (pt.json e en.json)

## Bug v6.4.6 - Botão de Tema Desktop
- [x] Corrigir botão de alternância de tema (claro/escuro) em falta na versão desktop


## Bug v6.5.2 - Ordenação de Pendentes
- [x] Corrigir ordenação dos pendentes para aparecerem por ordem alfabética de loja


## Bug v6.5.3 - Fábio Dias com nome errado e sem lojas
- [x] Corrigir nome do Fábio Dias que aparece como "fdias" em vez do nome completo
- [x] Verificar e corrigir associação de lojas ao gestor Fábio Dias

## Bug v6.5.4 - Email de reunião de loja não enviado
- [x] Investigar porque o email da reunião de Braga não foi enviado
- [x] Verificar se há sugestão de envio automático após gravar reunião
- [x] Corrigir problema de envio - usar sendEmail em vez de notifyOwner
- [x] Adicionar sugestão automática de envio após gravar reunião de loja

## Bug v6.5.6 - Ícone de modo claro/escuro e traduções
- [x] Ícone de modo claro/escuro já estava funcional (confirmado pelo utilizador)
- [x] Adicionar traduções em falta: relatoriosIA.configuracaoRelatorio
- [x] Adicionar traduções em falta: relatoriosIA.periodoSelecioneMeses

## Funcionalidade v6.6 - Reuniões Lojas na Atividade Recente
- [x] Adicionar reuniões de lojas à secção "Atividade Recente" do Dashboard
- [x] Mostrar reuniões junto com relatórios livres e completos
- [x] Identificar tipo de atividade (Reunião Loja, Relatório Livre, Relatório Completo)

## Bug v3.6 - NotFoundError ao adicionar fotos no Relatório Completo
- [x] Investigar erro "insertBefore" ao adicionar fotos
- [x] Corrigir componente de upload de imagens (useCallback, melhor tratamento de erros)
- [x] Testar funcionalidade de upload de fotos (testado com 4 imagens)

## Bug v6.6 - Traduções em falta na página Histórico de Relatórios IA
- [x] Adicionar tradução: historicoRelatoriosIA.filtrosPeriodo
- [x] Adicionar tradução: historicoRelatoriosIA.filtreRelatoriosPorIntervalo
- [x] Adicionar tradução: historicoRelatoriosIA.dataInicio
- [x] Adicionar tradução: historicoRelatoriosIA.dataFim
- [x] Adicionar tradução: historicoRelatoriosIA.compararRelatorios

## Bug v6.6.2 - Traduções em falta na página Tópicos Reunião
- [x] Adicionar tradução: topicos.titulo
- [x] Adicionar tradução: topicos.descricaoGestor
- [x] Adicionar tradução: topicos.comoFunciona

## Bug v6.5.1 - Comparação de Períodos Mostra Dados Futuros
- [x] Bug: Comparação Q3 2025 vs Q3 2026 mostra período futuro sem dados
- [x] Investigar lógica de comparação de períodos no HistoricoLoja.tsx
- [x] Corrigir para não mostrar períodos futuros ou indicar claramente que não há dados
- [x] Testar funcionalidade corrigida
- [x] Fix missing translations in Reuniões de Lojas page (novaReuniaoLoja, preencherDetalhes, lojas, presencasPlaceholder)
- [x] Bug: Corrigir placeholder de tags em Reuniões de Lojas mostrando chave de tradução
- [x] Bug: Dashboard mostra mês fixo (Dezembro) em vez do último mês carregado
- [x] Feature: Mostrar data de última atualização no card de Resultados do dashboard
- [x] Feature: Auto-save no formulário de Relatório Completo para evitar perda de dados

## Correção v6.6 - Email Outlook Compatibilidade
- [x] Reescrever template de email de ocorrências estruturais para compatibilidade Outlook
- [x] Usar XHTML Transitional DOCTYPE
- [x] Adicionar comentários condicionais para MSO (Microsoft Office)
- [x] Substituir CSS inline complexo por tabelas aninhadas
- [x] Usar bgcolor em vez de background-color para fundos
- [x] Substituir emojis por imagens ou HTML entities
- [x] Testar template

## Bug v6.7 - Labels de tradução na página Upload de Resultados
- [x] Corrigir "common.mes" para mostrar "Mês"
- [x] Corrigir "common.ano" para mostrar "Ano"

## Ajuste v6.8 - Histórico da Loja sem Relatórios
- [x] Remover secção de relatórios do Histórico da Loja
- [x] Manter apenas dados de performance/resultados da loja

## Ajuste v6.8b - Prompt IA Histórico da Loja
- [x] Ajustar prompt da IA para não mencionar relatórios ou responsabilidades do gestor
- [x] Focar análise apenas na performance da loja (resultados, vendas, pendentes)

## Bug v6.9 - Gráfico Evolução Mensal
- [x] Corrigir lógica da barra: pequena/vermelha = longe do objetivo, grande/verde = objetivo atingido
- [x] Barra deve representar progresso em direção ao objetivo, não o desvio

## Feature v6.10 - Gradiente de cores no gráfico Evolução Mensal
- [x] Implementar gradiente vermelho → amarelo → verde conforme progresso aumenta

## Bug v6.10b - Gradiente incorreto no gráfico Evolução Mensal
- [x] Corrigir: verde apenas quando desvio ≥ 0% (objetivo atingido)
- [x] Corrigir: barra deve ser proporcional ao progresso, não 100% para todos
- [x] Gradiente: vermelho (longe) → laranja → amarelo (perto) → verde (atingido)

## Feature v6.11 - Data de atualização no Resultados Dashboard (gestor)
- [x] Adicionar data de última atualização dos dados na página de Resultados Dashboard

## Bug v6.11b - Tradução em falta para dadosAtualizadosEm
- [x] Adicionar chave resultados.dadosAtualizadosEm ao ficheiro PT
- [x] Adicionar chave resultados.dadosAtualizadosEm ao ficheiro EN

## Feature v6.12 - Usar email da loja automaticamente no envio de relatório de reunião
- [x] Remover modal que pede email manualmente
- [x] Usar email da loja do perfil automaticamente
- [x] Se loja não tiver email, mostrar mensagem de erro apropriada

## Feature v6.13 - Edição de Tarefas Não Lidas
- [x] Adicionar botão de editar em tarefas não lidas pelo destinatário
- [x] Criar modal de edição de tarefa (já existia)
- [x] Implementar endpoint de update de tarefa no backend (já existia, adicionada verificação)
- [x] Verificar se tarefa foi lida antes de permitir edição
- [x] Esconder botão de editar após tarefa ser lida

## Feature v6.14 - Indicador visual de tarefa editável
- [x] Adicionar badge "Pode editar" com ícone de lápis nas tarefas que o utilizador criou e ainda não foram lidas

## Feature v6.14 - Indicador visual de tarefa editável
- [x] Adicionar badge "Pode editar" com ícone de lápis nas tarefas que o utilizador criou e ainda não foram lidas (Todos.tsx)
- [x] Adicionar badge "Pode editar" no Portal da Loja para tarefas enviadas não vistas pelo gestor (PortalLoja.tsx)

## Feature v6.14b - Funcionalidade de edição de tarefas no Portal da Loja
- [x] Implementar botão de editar nas tarefas enviadas não vistas
- [x] Criar modal de edição com campos editáveis
- [x] Implementar mutation para atualizar tarefa via backend

## Feature v6.15 - Responder às tarefas das lojas
- [x] Adicionar opção "Responder" no menu de ações das tarefas criadas por lojas
- [x] Criar modal para escrever resposta/comentário
- [x] Guardar comentário no campo apropriado e notificar a loja

## Bug Fix - Link do Portal de Lojas nos emails
- [x] Corrigir URL do portal de lojas nos emails (estava a usar domínio incorreto poweringeg.manus.space em vez de poweringeg-3c9mozlh.manus.space)

## Melhoria - Email do Portal de Lojas
- [x] Adicionar referência às Tarefas na lista de funcionalidades do email

## Melhoria - Renomear Portal no Email
- [x] Alterar "Portal de Reuniões Quinzenais" para "Portal da Loja" no email


## Feature v6.16 - Dashboard de Resultados no Portal da Loja
- [x] Criar endpoint backend dashboardCompleto para resultados da loja com filtros
- [x] Implementar componente Dashboard no Portal da Loja (tab Resultados)
- [x] Adicionar KPIs visuais (serviços, objetivo, desvio, taxa reparação)
- [x] Implementar alertas sobre mínimos/máximos (escovas, reparações)
- [x] Adicionar filtros por período
- [x] Incluir evolução mensal e vendas complementares
- [x] Adicionar barra de progresso para escovas (vermelho→verde conforme objetivo)


#### Feature v6.17 - Reestruturar Portal da Loja com Cards
- [x] Criar página inicial com 4 cards grandes (Resultados, To-Do, Pendentes, Reuniões)
- [x] Implementar navegação por cards em vez de tabs
- [x] Adicionar botão de voltar em cada seção
- [x] Otimizar para mobilecção para regressar aos cards
- [ ] Otimizar layout para mobile
- [ ] Remover navegação por tabs antiga


## Feature v6.16 - Dashboard de Resultados no Portal da Loja
- [x] Criar endpoint backend para resultados da loja com filtros
- [x] Implementar componente Dashboard no Portal da Loja
- [x] Adicionar KPIs visuais (serviços, objetivo, desvio, taxa reparação)
- [x] Implementar alertas sobre mínimos/máximos (escovas, reparações)
- [x] Adicionar filtros por período
- [x] Incluir evolução mensal e vendas complementares


## Feature v6.18 - Simplificar Portal da Loja
- [ ] Remover cards de estatísticas (Pendentes Ativos, Tarefas To-Do, Gestor)
- [ ] Simplificar cabeçalho com nome da loja e gestor
- [ ] Manter apenas os 4 cards grandes na entrada


## Feature v6.18 - Simplificar Portal da Loja
- [x] Remover cards de estatísticas da página inicial
- [x] Simplificar cabeçalho com loja e gestor
- [x] Manter apenas os 4 cards grandes na entrada
- [x] Botão de voltar funcional em todas as secções


## Feature v6.19 - Melhorias no Dashboard de Resultados do Portal da Loja
- [ ] Adicionar data de atualização dos dados
- [ ] Implementar filtros avançados de período (Mês Anterior, Q1, Q2, Q3, Q4, Semestre, Ano)
- [ ] Adicionar gráficos de evolução com Chart.js
- [ ] Implementar comparativos com mês anterior (variação percentual com setas)


## Feature v6.20 - Filtro de Meses Avançado no Portal da Loja
- [ ] Implementar seletor de meses múltiplos igual ao Dashboard Resultados principal
- [ ] Adicionar checkboxes para selecionar vários meses
- [ ] Adicionar botões Q1-Q4 para seleção rápida de trimestres
- [ ] Organizar por ano com scroll
- [ ] Adicionar gráficos interativos com Chart.js
- [ ] Implementar exportação PDF do dashboard de resultados

## Portal da Loja v6.16 - Gráficos Chart.js e Exportação PDF
- [x] Substituir gráficos simples por gráficos interativos Chart.js
- [x] Gráfico de linha: Evolução de Serviços vs Objetivo
- [x] Gráfico de barras: Desvio Percentual vs Objetivo
- [x] Gráfico de linha: Evolução da Taxa de Reparação com linha de objetivo (22%)
- [x] Tabela detalhada de evolução com coluna de taxa de reparação
- [x] Botão de exportação PDF no dashboard de resultados
- [x] PDF com título, período, data de geração e rodapé
- [x] PDF com captura de alta qualidade dos gráficos
- [x] PDF multi-página quando conteúdo excede uma página

## Portal da Loja v6.17 - Gráfico de Vendas Complementares
- [x] Adicionar gráfico de barras horizontal para vendas complementares
- [x] Adicionar gráfico doughnut para distribuição percentual
- [x] Incluir escovas, polimento, tratamento, lavagens e outros
- [x] Mostrar comparação visual entre categorias com cores distintas
- [x] Barra de progresso de escovas com marcadores de objetivo (10%) e mínimo (7.5%)
- [x] Cards coloridos com valores por categoria

## Portal da Loja v6.18 - Correção de Filtro de Datas
- [x] Mostrar dia completo na data de atualização (dia da semana, dd/mm/yyyy, hh:mm)
- [x] Mês anterior já estava selecionado por defeito (verificado no código)

## Portal da Loja v6.19 - Indicador de Dia Útil do Mês
- [x] Calcular dias úteis do mês (excluir sábados e domingos)
- [x] Mostrar indicador "Dia X de Y dias úteis" com ícone de calendário
- [x] Adicionar barra de progresso visual do mês com cores (verde/amarelo/vermelho)
- [x] Mostrar percentagem do mês decorrido

## Portal da Loja v6.20 - Feriados, Alertas e Previsão
- [x] Adicionar feriados nacionais portugueses ao cálculo de dias úteis (10 fixos + 3 móveis)
- [x] Implementar alerta quando faltar menos de 5 dias úteis para fim do mês
- [x] Mostrar previsão de serviços necessários para atingir objetivo mensal
- [x] Mostrar número de feriados no mês atual
- [x] Mensagem de parabéns quando objetivo é atingido

## Portal da Loja v6.21 - Correção Mês Padrão
- [x] Alterar mês padrão do Dashboard de Resultados para mês atual (Janeiro 2026)

## Portal da Loja v6.22 - Card Tarefas Piscar
- [x] Adicionar animação de piscar (animate-pulse + ring) ao card de tarefas na home
- [x] Ícone de tarefas com animate-bounce quando há novas
- [x] Badge amarelo com contagem de tarefas novas
- [x] Texto dinâmico "Tem tarefas novas do gestor!"
- [x] Marcar tarefas como vistas ao clicar no card

## Portal da Loja v6.23 - Reorganizar Dashboard Resultados
- [x] Mover os 4 cards principais (Serviços, Objetivo, Desvio, Taxa Rep.) para o topo
- [x] Alertas aparecem logo após os cards
- [x] Vendas Complementares e gráficos abaixo dos alertas

## v6.24 - Open Graph Preview com Logo
- [x] Configurar meta tags Open Graph para preview de links
- [x] Usar logo PoweringEG (512x512) como imagem de preview
- [x] Adicionar descrição da plataforma nas meta tags
- [x] Configurar Twitter Card para partilha

## v6.25 - Corrigir URL Imagem Open Graph
- [x] Usar URL absoluto com domínio publicado (https://poweringeg-3c9mozlh.manus.space/) para imagem OG

## v6.26 - Imagem OG e Meta Tags Dinâmicas
- [x] Criar imagem OG personalizada 1200x630px com logo + nome PoweringEG
- [x] Adicionar meta tag og:url com URL canónica
- [x] Adicionar og:locale pt_PT
- [x] Atualizar twitter:card para summary_large_image
- [x] Configurar meta tags dinâmicas no Portal da Loja (título e descrição mudam com nome da loja)

## v6.27 - Atualizar Descrição OG
- [x] Atualizar descrição para: "Plataforma de gestão da rede ExpressGlass - Dashboard de resultados, reuniões quinzenais, tarefas e relatórios com IA"

## v6.28 - Análise IA no Dashboard da Loja
- [ ] Criar procedimento backend para análise IA dos resultados da loja
- [ ] Análise de urgências - onde focar para atingir objetivos
- [ ] Comparativo com mês anterior - evolução e tendências
- [ ] Alertas e recomendações personalizadas
- [ ] Médias e projeções - ritmo necessário
- [ ] Mensagem motivacional - reforço anímico com base nos dias restantes
- [ ] Adicionar secção visual no Portal da Loja

## v6.28 - Análise IA no Dashboard da Loja
- [x] Criar procedimento backend para gerar análise IA dos resultados
- [x] Adicionar secção de Análise IA no Dashboard de Resultados
- [x] Incluir urgências, alertas, pontos fortes
- [x] Comparativo com mês anterior
- [x] Projeção para fechar o mês
- [x] Mensagem motivacional personalizada
- [x] Botão para regenerar análise

## v6.29 - Gráfico de Evolução Semanal
- [x] Criar gráfico de linha mostrando evolução semana a semana dentro do mês
- [x] Mostrar serviços acumulados por semana (Semana 1, 2, 3, 4)
- [x] Incluir linha de objetivo acumulado para comparação
- [x] Cards resumo por semana com percentagem de cumprimento
- [x] Destaque visual da semana atual
- [x] Cores dinâmicas (verde/vermelho) conforme performance

## v6.30 - Simplificar Análise IA
- [x] Manter apenas: Foco Urgente, Pontos Positivos, Resumo
- [x] Remover: Alertas, Comparativo, Projeção
- [x] Mudar título "Mensagem de Força" para "Resumo"

## v6.31 - Renomear Menu
- [x] Mudar "Reuniões Quinzenais" para "Portal da Loja" no menu lateral

## v6.32 - Remover Gráfico Semanal
- [x] Remover gráfico de Evolução Semanal do Mês (dados não são reais, apenas estimativa)

## v6.33 - Remover Avisos Relatórios
- [x] Remover aviso de "Lojas com relatórios em atraso" do Dashboard (ocupa muito espaço)

## v6.34 - Corrigir Tradução Menu
- [x] Corrigir erro de tradução 'menu.items.portalLoja' no menu lateral (PT e EN)

## v6.35 - Projeção de Visitas (Super Projeto)
- [ ] Criar schema de base de dados para projeções de visitas
- [ ] Criar procedimento backend para gerar projeção automática
- [ ] Implementar critérios: lojas menos visitadas, mais pendentes, resultados baixos
- [ ] Criar página/componente frontend de Projeção de Visitas
- [ ] Permitir escolher período: esta semana ou próxima semana
- [ ] Gerar links para Google Calendar
- [ ] Gerar links para Apple Calendar (ICS)
- [ ] Gerar links para Outlook
- [ ] Adicionar ao menu e Dashboard principal

## Projeção de Visitas v6.6
- [x] Criar tabelas projecoesVisitas e visitasPlaneadas no schema
- [x] Implementar funções de base de dados para projeções
- [x] Criar router projecaoVisitas com endpoints gerar, atual, getVisitas
- [x] Implementar algoritmo de priorização (tempo sem visita, pendentes, resultados)
- [x] Criar componente ProjecaoVisitas com modal de seleção de período
- [x] Integrar com Google Calendar, Outlook e Apple Calendar
- [x] Suporte para admins sem gestor associado
- [x] Testar geração de projeção e links de calendário


## Bug: Objetivos Mensais a Zero no Portal da Loja
- [x] Investigar porque os objetivos mensais aparecem a zero no gráfico
- [x] Verificar se os dados existem na base de dados
- [x] Corrigir o código que carrega os objetivos (campo objetivoMes -> objetivoMensal)
- [x] Testar no Portal da Loja Paredes


## Desvio vs Objetivo Diário no Portal da Loja
- [x] Verificar campos de objetivo diário no schema (objetivoDiaAtual, desvioObjetivoAcumulado)
- [x] Atualizar card vermelho para mostrar desvio vs objetivo diário
- [x] Testar no Portal da Loja


## Relacionamento de Lojas (v6.7)
- [ ] Criar tabela de relações entre lojas no schema
- [ ] Adicionar funções de base de dados para gerir relações
- [ ] Criar routers para CRUD de relações
- [ ] Adicionar interface de gestão de relações na página do gestor
- [ ] Modificar Portal da Loja para suportar lojas relacionadas
- [ ] Adicionar seletor de loja quando há lojas relacionadas


## Funcionalidades v6.6.15 - Melhorias na Página de Relações de Lojas
- [x] Agrupar relações por loja principal (mostrar grupo completo numa única linha)
- [x] Botão "Adicionar loja" diretamente em cada grupo existente
- [x] Visualização clara de todas as lojas relacionadas num grupo

## Bug v6.6.16 - Seletor de Lojas no Portal da Loja
- [x] Corrigir nome duplicado no header (ex: "MycarcenterMycarcenter")
- [x] Tornar seletor de lojas mais visível com ícone de seta claro
- [x] Garantir que os dados mudam quando se seleciona outra loja
- [x] Melhorar UX do seletor em mobile

## Funcionalidade v6.6.17 - Preview do Link no WhatsApp
- [x] Criar endpoint para gerar meta tags dinâmicos com nome da loja
- [x] Mostrar nome da loja no título do preview
- [x] Descrição personalizada com informações da loja

## Melhoria v6.6.18 - Layout do Seletor de Lojas
- [x] Fundo branco no seletor para indicar que é clicável
- [x] Texto escuro para melhor contraste
- [x] Ícone de seta mais visível

## Bug v6.6.19 - Sobreposição no Header Mobile
- [x] Corrigir sobreposição do seletor de lojas com o seletor de idioma
- [x] Reorganizar layout do header para mobile

## Funcionalidade v6.6.20 - Portal do Gestor
- [x] Criar página PortalGestor.tsx com seletor de todas as lojas do gestor
- [x] Reutilizar interface do Portal da Loja (cards Resultados, Tarefas, Pendentes, Reunião)
- [x] Adicionar rota /portal-gestor no App.tsx
- [x] Adicionar entrada "Portal Gestor" no menu lateral

## Bug v6.6.21 - Dashboard do Gestor sem Dados
- [ ] Gráfico "Evolução de Visitas" vazio para gestor Fábio Dias
- [ ] "Meus Relatórios" mostra 0 apesar de ter feito relatórios
- [ ] Investigar associação do gestor com user
- [ ] Verificar queries que filtram por gestorId

## Bug v6.6.21 - Tradução Menu Portal Gestor
- [x] Corrigir tradução "menu.items.portalGestor" que mostra a chave em vez do texto

## Funcionalidade v6.6.22 - Completar Portal do Gestor
- [ ] Reescrever PortalGestor.tsx para ter exatamente a mesma interface do PortalLoja.tsx
- [ ] Incluir gráficos de evolução mensal
- [ ] Incluir calendário com dias úteis e feriados
- [ ] Incluir recomendações/Análise IA
- [ ] Incluir todos os KPIs detalhados
- [ ] Manter seletor de lojas no topo para o gestor alternar entre lojas

## Portal do Gestor - Funcionalidades Completas v6.6
- [x] Expandir endpoint dashboardCompletoGestor com todos os dados (complementares, evolução, comparativo, alertas)
- [x] Criar endpoint analiseIAGestor para análise IA de lojas do gestor
- [x] Adicionar KPIs principais (Serviços, Objetivo, Desvio, Taxa Reparação)
- [x] Adicionar alertas automáticos baseados nos KPIs
- [x] Adicionar gráficos de vendas complementares (barras + doughnut)
- [x] Adicionar barra de progresso de escovas com objetivos (10% e 7.5%)
- [x] Adicionar comparativo com mês anterior (variações)
- [x] Adicionar gráficos de evolução mensal (Serviços vs Objetivo, Desvio %, Taxa Reparação)
- [x] Adicionar análise IA com foco urgente, pontos positivos e resumo
- [x] Adicionar exportar PDF dos resultados
- [x] Interface igual ao Portal da Loja


## Bug v6.6.1 - Erro ao exportar PDF no Portal do Gestor
- [x] Investigar erro de exportação PDF
- [x] Corrigir função handleExportPDF (usar mesma lógica do PortalLoja)
- [x] Adicionar suporte a múltiplas páginas no PDF
- [x] Adicionar título, período e rodapé ao PDF
- [x] Testar exportação


## Funcionalidade v6.6.3 - Exportação PDF via Servidor
- [x] Criar endpoint de exportação PDF no servidor usando PDFKit
- [x] Gerar PDF com dados estruturados (KPIs, alertas, complementares, comparativo)
- [x] Atualizar frontend para usar endpoint do servidor
- [ ] Testar em dispositivos móveis


## Bug v6.6.4 - Layout do PDF mal configurado
- [x] Corrigir sobreposição de textos no PDF
- [x] Organizar secções verticalmente (não lado a lado)
- [x] Corrigir posicionamento dos alertas
- [x] Corrigir barra de progresso das escovas
- [x] Melhorar espaçamento entre secções


## Melhoria v6.6.5 - PDF completo como o portal da loja
- [x] Adicionar secção "Ritmo Necessário" (serviços/dia, dias úteis restantes)
- [x] Adicionar secção "Gap Reparações" (quantas faltam para 22%)
- [x] Adicionar tabela de evolução mensal (Serviços, Objetivo, Desvio%, Taxa Rep.)
- [x] Garantir que análise IA é sempre gerada e incluída
- [ ] Testar PDF completo


## Melhoria v6.6.6 - Gráficos visuais no PDF
- [x] Instalar biblioteca de gráficos para PDFKit (chartjs-node-canvas)
- [x] Adicionar gráfico de barras: Serviços vs Objetivo (6 meses)
- [x] Adicionar gráfico de barras colorido: Desvio % (6 meses)
- [x] Adicionar gráfico de linha: Taxa de Reparação com objetivo 22% (6 meses)
- [ ] Testar PDF com gráficos


## Melhoria v6.6.7 - Gráfico de vendas complementares no PDF
- [x] Criar função gerarGraficoBarrasComplementares no chartService
- [x] Adicionar gráfico de barras horizontais com distribuição de vendas complementares
- [x] Integrar gráfico na página de gráficos do PDF
- [ ] Testar PDF com novo gráfico


## Bug v6.6.8 - PDF sem gráficos e análise IA
- [x] Reescrever pdfService com gráficos nativos do PDFKit (sem dependência de chartjs-node-canvas)
- [x] Desenhar gráficos de barras (Serviços vs Objetivo)
- [x] Desenhar gráfico de desvio % com barras coloridas
- [x] Desenhar gráfico de linha (Taxa de Reparação)
- [x] Desenhar gráfico de barras horizontais (Complementares)
- [x] Adicionar logs de debug para diagnosticar problemas
- [ ] Testar PDF completo


## Melhoria v6.6.9 - Logótipo ExpressGlass no PDF
- [x] Encontrar ou descarregar logótipo ExpressGlass (já existia em client/public)
- [x] Copiar logótipo para server/assets
- [x] Adicionar logótipo ao cabeçalho do PDF
- [ ] Testar PDF com logótipo


## Bug v6.7.0 - PDF incompleto (logótipo, gráficos, análise IA em falta)
- [ ] Corrigir caminho do logótipo ExpressGlass
- [ ] Corrigir geração de gráficos de evolução (página 2 vazia)
- [ ] Garantir que análise IA é sempre incluída
- [ ] Testar PDF completo



## Bug v6.7.1 - PDF com páginas vazias e logótipo em falta
- [x] Corrigir base64 do logótipo ExpressGlass (estava corrompido)
- [x] Validar que o logótipo gera PNG válido (7187 bytes)
- [x] Corrigir lógica de paginação para evitar páginas vazias
- [x] Usar posição Y fixa (780) para rodapé em vez de doc.page.height
- [x] Adicionar logs de debug para análise IA
- [x] Testar PDF completo - agora tem 3 páginas sem vazias


## v6.8.0 - PDF Completo (18/01/2026)
- [x] Logótipo ExpressGlass funcional no PDF
- [x] Secção Ritmo para Atingir Objetivo incluída
- [x] Análise IA incluída na página 1
- [x] Gráficos de evolução (3 páginas)
- [x] Sem páginas vazias
- [x] Rodapé na última página


## Limitar pendentes por foto (18/01/2026)
- [x] Limitar criação de pendentes a máximo 2 por foto na análise de imagens


## PWA Portal da Loja (18/01/2026)
- [x] Criar manifest.json para PWA (manifest-portal-loja.json)
- [x] Criar service worker para funcionamento offline (sw-portal-loja.js)
- [x] Adicionar prompt de instalação com instruções (banner verde com botão Instalar)
- [x] Guardar token no localStorage para persistência (já existia)
- [x] Criar ícones da app (portal-loja-icon-192.png e portal-loja-icon-512.png)


## Atualizar PWA com logo PoweringEG (18/01/2026)
- [x] Criar ícones PWA com logo PoweringEG (copiados de poweringeg-ai-icon)
- [x] Atualizar manifests para usar novos ícones e nome PoweringEG
- [x] Incrementar versão do service worker para forçar atualização (v2)


## PWA Portal do Gestor (18/01/2026)
- [x] Criar manifest para Portal do Gestor (manifest-portal-gestor.json)
- [x] Criar service worker para Portal do Gestor (sw-portal-gestor.js)
- [x] Adicionar lógica PWA ao Portal do Gestor (banner de instalação roxo)


## Bug Crítico - Erro de Publicação canvas (18/01/2026)
- [x] Remover dependência chartjs-node-canvas que requer canvas nativo
- [x] Remover referência a canvas do onlyBuiltDependencies


## Exportar PDF no Portal da Loja (18/01/2026)
- [ ] Adicionar botão Exportar PDF na secção Resultados do Portal da Loja
- [ ] Reutilizar o pdfService existente para gerar o PDF


## Funcionalidades v6.7 - PDF Profissional no Portal da Loja
- [x] Replicar exportação PDF do Portal do Gestor para o Portal da Loja
- [x] Usar endpoint do servidor (pdfService) em vez de html2canvas
- [x] PDF inclui: logótipo, KPIs, alertas, ritmo para objetivo, complementares, análise IA, gráficos evolução
- [x] Remover imports não utilizados (html2canvas, jsPDF) do PortalLoja
- [x] Adicionar mutation exportarPDFMutation no PortalLoja
- [x] Criar testes para o endpoint todosPortalLoja.exportarPDFResultados
- [x] Atualizar versão para v6.7


## Bugs v6.7.1 - Correções Portal da Loja
- [x] Corrigir erro ao gerar PDF no Portal da Loja (erro reportado pelo utilizador) - NOTA: Já corrigido em v6.7, falta publicar
- [x] Adicionar botão permanente "Instalar App" no header do Portal da Loja


## Bugs v6.7.2 - Correções Portal da Loja
- [x] Incluir análise IA no PDF exportado do Portal da Loja (parsing robusto melhorado)
- [x] Esconder métricas de dias úteis/tempo em falta quando mês selecionado não é o atual
- [x] Tornar botão de instalação PWA mais visível no header (botão branco com texto "Instalar App")


## Bugs v6.7.3 - Correções Portal da Loja
- [x] Corrigir emojis no PDF (aparecem como caracteres estranhos) - substituídos por [!], [+], [>]
- [x] Melhorar feedback do botão de instalação PWA (toast com instruções detalhadas)


## Funcionalidade v6.8 - Menu Inicial PWA
- [x] Criar página MenuInicial com cards selecionáveis grandes
- [x] Para Gestores/Admins: 3 cards (Dashboard, Chatbot IA, Portal do Gestor)
- [x] Para Lojas: Redirecionar direto para Portal da Loja
- [x] Sem sessão: Mostrar página de login com opções (Gestor/Loja)
- [x] Configurar como página inicial da PWA (rota /)


## Funcionalidade v6.8.2 - Botão Instalar App Mobile
- [x] Adicionar botão Instalar App no Menu Inicial (apenas visível em mobile)
- [x] Ajustar botão Instalar App no Portal da Loja (apenas visível em mobile)


## Funcionalidade v6.8.3 - Botão Instalar no Dashboard
- [x] Adicionar botão Instalar App no header mobile do Dashboard
- [x] Botão com estilo verde (bg-green-50, text-green-700)
- [x] Lógica PWA com instruções manuais quando não disponível


## Funcionalidade v6.8.4 - Logo no Menu Inicial
- [x] Adicionar logo PoweringEG no header do Menu Inicial (página dos 3 cards)


## Funcionalidade v6.8.5 - Logo na Página de Login
- [x] Adicionar logo PoweringEG na página de login (página com 2 cards: Gestor/Admin e Loja)


## Funcionalidade v6.9.1 - Ícones PWA PoweringEG
- [ ] Atualizar manifest.json para usar logo PoweringEG
- [ ] Criar/atualizar ícones da PWA com logo PoweringEG
- [ ] Atualizar splash screen com logo PoweringEG


## Correção v6.9.2 - Organizar Botão Instalar
- [ ] Remover botão Instalar duplicado (aparece no header e nos breadcrumbs)
- [ ] Manter apenas um botão Instalar no header, posicionado corretamente

## Correção v6.9.1 - Organizar Botão Instalar
- [x] Remover botão Instalar duplicado do AssistenteIA (aparecia no header E nos breadcrumbs)
- [x] Manter apenas um botão Instalar no header do DashboardLayout
- [x] Limpar imports não utilizados (Download, Smartphone, usePWAInstallAssistente)

## Correção v6.9.2 - Layout Header Mobile
- [x] Reorganizar header mobile para evitar sobreposição do botão Instalar
- [x] Melhorar espaçamento entre elementos no header

## Funcionalidades v6.9.3 - UX Melhorias
- [x] Esconder botão Instalar quando PWA já estiver instalada
- [x] Adicionar botão "Voltar ao Menu" nas páginas internas (Dashboard, Assistente IA, Portal Gestor)

## Correção v6.9.4 - Duplicados e Botão Menu
- [x] Remover banner Instalar duplicado do Portal Gestor (já existe no header)
- [x] Mostrar texto "Menu" no botão de voltar (não apenas a seta)

## Correção v6.9.5 - Esconder Instalar no Menu Inicial
- [x] Esconder botão Instalar no Menu Inicial (/menu) quando PWA já está instalada

## Funcionalidade v6.9.6 - Tema e Idioma no Menu Inicial
- [x] Adicionar toggle de tema (modo escuro/claro) ao Menu Inicial
- [x] Adicionar seletor de idioma (PT/EN) ao Menu Inicial

## Funcionalidade v6.9.7 - App Badge (Numerador no Ícone)
- [x] Implementar App Badge API para mostrar contagem de tarefas pendentes
- [x] Atualizar badge quando há novas tarefas (gestores)
- [x] Atualizar badge quando há novas tarefas (lojas)

## Investigação v6.9.8 - App Badge não funciona
- [ ] Investigar porque App Badge não aparece no ícone da PWA
- [ ] Verificar suporte do dispositivo/launcher
- [ ] Adicionar logs de debug para verificar se API está a ser chamada

## Funcionalidade v6.9.8 - Push Notifications
- [x] Configurar Service Worker para receber push notifications
- [ ] Criar endpoint para guardar subscriptions dos utilizadores
- [ ] Implementar envio de notificações quando há novas tarefas
- [ ] Integrar com criação de tarefas (gestor -> loja e loja -> gestor)

## Funcionalidade v6.9.9 - Push Notifications Portal Loja
- [x] Adicionar botão "Ativar Notificações" ao Portal da Loja
- [x] Usar hook usePushNotificationsLoja com token da loja

## Correção v6.10.0 - Botão Instalar Menu Inicial
- [x] Corrigir lógica de deteção de PWA instalada no Menu Inicial
- [x] Esconder botão quando app já está instalada (localStorage ou standalone mode)

## Funcionalidade v6.10.1 - VAPID Keys para Push Notifications
- [x] Verificar e corrigir configuração das VAPID keys
- [x] Testar notificações push para badge no ícone

## Funcionalidade v6.10.2 - Tokens Responsável e Colaborador
- [ ] Adicionar campo tokenType ao schema de lojas (responsavel/colaborador)
- [ ] Gerar dois tokens por loja: um para responsável e outro para colaborador
- [ ] Atualizar Portal da Loja para mostrar cards conforme tipo de token
- [x] Colaborador vê cards de Resultados e Tarefas (sem Reuniões e Pendentes)
- [ ] Responsável vê todos os cards (Resultados, Tarefas, Reuniões, Pendentes)
- [ ] Atualizar interface de gestão de tokens para mostrar ambos

## Funcionalidade v6.10.3 - Indicador Tipo de Acesso
- [x] Adicionar badge/indicador visual no Portal da Loja mostrando "Responsável" ou "Colaborador"

## Funcionalidade v6.10.4 - Interface Tokens Separados
- [x] Criar interface para mostrar ambos os tokens (Responsável e Colaborador) por loja
- [x] Adicionar botões de copiar para cada tipo de token
- [x] Adicionar botões de enviar por email para cada tipo de token

## Correção v6.10.5 - Criar Ambos os Tokens
- [x] Corrigir função criarToken para criar ambos os tipos (Responsável e Colaborador) automaticamente
- [x] Link do token deve ir diretamente ao Portal da Loja (não mostrar página de seleção Gestor/Loja)
- [x] PWA do Portal da Loja agora guarda sessão no localStorage para persistir entre aberturas
- [x] Atualizar manifest do Portal da Loja para v3 com scope mais amplo
- [x] Remover botão Instalar PWA da página inicial e menu do gestor (manter apenas no Portal da Loja)
- [x] Corrigir troca de manifest para PWA do Portal da Loja (atualmente instala como 'PoweringEG' em vez de 'Portal Loja')
- [ ] Corrigir criação de tokens das lojas - fica a carregar infinitamente
- [x] Lista de tokens não atualiza após criação (refetch não funciona)

## Módulo Volante v6.12
- [x] Schema BD: tabela volantes (id, nome, email, gestor_id, ativo)
- [x] Schema BD: tabela volante_lojas (volante_id, loja_id) - atribuição de lojas ao volante
- [x] Schema BD: tabela tokens_volante (id, volante_id, token, tipo, ativo)
- [x] Schema BD: tabela pedidos_apoio (id, loja_id, volante_id, data, periodo, tipo_apoio, observacoes, estado)
- [ ] Página gestão de Volantes no Dashboard (criar, editar, atribuir lojas)
- [ ] Sistema de tokens para volantes (criar, enviar email)
- [ ] Card "Volante" no Portal da Loja com calendário de requisições
- [ ] Formulário de requisição: dia, período (manhã/tarde), tipo apoio, observações
- [ ] Vista do Volante: agenda com todos os pedidos das lojas atribuídas
- [ ] Aprovar/reprovar pedidos de apoio
- [ ] Sistema de cores: amarelo (pendente), roxo (manhã aprovada), azul (tarde aprovada), vermelho (dia completo)
- [ ] Geração de links para calendários externos (Gmail, Outlook, Apple)
- [ ] Volante vê resultados de todas as lojas atribuídas


## Interface do Volante no Portal da Loja
- [x] Adicionar tipo VolanteAuth para autenticação de volantes
- [x] Implementar validação de token de volante no PortalLoja
- [x] Criar componente VolanteInterface com agenda e resultados
- [x] Implementar calendário de apoios com visualização mensal
- [x] Implementar aprovação/reprovação de pedidos de apoio
- [x] Gerar links de calendário (Google, Outlook, ICS) para pedidos aprovados
- [x] Implementar visualização de resultados das lojas atribuídas
- [x] Testar interface completa do volante


## Refatoração Interface Volante - Padrão Dashboard
- [x] Página de entrada com dois cards (Calendário e Resultados)
- [x] Interface Resultados com seletor de lojas
- [x] Tema claro/escuro
- [x] Seletor de idioma com ícone Globe (igual ao resto do projeto)
- [x] Botão voltar para navegar entre vistas



## Notificações Email e Histórico de Apoios v6.13
- [x] Enviar email ao volante quando há novo pedido de apoio pendente
- [x] Enviar email à loja quando pedido é aprovado
- [x] Enviar email à loja quando pedido é reprovado (com motivo)
- [x] Criar tabela/campo para histórico de apoios realizados (usa pedidos aprovados)
- [x] Interface no portal do volante para ver histórico de apoios
- [x] Filtros por período e loja no histórico
- [x] Testar funcionalidades completas


## Refatorar Interface Resultados do Volante v6.14
- [ ] Interface de Resultados do Volante igual ao Portal das Lojas
- [ ] Mesmos gráficos, métricas e layout completo
- [ ] Seletor de lojas com todas as lojas atribuídas ao volante

## Bug Fix - Seletor de Meses no Calendário do Volante
- [x] Adicionar botão para avançar mês no calendário

## Adicionar Apple Calendar
- [ ] Adicionar botão Apple Calendar ao dialog de detalhes do pedido
- [ ] Adicionar opção de anular pedidos aprovados
- [ ] Adicionar opção de editar agendamentos


## Notificações Telegram para Volantes
- [x] Adicionar campo telegramChatId ao schema de volantes
- [x] Criar serviço de envio de mensagens Telegram
- [ ] Integrar notificação na criação de pedidos
- [ ] Interface para configurar Telegram no portal do volante

## Corrigir Nome do Bot Telegram
- [x] Alterar @PoweringEGBot para @GZminho_bot nas instruções


## Configurar Novo Bot Telegram @PoweringEG_bot
- [x] Atualizar token do bot nas variáveis de ambiente
- [x] Atualizar nome do bot nas instruções (@GZminho_bot -> @PoweringEG_bot)


## Múltiplos Chat IDs Telegram por Volante
- [x] Atualizar serviço de Telegram para enviar para múltiplos IDs
- [x] Atualizar interface para permitir múltiplos Chat IDs separados por vírgula


## Webhook Telegram para /start
- [ ] Criar endpoint webhook para receber mensagens do Telegram
- [ ] Configurar o webhook no Telegram
- [ ] Testar resposta automática ao /start


## Portal Volante - Telegram Webhook v6.12.0
- [x] Criar rota do webhook do Telegram no servidor (/api/telegram/webhook)
- [x] Implementar função processarWebhookTelegram para responder a comandos
- [x] Comando /start - responde com o Chat ID do utilizador
- [x] Comando /help - mostra ajuda e instruções
- [x] Comando /status - verifica estado do bot
- [x] Registar webhook na API do Telegram
- [x] Testar funcionamento do bot @PoweringEG_bot


## Portal Loja - Solicitar Apoio v6.13.0
- [x] Adicionar card "Solicitar Apoio" na página inicial do portal da loja
- [x] Card disponível tanto para Responsável como para Colaborador
- [x] Reutilizar vista de solicitação de apoio existente (VolanteTab)
- [x] Integrar com o sistema de pedidos de apoio existente
- [ ] Testar funcionalidade completa


## Melhorias Pedidos Apoio v6.14.0
- [x] Adicionar link do portal do volante nas notificações Telegram
- [x] Adicionar opção "Dia Todo" nos períodos de pedido (além de Manhã e Tarde)
- [x] Permitir lojas consultarem dias fechados (vermelhos) para ver o que está agendado
- [x] Atualizar schema da base de dados para suportar período "dia_todo"
- [ ] Testar funcionalidade completa


## Bug Fix - Tradução Menu v6.14.1
- [x] Corrigir tradução em falta para "menu.items.volantes" no menu do Dashboard


## Gestão Volantes - Acesso ao Calendário v6.15.0
- [x] Adicionar botão para ver calendário do volante na página de Gestão de Volantes
- [x] Mostrar agenda/pedidos de apoio do volante selecionado (abre portal do volante)


## Bug Fix - Nome da Loja no Modal Dia Ocupado v6.15.1
- [x] Corrigir exibição do nome da loja no modal de "Dia Ocupado" (mostra "Loja" em vez do nome real)


## Bug Fix - Calendário Volante v6.15.2
- [x] Pedidos rejeitados não devem aparecer no calendário
- [x] Pedido aprovado de Braga dia 22 não aparece no calendário (corrigido suporte para dia_todo)


## Melhorias Calendário Volante v6.15.3
- [x] Aumentar tamanho dos dias no calendário para melhor visualização
- [x] Ao clicar num dia, abrir modal com todas as atividades desse dia
- [x] Garantir que pedidos rejeitados não aparecem no calendário (filtrado no servidor)


## Bug Fix - Calendário Volante v6.15.4
- [x] Corrigir tamanho dos dias (reduzido para h-20)
- [x] Pedidos rejeitados filtrados no servidor (getPedidosApoioByVolanteId e getEstadoDiasDoMes)
- [x] Lista "Próximos Apoios" mostra apenas datas >= hoje, ordenadas por data


## Bug Fix CRÍTICO - Calendário Volante v6.15.5
- [x] Rejeitados filtrados no modal de Atividades do Dia
- [x] Barcelos (dia 20 - hoje) agora aparece na lista Próximos Apoios
- [x] Botões de aprovar/reprovar estão no modal (já existiam)
- [x] Ícones de adicionar ao calendário (Google, Outlook, ICS) já existem


## Bug Fix URGENTE - Calendário Volante v6.15.6
- [x] Rejeitados/Reprovados/Anulados/Cancelados filtrados do modal e calendário
- [x] Adicionar botão de editar agendamentos aprovados no modal
- [x] Adicionar ícones de calendário (Google, Outlook, ICS) no modal para pedidos aprovados


## Funcionalidades Volante - Criar Agendamentos e Bloquear Dias v6.16.0
- [x] Volante pode criar agendamentos próprios
  - [x] Dropdown para selecionar loja (das lojas atribuídas)
  - [x] Opção "Volante" para compromissos pessoais/internos
  - [x] Selecionar data, período e tipo de apoio
- [x] Volante pode bloquear dias
  - [x] Bloquear para férias
  - [x] Bloquear para faltas
  - [x] Bloquear para formações
  - [x] Outros motivos personalizados
- [x] Criar tabela bloqueios_volante na base de dados
- [x] API para criar agendamentos pelo volante
- [x] API para bloquear/desbloquear dias
- [x] Interface com botões de criar e bloquear no calendário
- [ ] Dias bloqueados aparecem em cinza/indisponíveis no calendário


## Bug v6.16.1 - Modal Associar Lojas mostra gestor errado
- [x] Texto "Lojas Associadas" mostra o nome do gestor que está a ser editado em vez do gestor realmente associado à loja
- [x] Corrigir para mostrar o gestor correto de cada loja (loja.gestorNome)
- [x] Testar modal de associação


## Bug v6.16.2 - Associações de lojas duplicadas
- [x] Corrigir função associateGestorLoja para remover associações anteriores antes de criar nova
- [x] Corrigir associações incorretas na base de dados:
  - [x] Abrantes → Fabio Dias
  - [x] Aeroporto Porto → Marco Vilar
  - [x] Águeda → Carlos Eduardo
  - [x] Algés → Carlos Eduardo
  - [x] Almada → Carlos Eduardo
  - [x] Amadora → Carlos Eduardo
  - [x] Amoreiras → Carlos Eduardo


## Bug v6.16.3 - Tarefas To-Do não deixam de piscar ao clicar
- [ ] Investigar porque as tarefas não são marcadas como vistas ao clicar
- [ ] Corrigir função de marcar como visto
- [ ] Testar que o piscar para quando a tarefa é clicada


## Bug v6.16.4 - Tarefas criadas por lojas não aparecem para o gestor
- [x] Tarefa da Póvoa de Varzim não aparecia nas tarefas recebidas do gestor
- [x] Corrigir lógica de paraMim para incluir tarefas criadas por lojas do gestor
- [x] Adicionar condição: se criadoPorLojaId está nas lojas do gestor, paraMim = true

## Bug v6.11.3 - Tarefas das lojas não aparecem nas "Recebidas" do gestor
- [x] Identificar causa raiz: associações duplicadas de gestores (admin + gestor real)
- [x] Remover associações do gestor admin 1380001 (9 lojas afetadas)
- [x] Remover associações órfãs de gestores inexistentes (570001, 780001, 780002, 1020002)
- [x] Remover associações órfãs da loja 30001 (não existe)
- [x] Corrigir 3 tarefas atribuídas ao admin (userId=1) para o gestor correto (userId=420030)
- [x] Melhorar função getGestorDaLoja para priorizar gestores com role 'gestor' sobre 'admin'
- [x] Testar que tarefas agora aparecem corretamente nas "Recebidas"


## Bug v6.11.4 - Link do Telegram para Portal do Volante sem token
- [x] Localizar código que envia notificações Telegram para volantes
- [x] Corrigir URL para incluir o token de autenticação do volante
- [x] Testar que o link abre diretamente a página do volante sem login


## Bug v6.11.5 - Tarefas internas da loja aparecem no mural do gestor
- [x] Analisar lógica atual de visibilidade de tarefas (paraMim)
- [x] Corrigir filtro para excluir tarefas internas (interna=true) criadas pela loja para si própria
- [x] Testar que tarefas internas da loja não aparecem nas "Recebidas" do gestor


## Melhoria v6.11.6 - Cache e atualização de dados do To-Do
- [x] Analisar sistema atual de cache e queries do To-Do
- [x] Implementar invalidação automática de cache após alterações
- [x] Adicionar refetch automático ou polling para verificar novas tarefas (30s)
- [x] Adicionar refetchOnWindowFocus para atualizar quando a janela ganha foco
- [x] Testar que alterações aparecem imediatamente sem logout/refresh


## Bug v6.11.7 - Agendamentos criados no portal do volante não aparecem no calendário
- [x] Localizar o código do portal do volante e calendário
- [x] Analisar a lógica de criação de agendamentos
- [x] Verificar se o agendamento é gravado na base de dados
- [x] Identificar porque não aparece no calendário após criação (query errada)
- [x] Corrigir o problema (mudar para estadoCompletoMes)
- [x] Testar criação de agendamento e visualização no calendário

## Bug v6.11.8 - Erro ao criar agendamento no portal do volante
- [x] Verificar estrutura da tabela agendamentos_volante
- [x] Corrigir função criarAgendamentoVolante para incluir todos os campos obrigatórios (criar enums separados)
- [x] Testar criação de agendamento

## Bug v6.11.9 - Agendamento criado mas não aparece no calendário
- [x] Verificar se o agendamento foi criado na base de dados
- [x] Verificar se a query estadoCompletoMes está a carregar os agendamentos corretamente
- [x] Corrigir nomes de colunas no schema (agendamento_volante_periodo, agendamento_volante_tipo)
- [x] Atualizar routers.ts para usar os novos nomes de propriedades
- [x] Atualizar db.ts para usar os novos nomes ao verificar períodos
- [x] Executar migração da base de dados
- [x] Testar criação de agendamento
## Bug v6.12.0 - Taxa de reparação errada no portal da loja
- [ ] Localizar o código que calcula a taxa de reparação no portal da loja (Resultados das Lojas)
- [ ] Comparar com o cálculo correto do dashboard de resultados
- [ ] Corrigir o cálculo para corresponder ao dashboard
- [ ] Testar com a loja Braga - minho center em janeiro 2026

## Bug v6.11.10 - Taxa de Reparação Incorreta no Portal da Loja
- [x] Identificar discrepância: Portal mostrava 15.8%, Dashboard mostrava 29.0%
- [x] Localizar código: query dashboardLoja em routers.ts (linha 8038)
- [x] Identificar causa: taxa calculada como qtdReparacoes/totalServicos (ERRADO)
- [x] Corrigir cálculo: taxa deve ser qtdReparacoes/qtdParaBrisas (CORRETO)
- [x] Adicionar variável totalParaBrisas ao loop de agregação
- [x] Atualizar fórmula na linha 8040
- [x] Criar teste dashboardLoja.taxaReparacao.test.ts
- [x] Validar correção: teste confirma 40.9% (correto) vs 15.8% (errado)
- [x] Todos os testes passaram (3/3)

## Bug v6.11.11 - Taxa de Reparação em TODAS as queries (Correção Completa)
- [x] Identificar o problema: taxa de reparação calculada como qtdReparacoes/totalServicos em vez de qtdReparacoes/qtdParaBrisas
- [x] Corrigir query portalVolante.dashboardLoja (linha 8040)
- [x] Corrigir query lojas.dashboardCompletoGestor (linha 568)
- [x] Corrigir query lojas.getDadosLojaGestor (linha 774)
- [x] Corrigir query lojas.dashboardLojaCompleto (linha 977)
- [x] Corrigir query todosPortalLoja.dashboardCompleto (linha 6105)
- [x] Corrigir query todosPortalLoja.dashboardCompletoColaborador (linha 6321)
- [x] Corrigir query reunioesQuinzenais.getDadosLoja (linha 7040)
- [x] Adicionar variável totalParaBrisas e acumular no loop em TODAS as queries
- [x] Criar teste automatizado para validar a correção
- [x] Todos os testes passaram (3/3)

## Bug v6.11.12 - Usar Taxa de Reparação do Excel (Correção Final)
- [x] Identificar que a taxa de reparação já vem calculada no Excel (coluna K)
- [x] Corrigir TODAS as queries para usar taxaReparacaoExcel em vez de recalcular
- [x] Queries corrigidas:
  - lojas.dashboardCompletoGestor (linha 572)
  - lojas.getDadosLojaGestor (linha 782)
  - lojas.dashboardLojaCompleto (linha 989)
  - todosPortalLoja.dashboardCompleto (linha 6121)
  - todosPortalLoja.dashboardCompletoColaborador (linha 6341)
  - reunioesQuinzenais.getDadosLoja (linha 7064)
  - portalVolante.dashboardLoja (linha 8058)
- [x] Corrigir erros de TypeScript (variáveis fora do escopo)
- [x] Todos os testes passaram (3/3)
- [x] Taxa do Excel confirmada: 31.4% (valor oficial)

## Bug v6.11.13 - Inconsistência Desvio Objetivo Diário
- [x] Investigar porque o card mostra -0.5% mas o alerta diz +11.0%
- [x] Identificar a fonte dos dados de cada componente (card usava cálculo manual, alerta usava Excel)
- [x] Corrigir a inconsistência - agora ambos usam desvioPercentualDia do Excel
- [x] Queries corrigidas: dashboardCompletoGestor, dashboardLojaCompleto, dashboardCompletoColaborador

## Bug v6.11.14 - Portal do Volante - Agendamentos e Link Telegram
- [x] Investigar porque agendamentos não gravam quando criados pelo volante ou gestor - RESOLVIDO: Os agendamentos estavam a gravar corretamente, mas o calendário só mostrava pedidos
- [x] Corrigir criação de agendamentos no portal do volante - RESOLVIDO: Calendário agora mostra pedidos, agendamentos e bloqueios com cores diferentes (teal para agendamentos)
- [x] Corrigir link na notificação Telegram (deve ser portal do volante com token) - RESOLVIDO: Mudado de /portal-loja para /portal-volante

## Bug v6.11.15 - Rota /portal-volante não existe
- [x] Verificar rotas existentes no App.tsx
- [x] Adicionar rota /portal-volante que usa o componente PortalLoja
- [x] Verificar que o token é de volante (confirmado: Volante Minho, ID 2)
- [ ] Publicar para que a rota fique disponível em produção

## Bug v6.11.16 - Modal Atividades do Dia vazio no Portal do Volante
- [x] Investigar porque o modal abre vazio quando clica num dia com atividades - RESOLVIDO: O modal só mostrava pedidos, não agendamentos
- [x] Corrigir para mostrar os agendamentos e pedidos do dia selecionado - RESOLVIDO: Adicionada renderização de agendamentos (teal) e bloqueios (cinza) no modal

## Bug v6.11.17 - Melhorias no Modal de Agendamentos
- [x] Mostrar a descrição/observações do agendamento no modal
- [x] Adicionar botão de editar agendamento
- [x] Adicionar botão de apagar agendamento
- [x] Enviar notificação Telegram ao criar agendamento

## Bug v6.11.18 - Link do Portal na Notificação de Agendamento
- [x] Adicionar link do portal do volante à notificação Telegram de novo agendamento

## Bug v6.11.19 - Projeção de Visitas não considera Relatórios Livres
- [x] Investigar lógica de projeção de visitas
- [x] Corrigir para considerar relatórios livres além dos completos
- [x] Testar com lojas que têm relatórios livres recentes

## Bug v6.11.20 - Projeção de Visitas não considera Reuniões
- [x] Adicionar reuniões à lógica de cálculo de dias sem visita
- [x] Testar com lojas que têm reuniões recentes (ex: Famalicão sm)

## Bug v6.11.21 - Relatório IA não considera Relatórios Livres e Reuniões
- [x] Investigar lógica do relatório IA
- [x] Adicionar relatórios livres ao relatório IA
- [x] Adicionar reuniões ao relatório IA
- [x] Testar geração de relatório IA com todos os tipos de dados

## Bug v6.11.22 - Respostas às Perguntas das Tarefas não aparecem na Tarefa
- [x] Investigar onde são guardadas as respostas às perguntas das tarefas
- [x] Verificar como as respostas são exibidas no email
- [x] Corrigir visualização das respostas na própria tarefa
- [x] Testar que as respostas aparecem tanto no email como na tarefa

## Bug v6.11.23 - Pendentes marcados como Resolvidos no Relatório Livre não são guardados
- [x] Investigar como os pendentes são marcados no formulário do relatório livre
- [x] Verificar se o estado "Resolvido" está a ser enviado ao backend
- [x] Corrigir para que pendentes marcados como resolvidos sejam efetivamente guardados
- [x] Testar que pendentes resolvidos deixam de aparecer na lista

## Feature v6.11.24 - Card Mapa de KLM na Vista de Loja
- [x] Adicionar card "Mapa de KLM" na vista de loja
- [x] Configurar para abrir link externo (https://mapaklmeg.netlify.app) em nova janela
- [x] Testar que o card abre o link corretamente

## Feature v6.12.0 - Gestão de Utilizadores Admin
- [ ] Criar tabela de gestores na base de dados (se não existir)
- [ ] Criar tRPC procedures para listar, adicionar e remover gestores
- [ ] Criar página de Gestão de Utilizadores no Portal Gestor
- [ ] Adicionar formulário para criar novos gestores (nome, email)
- [ ] Implementar lista de gestores com opção de remover
- [ ] Testar criação e remoção de gestores

## Bug v6.12.1 - Botão de Criar Utilizador não visível
- [x] Adicionar botão "Novo Utilizador" visível no topo da página de Gestão de Utilizadores
- [x] Adicionar dialog para criar novo utilizador (nome, email, role)
- [x] Testar criação de novo utilizador

## Bug v6.12.2 - Contador de Tarefas no Dashboard Incorreto
- [x] Corrigir contador de tarefas no dashboard para mostrar apenas tarefas do utilizador logado
- [x] Verificar query que busca tarefas para o dashboard
- [x] Testar com novo utilizador sem tarefas

## Bug v6.12.3 - Contador de Tarefas Ainda Mostra 2 Tarefas
- [x] Investigar todas as queries que contam tarefas no Dashboard
- [x] Verificar se o botão "Tarefas" usa query diferente
- [x] Corrigir query incorreta
- [x] Testar com utilizador "Upload Resultados"

- [x] Criar procedure tRPC para chatbot no Portal da Loja
- [x] Criar procedure tRPC para chatbot no Portal do Volante
- [ ] Adicionar componente AIChatBox ao Portal da Loja
- [ ] Adicionar componente AIChatBox ao Portal do Volante
- [ ] Testar chatbot em ambos os portais

## Funcionalidade v6.9 - Chatbot IA nos Portais (Loja e Volante)
- [x] Criar procedure tRPC para chatbot no Portal da Loja
- [x] Criar procedure tRPC para chatbot no Portal do Volante
- [x] Criar serviço chatbotServicePortais.ts com funções específicas
- [x] Adicionar componente de chatbot ao Portal da Loja
- [x] Adicionar componente de chatbot ao Portal do Volante
- [x] Acesso a dados nacionais para análise e comparação
- [x] Sugestões de perguntas específicas para cada portal
- [x] Testar funcionalidade do chatbot

## Funcionalidade v6.9.1 - Layout do Chatbot no Portal da Loja
- [x] Reorganizar cards na home para colocar Chatbot ao lado de Resultados (em cima)
- [x] Alterar tab do chatbot para usar layout completo igual ao portal principal
- [x] Testar layout em mobile e desktop

## Funcionalidade v6.9.2 - Corrigir Layout do Chatbot Portal da Loja
- [x] Alterar título do header para "PoweringEG"
- [x] Adicionar empty state completo com ícone Sparkles grande
- [x] Adicionar badges de categorias no empty state
- [x] Adicionar botão "Gravar mensagem de voz"
- [x] Mostrar sugestões de perguntas diretamente no empty state
- [x] Testar layout final

## Funcionalidade v6.9.3 - Correções Urgentes do Chatbot
- [x] Alterar título do card na home de "Assistente IA" para "PoweringEG"
- [x] Corrigir layout do empty state (texto está a ser cortado)
- [x] Ajustar altura e espaçamento do empty state
- [x] Testar layout final no mobile

## Funcionalidade v6.9.4 - Corrigir Layout do Chatbot (Campo de Input Invisível)
- [x] Ler página principal do chatbot (AssistenteIA.tsx) para copiar layout completo
- [x] Ajustar altura do container do chatbot no Portal da Loja
- [x] Garantir que campo de input (Textarea) fica visível em baixo
- [x] Copiar estrutura de layout da página principal
- [x] Testar no mobile que o input está visível e funcional

## Funcionalidade v6.9.5 - Reescrita Completa do ChatbotPortalLoja
- [x] Copiado layout exato do AssistenteIA.tsx
- [x] Adicionado VoiceChatInput para gravação de voz
- [x] Input com border e estilo igual ao portal principal
- [x] Layout responsivo com md: breakpoints
- [x] Scroll automático para última mensagem


## Funcionalidade v6.9.6 - Esconder Botão Flutuante na Tab Chatbot
- [x] Esconder botão flutuante de tarefas quando activeTab === "chatbot"

## Funcionalidade v6.9.7 - Layout Chatbot Igual ao Portal Principal
- [x] Remover header extra (Voltar, PoweringEG, descrição) da tab chatbot
- [x] Remover Card wrapper extra que está a cortar espaço
- [x] Fazer chatbot ocupar ecrã inteiro como portal principal
- [x] Adicionar botão refresh no canto como portal principal

## Funcionalidade v6.9.8 - Corrigir Layout Chatbot (Remover Duplicações)
- [x] Remover botão Voltar da tab chatbot
- [x] Remover header duplicado (PoweringEG + refresh) do ChatbotPortalLoja
- [x] Manter apenas empty state com ícone Sparkles, título, descrição, voz, badges

## Funcionalidade v6.9.9 - Remover Espaço Vazio no Topo do Card
- [ ] Remover espaço vazio entre header verde e conteúdo do chatbot
- [ ] Ajustar padding do Card para começar logo no topo

## Funcionalidade v6.10.0 - Layout Chatbot EXATAMENTE Igual ao Principal
- [x] Manter botão Voltar na tab chatbot
- [x] Reduzir/remover caixa branca do header
- [x] Copiar EXATAMENTE o layout do AssistenteIA.tsx para ChatbotPortalLoja

## Funcionalidade v6.10.1 - Esconder Header Verde na Tab Chatbot
- [x] Esconder header verde (nome utilizador, Responsável, nome loja) quando activeTab === "chatbot"

## Funcionalidade v6.10.2 - Remover Espaço Extra em Baixo do Input
- [x] Remover espaço/padding extra em baixo do campo de input do chatbot

## Bug v6.10.3 - Chatbot não mostra dados de serviços realizados
- [x] Corrigir função de contexto do chatbot para obter dados de serviços realizados da loja
- [x] Garantir que o chatbot mostra "Realizado: 45" em vez de "N/A"

## Análise de Fichas de Serviço (v6.11)
- [ ] Schema BD: tabelas para análises e histórico
- [ ] Backend: upload e processamento de ficheiro Excel
- [ ] Backend: lógica de análise segundo critérios definidos
- [ ] Backend: geração de relatórios por loja
- [ ] Frontend: página de upload e visualização
- [ ] Frontend: quadro resumo com relatórios por loja
- [ ] Comparação com análise anterior (evolução)
- [ ] Envio de relatórios por email às lojas
- [ ] Histórico de análises por gestor
- [ ] Bug: Não dá para abrir os relatórios que estão no histórico de análise de fichas
- [x] Bug Email: Frase IMPRIMIR duplicada no email de análise
- [ ] Bug Email: Fichas a Intervir não aparecem no email (só mostra ...)
- [ ] Bug: Histórico de análise de fichas não mostra detalhes ao clicar

- [x] Fix: Chatbot das lojas deve mostrar apenas pendentes/tarefas da própria loja, não de toda a zona ou nacionais
- [x] Fix: Histórico de análises de fichas de serviço não abre análises anteriores
- [x] Associar loja "Paredes II" ao nome "Mycarcenter" na análise de fichas de serviço
- [x] Fix: Template de email da análise de fichas - mudar Glass para ExpressGlass, design mais limpo, tipografia mais leve
- [x] Fix: Template email análise fichas - métricas na horizontal, botão imprimir, corrigir logo
- [x] Fix: Template email - remover botão imprimir (erro segurança), corrigir logo que não aparece
- [x] Fix: Logo no email - imitar estética original (EXPRESS vermelho itálico, GLASS azul)
- [x] Feature: Portal da Loja - responsáveis podem adicionar pendentes e marcar como resolvido
- [x] Bug: Pendentes criados pela loja não aparecem na lista nem no chatbot
- [x] Fix: Mapeamento Porto Alto case-insensitive na análise de fichas
- [x] Bug: Gestores não recebem cópia do relatório de análise de fichas enviado para as lojas
- [x] Feature: Gestores recebem cópia dos relatórios livres e completos enviados para as lojas
- [x] Feature: Anexar PDF do relatório de análise de fichas no email
- [ ] Feature: Quadro destacado para fichas repetidas com dias desde identificação e alerta de ação imediata
- [x] Feature: Admin pode selecionar gestor após carregar ficheiro de análise de fichas
- [x] Feature: Admin pode mudar de gestor na análise de fichas sem recarregar ficheiro
- [x] Feature: Botão de download PDF do relatório de análise de fichas na interface web
- [x] Bug: PDF de análise de fichas - limpar tags HTML do resumo, melhorar formatação, remover páginas vazias
- [x] Feature: Adicionar imagem do logo oficial ExpressGlass no PDF de análise de fichas
- [x] Fix: PDF análise fichas - texto centrado na página (não encostado à direita)
- [x] Fix: PDF análise fichas - adicionar tabela de fichas por status
- [x] Fix: PDF análise fichas - adicionar lista detalhada de fichas abertas +5 dias
- [x] Fix: PDF análise fichas - adicionar lista detalhada de fichas sem notas
- [x] Fix: PDF análise fichas - adicionar lista detalhada de fichas sem email
- [x] Fix: PDF análise fichas - remover páginas vazias no final
- [x] Bug: PDF análise fichas - secção "FS ABERTAS A 5 OU MAIS DIAS" não aparece
- [x] Bug: PDF análise fichas - página 2 quase vazia (só título "FS SEM NOTAS")
- [x] Bug: PDF análise fichas - conteúdo não flui corretamente entre páginas
- [x] Bug: PDF análise fichas - títulos órfãos (título de secção sozinho no final da página, itens na página seguinte)
- [x] Feature: PDF análise fichas - conteúdo flui naturalmente sem páginas vazias
- [x] Bug: PDF análise fichas - tabela "Quantidade de Processos por Status" cortada, páginas vazias removidas
- [ ] Bug CRÍTICO: PDF análise fichas - tabela de status só mostra cabeçalho, linhas de dados não aparecem
- [ ] Bug: PDF análise fichas - páginas 3-4 completamente vazias (só rodapé)

## Correção PDF v3.8.1 - Tabela de Status
- [x] Corrigir extração de status do HTML (usar tabela existente)
- [x] Remover lógica que eliminava páginas automaticamente (causava perda da tabela)
- [x] Tabela de status agora aparece completa com todos os dados
- [x] Testar PDF com dados reais

## Bug v3.8.2 - Admin sem acesso à Análise de Fichas
- [x] Verificar onde está a restrição de acesso
- [x] Adicionar link no menu lateral do admin (alterado show: isGestor para show: isGestor || isAdmin)
- [x] Verificar rotas e permissões (rota já existia no App.tsx)
- [x] Testar acesso do admin

## Bug v3.8.3 - Análise de Fichas mostra dados incorretos
- [ ] Investigar: 58 lojas analisadas em vez de 70 (faltam 12)
- [ ] Investigar: Fábio Dias mostra 0 lojas quando deveria ter 13
- [ ] Verificar associação de lojas ao gestor na base de dados
- [ ] Verificar ficheiro Excel tem todas as 70 lojas
- [ ] Corrigir lógica de contagem e associação


## Correção v4.6 - Associação de Lojas na Análise de Fichas
- [x] Corrigir lógica de associação de lojas no upload de fichas de serviço
- [x] Guardar lojaId sempre que a loja é encontrada na BD (não apenas quando pertence ao gestor)
- [x] Melhorar mapeamento de aliases para lojas com nomes diferentes (Excel vs BD)
- [x] Adicionar aliases para: Aveiro SM -> Costa de Prata SM, Guarda SM -> Beira Baixa SM
- [x] Corrigir erros de TypeScript (lojaDoGestor -> lojaId)
- [x] Atualizar registos existentes na BD com lojaId correto (961 registos atualizados)
- [x] Verificar que filtro por gestor mostra apenas as suas lojas (Fábio Dias: 12 lojas)


## Correção v4.7 - Chatbot IA com Acesso a Dados de Reparações
- [x] Verificar schema de resultados mensais na base de dados (qtdReparacoes, qtdParaBrisas)
- [x] Verificar código do chatbot IA para entender que dados tem acesso
- [x] Adicionar reparações e para-brisas na formatação do contexto dos resultados mensais
- [x] Adicionar menção explícita aos dados de reparações no prompt do sistema
- [x] Testar perguntas sobre total de reparações por loja (Top 5 Novembro 2025 funciona)


## Correção v4.8 - Mapeamento de Lojas na Análise de Fichas
- [x] Investigar lojas em falta para Carlos Eduardo (12 lojas, não 13 - Águeda foi para Mónica)
- [x] Adicionar mapeamentos no analiseFichasService.ts:
  - Lisboa Amoreiras -> Lisboa (Amoreiras #20)
  - Lisboa Relogio -> Lisboa Relogio (Rotunda do relógio #21)
  - Aeroporto -> Aeroporto (Aeroporto porto #71)
  - MaiaShopping -> MaiaShopping (Maia - maiashopping #29)
  - Maia Zona Industrial -> Maia Zona Industrial (Maia - moreira #3)
  - Coimbra Sul -> Coimbra Sul (separar de Coimbra #14)
- [x] Adicionar aliases correspondentes no db.ts para associação de lojaId
- [ ] Fazer novo upload do ficheiro Excel para aplicar as correções

**Nota:** As correções só terão efeito após novo upload do ficheiro Excel


## Correção v4.9 - Mapeamento de Lojas Carlos Eduardo (Lisboa SMR e Movida)
- [x] Adicionar mapeamento: Serviço Móvel Rep. Lisboa -> Lisboa SMR (#82)
- [x] Adicionar mapeamento: SM Lisboa II (Movida) -> Movida (#50)
- [ ] Testar após novo upload do ficheiro Excel


## Correção v4.10 - Mapeamento de Lojas Marco Vilar (Porto Marquês, Porto Zona Industrial, SM Porto)
- [x] Adicionar mapeamento: Porto Marquês (#12) -> Porto - marquês
- [x] Adicionar mapeamento: Porto Zona Industrial (#30) -> Porto - zona industrial
- [x] Adicionar mapeamento: Serviço Móvel Porto (Maia) -> Porto sul sm (#80)
- [ ] Testar após novo upload do ficheiro Excel


## Funcionalidade v4.11 - Política de Comissionamento 2026 no Chatbot IA
- [x] Analisar documento PDF da política de comissionamento 2026
- [x] Extrair todas as regras, tabelas e valores (serviços ligeiros, pesados, reparações, vendas complementares, penalizações)
- [x] Adicionar política completa ao prompt do sistema do chatbot
- [x] Adicionar fórmulas de cálculo para serviços ligeiros
- [x] Adicionar sugestões de perguntas sobre comissões
- [x] Testar cálculos simples (45 serviços = 71€)
- [x] Testar cálculos complexos (2 colaboradores, 90 serviços, 20 reparações, 400€ escovas = 382€)


## Correção v4.12 - Cálculo de Comissões por Colaborador
- [x] Corrigir o prompt do chatbot para calcular comissões por colaborador (não pelo total)
- [x] Adicionar regra: dividir serviços totais pelo número de colaboradores
- [x] Adicionar regra: verificar FTE mínimo (35 serviços/colaborador) antes de calcular
- [x] Testar com cenários de múltiplos colaboradores (Braga 3 colab, 82 serviços = 0€)


## Correção v4.13 - FTE Aplica-se a TODO o Comissionamento
- [x] Corrigir o prompt do chatbot para aplicar FTE a TODAS as categorias de comissões
- [x] Remover a informação incorreta de que QIV e Vendas Complementares são independentes do FTE
- [x] Testar cenário: loja com FTE não cumprido deve ter 0€ em TODAS as categorias (3 colab, 82 serv = 0€ total)


## Correção v4.14 - Interpretação Correta da Tabela de Comissões
- [x] Corrigir o prompt: a coluna "Comissão de Serviços Ligeiros" já tem valores ACUMULADOS (usar diretamente)
- [x] A terceira coluna "Valor por Serviço Adicional" é apenas informativa, não para cálculos
- [x] Exemplos corretos: 40 serv/colab = 44€, 45 serv/colab = 71€, 50 serv/colab = 108€
- [x] Comissão total da loja = Comissão por colaborador × Número de colaboradores
- [x] Testar cenários de cálculo de comissões com a nova interpretação (2 colab/90 serv = 142€, 3 colab/120 serv = 132€)


## Correção v4.15 - Valor da Tabela é TOTAL, Não Por Colaborador
- [x] Corrigir o prompt: o valor da tabela é o TOTAL para a loja, NÃO por colaborador
- [x] O cálculo de serviços por colaborador serve apenas para verificar se atinge o FTE mínimo (35)
- [x] Exemplo correto: 3 colab, 120 serv → 40 serv/colab → comissão TOTAL = 44€ (não 44€ × 3) ✅
- [x] Exemplo correto: 2 colab, 90 serv → 45 serv/colab → comissão TOTAL = 71€ (não 71€ × 2) ✅
- [x] Testar cenários de cálculo com a interpretação correta


## Correção v4.16 - Valor da Tabela é POR COLABORADOR (Voltar à v4.14)
- [x] Corrigir o prompt: o valor da tabela é POR COLABORADOR, multiplicar pelo nº de colaboradores
- [x] Exemplo correto: 2 colab, 82 serv → 41 serv/colab → 49€ × 2 = 98€ TOTAL ✅
- [x] Exemplo correto: 2 colab, 80 serv → 40 serv/colab → 44€ × 2 = 88€ TOTAL
- [x] A terceira coluna é meramente indicativa dos cálculos feitos
- [x] Testar cenários de cálculo com a interpretação correta (Braga 2 colab, 82 serv = 98€)


## v4.17 - Adicionar Cálculo de Comissões ao Chatbot do Portal da Loja
- [x] Adicionar a política de comissões completa ao chatbot do Portal da Loja
- [x] Incluir tabela de serviços ligeiros, pesados, calibração, QIV e vendas complementares
- [x] Permitir simulação de comissões com base nos dados da loja
- [x] Testar o chatbot do Portal da Loja com cenários de cálculo


## v4.18 - Gestão de Colaboradores por Loja
- [ ] Criar tabela de colaboradores na base de dados (nome, código, lojaId)
- [ ] Criar procedures tRPC para CRUD de colaboradores
- [ ] Criar interface de gestão de colaboradores no dashboard (por loja)
- [ ] Mostrar número de colaboradores na lista de lojas
- [ ] Integrar colaboradores no cálculo de FTE para comissões
- [ ] Testar funcionalidade completa


## v4.18 - Sistema RH - Gestão de Colaboradores
- [x] Atualizar schema: lojaId opcional (null para volantes), adicionar campo gestorId para volantes
- [x] Criar página RH no menu lateral (junto às Lojas)
- [x] Formulário de criação: Nome, Código, Loja OU Volante (zona do gestor)
- [x] Listar colaboradores com filtro por loja/volante
- [x] Mostrar colaboradores na página de Lojas (coluna com contagem)
- [x] Volantes associados à zona do gestor (não a uma loja específica)
- [ ] Integrar número de colaboradores no cálculo de FTE para comissões (próxima fase)


## v4.19 - Reformulação Completa do Relatório IA de Resultados
- [x] Corrigir erros de tradução (common.criadosNoPeriodo, common.resolvidosNoPeriodo, etc.)
- [x] Gestores agora veem análise de RESULTADOS (igual ao admin, filtrado pelas suas lojas)
- [x] Focar exclusivamente nos dados de RESULTADOS (Excel carregado)
- [ ] Adicionar gráficos profissionais:
  - [ ] Gráfico de barras: Serviços por loja (ligeiros, pesados, calibração)
  - [ ] Gráfico de linha: Evolução mensal de serviços
  - [ ] Gráfico de pizza: Distribuição de tipos de serviço
  - [ ] Gráfico de barras: QIV e taxa de reparação por loja
  - [ ] Gráfico de barras: Vendas complementares (escovas) vs meta 7.5%
- [ ] KPIs visuais com indicadores de meta (verde/vermelho)
- [ ] Rankings de lojas por performance
- [ ] Análise IA focada apenas em resultados de serviços
- [ ] Comparação com mês anterior (tendências)
- [ ] Testar funcionalidade completa


## v4.20 - Corrigir Relatório IA de Resultados - Usar Dados Reais
- [x] Corrigir função de geração para usar dados de resultados reais (5230 serviços, 23.63% reparação, €11126 vendas)
- [x] Preencher rankings TOP 5 e BOTTOM 5 com dados reais das lojas (Movida +102.50%, Sacavém +73.84%, etc.)
- [x] Mostrar KPIs e gráficos com valores corretos (70 lojas, 62.9% cumprimento)
- [x] Gerar análise IA baseada nos dados reais de resultados
- [x] Garantir que gestores veem os mesmos dados que a página de Resultados (filtrados pelas suas lojas)
- [x] Corrigir parsing do período meses_X/YYYY para interpretar corretamente o mês selecionado


## v4.21 - Integração RH-Lojas (Número de Colaboradores nos Cards)
- [x] Corrigir função getLojasByGestorId para retornar numColaboradores
- [x] Frontend MinhasLojas.tsx já tem código para mostrar colaboradores (linhas 225-231)
- [x] Colaborador Pedro Barranco associado à Póvoa de Varzim (lojaId: 60005)
- [x] Loja Póvoa de Varzim associada ao gestor Marco Amorim


## v4.22 - Corrigir Layout Página RH
- [x] Adicionar DashboardLayout à página RH (menu lateral/botão voltar)
- [x] Adicionar número de colaboradores nos cards da página MinhasLojas
- [x] Corrigir função getLojasByGestorId para retornar numColaboradores


## v4.23 - Filtro de Âmbito no Relatório IA de Resultados
- [x] Adicionar filtro de âmbito antes do período (Nacional/Minhas Lojas/Loja Específica)
- [x] Para "Loja Específica", mostrar dropdown com lojas disponíveis
- [x] Filtrar dados do relatório conforme âmbito selecionado
- [x] Manter compatibilidade com roles (gestor vê só suas lojas, admin vê todas)


## v4.24 - Integrar Chatbot com Sistema de RH (Colaboradores)
- [x] Modificar função de cálculo de comissões no chatbot para obter número de colaboradores automaticamente
- [x] Usar dados da tabela colaboradores para contar colaboradores por loja
- [x] Adicionar número de colaboradores no contexto das lojas (pessoal e nacional)
- [x] Chatbot agora sabe quantos colaboradores tem cada loja para cálculos de comissões


## v4.25 - Corrigir Cálculo de Comissões no Chatbot
- [x] Corrigir lógica: valor fixo de 198€ a partir de 60 serviços (não há valor adicional por serviço)
- [x] A tabela de escalões define valores FIXOS - consulta-se a tabela e obtém-se o valor direto
- [x] Clarificar que a coluna "€/serviço adicional" é APENAS informativa, NÃO se aplica ao cálculo
- [x] Valor por colaborador × número de colaboradores = total da loja


## v4.26 - Corrigir Taxa de Reparação N/A no Relatório IA Resultados
- [ ] Investigar porque a Taxa de Reparação aparece como N/A
- [ ] Corrigir cálculo da Taxa Rep. Média geral
- [ ] Corrigir exibição da Taxa Rep. nos cards de Líder e Menor Performance


## v4.26 - Corrigir Taxa de Reparação N/A no Relatório IA de Resultados
- [x] Investigar porque a taxa de reparação aparece como N/A
- [x] Corrigir agregação de taxa de reparação no aiService.ts
- [x] Incluir taxaReparacao no mapa de agregação por loja
- [x] Calcular média da taxa de reparação para múltiplos meses


## v4.27 - Adicionar Campo Cargo aos Colaboradores
- [ ] Adicionar campo cargo ao schema de colaboradores (enum: responsavel_loja, tecnico, administrativo)
- [ ] Migrar base de dados com novo campo
- [ ] Atualizar formulário de criação de colaborador com seletor de cargo
- [ ] Atualizar formulário de edição de colaborador
- [ ] Mostrar cargo na listagem de colaboradores
- [ ] Mostrar cargo nos cards das lojas (Minhas Lojas)


## v4.27 - Adicionar Campo Cargo e Tipo Recalbra aos Colaboradores
- [x] Adicionar enum cargo ao schema (responsavel_loja, tecnico, administrativo)
- [x] Adicionar tipo recalbra ao enum tipo (loja, volante, recalbra)
- [x] Migrar base de dados com novos campos
- [x] Atualizar formulário de criação com campos cargo e tipo
- [x] Atualizar formulário de edição com campos cargo e tipo
- [x] Atualizar listagem para mostrar tipo recalbra com badge laranja
- [x] Atualizar routers para aceitar novos campos


## v4.28 - Corrigir Filtro de Âmbito Nacional no Relatório IA de Resultados
- [x] Corrigir lógica no backend para que âmbito "Nacional" busque todas as lojas da rede
- [x] Reordenar condições: verificar "nacional" antes de "minhas" para evitar override
- [x] Garantir que gestores podem ver dados nacionais para comparação
- [x] Filtro aplicado mostra "Nacional" corretamente quando selecionado


## v4.29 - Envio de Relação de Colaboradores para RH
- [x] Criar botão "Enviar para RH" na página de RH
- [x] Gerar relatório HTML com lista de colaboradores das lojas do gestor
- [x] Pré-visualização do layout antes de enviar
- [x] Enviar email para recursoshumanos@expressglass.pt
- [x] Implementar lembrete automático no dia 20 de cada mês (alerta na página RH)
- [x] Registar data do último envio por gestor
- [x] Mostrar confirmação quando já enviou este mês

## v4.30 - Download PDF da Relação de Colaboradores
- [x] Adicionar botão "Download PDF" na pré-visualização da relação RH
- [x] Gerar PDF com layout profissional da relação de colaboradores
- [x] Incluir cabeçalho com logo ExpressGlass, data e gestor
- [x] Organização por lojas com colaboradores
- [x] Seções separadas para Volantes e Recalbra
- [x] Abrir janela de impressão para guardar como PDF

## v4.31 - Correção Cards RH
- [ ] Adicionar card de Recalbra nos estatísticas da página RH

## v4.32 - Email RH com PDF em Anexo
- [x] Alterar envio de email para incluir texto de introdução simples
- [x] Gerar PDF da relação de colaboradores com PDFKit
- [x] Enviar PDF como anexo no email
- [x] Email com saudação formal e informações resumidas
- [x] PDF com layout profissional organizado por lojas

## v4.33 - Correções Email e PDF RH
- [x] Corrigir saudação para incluir referência feminina (Exmos/as Senhores/as)
- [x] Adicionar logo ExpressGlass no email
- [x] Adicionar logo ExpressGlass no PDF
- [x] Remover emojis do PDF (não renderizam corretamente)
- [x] Remover acentos problemáticos do PDF (Relação -> Relacao)

## v4.34 - Correções Logo PDF e Título Email
- [x] Corrigir logo no PDF (usar fetch da URL em vez de base64)
- [x] Adicionar título "Relação de Colaboradores" no email debaixo do logo
- [x] Adicionar mês no cabeçalho do email

## v4.35 - Corrigir páginas em branco no PDF
- [x] Remover páginas em branco no final do PDF
- [x] Corrigir lógica do rodapé que está a criar páginas extras
- [x] Usar lineBreak: false no texto do rodapé

## v4.36 - Email Final e Lembrete Automático
- [x] Alterar email de destino para recursoshumanos@expressglass.pt
- [x] Criar serviço de lembrete automático (lembreteRHService.ts)
- [x] Endpoint executarLembretesRH para cron job
- [x] Email de lembrete enviado no dia 20 para gestores que ainda não enviaram

## v4.37 - Notificação Push no Dia 20
- [x] Adicionar notificação push no dia 20 para gestores
- [x] Criar função notificarGestorLembreteRH no pushService
- [x] Integrar com serviço de lembrete existente
- [x] Enviar push apenas para gestores que ainda não enviaram a relação
- [x] Retornar estatísticas separadas de email e push

## v4.38 - Correção Tópicos Reunião Gestores
- [ ] Analisar código das reuniões e tópicos para identificar o problema
- [ ] Marcar tópicos anteriores à data de hoje como concluídos na base de dados
- [ ] Corrigir código para que tópicos selecionados fiquem concluídos ao gravar reunião
- [ ] Testar funcionalidade corrigida

## v4.39 - Visualização de Tópicos de Outros Gestores
- [x] Atualizar endpoint para retornar todos os tópicos pendentes com nome do gestor
- [x] Adicionar flag isOwner para identificar tópicos próprios
- [x] Separar UI em "Meus Tópicos" (editável) e "Tópicos de Outros Gestores" (apenas visualização)
- [x] Mostrar nome do gestor que criou cada tópico
- [x] Bloquear edição/eliminação de tópicos de outros gestores
- [x] Cards com cores diferentes (azul para próprios, cinza para outros)

## v4.40 - Revisão Fluxo Reuniões de Gestores
- [x] Analisar código atual das reuniões de gestores
- [x] Verificar se há botões duplicados desnecessários
- [x] Criar botão único "Finalizar Reunião" que unifica todo o fluxo
- [x] Modal de finalização: perguntar se cada tópico foi discutido
- [x] Gerar relatório automaticamente ao finalizar
- [x] Libertar automaticamente tópicos não discutidos para próxima reunião
- [x] Simplificar botões (Finalizar Reunião principal, Ver Relatório secundário)

## v4.41 - Renomear Relatório IA para Relatório
- [x] Procurar todas as ocorrências de "Relatório IA" ou "Relatório de IA" no código
- [x] Alterar traduções PT (menu, títulos, subtítulos)
- [x] Alterar componente ExportarRelatorioIAPDF (títulos e nome do ficheiro)
- [x] Alterar componente HistoricoRelatoriosIA (títulos, assuntos de email)
- [x] Alterar componente RelatorioIACategorias (títulos e toasts)
- [x] Alterar componente ReminderDialog (títulos e botões)
- [x] Alterar DashboardLayout (fallback do menu)

## v4.42 - Simplificar Interface Criação de Reuniões
- [x] Remover tabs e criar interface sequencial única
- [x] Ordem: Data → Presenças → Outros → Tópicos → Conteúdo → Tags → Anexos
- [x] Manter apenas um botão "Criar Reunião" no final do formulário
- [x] Tópicos pendentes só aparecem se existirem

## v4.43 - Remover Aviso Resumo Global
- [x] Remover aviso "Lembrete: Resumo Global Mês Anterior" do dashboard
- [x] Corrigir botão "Relatórios IA" para "Relatórios"

## Funcionalidades v4.44 - Histórico de Envios RH
- [x] Criar tabela envios_rh no schema para guardar histórico de envios
- [x] Implementar backend para registar envio quando email é enviado
- [x] Implementar endpoint para consultar histórico de envios
- [x] Adicionar secção de histórico na página RH
- [x] Mostrar data, hora e detalhes de cada envio
- [x] Testar funcionalidade completa

## v4.45 - Histórico RH Sempre Visível
- [x] Mostrar secção de histórico de envios RH sempre visível (mesmo sem envios)
- [x] Adicionar mensagem "Nenhum envio registado" quando vazio

## v4.46 - Corrigir PDF Relatórios IA
- [x] PDF de exportação dos Relatórios IA deve incluir toda a informação do ecrã (não apenas resultados)
- [x] Incluir no PDF: resumo geral, pontos positivos, pontos negativos, tendências, recomendações, frequência de visitas
- [x] Incluir no PDF: análise dos pontos destacados pelos gestores
- [x] PDF deve ser representação fiel do que aparece no ecrã

## v4.47 - Meses Individuais no Filtro de Comparação do Histórico da Loja
- [x] Adicionar meses individuais ao seletor de comparação entre períodos
- [x] Permitir comparar meses isolados (ex: Dezembro 2025 vs Janeiro 2026)
- [x] Manter opções existentes e adicionar meses como opções adicionais

## v4.48 - Corrigir PDF Relatórios IA (Bug Persistente)
- [x] Remover "IA" do título do PDF - deve ser apenas "Relatório" (não "Relatório IA")
- [x] PDF deve incluir TODA a informação operacional visível no ecrã
- [x] Incluir: Resumo Geral, Loja Mais/Menos Visitada
- [x] Incluir: Pontos Positivos e Pontos Negativos
- [x] Incluir: Análise dos Pontos Destacados pelos Gestores (Tendências, Positivos, Negativos)
- [x] Incluir: Sugestões/Recomendações
- [x] Incluir: Frequência de Visitas por Loja
- [x] Incluir: Análise de Performance (Resultados) - que já existe
- [x] Corrigir erro de sintaxe (semicolon em falta) no ficheiro
- [x] Remover 'IA' de todos os menus laterais, breadcrumbs e títulos de páginas
- [x] Corrigir isGestor no PDF para usar tipoRelatorio real do backend
- [x] Adicionar tipoRelatorio ao retorno do backend para gestores

## v4.49 - Bug: Ficheiro Fichas de Serviço só reconhece 3 lojas do Fábio Dias
- [x] Investigar parsing do ficheiro de monitorização de análise de fichas de serviço
- [x] Identificar causa raiz: extrairNumeroLoja retornava null para Serviço Móvel
- [x] Corrigir extrairNumeroLoja para extrair números de fichas SM (ex: "Ficha S.Movel 86-Faro" -> 86)
- [x] Melhorar CIDADES_CONHECIDAS com cidades em falta (Entroncamento, Castanheira, Porto Alto, etc.)
- [x] Melhorar MAPEAMENTO_NOMES_LOJAS com variações das lojas do Fábio
- [x] Melhorar ALIASES_LOJAS no db.ts com mais variações (Lezíria SM, Castanheira, SM Faro, etc.)
- [x] Corrigir extrairCidade para priorizar cidades mais longas (Porto Alto antes de Porto)
- [x] Melhorar getLojaByNomeAproximado com aliases reversos e matching mais robusto
- [x] Corrigir pertenceAoGestor para verificar se lojaId está nas lojas do gestor
- [x] Adicionar logs de debug para rastreamento de matching
- [x] Criar testes unitários (12 testes passam)
- [x] Verificar matching de todas as 13 lojas: 13/13 encontradas com sucesso

## v4.50 - Bugs no PDF de Relatório
- [x] Corrigir título corrompido no PDF: "RelatóriRelatórias Lojas" - causa: título genérico e título gestor escritos na mesma posição y=20
- [x] Corrigir coluna Frequência na tabela de Visitas por Loja: substituir caractere █ (Unicode) por barras de progresso desenhadas com rectângulos

## v4.51 - Bug: HTML raw a aparecer na página Análise de Fichas + Erro 500
- [x] Investigar causa: colunas TEXT (65KB) insuficientes para relatórios com 1636+ fichas
- [x] Alterar conteudoRelatorio e resumo de TEXT para MEDIUMTEXT (16MB) no schema
- [x] Executar migração 0067_lazy_blur.sql com sucesso
- [x] Truncar error.message no onError do analisarMutation para evitar toasts enormes com HTML
- [x] Adicionar overflow-hidden ao container principal para evitar transbordo visual
- [x] Adicionar console.error para debug de erros completos

## v4.52 - Reestruturar matching de lojas na Análise de Fichas
- [x] Problema: lojas com mesmo número confundem-se (ex: Guimarães #7 vs Leiria SM #7)
- [x] Adicionar campo isServicoMovel ao RelatorioLoja
- [x] Para SM: NÃO usar número do nmdos (enganador) - usar apenas nome para matching
- [x] Para FS normais: usar número do nmdos como critério principal
- [x] Reestruturar matching no routers.ts: SM usa nome primeiro, FS usa número primeiro
- [x] Testes unitários: 12/12 passam (incluindo novo teste Guimarães vs Leiria SM)

## v4.53 - Verificar comparação com análise anterior (processos repetidos)
- [x] Investigar lógica de comparação com análise anterior no endpoint analisar
- [x] Causa: tabela fichas_identificadas_analise tinha 0 registos (saveFichasIdentificadas falhava)
- [x] Causa provavel: INSERT sem batching excedia max_allowed_packet do MySQL
- [x] Confirmar que INSERT via drizzle funciona com dados válidos (teste manual OK)
- [x] Batching de 100 fichas por INSERT já implementado no código
- [x] Logs detalhados adicionados para diagnóstico
- [x] Validação de fichas (obrano > 0, relatorioId > 0, analiseId > 0)
- [ ] PENDENTE: Publicar nova versão para que correções entrem em produção
- [ ] PENDENTE: Testar comparativo após 2º upload (1º guarda fichas, 2º compara)

## v4.54 - Ignorar loja Desconhecida + Painel de Diagnóstico
- [x] Ignorar fichas da loja "Desconhecida" no endpoint de análise (não guardar relatório) - já implementado no router
- [x] Filtrar loja "Desconhecida" do endpoint detalhes (não mostrar no frontend)
- [x] Criar endpoint diagnostico no router analiseFichas
- [x] Criar painel de diagnóstico no frontend (tab Diagnóstico, apenas Admin)
- [x] Mostrar fichas guardadas por loja com categorias
- [x] Corrigir filtro obrano >= 0 (antes era > 0, excluía fichas com obrano 0)
- [ ] Testar funcionalidade completa após publicar

## v4.55 - Bug: Dashboard mostra 0 lojas visitadas, 0 relatórios + Chatbot IA errado
- [x] Investigar porque o dashboard mostra 0 lojas visitadas, 0 relatórios livres e 0 relatórios completos
- [x] Causa: RelatoriosIA.tsx iniciava com mês atual (Fevereiro) mas relatórios são de Janeiro
- [x] Chatbot IA também dá respostas erradas sobre lojas visitadas
- [x] Causa: Contexto do chatbot não tinha resumo mensal de visitas
- [x] Corrigir RelatoriosIA.tsx para iniciar com mês anterior por defeito
- [x] Melhorar contexto do chatbot com resumo mensal de lojas visitadas/não visitadas

## v4.56 - Bug CRÍTICO: Chatbot e Dashboard RelatoriosIA continuam errados
- [x] Chatbot diz que não visitou lojas que foram visitadas em Janeiro
- [x] Dashboard RelatoriosIA mostra 0 lojas visitadas, 0 relatórios livres, 0 relatórios completos
- [x] Causa confirmada: utilizador estava na versão publicada antiga (sem as correções v4.55)
- [x] BD confirmada: 13 relatórios livres + 5 completos em Janeiro 2026 para gestorId=30001
- [x] Removidos logs de debug do aiService.ts
- [ ] PENDENTE: Publicar nova versão para que correções entrem em produção

## v4.57 - Bug CRÍTICO RESOLVIDO: RelatoriosIA mostra 0 mesmo após publicar v4.56
- [x] Dashboard RelatoriosIA mostrava 0 lojas visitadas, 0 relatórios livres, 0 relatórios completos
- [x] Causa raíz: gerarRelatorioComIAMultiplosMeses não retornava campo 'relatorios' usado pelo frontend
- [x] Frontend esperava analise.relatorios.lojasVisitadas mas campo não existia no retorno
- [x] Adicionado campo 'relatorios' ao retorno com: totalLivres, totalCompletos, lojasVisitadas, lojasNaoVisitadas, visitasPorLoja
- [x] Adicionada função getLojasByIds ao db.ts
- [x] Atualizada interface AnaliseIA para incluir campo relatorios

## v4.58 - Bug RESOLVIDO: Resumo do Relatório IA não aparece no PDF exportado
- [x] O resumo aparece corretamente no ecrã mas não no PDF exportado
- [x] Causa: PDF para gestores procurava apenas resumoGeral (linha 288) mas o backend retorna resumo
- [x] Corrigido ExportarRelatorioIAPDF.tsx linha 288: usar resumo || resumoGeral || fallback

## v4.59 - Melhorar apresentação de fichas no relatório de Análise de Fichas
- [x] Adicionar parsing de Marca (coluna T) e Modelo (coluna U) no analiseFichasService.ts
- [x] Adicionar parsing de Última Nota (coluna Q) no analiseFichasService.ts
- [x] Atualizar interface FichaServico para incluir marca, modelo e ultimaNota
- [x] Atualizar frontend (AnaliseFichas.tsx ou componente de relatório) para mostrar:
  * Linha 1: FS {numero} // {matricula} // {marca} {modelo} // **{status}**
  * Linha 2: Nota inserida no Sinistro pelo utilizador : {parte antes dos :} **{parte depois dos :}**
- [x] Aplicar formatação: status a negrito, parte da nota após ":" a negrito
- [x] Testar com ficheiro real de monitorização (15 testes passaram)

## v4.60 - Remover última nota da apresentação de fichas (simplificar)
- [x] Remover a linha 2 (última nota) da função formatarFichaParaTabela
- [x] Manter apenas: FS {numero} // {matricula} // {marca} {modelo} // **{status}**
- [x] Atualizar testes para refletir o novo formato
- [x] Testar com ficheiro real (15 testes passaram)

## v4.61 - Melhorar formatação das fichas: tabela sem bordas com colunas alinhadas
- [x] Alterar gerarHTMLRelatorio para usar tabela HTML (sem bordas) em vez de lista
- [x] Criar colunas: FS | Matrícula | Marca/Modelo | Status
- [x] Colocar matrícula a negrito
- [x] Colocar status a negrito
- [x] Alinhar todas as colunas para melhor legibilidade
- [x] Atualizar testes (15 testes passaram)

## v4.62 - Corrigir quebra de linha nas colunas da tabela
- [x] Adicionar white-space: nowrap nas células para evitar quebra
- [x] Garantir que cada ficha fica numa única linha horizontal
- [x] Testar visualização no portal (15 testes passaram)

## v4.63 - Corrigir exportação para PDF (aparece em lista em vez de tabela)
- [x] Investigar função de exportação para PDF do relatório de Análise de Fichas
- [x] Verificar como o HTML está a ser processado para PDF (extrairSeccoesDoHTML)
- [x] Corrigir para que a tabela HTML seja renderizada corretamente no PDF (agrupar células por linha)
- [x] Testar exportação para PDF (cada ficha numa linha com | separador)

## v4.64 - Alterar PDF para usar tabela com colunas alinhadas (igual ao ecrã)
- [x] Modificar pdfAnaliseFichas.ts para renderizar tabelas em vez de listas
- [x] Criar colunas alinhadas: FS | Matrícula | Marca/Modelo | Status
- [x] Remover bullet points (•)
- [x] Aumentar tamanho da fonte para melhor legibilidade (9pt -> 10pt)
- [x] Testar exportação para PDF

## v4.65 - Garantir que cada FS fica numa única linha no PDF (sem quebras)
- [x] Adicionar lineBreak: false nas colunas para evitar quebra de texto
- [x] Ajustar larguras das colunas se necessário
- [x] Truncar texto longo com ellipsis (...) se não couber
- [x] Testar com fichas com nomes longos

## v4.66 - Corrigir quebra de página entre colunas no PDF
- [x] Manter doc.y fixo durante renderização das 4 colunas (resetar após cada coluna)
- [x] Restaurar doc.y após renderizar todas as colunas de uma linha
- [x] Testar com PDF real para garantir que não há páginas vazias

## v4.67 - Corrigir quebra de página no meio da linha da tabela no PDF
- [x] Adicionar verificação de espaço (pageBottom) antes de renderizar cada linha
- [x] Forçar doc.addPage() se não houver 20px de espaço para a linha
- [x] Evitar que PDFKit faça auto page break entre colunas da mesma linha

## v4.68 - Corrigir email vazio + Edição de reunião pelo admin
- [x] Gerar relatório automaticamente com IA se não existir antes de enviar email
- [x] Adicionar botão "Editar" na card de cada reunião (apenas admin)
- [x] Criar modal de edição com: data, presenças, outros presentes, conteúdo, tags
- [x] Regenerar resumo IA automaticamente se conteúdo for alterado
- [x] TypeScript sem erros

## v4.69 - Corrigir email reunião: falta título e tópicos discutidos
- [x] Título já existe no header azul do email ("Relatório de Reunião de Gestores")
- [x] Investigar porque os tópicos discutidos não aparecem (estado 'analisado' vs 'discutido')
- [x] Corrigir filtro para incluir tópicos com estado 'analisado' e 'discutido'
- [x] Corrigir filtro de não discutidos para incluir 'pendente' e 'nao_discutido'

## v4.70 - BUG: Modal "Finalizar Reunião" mostra tópicos já selecionados como "Não Discutidos"
- [x] Investigar modal "Finalizar Reunião" e lógica de filtro de tópicos
- [x] Corrigir para não mostrar tópicos com estado "analisado" (filtro aplicado)
- [x] Mostrar conteúdo completo dos tópicos: titulo + "Proposto por: {gestor}"
- [x] TypeScript sem erros

## v4.71 - Adicionar título da reunião no email do relatório
- [ ] Investigar geração do HTML do email (reuniaoService.ts)
- [ ] Adicionar título da reunião acima da data no email
- [ ] Testar envio de email com título visível

## v4.72 (CORRIGIDO) - Ajustar Critérios de Análise de Fichas
- [x] Mudar critério "FS Abertas" de 5 para 10 dias (diasAberto >= 10)
- [x] Remover categoria "FS Sem Email do Cliente" da análise
- [x] Atualizar backend (analiseFichasService.ts)
- [x] Testar análise com novos critérios

## v4.73 - Corrigir Inconsistências no Relatório de Análise
- [x] Atualizar label do email de "Abertas +5 dias" para "Abertas +10 dias"
- [x] Verificar e corrigir ordem das secções no PDF (deve ser igual ao HTML)
- [x] Garantir que PDF e HTML mostram as mesmas fichas na mesma ordem

## v4.74 - Filtrar FS com Agendamento Futuro Válido
- [x] Excluir da categoria "FS ABERTAS A 10 OU MAIS DIAS" as fichas que têm:
  - Data de agendamento futura (depois da data da análise)
  - Horário dentro do horário de serviço (09:00 - 18:00)
- [x] Atualizar lógica de filtro em analiseFichasService.ts
- [x] Testar com casos reais (FS 996 deve sair do relatório se agendada para 16/02)

## v4.75 - Recalcular diasExecutado Dinamicamente
- [x] Criar função para recalcular diasExecutado baseado em dataAnalise vs dataServico
- [x] Verificar se horário estava dentro de 09:00-18:00
- [x] Substituir valor estático do Excel por cálculo dinâmico
- [x] Atualizar filtro fichasAposAgendamento para usar novo cálculo
- [x] Testar com FS 114 (agendada 06/02, análise 09/02 = 3 dias)

## v4.76 - Filtro Global de Agendamento Futuro Válido
- [x] Atualizar função temAgendamentoFuturoValido() para verificar também status de alerta
- [x] Aplicar filtro em TODAS as categorias (não só "FS ABERTAS A 10+ DIAS"):
  - FS Após Agendamento
  - FS Status Alerta (não aplicar - são sempre incluídas)
  - FS Sem Notas
  - FS com Notas Antigas
- [x] Testar: FS 996 agendada 16/02 status "Pedido Autorização" deve sair de TODAS as categorias
- [x] Testar: FS com status "INCIDÊNCIA" mesmo agendada deve PERMANECER

## v4.77 - Remover Secção "AÇÕES NECESSÁRIAS" do PDF
- [x] Localizar onde a secção "ACOES NECESSARIAS:" é gerada no PDF
- [x] Remover toda a lista numerada (1. FICHAS ABERTAS... até 5. FICHAS COM NOTAS DESATUALIZADAS)
- [x] Manter apenas instruções de acompanhamento (contacto cliente, evolução/bloqueios)
- [x] Testar PDF gerado para confirmar remoção

## v4.78 - Excluir Fichas Agendadas no Próprio Dia
- [x] Atualizar temAgendamentoFuturoValido() para incluir dia atual (>= em vez de >)
- [x] Testar: FS agendada para hoje 09/02 deve ser excluída
- [x] Testar: FS agendada para amanhã 10/02 continua excluída

## v6.11.3 - Atualizar Versão do Portal
- [x] Localizar onde a versão v6.11.2 está definida
- [x] Atualizar para v6.11.3

## v6.11.4 - Corrigir Estrutura do Resumo do PDF
- [x] Remover linhas soltas antes de "PRAZO PARA RESOLUÇÃO"
- [x] Reorganizar estrutura do resumo para ficar limpo

## v6.11.5 - Ajustar PDF e Email de Análise
- [ ] Mover secção "PRAZO PARA RESOLUÇÃO" do PDF para corpo do email
- [ ] Corrigir label "ABERTAS +5 DIAS" para "ABERTAS +10 DIAS" no PDF
- [ ] Testar email e PDF gerados

## v6.11.5 - Ajustar PDF e Email de Análise
- [x] Mover secção "PRAZO PARA RESOLUÇÃO" do PDF para corpo do email
- [x] Corrigir label "ABERTAS +5 DIAS" para "ABERTAS +10 DIAS" no PDF
- [x] Testar email e PDF gerados

## v6.11.6 - Remover texto residual do PDF
- [x] Remover completamente "Indicar se houve contacto com cliente nos ultimos dias"
- [x] Remover completamente "Registar evolucao ou bloqueios encontrados"
- [x] Testar PDF gerado

## v6.12.0 - Melhorias no Dashboard do Volante
- [x] Adicionar filtros temporais (última semana, mês, trimestre, ano, personalizado)
- [x] Criar gráfico de evolução de visitas ao longo do tempo (linha)
- [x] Criar gráfico de distribuição de pendentes por loja (barras)
- [x] Criar gráfico de tipos de relatórios (pizza)
- [x] Implementar ranking de lojas mais visitadas
- [x] Implementar ranking de lojas com mais pendentes
- [x] Adicionar métricas de performance (média de visitas/mês, taxa de resolução)
- [x] Criar cards com estatísticas comparativas (vs período anterior)
- [x] Implementar exportação do dashboard para PDF
- [x] Testar todas as funcionalidades

## v6.13.0 - Dashboard de Estatísticas no Portal do Volante
- [x] Remover dashboard volante criado erradamente no menu principal
- [x] Adicionar nova opção "Dashboard" no portal do volante (como Calendário, Resultados, Histórico)
- [x] Criar componente de dashboard com estatísticas de apoios realizados
- [x] Adicionar gráficos de atividade (apoios por loja, evolução temporal)
- [x] Implementar ranking de lojas mais apoiadas
- [x] Adicionar filtros temporais
- [x] Implementar exportação para PDF
- [x] Testar no portal do volante

## v6.13.1 - Correções Dashboard Volante
- [x] Remover item "menu.items.dashboardVolante" do menu principal (DashboardLayout)
- [x] Corrigir layout do PDF para seguir padrão dos relatórios (logo ExpressGlass, cabeçalho profissional)
- [x] Corrigir filtro de meses que não está a funcionar no dashboard
- [x] Testar todas as correções

## v6.13.2 - Investigar Dados Janeiro Dashboard Volante
- [x] Verificar se existem apoios registados em janeiro na base de dados
- [x] Investigar query do dashboard para entender filtros aplicados
- [x] Corrigir problema se houver dados mas não aparecem
- [x] Testar visualização com dados de janeiro

## v6.13.3 - Reescrever PDF Dashboard Volante Profissionalmente
- [x] Analisar PDFs de referência do sistema (análise fichas, relatórios gestor)
- [x] Identificar todos os problemas do PDF atual (páginas vazias, falta de gráficos, layout pobre)
- [x] Reescrever completamente o PDF com layout profissional
- [x] Adicionar gráficos visuais (pizza, barras) ao PDF
- [x] Melhorar formatação de tabelas e rankings
- [x] Garantir que todo o conteúdo cabe numa única página bem estruturada
- [x] Testar geração do PDF

## v6.13.4 - Corrigir Erro Exportação PDF Dashboard Volante
- [x] Investigar logs do servidor para identificar erro
- [x] Verificar se chartjs-node-canvas está a funcionar corretamente
- [x] Corrigir problema de geração do PDF
- [x] Testar exportação completa

## v6.13.5 - Remover chartjs-node-canvas e Simplificar PDF Dashboard
- [x] Remover chartjs-node-canvas do package.json
- [x] Reescrever pdfPortalVolanteDashboard.ts sem gráficos renderizados
- [x] Usar apenas tabelas e estatísticas formatadas (como outros relatórios)
- [x] Testar deployment sem erros de canvas

## v6.13.6 - Corrigir PDF Dashboard Volante Definitivamente
- [x] Remover páginas 2 e 3 vazias (manter apenas 1 página)
- [x] Corrigir caracteres estranhos nas medalhas (Ø>YG, Ø>YH, Ø>YI)
- [x] Adicionar logo ExpressGlass no topo
- [x] Garantir que todo o conteúdo cabe numa única página
- [x] Testar PDF gerado

## v6.14.0 - Sistema de Documentos/Circulares
- [x] Criar tabela `documentos` na base de dados (título, descrição, fileUrl, fileKey, createdBy, targetLojas)
- [x] Implementar backend: upload para S3, CRUD de documentos
- [x] Criar página "Documentos" para gestores (upload, listagem, edição, eliminação)
- [x] Adicionar menu "Documentos" no DashboardLayout para gestores
- [x] Adicionar card "Circulares" no Portal da Loja
- [x] Implementar visualização de documentos no portal da loja
- [x] Testar upload, gestão e visualização
