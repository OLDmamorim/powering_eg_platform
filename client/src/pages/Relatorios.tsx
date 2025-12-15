import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Building2, Calendar, User, ChevronDown, ChevronUp, FileText, ClipboardList, Filter, Download, Image, X } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";

export default function Relatorios() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [expandedLivres, setExpandedLivres] = useState<number[]>([]);
  const [expandedCompletos, setExpandedCompletos] = useState<number[]>([]);
  
  // Filtros
  const [filtroLoja, setFiltroLoja] = useState<string>("all");
  const [filtroGestor, setFiltroGestor] = useState<string>("all");
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>("");
  const [filtroDataFim, setFiltroDataFim] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [apenasNaoVistos, setApenasNaoVistos] = useState(false);

  const { data: relatoriosLivres, isLoading: loadingLivres } =
    trpc.relatoriosLivres.list.useQuery({ apenasNaoVistos });
  const { data: relatoriosCompletos, isLoading: loadingCompletos } =
    trpc.relatoriosCompletos.list.useQuery({ apenasNaoVistos });
  const { data: countLivresNaoVistos } = trpc.relatoriosLivres.countNaoVistos.useQuery();
  const { data: countCompletosNaoVistos } = trpc.relatoriosCompletos.countNaoVistos.useQuery();
  const { data: lojas } = trpc.lojas.list.useQuery();
  const { data: gestores } = trpc.gestores.list.useQuery();

  if (user?.role !== "admin") {
    setLocation("/dashboard");
    return null;
  }

  const toggleLivre = (id: number) => {
    setExpandedLivres(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleCompleto = (id: number) => {
    setExpandedCompletos(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Aplicar filtros
  const filtrarRelatorios = (relatorios: any[]) => {
    if (!relatorios) return [];
    
    return relatorios.filter(r => {
      // Filtro por loja
      if (filtroLoja !== "all" && r.lojaId !== parseInt(filtroLoja)) return false;
      
      // Filtro por gestor
      if (filtroGestor !== "all" && r.gestorId !== parseInt(filtroGestor)) return false;
      
      // Filtro por data início
      if (filtroDataInicio) {
        const dataRelatorio = new Date(r.dataVisita);
        const dataInicio = new Date(filtroDataInicio);
        if (dataRelatorio < dataInicio) return false;
      }
      
      // Filtro por data fim
      if (filtroDataFim) {
        const dataRelatorio = new Date(r.dataVisita);
        const dataFim = new Date(filtroDataFim);
        dataFim.setHours(23, 59, 59);
        if (dataRelatorio > dataFim) return false;
      }
      
      return true;
    });
  };

  const relatoriosLivresFiltrados = useMemo(() => 
    filtrarRelatorios(relatoriosLivres || []), 
    [relatoriosLivres, filtroLoja, filtroGestor, filtroDataInicio, filtroDataFim]
  );

  const relatoriosCompletosFiltrados = useMemo(() => 
    filtrarRelatorios(relatoriosCompletos || []), 
    [relatoriosCompletos, filtroLoja, filtroGestor, filtroDataInicio, filtroDataFim]
  );

  const limparFiltros = () => {
    setFiltroLoja("all");
    setFiltroGestor("all");
    setFiltroDataInicio("");
    setFiltroDataFim("");
  };

  const temFiltrosAtivos = filtroLoja !== "all" || filtroGestor !== "all" || filtroDataInicio || filtroDataFim;

  // Exportar para PDF
  const exportarPDF = async (relatorio: any, tipo: 'livre' | 'completo') => {
    const content = gerarConteudoPDF(relatorio, tipo);
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${tipo}-${relatorio.id}-${new Date(relatorio.dataVisita).toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const gerarConteudoPDF = (relatorio: any, tipo: 'livre' | 'completo') => {
    const fotos = relatorio.fotos ? JSON.parse(relatorio.fotos) : [];
    const fotosHtml = fotos.length > 0 
      ? `<div style="margin-top: 20px;"><h3>Fotos</h3><div style="display: flex; flex-wrap: wrap; gap: 10px;">${fotos.map((f: string) => `<img src="${f}" style="max-width: 200px; max-height: 200px; object-fit: cover;" />`).join('')}</div></div>`
      : '';

    if (tipo === 'livre') {
      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Relatório Livre - ${relatorio.loja?.nome}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { color: #1a56db; border-bottom: 2px solid #1a56db; padding-bottom: 10px; }
    .info { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .info p { margin: 5px 0; }
    .descricao { background: #fff; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; white-space: pre-wrap; }
    .footer { margin-top: 40px; font-size: 12px; color: #6b7280; text-align: center; }
  </style>
</head>
<body>
  <h1>Relatório Livre</h1>
  <div class="info">
    <p><strong>Loja:</strong> ${relatorio.loja?.nome || 'N/A'}</p>
    <p><strong>Gestor:</strong> ${relatorio.gestor?.user?.name || 'N/A'}</p>
    <p><strong>Data da Visita:</strong> ${new Date(relatorio.dataVisita).toLocaleString('pt-PT')}</p>
    <p><strong>Criado em:</strong> ${new Date(relatorio.createdAt).toLocaleString('pt-PT')}</p>
  </div>
  <h3>Descrição da Visita</h3>
  <div class="descricao">${relatorio.descricao}</div>
  ${fotosHtml}
  <div class="footer">
    <p>PoweringEG Platform - Relatório gerado em ${new Date().toLocaleString('pt-PT')}</p>
  </div>
</body>
</html>`;
    } else {
      const campos = [
        { label: 'EPIs e Fardamento', value: relatorio.episFardamento },
        { label: 'Kit Primeiros Socorros', value: relatorio.kitPrimeirosSocorros },
        { label: 'Consumíveis', value: relatorio.consumiveis },
        { label: 'Espaço Físico', value: relatorio.espacoFisico },
        { label: 'Reclamações', value: relatorio.reclamacoes },
        { label: 'Vendas Complementares', value: relatorio.vendasComplementares },
        { label: 'Fichas de Serviço', value: relatorio.fichasServico },
        { label: 'Documentação Obrigatória', value: relatorio.documentacaoObrigatoria },
        { label: 'Reunião Quinzenal', value: relatorio.reuniaoQuinzenal ? 'Sim' : 'Não' },
        { label: 'Resumo da Supervisão', value: relatorio.resumoSupervisao },
        { label: 'Colaboradores Presentes', value: relatorio.colaboradoresPresentes },
      ].filter(c => c.value);

      const camposHtml = campos.map(c => `
        <div style="margin-bottom: 15px;">
          <p style="font-weight: bold; margin-bottom: 5px;">${c.label}</p>
          <div style="background: #f9fafb; padding: 10px; border-radius: 4px; white-space: pre-wrap;">${c.value}</div>
        </div>
      `).join('');

      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Relatório Completo - ${relatorio.loja?.nome}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { color: #1a56db; border-bottom: 2px solid #1a56db; padding-bottom: 10px; }
    .info { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .info p { margin: 5px 0; }
    .footer { margin-top: 40px; font-size: 12px; color: #6b7280; text-align: center; }
  </style>
</head>
<body>
  <h1>Relatório Completo de Supervisão</h1>
  <div class="info">
    <p><strong>Loja:</strong> ${relatorio.loja?.nome || 'N/A'}</p>
    <p><strong>Gestor:</strong> ${relatorio.gestor?.user?.name || 'N/A'}</p>
    <p><strong>Data da Visita:</strong> ${new Date(relatorio.dataVisita).toLocaleString('pt-PT')}</p>
    <p><strong>Criado em:</strong> ${new Date(relatorio.createdAt).toLocaleString('pt-PT')}</p>
  </div>
  ${camposHtml}
  ${fotosHtml}
  <div class="footer">
    <p>PoweringEG Platform - Relatório gerado em ${new Date().toLocaleString('pt-PT')}</p>
  </div>
</body>
</html>`;
    }
  };

  // Componente para mostrar fotos
  const FotosGaleria = ({ fotos }: { fotos: string | null }) => {
    if (!fotos) return null;
    
    let fotosArray: string[] = [];
    try {
      fotosArray = JSON.parse(fotos);
    } catch {
      return null;
    }
    
    if (fotosArray.length === 0) return null;

    return (
      <div className="mt-3">
        <p className="text-sm font-medium mb-2 flex items-center gap-2">
          <Image className="h-4 w-4" />
          Fotos ({fotosArray.length})
        </p>
        <div className="flex flex-wrap gap-2">
          {fotosArray.map((foto, index) => (
            <Dialog key={index}>
              <DialogTrigger asChild>
                <button className="relative group">
                  <img 
                    src={foto} 
                    alt={`Foto ${index + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border hover:opacity-80 transition-opacity"
                  />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <img 
                  src={foto} 
                  alt={`Foto ${index + 1}`}
                  className="w-full h-auto max-h-[80vh] object-contain"
                />
              </DialogContent>
            </Dialog>
          ))}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
            <p className="text-muted-foreground">
              Visualizar todos os relatórios de supervisão
            </p>
          </div>
          <Button 
            variant={showFilters ? "default" : "outline"} 
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtros
            {temFiltrosAtivos && (
              <Badge variant="secondary" className="ml-1">Ativos</Badge>
            )}
          </Button>
        </div>

        {/* Painel de Filtros */}
        {showFilters && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setApenasNaoVistos(!apenasNaoVistos)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      apenasNaoVistos 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {apenasNaoVistos ? '✓ Apenas Não Vistos' : 'Mostrar Apenas Não Vistos'}
                  </button>
                  {(countLivresNaoVistos || 0) + (countCompletosNaoVistos || 0) > 0 && (
                    <Badge variant="destructive">
                      {(countLivresNaoVistos || 0) + (countCompletosNaoVistos || 0)} por ver
                    </Badge>
                  )}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Loja</Label>
                  <Select value={filtroLoja} onValueChange={setFiltroLoja}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as lojas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as lojas</SelectItem>
                      {lojas?.map((loja: any) => (
                        <SelectItem key={loja.id} value={loja.id.toString()}>
                          {loja.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Gestor</Label>
                  <Select value={filtroGestor} onValueChange={setFiltroGestor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os gestores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os gestores</SelectItem>
                      {gestores?.filter((g: any) => g.gestorId).map((gestor: any) => (
                        <SelectItem key={gestor.gestorId} value={gestor.gestorId.toString()}>
                          {gestor.userName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Input 
                    type="date" 
                    value={filtroDataInicio}
                    onChange={(e) => setFiltroDataInicio(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Input 
                    type="date" 
                    value={filtroDataFim}
                    onChange={(e) => setFiltroDataFim(e.target.value)}
                  />
                </div>
              </div>

              {temFiltrosAtivos && (
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={limparFiltros} className="gap-2">
                    <X className="h-4 w-4" />
                    Limpar filtros
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="livres" className="space-y-4">
          <TabsList>
            <TabsTrigger value="livres">
              <FileText className="h-4 w-4 mr-2" />
              Relatórios Livres ({relatoriosLivresFiltrados.length})
            </TabsTrigger>
            <TabsTrigger value="completos">
              <ClipboardList className="h-4 w-4 mr-2" />
              Relatórios Completos ({relatoriosCompletosFiltrados.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="livres" className="space-y-3">
            {loadingLivres ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : relatoriosLivresFiltrados.length > 0 ? (
              <div className="space-y-2">
                {relatoriosLivresFiltrados.map((relatorio: any) => (
                  <Collapsible 
                    key={relatorio.id} 
                    open={expandedLivres.includes(relatorio.id)}
                    onOpenChange={() => toggleLivre(relatorio.id)}
                  >
                    <Card className="transition-all hover:shadow-md">
                      <CollapsibleTrigger className="w-full text-left">
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-wrap">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                <span className="font-medium">{relatorio.loja?.nome}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {new Date(relatorio.dataVisita).toLocaleDateString("pt-PT")}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="h-3 w-3" />
                                {relatorio.gestor?.user?.name || "Gestor"}
                              </div>
                              {relatorio.fotos && JSON.parse(relatorio.fotos).length > 0 && (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <Image className="h-3 w-3" />
                                  {JSON.parse(relatorio.fotos).length}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">Livre</Badge>
                              {expandedLivres.includes(relatorio.id) ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 pb-4 px-4 border-t">
                          <div className="mt-3 p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-2">Descrição da Visita</p>
                            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                              {relatorio.descricao}
                            </p>
                          </div>
                          
                          <FotosGaleria fotos={relatorio.fotos} />
                          
                          <div className="mt-4 flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">
                              Criado em: {new Date(relatorio.createdAt).toLocaleString("pt-PT")}
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                exportarPDF(relatorio, 'livre');
                              }}
                              className="gap-2"
                            >
                              <Download className="h-4 w-4" />
                              Exportar PDF
                            </Button>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">
                    {temFiltrosAtivos 
                      ? "Nenhum relatório livre encontrado com os filtros aplicados"
                      : "Nenhum relatório livre registado"}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completos" className="space-y-3">
            {loadingCompletos ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : relatoriosCompletosFiltrados.length > 0 ? (
              <div className="space-y-2">
                {relatoriosCompletosFiltrados.map((relatorio: any) => (
                  <Collapsible 
                    key={relatorio.id} 
                    open={expandedCompletos.includes(relatorio.id)}
                    onOpenChange={() => toggleCompleto(relatorio.id)}
                  >
                    <Card className="transition-all hover:shadow-md">
                      <CollapsibleTrigger className="w-full text-left">
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-wrap">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                <span className="font-medium">{relatorio.loja?.nome}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {new Date(relatorio.dataVisita).toLocaleDateString("pt-PT")}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="h-3 w-3" />
                                {relatorio.gestor?.user?.name || "Gestor"}
                              </div>
                              {relatorio.fotos && JSON.parse(relatorio.fotos).length > 0 && (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <Image className="h-3 w-3" />
                                  {JSON.parse(relatorio.fotos).length}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">Completo</Badge>
                              {expandedCompletos.includes(relatorio.id) ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 pb-4 px-4 border-t">
                          <div className="mt-3 grid gap-3">
                            {relatorio.episFardamento && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">EPIs e Fardamento</p>
                                <p className="text-sm text-muted-foreground">
                                  {relatorio.episFardamento}
                                </p>
                              </div>
                            )}
                            {relatorio.resumoSupervisao && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Resumo da Supervisão</p>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {relatorio.resumoSupervisao}
                                </p>
                              </div>
                            )}
                            {relatorio.colaboradoresPresentes && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Colaboradores Presentes</p>
                                <p className="text-sm text-muted-foreground">
                                  {relatorio.colaboradoresPresentes}
                                </p>
                              </div>
                            )}
                          </div>
                          
                          <FotosGaleria fotos={relatorio.fotos} />
                          
                          <div className="mt-4 flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">
                              Criado em: {new Date(relatorio.createdAt).toLocaleString("pt-PT")}
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                exportarPDF(relatorio, 'completo');
                              }}
                              className="gap-2"
                            >
                              <Download className="h-4 w-4" />
                              Exportar PDF
                            </Button>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">
                    {temFiltrosAtivos 
                      ? "Nenhum relatório completo encontrado com os filtros aplicados"
                      : "Nenhum relatório completo registado"}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
