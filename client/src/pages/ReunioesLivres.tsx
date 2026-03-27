import { useState, useMemo, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Calendar,
  Clock,
  MapPin,
  Users,
  FileText,
  CheckCircle2,
  Tag,
  MoreVertical,
  Trash2,
  Edit3,
  Archive,
  ArchiveRestore,
  Mic,
  Eye,
  X,
  ChevronLeft,
  Loader2,
  MessageSquare,
  ListChecks,
  Filter,
  Hash,
} from "lucide-react";
import { NovaGravacaoDialog } from "./GravacaoReuniao";

// Cores pré-definidas para tags
const CORES_TAGS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#64748b", // slate
];

// ==================== DIALOG GESTÃO DE TIPOS/TAGS ====================
function GestaoTiposDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [novoNome, setNovoNome] = useState("");
  const [novaCor, setNovaCor] = useState(CORES_TAGS[0]);
  const utils = trpc.useUtils();

  const { data: tipos = [] } = trpc.reunioesLivres.listarTipos.useQuery();
  const criarMut = trpc.reunioesLivres.criarTipo.useMutation({
    onSuccess: () => {
      utils.reunioesLivres.listarTipos.invalidate();
      setNovoNome("");
      toast.success("Tipo de reunião criado");
    },
  });
  const eliminarMut = trpc.reunioesLivres.eliminarTipo.useMutation({
    onSuccess: () => {
      utils.reunioesLivres.listarTipos.invalidate();
      toast.success("Tipo eliminado");
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Tipos de Reunião
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Formulário de criação */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Nome do tipo</label>
              <Input
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Ex: Reunião Semanal"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && novoNome.trim()) {
                    criarMut.mutate({ nome: novoNome.trim(), cor: novaCor });
                  }
                }}
              />
            </div>
            <Button
              onClick={() => novoNome.trim() && criarMut.mutate({ nome: novoNome.trim(), cor: novaCor })}
              disabled={!novoNome.trim() || criarMut.isPending}
              size="sm"
              className="h-9"
            >
              <Plus className="h-4 w-4 mr-1" />
              Criar
            </Button>
          </div>

          {/* Selector de cor */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Cor</label>
            <div className="flex flex-wrap gap-1.5">
              {CORES_TAGS.map((cor) => (
                <button
                  key={cor}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    novaCor === cor ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: cor }}
                  onClick={() => setNovaCor(cor)}
                />
              ))}
            </div>
          </div>

          {/* Lista de tipos existentes */}
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-2">Tipos existentes ({tipos.length})</p>
            {tipos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum tipo criado ainda
              </p>
            ) : (
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {tipos.map((tipo: any) => (
                  <div key={tipo.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tipo.cor || "#6366f1" }}
                      />
                      <span className="text-sm">{tipo.nome}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Eliminar o tipo "${tipo.nome}"?`)) {
                          eliminarMut.mutate({ id: tipo.id });
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== DIALOG CRIAR/EDITAR REUNIÃO ====================
function ReuniaoFormDialog({
  open,
  onClose,
  reuniao,
}: {
  open: boolean;
  onClose: () => void;
  reuniao?: any;
}) {
  const isEditar = !!reuniao;
  const [titulo, setTitulo] = useState(reuniao?.titulo || "");
  const [data, setData] = useState(reuniao?.data || new Date().toISOString().slice(0, 10));
  const [hora, setHora] = useState(reuniao?.hora || "");
  const [local, setLocal] = useState(reuniao?.local || "");
  const [tipoId, setTipoId] = useState<string>(reuniao?.tipoId?.toString() || "");
  const [presencasText, setPresencasText] = useState(() => {
    if (reuniao?.presencas) {
      try {
        return JSON.parse(reuniao.presencas).join(", ");
      } catch { return reuniao.presencas; }
    }
    return "";
  });
  const [temas, setTemas] = useState(reuniao?.temas || "");
  const [conclusoes, setConclusoes] = useState(reuniao?.conclusoes || "");
  const [observacoes, setObservacoes] = useState(reuniao?.observacoes || "");
  const [estado, setEstado] = useState<string>(reuniao?.estado || "rascunho");

  const utils = trpc.useUtils();
  const { data: tipos = [] } = trpc.reunioesLivres.listarTipos.useQuery();

  const criarMut = trpc.reunioesLivres.criar.useMutation({
    onSuccess: () => {
      utils.reunioesLivres.listar.invalidate();
      toast.success("Reunião criada com sucesso");
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const atualizarMut = trpc.reunioesLivres.atualizar.useMutation({
    onSuccess: () => {
      utils.reunioesLivres.listar.invalidate();
      utils.reunioesLivres.getById.invalidate();
      toast.success("Reunião atualizada");
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!titulo.trim()) {
      toast.error("O título é obrigatório");
      return;
    }
    if (!data) {
      toast.error("A data é obrigatória");
      return;
    }

    // Converter presenças de texto para JSON
    const presencasArr = presencasText
      .split(",")
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 0);
    const presencasJson = presencasArr.length > 0 ? JSON.stringify(presencasArr) : undefined;

    const payload = {
      titulo: titulo.trim(),
      data,
      hora: hora || undefined,
      local: local || undefined,
      tipoId: tipoId ? parseInt(tipoId) : undefined,
      presencas: presencasJson,
      temas: temas || undefined,
      conclusoes: conclusoes || undefined,
      observacoes: observacoes || undefined,
      estado: estado as 'rascunho' | 'concluida' | 'arquivada',
    };

    if (isEditar) {
      atualizarMut.mutate({ id: reuniao.id, ...payload });
    } else {
      criarMut.mutate(payload);
    }
  };

  const isPending = criarMut.isPending || atualizarMut.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditar ? <Edit3 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {isEditar ? "Editar Reunião" : "Nova Reunião"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Título */}
          <div>
            <label className="text-sm font-medium mb-1 block">Título *</label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Reunião semanal de equipa"
            />
          </div>

          {/* Data, Hora, Local */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">
                <Calendar className="h-3.5 w-3.5 inline mr-1" />
                Data *
              </label>
              <Input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                <Clock className="h-3.5 w-3.5 inline mr-1" />
                Hora
              </label>
              <Input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                <MapPin className="h-3.5 w-3.5 inline mr-1" />
                Local
              </label>
              <Input
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                placeholder="Ex: Sala de reuniões"
              />
            </div>
          </div>

          {/* Tipo/Tag e Estado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">
                <Tag className="h-3.5 w-3.5 inline mr-1" />
                Tipo de Reunião
              </label>
              <Select value={tipoId} onValueChange={setTipoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {tipos.map((t: any) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: t.cor || "#6366f1" }}
                        />
                        {t.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Estado</label>
              <Select value={estado} onValueChange={setEstado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="arquivada">Arquivada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Presenças */}
          <div>
            <label className="text-sm font-medium mb-1 block">
              <Users className="h-3.5 w-3.5 inline mr-1" />
              Presenças
            </label>
            <Input
              value={presencasText}
              onChange={(e) => setPresencasText(e.target.value)}
              placeholder="Nomes separados por vírgula: Marco, João, Ana..."
            />
            <p className="text-xs text-muted-foreground mt-0.5">
              Separe os nomes com vírgulas
            </p>
          </div>

          {/* Temas */}
          <div>
            <label className="text-sm font-medium mb-1 block">
              <ListChecks className="h-3.5 w-3.5 inline mr-1" />
              Temas Discutidos
            </label>
            <Textarea
              value={temas}
              onChange={(e) => setTemas(e.target.value)}
              placeholder="Temas abordados na reunião..."
              rows={4}
            />
          </div>

          {/* Conclusões */}
          <div>
            <label className="text-sm font-medium mb-1 block">
              <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" />
              Conclusões
            </label>
            <Textarea
              value={conclusoes}
              onChange={(e) => setConclusoes(e.target.value)}
              placeholder="Conclusões e decisões tomadas..."
              rows={4}
            />
          </div>

          {/* Observações */}
          <div>
            <label className="text-sm font-medium mb-1 block">
              <MessageSquare className="h-3.5 w-3.5 inline mr-1" />
              Observações
            </label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações adicionais..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {isEditar ? "Guardar Alterações" : "Criar Reunião"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== DETALHE DA REUNIÃO ====================
function DetalheReuniao({
  reuniaoId,
  onVoltar,
}: {
  reuniaoId: number;
  onVoltar: () => void;
}) {
  const [editarOpen, setEditarOpen] = useState(false);
  const [gravacaoOpen, setGravacaoOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: reuniao, isLoading } = trpc.reunioesLivres.getById.useQuery({ id: reuniaoId });

  const associarGravacaoMut = trpc.reunioesLivres.atualizar.useMutation({
    onSuccess: () => {
      utils.reunioesLivres.getById.invalidate({ id: reuniaoId });
      utils.reunioesLivres.listar.invalidate();
      toast.success("Gravação associada à reunião");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!reuniao) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Reunião não encontrada</p>
        <Button variant="outline" onClick={onVoltar} className="mt-4">
          <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      </div>
    );
  }

  const presencas = reuniao.presencas ? (() => {
    try { return JSON.parse(reuniao.presencas); } catch { return []; }
  })() : [];

  const estadoCores: Record<string, string> = {
    rascunho: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    concluida: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    arquivada: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };
  const estadoCor = estadoCores[reuniao.estado] || "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" onClick={onVoltar} className="mt-0.5">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">{reuniao.titulo}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className={estadoCor}>
                {reuniao.estado === "concluida" ? "Concluída" : reuniao.estado === "arquivada" ? "Arquivada" : "Rascunho"}
              </Badge>
              {reuniao.tipoNome && (
                <Badge
                  variant="outline"
                  style={{
                    borderColor: reuniao.tipoCor || "#6366f1",
                    color: reuniao.tipoCor || "#6366f1",
                    backgroundColor: `${reuniao.tipoCor || "#6366f1"}15`,
                  }}
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {reuniao.tipoNome}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setGravacaoOpen(true)}>
            <Mic className="h-4 w-4 mr-1" />
            Gravar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditarOpen(true)}>
            <Edit3 className="h-4 w-4 mr-1" />
            Editar
          </Button>
        </div>
      </div>

      {/* Informações principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Calendar className="h-4 w-4" />
            Data
          </div>
          <p className="font-medium">
            {new Date(reuniao.data + "T00:00:00").toLocaleDateString("pt-PT", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          {reuniao.hora && (
            <p className="text-sm text-muted-foreground mt-0.5">
              <Clock className="h-3 w-3 inline mr-1" />
              {reuniao.hora}
            </p>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <MapPin className="h-4 w-4" />
            Local
          </div>
          <p className="font-medium">{reuniao.local || "Não definido"}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Users className="h-4 w-4" />
            Presenças ({presencas.length})
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {presencas.length > 0 ? presencas.map((p: string, i: number) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {p}
              </Badge>
            )) : (
              <span className="text-sm text-muted-foreground">Nenhuma presença registada</span>
            )}
          </div>
        </Card>
      </div>

      {/* Conteúdo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Temas */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <ListChecks className="h-4 w-4" />
            Temas Discutidos
          </h3>
          {reuniao.temas ? (
            <div className="text-sm whitespace-pre-wrap leading-relaxed">{reuniao.temas}</div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Nenhum tema registado</p>
          )}
        </Card>

        {/* Conclusões */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <CheckCircle2 className="h-4 w-4" />
            Conclusões
          </h3>
          {reuniao.conclusoes ? (
            <div className="text-sm whitespace-pre-wrap leading-relaxed">{reuniao.conclusoes}</div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Nenhuma conclusão registada</p>
          )}
        </Card>
      </div>

      {/* Observações */}
      {reuniao.observacoes && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <MessageSquare className="h-4 w-4" />
            Observações
          </h3>
          <div className="text-sm whitespace-pre-wrap leading-relaxed">{reuniao.observacoes}</div>
        </Card>
      )}

      {/* Gravação associada */}
      {reuniao.gravacao && (
        <Card className="p-4 border-red-200 dark:border-red-900/50">
          <h3 className="text-sm font-semibold text-red-600 uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <Mic className="h-4 w-4" />
            Gravação Associada
          </h3>
          <div className="space-y-2">
            <p className="text-sm font-medium">{reuniao.gravacao.titulo}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>Estado: {reuniao.gravacao.estado}</span>
              {reuniao.gravacao.duracao && (
                <span>Duração: {Math.floor(reuniao.gravacao.duracao / 60)}min</span>
              )}
            </div>
            {reuniao.gravacao.resumo && (
              <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Resumo IA:</p>
                <div className="text-sm whitespace-pre-wrap">{reuniao.gravacao.resumo}</div>
              </div>
            )}
            {reuniao.gravacao.transcricao && (
              <details className="mt-2">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  Ver transcrição completa
                </summary>
                <div className="mt-2 p-3 bg-muted/30 rounded-lg text-xs whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                  {reuniao.gravacao.transcricao}
                </div>
              </details>
            )}
          </div>
        </Card>
      )}

      {/* Dialogs */}
      {editarOpen && (
        <ReuniaoFormDialog
          open={editarOpen}
          onClose={() => setEditarOpen(false)}
          reuniao={reuniao}
        />
      )}

      <NovaGravacaoDialog
        open={gravacaoOpen}
        onClose={() => {
          setGravacaoOpen(false);
          // Após fechar, verificar se há gravações novas para associar
          utils.notas.listarGravacoes.invalidate();
        }}
      />
    </div>
  );
}

// ==================== DIALOG ASSOCIAR GRAVAÇÃO ====================
function AssociarGravacaoDialog({
  open,
  onClose,
  reuniaoId,
}: {
  open: boolean;
  onClose: () => void;
  reuniaoId: number;
}) {
  const utils = trpc.useUtils();
  const { data: gravacoes = [] } = trpc.notas.listarGravacoes.useQuery();
  const atualizarMut = trpc.reunioesLivres.atualizar.useMutation({
    onSuccess: () => {
      utils.reunioesLivres.getById.invalidate({ id: reuniaoId });
      utils.reunioesLivres.listar.invalidate();
      toast.success("Gravação associada");
      onClose();
    },
  });

  const gravacoesDisponiveis = gravacoes.filter((g: any) => g.estado === "concluido" || g.estado === "transcrito");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Associar Gravação</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {gravacoesDisponiveis.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma gravação disponível
            </p>
          ) : (
            gravacoesDisponiveis.map((g: any) => (
              <button
                key={g.id}
                className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                onClick={() => atualizarMut.mutate({ id: reuniaoId, gravacaoId: g.id })}
              >
                <p className="text-sm font-medium">{g.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(g.createdAt).toLocaleDateString("pt-PT")}
                  {g.duracao && ` · ${Math.floor(g.duracao / 60)}min`}
                </p>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== PÁGINA PRINCIPAL ====================
export default function ReunioesLivres() {
  const { user } = useAuth();
  const [pesquisa, setPesquisa] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("");
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [criarOpen, setCriarOpen] = useState(false);
  const [tiposOpen, setTiposOpen] = useState(false);
  const [reuniaoSelecionada, setReuniaoSelecionada] = useState<number | null>(null);
  const [gravacaoOpen, setGravacaoOpen] = useState(false);
  const [associarGravacaoId, setAssociarGravacaoId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: reunioes = [], isLoading } = trpc.reunioesLivres.listar.useQuery({
    tipoId: filtroTipo ? parseInt(filtroTipo) : undefined,
    estado: filtroEstado || undefined,
    pesquisa: pesquisa || undefined,
  });

  const { data: tipos = [] } = trpc.reunioesLivres.listarTipos.useQuery();

  const eliminarMut = trpc.reunioesLivres.eliminar.useMutation({
    onSuccess: () => {
      utils.reunioesLivres.listar.invalidate();
      toast.success("Reunião eliminada");
    },
  });

  const atualizarMut = trpc.reunioesLivres.atualizar.useMutation({
    onSuccess: () => {
      utils.reunioesLivres.listar.invalidate();
    },
  });

  // Se há reunião selecionada, mostrar detalhe
  if (reuniaoSelecionada) {
    return (
      <DashboardLayout>
        <div className="container max-w-5xl py-6">
          <DetalheReuniao
            reuniaoId={reuniaoSelecionada}
            onVoltar={() => setReuniaoSelecionada(null)}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container max-w-5xl py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Reuniões</h1>
            <p className="text-sm text-muted-foreground">
              Registe e consulte o histórico de reuniões
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setTiposOpen(true)}>
              <Tag className="h-4 w-4 mr-1" />
              Tipos
            </Button>
            <Button variant="outline" size="sm" onClick={() => setGravacaoOpen(true)}>
              <Mic className="h-4 w-4 mr-1" />
              Gravar
            </Button>
            <Button onClick={() => setCriarOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Nova Reunião
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              placeholder="Pesquisar reuniões..."
              className="pl-9"
            />
          </div>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {tipos.map((t: any) => (
                <SelectItem key={t.id} value={t.id.toString()}>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: t.cor || "#6366f1" }}
                    />
                    {t.nome}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
              <SelectItem value="arquivada">Arquivada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista de reuniões */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : reunioes.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Nenhuma reunião encontrada</p>
            <Button onClick={() => setCriarOpen(true)} variant="outline" className="mt-4">
              <Plus className="h-4 w-4 mr-1" />
              Criar primeira reunião
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {reunioes.map((r: any) => {
              const presencas = r.presencas ? (() => {
                try { return JSON.parse(r.presencas); } catch { return []; }
              })() : [];

              const estadoCoresMap: Record<string, string> = {
                rascunho: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
                concluida: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                arquivada: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
              };
              const estadoCor = estadoCoresMap[r.estado] || "";

              return (
                <Card
                  key={r.id}
                  className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setReuniaoSelecionada(r.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{r.titulo}</h3>
                        <Badge variant="outline" className={`text-[10px] ${estadoCor}`}>
                          {r.estado === "concluida" ? "Concluída" : r.estado === "arquivada" ? "Arquivada" : "Rascunho"}
                        </Badge>
                        {r.tipoNome && (
                          <Badge
                            variant="outline"
                            className="text-[10px]"
                            style={{
                              borderColor: r.tipoCor || "#6366f1",
                              color: r.tipoCor || "#6366f1",
                              backgroundColor: `${r.tipoCor || "#6366f1"}15`,
                            }}
                          >
                            {r.tipoNome}
                          </Badge>
                        )}
                        {r.gravacaoId && (
                          <Badge variant="outline" className="text-[10px] border-red-300 text-red-500">
                            <Mic className="h-2.5 w-2.5 mr-0.5" />
                            Gravação
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(r.data + "T00:00:00").toLocaleDateString("pt-PT", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        {r.hora && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {r.hora}
                          </span>
                        )}
                        {r.local && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {r.local}
                          </span>
                        )}
                        {presencas.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {presencas.length} participante{presencas.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      {/* Preview de temas */}
                      {r.temas && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {r.temas}
                        </p>
                      )}
                    </div>

                    {/* Menu de ações */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setReuniaoSelecionada(r.id);
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setAssociarGravacaoId(r.id);
                        }}>
                          <Mic className="h-4 w-4 mr-2" />
                          Associar gravação
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {r.estado !== "arquivada" ? (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            atualizarMut.mutate({ id: r.id, estado: "arquivada" });
                            toast.success("Reunião arquivada");
                          }}>
                            <Archive className="h-4 w-4 mr-2" />
                            Arquivar
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            atualizarMut.mutate({ id: r.id, estado: "rascunho" });
                            toast.success("Reunião restaurada");
                          }}>
                            <ArchiveRestore className="h-4 w-4 mr-2" />
                            Restaurar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Eliminar a reunião "${r.titulo}"?`)) {
                              eliminarMut.mutate({ id: r.id });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Contagem */}
        {reunioes.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {reunioes.length} reunião{reunioes.length !== 1 ? "ões" : ""} encontrada{reunioes.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Dialogs */}
      {criarOpen && (
        <ReuniaoFormDialog open={criarOpen} onClose={() => setCriarOpen(false)} />
      )}

      <GestaoTiposDialog open={tiposOpen} onClose={() => setTiposOpen(false)} />

      <NovaGravacaoDialog
        open={gravacaoOpen}
        onClose={() => setGravacaoOpen(false)}
      />

      {associarGravacaoId && (
        <AssociarGravacaoDialog
          open={!!associarGravacaoId}
          onClose={() => setAssociarGravacaoId(null)}
          reuniaoId={associarGravacaoId}
        />
      )}
    </DashboardLayout>
  );
}
