import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { 
  Loader2, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, 
  Lightbulb, History, BarChart3, ShoppingCart, Clock, Target,
  AlertCircle, ArrowUp, ArrowDown, Minus, Calendar
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type PeriodoFiltro = 'mes_atual' | 'mes_anterior' | 'trimestre_anterior' | 'semestre_anterior' | 'ano_anterior';

export default function HistoricoLoja() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [lojaId, setLojaId] = useState("");
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('mes_anterior');
  const [historyData, setHistoryData] = useState<any>(null);

  const { data: lojasGestor } = trpc.lojas.getByGestor.useQuery(undefined, { enabled: user?.role === 'gestor' });
  const { data: lojasAdmin } = trpc.lojas.list.useQuery(undefined, { enabled: user?.role === 'admin' });
  const lojas = user?.role === 'admin' ? lojasAdmin : lojasGestor;
  
  const generateHistoryMutation = trpc.lojaHistory.generate.useQuery(
    { lojaId: parseInt(lojaId), periodo },
    { enabled: false }
  );

  if (!user || (user.role !== "gestor" && user.role !== "admin")) {
    setLocation("/dashboard");
    return null;
  }

  const handleGenerate = async () => {
    if (!lojaId) {
      toast.error("Por favor selecione uma loja");
      return;
    }

    try {
      toast.info("🤖 A analisar histórico da loja com IA...");
      const result = await generateHistoryMutation.refetch();
      if (result.data) {
        setHistoryData(result.data);
        toast.success("Histórico gerado com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao gerar histórico:", error);
      toast.error("Erro ao gerar histórico. Tente novamente.");
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "alta": return "text-red-600 bg-red-50 border-red-200";
      case "média": return "text-orange-600 bg-orange-50 border-orange-200";
      case "baixa": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "alta": return "text-red-600 bg-red-50";
      case "média": return "text-orange-600 bg-orange-50";
      case "baixa": return "text-blue-600 bg-blue-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "subida": return <ArrowUp className="h-4 w-4 text-green-600" />;
      case "descida": return <ArrowDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const periodoLabels: Record<PeriodoFiltro, string> = {
    mes_atual: 'Mês Atual',
    mes_anterior: 'Mês Anterior',
    trimestre_anterior: 'Trimestre Anterior',
    semestre_anterior: 'Semestre Anterior',
    ano_anterior: 'Ano Anterior',
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-8 w-8" />
            Histórico da Loja
          </h1>
          <p className="text-muted-foreground">
            Análise inteligente completa: operacional, resultados, comercial e pendentes
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configurar Análise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              {/* Período */}
              <div className="flex-1 min-w-[180px] space-y-2">
                <Label htmlFor="periodo">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Período
                </Label>
                <Select value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoFiltro)}>
                  <SelectTrigger id="periodo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mes_anterior">Mês Anterior</SelectItem>
                    <SelectItem value="trimestre_anterior">Trimestre Anterior</SelectItem>
                    <SelectItem value="semestre_anterior">Semestre Anterior</SelectItem>
                    <SelectItem value="ano_anterior">Ano Anterior</SelectItem>
                    <SelectItem value="mes_atual">Mês Atual (em curso)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Loja */}
              <div className="flex-1 min-w-[200px] space-y-2">
                <Label htmlFor="loja">Loja *</Label>
                <Select value={lojaId} onValueChange={setLojaId}>
                  <SelectTrigger id="loja">
                    <SelectValue placeholder="Selecione uma loja" />
                  </SelectTrigger>
                  <SelectContent>
                    {lojas?.map((loja: any) => (
                      <SelectItem key={loja.id} value={loja.id.toString()}>
                        {loja.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Botão */}
              <div className="flex items-end">
                <Button 
                  onClick={handleGenerate} 
                  disabled={!lojaId || generateHistoryMutation.isFetching}
                  size="lg"
                >
                  {generateHistoryMutation.isFetching ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      A analisar...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Gerar Análise IA
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {historyData && (
          <div className="space-y-6">
            {/* Cabeçalho com período */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  {lojas?.find((l: any) => l.id.toString() === lojaId)?.nome}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Período: {historyData.periodoAnalisado}
                </p>
              </div>
            </div>

            {/* Métricas Resumidas */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{historyData.metricas?.totalRelatoriosLivres || 0}</p>
                  <p className="text-xs text-blue-600">Rel. Livres</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-purple-700">{historyData.metricas?.totalRelatoriosCompletos || 0}</p>
                  <p className="text-xs text-purple-600">Rel. Completos</p>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-orange-700">{historyData.metricas?.totalPendentes || 0}</p>
                  <p className="text-xs text-orange-600">Pendentes</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{historyData.metricas?.taxaResolucao?.toFixed(0) || 0}%</p>
                  <p className="text-xs text-green-600">Taxa Resolução</p>
                </CardContent>
              </Card>
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-700">{historyData.metricas?.totalOcorrencias || 0}</p>
                  <p className="text-xs text-red-600">Ocorrências</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-gray-700">
                    {(historyData.metricas?.totalRelatoriosLivres || 0) + (historyData.metricas?.totalRelatoriosCompletos || 0)}
                  </p>
                  <p className="text-xs text-gray-600">Total Visitas</p>
                </CardContent>
              </Card>
            </div>

            {/* Análise de Resultados */}
            {historyData.analiseResultados && (
              <Card className="border-indigo-200 bg-indigo-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-indigo-900">
                    <Target className="h-5 w-5" />
                    Análise de Resultados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-indigo-700">{historyData.analiseResultados.totalServicos}</p>
                      <p className="text-xs text-indigo-600">Total Serviços</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-indigo-700">{historyData.analiseResultados.objetivoTotal}</p>
                      <p className="text-xs text-indigo-600">Objetivo Total</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className={`text-2xl font-bold ${historyData.analiseResultados.desvioMedio >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {historyData.analiseResultados.desvioMedio >= 0 ? '+' : ''}{historyData.analiseResultados.desvioMedio}%
                      </p>
                      <p className="text-xs text-indigo-600">Desvio Médio</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-indigo-700">{historyData.analiseResultados.taxaReparacaoMedia}%</p>
                      <p className="text-xs text-indigo-600">Taxa Reparação</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Tendência:</span>
                      {getTrendIcon(historyData.analiseResultados.tendenciaServicos)}
                      <span className="capitalize">{historyData.analiseResultados.tendenciaServicos}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Melhor: {historyData.analiseResultados.melhorMes} | Pior: {historyData.analiseResultados.piorMes}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Análise Comercial */}
            {historyData.analiseComercial && (
              <Card className="border-emerald-200 bg-emerald-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-900">
                    <ShoppingCart className="h-5 w-5" />
                    Análise Comercial (Vendas Complementares)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-emerald-700">€{historyData.analiseComercial.totalVendasComplementares}</p>
                      <p className="text-xs text-emerald-600">Total Vendas</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-emerald-700">€{historyData.analiseComercial.mediaVendasMensal}</p>
                      <p className="text-xs text-emerald-600">Média Mensal</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-emerald-700">€{historyData.analiseComercial.escovasTotal}</p>
                      <p className="text-xs text-emerald-600">Escovas</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-emerald-700">€{historyData.analiseComercial.polimentoTotal}</p>
                      <p className="text-xs text-emerald-600">Polimento</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Tendência:</span>
                    {getTrendIcon(historyData.analiseComercial.tendenciaVendas)}
                    <span className="capitalize">{historyData.analiseComercial.tendenciaVendas}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resumo Geral */}
            <Card className="border-sky-200 bg-sky-50/50">
              <CardHeader>
                <CardTitle className="text-sky-900">Resumo Executivo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg text-sky-800">{historyData.resumoGeral}</p>
              </CardContent>
            </Card>

            {/* Alertas Operacionais */}
            {historyData.alertasOperacionais && historyData.alertasOperacionais.length > 0 && (
              <Card className="border-red-200 bg-red-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-900">
                    <AlertCircle className="h-5 w-5" />
                    Alertas Operacionais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {historyData.alertasOperacionais.map((alerta: any, index: number) => (
                      <div 
                        key={index} 
                        className={`p-4 rounded-lg border ${getSeverityColor(alerta.urgencia)}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold">{alerta.tipo}</h4>
                            <p className="text-sm mt-1">{alerta.descricao}</p>
                          </div>
                          <span className="text-xs font-medium uppercase px-2 py-1 rounded">
                            {alerta.urgencia}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Evolução */}
            {historyData.evolucao && historyData.evolucao.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Evolução ao Longo do Tempo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {historyData.evolucao.map((item: any, index: number) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                        <h4 className="font-semibold text-blue-900">{item.periodo}</h4>
                        <p className="text-gray-700">{item.descricao}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Problemas Recorrentes */}
            {historyData.problemasRecorrentes && historyData.problemasRecorrentes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    Problemas Identificados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {historyData.problemasRecorrentes.map((item: any, index: number) => (
                      <div 
                        key={index} 
                        className={`p-4 rounded-lg border ${getSeverityColor(item.gravidade)}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{item.problema}</h4>
                              <span className="text-xs px-2 py-0.5 bg-gray-200 rounded">{item.categoria}</span>
                            </div>
                            <p className="text-sm mt-1">{item.frequencia}</p>
                          </div>
                          <span className="text-xs font-medium uppercase px-2 py-1 rounded">
                            {item.gravidade}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pontos Fortes */}
            {historyData.pontosFortes && historyData.pontosFortes.length > 0 && (
              <Card className="border-green-200 bg-green-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-900">
                    <CheckCircle2 className="h-5 w-5" />
                    Pontos Fortes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {historyData.pontosFortes.map((item: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-green-800">
                        <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Tendências */}
            {historyData.tendencias && historyData.tendencias.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Tendências Identificadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {historyData.tendencias.map((item: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold mt-1">→</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Recomendações */}
            {historyData.recomendacoes && historyData.recomendacoes.length > 0 && (
              <Card className="border-purple-200 bg-purple-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-900">
                    <Lightbulb className="h-5 w-5" />
                    Recomendações Prioritárias
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {historyData.recomendacoes
                      .sort((a: any, b: any) => {
                        const prioOrder = { alta: 0, média: 1, baixa: 2 };
                        return prioOrder[a.prioridade as keyof typeof prioOrder] - prioOrder[b.prioridade as keyof typeof prioOrder];
                      })
                      .map((item: any, index: number) => (
                        <div key={index} className="p-4 rounded-lg border border-purple-200 bg-white">
                          <div className="flex items-start gap-3">
                            <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${getPriorityColor(item.prioridade)}`}>
                              {item.prioridade}
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-purple-900">{item.recomendacao}</h4>
                                <span className="text-xs px-2 py-0.5 bg-purple-100 rounded">{item.categoria}</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{item.justificativa}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {!historyData && lojaId && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Selecione o período e a loja, depois clique em "Gerar Análise IA" para ver o histórico completo</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
