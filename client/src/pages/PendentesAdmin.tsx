import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Search,
  Filter,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  Loader2,
  Plus,
  AlertCircle,
  CalendarClock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function PendentesAdmin() {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [filtroEstado, setFiltroEstado] = useState<string>("all");
  const [filtroLoja, setFiltroLoja] = useState<string>("all");
  const [pesquisa, setPesquisa] = useState("");
  const [novoLojaId, setNovoLojaId] = useState<number | null>(null);
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novaDataLimite, setNovaDataLimite] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const utils = trpc.useUtils();

  // Queries
  const { data: pendentes, isLoading } = trpc.pendentes.list.useQuery();
  const { data: lojas } = trpc.lojas.list.useQuery();

  // Mutations
  const resolveMutation = trpc.pendentes.resolve.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? "Pendente marcado como resolvido" : "Pending item marked as resolved");
      utils.pendentes.list.invalidate();
    },
    onError: () => toast.error(language === 'pt' ? "Erro ao resolver pendente" : "Error resolving pending item"),
  });

  const deleteMutation = trpc.pendentes.delete.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? "Pendente eliminado" : "Pending item deleted");
      utils.pendentes.list.invalidate();
    },
    onError: () => toast.error(language === 'pt' ? "Erro ao eliminar pendente" : "Error deleting pending item"),
  });

  const criarMutation = trpc.pendentes.criar.useMutation({
    onSuccess: () => {
      toast.success(language === 'pt' ? "Pendente criado com sucesso. Gestor notificado." : "Pending item created successfully. Manager notified.");
      setNovaDescricao("");
      setNovoLojaId(null);
      setNovaDataLimite("");
      setDialogOpen(false);
      utils.pendentes.list.invalidate();
    },
    onError: () => toast.error(language === 'pt' ? "Erro ao criar pendente" : "Error creating pending item"),
  });
  
  // Função para verificar se pendente está vencido ou próximo do vencimento
  const getStatusPrazo = (dataLimite: string | null) => {
    if (!dataLimite) return null;
    const hoje = new Date();
    const limite = new Date(dataLimite);
    const diffDias = Math.ceil((limite.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDias < 0) return 'vencido';
    if (diffDias <= 3) return 'proximo';
    return 'ok';
  };

  // Verificar se é admin
  if (user?.role !== "admin") {
    setLocation("/dashboard");
    return null;
  }

  // Filtrar pendentes
  const pendentesFiltrados = useMemo(() => {
    if (!pendentes) return [];

    return pendentes.filter((p: any) => {
      // Filtro por estado
      if (filtroEstado === "pendente" && p.resolvido) return false;
      if (filtroEstado === "resolvido" && !p.resolvido) return false;

      // Filtro por loja
      if (filtroLoja !== "all" && p.loja?.id !== parseInt(filtroLoja)) return false;

      // Filtro por pesquisa
      if (pesquisa) {
        const searchLower = pesquisa.toLowerCase();
        const matchDescricao = p.descricao?.toLowerCase().includes(searchLower);
        const matchLoja = p.loja?.nome?.toLowerCase().includes(searchLower);
        if (!matchDescricao && !matchLoja) return false;
      }

      return true;
    });
  }, [pendentes, filtroEstado, filtroLoja, pesquisa]);

  // Estatísticas
  const stats = useMemo(() => {
    if (!pendentes) return { total: 0, pendentes: 0, resolvidos: 0 };
    return {
      total: pendentes.length,
      pendentes: pendentes.filter((p: any) => !p.resolvido).length,
      resolvidos: pendentes.filter((p: any) => p.resolvido).length,
    };
  }, [pendentes]);

  // Lojas únicas para filtro
  const lojasUnicas = useMemo(() => {
    if (!pendentes) return [];
    const lojaMap = new Map();
    pendentes.forEach((p: any) => {
      if (p.loja && !lojaMap.has(p.loja.id)) {
        lojaMap.set(p.loja.id, p.loja);
      }
    });
    return Array.from(lojaMap.values());
  }, [pendentes]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              Pendentes
            </h1>
            <p className="text-muted-foreground">
              Gerir todos os pendentes da rede de lojas
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Pendente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Pendente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">{language === 'pt' ? "Loja" : "Store"}</label>
                  <Select
                    value={novoLojaId?.toString() || ""}
                    onValueChange={(v) => setNovoLojaId(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar loja..." />
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
                <div>
                  <label className="text-sm font-medium mb-2 block">{language === 'pt' ? "Descrição" : "Description"}</label>
                  <Input
                    value={novaDescricao}
                    onChange={(e) => setNovaDescricao(e.target.value)}
                    placeholder="Descreva o pendente..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Prazo (opcional)</label>
                  <Input
                    type="date"
                    value={novaDataLimite}
                    onChange={(e) => setNovaDataLimite(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Se definido, o gestor receberá alertas quando o prazo estiver próximo
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    if (!novoLojaId || !novaDescricao.trim()) {
                      toast.error(language === 'pt' ? "Preencha a loja e descrição" : "Fill in the store and description");
                      return;
                    }
                    criarMutation.mutate({
                      lojaId: novoLojaId,
                      descricao: novaDescricao.trim(),
                      dataLimite: novaDataLimite || undefined,
                    });
                  }}
                  disabled={criarMutation.isPending}
                >
                  {criarMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Criar Pendente
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-3 gap-4">
          <Card
            className={`cursor-pointer transition-all hover:scale-105 ${filtroEstado === 'all' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setFiltroEstado('all')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">{language === 'pt' ? "Total" : "Total"}</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:scale-105 bg-gradient-to-br from-amber-500/10 to-amber-500/5 ${filtroEstado === 'pendente' ? 'ring-2 ring-amber-500' : ''}`}
            onClick={() => setFiltroEstado('pendente')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                <span className="text-sm text-muted-foreground">{language === 'pt' ? "Pendentes" : "Pending Items"}</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-amber-600">{stats.pendentes}</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:scale-105 bg-gradient-to-br from-green-500/10 to-green-500/5 ${filtroEstado === 'resolvido' ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => setFiltroEstado('resolvido')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm text-muted-foreground">Resolvidos</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-green-600">{stats.resolvidos}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por descrição ou loja..."
                  value={pesquisa}
                  onChange={(e) => setPesquisa(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filtroLoja} onValueChange={setFiltroLoja}>
                <SelectTrigger className="w-[200px]">
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder={language === 'pt' ? "Filtrar por loja" : "Filter by store"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'pt' ? "Todas as lojas" : "All stores"}</SelectItem>
                  {lojasUnicas.map((loja: any) => (
                    <SelectItem key={loja.id} value={loja.id.toString()}>
                      {loja.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Pendentes */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : pendentesFiltrados.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">Nenhum pendente encontrado</h3>
              <p className="text-muted-foreground mt-1">
                {pesquisa || filtroEstado !== "all" || filtroLoja !== "all"
                  ? "Tente ajustar os filtros de pesquisa"
                  : "Não existem pendentes registados"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendentesFiltrados.map((pendente: any) => (
             <Card key={pendente.id} className={`${pendente.resolvido ? "opacity-60" : ""} ${!pendente.resolvido && getStatusPrazo(pendente.dataLimite) === 'vencido' ? 'border-red-500 bg-red-500/5' : ''} ${!pendente.resolvido && getStatusPrazo(pendente.dataLimite) === 'proximo' ? 'border-amber-500 bg-amber-500/5' : ''}`}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {pendente.loja?.nome || "Sem loja"}
                        </Badge>
                        {pendente.resolvido ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Resolvido
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                            <Clock className="h-3 w-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                        {!pendente.resolvido && pendente.dataLimite && (
                          <Badge className={`flex items-center gap-1 ${
                            getStatusPrazo(pendente.dataLimite) === 'vencido' 
                              ? 'bg-red-500/10 text-red-600 border-red-500/20' 
                              : getStatusPrazo(pendente.dataLimite) === 'proximo'
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                          }`}>
                            {getStatusPrazo(pendente.dataLimite) === 'vencido' ? (
                              <><AlertCircle className="h-3 w-3" /> Vencido</>
                            ) : getStatusPrazo(pendente.dataLimite) === 'proximo' ? (
                              <><CalendarClock className="h-3 w-3" /> Vence em breve</>
                            ) : (
                              <><Calendar className="h-3 w-3" /> {new Date(pendente.dataLimite).toLocaleDateString('pt-PT')}</>
                            )}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm">{pendente.descricao}</p>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(pendente.createdAt).toLocaleDateString("pt-PT", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!pendente.resolvido && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resolveMutation.mutate({ id: pendente.id })}
                          disabled={resolveMutation.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Resolver
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Tem certeza que deseja eliminar este pendente?")) {
                            deleteMutation.mutate({ id: pendente.id });
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
