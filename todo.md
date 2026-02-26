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

## Adicionar Filtro por Gestor na Página de RH (Admin)
- [x] Localizar página de RH do painel admin
- [x] Adicionar dropdown de filtro por gestor
- [x] Implementar lógica de filtragem
- [x] Filtro implementado e funcional
- [ ] Guardar checkpoint

## BUG: Filtro por Gestor na Página RH Não Inclui Colaboradores das Lojas da Zona
- [x] Analisar lógica de filtragem atual
- [x] Modificar filtro para incluir colaboradores de lojas onde loja.gestorId = gestor selecionado
- [x] Correção aplicada - filtro agora inclui colaboradores diretos + colaboradores de lojas da zona
- [ ] Guardar checkpoint

## PROBLEMA: Filtro por Gestor Não Inclui Colaboradores de Lojas (Query Incompleta)
- [x] Site está acessível - não era erro 404, era filtro incompleto
- [x] Identificar query tRPC que carrega colaboradores - getAllColaboradores no db.ts
- [x] Descoberto: relação loja-gestor é many-to-many via tabela gestor_lojas (não lojas.gestorId)
- [x] Modificar query para usar tabela gestorLojas para obter lojaGestorId
- [x] Testar filtro - Fabio Dias mostra 31 colaboradores correctamente (3 volantes + 28 lojas) ✅
- [ ] Guardar checkpoint

## BUG: Menu lateral mostra "menu.items.uploadNPS" em vez do nome correcto
- [x] Localizar chave de tradução em falta - faltava em pt.json e en.json
- [x] Corrigir para mostrar "Upload NPS" em PT e EN
- [ ] Guardar checkpoint

## Alterar ícone do Upload NPS
- [x] Mudar ícone de TrendingUp para SmilePlus (ícone de sorriso/satisfação, adequado para NPS)
- [ ] Guardar checkpoint

## BUG: Upload NPS não reconhece cabeçalho 'Loja' na folha 'Por Loja'
- [x] Analisar estrutura - "Loja" está na col A (índice 0), não col B (índice 1)
- [x] Corrigir código: procurar "Loja" em col A e B, ajustar offsets dinâmicos
- [ ] Testar upload
- [ ] Guardar checkpoint

## Adicionar Coluna NPS ao Dashboard de Resultados
- [x] Verificar endpoints NPS existentes no backend
- [x] Adicionar dados NPS à tabela do Dashboard de Resultados
- [x] Mostrar NPS e Taxa de Resposta por loja/mês

## Criar Dashboard NPS Dedicado
- [x] Criar página NPSDashboard.tsx com gráficos e comparações
- [x] Adicionar KPIs: NPS médio, melhor/pior loja, evolução mensal
- [x] Gráfico de evolução NPS por mês (todas as lojas)
- [x] Tabela comparativa NPS por loja com taxa de resposta
- [x] Filtros: por gestor/zona, por período
- [x] Adicionar rota e link no menu lateral
- [ ] Guardar checkpoint

## BUG: Card "Loja Menos Visitada" não mostra o nome da loja
- [x] Localizar o card na página RelatoriosIA.tsx
- [x] Problema: JSON guardado na BD não tem lojaMaisVisitada/lojaMenosVisitada, mas tem visitasPorLoja
- [x] Corrigido: ambos os cards agora extraem dados de visitasPorLoja como fallback
- [x] Guardar checkpoint

## NPS Junto aos Resultados das Lojas
- [x] Integrar dados NPS na tabela do Dashboard de Resultados (junto aos dados de cada loja)
- [x] Mostrar NPS e taxa de resposta por loja/mês na mesma vista dos resultados
- [x] Coluna NPS melhorada com indicação de elegibilidade (✓ ou s/ prémio)
- [x] Guardar checkpoint

## Ranking NPS com Regras de Elegibilidade para Prémio
- [x] Criar ranking NPS nivelado pela taxa de resposta
- [x] Regra: NPS < 80% → sem direito a prémio (destacar visualmente)
- [x] Regra: Taxa de resposta < 7,5% → sem direito a prémio (destacar visualmente)
- [x] Adicionar indicação visual clara de elegibilidade/inelegibilidade
- [x] Secção dedicada no Dashboard de Resultados com resumo (elegíveis/sem prémio/taxa)
- [x] Dashboard NPS actualizado com mesmas regras e tabela completa
- [x] Legenda com 3 cores: verde (elegível), vermelho (NPS<80%), laranja (taxa<7.5%)
- [x] Guardar checkpoint

## Integração NPS no Chatbot IA
- [x] Verificar se o Chatbot já tem acesso aos dados NPS (não tinha - só regras no prompt)
- [x] Integrar dados NPS no contexto do Chatbot principal (gestores e admin)
- [x] Integrar dados NPS no Chatbot do Portal da Loja (NPS próprio + ranking nacional)
- [x] Integrar dados NPS no Chatbot do Portal do Volante (dados nacionais)
- [x] Incluir taxa de resposta e elegibilidade para prémio no contexto
- [x] Actualizar system prompt para incluir NPS, regras de comissionamento e elegibilidade
- [x] Garantir acesso NPS para gestores (apenas suas lojas) e lojas (apenas a própria + ranking)
- [x] Adicionar 4 sugestões de perguntas NPS ao chatbot
- [x] Testar consultas NPS via Chatbot - 26 lojas elegíveis identificadas correctamente
- [x] Guardar checkpoint

## Incluir NPS no Relatório IA de Resultados
- [x] Analisar aiService.ts para identificar onde inserir dados NPS
- [x] Carregar dados NPS no contexto enviado à IA (gerarRelatorioResultadosComIA e versão MultiplosMeses)
- [x] Actualizar prompt da IA para incluir análise NPS e elegibilidade por loja
- [x] Adicionar campo analiseNPS ao JSON schema da resposta IA
- [x] Incluir secção NPS nos Insights IA (Análise NPS - Elegibilidade para Prémio)
- [x] Incluir secção NPS dedicada com KPIs + tabela ranking (elegíveis/não elegíveis)
- [x] Testar geração de relatório IA com NPS - 28 elegíveis, 31 sem prémio
- [x] Guardar checkpoint

## NPS no Dashboard de Resultados do Portal da Loja
- [x] Adicionar dados NPS ao backend (dashboardCompleto do portal da loja)
- [x] Corrigir mapeamento de colunas NPS (npsJan, npsFev, etc. em vez de linhas separadas)
- [x] Adicionar card/secção NPS no frontend do Portal da Loja (tab resultados)
- [x] Mostrar NPS, taxa de resposta e elegibilidade para prémio (4 KPIs)
- [x] Adicionar alerta NPS nos alertas do dashboard (verde/vermelho)
- [x] Testar no browser - Barcelos: NPS 100%, Taxa 20%, Elegível
- [x] Guardar checkpoint

## Bug: Relatório IA Resultados foca em relatórios de visitas em vez de resultados (CORRIGIDO)
- [x] Analisar aiService.ts - versão gestor não tinha dados de resultados, versão admin dava peso excessivo a relatórios
- [x] Corrigir versão gestor: adicionar busca de resultados mensais, vendas complementares, NPS
- [x] Reformular prompt gestor para focar em resultados (serviços, objectivos, desvios, NPS)
- [x] Adicionar campos analiseResultados, insightsIA, dadosGraficos, comparacaoLojas, dadosNPS ao retorno gestor
- [x] Actualizar frontend: adicionar secções KPIs, Ranking, Insights IA, NPS ao relatório gestor
- [x] Testar - relatório agora mostra 69 lojas, KPIs, rankings, análise por zonas, NPS, insights IA
- [x] Guardar checkpoint

## Dashboard NPS - Traduções PT e Filtro por Loja (CORRIGIDO)
- [x] Adicionar traduções PT completas ao Dashboard NPS (todos os textos traduzidos via t())
- [x] Adicionar traduções EN completas ao Dashboard NPS
- [x] Adicionar filtro por loja específica ao Dashboard NPS (dropdown com 62 lojas)
- [x] Testar traduções PT e EN - ambas funcionam correctamente
- [x] Testar filtro por loja - Beira baixa sm: NPS 100%, Taxa 5.9%
- [x] Guardar checkpoint

## Portal da Loja - NPS não aparece nos Resultados (CORRIGIDO)
- [x] Investigar - secção NPS existia mas estava demasiado abaixo na página
- [x] Mover NPS para posição de destaque: logo após alertas, antes de vendas complementares
- [x] Testar no browser - Barcelos: NPS 100%, Taxa 20%, Elegível, em destaque
- [x] Guardar checkpoint

## Histórico NPS Mensal no Portal da Loja (CONCLUÍDO)
- [x] Analisar dados NPS disponíveis no backend do portal da loja
- [x] Adicionar historicoNPS ao backend (todos os 12 meses do ano, independente do filtro)
- [x] Adicionar gráfico de evolução NPS mensal (linha) com NPS e Taxa de Resposta
- [x] Incluir linhas de referência: Mínimo NPS (80%) e Mínimo Taxa (7.5%)
- [x] Adicionar título "Histórico NPS Mensal" à tabela de dados
- [x] Testar no browser - Barcelos: gráfico Jan-Fev 2026, NPS 100%, Taxa ~20%
- [x] Guardar checkpoint

## Bug: NPS Respostas mostra 0 quando Taxa Resposta é > 0% (CORRIGIDO)
- [x] Investigar - tabela nps_dados não tem coluna de total de respostas, só NPS e Taxa
- [x] Removido card "Respostas"/"Meses c/ Dados" - agora só 3 KPIs: NPS, Taxa Resposta, Elegibilidade
- [x] Removida coluna "Respostas" da tabela de histórico mensal
- [x] Guardar checkpoint

- [x] Bug: Tópico de reunião "Garland" gravado mas não aparece na listagem (era cache do browser)[ ] Investigar na BD se o tópico foi gravado
- [ ] Analisar código de listagem de tópicos
- [ ] Corrigir o bug
- [ ] Testar

## Resolver Problemas Recorrentes de Cache no Browser
- [x] Analisar configuração actual de cache (headers HTTP, service worker, tRPC)
- [x] Adicionar headers anti-cache nas respostas da API (/api/trpc)
- [x] Configurar tRPC client para não usar cache do browser
- [x] Verificar service worker e garantir que não faz cache de dados da API (corrigido sw-portal-gestor.js)
- [x] Testar que dados novos aparecem imediatamente sem hard refresh

## Bug: Dados NPS não aparecem nos resultados das lojas no Portal Gestor
- [x] Investigar código do Portal Gestor (página de resultados por loja)
- [x] Verificar se dados NPS existem na BD para as lojas (confirmado: Barcelos tem NPS 100% Jan/Fev)
- [x] Adicionar card NPS + Taxa Resposta NPS aos resultados da loja no Portal Gestor
- [x] Testar e publicar

## Novo Card: Agenda SM no Portal da Loja
- [x] Adicionar card "Agenda SM" com link externo https://agendamentosm.netlify.app/index.html
