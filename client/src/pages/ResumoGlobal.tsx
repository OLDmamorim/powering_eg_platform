import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Loader2, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";
import { useMemo } from "react";

export default function ResumoGlobal() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  if (user?.role !== "gestor") {
    setLocation("/dashboard");
    return null;
  }

  const { data: resumo, isLoading } = trpc.resumoGlobal.gerar.useQuery();

  // Processar dados para gráficos
  const dadosGraficos = useMemo(() => {
    if (!resumo) return null;

    return {
      visitasPorMes: resumo.estatisticas?.visitasPorMes || [],
      pendentesPorCategoria: resumo.estatisticas?.pendentesPorCategoria || [],
      distribuicaoPorLoja: resumo.estatisticas?.distribuicaoPorLoja || [],
    };
  }, [resumo]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resumo Global</h1>
          <p className="text-muted-foreground">
            Análise inteligente de todos os relatórios e visitas
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : resumo ? (
          <>
            {/* Resumo Executivo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Resumo Executivo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {resumo.resumoExecutivo}
                </p>
              </CardContent>
            </Card>

            {/* Estatísticas Rápidas */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Visitas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{resumo.estatisticas?.totalVisitas || 0}</div>
                  <p className="text-xs text-muted-foreground">Este mês</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pendentes Ativos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{resumo.estatisticas?.pendentesAtivos || 0}</div>
                  <p className="text-xs text-muted-foreground">Requerem atenção</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Lojas Visitadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{resumo.estatisticas?.lojasVisitadas || 0}</div>
                  <p className="text-xs text-muted-foreground">Este mês</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taxa Resolução</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{resumo.estatisticas?.taxaResolucao || 0}%</div>
                  <p className="text-xs text-muted-foreground">Pendentes resolvidos</p>
                </CardContent>
              </Card>
            </div>

            {/* Pontos Positivos e Negativos */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    Pontos Positivos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {resumo.pontosPositivos?.map((ponto: string, index: number) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                        <span>{ponto}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <TrendingDown className="h-5 w-5" />
                    Pontos Negativos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {resumo.pontosNegativos?.map((ponto: string, index: number) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-red-600 dark:text-red-400 mt-0.5">•</span>
                        <span>{ponto}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Ações Recomendadas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                  <AlertCircle className="h-5 w-5" />
                  Ações Imediatas Recomendadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {resumo.acoesRecomendadas?.map((acao: string, index: number) => (
                    <li key={index} className="text-sm flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                      <span className="text-orange-600 dark:text-orange-400 font-bold mt-0.5">{index + 1}.</span>
                      <span>{acao}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Insights */}
            {resumo.insights && resumo.insights.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Insights e Padrões Detectados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {resumo.insights.map((insight: string, index: number) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-blue-600 dark:text-blue-400 mt-0.5">💡</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nenhum dado disponível para análise</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
