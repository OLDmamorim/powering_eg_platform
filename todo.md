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
