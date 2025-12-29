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
