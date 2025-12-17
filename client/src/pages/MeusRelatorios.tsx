import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Building2, Calendar, ChevronDown, ChevronUp, FileText, ClipboardList, Search, ArrowUpDown, SortAsc } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";

export default function MeusRelatorios() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [expandedLivres, setExpandedLivres] = useState<number[]>([]);
  const [expandedCompletos, setExpandedCompletos] = useState<number[]>([]);
  const [lojaFiltro, setLojaFiltro] = useState<string>("todas");
  const [pesquisa, setPesquisa] = useState("");
  const [ordenacao, setOrdenacao] = useState<"data-desc" | "data-asc" | "loja-az">("data-desc");

  const { data: relatoriosLivres, isLoading: loadingLivres } =
    trpc.relatoriosLivres.list.useQuery();
  const { data: relatoriosCompletos, isLoading: loadingCompletos } =
    trpc.relatoriosCompletos.list.useQuery();

  if (user?.role !== "gestor") {
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
  
  // Obter lista única de lojas
  const lojasUnicas = Array.from(
    new Set(
      [...(relatoriosLivres || []), ...(relatoriosCompletos || [])]
        .map((r: any) => r.loja?.nome)
        .filter(Boolean)
    )
  ).sort();
  
  // Função de filtro e ordenação
  const filtrarEOrdenar = (relatorios: any[]) => {
    if (!relatorios) return [];
    
    let resultado = [...relatorios];
    
    // Aplicar filtro de loja
    if (lojaFiltro && lojaFiltro !== "todas") {
      resultado = resultado.filter((r: any) => r.loja?.nome === lojaFiltro);
    }
    
    // Aplicar pesquisa
    if (pesquisa) {
      resultado = resultado.filter((r: any) => 
        r.descricao?.toLowerCase().includes(pesquisa.toLowerCase())
      );
    }
    
    // Aplicar ordenação
    if (ordenacao === "data-desc") {
      resultado.sort((a: any, b: any) => new Date(b.dataVisita).getTime() - new Date(a.dataVisita).getTime());
    } else if (ordenacao === "data-asc") {
      resultado.sort((a: any, b: any) => new Date(a.dataVisita).getTime() - new Date(b.dataVisita).getTime());
    } else if (ordenacao === "loja-az") {
      resultado.sort((a: any, b: any) => (a.loja?.nome || "").localeCompare(b.loja?.nome || ""));
    }
    
    return resultado;
  };
  
  const relatoriosLivresFiltrados = filtrarEOrdenar(relatoriosLivres || []);
  const relatoriosCompletosFiltrados = filtrarEOrdenar(relatoriosCompletos || []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Meus Relatórios
          </h1>
          <p className="text-muted-foreground">
            Histórico dos seus relatórios de supervisão
          </p>
        </div>
        
        {/* Controles de Filtro e Pesquisa */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por descrição..."
                  value={pesquisa}
                  onChange={(e) => setPesquisa(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={lojaFiltro || "todas"} onValueChange={setLojaFiltro}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Todas as lojas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as lojas</SelectItem>
                  {lojasUnicas.map((loja) => (
                    <SelectItem key={loja} value={loja}>
                      {loja}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={ordenacao} onValueChange={(v: any) => setOrdenacao(v)}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="data-desc">
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="h-3 w-3" />
                      Mais recente
                    </div>
                  </SelectItem>
                  <SelectItem value="data-asc">
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="h-3 w-3" />
                      Mais antigo
                    </div>
                  </SelectItem>
                  <SelectItem value="loja-az">
                    <div className="flex items-center gap-2">
                      <SortAsc className="h-3 w-3" />
                      Loja (A-Z)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="livres" className="space-y-4">
          <TabsList>
            <TabsTrigger value="livres">
              <FileText className="h-4 w-4 mr-2" />
              Livres ({relatoriosLivresFiltrados.length})
            </TabsTrigger>
            <TabsTrigger value="completos">
              <ClipboardList className="h-4 w-4 mr-2" />
              Completos ({relatoriosCompletosFiltrados.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="livres" className="space-y-3">
            {loadingLivres ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ): relatoriosLivresFiltrados && relatoriosLivresFiltrados.length > 0 ? (
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
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                <span className="font-medium">{relatorio.loja?.nome || "Loja"}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {new Date(relatorio.dataVisita).toLocaleDateString("pt-PT")}
                              </div>
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
                          <div className="mt-2 text-xs text-muted-foreground">
                            Criado em: {new Date(relatorio.createdAt).toLocaleString("pt-PT")}
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
                    Ainda não criou relatórios livres
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
            ): relatoriosCompletosFiltrados && relatoriosCompletosFiltrados.length > 0 ? (
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
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                <span className="font-medium">{relatorio.loja?.nome || "Loja"}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {new Date(relatorio.dataVisita).toLocaleDateString("pt-PT")}
                              </div>
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
                            {relatorio.armazem && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Armazém</p>
                                <p className="text-sm text-muted-foreground">
                                  {relatorio.armazem}
                                </p>
                              </div>
                            )}
                            {relatorio.limpezaOrganizacao && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Limpeza e Organização</p>
                                <p className="text-sm text-muted-foreground">
                                  {relatorio.limpezaOrganizacao}
                                </p>
                              </div>
                            )}
                            {relatorio.montra && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Montra</p>
                                <p className="text-sm text-muted-foreground">
                                  {relatorio.montra}
                                </p>
                              </div>
                            )}
                            {relatorio.atendimentoCliente && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Atendimento ao Cliente</p>
                                <p className="text-sm text-muted-foreground">
                                  {relatorio.atendimentoCliente}
                                </p>
                              </div>
                            )}
                            {relatorio.formacao && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Formação</p>
                                <p className="text-sm text-muted-foreground">
                                  {relatorio.formacao}
                                </p>
                              </div>
                            )}
                            {relatorio.observacoes && (
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Observações</p>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {relatorio.observacoes}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="mt-3 text-xs text-muted-foreground">
                            Criado em: {new Date(relatorio.createdAt).toLocaleString("pt-PT")}
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
                    Ainda não criou relatórios completos
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
