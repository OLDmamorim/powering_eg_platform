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
