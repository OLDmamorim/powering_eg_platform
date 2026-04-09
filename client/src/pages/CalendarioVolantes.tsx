import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Car, Calendar, Users, Info, Clock, MapPin, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const CORES_VOLANTE = [
  { bg: 'bg-blue-500', text: 'text-white', light: 'bg-blue-100', border: 'border-blue-500', dot: 'bg-blue-500' },
  { bg: 'bg-emerald-500', text: 'text-white', light: 'bg-emerald-100', border: 'border-emerald-500', dot: 'bg-emerald-500' },
  { bg: 'bg-purple-500', text: 'text-white', light: 'bg-purple-100', border: 'border-purple-500', dot: 'bg-purple-500' },
  { bg: 'bg-orange-500', text: 'text-white', light: 'bg-orange-100', border: 'border-orange-500', dot: 'bg-orange-500' },
];

const ESTADO_CORES: Record<string, { bg: string; label: string; emoji: string }> = {
  livre: { bg: 'bg-green-100', label: 'Livre', emoji: '✓' },
  pendente: { bg: 'bg-yellow-200', label: 'Pendente', emoji: '⏳' },
  manha_ocupada: { bg: 'bg-purple-200', label: 'Manhã', emoji: '☀' },
  manha_aprovada: { bg: 'bg-purple-200', label: 'Manhã', emoji: '☀' },
  tarde_ocupada: { bg: 'bg-blue-200', label: 'Tarde', emoji: '🌙' },
  tarde_aprovada: { bg: 'bg-blue-200', label: 'Tarde', emoji: '🌙' },
  dia_completo: { bg: 'bg-red-300', label: 'Ocupado', emoji: '✗' },
  bloqueado: { bg: 'bg-gray-400', label: 'Bloqueado', emoji: '🔒' },
};

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function CalendarioVolantes() {
  const hoje = new Date();
  const [mesSelecionado, setMesSelecionado] = useState({
    mes: hoje.getMonth(),
    ano: hoje.getFullYear(),
  });
  const [diaDetalhe, setDiaDetalhe] = useState<string | null>(null);

  // Query para o calendário consolidado
  const { data: dadosCalendario, isLoading } = trpc.volantes.calendarioConsolidado.useQuery(
    { ano: mesSelecionado.ano, mes: mesSelecionado.mes + 1 },
  );

  const volantes = dadosCalendario?.volantes || [];
  const calendario = dadosCalendario?.calendario || {};

  // Gerar dias do mês
  const diasDoMes = useMemo(() => {
    const primeiroDia = new Date(mesSelecionado.ano, mesSelecionado.mes, 1);
    const ultimoDia = new Date(mesSelecionado.ano, mesSelecionado.mes + 1, 0);
    
    // Dia da semana do primeiro dia para grelha 6 colunas (Seg-Sáb)
    const jsDay = primeiroDia.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb
    const diasVazios = jsDay === 0 ? 0 : (jsDay === 1 ? 0 : jsDay - 1);
    
    const dias: (Date | null)[] = [];
    
    // Dias vazios antes
    for (let i = 0; i < diasVazios; i++) {
      dias.push(null);
    }
    
    // Dias do mês (excluindo domingos)
    for (let d = 1; d <= ultimoDia.getDate(); d++) {
      const dia = new Date(mesSelecionado.ano, mesSelecionado.mes, d);
      if (dia.getDay() !== 0) { // Excluir domingos
        dias.push(dia);
      }
    }
    
    return dias;
  }, [mesSelecionado]);

  const nomeMes = new Date(mesSelecionado.ano, mesSelecionado.mes).toLocaleDateString('pt-PT', {
    month: 'long',
    year: 'numeric',
  });

  const mesAnterior = () => {
    setMesSelecionado(prev => {
      if (prev.mes === 0) return { mes: 11, ano: prev.ano - 1 };
      return { mes: prev.mes - 1, ano: prev.ano };
    });
  };

  const mesProximo = () => {
    setMesSelecionado(prev => {
      if (prev.mes === 11) return { mes: 0, ano: prev.ano + 1 };
      return { mes: prev.mes + 1, ano: prev.ano };
    });
  };

  const getDataStr = (data: Date) => {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
  };

  const isHoje = (data: Date) => {
    return data.getDate() === hoje.getDate() &&
      data.getMonth() === hoje.getMonth() &&
      data.getFullYear() === hoje.getFullYear();
  };

  // Dados do dia selecionado para detalhe
  const dadosDiaDetalhe = diaDetalhe ? calendario[diaDetalhe] : null;

  const getEstadoInfo = (estado: string) => {
    return ESTADO_CORES[estado] || ESTADO_CORES.livre;
  };

  // Contar estatísticas do mês
  const estatisticas = useMemo(() => {
    if (!volantes.length) return null;
    
    const stats = volantes.map((v, idx) => {
      let diasOcupados = 0;
      let diasLivres = 0;
      let pedidosPendentes = 0;
      
      Object.entries(calendario).forEach(([_, dia]) => {
        const estadoVolante = dia.porVolante?.[v.id];
        if (estadoVolante) {
          if (estadoVolante.estado === 'dia_completo' || estadoVolante.estado === 'bloqueado') {
            diasOcupados++;
          } else if (estadoVolante.estado === 'livre') {
            diasLivres++;
          }
          pedidosPendentes += (estadoVolante.pedidos || []).filter((p: any) => p.estado === 'pendente').length;
        }
      });
      
      return {
        ...v,
        cor: CORES_VOLANTE[idx % CORES_VOLANTE.length],
        diasOcupados,
        diasLivres,
        pedidosPendentes,
      };
    });
    
    return stats;
  }, [volantes, calendario]);

  return (
    <DashboardLayout>
      <div className="space-y-4 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-6 w-6 text-blue-600" />
              Calendário Volantes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Visão consolidada da ocupação de todos os volantes
            </p>
          </div>
        </div>

        {/* Estatísticas por volante */}
        {estatisticas && estatisticas.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {estatisticas.map((stat, idx) => (
              <Card key={stat.id} className={`border-l-4 ${stat.cor.border}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${stat.cor.dot}`} />
                    <span className="font-semibold text-sm">{stat.nome}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <div className="font-bold text-lg text-red-600">{stat.diasOcupados}</div>
                      <div className="text-muted-foreground">Ocupados</div>
                    </div>
                    <div>
                      <div className="font-bold text-lg text-green-600">{stat.diasLivres}</div>
                      <div className="text-muted-foreground">Livres</div>
                    </div>
                    <div>
                      <div className="font-bold text-lg text-yellow-600">{stat.pedidosPendentes}</div>
                      <div className="text-muted-foreground">Pendentes</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Card combinado */}
            <Card className="border-l-4 border-gray-400">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-gray-600" />
                  <span className="font-semibold text-sm">Combinado</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div>
                    <div className="font-bold text-lg text-red-600">
                      {Object.values(calendario).filter(d => d.combinado === 'dia_completo' || d.combinado === 'bloqueado').length}
                    </div>
                    <div className="text-muted-foreground">Sem disponibilidade</div>
                  </div>
                  <div>
                    <div className="font-bold text-lg text-green-600">
                      {diasDoMes.filter(d => d !== null).length - Object.values(calendario).filter(d => d.combinado === 'dia_completo' || d.combinado === 'bloqueado').length}
                    </div>
                    <div className="text-muted-foreground">Com disponibilidade</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Legenda dos volantes */}
        {volantes.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-medium text-muted-foreground">Legenda:</span>
            {volantes.map((v, idx) => (
              <div key={v.id} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full ${CORES_VOLANTE[idx % CORES_VOLANTE.length].dot}`} />
                <span>{v.nome}</span>
              </div>
            ))}
            <span className="text-muted-foreground">|</span>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-200" />
              <span>Livre</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-yellow-200" />
              <span>Pendente</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-purple-200" />
              <span>Manhã</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-200" />
              <span>Tarde</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-300" />
              <span>Ocupado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gray-400" />
              <span>Bloqueado</span>
            </div>
          </div>
        )}

        {/* Calendário */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={mesAnterior}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-lg capitalize">{nomeMes}</CardTitle>
              <Button variant="outline" size="sm" onClick={mesProximo}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : volantes.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Car className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum volante ativo encontrado.</p>
                <p className="text-sm">Crie volantes na secção "Volantes" do menu.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Cabeçalho dias da semana */}
                <div className="grid grid-cols-6 gap-1 mb-1">
                  {DIAS_SEMANA.map(dia => (
                    <div key={dia} className="text-center text-xs font-semibold text-muted-foreground py-1">
                      {dia}
                    </div>
                  ))}
                </div>

                {/* Grid do calendário */}
                <div className="grid grid-cols-6 gap-1">
                  {diasDoMes.map((data, idx) => {
                    if (!data) {
                      return <div key={`empty-${idx}`} className="min-h-[80px]" />;
                    }

                    const dataStr = getDataStr(data);
                    const dadosDia = calendario[dataStr];
                    const ehHoje = isHoje(data);
                    const ehPassado = data < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

                    return (
                      <div
                        key={dataStr}
                        onClick={() => dadosDia && setDiaDetalhe(dataStr)}
                        className={`min-h-[80px] rounded-lg border p-1 transition-all cursor-pointer hover:shadow-md
                          ${ehHoje ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'}
                          ${ehPassado ? 'opacity-50' : ''}
                          bg-white
                          ${dadosDia?.combinado === 'dia_completo' ? 'bg-red-50' : ''}
                          ${dadosDia?.combinado === 'bloqueado' ? 'bg-gray-100' : ''}
                        `}
                      >
                        {/* Número do dia */}
                        <div className={`text-xs font-bold mb-1 ${ehHoje ? 'text-blue-600' : 'text-gray-700'}`}>
                          {data.getDate()}
                        </div>

                        {/* Mini indicadores por volante */}
                        {volantes.length > 0 && (
                          <div className="space-y-0.5">
                            {volantes.map((v, vIdx) => {
                              const estadoVolante = dadosDia?.porVolante?.[v.id];
                              const estado = estadoVolante?.estado || 'livre';
                              const info = getEstadoInfo(estado);
                              const cor = CORES_VOLANTE[vIdx % CORES_VOLANTE.length];

                              return (
                                <div
                                  key={v.id}
                                  className={`flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] ${info.bg}`}
                                >
                                  <div className={`w-1.5 h-1.5 rounded-full ${cor.dot} flex-shrink-0`} />
                                  <span className="truncate font-medium">
                                    {v.nome.split(' ')[0]}
                                  </span>
                                  <span className="ml-auto text-[9px]">{info.emoji}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de detalhe do dia */}
        <Dialog open={!!diaDetalhe} onOpenChange={(open) => !open && setDiaDetalhe(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                {diaDetalhe && new Date(diaDetalhe + 'T12:00:00').toLocaleDateString('pt-PT', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </DialogTitle>
            </DialogHeader>

            {dadosDiaDetalhe && (
              <div className="space-y-4">
                {/* Estado combinado */}
                <div className={`rounded-lg p-3 text-center ${getEstadoInfo(dadosDiaDetalhe.combinado).bg}`}>
                  <span className="font-semibold text-sm">
                    Estado combinado: {getEstadoInfo(dadosDiaDetalhe.combinado).label}
                  </span>
                </div>

                {/* Detalhe por volante */}
                {volantes.map((v, vIdx) => {
                  const estadoVolante = dadosDiaDetalhe.porVolante?.[v.id];
                  if (!estadoVolante) return null;

                  const info = getEstadoInfo(estadoVolante.estado);
                  const cor = CORES_VOLANTE[vIdx % CORES_VOLANTE.length];
                  const pedidos = estadoVolante.pedidos || [];
                  const bloqueios = estadoVolante.bloqueios || [];
                  const agendamentos = estadoVolante.agendamentos || [];

                  return (
                    <Card key={v.id} className={`border-l-4 ${cor.border}`}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${cor.dot}`} />
                            <span className="font-semibold">{v.nome}</span>
                          </div>
                          <Badge variant="outline" className={info.bg}>
                            {info.emoji} {info.label}
                          </Badge>
                        </div>

                        {/* Pedidos */}
                        {pedidos.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Pedidos de apoio
                            </div>
                            {pedidos.map((p: any, pIdx: number) => (
                              <div key={pIdx} className="text-xs bg-gray-50 rounded p-2 flex items-center justify-between">
                                <div>
                                  <span className="font-medium">{p.loja?.nome || p.lojaNome || `Loja #${p.lojaId}`}</span>
                                  <span className="text-muted-foreground ml-2">
                                    {p.periodo === 'manha' ? '☀ Manhã' : p.periodo === 'tarde' ? '🌙 Tarde' : '📅 Dia todo'}
                                  </span>
                                </div>
                                <Badge variant={p.estado === 'aprovado' ? 'default' : p.estado === 'pendente' ? 'secondary' : 'destructive'} className="text-[10px]">
                                  {p.estado}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Agendamentos */}
                        {agendamentos.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> Agendamentos
                            </div>
                            {agendamentos.map((a: any, aIdx: number) => (
                              <div key={aIdx} className="text-xs bg-blue-50 rounded p-2">
                                <span className="font-medium">{a.loja?.nome || `Loja #${a.lojaId}`}</span>
                                <span className="text-muted-foreground ml-2">
                                  {(a.agendamento_volante_periodo || a.periodo) === 'manha' ? '☀ Manhã' : 
                                   (a.agendamento_volante_periodo || a.periodo) === 'tarde' ? '🌙 Tarde' : '📅 Dia todo'}
                                </span>
                                {(a.agendamento_volante_tipo || a.tipo) && (
                                  <span className="text-muted-foreground ml-1">
                                    ({a.agendamento_volante_tipo || a.tipo})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Bloqueios */}
                        {bloqueios.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Bloqueios
                            </div>
                            {bloqueios.map((b: any, bIdx: number) => (
                              <div key={bIdx} className="text-xs bg-gray-100 rounded p-2">
                                <span className="font-medium">
                                  {b.periodo === 'manha' ? '☀ Manhã' : b.periodo === 'tarde' ? '🌙 Tarde' : '📅 Dia todo'}
                                </span>
                                {b.motivo && <span className="text-muted-foreground ml-2">— {b.motivo}</span>}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Sem atividade */}
                        {pedidos.length === 0 && agendamentos.length === 0 && bloqueios.length === 0 && (
                          <div className="text-xs text-muted-foreground text-center py-1">
                            Sem atividade registada
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
