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

## Bug: Agendamentos do volante aprovados não aparecem no calendário do Portal da Loja
- [x] Investigar como o calendário do Portal da Loja carrega agendamentos
- [x] Verificar query backend que retorna agendamentos para o portal da loja
- [x] REVERTIDO: filtro por lojaId estava errado - calendário deve mostrar ocupação GLOBAL do volante para lojas saberem disponibilidade
- [ ] Testar

## Melhoria: Tabela Minhas Lojas no Portal Gestor
- [x] Adicionar títulos de colunas (cabeçalhos) à tabela (#, Loja, Serviços, Objetivo, NPS)
- [x] Adicionar coluna de Objetivo do mês após número de serviços

## Melhoria: Cabeçalhos dinâmicos na tabela de ranking conforme métrica
- [x] Adaptar cabeçalho da coluna de valor para mudar conforme métrica (Serviços, Taxa Rep., Desvio %, Serv./Colab.)
- [x] Quando métrica não é Total Serviços, mostra coluna extra de Serviços para contexto

## Melhoria: Valor médio em destaque na tabela de ranking
- [x] Calcular média de todas as lojas para cada métrica
- [x] Mostrar barra de destaque com valor médio por cima da tabela (com média serviços e objetivo)

## Bug: Média de Serviços mostra valores absurdos (e+25/e+26) na barra de destaque
- [x] Diagnosticar cálculo da média no ResultadosDashboard.tsx
- [x] Corrigir fórmula de cálculo para mostrar valores correctos
- [x] Testar todas as 4 métricas (Total Serviços, Taxa Reparação, Desvio %, Serv./Colab.)
- [x] Guardar checkpoint

## Funcionalidade: Média nacional vs Minhas Lojas no Dashboard de Resultados
- [x] Analisar filtro de lojas actual e cálculo da média
- [x] Quando filtro "Minhas Lojas" está activo, mostrar média nacional para comparação
- [x] Mostrar diferença visual entre média das lojas do gestor e média nacional
- [x] Funciona também quando loja individual é seleccionada (mostra comparação com nacional)
- [x] Badge de diferença percentual (verde/vermelho) vs Nacional
- [x] Testar com diferentes métricas e filtros
- [x] Guardar checkpoint

## Sistema de Múltiplos Volantes com Atribuição Inteligente
- [x] Actualizar schema: remover UNIQUE de lojaId em loja_volante, adicionar prioridade e subZona
- [x] Adicionar campo subZona às lojas para agrupamento geográfico
- [x] Criar função getVolantesByLojaId (retorna array em vez de único)
- [x] Implementar algoritmo de scoring (disponibilidade 40%, carga 25%, proximidade 20%, histórico 10%, especialização 5%)
- [x] Actualizar fluxo de criação de pedidos para usar atribuição inteligente
- [x] Implementar redireccionamento automático quando volante reprova pedido
- [~] Actualizar frontend do gestor para gerir múltiplos volantes por loja (IGNORADO - a pedido do Marco)
- [~] Permitir configurar sub-zonas das lojas no painel do gestor (IGNORADO - a pedido do Marco)
- [x] Testar fluxo completo com 2 volantes (15 testes vitest passaram)
- [ ] Guardar checkpoint

## Lojas Preferenciais por Volante
- [x] Adicionar campo 'preferencial' (boolean) à tabela loja_volante
- [x] Actualizar algoritmo de proximidade para usar preferencial em vez de sub-zonas
- [x] Actualizar UI de gestão de volantes para marcar lojas preferenciais
- [ ] Guardar checkpoint

## Painel de Log de Atribuições Inteligentes
- [x] Criar procedure backend para listar pedidos com dados de atribuição IA
- [x] Criar página frontend com tabela de log de atribuições
- [x] Mostrar score detalhado (disponibilidade, carga, proximidade, histórico)
- [x] Mostrar info de redireccionamento quando aplicável
- [x] Guardar checkpoint

## Suspender/Activar Volantes
- [x] Verificar se campo 'ativo' já existe no schema dos volantes (SIM, linha 972)
- [x] Actualizar algoritmo de atribuição para ignorar volantes com ativo=false (já estava implementado)
- [x] Adicionar botão suspender/activar na UI de gestão de volantes (badge clicável)
- [ ] Guardar checkpoint

## Upload NPS com suporte a PDF
- [x] Tabela nps_dados já existia no schema
- [x] Criar parser de PDF NPS (pdfNpsProcessor.ts)
- [x] Actualizar procedure de upload para aceitar PDF e Excel (auto-detecta formato)
- [x] Actualizar frontend NPSUpload.tsx para aceitar ambos os formatos (.xlsx, .xls, .pdf)
- [x] Dashboard NPS já existia
- [x] 12 testes vitest passaram para o parser de PDF
- [ ] Guardar checkpoint

## Data de Upload nos Registos NPS
- [x] Verificar se campo dataUpload já existe na tabela nps_dados (createdAt já existia)
- [x] Mostrar data de upload no Dashboard NPS (header com ícone Calendar + nome ficheiro)
- [x] Mostrar data de upload no Portal da Loja (secção NPS - "Dados até")
- [x] Mostrar data de upload no Portal do Gestor (card NPS - mês/ano)
- [x] Guardar checkpoint

## NPS Gráfico no Histórico da Loja (Análise IA)
- [x] Adicionar secção NPS com KPIs (NPS score, taxa resposta, classificação) na página Histórico da Loja
- [x] Adicionar gráfico de evolução NPS mensal da loja (com linhas de referência 60%/80%)
- [x] Dar destaque à importância do NPS no prompt da IA (alerta prioritário se <60%)
- [x] Actualizar prompt IA para incluir NPS como factor crítico na análise
- [x] Guardar checkpoint

### Bug Fix: KPIs Vendas Complementares no Histórico da Loja
- [x] Média Mensal mostra mesmo valor que Total Vendas - VERIFICADO: correcto quando 1 mês seleccionado (82.5/1=82.5)
- [x] Escovas mostra €82.5 - VERIFICADO: correcto, a loja Póvoa de Varzim só vende escovas (totalVendas=escovasVendas na BD)
- [ ] Guardar checkpoint
## Gráficos Evolutivos no Histórico da Loja
- [x] Gráfico de Evolução da Taxa de Reparação deve mostrar TODOS os meses disponíveis (não apenas o mês seleccionado)
- [x] Gráfico de Evolução de Vendas Complementares deve mostrar TODOS os meses disponíveis
- [ ] Guardar checkpoint
## Gráficos Evolutivos - Limitar até ao mês analisado
- [x] Gráficos evolutivos devem mostrar dados apenas ATÉ o último mês do período seleccionado (não incluir meses posteriores)
- [ ] Guardar checkpoint
## KPI Escovas - Mostrar % escovas vs serviços
- [x] Alterar KPI de Escovas na Análise Comercial para mostrar % escovas vs serviços em vez de valor absoluto em euros
- [ ] Guardar checkpoint
## Bug: Traduções em falta no filtro do Relatório de Resultados
- [x] Corrigir 'common.porZona' → 'Por Zona' e 'common.porGestor' → 'Por Gestor' nos ficheiros de tradução
## Bug: Média Mensal de Vendas Complementares igual ao Total Vendas
- [x] Corrigir cálculo da Média Mensal para dividir pelo número de meses do ano até ao mês analisado
## NPS no Relatório de Resultados (Admin)
- [x] Adicionar dados NPS ao backend do relatório de resultados (já existia no aiService.ts)
- [x] Incluir NPS no prompt da IA para análise (já existia)
- [x] Adicionar secção NPS dedicada no frontend com KPIs (NPS médio, elegibilidade, taxa resposta)
- [x] Adicionar gráficos NPS (barras horizontais por loja + doughnut elegíveis vs não elegíveis)
- [x] Incluir análise IA sobre NPS na secção dedicada
- [x] Remover NPS duplicado de dentro das Recomendações
- [ ] Guardar checkpoint
## Bug: Lembrete ao fim do dia para volantes registarem serviços não funciona
- [x] Investigar scheduler/cron de lembretes para volantes
- [x] Corrigir formato cron de 5 campos ('0 18 * * *') para 6 campos ('0 0 18 * * 1-5')
- [x] Adicionar restrição a dias úteis (seg-sex)
- [ ] Guardar checkpoint
## Relatório de Resultados Admin - NPS no PDF e Ranking Ordenado
- [x] Ordenar ranking NPS por NPS desc + Taxa Resposta desc (elegíveis em cima)
- [x] Adicionar secção NPS completa à exportação PDF (KPIs, análise IA, tabela ranking com cores)
- [ ] Guardar checkpoint
## PDF NPS - Corrigir apresentação
- [x] Corrigir caracteres especiais no PDF (≥ aparece como "e) - substituido por >=
- [x] Corrigir espaçamento estranho na coluna Elegível do ranking - removido checkmark Unicode
- [x] Melhorar layout visual geral da secção NPS no PDF - caixa criterios, barra lateral analise, sanitize texto

## Cron Volantes - Notificação 18:00 não funciona (URGENTE)
- [x] Investigar scheduler.ts e logs do servidor
- [x] Verificar se o cron está a ser inicializado correctamente
- [x] Verificar lógica de envio de notificações aos volantes
- [x] Corrigir: timezone Europe/Lisbon adicionado ao cron
- [x] Corrigir: função getVolantesSemRegistoHoje agora resolve titulos como nomes de lojas
- [x] Corrigir: logging detalhado para diagnóstico
- [x] Corrigir: endpoint admin para executar lembrete manualmente
- [x] Testado com sucesso: lembrete enviado para Telegram (615966323 + 228613920)
- [ ] Guardar checkpoint

## Cron 18h - Lembrete para registar serviços (NÃO depende de agendamentos!)
- [x] O lembrete das 18h deve ser enviado a TODOS os volantes activos com Telegram, TODOS os dias úteis
- [x] Não depende de agendamentos - é simplesmente "já registaste os serviços de hoje?"
- [x] Reescrito scheduler.ts: busca volantes activos com Telegram, envia lembrete genérico
- [x] Testado: lembrete enviado com sucesso para 615966323 + 228613920
- [ ] Publicar

## BUG: Volante expulso do dashboard - pede login
- [x] Investigar fluxo de autenticação do volante no dashboard
- [x] Verificar se token do volante é validado correctamente (API retorna valid:true)
- [x] Corrigir: volanteData agora inclui token e lojas no objecto guardado no localStorage
- [x] Problema principal: versão publicada desactualizada - precisa de Publish
- [ ] Publicar

## Módulo de Notas/Dossiers (estilo Google Keep)
- [x] Schema BD: tabela notas com título, conteúdo rich text, tags, lojaId opcional, estado, fixada, cor
- [x] Schema BD: tabela notas_imagens para upload de imagens nas notas
- [x] Schema BD: tabela notas_tags para tags reutilizáveis
- [x] Endpoints tRPC: CRUD notas (criar, listar, editar, eliminar, mudar estado, fixar)
- [x] Endpoints tRPC: upload de imagens para notas (com compressão automática)
- [x] Endpoints tRPC: gestão de tags (criar, listar, eliminar)
- [x] Frontend: página Notas com grid de cards estilo Google Keep
- [x] Frontend: editor rich text TipTap (bold, italic, underline, highlight, headings, listas, imagens)
- [x] Frontend: filtros por tag, loja, estado, pesquisa
- [x] Frontend: mudar estado (rascunho, pendente, em análise, discutido, aprovado, adiado, concluído)
- [x] Frontend: fixar notas no topo, arquivar, cores de fundo
- [x] Integrar no menu lateral do dashboard (grupo Notas com ícone StickyNote)
- [x] 10 testes vitest passaram
- [ ] Publicar

## Bug: Notas - tradução em falta e posição errada no menu
- [x] Corrigir tradução "menu.items.notas" → "Notas" nos ficheiros de tradução PT e EN
- [x] Mover Notas para o grupo azul (Gestão - junto a Lojas, RH, Volantes, etc.)

## Melhorias Notas - Dialog, Lojas, Cores, PDF
- [x] Dialog/editor mais largo (max-w-5xl / 95vw)
- [x] Filtrar lojas apenas do gestor autenticado (usa trpc.lojas.getByGestor)
- [x] Cor automática por loja ao associar nota (paleta de 12 cores por lojaId)
- [x] Card branco por defeito, muda cor ao associar loja
- [x] Exportação PDF da nota (abre janela de impressão com HTML formatado)
- [x] Indicador de cor da loja no dropdown
- [x] Grid de 3 colunas (cards maiores)

## Bug: Exportação PDF Notas - Data, Cabeçalho, Rodapé
- [x] Corrigir "Invalid Date" - campo era criadoEm mas schema usa createdAt
- [x] Cabeçalho padronizado PoweringEG (barra azul topo + título centrado + meta dados)
- [x] Rodapé com "PoweringEG Platform 2.0 - a IA ao servico da ExpressGlass"
- [x] Data de criação e actualização no PDF
- [x] Data adicionada ao footer do card
- [ ] Guardar checkpoint

## Auto-save nas Notas
- [x] Implementar auto-save com debounce (2 segundos de inactividade)
- [x] Guardar no backend automaticamente sem precisar de clicar "Guardar"
- [x] Indicador visual: "Guardado automaticamente" / "A guardar..." / "Alterações por guardar"
- [x] Botão mudou de "Guardar" para "Guardar e Fechar" (auto-save não fecha editor)
- [x] Auto-save só activo em notas já criadas (novas precisam de clicar "Criar Nota")
- [ ] Guardar checkpoint

## Checklists dentro das Notas
- [x] Instalar extensões TipTap TaskList e TaskItem
- [x] Adicionar botão checklist na toolbar do editor (com ícone ListChecks)
- [x] Estilizar checkboxes no editor (interactivos, riscado quando concluído, suporte nested)
- [x] TaskItem configurado com nested: true para sub-tarefas
- [ ] Guardar checkpoint

## Bug: Auto-save não funciona em notas novas
- [x] Criar nota automaticamente na BD quando utilizador começa a escrever (título ou conteúdo)
- [x] Depois de criada automaticamente, activar auto-save normal com debounce 2s
- [x] Botão muda de "Criar Nota" para "Guardar e Fechar" após auto-criação
- [x] Upload de imagens funciona após auto-criação
- [ ] Guardar checkpoint

## Módulo Recepção de Vidros
- [x] Schema BD: tabela vidros_recepcao (id, foto, destinatario_raw, eurocode, pedido, cod_at, encomenda, loja_scan_id, loja_destino_id, estado, timestamps)
- [x] Schema BD: tabela vidros_mapeamento_destinatarios (id, nome_etiqueta, loja_ids associadas)
- [x] Endpoint tRPC: upload foto etiqueta + OCR via IA (extrair dados)
- [x] Endpoint tRPC: CRUD vidros recepcionados
- [x] Endpoint tRPC: CRUD mapeamentos destinatários (admin)
- [x] Card "Recepção Vidros" no Portal da Loja (câmara + scan + confirmação)
- [x] Card "Monitor Recepção" no Portal da Loja (lista vidros da loja)
- [x] Gestão de Mapeamentos no Dashboard Admin (associar nomes a lojas)
- [x] Mapeamento automático: quando destinatário já está mapeado, associar loja automaticamente
- [x] Destinatários novos ficam "pendente de associação" até admin mapear
- [x] Testes vitest para funções de BD e parsing OCR (15 testes passam)

## Bug Fix: Câmara preta no mobile e dados OCR não extraídos
- [x] Diagnóstico: fotos com 0 bytes no S3, dados todos NULL, câmara preta no mobile
- [x] Corrigir câmara mobile: playsinline, loadedmetadata, cameraReady state
- [x] Validar foto não-vazia antes de enviar (buffer > 100 bytes)
- [x] Simplificar chamada LLM (remover json_schema strict, suporte markdown code blocks)
- [x] Remover capture=environment do input file (forçava câmara em vez de galeria)

## Bug Fix: Câmara getUserMedia não funciona em mobile - substituir por input nativo
- [x] Remover getUserMedia e usar input type=file com capture=environment
- [x] Dois botões: "Tirar Foto" (abre câmara nativa) e "Escolher da Galeria"
- [x] Comprimir imagem antes de enviar (canvas resize max 1600px)

## Melhoria: Extracção de múltiplos Eurocodes por etiqueta
- [x] Melhorar prompt IA para identificar Eurocodes nos PICK_LABELS (ex: 0526/2488ASGRT → Eurocode 2488ASGRT)
- [x] Suportar múltiplos Eurocodes por etiqueta (campo eurocodes como array, guardado separado por vírgula)
- [x] Actualizar frontend para mostrar lista de Eurocodes como badges
- [x] Actualizar vista admin para mostrar múltiplos Eurocodes
- [x] Corrigir terminologia: não são só vidros, podem ser frisos e outros materiais

## Bug: Dropdown de lojas vazio no dialog de associação de destinatários
- [x] Investigar: frontend chamava trpc.lojas.getAll que não existe, correcto é trpc.lojas.list
- [x] Corrigido para usar trpc.lojas.list

## Redesenho Monitor Recepção - Layout tabela compacta
- [x] Layout tipo tabela com colunas e cabeçalhos (fundo branco)
- [x] Ênfase no Eurocode (coluna principal, badges azuis)
- [x] Campo de busca por Eurocode, pedido, destinatário
- [x] Filtro por data (input date)
- [x] Opção de apagar entradas (com confirmação inline Sim/Não)
- [x] Linhas compactas, informação condensada em tabela
- [x] Endpoint backend para eliminar registo de vidro
- [x] Botão ver foto e confirmar recepção na coluna acções

## Bug: Monitor Recepção - Layout PC
- [x] Repor cards de contadores (Total Registos e Hoje) como blocos visuais com bordas coloridas
- [x] Corrigir texto cinza claro para preto/escuro legível (text-gray-900, text-gray-800)
- [x] Título e cabeçalhos com contraste adequado (uppercase, bold, text-gray-700)

## Bug: Cards contadores não clicáveis no Monitor Recepção
- [x] Tornar card "Total Registos" clicável (limpa filtros)
- [x] Tornar card "Hoje" clicável (filtra por data de hoje)
- [x] Feedback visual: card activo com borda mais forte, ring e fundo colorido

## Funcionalidade: Botão Reporte nas acções do Monitor Recepção
- [x] Adicionar botão Reporte (ícone FileText laranja) na coluna Acções
- [x] Ao clicar, abrir dialog com frase pré-preenchida com dados da linha
- [x] Botão "Copiar Texto" para copiar a frase para o clipboard com feedback visual

## Funcionalidade: Exportar lista Monitor Recepção para PDF e Excel
- [x] Botões de exportação PDF e Excel no header do Monitor
- [x] Exportação Excel (CSV) com dados filtrados (separador ; para PT)
- [x] Exportação PDF com tabela formatada profissional (jsPDF + autoTable)

## Monitor Recepção - Layout Mobile
- [x] Fix Monitor Recepção mobile layout: show Eurocode, Pedido, Destinatário and Reporte button on small screens
- [x] Reverter Monitor Recepção para layout tabela em linha (não cards), mas com botão Reporte incluído nas acções
- [x] BUG: Fix ReferenceError 'onAutoCreate is not defined' when creating or viewing notes on mobile
- [x] Monitor Recepção: Destinatário deve mostrar nome da loja conectada pelo admin em vez do texto raw da etiqueta
- [x] BUG: Monitor Recepção cards (Total Registos / Hoje) contam registos eliminados - devem usar mesmos dados da lista
- [x] BUG: Monitor Recepção cards count mismatch with table - query crashed due to non-existent confirmadoEm field in select
- [x] BUG: Monitor Recepção - Unicode characters showing raw in table headers (ACÇÕES) and delete confirmation (Não) after production build

## Controlo de Stock (novo módulo)
- [x] DB: Criar tabela para guardar eurocodes extraídos das fichas de serviço (loja, eurocode, ficha, data)
- [x] DB: Criar tabela para guardar análises de stock (loja, data, dados)
- [x] Backend: Guardar eurocodes das fichas quando análise é feita
- [x] Backend: Procedure para receber listagem de stock colada, parsear e cruzar com eurocodes das fichas
- [x] Frontend: Página Controlo de Stock no Portal do Gestor (após Análise de Fichas)
- [x] Frontend: Área para colar listagem de stock (textarea)
- [x] Frontend: Filtro automático por família (OC, PB, TE, VL, VP) e quantidade >= 1
- [x] Frontend: Análise cruzada - em stock COM fichas, em stock SEM fichas, nas fichas SEM stock
- [x] Frontend: Guardar análise para consulta no próprio dia
- [x] Update stock parser: 5 columns (Familia, Ref, Design, Stock, Epcpond) tab-separated, decimal comma format
- [x] Update frontend textarea placeholder to match real data format
- [x] Ref column contains the eurocode for cross-referencing with fichas (# and * are part of the eurocode, do NOT strip)
- [x] Controlo Stock: Exportação PDF/Excel por status (Com Fichas, Sem Fichas, Fichas s/ Stock) com seleção de qual status exportar
- [x] Controlo Stock: Botão eliminar análises do histórico com confirmação
- [x] Controlo Stock: Remover exportação PDF, manter apenas Excel
- [x] Controlo Stock: Adicionar botão enviar email para loja (CC gestor) por status
- [x] Controlo Stock: Comparação entre duas análises de stock (evolução)
- [x] Controlo Stock: Mostrar nome da loja analisada no cabeçalho da página de resultados
- [x] Controlo Stock: Optimizar layout mobile (cabeçalho compacto, nome loja em linha separada, cards menores, botões adaptados)
- [x] Controlo Stock: Compactar cards de eurocodes no mobile (menos padding, texto menor, linhas mais densas)
- [x] Controlo Stock: Excel consolidado com 3 separadores (Com Fichas, Sem Fichas, Fichas s/ Stock) num único ficheiro
- [x] Controlo Stock: Tabela DB para classificação de eurocodes sem ficha (devolução rejeitada, usado, com danos, para devolver)
- [x] Controlo Stock: Persistência inteligente de classificações (limpa quando eurocode desaparece da listagem)
- [x] Controlo Stock: Alerta de longevidade para eurocodes sem ficha recorrentes (quantas análises consecutivas)
- [x] Controlo Stock: UI para classificar eurocodes sem ficha inline nos cards
- [x] Controlo Stock: Comparação entre duas análises de stock (seleccionar 2 do histórico, ver itens que entraram/saíram)
- [x] Controlo Stock: Filtro por classificação na tab Sem Fichas (dropdown para filtrar por devolução rejeitada, usado, com danos, para devolver)
- [x] Controlo Stock: Email consolidado com os 3 status (Com Fichas, Sem Fichas, Fichas s/ Stock) num único email
- [x] Controlo Stock: Desmultiplicar eurocodes sem ficha — cada unidade numa alínea separada (qty sempre 1)
- [x] Controlo Stock: Classificação independente por unidade (DB suporta índice por eurocode)
- [x] Controlo Stock: Adaptar Excel e email consolidado para reflectir desmultiplicação
- [x] BUG: ReferenceError: Cannot access 'X' before initialization — referência circular no ControloStock.tsx (movido dadosActivos antes de semFichasDesmultiplicados)
- [x] Portal Loja: Adicionar card "Análise Stock" com últimas análises de stock feitas pelo gestor
