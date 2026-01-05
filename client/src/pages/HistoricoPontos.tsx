import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { TrendingUp, TrendingDown, Calendar, User, Store, AlertTriangle, CheckCircle, XCircle, GitCompare, Filter } from "lucide-react";

type PeriodoFiltro = "mes_atual" | "mes_anterior" | "trimestre_anterior" | "semestre_anterior" | "ano_anterior";

export default function HistoricoPontos() {
  const [selectedLojaId, setSelectedLojaId] = useState<string>("all");
  const [periodoFiltro, setPeriodoFiltro] = useState<PeriodoFiltro>("mes_atual");
  const [compareLoja1, setCompareLoja1] = useState<string>("");
  const [compareLoja2, setCompareLoja2] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("historico");
  
  const { data: lojas, isLoading: lojasLoading } = trpc.lojas.list.useQuery();
  const { data: historico, isLoading: historicoLoading } = trpc.historicoPontos.all.useQuery();
  const { data: alertas, isLoading: alertasLoading } = trpc.alertas.lojasComAlertas.useQuery({});
  
  // Calcular datas de início e fim baseadas no período
  const { dataInicio, dataFim } = useMemo(() => {
    const hoje = new Date();
    let inicio: Date;
    let fim: Date;
    
    switch (periodoFiltro) {
      case "mes_atual":
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        fim = hoje;
        break;
      case "mes_anterior":
        inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59);
        break;
      case "trimestre_anterior":
        const trimestreAtual = Math.floor(hoje.getMonth() / 3);
        inicio = new Date(hoje.getFullYear(), (trimestreAtual - 1) * 3, 1);
        fim = new Date(hoje.getFullYear(), trimestreAtual * 3, 0, 23, 59, 59);
        break;
      case "semestre_anterior":
        const semestreAtual = hoje.getMonth() < 6 ? 0 : 1;
        if (semestreAtual === 0) {
          inicio = new Date(hoje.getFullYear() - 1, 6, 1);
          fim = new Date(hoje.getFullYear() - 1, 11, 31, 23, 59, 59);
        } else {
          inicio = new Date(hoje.getFullYear(), 0, 1);
          fim = new Date(hoje.getFullYear(), 5, 30, 23, 59, 59);
        }
        break;
      case "ano_anterior":
        inicio = new Date(hoje.getFullYear() - 1, 0, 1);
        fim = new Date(hoje.getFullYear() - 1, 11, 31, 23, 59, 59);
        break;
      default:
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        fim = hoje;
    }
    
    return { dataInicio: inicio, dataFim: fim };
  }, [periodoFiltro]);
  
  // Filtrar histórico por loja e período
  const historicoFiltrado = useMemo(() => {
    if (!historico) return [];
    let filtered = historico;
    
    // Filtrar por loja
    if (selectedLojaId !== "all") {
      filtered = filtered.filter(h => h.lojaId === parseInt(selectedLojaId));
    }
    
    // Filtrar por período
    filtered = filtered.filter(h => {
      const dataVisita = new Date(h.dataVisita);
      return dataVisita >= dataInicio && dataVisita <= dataFim;
    });
    
    return filtered;
  }, [historico, selectedLojaId, dataInicio, dataFim]);
  
  // Agrupar por loja para estatísticas
  const estatisticasPorLoja = useMemo(() => {
    if (!historico) return {};
    
    // Aplicar filtro de período às estatísticas também
    const historicoParaStats = historico.filter(h => {
      const dataVisita = new Date(h.dataVisita);
      return dataVisita >= dataInicio && dataVisita <= dataFim;
    });
    
    const stats: Record<number, {
      lojaNome: string;
      totalRelatorios: number;
      comPositivos: number;
      comNegativos: number;
      ultimaVisita: Date | null;
    }> = {};
    
    historicoParaStats.forEach(h => {
      if (!stats[h.lojaId]) {
        stats[h.lojaId] = {
          lojaNome: h.lojaNome,
          totalRelatorios: 0,
          comPositivos: 0,
          comNegativos: 0,
          ultimaVisita: null
        };
      }
      
      stats[h.lojaId].totalRelatorios++;
      if (h.pontosPositivos && h.pontosPositivos.trim()) stats[h.lojaId].comPositivos++;
      if (h.pontosNegativos && h.pontosNegativos.trim()) stats[h.lojaId].comNegativos++;
      
      const dataVisita = new Date(h.dataVisita);
      if (!stats[h.lojaId].ultimaVisita || dataVisita > stats[h.lojaId].ultimaVisita!) {
        stats[h.lojaId].ultimaVisita = dataVisita;
      }
    });
    
    return stats;
  }, [historico, dataInicio, dataFim]);
  
  // Dados para comparação de lojas
  const dadosComparacao = useMemo(() => {
    if (!historico || !compareLoja1 || !compareLoja2) return null;
    
    const historicoParaComparar = historico.filter(h => {
      const dataVisita = new Date(h.dataVisita);
      return dataVisita >= dataInicio && dataVisita <= dataFim;
    });
    
    const loja1Data = historicoParaComparar.filter(h => h.lojaId === parseInt(compareLoja1));
    const loja2Data = historicoParaComparar.filter(h => h.lojaId === parseInt(compareLoja2));
    
    const calcStats = (data: typeof loja1Data) => ({
      totalRelatorios: data.length,
      comPositivos: data.filter(h => h.pontosPositivos?.trim()).length,
      comNegativos: data.filter(h => h.pontosNegativos?.trim()).length,
      ultimosPositivos: data.filter(h => h.pontosPositivos?.trim()).slice(0, 3).map(h => h.pontosPositivos!),
      ultimosNegativos: data.filter(h => h.pontosNegativos?.trim()).slice(0, 3).map(h => h.pontosNegativos!)
    });
    
    return {
      loja1: {
        nome: lojas?.find(l => l.id === parseInt(compareLoja1))?.nome || "Loja 1",
        ...calcStats(loja1Data)
      },
      loja2: {
        nome: lojas?.find(l => l.id === parseInt(compareLoja2))?.nome || "Loja 2",
        ...calcStats(loja2Data)
      }
    };
  }, [historico, compareLoja1, compareLoja2, lojas, dataInicio, dataFim]);
  
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  const isLoading = lojasLoading || historicoLoading || alertasLoading;
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Histórico de Pontos</h1>
          <p className="text-muted-foreground">
            Evolução dos pontos positivos e negativos por loja ao longo do tempo
          </p>
        </div>
        
        {/* Alertas */}
        {alertas && alertas.length > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Alertas Ativos
              </CardTitle>
              <CardDescription>
                Lojas com 3 ou mais relatórios consecutivos com pontos negativos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alertas.map(alerta => (
                  <div key={alerta.lojaId} className="flex items-start gap-3 p-3 rounded-lg bg-background border">
                    <Store className="h-5 w-5 text-destructive mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">{alerta.lojaNome}</p>
                      <p className="text-sm text-muted-foreground">
                        {alerta.ultimosNegativos.length} relatórios consecutivos com pontos negativos
                      </p>
                      <div className="mt-2 space-y-1">
                        {alerta.ultimosNegativos.slice(0, 3).map((neg, idx) => (
                          <p key={idx} className="text-xs text-destructive/80 line-clamp-1">
                            • {neg}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Tabs para Histórico e Comparação */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="historico" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Histórico
            </TabsTrigger>
            <TabsTrigger value="comparacao" className="flex items-center gap-2">
              <GitCompare className="h-4 w-4" />
              Comparar Lojas
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="historico" className="space-y-6 mt-6">
            {/* Filtros */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <div className="w-64">
                    <label className="text-sm font-medium mb-2 block">Loja</label>
                    <Select value={selectedLojaId} onValueChange={setSelectedLojaId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar loja" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as lojas</SelectItem>
                        {lojas?.map(loja => (
                          <SelectItem key={loja.id} value={loja.id.toString()}>
                            {loja.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-64">
                    <label className="text-sm font-medium mb-2 block">Período</label>
                    <Select value={periodoFiltro} onValueChange={(v) => setPeriodoFiltro(v as PeriodoFiltro)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar período" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mes_atual">Mês Atual</SelectItem>
                        <SelectItem value="mes_anterior">Mês Anterior</SelectItem>
                        <SelectItem value="trimestre_anterior">Trimestre Anterior</SelectItem>
                        <SelectItem value="semestre_anterior">Semestre Anterior</SelectItem>
                        <SelectItem value="ano_anterior">Ano Anterior</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Estatísticas por Loja */}
            {selectedLojaId === "all" && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <Skeleton className="h-5 w-32" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-20 w-full" />
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  Object.entries(estatisticasPorLoja).map(([lojaId, stats]) => {
                    const temAlerta = alertas?.some(a => a.lojaId === parseInt(lojaId));
                    return (
                      <Card 
                        key={lojaId} 
                        className={`cursor-pointer transition-colors hover:bg-muted/50 ${temAlerta ? 'border-destructive/50' : ''}`}
                        onClick={() => setSelectedLojaId(lojaId)}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center justify-between text-base">
                            <span className="flex items-center gap-2">
                              <Store className="h-4 w-4" />
                              {stats.lojaNome}
                            </span>
                            {temAlerta && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Alerta
                              </Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-2xl font-bold">{stats.totalRelatorios}</p>
                              <p className="text-xs text-muted-foreground">Relatórios</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-green-600">{stats.comPositivos}</p>
                              <p className="text-xs text-muted-foreground">Positivos</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-red-600">{stats.comNegativos}</p>
                              <p className="text-xs text-muted-foreground">Negativos</p>
                            </div>
                          </div>
                          {stats.ultimaVisita && (
                            <p className="text-xs text-muted-foreground mt-3 text-center">
                              Última visita: {formatDate(stats.ultimaVisita)}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            )}
            
            {/* Timeline de Histórico */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Histórico de Visitas
                </CardTitle>
                <CardDescription>
                  {selectedLojaId === "all" 
                    ? `Todas as visitas (${periodoFiltro === "mes_atual" ? "mês atual" : periodoFiltro === "mes_anterior" ? "mês anterior" : periodoFiltro === "trimestre_anterior" ? "trimestre anterior" : periodoFiltro === "semestre_anterior" ? "semestre anterior" : "ano anterior"})` 
                    : `Visitas da loja selecionada`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : historicoFiltrado.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum relatório completo encontrado</p>
                    <p className="text-sm">Os pontos são registados nos relatórios completos</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {historicoFiltrado.map((item, idx) => (
                      <div 
                        key={`${item.lojaId}-${idx}`}
                        className="relative pl-6 pb-4 border-l-2 border-muted last:pb-0"
                      >
                        {/* Dot na timeline */}
                        <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-background border-2 border-primary" />
                        
                        <div className="bg-muted/30 rounded-lg p-4">
                          {/* Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline">
                                <Store className="h-3 w-3 mr-1" />
                                {item.lojaNome}
                              </Badge>
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(item.dataVisita)}
                              </span>
                            </div>
                            {item.gestorNome && (
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {item.gestorNome}
                              </span>
                            )}
                          </div>
                          
                          {/* Pontos */}
                          <div className="grid md:grid-cols-2 gap-4">
                            {/* Positivos */}
                            <div className={`p-3 rounded-md ${item.pontosPositivos ? 'bg-green-500/10 border border-green-500/20' : 'bg-muted/50'}`}>
                              <div className="flex items-center gap-2 mb-2">
                                {item.pontosPositivos ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="font-medium text-sm">Pontos Positivos</span>
                              </div>
                              <p className="text-sm">
                                {item.pontosPositivos || <span className="text-muted-foreground italic">Não registado</span>}
                              </p>
                            </div>
                            
                            {/* Negativos */}
                            <div className={`p-3 rounded-md ${item.pontosNegativos ? 'bg-red-500/10 border border-red-500/20' : 'bg-muted/50'}`}>
                              <div className="flex items-center gap-2 mb-2">
                                {item.pontosNegativos ? (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="font-medium text-sm">Pontos Negativos</span>
                              </div>
                              <p className="text-sm">
                                {item.pontosNegativos || <span className="text-muted-foreground italic">Não registado</span>}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="comparacao" className="space-y-6 mt-6">
            {/* Seleção de Lojas para Comparação */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <GitCompare className="h-4 w-4" />
                  Comparar Lojas
                </CardTitle>
                <CardDescription>
                  Selecione duas lojas para comparar a evolução dos pontos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="w-64">
                    <label className="text-sm font-medium mb-2 block">Loja 1</label>
                    <Select value={compareLoja1} onValueChange={setCompareLoja1}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar loja" />
                      </SelectTrigger>
                      <SelectContent>
                        {lojas?.map(loja => (
                          <SelectItem key={loja.id} value={loja.id.toString()} disabled={loja.id.toString() === compareLoja2}>
                            {loja.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-64">
                    <label className="text-sm font-medium mb-2 block">Loja 2</label>
                    <Select value={compareLoja2} onValueChange={setCompareLoja2}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar loja" />
                      </SelectTrigger>
                      <SelectContent>
                        {lojas?.map(loja => (
                          <SelectItem key={loja.id} value={loja.id.toString()} disabled={loja.id.toString() === compareLoja1}>
                            {loja.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-48">
                    <label className="text-sm font-medium mb-2 block">Período</label>
                    <Select value={periodoFiltro} onValueChange={(v) => setPeriodoFiltro(v as PeriodoFiltro)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Período" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mes_atual">Mês Atual</SelectItem>
                        <SelectItem value="mes_anterior">Mês Anterior</SelectItem>
                        <SelectItem value="trimestre_anterior">Trimestre Anterior</SelectItem>
                        <SelectItem value="semestre_anterior">Semestre Anterior</SelectItem>
                        <SelectItem value="ano_anterior">Ano Anterior</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Resultado da Comparação */}
            {dadosComparacao ? (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Loja 1 */}
                <Card className="border-blue-200/50 dark:border-blue-800/30">
                  <CardHeader className="bg-blue-50/50 dark:bg-blue-950/20">
                    <CardTitle className="flex items-center gap-2">
                      <Store className="h-5 w-5 text-blue-600" />
                      {dadosComparacao.loja1.nome}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold">{dadosComparacao.loja1.totalRelatorios}</p>
                        <p className="text-xs text-muted-foreground">Relatórios</p>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{dadosComparacao.loja1.comPositivos}</p>
                        <p className="text-xs text-muted-foreground">Positivos</p>
                      </div>
                      <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">{dadosComparacao.loja1.comNegativos}</p>
                        <p className="text-xs text-muted-foreground">Negativos</p>
                      </div>
                    </div>
                    
                    {dadosComparacao.loja1.ultimosPositivos.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Últimos Positivos
                        </h4>
                        <ul className="space-y-1">
                          {dadosComparacao.loja1.ultimosPositivos.map((p, i) => (
                            <li key={i} className="text-xs text-muted-foreground line-clamp-1">• {p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {dadosComparacao.loja1.ultimosNegativos.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          Últimos Negativos
                        </h4>
                        <ul className="space-y-1">
                          {dadosComparacao.loja1.ultimosNegativos.map((p, i) => (
                            <li key={i} className="text-xs text-muted-foreground line-clamp-1">• {p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Loja 2 */}
                <Card className="border-purple-200/50 dark:border-purple-800/30">
                  <CardHeader className="bg-purple-50/50 dark:bg-purple-950/20">
                    <CardTitle className="flex items-center gap-2">
                      <Store className="h-5 w-5 text-purple-600" />
                      {dadosComparacao.loja2.nome}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold">{dadosComparacao.loja2.totalRelatorios}</p>
                        <p className="text-xs text-muted-foreground">Relatórios</p>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{dadosComparacao.loja2.comPositivos}</p>
                        <p className="text-xs text-muted-foreground">Positivos</p>
                      </div>
                      <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">{dadosComparacao.loja2.comNegativos}</p>
                        <p className="text-xs text-muted-foreground">Negativos</p>
                      </div>
                    </div>
                    
                    {dadosComparacao.loja2.ultimosPositivos.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Últimos Positivos
                        </h4>
                        <ul className="space-y-1">
                          {dadosComparacao.loja2.ultimosPositivos.map((p, i) => (
                            <li key={i} className="text-xs text-muted-foreground line-clamp-1">• {p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {dadosComparacao.loja2.ultimosNegativos.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          Últimos Negativos
                        </h4>
                        <ul className="space-y-1">
                          {dadosComparacao.loja2.ultimosNegativos.map((p, i) => (
                            <li key={i} className="text-xs text-muted-foreground line-clamp-1">• {p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <GitCompare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Selecione duas lojas para comparar</p>
                    <p className="text-sm">A comparação mostrará estatísticas lado a lado</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
