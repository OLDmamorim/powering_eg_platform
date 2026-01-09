import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  CheckCircle2,
  Lightbulb,
  TrendingDown,
  TrendingUp,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  LineChart,
  Loader2,
  Target,
  Star,
  AlertTriangle,
  Activity,
  Trophy,
  Medal,
  ArrowUpRight,
  ArrowDownRight,
  Store,
} from "lucide-react";
import { useState, useRef } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { ExportarRelatorioIAPDF } from "@/components/ExportarRelatorioIAPDF";
import FiltroMesesCheckbox, { type MesSelecionado, gerarLabelMeses } from "@/components/FiltroMesesCheckbox";

// Registar componentes do Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
import { toast } from "sonner";

export default function RelatoriosIA() {
  // Novo estado para múltiplos meses - por defeito o mês atual
  const [mesesSelecionados, setMesesSelecionados] = useState<MesSelecionado[]>(() => {
    const hoje = new Date();
    return [{ mes: hoje.getMonth() + 1, ano: hoje.getFullYear() }];
  });
  const relatorioRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [analise, setAnalise] = useState<any>(null);

  // Nova query para múltiplos meses
  const gerarMultiplosMesesQuery = trpc.relatoriosIA.gerarMultiplosMeses.useQuery(
    { mesesSelecionados },
    { enabled: false }
  );

  const handleGerar = async () => {
    if (mesesSelecionados.length === 0) {
      toast.error("Por favor selecione pelo menos um mês");
      return;
    }
    setIsGenerating(true);
    toast.info("A gerar relatório com IA...");
    try {
      const result = await gerarMultiplosMesesQuery.refetch();
      if (result.data) {
        console.log('[RelatoriosIA Frontend] Dados recebidos:', result.data);
        console.log('[RelatoriosIA Frontend] tipoRelatorio:', (result.data as any).tipoRelatorio);
        setAnalise(result.data);
        toast.success("Relatório gerado com sucesso!");
      }
    } catch (error) {
      toast.error("Erro ao gerar relatório");
    } finally {
      setIsGenerating(false);
    }
  };
  
  const isLoading = isGenerating || gerarMultiplosMesesQuery.isFetching;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Relatórios com IA
          </h1>
          <p className="text-muted-foreground">
            Análise automática de supervisões com inteligência artificial
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuração do Relatório</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-2 max-w-xs">
                <label className="text-sm font-medium">Período (selecione meses)</label>
                <FiltroMesesCheckbox
                  mesesSelecionados={mesesSelecionados}
                  onMesesChange={setMesesSelecionados}
                  placeholder="Selecionar meses"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleGerar} disabled={isLoading || mesesSelecionados.length === 0}>
                  {isLoading ? "A gerar..." : "Gerar Relatório"}
                </Button>
                {analise && (
                  <ExportarRelatorioIAPDF analiseIA={analise} periodo={gerarLabelMeses(mesesSelecionados)} />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">
                A analisar relatórios com IA...
              </p>
            </div>
          </div>
        )}

        {analise && !isLoading && (
          <div className="space-y-4" ref={relatorioRef}>
            {/* Indicador de tipo de relatório */}
            {analise.tipoRelatorio === 'gestor' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  Relatório personalizado para as suas lojas
                </p>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Resumo Geral
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{analise.resumo || analise.resumoGeral || 'Sem resumo disponível'}</p>
              </CardContent>
            </Card>

            {/* Secções específicas para gestores */}
            {analise.tipoRelatorio === 'gestor' && (
              <>
                {/* Estatísticas de Relatórios */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Store className="h-4 w-4 text-primary" />
                        Lojas Visitadas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{analise.relatorios?.lojasVisitadas?.length || 0}</p>
                      <p className="text-xs text-muted-foreground">lojas no período</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-blue-500" />
                        Relatórios Livres
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{analise.relatorios?.totalLivres || 0}</p>
                      <p className="text-xs text-muted-foreground">relatórios criados</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Target className="h-4 w-4 text-green-500" />
                        Relatórios Completos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{analise.relatorios?.totalCompletos || 0}</p>
                      <p className="text-xs text-muted-foreground">relatórios completos</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Resumo de Conteúdo */}
                {analise.relatorios?.resumoConteudo && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Resumo das Atividades
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{analise.relatorios.resumoConteudo}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Pendentes */}
                {analise.pendentes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        Pendentes ({analise.pendentes.ativos} ativos)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {analise.pendentes.analise && (
                        <p className="text-muted-foreground">{analise.pendentes.analise}</p>
                      )}
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <h4 className="font-medium text-sm mb-2">Criados no Período</h4>
                          <ul className="space-y-1">
                            {analise.pendentes.criados?.length > 0 ? (
                              analise.pendentes.criados.map((p: any, i: number) => (
                                <li key={i} className="text-sm text-muted-foreground">
                                  <span className="font-medium">{p.loja}:</span> {p.descricao}
                                </li>
                              ))
                            ) : (
                              <li className="text-sm text-muted-foreground">Nenhum pendente criado</li>
                            )}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm mb-2">Resolvidos no Período</h4>
                          <ul className="space-y-1">
                            {analise.pendentes.resolvidos?.length > 0 ? (
                              analise.pendentes.resolvidos.map((p: any, i: number) => (
                                <li key={i} className="text-sm text-muted-foreground">
                                  <span className="font-medium">{p.loja}:</span> {p.descricao}
                                </li>
                              ))
                            ) : (
                              <li className="text-sm text-muted-foreground">Nenhum pendente resolvido</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Sugestões para o Gestor */}
                {analise.sugestoesGestor && analise.sugestoesGestor.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-yellow-500" />
                        Sugestões para Si
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analise.sugestoesGestor.map((sugestao: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                            <span className="text-muted-foreground">{sugestao}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Mensagem Motivacional */}
                {analise.mensagemMotivacional && (
                  <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <Trophy className="h-6 w-6 text-yellow-500 shrink-0" />
                        <p className="text-muted-foreground italic">{analise.mensagemMotivacional}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Lista de Lojas Visitadas */}
                {analise.relatorios?.lojasVisitadas && analise.relatorios.lojasVisitadas.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Store className="h-5 w-5 text-primary" />
                        Lojas Visitadas no Período
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {analise.relatorios.lojasVisitadas.map((loja: string, index: number) => (
                          <span key={index} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                            {loja}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Secções de Admin (esconder para gestores) */}
            {analise.tipoRelatorio !== 'gestor' && (
              <>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Loja Mais Visitada
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analise.lojaMaisVisitada ? (
                    <div>
                      <p className="text-2xl font-bold">
                        {analise.lojaMaisVisitada.nome}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {analise.lojaMaisVisitada.visitas} visitas
                      </p>
                    </div>
                  ) : analise.relatorios?.lojasVisitadas?.length > 0 ? (
                    <div>
                      <p className="text-2xl font-bold">
                        {analise.relatorios.lojasVisitadas[0]}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {analise.relatorios.lojasVisitadas.length} lojas visitadas no total
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      Sem dados suficientes
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-orange-500" />
                    Loja Menos Visitada
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analise.lojaMenosVisitada ? (
                    <div>
                      <p className="text-2xl font-bold">
                        {analise.lojaMenosVisitada.nome}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {analise.lojaMenosVisitada.visitas} visitas
                      </p>
                    </div>
                  ) : analise.relatorios?.totalLivres !== undefined ? (
                    <div>
                      <p className="text-2xl font-bold">
                        {analise.relatorios.totalLivres + analise.relatorios.totalCompletos}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Relatórios ({analise.relatorios.totalLivres} livres, {analise.relatorios.totalCompletos} completos)
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      Sem dados suficientes
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Pontos Positivos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(() => {
                    // Suportar ambos os formatos: admin (pontosPositivos) e gestor (pontosDestacados.positivos)
                    const pontos = analise.pontosPositivos || analise.pontosDestacados?.positivos;
                    if (pontos && Array.isArray(pontos) && pontos.length > 0) {
                      return pontos.map((ponto: any, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                          <span>{typeof ponto === 'string' ? ponto : `${ponto.loja}: ${ponto.descricao}`}</span>
                        </li>
                      ));
                    }
                    return <li className="text-muted-foreground">Sem pontos positivos identificados.</li>;
                  })()}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  Pontos Negativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(() => {
                    // Suportar ambos os formatos: admin (pontosNegativos) e gestor (pontosDestacados.negativos)
                    const pontos = analise.pontosNegativos || analise.pontosDestacados?.negativos;
                    if (pontos && Array.isArray(pontos) && pontos.length > 0) {
                      return pontos.map((ponto: any, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                          <span>{typeof ponto === 'string' ? ponto : `${ponto.loja}: ${ponto.descricao}`}</span>
                        </li>
                      ));
                    }
                    return <li className="text-muted-foreground">Sem pontos negativos identificados.</li>;
                  })()}
                </ul>
              </CardContent>
            </Card>

            {/* Nova secção: Análise dos Pontos Destacados pelos Gestores */}
            <Card className="border-2 border-primary/20">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-primary" />
                  Análise dos Pontos Destacados pelos Gestores
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-6">
                {/* Tendências */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <LineChart className="h-4 w-4" />
                    Tendências Observadas
                  </h4>
                  <p className="text-muted-foreground">
                    {analise.analisePontosDestacados?.tendencias || analise.pontosDestacados?.analise || "Sem dados suficientes para identificar tendências."}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Análise Pontos Positivos */}
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2 text-green-600">
                      <ThumbsUp className="h-4 w-4" />
                      Pontos Positivos Destacados
                    </h4>
                    <ul className="space-y-2">
                      {(() => {
                        const pontos = analise.analisePontosDestacados?.positivos || analise.pontosDestacados?.positivos;
                        if (pontos && pontos.length > 0) {
                          return pontos.map((ponto: any, index: number) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <ThumbsUp className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                              <span>{typeof ponto === 'string' ? ponto : `${ponto.loja}: ${ponto.descricao}`}</span>
                            </li>
                          ));
                        }
                        return <li className="text-sm text-muted-foreground">Nenhum ponto positivo destacado neste período.</li>;
                      })()}
                    </ul>
                  </div>

                  {/* Análise Pontos Negativos */}
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2 text-red-600">
                      <ThumbsDown className="h-4 w-4" />
                      Pontos Negativos Destacados
                    </h4>
                    <ul className="space-y-2">
                      {(() => {
                        const pontos = analise.analisePontosDestacados?.negativos || analise.pontosDestacados?.negativos;
                        if (pontos && pontos.length > 0) {
                          return pontos.map((ponto: any, index: number) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <ThumbsDown className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                              <span>{typeof ponto === 'string' ? ponto : `${ponto.loja}: ${ponto.descricao}`}</span>
                            </li>
                          ));
                        }
                        return <li className="text-sm text-muted-foreground">Nenhum ponto negativo destacado neste período.</li>;
                      })()}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Nova secção: Análise de Resultados (Performance) */}
            {analise.analiseResultados && (
              <Card className="border-2 border-orange-200 dark:border-orange-800">
                <CardHeader className="bg-orange-50 dark:bg-orange-900/20">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-orange-500" />
                    Análise de Performance (Resultados)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-6">
                  {/* Resumo de Performance */}
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Resumo de Performance
                    </h4>
                    <p className="text-muted-foreground">
                      {analise.analiseResultados.resumoPerformance || "Sem dados de performance disponíveis."}
                    </p>
                  </div>

                  {/* Tendências de Serviços */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <LineChart className="h-4 w-4" />
                      Tendências de Serviços
                    </h4>
                    <p className="text-muted-foreground">
                      {analise.analiseResultados.tendenciasServicos || "Sem dados suficientes para identificar tendências."}
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Lojas em Destaque */}
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2 text-green-600">
                        <Star className="h-4 w-4" />
                        Lojas em Destaque
                      </h4>
                      <ul className="space-y-2">
                        {analise.analiseResultados.lojasDestaque?.length > 0 ? (
                          (analise.analiseResultados.lojasDestaque as string[]).map((loja: string, index: number) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <Star className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                              <span>{loja}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-sm text-muted-foreground">
                            Sem dados de lojas em destaque.
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Lojas que Precisam Atenção */}
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                        Lojas que Precisam Atenção
                      </h4>
                      <ul className="space-y-2">
                        {analise.analiseResultados.lojasAtencao?.length > 0 ? (
                          (analise.analiseResultados.lojasAtencao as string[]).map((loja: string, index: number) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                              <span>{loja}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-sm text-muted-foreground">
                            Nenhuma loja requer atenção especial.
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Recomendações baseadas em Performance */}
                  {analise.analiseResultados.recomendacoes?.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2 text-primary">
                        <Target className="h-4 w-4" />
                        Recomendações de Performance
                      </h4>
                      <ul className="space-y-2">
                        {(analise.analiseResultados.recomendacoes as string[]).map((rec: string, index: number) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Nova secção: Comparação de Lojas com Gráficos */}
            {analise.comparacaoLojas && (
              <Card className="border-2 border-purple-200 dark:border-purple-800">
                <CardHeader className="bg-purple-50 dark:bg-purple-900/20">
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-purple-500" />
                    Comparação de Lojas - Resultados do Período
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-6">
                  {/* Cards de Destaques */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* Melhor Loja */}
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-green-700 dark:text-green-400">Melhor Loja</span>
                      </div>
                      <p className="text-lg font-bold">{analise.comparacaoLojas.melhorLoja?.nome || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">
                        {analise.comparacaoLojas.melhorLoja?.servicos || 0} serviços
                        <span className={`ml-2 ${(analise.comparacaoLojas.melhorLoja?.desvio || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ({(analise.comparacaoLojas.melhorLoja?.desvio || 0) >= 0 ? '+' : ''}{(analise.comparacaoLojas.melhorLoja?.desvio || 0).toFixed(1)}%)
                        </span>
                      </p>
                    </div>

                    {/* Pior Loja */}
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Store className="h-5 w-5 text-red-600" />
                        <span className="font-semibold text-red-700 dark:text-red-400">Loja com Menos Serviços</span>
                      </div>
                      <p className="text-lg font-bold">{analise.comparacaoLojas.piorLoja?.nome || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">
                        {analise.comparacaoLojas.piorLoja?.servicos || 0} serviços
                        <span className={`ml-2 ${(analise.comparacaoLojas.piorLoja?.desvio || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ({(analise.comparacaoLojas.piorLoja?.desvio || 0) >= 0 ? '+' : ''}{(analise.comparacaoLojas.piorLoja?.desvio || 0).toFixed(1)}%)
                        </span>
                      </p>
                    </div>

                    {/* Maior Evolução */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowUpRight className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-blue-700 dark:text-blue-400">Maior Evolução</span>
                      </div>
                      <p className="text-lg font-bold">{analise.comparacaoLojas.maiorEvolucao?.nome || 'N/A'}</p>
                      <p className="text-sm text-green-600">
                        {analise.comparacaoLojas.maiorEvolucao?.variacao ? `+${analise.comparacaoLojas.maiorEvolucao.variacao.toFixed(1)}%` : 'N/A'} vs mês anterior
                      </p>
                    </div>

                    {/* Menor Evolução */}
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowDownRight className="h-5 w-5 text-amber-600" />
                        <span className="font-semibold text-amber-700 dark:text-amber-400">Menor Evolução</span>
                      </div>
                      <p className="text-lg font-bold">{analise.comparacaoLojas.menorEvolucao?.nome || 'N/A'}</p>
                      <p className="text-sm text-red-600">
                        {analise.comparacaoLojas.menorEvolucao?.variacao ? `${analise.comparacaoLojas.menorEvolucao.variacao.toFixed(1)}%` : 'N/A'} vs mês anterior
                      </p>
                    </div>
                  </div>

                  {/* Resumo Estatístico */}
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{analise.comparacaoLojas.totalLojas}</p>
                        <p className="text-sm text-muted-foreground">Lojas Analisadas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{analise.comparacaoLojas.lojasAcimaMedia}</p>
                        <p className="text-sm text-muted-foreground">Acima do Objetivo</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">{analise.comparacaoLojas.totalLojas - analise.comparacaoLojas.lojasAcimaMedia}</p>
                        <p className="text-sm text-muted-foreground">Abaixo do Objetivo</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {analise.comparacaoLojas.totalLojas > 0 ? ((analise.comparacaoLojas.lojasAcimaMedia / analise.comparacaoLojas.totalLojas) * 100).toFixed(0) : 0}%
                        </p>
                        <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                      </div>
                    </div>
                  </div>

                  {/* Gráfico de Ranking */}
                  {analise.dadosGraficos?.rankingServicos && analise.dadosGraficos.rankingServicos.length > 0 && (
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Top 10 Lojas por Serviços
                      </h4>
                      <div style={{ height: '300px' }}>
                        <Bar
                          data={{
                            labels: analise.dadosGraficos.rankingServicos.map((l: any) => l.loja.length > 15 ? l.loja.substring(0, 15) + '...' : l.loja),
                            datasets: [{
                              label: 'Serviços',
                              data: analise.dadosGraficos.rankingServicos.map((l: any) => l.servicos),
                              backgroundColor: analise.dadosGraficos.rankingServicos.map((l: any) => 
                                l.desvio >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'
                              ),
                              borderColor: analise.dadosGraficos.rankingServicos.map((l: any) => 
                                l.desvio >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
                              ),
                              borderWidth: 1,
                            }]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { display: false },
                              tooltip: {
                                callbacks: {
                                  afterLabel: (context) => {
                                    const idx = context.dataIndex;
                                    const desvio = analise.dadosGraficos?.rankingServicos[idx]?.desvio || 0;
                                    return `Desvio: ${desvio >= 0 ? '+' : ''}${desvio.toFixed(1)}%`;
                                  }
                                }
                              }
                            },
                            scales: {
                              y: { beginAtZero: true, title: { display: true, text: 'Serviços' } },
                              x: { ticks: { maxRotation: 45, minRotation: 45 } }
                            }
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Verde = Acima do objetivo | Vermelho = Abaixo do objetivo
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Sugestões de Melhoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(analise.sugestoes && Array.isArray(analise.sugestoes) && analise.sugestoes.length > 0) ? (
                    analise.sugestoes.map((sugestao: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
                        <span>{sugestao}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">Sem sugestões disponíveis.</li>
                  )}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Frequência de Visitas por Loja</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analise.frequenciaVisitas && Object.keys(analise.frequenciaVisitas).length > 0 ? (
                    Object.entries(analise.frequenciaVisitas as Record<string, number>)
                    .sort((a, b) => (b[1] as number) - (a[1] as number))
                    .map(([loja, visitas]) => {
                      const numVisitas = visitas as number;
                      const maxVisitas = Math.max(...Object.values(analise.frequenciaVisitas as Record<string, number>));
                      return (
                        <div key={loja} className="flex items-center justify-between">
                          <span className="font-medium">{loja}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{
                                  width: `${(numVisitas / maxVisitas) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground w-12 text-right">
                              {numVisitas}x
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-muted-foreground">Sem dados de frequência de visitas.</p>
                  )}
                </div>
              </CardContent>
            </Card>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
