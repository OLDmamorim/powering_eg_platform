import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Car, Calendar, Users, Clock, MapPin, AlertTriangle, Check, X, Trash2, Plus, Ban } from "lucide-react";
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
  const [showCriarDialog, setShowCriarDialog] = useState<{ tipo: 'agendamento' | 'bloqueio'; volanteId: number; data: string } | null>(null);
  const [motivoReprovar, setMotivoReprovar] = useState('');
  const [showReprovarDialog, setShowReprovarDialog] = useState<number | null>(null);

  // Form state for creating
  const [criarForm, setCriarForm] = useState({
    lojaId: '',
    periodo: 'dia_todo' as string,
    tipo: '',
    observacoes: '',
    motivo: '',
  });

  const utils = trpc.useUtils();

  // Query para o calendário consolidado
  const { data: dadosCalendario, isLoading } = trpc.volantes.calendarioConsolidado.useQuery(
    { ano: mesSelecionado.ano, mes: mesSelecionado.mes + 1 },
  );

  const volantes = dadosCalendario?.volantes || [];
  const calendario = dadosCalendario?.calendario || {};

  // Query para lojas de um volante (quando dialog de criar está aberto)
  const { data: lojasVolante } = trpc.volantes.gestorLojasVolante.useQuery(
    { volanteId: showCriarDialog?.volanteId || 0 },
    { enabled: !!showCriarDialog && showCriarDialog.tipo === 'agendamento' }
  );

  // Mutations
  const aprovarMutation = trpc.volantes.gestorAprovarPedido.useMutation({
    onSuccess: () => {
      toast.success('Pedido aprovado com sucesso');
      utils.volantes.calendarioConsolidado.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const reprovarMutation = trpc.volantes.gestorReprovarPedido.useMutation({
    onSuccess: () => {
      toast.success('Pedido reprovado');
      utils.volantes.calendarioConsolidado.invalidate();
      setShowReprovarDialog(null);
      setMotivoReprovar('');
    },
    onError: (err) => toast.error(err.message),
  });

  const anularPedidoMutation = trpc.volantes.gestorAnularPedido.useMutation({
    onSuccess: () => {
      toast.success('Pedido anulado');
      utils.volantes.calendarioConsolidado.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const eliminarAgendamentoMutation = trpc.volantes.gestorEliminarAgendamento.useMutation({
    onSuccess: () => {
      toast.success('Agendamento removido');
      utils.volantes.calendarioConsolidado.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const eliminarBloqueioMutation = trpc.volantes.gestorEliminarBloqueio.useMutation({
    onSuccess: () => {
      toast.success('Bloqueio removido');
      utils.volantes.calendarioConsolidado.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const criarAgendamentoMutation = trpc.volantes.gestorCriarAgendamento.useMutation({
    onSuccess: () => {
      toast.success('Agendamento criado');
      utils.volantes.calendarioConsolidado.invalidate();
      setShowCriarDialog(null);
      setCriarForm({ lojaId: '', periodo: 'dia_todo', tipo: '', observacoes: '', motivo: '' });
    },
    onError: (err) => toast.error(err.message),
  });

  const criarBloqueioMutation = trpc.volantes.gestorCriarBloqueio.useMutation({
    onSuccess: () => {
      toast.success('Bloqueio criado');
      utils.volantes.calendarioConsolidado.invalidate();
      setShowCriarDialog(null);
      setCriarForm({ lojaId: '', periodo: 'dia_todo', tipo: '', observacoes: '', motivo: '' });
    },
    onError: (err) => toast.error(err.message),
  });

  // Gerar dias do mês
  const diasDoMes = useMemo(() => {
    const primeiroDia = new Date(mesSelecionado.ano, mesSelecionado.mes, 1);
    const ultimoDia = new Date(mesSelecionado.ano, mesSelecionado.mes + 1, 0);
    const jsDay = primeiroDia.getDay();
    const diasVazios = jsDay === 0 ? 0 : (jsDay === 1 ? 0 : jsDay - 1);
    const dias: (Date | null)[] = [];
    for (let i = 0; i < diasVazios; i++) dias.push(null);
    for (let d = 1; d <= ultimoDia.getDate(); d++) {
      const dia = new Date(mesSelecionado.ano, mesSelecionado.mes, d);
      if (dia.getDay() !== 0) dias.push(dia);
    }
    return dias;
  }, [mesSelecionado]);

  const nomeMes = new Date(mesSelecionado.ano, mesSelecionado.mes).toLocaleDateString('pt-PT', {
    month: 'long', year: 'numeric',
  });

  const mesAnterior = () => {
    setMesSelecionado(prev => prev.mes === 0 ? { mes: 11, ano: prev.ano - 1 } : { mes: prev.mes - 1, ano: prev.ano });
  };
  const mesProximo = () => {
    setMesSelecionado(prev => prev.mes === 11 ? { mes: 0, ano: prev.ano + 1 } : { mes: prev.mes + 1, ano: prev.ano });
  };

  const getDataStr = (data: Date) => {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
  };

  const isHoje = (data: Date) => {
    return data.getDate() === hoje.getDate() && data.getMonth() === hoje.getMonth() && data.getFullYear() === hoje.getFullYear();
  };

  const dadosDiaDetalhe = diaDetalhe ? calendario[diaDetalhe] : null;

  const getEstadoInfo = (estado: string) => ESTADO_CORES[estado] || ESTADO_CORES.livre;

  const estatisticas = useMemo(() => {
    if (!volantes.length) return null;
    return volantes.map((v, idx) => {
      let diasOcupados = 0, diasLivres = 0, pedidosPendentes = 0;
      Object.entries(calendario).forEach(([_, dia]) => {
        const ev = dia.porVolante?.[v.id];
        if (ev) {
          if (ev.estado === 'dia_completo' || ev.estado === 'bloqueado') diasOcupados++;
          else if (ev.estado === 'livre') diasLivres++;
          pedidosPendentes += (ev.pedidos || []).filter((p: any) => p.estado === 'pendente').length;
        }
      });
      return { ...v, cor: CORES_VOLANTE[idx % CORES_VOLANTE.length], diasOcupados, diasLivres, pedidosPendentes };
    });
  }, [volantes, calendario]);

  const handleCriarSubmit = () => {
    if (!showCriarDialog) return;
    if (showCriarDialog.tipo === 'agendamento') {
      if (!criarForm.lojaId || !criarForm.tipo) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }
      criarAgendamentoMutation.mutate({
        volanteId: showCriarDialog.volanteId,
        lojaId: parseInt(criarForm.lojaId),
        data: showCriarDialog.data,
        periodo: criarForm.periodo as any,
        tipo: criarForm.tipo as any,
        observacoes: criarForm.observacoes || undefined,
      });
    } else {
      if (!criarForm.tipo) {
        toast.error('Selecione o tipo de bloqueio');
        return;
      }
      criarBloqueioMutation.mutate({
        volanteId: showCriarDialog.volanteId,
        data: showCriarDialog.data,
        periodo: criarForm.periodo as any,
        tipo: criarForm.tipo as any,
        motivo: criarForm.motivo || undefined,
      });
    }
  };

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
              Gestão da ocupação de todos os volantes
            </p>
          </div>
        </div>

        {/* Estatísticas por volante */}
        {estatisticas && estatisticas.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {estatisticas.map((stat) => (
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
          </div>
        )}

        {/* Legenda */}
        {volantes.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-medium text-muted-foreground">Legenda:</span>
            {volantes.map((v, idx) => (
              <div key={v.id} className="flex items-center gap-1">
                <div className={`w-2.5 h-2.5 rounded-full ${CORES_VOLANTE[idx % CORES_VOLANTE.length].dot}`} />
                <span>{v.nome}</span>
              </div>
            ))}
            <span className="text-muted-foreground">|</span>
            {[
              { bg: 'bg-green-200', label: 'Livre' },
              { bg: 'bg-yellow-200', label: 'Pendente' },
              { bg: 'bg-red-300', label: 'Ocupado' },
              { bg: 'bg-gray-400', label: 'Bloqueado' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1">
                <div className={`w-2.5 h-2.5 rounded ${l.bg}`} />
                <span>{l.label}</span>
              </div>
            ))}
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
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="grid grid-cols-6 gap-1 mb-1">
                  {DIAS_SEMANA.map(dia => (
                    <div key={dia} className="text-center text-xs font-semibold text-muted-foreground py-1">{dia}</div>
                  ))}
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {diasDoMes.map((data, idx) => {
                    if (!data) return <div key={`empty-${idx}`} className="min-h-[80px]" />;
                    const dataStr = getDataStr(data);
                    const dadosDia = calendario[dataStr];
                    const ehHoje = isHoje(data);
                    const ehPassado = data < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
                    return (
                      <div
                        key={dataStr}
                        onClick={() => setDiaDetalhe(dataStr)}
                        className={`min-h-[80px] rounded-lg border p-1 transition-all cursor-pointer hover:shadow-md
                          ${ehHoje ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'}
                          ${ehPassado ? 'opacity-50' : ''}
                          ${dadosDia?.combinado === 'dia_completo' ? 'bg-red-50' : dadosDia?.combinado === 'bloqueado' ? 'bg-gray-100' : 'bg-white'}
                        `}
                      >
                        <div className={`text-xs font-bold mb-1 ${ehHoje ? 'text-blue-600' : 'text-gray-700'}`}>
                          {data.getDate()}
                        </div>
                        {volantes.length > 0 && (
                          <div className="space-y-0.5">
                            {volantes.map((v, vIdx) => {
                              const estado = dadosDia?.porVolante?.[v.id]?.estado || 'livre';
                              const info = getEstadoInfo(estado);
                              const cor = CORES_VOLANTE[vIdx % CORES_VOLANTE.length];
                              return (
                                <div key={v.id} className={`flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] ${info.bg}`}>
                                  <div className={`w-1.5 h-1.5 rounded-full ${cor.dot} flex-shrink-0`} />
                                  <span className="truncate font-medium">{v.nome.split(' ')[0]}</span>
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

        {/* ========== DIALOG DETALHE DO DIA ========== */}
        <Dialog open={!!diaDetalhe} onOpenChange={(open) => !open && setDiaDetalhe(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                {diaDetalhe && new Date(diaDetalhe + 'T12:00:00').toLocaleDateString('pt-PT', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                })}
              </DialogTitle>
            </DialogHeader>

            {diaDetalhe && (
              <div className="space-y-4">
                {/* Estado combinado */}
                {dadosDiaDetalhe && (
                  <div className={`rounded-lg p-2 text-center ${getEstadoInfo(dadosDiaDetalhe.combinado).bg}`}>
                    <span className="font-semibold text-sm">
                      Estado combinado: {getEstadoInfo(dadosDiaDetalhe.combinado).label}
                    </span>
                  </div>
                )}

                {/* Detalhe por volante */}
                {volantes.map((v, vIdx) => {
                  const estadoVolante = dadosDiaDetalhe?.porVolante?.[v.id];
                  const info = getEstadoInfo(estadoVolante?.estado || 'livre');
                  const cor = CORES_VOLANTE[vIdx % CORES_VOLANTE.length];
                  const pedidos = estadoVolante?.pedidos || [];
                  const bloqueios = estadoVolante?.bloqueios || [];
                  const agendamentos = estadoVolante?.agendamentos || [];

                  return (
                    <Card key={v.id} className={`border-l-4 ${cor.border}`}>
                      <CardContent className="p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${cor.dot}`} />
                            <span className="font-semibold">{v.nome}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={info.bg}>
                              {info.emoji} {info.label}
                            </Badge>
                            {/* Botões de ação rápida */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => {
                                setShowCriarDialog({ tipo: 'agendamento', volanteId: v.id, data: diaDetalhe });
                                setCriarForm({ lojaId: '', periodo: 'dia_todo', tipo: '', observacoes: '', motivo: '' });
                              }}
                            >
                              <Plus className="h-3 w-3" /> Agendar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => {
                                setShowCriarDialog({ tipo: 'bloqueio', volanteId: v.id, data: diaDetalhe });
                                setCriarForm({ lojaId: '', periodo: 'dia_todo', tipo: '', observacoes: '', motivo: '' });
                              }}
                            >
                              <Ban className="h-3 w-3" /> Bloquear
                            </Button>
                          </div>
                        </div>

                        {/* Pedidos */}
                        {pedidos.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Pedidos de apoio
                            </div>
                            {pedidos.map((p: any) => (
                              <div key={p.id} className="text-xs bg-gray-50 rounded p-2 space-y-1">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="font-medium">{p.loja?.nome || p.lojaNome || `Loja #${p.lojaId}`}</span>
                                    <span className="text-muted-foreground ml-2">
                                      {p.periodo === 'manha' ? '☀ Manhã' : p.periodo === 'tarde' ? '🌙 Tarde' : '📅 Dia todo'}
                                    </span>
                                    {p.tipoApoio && (
                                      <span className="text-muted-foreground ml-1">
                                        ({p.tipoApoio === 'cobertura_ferias' ? 'Cobertura férias' : p.tipoApoio === 'substituicao_vidros' ? 'Substituição vidros' : 'Outro'})
                                      </span>
                                    )}
                                  </div>
                                  <Badge variant={p.estado === 'aprovado' ? 'default' : p.estado === 'pendente' ? 'secondary' : 'destructive'} className="text-[10px]">
                                    {p.estado}
                                  </Badge>
                                </div>
                                {p.observacoes && (
                                  <div className="text-muted-foreground italic">"{p.observacoes}"</div>
                                )}
                                {/* Ações do gestor */}
                                <div className="flex gap-1 pt-1">
                                  {p.estado === 'pendente' && (
                                    <>
                                      <Button
                                        size="sm"
                                        className="h-6 text-[10px] gap-1 bg-green-600 hover:bg-green-700"
                                        onClick={() => aprovarMutation.mutate({ pedidoId: p.id })}
                                        disabled={aprovarMutation.isPending}
                                      >
                                        <Check className="h-3 w-3" /> Aprovar
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="h-6 text-[10px] gap-1"
                                        onClick={() => setShowReprovarDialog(p.id)}
                                        disabled={reprovarMutation.isPending}
                                      >
                                        <X className="h-3 w-3" /> Reprovar
                                      </Button>
                                    </>
                                  )}
                                  {p.estado === 'aprovado' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 text-[10px] gap-1 text-orange-600 border-orange-300"
                                      onClick={() => {
                                        if (confirm('Tem a certeza que quer anular este pedido aprovado?')) {
                                          anularPedidoMutation.mutate({ pedidoId: p.id, motivo: 'Anulado pelo gestor' });
                                        }
                                      }}
                                      disabled={anularPedidoMutation.isPending}
                                    >
                                      <Ban className="h-3 w-3" /> Anular
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Agendamentos */}
                        {agendamentos.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> Agendamentos
                            </div>
                            {agendamentos.map((a: any) => (
                              <div key={a.id || a.agendamento_volante_id} className="text-xs bg-blue-50 rounded p-2 flex items-center justify-between">
                                <div>
                                  <span className="font-medium">{a.loja?.nome || `Loja #${a.lojaId}`}</span>
                                  <span className="text-muted-foreground ml-2">
                                    {(a.agendamento_volante_periodo || a.periodo) === 'manha' ? '☀ Manhã' :
                                     (a.agendamento_volante_periodo || a.periodo) === 'tarde' ? '🌙 Tarde' : '📅 Dia todo'}
                                  </span>
                                  {(a.agendamento_volante_tipo || a.tipo) && (
                                    <span className="text-muted-foreground ml-1">({a.agendamento_volante_tipo || a.tipo})</span>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    if (confirm('Remover este agendamento?')) {
                                      eliminarAgendamentoMutation.mutate({
                                        agendamentoId: a.id || a.agendamento_volante_id,
                                        volanteId: v.id,
                                      });
                                    }
                                  }}
                                  disabled={eliminarAgendamentoMutation.isPending}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Bloqueios */}
                        {bloqueios.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Bloqueios
                            </div>
                            {bloqueios.map((b: any) => (
                              <div key={b.id} className="text-xs bg-gray-100 rounded p-2 flex items-center justify-between">
                                <div>
                                  <span className="font-medium">
                                    {b.periodo === 'manha' ? '☀ Manhã' : b.periodo === 'tarde' ? '🌙 Tarde' : '📅 Dia todo'}
                                  </span>
                                  {b.tipo && <span className="text-muted-foreground ml-2">({b.tipo})</span>}
                                  {b.motivo && <span className="text-muted-foreground ml-1">— {b.motivo}</span>}
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    if (confirm('Remover este bloqueio?')) {
                                      eliminarBloqueioMutation.mutate({ bloqueioId: b.id, volanteId: v.id });
                                    }
                                  }}
                                  disabled={eliminarBloqueioMutation.isPending}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
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

        {/* ========== DIALOG REPROVAR PEDIDO ========== */}
        <Dialog open={!!showReprovarDialog} onOpenChange={(open) => !open && setShowReprovarDialog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Reprovar Pedido</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Motivo (opcional)</Label>
                <Textarea
                  value={motivoReprovar}
                  onChange={(e) => setMotivoReprovar(e.target.value)}
                  placeholder="Motivo da reprovação..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReprovarDialog(null)}>Cancelar</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (showReprovarDialog) {
                    reprovarMutation.mutate({ pedidoId: showReprovarDialog, motivo: motivoReprovar || undefined });
                  }
                }}
                disabled={reprovarMutation.isPending}
              >
                Reprovar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ========== DIALOG CRIAR AGENDAMENTO/BLOQUEIO ========== */}
        <Dialog open={!!showCriarDialog} onOpenChange={(open) => !open && setShowCriarDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {showCriarDialog?.tipo === 'agendamento' ? '➕ Novo Agendamento' : '🚫 Novo Bloqueio'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <strong>Volante:</strong> {volantes.find(v => v.id === showCriarDialog?.volanteId)?.nome}
                <br />
                <strong>Data:</strong> {showCriarDialog?.data && new Date(showCriarDialog.data + 'T12:00:00').toLocaleDateString('pt-PT', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </div>

              <div>
                <Label>Período</Label>
                <Select value={criarForm.periodo} onValueChange={(v) => setCriarForm(f => ({ ...f, periodo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dia_todo">Dia Todo</SelectItem>
                    <SelectItem value="manha">Manhã (9h-13h)</SelectItem>
                    <SelectItem value="tarde">Tarde (14h-18h)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {showCriarDialog?.tipo === 'agendamento' ? (
                <>
                  <div>
                    <Label>Loja *</Label>
                    <Select value={criarForm.lojaId} onValueChange={(v) => setCriarForm(f => ({ ...f, lojaId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecionar loja..." /></SelectTrigger>
                      <SelectContent>
                        {(lojasVolante || []).map((l: any) => (
                          <SelectItem key={l.id} value={String(l.id)}>{l.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo *</Label>
                    <Select value={criarForm.tipo} onValueChange={(v) => setCriarForm(f => ({ ...f, tipo: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecionar tipo..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="substituicao">Substituição</SelectItem>
                        <SelectItem value="reparacao">Reparação</SelectItem>
                        <SelectItem value="entrega">Entrega</SelectItem>
                        <SelectItem value="recolha">Recolha</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Textarea
                      value={criarForm.observacoes}
                      onChange={(e) => setCriarForm(f => ({ ...f, observacoes: e.target.value }))}
                      placeholder="Observações..."
                      rows={2}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label>Tipo de Bloqueio *</Label>
                    <Select value={criarForm.tipo} onValueChange={(v) => setCriarForm(f => ({ ...f, tipo: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecionar tipo..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ferias">Férias</SelectItem>
                        <SelectItem value="falta">Falta</SelectItem>
                        <SelectItem value="formacao">Formação</SelectItem>
                        <SelectItem value="pessoal">Pessoal</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Motivo</Label>
                    <Textarea
                      value={criarForm.motivo}
                      onChange={(e) => setCriarForm(f => ({ ...f, motivo: e.target.value }))}
                      placeholder="Motivo do bloqueio..."
                      rows={2}
                    />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCriarDialog(null)}>Cancelar</Button>
              <Button
                onClick={handleCriarSubmit}
                disabled={criarAgendamentoMutation.isPending || criarBloqueioMutation.isPending}
              >
                {showCriarDialog?.tipo === 'agendamento' ? 'Criar Agendamento' : 'Criar Bloqueio'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
