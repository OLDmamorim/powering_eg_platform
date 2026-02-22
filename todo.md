# PoweringEG Platform - TODO

## Mover Histórico de Envios Volante para Dashboard de Estatísticas
- [x] Remover histórico da página de Resultados do Volante
- [x] Adicionar histórico no final do Dashboard de Estatísticas do Volante (igual ao Recalibra)
- [x] Testar no telemóvel

## Dashboard Recalibra - Filtro por Mês Atual por Defeito
- [x] Modificar DashboardRecalibra.tsx para inicializar com mês atual selecionado
- [x] Testar que mostra apenas dados de Fevereiro 2026 por defeito

## Dashboard Recalibra - Trocar Evolução Semanal por Mensal
- [x] Modificar DashboardRecalibra.tsx para mostrar evolução mensal em vez de semanal
- [x] Atualizar backend para calcular dados mensais
- [x] Testar gráfico mensal

## Dashboard Recalibra - Gráfico Evolução Mensal Sem Filtro
- [x] Criar query separada no backend para evolução mensal (sem filtro de meses)
- [x] Atualizar frontend para usar query sem filtro apenas no gráfico de evolução
- [x] Testar que gráfico mostra todos os meses enquanto resto mantém filtro

## Dashboard Recalibra - Remover Filtro de Mês das Marcas
- [x] Modificar backend para calcular porMarca com todas as calibragens (sem filtro)
- [x] Testar que gráfico e tabela de marcas mostram histórico completo

## Exportação PDF Dashboard Volante e Recalibra
- [ ] Criar endpoint backend para gerar PDF do dashboard Recalibra (com dados filtrados)
- [ ] Adicionar botão "Exportar PDF" no frontend do Recalibra
- [ ] Criar endpoint backend para gerar PDF do dashboard Volante (com dados filtrados)
- [ ] Adicionar botão "Exportar PDF" no frontend do Volante
- [ ] Testar exportação com filtros diferentes

## Ajustar Cores dos Relatórios Email (Volante e Recalibra)
- [x] Alterar info-box para fundo cinzento claro (#f3f4f6) com texto preto
- [x] Remover gradientes coloridos do info-box
- [x] Usar formato igual aos outros emails que funcionam no Outlook
- [x] Testar visualização no Outlook

## Sistema NPS - Upload e Dashboard
- [x] Criar tabela nps_dados na BD para dados NPS por loja/ano/mês
- [x] Implementar parsing do Excel NPS (sheet Por Loja) no excelProcessor.ts
- [x] Criar página NPSUpload.tsx para upload de ficheiro NPS
- [x] Adicionar rota /nps-upload no App.tsx
- [x] Adicionar link "Upload NPS" no menu DashboardLayout
- [x] Endpoint backend nps.upload para upload e processamento do ficheiro
- [x] Endpoints backend para consulta de dados NPS (getDadosLoja/Lojas/TodasLojas)
- [ ] Exibir coluna NPS no dashboard de resultados (ResultadosDashboard.tsx)

## Bug: Relatório de IA de Resultados Vazio - RESOLVIDO ✅
- [x] Investigar query do Relatório IA Resultados (RelatorioIAResultados.tsx)
- [x] Verificar BD - relatório guardado mas JSON vazio (relatorio_json: {})
- [x] Identificar problema: código usava r.dataVisita mas campo BD é r.data
- [x] Corrigir lógica de filtragem de relatórios por data no aiService.ts (linhas 195, 200)
- [x] Adicionar verificações de segurança no frontend (RelatorioIAResultados.tsx)
- [x] Testar com dados reais (50 relatórios livres + 8 completos Fev 2026) - SUCESSO!
- [x] Relatório gerado com 69 lojas, KPIs, rankings, análises e gráficos completos

## Bug: Relatório IA Gestor mostra 0 em todas as métricas
- [x] Diagnosticar causa raiz: router usava gerarRelatorioComIA() (admin) para gestores
- [x] Corrigir r.data → r.dataVisita no aiService.ts (filtro de período)
- [x] Corrigir router gerar: usar gerarRelatorioIAGestor() quando role !== admin e âmbito === minhas
- [x] Corrigir router gerarMultiplosMeses: usar gerarRelatorioIAGestorMultiplosMeses() para gestores
- [x] Testar relatório gestor com dados reais (Marco: 27 livres, 1 completo, 52 pendentes)
- [x] Guardar checkpoint e entregar ao utilizador

## Informações Complementares das Lojas (campos facultativos)
- [x] Adicionar colunas ao schema: telefone, telemovel, morada, renda, senhorio, contactoSenhorio, areaM2, observacoesImovel
- [x] Migrar BD com pnpm db:push
- [x] Criar endpoints tRPC para ler/atualizar informações complementares
- [x] Implementar UI na ficha da loja com secção de informações complementares
- [x] Testar edição e visualização dos novos campos
- [ ] Guardar checkpoint

## Chatbot - Integrar Informações Complementares das Lojas
- [x] Analisar código do chatbot para entender como funciona o contexto
- [x] Adicionar informações complementares das lojas ao contexto do chatbot (chatbotService.ts + chatbotServicePortais.ts)
- [x] Adicionar instrução ao system prompt sobre informações complementares
- [x] Testar chatbot com perguntas sobre lojas (telefone, morada, renda, etc.) - SUCESSO!
- [x] Guardar checkpoint

## Envio Automático de Relatórios Mensais (Volante + Recalibra)
- [x] Verificar se o scheduler está a ser inicializado no arranque do servidor (OK - linha 78 de _core/index.ts)
- [x] Investigar por que 0 emails foram enviados no relatório do Recalibra (email da unidade estava a null)
- [x] BUG: Endpoint de atualização da unidade Recalibra não guarda o campo email (só aceitava nome e lojasIds)
- [x] Corrigir o endpoint para incluir email, profissionalNome e contacto na atualização
- [ ] Testar que o email é guardado correctamente
- [ ] Confirmar que o sistema de envio automático está pronto
- [ ] Guardar checkpoint

## Investigar Envio Automático de Relatórios Mensais
- [ ] Verificar se o cron job está a ser executado no dia 20 às 09:00
- [ ] Verificar logs do servidor para identificar erros no envio automático
- [ ] Identificar por que "Nenhum envio registado" aparece no dashboard do Volante
- [x] Testar envio manual dos relatórios mensais (Volante + Recalibra) - BUGS ENCONTRADOS
- [x] BUG 1: Função getAllVolantes() não existe no db.ts
- [x] BUG 2: Código do relatorioMensalRecalibra.ts esperava gestor.user.email mas getGestorById() retorna gestor.email
- [x] Criar função getAllVolantes() no db.ts (linhas 8527-8535)
- [x] Corrigir relatorioMensalRecalibra.ts para usar gestor.email em vez de gestor.user.email
- [x] Testar novamente o envio manual após correções - SUCESSO! Email Recalibra enviado para mamorim@expressglass.pt
- [ ] Guardar checkpoint

## BUG CRÍTICO: Cron de Relatórios Mensais com Formato Inválido
- [x] Identificar que cron '0 9 20 * *' tem apenas 5 campos (formato inválido)
- [x] Corrigir para '0 0 9 20 * *' (6 campos: segundo minuto hora dia mês dia-semana)
- [x] Esta era a razão pela qual NÃO foram enviados relatórios no dia 20 de Fevereiro
- [ ] Reiniciar servidor para aplicar correção
- [ ] Guardar checkpoint

## Envio Manual de Relatórios Volante - Fevereiro 2026
- [x] Modificar código temporariamente para enviar dados de Fevereiro/2026
- [x] Executar envio manual dos relatórios do Volante - 7 emails para lojas + 1 email consolidado para gestor
- [x] Corrigir bug gestor.user.email no relatorioMensalVolante.ts (mesmo bug do Recalibra)
- [x] Reverter alterações temporárias
- [x] Emails enviados com sucesso para: Vila Verde, Braga, Famalicão (2x), Barcelos (2x), Guimarães, Marco Amorim
