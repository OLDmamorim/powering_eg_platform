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
