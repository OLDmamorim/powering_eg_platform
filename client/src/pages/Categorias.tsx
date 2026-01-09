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
  Download,
  Loader2,
} from "lucide-react";
import { EstadoAcompanhamentoSelect, EstadoAcompanhamentoBadge } from "@/components/EstadoAcompanhamento";
import { RelatorioDetalheModal } from "@/components/RelatorioDetalheModal";
import { RelatorioIACategorias } from "@/components/RelatorioIACategorias";
import { HistoricoRelatoriosIA } from "@/components/HistoricoRelatoriosIA";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Categorias() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [expandedCategorias, setExpandedCategorias] = useState<string[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<string>("all");
  const [pesquisa, setPesquisa] = useState("");
  
  // Estado para modal de detalhes
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRelatorio, setSelectedRelatorio] = useState<{ id: number; tipo: "livre" | "completo" } | null>(null);
  const [exportingCategoria, setExportingCategoria] = useState<string | null>(null);
  const [generatingRelatorioIA, setGeneratingRelatorioIA] = useState(false);
  const [relatorioIA, setRelatorioIA] = useState<string | null>(null);
  const [showRelatorioIA, setShowRelatorioIA] = useState(false);

  const utils = trpc.useUtils();
  
  // Função para exportar categoria para PDF
  const exportarCategoriaPDF = async (categoria: string) => {
    setExportingCategoria(categoria);
    try {
      const cat = relatoriosPorCategoria?.find(c => c.categoria === categoria);
      if (!cat) {
        toast.error("Categoria não encontrada");
        return;
      }
      
      // Criar conteúdo HTML para o PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Categoria: ${categoria}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
            .stats { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
            .stat-item { text-align: center; }
            .stat-value { font-size: 24px; font-weight: bold; color: #007bff; }
            .stat-label { font-size: 12px; color: #666; }
            .relatorio { border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
            .relatorio-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .relatorio-tipo { background: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
            .relatorio-completo { background: #f3e5f5; color: #7b1fa2; }
            .relatorio-info { color: #666; font-size: 14px; margin-bottom: 5px; }
            .relatorio-descricao { margin-top: 10px; padding: 10px; background: #fafafa; border-radius: 4px; }
            .estado { padding: 2px 8px; border-radius: 4px; font-size: 11px; }
            .estado-acompanhar { background: #fff3e0; color: #e65100; }
            .estado-em_tratamento { background: #e3f2fd; color: #1565c0; }
            .estado-tratado { background: #e8f5e9; color: #2e7d32; }
          </style>
        </head>
        <body>
          <h1>🏷️ Categoria: ${categoria}</h1>
          <p>Exportado em ${new Date().toLocaleDateString('pt-PT', { dateStyle: 'full' })}</p>
          
          <div class="stats">
            <h3>Estatísticas</h3>
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-value">${cat.contadores.total}</div>
                <div class="stat-label">Total</div>
              </div>
              <div class="stat-item">
                <div class="stat-value" style="color: #e65100;">${cat.contadores.acompanhar}</div>
                <div class="stat-label">Acompanhar</div>
              </div>
              <div class="stat-item">
                <div class="stat-value" style="color: #1565c0;">${cat.contadores.emTratamento}</div>
                <div class="stat-label">Em Tratamento</div>
              </div>
              <div class="stat-item">
                <div class="stat-value" style="color: #2e7d32;">${cat.contadores.tratado}</div>
                <div class="stat-label">Tratado</div>
              </div>
            </div>
          </div>
          
          <h2>Relatórios (${cat.relatorios.length})</h2>
          ${cat.relatorios.map((rel, index) => `
            <div class="relatorio">
              <div class="relatorio-header">
                <span class="relatorio-tipo ${rel.tipo === 'completo' ? 'relatorio-completo' : ''}">
                  ${rel.tipo === 'livre' ? '📄 Livre' : '📋 Completo'}
                </span>
                ${rel.estadoAcompanhamento ? `<span class="estado estado-${rel.estadoAcompanhamento}">${rel.estadoAcompanhamento === 'acompanhar' ? '👁 Acompanhar' : rel.estadoAcompanhamento === 'em_tratamento' ? '⏳ Em Tratamento' : '✅ Tratado'}</span>` : ''}
              </div>
              <div class="relatorio-info">🏪 <strong>${rel.lojaNome}</strong></div>
              <div class="relatorio-info">👤 ${rel.gestorNome}</div>
              <div class="relatorio-info">📅 ${new Date(rel.dataVisita).toLocaleDateString('pt-PT')}</div>
              ${rel.descricao ? `<div class="relatorio-descricao">${rel.descricao}</div>` : ''}
            </div>
          `).join('')}
        </body>
        </html>
      `;
      
      // Criar blob e download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `categoria-${categoria.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Categoria "${categoria}" exportada com sucesso`);
    } catch (error) {
      toast.error("Erro ao exportar categoria");
    } finally {
      setExportingCategoria(null);
    }
  };

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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Tag className="h-8 w-8 text-primary" />
              Categorias
            </h1>
            <p className="text-muted-foreground">
              Gerir e acompanhar relatórios organizados por categoria
            </p>
          </div>

        </div>

        {/* Histórico de Relatórios IA */}
        <HistoricoRelatoriosIA />
        
        {/* Estatísticas */}
        {estatisticas && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card 
              className={`bg-gradient-to-br from-primary/10 to-primary/5 cursor-pointer transition-all hover:scale-105 hover:shadow-md ${filtroEstado === 'all' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setFiltroEstado('all')}
            >
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
            <Card 
              className={`bg-gradient-to-br from-blue-500/10 to-blue-500/5 cursor-pointer transition-all hover:scale-105 hover:shadow-md ${filtroEstado === 'acompanhar' ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setFiltroEstado('acompanhar')}
            >
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
            <Card 
              className={`bg-gradient-to-br from-amber-500/10 to-amber-500/5 cursor-pointer transition-all hover:scale-105 hover:shadow-md ${filtroEstado === 'em_tratamento' ? 'ring-2 ring-amber-500' : ''}`}
              onClick={() => setFiltroEstado('em_tratamento')}
            >
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
            <Card 
              className={`bg-gradient-to-br from-green-500/10 to-green-500/5 cursor-pointer transition-all hover:scale-105 hover:shadow-md ${filtroEstado === 'tratado' ? 'ring-2 ring-green-500' : ''}`}
              onClick={() => setFiltroEstado('tratado')}
            >
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              exportarCategoriaPDF(cat.categoria);
                            }}
                            disabled={exportingCategoria === cat.categoria}
                          >
                            {exportingCategoria === cat.categoria ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
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
                              <div 
                                className="flex-1 min-w-0 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                                onClick={() => {
                                  setSelectedRelatorio({ id: rel.id, tipo: rel.tipo as "livre" | "completo" });
                                  setModalOpen(true);
                                }}
                              >
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
      
      {/* Modal de detalhes do relatório */}
      <RelatorioDetalheModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        relatorioId={selectedRelatorio?.id || null}
        tipoRelatorio={selectedRelatorio?.tipo || null}
      />
      
      <RelatorioIACategorias
        open={showRelatorioIA}
        onOpenChange={setShowRelatorioIA}
      />
    </DashboardLayout>
  );
}
