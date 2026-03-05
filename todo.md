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
