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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Tag,
  ChevronDown,
  ChevronUp,
  Building2,
  Calendar,
  User,
  Eye,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  FileText,
  ClipboardList,
  BarChart3,
} from "lucide-react";
import { EstadoAcompanhamentoSelect, EstadoAcompanhamentoBadge } from "@/components/EstadoAcompanhamento";

export default function Categorias() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [expandedCategorias, setExpandedCategorias] = useState<string[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<string>("all");
  const [pesquisa, setPesquisa] = useState("");

  const utils = trpc.useUtils();

  // Queries
  const { data: relatoriosPorCategoria, isLoading } =
    trpc.categorizacao.getRelatoriosPorCategoria.useQuery();
  const { data: estatisticas } = trpc.categorizacao.getEstatisticas.useQuery();

  // Mutation para atualizar estado
  const updateEstadoMutation = trpc.categorizacao.updateEstado.useMutation({
    onSuccess: () => {
      toast.success("Estado atualizado");
      utils.categorizacao.getRelatoriosPorCategoria.invalidate();
      utils.categorizacao.getEstatisticas.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar estado");
    },
  });

  // Verificar se é admin
  if (user?.role !== "admin") {
    setLocation("/dashboard");
    return null;
  }

  // Toggle categoria expandida
  const toggleCategoria = (categoria: string) => {
    setExpandedCategorias((prev) =>
      prev.includes(categoria)
        ? prev.filter((c) => c !== categoria)
        : [...prev, categoria]
    );
  };

  // Filtrar relatórios por estado e pesquisa
  const categoriasFiltradas = useMemo(() => {
    if (!relatoriosPorCategoria) return [];

    return relatoriosPorCategoria
      .map((cat) => {
        let relatoriosFiltrados = cat.relatorios;

        // Filtrar por estado
        if (filtroEstado !== "all") {
          if (filtroEstado === "sem_estado") {
            relatoriosFiltrados = relatoriosFiltrados.filter(
              (r) => !r.estadoAcompanhamento
            );
          } else {
            relatoriosFiltrados = relatoriosFiltrados.filter(
              (r) => r.estadoAcompanhamento === filtroEstado
            );
          }
        }

        // Filtrar por pesquisa
        if (pesquisa.trim()) {
          const termo = pesquisa.toLowerCase();
          relatoriosFiltrados = relatoriosFiltrados.filter(
            (r) =>
              r.lojaNome.toLowerCase().includes(termo) ||
              r.gestorNome.toLowerCase().includes(termo) ||
              r.descricao.toLowerCase().includes(termo)
          );
        }

        return {
          ...cat,
          relatorios: relatoriosFiltrados,
          contadores: {
            ...cat.contadores,
            filtrado: relatoriosFiltrados.length,
          },
        };
      })
      .filter((cat) => {
        // Se pesquisa ativa, mostrar apenas categorias com resultados
        if (pesquisa.trim() || filtroEstado !== "all") {
          return cat.relatorios.length > 0;
        }
        // Também filtrar por nome da categoria
        if (pesquisa.trim()) {
          return cat.categoria.toLowerCase().includes(pesquisa.toLowerCase());
        }
        return true;
      });
  }, [relatoriosPorCategoria, filtroEstado, pesquisa]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Tag className="h-8 w-8 text-primary" />
            Categorias
          </h1>
          <p className="text-muted-foreground">
            Gerir e acompanhar relatórios organizados por categoria
          </p>
        </div>

        {/* Estatísticas */}
        {estatisticas && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Categorias
                  </span>
                </div>
                <p className="text-2xl font-bold mt-1">
                  {estatisticas.totalCategorias}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-500" />
                  <span className="text-sm text-muted-foreground">
                    Acompanhar
                  </span>
                </div>
                <p className="text-2xl font-bold mt-1 text-blue-600">
                  {estatisticas.porEstado.acompanhar}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  <span className="text-sm text-muted-foreground">
                    Em Tratamento
                  </span>
                </div>
                <p className="text-2xl font-bold mt-1 text-amber-600">
                  {estatisticas.porEstado.emTratamento}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-muted-foreground">Tratado</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-green-600">
                  {estatisticas.porEstado.tratado}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-gray-500/10 to-gray-500/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-gray-500" />
                  <span className="text-sm text-muted-foreground">Total</span>
                </div>
                <p className="text-2xl font-bold mt-1">
                  {estatisticas.totalRelatoriosCategorizados}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtros */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por loja, gestor ou descrição..."
                  value={pesquisa}
                  onChange={(e) => setPesquisa(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os estados</SelectItem>
                  <SelectItem value="acompanhar">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-blue-500" />
                      Acompanhar
                    </div>
                  </SelectItem>
                  <SelectItem value="em_tratamento">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500" />
                      Em Tratamento
                    </div>
                  </SelectItem>
                  <SelectItem value="tratado">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Tratado
                    </div>
                  </SelectItem>
                  <SelectItem value="sem_estado">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-gray-400" />
                      Sem estado
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Categorias */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : categoriasFiltradas.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Tag className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">Nenhuma categoria encontrada</h3>
              <p className="text-muted-foreground mt-1">
                {pesquisa || filtroEstado !== "all"
                  ? "Tente ajustar os filtros de pesquisa"
                  : "Comece por categorizar relatórios na página de Relatórios"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {categoriasFiltradas.map((cat) => (
              <Collapsible
                key={cat.categoria}
                open={expandedCategorias.includes(cat.categoria)}
                onOpenChange={() => toggleCategoria(cat.categoria)}
              >
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Tag className="h-5 w-5 text-primary" />
                          </div>
                          <div className="text-left">
                            <CardTitle className="text-lg">
                              {cat.categoria}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {cat.contadores.total} relatório
                              {cat.contadores.total !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Mini contadores */}
                          <div className="hidden md:flex items-center gap-2">
                            {cat.contadores.acompanhar > 0 && (
                              <Badge
                                variant="outline"
                                className="bg-blue-500/10 text-blue-600 border-blue-500/20"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                {cat.contadores.acompanhar}
                              </Badge>
                            )}
                            {cat.contadores.emTratamento > 0 && (
                              <Badge
                                variant="outline"
                                className="bg-amber-500/10 text-amber-600 border-amber-500/20"
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                {cat.contadores.emTratamento}
                              </Badge>
                            )}
                            {cat.contadores.tratado > 0 && (
                              <Badge
                                variant="outline"
                                className="bg-green-500/10 text-green-600 border-green-500/20"
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                {cat.contadores.tratado}
                              </Badge>
                            )}
                          </div>
                          {expandedCategorias.includes(cat.categoria) ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 border-t">
                      <div className="divide-y">
                        {cat.relatorios.map((rel) => (
                          <div
                            key={`${rel.tipo}-${rel.id}`}
                            className="py-4 first:pt-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                  <Badge
                                    variant="outline"
                                    className={
                                      rel.tipo === "livre"
                                        ? "bg-blue-500/10 text-blue-600"
                                        : "bg-purple-500/10 text-purple-600"
                                    }
                                  >
                                    {rel.tipo === "livre" ? (
                                      <FileText className="h-3 w-3 mr-1" />
                                    ) : (
                                      <ClipboardList className="h-3 w-3 mr-1" />
                                    )}
                                    {rel.tipo === "livre" ? "Livre" : "Completo"}
                                  </Badge>
                                  <div className="flex items-center gap-1 text-sm">
                                    <Building2 className="h-3 w-3 text-primary" />
                                    <span className="font-medium">
                                      {rel.lojaNome}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <User className="h-3 w-3" />
                                    {rel.gestorNome}
                                  </div>
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(rel.dataVisita).toLocaleDateString(
                                      "pt-PT"
                                    )}
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {rel.descricao || "Sem descrição"}
                                </p>
                              </div>
                              <div className="flex-shrink-0">
                                <EstadoAcompanhamentoSelect
                                  value={
                                    (rel.estadoAcompanhamento as
                                      | "acompanhar"
                                      | "em_tratamento"
                                      | "tratado") || null
                                  }
                                  onChange={(estado) => {
                                    if (estado) {
                                      updateEstadoMutation.mutate({
                                        relatorioId: rel.id,
                                        tipoRelatorio: rel.tipo,
                                        estado,
                                      });
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
