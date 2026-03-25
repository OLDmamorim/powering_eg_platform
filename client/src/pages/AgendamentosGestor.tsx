import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, Edit, X,
  Store, AlertCircle, Palette,
} from "lucide-react";

type TipoServico = "PB" | "LT" | "OC" | "REP" | "POL";
type EstadoVidro = "nao_encomendado" | "encomendado" | "terminado";
type Periodo = "manha" | "tarde";

interface AgendamentoLoja {
  id: number;
  lojaId: number;
  lojaNome?: string;
  matricula: string;
  viatura?: string | null;
  tipoServico: TipoServico;
  localidade?: string | null;
  data?: string | null;
  periodo?: Periodo | null;
  estadoVidro: EstadoVidro;
  morada?: string | null;
  telefone?: string | null;
  notas?: string | null;
  obraNo?: number | null;
}

interface LocalidadeAgendamento {
  id: number;
  nome: string;
  cor: string;
}

const TIPO_COLORS: Record<TipoServico, string> = {
  PB: "bg-blue-500",
  LT: "bg-purple-500",
  OC: "bg-orange-500",
  REP: "bg-green-500",
  POL: "bg-pink-500",
};

const ESTADO_LABELS: Record<EstadoVidro, string> = {
  nao_encomendado: "N/E",
  encomendado: "V/E",
  terminado: "ST",
};

const ESTADO_COLORS: Record<EstadoVidro, string> = {
  nao_encomendado: "bg-red-500",
  encomendado: "bg-yellow-500",
  terminado: "bg-green-500",
};

const DEFAULT_COLORS = [
  "#3B82F6", "#8B5CF6", "#F59E0B", "#10B981", "#EF4444",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
];

function getWeekDates(baseDate: Date): Date[] {
  const monday = new Date(baseDate);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatDatePT(d: Date): string {
  return d.toLocaleDateString("pt-PT", { weekday: "short", day: "2-digit", month: "2-digit" });
}

export default function AgendamentosGestor() {
  const [weekBase, setWeekBase] = useState(new Date());
  const [lojaFiltro, setLojaFiltro] = useState<string>("todas");
  const [showLocalidades, setShowLocalidades] = useState(false);
  const [novaLocalidadeNome, setNovaLocalidadeNome] = useState("");
  const [novaLocalidadeCor, setNovaLocalidadeCor] = useState(DEFAULT_COLORS[0]);
  const [editandoLocalidade, setEditandoLocalidade] = useState<LocalidadeAgendamento | null>(null);

  const weekDates = useMemo(() => getWeekDates(weekBase), [weekBase]);

  const { data: agendamentos = [], refetch: refetchAg } = trpc.agendamentos.listarTodos.useQuery(
    undefined,
    { refetchInterval: 60000 }
  );

  const { data: localidades = [], refetch: refetchLoc } = trpc.agendamentos.listarLocalidades.useQuery({});

  const criarLocalidadeMutation = trpc.agendamentos.criarLocalidade.useMutation({
    onSuccess: () => {
      refetchLoc();
      setNovaLocalidadeNome("");
      setNovaLocalidadeCor(DEFAULT_COLORS[0]);
      toast.success("Localidade criada!");
    },
    onError: (e) => toast.error(e.message),
  });

  const atualizarLocalidadeMutation = trpc.agendamentos.apagarLocalidade.useMutation({
    onSuccess: () => {
      refetchLoc();
      setEditandoLocalidade(null);
      toast.success("Localidade actualizada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const eliminarLocalidadeMutation = trpc.agendamentos.apagarLocalidade.useMutation({
    onSuccess: () => { refetchLoc(); toast.success("Localidade eliminada!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const getLocalidadeCor = (nome?: string | null) => {
    if (!nome) return "#9CA3AF";
    const loc = (localidades as LocalidadeAgendamento[]).find(l => l.nome === nome);
    return loc?.cor || "#9CA3AF";
  };

  // Filtrar por loja
  const agFiltrados = useMemo(() => {
    const ags = agendamentos as unknown as AgendamentoLoja[];
    if (lojaFiltro === "todas") return ags;
    return ags.filter(ag => ag.lojaId.toString() === lojaFiltro);
  }, [agendamentos, lojaFiltro]);

  // Lojas únicas
  const lojas = useMemo(() => {
    const map = new Map<number, string>();
    for (const ag of agendamentos as unknown as AgendamentoLoja[]) {
      if (ag.lojaId && ag.lojaNome) map.set(ag.lojaId, ag.lojaNome);
    }
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [agendamentos]);

  // Agrupar por slot
  const agBySlot = useMemo(() => {
    const map: Record<string, AgendamentoLoja[]> = {};
    for (const ag of agFiltrados) {
      if (ag.data && ag.periodo) {
        const key = `${ag.data}_${ag.periodo}`;
        if (!map[key]) map[key] = [];
        map[key].push(ag);
      }
    }
    return map;
  }, [agFiltrados]);

  const porAgendar = useMemo(() =>
    agFiltrados.filter(ag => !ag.data || !ag.periodo),
    [agFiltrados]
  );

  const AgCardGestor = ({ ag }: { ag: AgendamentoLoja }) => (
    <div
      className="rounded p-1.5 mb-1 text-white text-xs"
      style={{ backgroundColor: getLocalidadeCor(ag.localidade) }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-bold truncate">{ag.matricula}</span>
        <span className={`rounded px-1 text-[10px] font-bold text-white ${TIPO_COLORS[ag.tipoServico]}`}>{ag.tipoServico}</span>
      </div>
      {ag.lojaNome && <div className="text-[10px] opacity-80 truncate flex items-center gap-0.5"><Store className="h-2.5 w-2.5" />{ag.lojaNome}</div>}
      {ag.viatura && <div className="truncate opacity-90 text-[11px]">{ag.viatura}</div>}
      <div className="flex items-center gap-1 mt-1">
        <span className={`rounded px-1 py-0.5 text-[10px] font-bold ${ESTADO_COLORS[ag.estadoVidro]}`}>{ESTADO_LABELS[ag.estadoVidro]}</span>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-4 p-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-indigo-500" />
            Agendamentos das Lojas
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowLocalidades(true)}>
              <Palette className="h-4 w-4 mr-1" /> Gerir Localidades
            </Button>
          </div>
        </div>

        {/* Filtro loja + navegação semana */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={lojaFiltro} onValueChange={setLojaFiltro}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todas as lojas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as lojas</SelectItem>
              {lojas.map(l => (
                <SelectItem key={l.id} value={l.id.toString()}>{l.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 ml-auto">
            <Button variant="outline" size="sm" onClick={() => {
              const d = new Date(weekBase);
              d.setDate(d.getDate() - 7);
              setWeekBase(d);
            }}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-2">
              {weekDates[0].toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })} – {weekDates[5].toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
            <Button variant="outline" size="sm" onClick={() => setWeekBase(new Date())}>Hoje</Button>
            <Button variant="outline" size="sm" onClick={() => {
              const d = new Date(weekBase);
              d.setDate(d.getDate() + 7);
              setWeekBase(d);
            }}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendário */}
        <div className="overflow-x-auto">
          <div className="grid grid-cols-6 gap-1 min-w-[700px]">
            {weekDates.map((date) => {
              const dateStr = formatDate(date);
              const isToday = dateStr === formatDate(new Date());
              return (
                <div key={dateStr} className={`rounded-lg border ${isToday ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950" : "border-border bg-card"}`}>
                  <div className={`text-center text-xs font-bold py-1 rounded-t-lg ${isToday ? "bg-indigo-500 text-white" : "bg-muted"}`}>
                    {formatDatePT(date)}
                  </div>
                  {/* Manhã */}
                  <div className="min-h-[80px] p-1 border-b border-dashed border-border">
                    <div className="text-[10px] text-muted-foreground mb-1 font-medium">☀️ Manhã</div>
                    {(agBySlot[`${dateStr}_manha`] || []).map(ag => <AgCardGestor key={ag.id} ag={ag} />)}
                  </div>
                  {/* Tarde */}
                  <div className="min-h-[80px] p-1">
                    <div className="text-[10px] text-muted-foreground mb-1 font-medium">🌆 Tarde</div>
                    {(agBySlot[`${dateStr}_tarde`] || []).map(ag => <AgCardGestor key={ag.id} ag={ag} />)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Por agendar */}
        {porAgendar.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                Serviços por Agendar ({porAgendar.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {porAgendar.map(ag => (
                  <div key={ag.id} className="flex items-center gap-2 p-2 rounded border border-border bg-muted/30">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: getLocalidadeCor(ag.localidade) }} />
                    <span className="font-bold text-sm">{ag.matricula}</span>
                    <Badge className={`text-white text-xs ${TIPO_COLORS[ag.tipoServico]}`}>{ag.tipoServico}</Badge>
                    {ag.lojaNome && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Store className="h-3 w-3" />{ag.lojaNome}</span>}
                    {ag.viatura && <span className="text-xs text-muted-foreground truncate">{ag.viatura}</span>}
                    <Badge className={`ml-auto text-white text-xs ${ESTADO_COLORS[ag.estadoVidro]}`}>{ESTADO_LABELS[ag.estadoVidro]}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legenda localidades */}
        {(localidades as LocalidadeAgendamento[]).length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {(localidades as LocalidadeAgendamento[]).map(loc => (
              <div key={loc.id} className="flex items-center gap-1 text-xs">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: loc.cor }} />
                <span>{loc.nome}</span>
              </div>
            ))}
          </div>
        )}

        {/* Dialog Gerir Localidades */}
        <Dialog open={showLocalidades} onOpenChange={setShowLocalidades}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-indigo-500" />
                Gerir Localidades
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Lista de localidades */}
              <div className="space-y-2">
                {(localidades as LocalidadeAgendamento[]).map(loc => (
                  <div key={loc.id} className="flex items-center gap-2 p-2 rounded border border-border">
                    {editandoLocalidade?.id === loc.id ? (
                      <>
                        <input
                          type="color"
                          value={editandoLocalidade.cor}
                          onChange={e => setEditandoLocalidade(l => l ? { ...l, cor: e.target.value } : l)}
                          className="w-8 h-8 rounded cursor-pointer border-0"
                        />
                        <Input
                          value={editandoLocalidade.nome}
                          onChange={e => setEditandoLocalidade(l => l ? { ...l, nome: e.target.value } : l)}
                          className="flex-1 h-8"
                        />
                        <Button size="sm" className="h-8" onClick={() => {
                          if (!editandoLocalidade.nome.trim()) return;
                          atualizarLocalidadeMutation.mutate({ id: editandoLocalidade.id });
                        }}>Guardar</Button>
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditandoLocalidade(null)}><X className="h-3 w-3" /></Button>
                      </>
                    ) : (
                      <>
                        <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: loc.cor }} />
                        <span className="flex-1 text-sm">{loc.nome}</span>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditandoLocalidade({ ...loc })}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-500"
                          onClick={() => { if (confirm(`Eliminar "${loc.nome}"?`)) eliminarLocalidadeMutation.mutate({ id: loc.id }); }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
                {(localidades as LocalidadeAgendamento[]).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Sem localidades criadas</p>
                )}
              </div>

              {/* Criar nova localidade */}
              <div className="border-t pt-4">
                <Label className="text-sm font-medium mb-2 block">Nova Localidade</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={novaLocalidadeCor}
                    onChange={e => setNovaLocalidadeCor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-border"
                  />
                  <Input
                    value={novaLocalidadeNome}
                    onChange={e => setNovaLocalidadeNome(e.target.value)}
                    placeholder="Nome da localidade (ex: Braga)"
                    onKeyDown={e => e.key === "Enter" && novaLocalidadeNome.trim() && criarLocalidadeMutation.mutate({ nome: novaLocalidadeNome.trim(), cor: novaLocalidadeCor })}
                  />
                  <Button
                    size="sm"
                    onClick={() => novaLocalidadeNome.trim() && criarLocalidadeMutation.mutate({ nome: novaLocalidadeNome.trim(), cor: novaLocalidadeCor })}
                    disabled={!novaLocalidadeNome.trim() || criarLocalidadeMutation.isPending}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {/* Cores rápidas */}
                <div className="flex gap-1 mt-2 flex-wrap">
                  {DEFAULT_COLORS.map(cor => (
                    <button
                      key={cor}
                      className={`w-6 h-6 rounded-full border-2 ${novaLocalidadeCor === cor ? "border-foreground" : "border-transparent"}`}
                      style={{ backgroundColor: cor }}
                      onClick={() => setNovaLocalidadeCor(cor)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
