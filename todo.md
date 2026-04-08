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
- [x] Portal Loja: Permitir à loja ver detalhe da análise de stock (lista de eurocodes sem ficha desmultiplicados)
- [x] Portal Loja: Permitir à loja classificar eurocodes sem ficha directamente no portal (dropdown inline)
- [x] Portal Loja: Backend - procedimento para classificar via token de loja
- [x] BUG Portal Loja Stock: Eurocodes mostram "undefined" em vez da referência (corrigido: usar item.ref em vez de item.eurocode)
- [x] Portal Loja Stock: Mostrar TODOS os eurocodes (com ficha, sem ficha, fichas s/ stock) com cards como filtro
- [x] Portal Loja Stock: Classificação só aparece nos eurocodes sem ficha
- [x] Portal Loja Stock: Adicionar campo de pesquisa por referência, descrição ou eurocode na vista de detalhe
- [x] BUG Portal Loja Stock: TypeError obrano?.toLowerCase is not a function — campo numérico na pesquisa (corrigido: String(v) antes de toLowerCase)

## Controlo de Stock: Excel em Anexo no Email Consolidado
- [x] Criar stockExcelService.ts no servidor para gerar Excel com ExcelJS (3 separadores: Com Fichas, Sem Fichas, Fichas sem Stock)
- [x] Incluir classificações e recorrência nos itens sem fichas (busca automática da BD)
- [x] Desmultiplicação de itens no Excel (cada unidade numa linha separada)
- [x] Integrar geração do Excel no enviarEmailConsolidado (routers.ts)
- [x] Anexar Excel ao email da loja e à cópia do gestor
- [x] Teste unitário criado e passado com sucesso
- [x] Guardar checkpoint

## Simplificar Email Consolidado de Stock (só introdução + Excel anexo)
- [x] Remover tabelas detalhadas do corpo HTML do email
- [x] Manter apenas introdução/resumo com números principais
- [x] Excel continua em anexo como único detalhe
- [x] Guardar checkpoint

## BUG: Excel não aparece em anexo no email de Controlo de Stock
- [x] Investigar função sendEmail para verificar suporte a attachments
- [x] Corrigir stockExcelService.ts com try/catch robusto nas queries DB
- [x] Testar envio com Excel em anexo (teste completo OK no sandbox)
- [x] Guardar checkpoint e publicar

## Limpeza de dados de teste na base de dados
- [x] Identificar lojas de teste (87 lojas de teste)
- [x] Identificar gestores de teste (409 gestores de teste)
- [x] Identificar relatórios de teste (950 livres + 319 completos)
- [x] Remover todos os dados de teste (3523 registos removidos)
- [x] Verificar integridade dos dados reais (6 gestores, 70 lojas, 108 rel. livres, 8 rel. completos)
- [x] Guardar checkpoint

## Refactor Controlo de Stock: Upload Global (todas as lojas de uma vez)
- [x] Analisar código actual do Controlo de Stock (backend + frontend)
- [x] Criar nova procedure backend para upload global (mapear Armazém → Nº loja)
- [x] Filtrar apenas famílias OC, PB, VL e TE
- [x] Criar nova UI com upload global e vista por gestor com quadros por loja (como Análise de Fichas)
- [x] Manter vista de detalhe por loja (Total Stock, Com Fichas, Sem Fichas, Fichas s/ Stock)
- [x] Remover mensagem de armazéns não mapeados
- [x] Testar com 6 gestores: Carlos Eduardo, Fabio Dias, Marco Amorim, Marco Vilar, Mónica Correira, Rui Adrião
- [x] Guardar checkpoint

## BUG: Controlo de Stock mostra lojas de todos os gestores
- [x] Gestor deve ver apenas as suas lojas, Admin vê tudo agrupado por gestor
- [x] Corrigir backend para filtrar resultados por gestorId quando role é gestor
- [x] Guardar checkpoint

## Enviar às Minhas Lojas (email em massa com Excel anexo)
- [x] Criar procedure backend enviarEmailTodasLojas para enviar email consolidado a todas as lojas do gestor
- [x] Adicionar botão "Enviar às Lojas" na vista de resultados do Controlo de Stock (por gestor)
- [x] Cada loja recebe email com introdução + Excel em anexo com os seus dados
- [x] Gestor recebe email resumo com status de envio de cada loja
- [x] Pausa de 500ms entre emails para evitar rate limiting

## Dashboard de Stock (widget no dashboard principal)
- [x] Criar procedure backend dashboardStock (resumo das últimas análises por loja)
- [x] Criar helper getDashboardStock (gestor) e getDashboardStockAdmin (admin) no db.ts
- [x] Criar widget StockDashboardWidget no Dashboard.tsx
- [x] Mostrar totais: lojas analisadas, artigos em stock, com fichas, sem fichas, fichas sem stock
- [x] Barra de progresso visual (verde=com fichas, âmbar=sem fichas)
- [x] Top 5 lojas com mais itens sem fichas
- [x] Mostrar data da última análise
- [x] Link para a página de Controlo de Stock

## Mover Dashboard de Stock para dentro da página Controlo de Stock
- [x] Remover widget StockDashboardWidget do Dashboard.tsx principal
- [x] Adicionar dashboard de stock como vista inicial na página ControloStock.tsx (com cards por loja, barra de progresso, top sem fichas)
- [x] Redesenhar histórico para mostrar lojas em cards/quadrados (como na análise)
- [x] Adicionar tab "Dashboard" na navegação do Controlo de Stock
- [x] Guardar checkpoint

## Gráfico de Evolução Temporal no Dashboard de Stock
- [x] Criar procedure backend evolucaoStock (gestor + admin) no routers.ts
- [x] Criar helpers getEvolucaoStock e getEvolucaoStockAdmin no db.ts
- [x] Agrupar análises por data (dia) e calcular totais agregados
- [x] Adicionar gráfico de linhas (Recharts) ao dashboard de stock
- [x] Mostrar evolução de: total stock, com fichas, sem fichas, fichas sem stock
- [x] Cores: azul (total), verde (com fichas), âmbar (sem fichas), vermelho (fichas s/ stock)
- [x] Tooltip e legenda em português
- [x] Guardar checkpoint

## Destacar Percentagem Sem Fichas no Dashboard de Stock
- [x] Alterar badge nos cards das lojas de "% c/ fichas" para "% s/ fichas" com cor âmbar/vermelha
- [x] Destacar visualmente a percentagem sem fichas como métrica principal
- [x] Cores dinâmicas: verde (<40%), âmbar (40-59%), vermelho (>=60%)
- [x] Aplicado no dashboard e no histórico
- [x] Guardar checkpoint

## Ordenar Lojas por % Sem Fichas (Pior para Melhor)
- [x] Ordenar cards das lojas no dashboard por % sem fichas descendente
- [x] Ordenar cards das lojas no histórico por % sem fichas descendente
- [x] Guardar checkpoint

## Adicionar Instrução no Email de Stock às Lojas
- [x] Adicionar frase no corpo do email com indicação para aceder ao PoweringEG, ir à análise de stock, separador "Stock sem Fichas" e classificar os eurocodes
- [x] Guardar checkpoint

## BUG: Emails de Stock enviados sem anexo Excel
- [x] Investigar: Excel gera corretamente no sandbox (teste direto OK)
- [x] Investigar: nodemailer envia com anexo corretamente (teste direto OK)
- [x] Alterar enviarEmailConsolidado para lançar erro se Excel falhar (em vez de continuar sem anexo)
- [x] Adicionar frase de instrução ao email consolidado (faltava)
- [x] Simplificar lógica de attachment (sempre obrigatório)
- [x] Adicionar logs detalhados ao emailService.ts para diagnóstico
- [ ] Guardar checkpoint e testar

## Remover Card "Fichas s/ Stock" da Vista de Detalhe da Loja
- [x] Remover o 4º card (Fichas s/ Stock) dos KPI cards na vista de detalhe da loja
- [x] Alterar grid de 4 para 3 colunas
- [ ] Guardar checkpoint

## Remover Tab e Listagem "Fichas s/ Stock" da Vista de Detalhe
- [x] Remover tab "Fichas s/ Stock" dos tabs de navegação
- [x] Remover TabsContent da listagem de fichas sem stock
- [x] Manter apenas tabs "Com Fichas" e "Sem Fichas" (grid 2 colunas)
- [ ] Guardar checkpoint

## Remover "Fichas s/ Stock" de TODOS os locais
- [x] Remover 5º card KPI "Fichas s/ Stock" do dashboard de stock
- [x] Remover linha "Fichas s/ Stock" dos cards das lojas no dashboard
- [x] Remover linha "Fichas s/ Stock" dos cards das lojas no histórico
- [x] Remover sheet "Fichas sem Stock" do Excel frontend (exportConsolidatedExcel)
- [x] Remover sheet "Fichas sem Stock" do Excel backend (stockExcelService)
- [x] Remover "Fichas sem Stock" da tabela do email consolidado
- [x] Remover "Fichas sem Stock" da tabela do email em massa (enviarEmailTodasLojas)
- [x] Remover fichasSemStock do input do enviarEmailConsolidado
- [x] Remover fichasSemStock do exportarExcelConsolidado
- [x] Remover linha do gráfico de evolução temporal
- [x] Remover da comparação de análises
- [x] Remover "Fichas s/ Stock" do Portal da Loja (cards KPI, listagem, histórico)
- [ ] Guardar checkpoint

## BUG: Análise de Porto Alto a dar zero
- [ ] Investigar dados na BD para a loja Porto Alto
- [ ] Identificar e corrigir o problema
- [ ] Guardar checkpoint

## Apagar Análises em Massa no Histórico
- [x] Verificar quantas análises existem na BD (486 total, 66 lojas x ~8 uploads)
- [x] Criar procedures backend: batches (listar) e eliminarBatch (apagar batch inteiro)
- [x] Criar helpers getBatchesStock, getBatchesStockAdmin, eliminarBatchStock no db.ts
- [x] Redesenhar histórico com tabela de uploads + cards por loja
- [x] Tabela mostra: data/hora, lojas, total stock, com/sem fichas, % s/ fichas, botão apagar
- [x] Confirmação antes de apagar com detalhes do batch
- [ ] Guardar checkpoint

## Reordenar: Sem Fichas logo após Total (antes de Com Fichas)
- [x] Reordenar KPI cards no dashboard de stock (Total > Sem Fichas > Com Fichas)
- [x] Reordenar linhas nos cards das lojas no dashboard e histórico
- [x] Reordenar tabs na vista de detalhe da loja (Sem Fichas > Com Fichas)
- [x] Reordenar sheets no Excel (Sem Fichas primeiro)
- [x] Reordenar colunas na tabela do email consolidado e em massa
- [x] Reordenar cards/tabs no Portal da Loja (Sem Fichas primeiro)
- [ ] Guardar checkpoint

## Fix: Tabs Sem Fichas / Com Fichas com conteúdo trocado
- [x] Verificado: tabs estão correctos no código actual (Sem Fichas mostra itens sem fichas, Com Fichas mostra itens com fichas)
- [x] Removidos últimos vestígios de Fichas s/ Stock da vista de comparação e resultados
- [ ] Guardar checkpoint

## Adicionar botão "Enviar às Lojas" no Histórico
- [x] Criar procedure backend enviarEmailBatch (envia emails para todas as lojas de um batch)
- [x] Criar helper getAnalisesByBatchTime no db.ts
- [x] Adicionar botão "Enviar" na tabela de batches do histórico
- [x] Botão com confirmação antes do envio
- [x] Feedback toast com resultados (enviados/falhados)
- [ ] Guardar checkpoint

## Fix: Ordem das sheets no Excel enviado por email
- [x] Sheet "Sem Fichas" agora é a primeira, "Com Fichas" a segunda no Excel (stockExcelService.ts)
- [ ] Guardar checkpoint

## Fix: Excel descarregado pela app - sheet Sem Fichas com colunas erradas
- [x] Sheet "Sem Fichas" no download usava colunas de "Com Fichas" (Qtd, N.º Fichas, Fichas Associadas)
- [x] Corrigido: agora usa Referência, Unidade, Família, Descrição, Classificação, Análises Consecutivas (igual ao email)
- [x] Removida definição duplicada de colunas na sheet Com Fichas
- [ ] Guardar checkpoint

## Fix: Build Vite falha por falta de memória (Service Unavailable)
- [x] Diagnosticado: Vite build era "Killed" por OOM ao compilar 69k+ linhas de TSX
- [x] Adicionado lazy loading (React.lazy) para as 8 páginas maiores
- [x] Adicionado Suspense wrapper no Router
- [x] Configurado manual chunks no Vite (vendor, charts, excel, ui, react, pages)
- [x] Desactivado sourcemaps no build de produção
- [x] Build agora completa em ~38 segundos
- [x] Guardar checkpoint

## Fix: Lazy loading causa página em branco no site publicado
- [x] Diagnosticado: manus-runtime embute app inline, import() dinâmico não funciona
- [x] Revertido lazy loading e Suspense
- [x] Revertido manual chunks no vite.config.ts
- [x] Guardar checkpoint

## Bug: Service Unavailable ao analisar stock global
- [x] Investigar causa: proxy do Manus corta ligação por timeout antes do processo terminar
- [x] Corrigido: convertido para processamento em background com polling (jobId + analisarGlobalStatus)
- [x] Frontend actualizado: mostra progresso em tempo real (loja a loja)
- [x] Migrado de memória para base de dados (tabela background_jobs) para funcionar com múltiplas instâncias
- [ ] Guardar checkpoint

## Fix: Stock analysis hangs on published site (OOM ao ler Excel no servidor)
- [x] Mover leitura do Excel para o frontend (browser) usando SheetJS/xlsx
- [x] Backend recebe apenas dados JSON já processados (não base64 do ficheiro inteiro)
- [x] Adicionar timeout no frontend para jobs presos (5 min max)

## Bug: Eurocode #8453AGACMVZ aparece como "Sem fichas" quando tem serviço pronto
- [x] Investigar na BD se existe ficha para este eurocode
- [x] Verificar lógica de matching entre stock e fichas
- [x] Corrigir se necessário - REVERTIDO: # e * fazem parte do eurocode (vidros diferentes)
- [x] Investigar extração de fichas do XUI - STATUS_EXCLUIR filtrava 'Serviço Pronto' antes de guardar eurocodes
- [x] Bug: #8453AGACMVZ existe na análise de fichas mas não foi guardado - fichas excluídas agora guardadas separadamente para eurocodes

## Fix: Deploy timeout (bundle demasiado grande)
- [x] Reduzir bundle com lazy loading de todas as páginas (React.lazy + Suspense)
- [x] Stubs para shiki, mermaid, katex via Vite plugin (dist 26MB → 12MB)
- [x] Verificar que site funciona localmente após alterações
- [ ] Guardar checkpoint e publicar (a fazer)

## Fix: Site lento após lazy loading
- [x] Adicionar prefetch de todas as páginas após carregamento inicial (1.5s delay)

## Bug: Dados do senhorio não são guardados
- [ ] Investigar gravação de nome e contacto do senhorio na loja de Famalicão
- [ ] Corrigir se necessário
- [x] Análise de stock: garantir que eurocodes de TODAS as fichas (todos os status) são usados no cruzamento com stock

## Bug: Análise de stock só mostra 10 lojas em vez de 14
- [x] Investigar porque a análise de stock de 12/03 só analisou 10 lojas (a anterior tinha 14) - causa: agrupamento por minuto (DATE_FORMAT) dividia uploads longos
- [x] Corrigir o problema - adicionado campo batchId à tabela analises_stock + migração retroactiva de dados existentes

## Bug: Total Stock não bate com Sem Fichas + Com Fichas
- [x] Investigar porque 40 + 31 = 71 mas Total Stock = 68 em Braga minho center - causa: KPI Sem Fichas usava itens desmultiplicados (unidades) mas Total Stock contava linhas
- [x] Corrigir cálculo para que Total = Sem Fichas + Com Fichas - KPI agora usa totalSemFichas (linhas), com indicação de unidades quando diferente

## Novas opções de classificação no Controlo de Stock
- [x] Adicionar opção "P/Realizar" ao dropdown de classificação dos itens Sem Fichas
- [x] Adicionar opção "C/Ficha de Serviço" ao dropdown - ao seleccionar, o eurocode passa para a listagem Com Fichas
- [x] Actualizar portal da loja com as mesmas opções (incluindo lógica de mover para Com Fichas)

## Bug: "auth is not defined" ao classificar stock com novos status
- [x] Investigar erro "auth is not defined" - causa: função validarTokenLoja não era chamada correctamente (resultado não guardado em variável auth)
- [x] Corrigir: `const auth = await db.validarTokenLoja(input.token);`

## Redesign: Cartões de notas compactos
- [x] Redesenhar cartões de notas para formato quadrado compacto (só cor + título)
- [x] Conteúdo completo só visível ao clicar/abrir o cartão

## Bug: KPIs de stock inconsistentes - Total ≠ S/Fichas + C/Fichas
- [x] No detalhe do gestor: Total=61, S/Fichas=31, C/Fichas=32 (31+32=63≡61) - corrigido: KPIs usam linhas (arrays .length)
- [x] No portal loja: Total=61, C/Fichas=28, S/Fichas=33 - corrigido: KPIs usam linhas consistentes
- [x] Corrigir para que Total = S/Fichas + C/Fichas em ambos os ecrãs - todos usam comFichas.length + semFichas.length como base

## Melhoria: Histórico de stock como filtro para cards
- [x] Ao clicar numa linha do histórico, os cards de lojas mostram apenas as análises desse batch
- [x] Linha seleccionada fica destacada; por defeito selecciona o mais recente
- [x] Remover cards duplicados de múltiplos batches

## Bug: Inconsistência KPIs entre resumo e detalhe no portal loja
- [x] Resumo mostra C/Fichas=28, S/Fichas=33 (valores BD) mas detalhe mostra S/Fichas=29, C/Fichas=32 (recalculado com reclassificações)
- [x] Alinhar ambos os ecrãs para mostrar os mesmos valores (incluindo reclassificações C/Ficha de Serviço)
- [x] Backend: getAnalisesStockPorLoja e historico agora retornam totalComFichasAjustado e totalSemFichasAjustado
- [x] Frontend: ControloStock.tsx e PortalLoja.tsx usam valores ajustados em resumo, cards e barras de progresso

## Funcionalidade: Notas no Portal da Loja
- [x] Criar tabela notas_loja na BD (tema, titulo, conteudo, fixada, arquivada)
- [x] Criar funções DB: listarNotasLoja, criarNotaLoja, actualizarNotaLoja, eliminarNotaLoja
- [x] Criar endpoints tRPC: notasLoja.listar, criar, actualizar, eliminar
- [x] Adicionar card "Notas" na página inicial do portal (amarelo/âmbar)
- [x] Implementar tab de notas com grid de cards por tema (cor por tema)
- [x] Temas: Stock (cinza), Procedimentos (azul), Administrativo (roxo), RH (verde), Ausências (laranja), Reuniões (índigo), Clientes (rosa), Geral (âmbar)
- [x] Funcionalidades: criar, editar, fixar, arquivar, eliminar notas

## Melhoria: Novos status de classificação de stock
- [x] Adicionar "Não Existe" e "Outros" ao enum classificacao na BD
- [x] Actualizar backend (routers.ts) com os novos valores
- [x] Actualizar frontend (ControloStock.tsx e PortalLoja.tsx) com os novos itens no dropdown
- [x] Actualizar db.ts (classificarEurocode) com os novos tipos

## Melhoria: Texto personalizado para classificação "Outros"
- [x] Adicionar campo observacao (texto opcional) à tabela classificacoesEurocode
- [x] Actualizar backend para guardar e retornar observacao
- [x] UI: ao seleccionar "Outros", mostrar input de texto inline para escrever descrição
- [x] Exibir o texto personalizado como label da classificação no portal (em vez de "Outros")
- [x] Actualizar export Excel para usar o texto personalizado quando classificação é "Outros"

## Bug: Texto "Outros" não grava
- [x] Corrigir lógica de gravação do texto personalizado ao clicar OK ou Enter no campo "Outros" (PortalLoja.tsx e ControloStock.tsx)
- [x] Bug: classificacoesMap no ControloStock.tsx não incluía campo observacao — corrigido

## Bug: Campo texto "Outros" aparece sempre visível
- [x] Corrigir condição de visibilidade: o input só deve aparecer quando se selecciona "Outros" (modo de edição activo), não de forma permanente em itens já classificados

## Bug: Campo "Outros" sem texto não abre input para editar
- [x] Quando classificação é "outros" mas observacao está vazia, mostrar input automaticamente
- [x] Quando observacao tem texto, mostrar apenas o badge com o texto personalizado

## Bug: observacao não gravada pela loja
- [x] Backend classificarStock (portal loja) não passava campo observacao para db.classificarEurocode — corrigido

## Redesign: Notas da Loja — estilo post-it
- [x] Adicionar campo cor (hex) à tabela notas_loja
- [x] Migrar BD com novo campo cor
- [x] Redesenhar UI: grelha de quadrados post-it coloridos, só título visível
- [x] Ao clicar no quadrado, abre modal com detalhe completo
- [x] Selector de cor livre (paleta + color picker) no formulário de criação/edição
- [x] Preview do post-it em tempo real no formulário

## Bug + Melhoria: Notas — modal colorido e rich text
- [x] Modal de detalhe da nota tem agora fundo colorido (igual ao post-it)
- [x] Adicionada barra de formatação ao editor (bold, itálico, sublinhado, rasurado, lista pontos, lista numerada, remover formatação)
- [x] Conteúdo renderiza HTML no modal de detalhe (dangerouslySetInnerHTML)

## Bug: Notas — HTML em bruto nos cards e layout mobile
- [ ] Cards de notas mostram HTML em bruto (tags <b>, <div>, &nbsp;) — usar dangerouslySetInnerHTML nos cards
- [ ] Vista mobile mostra layout antigo em vez de post-its — verificar se o redesign foi aplicado correctamente

## Melhorias Controlo de Stock - Março 2026
- [x] Mostrar contagem de itens sem classificação no card global "Sem Fichas" (abaixo da percentagem)
- [x] Mostrar contagem de itens sem classificação em cada card de loja no Controlo de Stock
- [x] Campo de busca de eurocode no painel do gestor (mostra resultado por loja com status)
- [x] Campo de busca de eurocode no portal da loja (busca em todas as lojas, mostra resultado global)
- [x] Bug fix: S/ Classificação contava por unidades expandidas em vez de por linhas (como Sem Fichas), causando valores superiores
- [x] Mini barra de progresso de classificação em cada card de loja (ex: 12/16 classificados)
- [x] Botão para ordenar lojas por S/ Classificação (priorizando as com mais trabalho pendente)
- [x] Botão para exportar Excel com eurocodes sem classificação agrupados por loja
- [ ] Bug fix: Campo de busca por eurocode não funciona

## Módulo de Agendamentos
- [ ] Schema: tabela agendamentos_loja (matrícula, viatura, tipo, localidade, data, período, estado vidro, morada, tel, notas)
- [ ] Schema: tabela localidades_agendamento (nome, cor, gestorId)
- [ ] Backend: CRUD agendamentos por loja (token auth)
- [ ] Backend: Gestão de localidades pelo gestor
- [ ] Backend: Vista gestor - agendamentos de todas as lojas
- [ ] Frontend Portal Loja: aba Agendamentos com calendário semanal
- [ ] Frontend Portal Loja: lista de serviços por agendar (sem data)
- [ ] Frontend Portal Loja: modal criar/editar serviço
- [ ] Frontend Portal Loja: drag & drop entre dias/períodos
- [ ] Frontend Portal Loja: estado do vidro (NE/VE/ST)
- [ ] Frontend Gestor: vista calendário de todas as lojas
- [ ] Frontend Gestor: gestão de localidades (adicionar/remover/cor)

- [x] Adaptar análise de fichas para aceitar ficheiro bruto XLS (sem macros) em vez do XLSM
- [x] Remover rubrica "Fichas de serviço sem notas há mais de 5 dias" do frontend e backend

## Política de Comissionamento - Remover barreira 22%
- [x] Remover condição dos 22% como barreira para prémio (backend + frontend)
- [x] Manter objectivo de 30% como meta e indicadores

## Corrigir Período do Relatório Mensal (Volante + Recalibra)
- [x] Relatório mensal volantes: deve mostrar dados do mês corrente (não do mês anterior)
- [x] Verificar e corrigir o mesmo no relatório mensal recalibra

## Limpar Lojas e Gestores de Teste da BD
- [x] Identificar lojas de teste na BD (98 lojas de teste encontradas)
- [x] Identificar gestores de teste na BD (105 gestores de teste encontrados)
- [x] Remover registos de teste após confirmação (limpo em cascata em todas as tabelas)
- [ ] Guardar checkpoint

## Envio Automático RH no Dia 24
- [x] Investigar scheduler e lógica de envio RH
- [x] Implementar envio automático no dia 24 de cada mês
- [x] Testar e guardar checkpoint

## Lojas em Falta na Análise de Fichas
- [ ] Investigar porque só aparecem 62 lojas (deviam ser 71) e 11 suas lojas (deviam ser 14)
- [ ] Verificar se a limpeza de teste removeu lojas reais
- [ ] Corrigir dados em falta

## Corrigir Carregamento Ficheiro XLS com Macros
- [ ] Investigar o que mudou no processamento do ficheiro XLS (analiseFichasService)
- [ ] Corrigir para funcionar como antes (mapeamento correcto de todas as lojas)
- [ ] Testar e guardar checkpoint

## Reverter Sistema de Carregamento para Versão Anterior
- [x] Encontrar versão anterior do analiseFichasService no git (9f5e2f7)
- [x] Reverter para versão que funcionava (ficheiro com macros)
- [x] Manter exclusão de fichas sem notas >5 dias (secção removida do HTML e resumo)
- [x] Testar e guardar checkpoint

## Integrar Módulo de Férias na Plataforma
- [x] Analisar estrutura actual (menu, rotas, layout)
- [x] Criar página React de Férias com calendário, análise e distribuição
- [x] Adicionar rota /ferias no App.tsx
- [x] Adicionar entrada no menu do DashboardLayout (após RH)
- [x] Manter gestores/lojas hardcoded como no ficheiro original
- [ ] Testar e guardar checkpoint

## Corrigir Erros TypeScript no NPS
- [x] Investigar erros de TypeScript no módulo NPS
- [x] Corrigir parseDecimal no excelProcessor.ts (retornar string em vez de number)
- [x] Corrigir 14 erros em server/db.ts (null safety, .rows, MapIterator)
- [x] Corrigir 3 erros em server/aiService.ts (Set iteration)
- [x] Corrigir erros em client/src/pages/ (PortalLoja, AgendamentosGestor, NPSDashboard, etc.)
- [x] Verificar 0 erros e guardar checkpoint

## Melhorias Módulo de Férias
- [x] Schema BD para férias (uploads, dados colaboradores, dias)
- [x] Procedures tRPC (guardar, listar, histórico uploads)
- [x] Redesign: alinhar cabeçalho com tema da plataforma
- [x] Redesign: melhorar estado vazio
- [x] Redesign: selector de ano no cabeçalho
- [x] Redesign: abas com ícones consistentes
- [x] Persistir dados do Excel na BD ao carregar
- [x] Histórico de uploads (quem carregou, quando)
- [x] Filtro por tipo de ausência (aprovadas, recusadas, faltas)
- [x] Exportar para Excel
- [x] Comparação entre períodos (ano actual vs anterior)
- [x] Testes vitest (12 testes passam)
- [x] Testar e guardar checkpoint

## Melhorar Análise de Férias
- [x] Rever e melhorar o separador Análise com dados reais e insights úteis
- [x] Guardar checkpoint

## Recomendações IA de Férias + Chatbot
- [x] Criar procedimento tRPC server-side para gerar recomendações IA com base no regulamento
- [x] Implementar botão "Recomendações IA" e modal de relatório no frontend Ferias.tsx
- [x] Alimentar o Chatbot IA com o procedimento de férias
- [x] Testar e guardar checkpoint

## Filtrar Recomendações IA por Zona do Gestor
- [x] Alterar backend para filtrar colaboradores pela zona do gestor logado
- [x] Alterar frontend para passar info do gestor ao endpoint
- [x] Guardar checkpoint

## Sistema de Cores Semáforo na Análise de Férias
- [x] Implementar cores verde/amarelo/vermelho nos KPIs baseado nas regras do procedimento
- [x] Aplicar cores na tabela por gestor (taxa aprovação, dias, etc.)
- [x] Aplicar cores na tabela por loja (sobreposições, cobertura)
- [x] Aplicar cores nos alertas de cobertura e meses críticos
- [x] Aplicar cores no top mais/menos dias
- [x] Guardar checkpoint

## BUG: Scroll lateral calendário férias + Pin desaparecido
- [x] Corrigir colunas Colaborador e Loja para ficarem fixas (sticky) no scroll lateral
- [x] Restaurar botão de fixar colaboradores (pin) que desapareceu
- [x] Guardar checkpoint

## BUG: Botão pin invisível e headers grupo cortados (produção)
- [x] Tornar botão pin mais visível e garantir que aparece em produção
- [x] Corrigir headers de grupo (nome da loja) cortados ao fazer scroll
- [x] Guardar checkpoint

## BUG: Coluna Loja não fica fixa no scroll lateral
- [x] Corrigir coluna Loja para ficar sticky left:140px em todas as linhas (pinned, store groups, header)
- [x] Guardar checkpoint

## BUG: Headers de grupo das lojas cortados no scroll lateral
- [x] Corrigir store header rows (ABRANTES, AGUEDA, etc.) para ficarem sticky left no scroll
- [x] Guardar checkpoint

## Botão Fixar Todos os Volantes
- [x] Identificar como os volantes são marcados nos dados (tabela volantes na DB)
- [x] Criar endpoint getVolanteNames no router de férias
- [x] Implementar botão "Fixar Volantes" e "Limpar" no calendário de férias
- [x] Cruzar nomes da DB com dados do Excel para fixar automaticamente
- [x] Guardar checkpoint

## Tabela Distribuição Férias por Períodos
- [x] Definir 4 períodos com base no regulamento e limiares de cores
- [x] Criar tabela com Gestor, Loja, N.º, Nome e % por período
- [x] Cores semáforo (verde/amarelo/vermelho) baseadas no regulamento
- [x] Filtro por loja (sem filtro = todos, com filtro = só loja)
- [x] Integrar no separador Análise
- [x] Guardar checkpoint

## Relatório IA por Loja (Análise Férias)
- [ ] Criar serviço backend que analisa problemas nos pedidos de férias por loja
- [ ] Gerar sugestões concretas de redistribuição de dias para ficar homogéneo
- [ ] Implementar botão "Relatório Loja" no frontend com selector de loja
- [ ] Modal com relatório IA formatado (tabela de problemas + sugestões)
- [ ] Guardar checkpoint

## Relatório IA por Loja (Férias) - Análise e Sugestões de Redistribuição
- [x] Criar serviço backend feriasRelatorioLojaService.ts com análise por colaborador
- [x] Endpoint tRPC ferias.gerarRelatorioLoja (protectedProcedure)
- [x] Análise de conformidade por período (Jan-Mai, Jun-Set, Out-Nov, Dez)
- [x] Detecção de problemas: sem férias, excesso Jun-Set, falta Jan-Mai, excesso Dez
- [x] Detecção de sobreposições (>1 colaborador ausente no mesmo dia)
- [x] Sugestões IA de redistribuição via LLM
- [x] UI: Selector de loja + botão "Relatório Loja" no tab Distribuição
- [x] Modal com KPIs, tabela de análise por colaborador, sobreposições, recomendações IA
- [x] Exportação do relatório em Markdown
- [x] 10 testes vitest passados (feriasRelatorioLoja.test.ts)
- [x] Guardar checkpoint

## Exportação PDF do Relatório IA por Loja (Férias)
- [x] Criar endpoint backend para gerar PDF com PDFKit (pdfRelatorioFeriasLoja.ts)
- [x] KPIs, tabela por colaborador, sobreposições e recomendações IA no PDF
- [x] Cores, badges e formatação visual completa preservada
- [x] Rodapé com assinatura PoweringEG Platform 2.0
- [x] Botão "Exportar PDF" no modal do relatório por loja
- [x] Testar exportação e verificar fidelidade visual (6 páginas, PDF gerado com sucesso)
- [x] 5 testes vitest passados (pdfRelatorioFeriasLoja.test.ts)
- [x] Guardar checkpoint

## Reformulação Análise Férias — Foco nos Dias Pedidos e % por Período
- [x] Reformular serviço de relatório: base = dias PEDIDOS (aprovados + não aprovados), não estado de aprovação
- [x] Calcular % distribuição por período (1.º Jan-Mai, 2.º Jun-Set, 3.º Out-Nov, 4.º Dez) por colaborador
- [x] Destacar a vermelho quando % num período excede o regulamento (ex: >45% no 2.º período)
- [x] Detectar sobreposições entre colegas da mesma loja (dias comuns de férias)
- [x] Remover lógica de "subsídio em risco" e foco em aprovação — focar em distribuição e regulamento
- [x] Atualizar UI do modal com tabela de % por período e cores de gravidade (como na imagem)
- [x] Atualizar PDF para refletir nova análise com % por período
- [x] Atualizar recomendações IA para focar em redistribuição de dias pedidos
- [x] 12 testes relatório loja + 5 testes PDF passados
- [x] Guardar checkpoint

## Correção Tabela Geral Distribuição + Remover Subsídio
- [x] Tabela geral "Distribuição de Férias por Períodos": usar dias REGISTADOS (approved + rejected = todos os dias registados)
- [x] Alterar legenda de "% de férias (aprovadas) por período" para "% de férias (registadas) por período"
- [x] Remover TODAS as referências a "subsídio de férias" e "perda de subsídio" de feriasIAService.ts
- [x] Análise IA: focar em distribuição % por período e sugestões de redistribuição (sem subsídio)
- [x] feriasRelatorioLojaService.ts já usava dias registados (approved + not_approved) — confirmado
- [x] 17 testes passados (12 relatório loja + 5 PDF)
- [x] Guardar checkpoint

## Seletor Multi-Loja nas Recomendações IA de Férias
- [x] Adicionar seletor multi-loja ao botão Recomendações IA (popover com checkboxes de lojas)
- [x] Sem seleção = análise geral (comportamento actual)
- [x] Com seleção = análise focada nas lojas selecionadas
- [x] Destaque especial para férias coincidentes entre colegas quando lojas selecionadas
- [x] Modificar backend (feriasIAService) para aceitar filtro de lojas e secção de coincidências
- [x] Coincidências entre lojas diferentes quando multi-loja selecionada
- [x] Lojas ordenadas alfabeticamente, filtradas pelo gestor
- [x] 17 testes passados (12 relatório loja + 5 PDF)
- [x] Guardar checkpoint

## Gravação de Reuniões (Notas)
- [x] Analisar estrutura actual das Notas e capacidades de transcrição
- [x] Criar schema DB para gravações de reuniões (tabela gravacoesReuniao)
- [x] Criar endpoint upload de áudio para S3 (notas.uploadAudioGravacao)
- [x] Criar endpoint de transcrição Whisper (notas.transcreverGravacao)
- [x] Criar endpoint de resumo IA (notas.gerarResumoGravacao)
- [x] Implementar UI gravador de áudio com MediaRecorder API + visualização de nível
- [x] Fluxo automático: Gravar → Upload S3 → Transcrever → Gerar resumo IA
- [x] Guardar gravação, transcrição e resumo na base de dados
- [x] Integrar na secção Notas com tab Gravações + botão Gravar Reunião
- [x] Lista de gravações com player, transcrição e resumo expansíveis
- [x] 16 testes vitest passados (gravacaoReuniao.test.ts)
- [x] Guardar checkpoint

## Publicação
- [x] Forçar novo checkpoint para republicação (27/03/2026)

## Gravador: Captar Áudio do Sistema + Microfone
- [x] Usar getDisplayMedia com audio:true para captar áudio do sistema (o que se ouve)
- [x] Misturar com getUserMedia (microfone) usando AudioContext/MediaStreamDestination
- [x] Permitir fallback para só microfone se o browser não suportar áudio do sistema
- [x] Selector de modo: "Reunião Completa" (mic+sistema) vs "Só Microfone"
- [x] Instruções claras sobre partilhar áudio do ecrã
- [ ] Guardar checkpoint

## Notas Favoritas (fixas no topo)
- [x] Adicionar campo `favorita` (boolean) na tabela notas do schema DB + migração
- [x] Endpoint backend: campo favorita no endpoint actualizarNota
- [x] Estrela nos cards para marcar/desmarcar favorita (hover + click)
- [x] Favoritas fixas no topo com label dourada + estrela, depois fixadas, depois outras
- [x] Opção no dropdown menu do card para marcar/remover favorito
- [x] Guardar checkpoint

## Transcrição por Blocos Editáveis
- [x] Backend: devolver segmentos com timestamps da transcrição Whisper
- [x] Guardar segmentos editados na DB (campo transcricaoSegmentos + endpoint guardarTranscricaoEditada)
- [x] UI: transcrição por blocos com timestamp, cada bloco editável ao clicar
- [x] Etapa intermédia "Rever Transcrição" antes de gerar resumo IA
- [x] Botão "Guardar Alterações" aparece quando há edições
- [x] Resumo IA usa transcrição editada (não a original)
- [x] Lista de gravações mostra transcrição por blocos quando disponível
- [x] 33 testes passados (gravacao + relatorio loja + PDF)
- [x] Guardar checkpoint

## Sistema de Reuniões Completo
- [x] Schema DB: tabelas reunioes_livres + reuniao_tipos
- [x] Migrar schema para DB (pnpm db:push)
- [x] Backend tRPC: CRUD reuniões (criar, listar, obter, atualizar, eliminar)
- [x] Backend tRPC: CRUD tipos/tags de reunião (criar, listar, eliminar)
- [x] Página de Reuniões com listagem/histórico (filtros por tipo, estado, pesquisa)
- [x] Formulário de criação/edição de reunião (data, hora, local, presenças, temas, conclusões, observações)
- [x] Gestão de tipos/tags com cores personalizáveis
- [x] Integração com gravador de áudio (NovaGravacaoDialog)
- [x] Associar gravação existente a reunião
- [x] Visualização de transcrição e resumo IA na reunião
- [x] Menu "Reunião Livre" no sidebar (grupo Reuniões)
- [x] Rota /reunioes-livres no App.tsx
- [x] Ações: arquivar, restaurar, eliminar reuniões
- [x] Detalhe da reunião com visualização completa
- [x] 12 testes vitest passados (tipos + CRUD reuniões)
- [x] Guardar checkpoint

## Férias - Mostrar Dias Gozados / Dias Totais ao Lado das Percentagens
- [x] Analisar dados disponíveis no backend (dias gozados, dias totais por período)
- [x] Modificar frontend para mostrar "X/Y dias" ao lado de cada percentagem
- [x] Coluna Total dias adicionada com cor semáforo
- [x] Guardar checkpoint

## Férias - Corrigir Cores da Tabela de Períodos (Dias Absolutos vs Meta)
- [x] Corrigir cores para usar dias reais vs meta (não percentagem)
- [x] P1 Jan-Mai: verde se ≥5d, amarelo se 3-4d, vermelho se <3d
- [x] P2 Jun-Set: verde se ≤10d, amarelo se 11-12d, vermelho se >12d
- [x] P3 Out-Nov: livre (sem alerta)
- [x] P4 Dez: verde se ≤3d, amarelo se 4-5d, vermelho se >5d
- [x] Guardar checkpoint

## Férias - Corrigir Estilo Visual do Verde na Tabela de Períodos
- [x] Mudar bg-white para bg-green-100 text-green-700 quando cor é verde
- [x] Guardar checkpoint

## Corrigir Nome do Menu Reuniões Livres no Sidebar
- [x] Verificar e corrigir nome/tradução do menu no DashboardLayout (adicionada chave em pt.json e en.json)
- [x] Guardar checkpoint

## Gravação por Blocos para Reuniões Longas (até 1h+)
- [x] Analisar componentes existentes de gravação
- [x] Backend: 3 endpoints (uploadBlocoAudio, transcreverBlocoAudio, finalizarGravacaoBlocos)
- [x] Frontend: AudioRecorder com corte automático a cada 8 min
- [x] Frontend: NovaGravacaoDialog com processamento de blocos em background
- [x] Barra de progresso de blocos no diálogo de processamento
- [x] Removido aviso de limite 16MB (já não se aplica)
- [x] Transcrição contínua: segmentos com offset de tempo correcto
- [x] Resumo IA usa transcrição completa (todos os blocos juntos)
- [x] 6 testes vitest passados
- [x] Guardar checkpoint

## Exportação de Férias para Outlook (.ics)
- [x] Analisar schema de férias aprovadas e dados disponíveis
- [x] Backend: endpoint para gerar ficheiro .ics com férias aprovadas
- [x] Backend: geração de ficheiro .ics com blocos consecutivos separados
- [x] Frontend: nova tab "Outlook" na página de Férias
- [x] Frontend: tabela de colaboradores com filtro, seleção e pesquisa
- [x] Frontend: botão individual por colaborador para download .ics
- [x] Frontend: botão global "Exportar Todos/Selecionados" para download .ics
- [x] Eventos separados por cada bloco consecutivo de férias
- [x] Formato: "Férias - [Nome]", dia inteiro, com loja na descrição
- [x] Botão "Exportar Outlook" no header da página
- [x] 4 testes vitest passados
- [x] Guardar checkpoint

## Histórico da Loja - Gráfico de Evolução de Serviços
- [x] Analisar dados disponíveis (serviços por mês, objetivo)
- [x] Adicionar gráfico de Evolução de Serviços (barras serviços vs objetivo, verde quando atinge)
- [x] Guardar checkpoint

## Bug: Exportação .ics Férias Vazia (sem eventos)
- [x] Ficheiro .ics gerado só com cabeçalho VCALENDAR, sem VEVENT
- [x] Causa: formato chave era "mês-dia" (ex: "3-10") mas código esperava dia-do-ano (número)
- [x] Causa: valor era "approved" (inglês) mas código comparava com "aprovado" (português)
- [x] Corrigido: parsing de chaves mês-dia para Date, aceita 'approved' e 'aprovado'
- [x] Blocos consecutivos agora calculados por diferença de datas reais
- [x] Guardar checkpoint

## Exportação .ics - Adicionar Nome da Loja
- [x] Incluir nome da loja no título do evento (ex: "Férias - Tiago Costa (Barcelos)")
- [x] Guardar checkpoint

## Exportação .ics - Melhorias nomes e cores
- [x] Usar apenas primeiro e último nome nos eventos (ex: "Vania Oliveira" em vez de "Vania Sofia Oliveira")
- [x] Adicionar cores/categorias diferentes por loja nos eventos do Outlook
- [x] Guardar checkpoint

## Fixar Volantes no Calendário de Férias
- [x] Analisar botão "fixar volantes" existente e vista do calendário
- [x] Criar tabela/campo na BD para guardar quais colaboradores são volantes (por gestor/upload)
- [x] Criar endpoints backend para listar e atualizar volantes
- [x] Implementar diálogo de seleção: ao clicar "fixar volantes", abrir lista de colaboradores do gestor
- [x] Destacar volantes visualmente no calendário de férias (cor/ícone diferente)
- [x] Destacar volantes na exportação Excel
- [x] Guardar checkpoint

## Remover Objetivo Mínimo de Escovas 7.5% (Nova Política 2026)
- [x] Identificar todos os ficheiros com regra de escovas 7.5% (routers, chatbot, PDF)
- [x] Remover alertas de escovas abaixo de 7.5% nos dashboards de resultados (gestor + portal loja)
- [x] Atualizar chatbot: remover referência a taxa mínima de escovas 7.5%
- [x] Atualizar PDF de resultados: remover marcador de 7.5% na barra de escovas
- [x] Atualizar textos/legendas para refletir nova política (comissão a partir da 1.ª escova)
- [x] Guardar checkpoint

## Chatbot: Acesso a Dados de Férias
- [x] Analisar como o contexto do chatbot é construído (chatbotService.ts)
- [x] Identificar dados de férias disponíveis na BD (ferias_colaboradores, ferias_uploads)
- [x] Adicionar dados de férias ao contexto do chatbot (aprovadas, por aprovar, por colaborador/loja)
- [x] Atualizar prompt do chatbot para saber interpretar dados de férias
- [x] Adicionar dados de férias ao chatbot do Portal da Loja (chatbotServicePortais.ts)
- [x] Guardar checkpoint

## Corrigir Formato Dados Férias no Chatbot
- [x] Corrigir extração de períodos: chaves são 'mes-dia' (ex: '5-7'), valores são 'approved'/'rejected' (não 'aprovado'/'nao_aprovado')
- [x] Atualizar chatbotService.ts (contexto pessoal + contexto nacional)
- [x] Atualizar chatbotServicePortais.ts (portal da loja)
- [x] Guardar checkpoint

## Histórico de Conversas do Chatbot
- [x] Criar tabelas na BD para sessões e mensagens do chatbot
- [x] Criar endpoints backend para guardar mensagens e listar sessões/conversas
- [x] Implementar UI: lista de conversas anteriores, carregar histórico, nova conversa
- [ ] Aplicar ao chatbot do portal da loja (futuro)
- [x] Guardar checkpoint

## BUG: Portal da Loja crash - "An unexpected error occurred"
- [ ] Diagnosticar causa do erro no Portal da Loja
- [ ] Corrigir o erro
- [ ] Guardar checkpoint

## BUG: Favoritos nas Notas não funcionam
- [x] Adicionar estrela visível em cada card de nota para marcar/desmarcar favorito
- [x] Favoritos devem aparecer no topo, separados das restantes notas
- [x] Destaque visual claro para notas favoritas (borda dourada + estrela preenchida)
- [x] Guardar checkpoint

## BUG: Estrela de favoritos não persiste ao clicar
- [x] Diagnosticar: função actualizarNota no db.ts não tinha o campo 'favorita'
- [x] Corrigir o bug - adicionado campo favorita ao db.ts
- [x] Guardar checkpoint

## BUG: Alerta escovas 7.5% ainda aparece no dashboard
- [x] Encontrar alerta remanescente - estava no ResultadosDashboard.tsx e PortalLoja.tsx (frontend)
- [x] Remover referências a 0.075 no frontend: cores de barra, badges, texto de objetivo
- [x] Atualizar para: verde >=10%, âmbar >0%, cinza =0%
- [x] Guardar checkpoint

## Ordenação Tabela NPS - Elegíveis por resultado
- [x] Ordenar elegíveis por NPS Mês descendente (desempate por NPS Anual, depois Taxa Resposta)
- [x] Não elegíveis ficam no fundo
- [x] Adicionada coluna NPS Anual à tabela
- [x] Guardar checkpoint

## Corrigir desempate NPS Anual na tabela
- [x] Quando NPS Mês é igual, ordenar por NPS Anual desc (ex: Viana 100% antes de Barcelos 92.6%)
- [x] Reforçada lógica com Math.round para evitar problemas de precisão float
- [x] NPS Anual null tratado como -1 (lojas sem dados ficam abaixo)
- [x] 8 testes unitários passados
- [x] Guardar checkpoint

## Filtro Multi-Select de Lojas na Página de Férias
- [x] Modificar filtro de lojas para permitir selecção múltipla (Popover com checkboxes)
- [x] Mostrar férias de todas as lojas seleccionadas em simultâneo
- [x] Manter compatibilidade com filtro de gestor existente (reset ao mudar gestor)
- [x] Botões "Limpar" e "Todas" para facilitar selecção
- [x] Sem erros TypeScript
- [ ] Guardar checkpoint

## Bug: Filtro "Último mês" no Dashboard NPS mostra 0% e tabela vazia
- [ ] Investigar porque o filtro "Último mês" não mostra dados NPS
- [ ] Corrigir a lógica de filtragem
- [ ] Guardar checkpoint

## Bug: Ordenação NPS Ranking - Barcelos acima de Viana (NPS Anual inferior)
- [x] Investigar porque Barcelos (92.6% anual) aparece acima de Viana (100% anual) quando NPS Mês é igual
- [x] Causa: NPSDashboard.tsx não tinha desempate por NPS Anual (só o ResultadosDashboard tinha)
- [x] Corrigido ambos os sorts no NPSDashboard.tsx (rankingLojas + sortedRanking)
- [x] 8 testes unitários passados
- [ ] Guardar checkpoint

## Bug: Dashboard Resultados - Tabela ranking cortada no mobile
- [x] Tabela de ranking não cabe no ecrã mobile - reduzidos min-widths e paddings
- [x] Nomes de zona: escondidos como coluna separada no mobile, mostrados abaixo do nome da loja
- [x] Coluna Serviços escondida no mobile (hidden sm:block)
- [x] Coluna Motivo escondida no mobile (hidden sm:table-cell)
- [x] Badges de prémio reduzidos no mobile (✓ / ✗)
- [x] Tabela NPS Ranking também corrigida para mobile
- [x] Tabela principal de ranking também corrigida com truncate nos nomes
- [ ] Guardar checkpoint

## Adicionar campo Telegram Chat ID ao formulário de edição de volantes
- [x] Adicionar campo Telegram Chat ID ao diálogo de editar volante
- [x] Adicionar telegramChatId ao router atualizar no backend
- [x] Sem erros TypeScript
- [ ] Guardar checkpoint

## Bug: Calendário não actualiza dinamicamente quando volante confirma/cancela agendamento
- [x] Investigar como o calendário obtém dados de agendamentos (estadoCompletoMes query)
- [x] Substituir refetch() por utils.invalidate() em todas as 10 mutations do portal do volante
- [x] Adicionado await para garantir que invalidação completa antes de limpar estados
- [x] Sem erros TypeScript
- [ ] Guardar checkpoint

## Bug: Classificar colaborador como volante remove gestorId (desaparece da vista do gestor)
- [x] Restaurar gestorId do Diogo Ferreira na BD (gestorId = 30001)
- [x] Causa: Drizzle inclui campos undefined no SET como NULL
- [x] Corrigido backend: limpar campos undefined antes de enviar ao Drizzle
- [x] Preservar gestorId ao mudar tipo para volante/recalbra
- [ ] Guardar checkpoint

## Destacar badge Volante com cor distinta na tabela RH
- [x] Badge Volante agora é azul (bg-blue-600) na tabela principal e na preview
- [x] Recalbra mantém-se laranja (bg-orange-500)
- [ ] Guardar checkpoint

## Bug: Chatbot IA não responde a perguntas sobre comissionamento (pede dados em vez de calcular)
- [x] Investigar código do chatbot e system prompt sobre comissionamento
- [x] Verificar que dados de comissionamento existem na BD (serviços, colaboradores, vendas, NPS)
- [x] Corrigir chatbot: adicionar numColaboradores e FTE aos dados pessoais do gestor
- [x] Corrigir chatbot: adicionar numColaboradores e FTE aos dados nacionais
- [x] Corrigir chatbot: adicionar vendas complementares pessoais com comissões pré-calculadas
- [x] Corrigir chatbot: adicionar instruções fortes para cálculo proactivo (NUNCA pedir dados)
- [x] Corrigir chatbot portal loja: mesma instrução de cálculo proactivo
- [x] Mostrar TODOS os meses (não só o último) nos dados pessoais para cálculos trimestrais
- [x] 6 testes unitários passados
- [ ] Testar com pergunta "Qual o valor de comissionamento do primeiro trimestre?"

## Alteração regra NPS: de E para OU (basta um critério)
- [x] Alterar chatbotService.ts - system prompt (regras de comissionamento)
- [x] Alterar chatbotService.ts - formatação NPS pessoal (elegibilidade)
- [x] Alterar chatbotService.ts - formatação NPS nacional (elegibilidade)
- [x] Alterar chatbotService.ts - instruções gerais (ponto 15)
- [x] Alterar chatbotServicePortais.ts - system prompt portal loja
- [x] Alterar chatbotServicePortais.ts - ranking NPS nacional
- [x] Alterar aiService.ts - relatório IA admin (2 ocorrências)
- [x] Alterar aiService.ts - relatório IA gestor
- [x] Alterar routers.ts - cálculo elegibilidade portal gestor (2 ocorrências)
- [x] Alterar ExportarRelatorioIAPDF.tsx - texto PDF
- [x] 13 testes unitários passados

## Corrigir regra NPS no frontend portal da loja (dashboard resultados)
- [x] Alterar texto descritivo de "e" para "ou" no CardDescription NPS (PortalLoja.tsx)
- [x] Alterar cálculo elegibilidade mensal na tabela (PortalLoja.tsx: && para ||)
- [x] Alterar ResultadosDashboard.tsx - cálculo elegibilidade inline (2 ocorrências)
- [x] Alterar ResultadosDashboard.tsx - ranking NPS motivo inelegibilidade
- [x] Alterar ResultadosDashboard.tsx - texto regras e legenda
- [x] Corrigir 2 ocorrências restantes no aiService.ts (ranking NPS admin e gestor)
- [x] Alterar ExportarRelatorioIAPDF.tsx - texto critérios
- [x] 19 testes unitários passados
- [x] Zero ocorrências de regra NPS E (&&) restantes no projecto

## Bug: Ranking NPS no dashboard admin só mostra 10 lojas
- [x] Identificado: rankingLimit hardcoded a 10 no ResultadosDashboard.tsx
- [x] Corrigido: Nacional/Todas/Zona agora mostra até 200 lojas (todas)

## Feature: Pesquisa por Eurocode (análise stock + portal loja)
- [x] Investigar estrutura de dados (tabela eurocodes_fichas: 61835 registos, 90+ lojas)
- [x] Criar função pesquisarEurocodePorPrefixo no db.ts (LIKE prefixo%, última análise por loja)
- [x] Criar endpoints pesquisarEurocodePrefixo (gestor) e pesquisarEurocodePrefixoPortal (público) no routers.ts
- [x] Criar componente UI no portal da loja: input grande com debounce 300ms, resultados em tempo real
- [x] Mostra: Eurocode, FS (obrano), Matrícula, Status (com cores por tipo), Marca/Modelo, Dias aberto
- [x] Integrar no portal da loja (secção Análise de Stock, antes da pesquisa global)
- [ ] Integrar na análise de stock do gestor/admin
- [x] 9 testes unitários passados

## Bug: Agendamento volante com desfasamento de 1 dia (pedidos aparecem um dia antes)
- [x] Causa raiz: toISOString().split('T')[0] converte para UTC, recuando 1 dia em Portugal (UTC+1/+2)
- [x] Corrigido AgendamentosLoja.tsx formatDate() - hora local
- [x] Corrigido AgendamentosGestor.tsx formatDate() - hora local
- [x] Corrigido db.ts: agrupamento pedidos/bloqueios/agendamentos volante por dia (4 ocorrências)
- [x] Corrigido db.ts: cálculo primeiro/último dia do mês (3 ocorrências)
- [x] Corrigido routers.ts: feriados (Carnaval, Sexta-Santa, Corpo de Deus)
- [x] Corrigido routers.ts: cálculo dias úteis, datas visitas ICS, agrupamento análises
- [x] 8 testes unitários passados

## Bug: Desfasamento 1 dia no calendário MENSAL do volante (agendamentos no domingo em vez de segunda)
- [x] Corrigido formatDate() no PortalLoja.tsx (função global)
- [x] Corrigido 13 ocorrências de toISOString no PortalLoja.tsx (getCorDia, diaDisponivel, diaSelecionado, editarData, etc.)
- [x] Corrigido ExportarRelatorioIAPDF.tsx (nome ficheiro PDF)
- [x] Corrigido HistoricoRelatoriosIA.tsx (nome ficheiro PDF)
- [x] Corrigido DashboardVolante.tsx (período datas)
- [x] Corrigido relatorioMensalRecalibra.ts (último dia do mês)
- [x] Corrigido routers.ts (6 ocorrências: nomes ficheiros PDF/ICS/CSV)
- [x] Zero ocorrências de toISOString.split('T')[0] restantes no código (apenas em ficheiros .test.ts)
- [x] 36 testes unitários passados

## Bug PERSISTENTE: Desfasamento 1 dia no calendário mensal do volante (ainda acontece após fix frontend)
- [x] Causa raiz: new Date("2026-04-20") = meia-noite UTC = 23:00 dia anterior em Portugal
- [x] Corrigido routers.ts: criar pedido apoio (T12:00:00)
- [x] Corrigido routers.ts: criar agendamento volante (T12:00:00)
- [x] Corrigido routers.ts: actualizar agendamento (T12:00:00)
- [x] Corrigido routers.ts: criar bloqueio (T12:00:00)
- [x] Corrigido db.ts: editar pedido apoio (T12:00:00)
- [x] Corrigidos 30 pedidos_apoio existentes na BD (23:00 -> 12:00)
- [x] Corrigidos 25 agendamentos_volante existentes na BD (00:00 -> 12:00)
- [x] Corrigidos 3 bloqueios_volante existentes na BD (00:00 -> 12:00)
- [x] Zero erros TypeScript, servidor a funcionar

## Feature: Pesquisa por Matrícula na Análise de Stock (portal loja)
- [x] Criar função pesquisarMatriculaPorPrefixo no db.ts (LIKE prefixo%, normaliza hífens/espaços)
- [x] Criar endpoints no routers.ts (gestor + portal)
- [x] Criar componente UI no portal da loja abaixo da pesquisa por Eurocode (caixa amber)
- [x] Mostrar: Matrícula, FS (obrano), Eurocode, Status (com cores), Marca/Modelo, Dias aberto
- [x] 5 testes unitários passados

## Fix: Layout pesquisa Eurocode/Matrícula + remover dias aberto
- [x] Corrigir layout: input à esquerda (1/3), resultados à direita (2/3) - layout horizontal
- [x] Remover indicador "2d" (dias aberto) dos resultados
- [x] Aplicar a ambas as pesquisas (Eurocode e Matrícula)
- [x] Resultados compactos numa linha (Eurocode/Mat + Status + FS + Mat/Eurocode + Marca)

## Fix: Input matrícula com formato visual XX-XX-XX
- [x] Reformatar input para parecer matrícula portuguesa (3 caixas de 2 chars com traços entre elas)
- [x] Cursor salta automaticamente para a caixa seguinte ao preencher 2 caracteres
- [x] Pesquisa activa a partir do 2º caractere (sem contar traços)
- [x] Botão limpar (✕) para reset rápido

## Fix: Simplificar input matrícula - campo único com auto-formatação de traços
- [x] Remover as 3 caixas separadas, usar um único input limpo (como o do Eurocode)
- [x] Auto-formatar com traços à medida que se escreve (37 → 37-, 37PJ → 37-PJ-, 37PJ00 → 37-PJ-00)
- [x] Manter resultados à direita em layout horizontal
- [x] Bug: Página do Portal da Loja não começa no topo — arranca a meio ao entrar
- [x] Bug: Erro "Invalid time value" ao abrir formulário Pedir Apoio no calendário do volante
