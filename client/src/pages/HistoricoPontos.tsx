import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { TrendingUp, TrendingDown, Calendar, User, Store, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

export default function HistoricoPontos() {
  const [selectedLojaId, setSelectedLojaId] = useState<string>("all");
  
  const { data: lojas, isLoading: lojasLoading } = trpc.lojas.list.useQuery();
  const { data: historico, isLoading: historicoLoading } = trpc.historicoPontos.all.useQuery();
  const { data: alertas, isLoading: alertasLoading } = trpc.alertas.lojasComAlertas.useQuery({});
  
  // Filtrar histórico por loja selecionada
  const historicoFiltrado = useMemo(() => {
    if (!historico) return [];
    if (selectedLojaId === "all") return historico;
    return historico.filter(h => h.lojaId === parseInt(selectedLojaId));
  }, [historico, selectedLojaId]);
  
  // Agrupar por loja para estatísticas
  const estatisticasPorLoja = useMemo(() => {
    if (!historico) return {};
    
    const stats: Record<number, {
      lojaNome: string;
      totalRelatorios: number;
      comPositivos: number;
      comNegativos: number;
      ultimaVisita: Date | null;
    }> = {};
    
    historico.forEach(h => {
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
  }, [historico]);
  
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
        
        {/* Filtros */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
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
                ? "Todas as visitas com pontos registados" 
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
      </div>
    </DashboardLayout>
  );
}
