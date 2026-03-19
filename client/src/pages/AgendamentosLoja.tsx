import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, ChevronLeft, ChevronRight, Edit, X,
  CalendarDays, AlertCircle,
} from "lucide-react";

type TipoServico = "PB" | "LT" | "OC" | "REP" | "POL";
type EstadoVidro = "nao_encomendado" | "encomendado" | "terminado";
type Periodo = "manha" | "tarde";

interface AgendamentoLoja {
  id: number;
  lojaId: number;
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
  extra?: string | null;
  km?: number | null;
  sortIndex: number;
  obraNo?: number | null;
  createdAt: Date;
}

interface LocalidadeAgendamento {
  id: number;
  nome: string;
  cor: string;
}

interface Props {
  token: string;
  language: "pt" | "en";
}

const TIPO_LABELS: Record<TipoServico, string> = {
  PB: "Para-brisas",
  LT: "Lateral",
  OC: "Óculo",
  REP: "Reparação",
  POL: "Polimento",
};

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

const emptyForm = {
  matricula: "",
  viatura: "",
  tipoServico: "PB" as TipoServico,
  localidade: "",
  data: "",
  periodo: "" as Periodo | "",
  estadoVidro: "nao_encomendado" as EstadoVidro,
  morada: "",
  telefone: "",
  notas: "",
  extra: "",
  km: "",
  obraNo: "",
};

export default function AgendamentosLoja({ token, language }: Props) {
  const [weekBase, setWeekBase] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ data: string; periodo: Periodo } | null>(null);

  const weekDates = useMemo(() => getWeekDates(weekBase), [weekBase]);

  const { data: agendamentos = [], refetch } = trpc.agendamentos.listarPorLoja.useQuery(
    { token },
    { enabled: !!token }
  );

  const { data: localidades = [] } = trpc.agendamentos.listarLocalidades.useQuery(
    { token },
    { enabled: !!token }
  );

  const criarMutation = trpc.agendamentos.criar.useMutation({
    onSuccess: () => {
      refetch();
      setForm({ ...emptyForm });
      setShowForm(false);
      toast.success("Serviço criado!");
    },
    onError: (e) => toast.error(e.message),
  });

  const atualizarMutation = trpc.agendamentos.atualizar.useMutation({
    onSuccess: () => {
      refetch();
      setForm({ ...emptyForm });
      setEditingId(null);
      setShowForm(false);
      toast.success("Serviço actualizado!");
    },
    onError: (e) => toast.error(e.message),
  });

  const anularMutation = trpc.agendamentos.anular.useMutation({
    onSuccess: () => { refetch(); toast.success("Serviço anulado!"); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.matricula.trim()) return toast.error("Matrícula obrigatória");
    const payload = {
      token,
      matricula: form.matricula.trim().toUpperCase(),
      viatura: form.viatura || undefined,
      tipoServico: form.tipoServico,
      localidade: form.localidade || undefined,
      data: form.data || undefined,
      periodo: (form.periodo as Periodo) || undefined,
      estadoVidro: form.estadoVidro,
      morada: form.morada || undefined,
      telefone: form.telefone || undefined,
      notas: form.notas || undefined,
      extra: form.extra || undefined,
      km: form.km ? parseInt(form.km) : undefined,
      obraNo: form.obraNo ? parseInt(form.obraNo) : undefined,
    };
    if (editingId) {
      atualizarMutation.mutate({ ...payload, id: editingId });
    } else {
      criarMutation.mutate(payload);
    }
  };

  const handleEdit = (ag: AgendamentoLoja) => {
    setForm({
      matricula: ag.matricula,
      viatura: ag.viatura || "",
      tipoServico: ag.tipoServico,
      localidade: ag.localidade || "",
      data: ag.data || "",
      periodo: ag.periodo || "",
      estadoVidro: ag.estadoVidro,
      morada: ag.morada || "",
      telefone: ag.telefone || "",
      notas: ag.notas || "",
      extra: ag.extra || "",
      km: ag.km?.toString() || "",
      obraNo: ag.obraNo?.toString() || "",
    });
    setEditingId(ag.id);
    setShowForm(true);
  };

  const handleEstadoVidro = (ag: AgendamentoLoja, estado: EstadoVidro) => {
    atualizarMutation.mutate({ token, id: ag.id, estadoVidro: estado });
  };

  const handleDragStart = (id: number) => setDraggedId(id);
  const handleDragOver = (e: React.DragEvent, data: string, periodo: Periodo) => {
    e.preventDefault();
    setDropTarget({ data, periodo });
  };
  const handleDrop = (data: string, periodo: Periodo) => {
    if (draggedId === null) return;
    atualizarMutation.mutate({ token, id: draggedId, data, periodo });
    setDraggedId(null);
    setDropTarget(null);
  };

  const agBySlot = useMemo(() => {
    const map: Record<string, AgendamentoLoja[]> = {};
    for (const ag of agendamentos as AgendamentoLoja[]) {
      if (ag.data && ag.periodo) {
        const key = `${ag.data}_${ag.periodo}`;
        if (!map[key]) map[key] = [];
        map[key].push(ag);
      }
    }
    return map;
  }, [agendamentos]);

  const porAgendar = useMemo(() =>
    (agendamentos as AgendamentoLoja[]).filter(ag => !ag.data || !ag.periodo),
    [agendamentos]
  );

  const getLocalidadeCor = (nome?: string | null) => {
    if (!nome) return "#9CA3AF";
    const loc = (localidades as LocalidadeAgendamento[]).find(l => l.nome === nome);
    return loc?.cor || "#9CA3AF";
  };

  const AgCard = ({ ag }: { ag: AgendamentoLoja }) => (
    <div
      draggable
      onDragStart={() => handleDragStart(ag.id)}
      className="rounded p-1.5 mb-1 cursor-grab text-white text-xs select-none"
      style={{ backgroundColor: getLocalidadeCor(ag.localidade), opacity: draggedId === ag.id ? 0.5 : 1 }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-bold truncate">{ag.matricula}</span>
        <span className={`rounded px-1 text-[10px] font-bold text-white ${TIPO_COLORS[ag.tipoServico]}`}>{ag.tipoServico}</span>
      </div>
      {ag.viatura && <div className="truncate opacity-90 text-[11px]">{ag.viatura}</div>}
      <div className="flex items-center gap-1 mt-1">
        {(["nao_encomendado", "encomendado", "terminado"] as EstadoVidro[]).map(estado => (
          <button
            key={estado}
            onClick={() => handleEstadoVidro(ag, estado)}
            className={`rounded px-1 py-0.5 text-[10px] font-bold border border-white/30 ${ag.estadoVidro === estado ? ESTADO_COLORS[estado] : "bg-white/20"}`}
          >
            {ESTADO_LABELS[estado]}
          </button>
        ))}
        <button onClick={() => handleEdit(ag)} className="ml-auto opacity-70 hover:opacity-100">
          <Edit className="h-3 w-3" />
        </button>
        <button
          onClick={() => { if (confirm("Anular este serviço?")) anularMutation.mutate({ token, id: ag.id }); }}
          className="opacity-70 hover:opacity-100"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-blue-500" />
          Agendamentos
        </h2>
        <Button size="sm" onClick={() => { setForm({ ...emptyForm }); setEditingId(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo Serviço
        </Button>
      </div>

      {/* Navegação semana */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => {
          const d = new Date(weekBase);
          d.setDate(d.getDate() - 7);
          setWeekBase(d);
        }}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium flex-1 text-center">
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

      {/* Calendário semanal */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-6 gap-1 min-w-[600px]">
          {weekDates.map((date) => {
            const dateStr = formatDate(date);
            const isToday = dateStr === formatDate(new Date());
            return (
              <div key={dateStr} className={`rounded-lg border ${isToday ? "border-blue-400 bg-blue-50 dark:bg-blue-950" : "border-border bg-card"}`}>
                <div className={`text-center text-xs font-bold py-1 rounded-t-lg ${isToday ? "bg-blue-500 text-white" : "bg-muted"}`}>
                  {formatDatePT(date)}
                </div>
                {/* Manhã */}
                <div
                  className={`min-h-[80px] p-1 border-b border-dashed border-border ${dropTarget?.data === dateStr && dropTarget?.periodo === "manha" ? "bg-blue-100 dark:bg-blue-900" : ""}`}
                  onDragOver={(e) => handleDragOver(e, dateStr, "manha")}
                  onDrop={() => handleDrop(dateStr, "manha")}
                  onDragLeave={() => setDropTarget(null)}
                >
                  <div className="text-[10px] text-muted-foreground mb-1 font-medium">☀️ Manhã</div>
                  {(agBySlot[`${dateStr}_manha`] || []).map(ag => <AgCard key={ag.id} ag={ag} />)}
                </div>
                {/* Tarde */}
                <div
                  className={`min-h-[80px] p-1 ${dropTarget?.data === dateStr && dropTarget?.periodo === "tarde" ? "bg-orange-100 dark:bg-orange-900" : ""}`}
                  onDragOver={(e) => handleDragOver(e, dateStr, "tarde")}
                  onDrop={() => handleDrop(dateStr, "tarde")}
                  onDragLeave={() => setDropTarget(null)}
                >
                  <div className="text-[10px] text-muted-foreground mb-1 font-medium">🌆 Tarde</div>
                  {(agBySlot[`${dateStr}_tarde`] || []).map(ag => <AgCard key={ag.id} ag={ag} />)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Serviços por agendar */}
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
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getLocalidadeCor(ag.localidade) }}
                  />
                  <span className="font-bold text-sm">{ag.matricula}</span>
                  <Badge className={`text-white text-xs ${TIPO_COLORS[ag.tipoServico]}`}>{ag.tipoServico}</Badge>
                  {ag.viatura && <span className="text-xs text-muted-foreground truncate">{ag.viatura}</span>}
                  {ag.localidade && <span className="text-xs text-muted-foreground">{ag.localidade}</span>}
                  <div className="ml-auto flex items-center gap-1">
                    <Badge className={`text-white text-xs ${ESTADO_COLORS[ag.estadoVidro]}`}>{ESTADO_LABELS[ag.estadoVidro]}</Badge>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleEdit(ag)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-red-500"
                      onClick={() => { if (confirm("Anular?")) anularMutation.mutate({ token, id: ag.id }); }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
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

      {/* Dialog criar/editar */}
      <Dialog open={showForm} onOpenChange={(open) => {
        if (!open) { setShowForm(false); setEditingId(null); setForm({ ...emptyForm }); }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Matrícula *</Label>
                <Input
                  value={form.matricula}
                  onChange={e => setForm(f => ({ ...f, matricula: e.target.value.toUpperCase() }))}
                  placeholder="AA-00-BB"
                />
              </div>
              <div>
                <Label>Tipo de Serviço *</Label>
                <Select value={form.tipoServico} onValueChange={v => setForm(f => ({ ...f, tipoServico: v as TipoServico }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{k} – {v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Viatura</Label>
              <Input
                value={form.viatura}
                onChange={e => setForm(f => ({ ...f, viatura: e.target.value }))}
                placeholder="Ex: Peugeot 308"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data</Label>
                <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
              </div>
              <div>
                <Label>Período</Label>
                <Select value={form.periodo || "none"} onValueChange={v => setForm(f => ({ ...f, periodo: v === "none" ? "" : v as Periodo }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem período</SelectItem>
                    <SelectItem value="manha">☀️ Manhã</SelectItem>
                    <SelectItem value="tarde">🌆 Tarde</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Localidade</Label>
                <Select value={form.localidade || "none"} onValueChange={v => setForm(f => ({ ...f, localidade: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem localidade</SelectItem>
                    {(localidades as LocalidadeAgendamento[]).map(loc => (
                      <SelectItem key={loc.id} value={loc.nome}>{loc.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estado do Vidro</Label>
                <Select value={form.estadoVidro} onValueChange={v => setForm(f => ({ ...f, estadoVidro: v as EstadoVidro }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nao_encomendado">🔴 N/E – Não Encomendado</SelectItem>
                    <SelectItem value="encomendado">🟡 V/E – Vidro Encomendado</SelectItem>
                    <SelectItem value="terminado">🟢 ST – Serviço Terminado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefone</Label>
                <Input
                  value={form.telefone}
                  onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                  placeholder="9XX XXX XXX"
                />
              </div>
              <div>
                <Label>Nº Obra</Label>
                <Input
                  type="number"
                  value={form.obraNo}
                  onChange={e => setForm(f => ({ ...f, obraNo: e.target.value }))}
                  placeholder="Ex: 12345"
                />
              </div>
            </div>
            <div>
              <Label>Morada</Label>
              <Input
                value={form.morada}
                onChange={e => setForm(f => ({ ...f, morada: e.target.value }))}
                placeholder="Rua, nº, localidade"
              />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea
                value={form.notas}
                onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                rows={2}
                placeholder="Observações adicionais..."
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={criarMutation.isPending || atualizarMutation.isPending}
              >
                {criarMutation.isPending || atualizarMutation.isPending
                  ? "A guardar..."
                  : editingId ? "Guardar Alterações" : "Criar Serviço"}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setShowForm(false); setEditingId(null); setForm({ ...emptyForm }); }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
