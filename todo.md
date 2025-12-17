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
- [ ] Guardar checkpoint
