import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { 
  Clock, 
  User, 
  Eye, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Download, 
  Mail, 
  Filter,
  GitCompare,
  Search,
  Calendar,
  Loader2,
  Check
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface RelatorioIA {
  id: number;
  conteudo: string;
  geradoPor: number;
  versao: string;
  createdAt: Date;
  geradoPorNome: string;
}

export function HistoricoRelatoriosIA() {
  const [expanded, setExpanded] = useState(false);
  const [selectedRelatorio, setSelectedRelatorio] = useState<RelatorioIA | null>(null);
  
  // Estados para filtros
  const [showFilters, setShowFilters] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  
  // Estados para comparação
  const [modoComparacao, setModoComparacao] = useState(false);
  const [relatoriosSelecionados, setRelatoriosSelecionados] = useState<number[]>([]);
  const [showComparacao, setShowComparacao] = useState(false);
  
  // Estados para envio de email
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailDestino, setEmailDestino] = useState("");
  const [assuntoEmail, setAssuntoEmail] = useState("");
  const [relatorioParaEmail, setRelatorioParaEmail] = useState<RelatorioIA | null>(null);
  
  // Query com filtros
  const { data: historico, isLoading, refetch } = trpc.categorizacao.getHistoricoRelatoriosIA.useQuery({
    categoria: filtroCategoria || undefined,
    dataInicio: filtroDataInicio || undefined,
    dataFim: filtroDataFim || undefined,
  });
  
  // Mutation para enviar email
  const enviarEmailMutation = trpc.categorizacao.enviarEmailRelatorioIA.useMutation({
    onSuccess: (data) => {
      toast.success(`Email enviado com sucesso para ${data.emailEnviadoPara}`);
      setShowEmailDialog(false);
      setEmailDestino("");
      setAssuntoEmail("");
      setRelatorioParaEmail(null);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao enviar email");
    },
  });
  
  // Categorias únicas extraídas dos relatórios para filtro
  const categoriasDisponiveis = useMemo(() => {
    if (!historico) return [];
    const categorias = new Set<string>();
    
    // Extrair categorias mencionadas nos relatórios
    const padroes = [
      /### ([^\n]+)/g,
      /\*\*([^*]+)\*\*/g,
    ];
    
    historico.forEach(rel => {
      padroes.forEach(padrao => {
        let match;
        while ((match = padrao.exec(rel.conteudo)) !== null) {
          const cat = match[1].trim();
          if (cat.length > 3 && cat.length < 50 && !cat.includes(':')) {
            categorias.add(cat);
          }
        }
        // Reset regex lastIndex
        padrao.lastIndex = 0;
      });
    });
    
    return Array.from(categorias).slice(0, 20);
  }, [historico]);
  
  // Função para exportar relatório para PDF
  const handleExportPDF = () => {
    if (!selectedRelatorio) return;
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;
      let yPos = margin;
      
      // Título
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório IA - PoweringEG', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;
      
      // Data do relatório
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const dataRelatorio = new Date(selectedRelatorio.createdAt).toLocaleDateString("pt-PT", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      doc.text(`Gerado em: ${dataRelatorio}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
      doc.text(`Por: ${selectedRelatorio.geradoPorNome}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;
      
      // Linha separadora
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;
      
      // Processar conteúdo markdown para texto simples
      const conteudo = selectedRelatorio.conteudo || '';
      const linhas = conteudo.split('\n');
      
      doc.setFontSize(10);
      
      for (const linha of linhas) {
        // Verificar se precisa de nova página
        if (yPos > pageHeight - margin - 10) {
          doc.addPage();
          yPos = margin;
        }
        
        // Processar formatação markdown básica
        let texto = linha;
        let fontSize = 10;
        let fontStyle: 'normal' | 'bold' = 'normal';
        
        // Headers
        if (linha.startsWith('### ')) {
          texto = linha.replace('### ', '');
          fontSize = 12;
          fontStyle = 'bold';
          yPos += 3;
        } else if (linha.startsWith('## ')) {
          texto = linha.replace('## ', '');
          fontSize = 14;
          fontStyle = 'bold';
          yPos += 5;
        } else if (linha.startsWith('# ')) {
          texto = linha.replace('# ', '');
          fontSize = 16;
          fontStyle = 'bold';
          yPos += 7;
        }
        
        // Remover markdown de negrito e itálico
        texto = texto.replace(/\*\*([^*]+)\*\*/g, '$1');
        texto = texto.replace(/\*([^*]+)\*/g, '$1');
        texto = texto.replace(/__([^_]+)__/g, '$1');
        texto = texto.replace(/_([^_]+)_/g, '$1');
        
        // Bullet points
        if (texto.startsWith('- ')) {
          texto = '• ' + texto.substring(2);
        }
        
        // Emojis comuns para texto
        texto = texto.replace(/🚨/g, '[!]');
        texto = texto.replace(/✅/g, '[OK]');
        texto = texto.replace(/⚠️/g, '[!]');
        texto = texto.replace(/📊/g, '');
        texto = texto.replace(/📈/g, '');
        texto = texto.replace(/📉/g, '');
        texto = texto.replace(/💡/g, '');
        texto = texto.replace(/🎯/g, '');
        texto = texto.replace(/🔴/g, '');
        texto = texto.replace(/🟡/g, '');
        texto = texto.replace(/🟢/g, '');
        
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', fontStyle);
        
        // Quebrar linhas longas
        const linhasQuebradas = doc.splitTextToSize(texto, maxWidth);
        
        for (const linhaQuebrada of linhasQuebradas) {
          if (yPos > pageHeight - margin - 10) {
            doc.addPage();
            yPos = margin;
          }
          doc.text(linhaQuebrada, margin, yPos);
          yPos += fontSize * 0.5;
        }
        
        // Espaço entre parágrafos
        if (linha === '' || linha.startsWith('#')) {
          yPos += 3;
        }
      }
      
      // Rodapé
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Página ${i} de ${totalPages} | PoweringEG Platform`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
        doc.setTextColor(0, 0, 0);
      }
      
      // Guardar ficheiro
      const dataFormatada = new Date(selectedRelatorio.createdAt).toISOString().split('T')[0];
      doc.save(`relatorio-ia-${dataFormatada}.pdf`);
      toast.success("Relatório exportado com sucesso!");
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error("Erro ao exportar relatório");
    }
  };
  
  // Abrir diálogo de email
  const handleOpenEmailDialog = (relatorio: RelatorioIA) => {
    setRelatorioParaEmail(relatorio);
    setAssuntoEmail(`Relatório IA - ${new Date(relatorio.createdAt).toLocaleDateString('pt-PT')}`);
    setShowEmailDialog(true);
  };
  
  // Enviar email
  const handleEnviarEmail = () => {
    if (!relatorioParaEmail || !emailDestino) return;
    
    enviarEmailMutation.mutate({
      relatorioId: relatorioParaEmail.id,
      emailDestino,
      assuntoPersonalizado: assuntoEmail || undefined,
    });
  };
  
  // Toggle seleção para comparação
  const toggleSelecaoComparacao = (id: number) => {
    if (relatoriosSelecionados.includes(id)) {
      setRelatoriosSelecionados(prev => prev.filter(r => r !== id));
    } else if (relatoriosSelecionados.length < 2) {
      setRelatoriosSelecionados(prev => [...prev, id]);
    } else {
      toast.error("Só pode comparar 2 relatórios de cada vez");
    }
  };
  
  // Limpar filtros
  const limparFiltros = () => {
    setFiltroCategoria("");
    setFiltroDataInicio("");
    setFiltroDataFim("");
    refetch();
  };
  
  // Obter relatórios para comparação
  const relatoriosParaComparar = useMemo(() => {
    if (!historico || relatoriosSelecionados.length !== 2) return [];
    return relatoriosSelecionados.map(id => 
      historico.find(r => r.id === id)
    ).filter(Boolean) as RelatorioIA[];
  }, [historico, relatoriosSelecionados]);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Relatórios IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            A carregar...
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!historico || historico.length === 0) {
    return null; // Não mostrar se não houver histórico
  }
  
  const relatoriosVisiveis = expanded ? historico : historico.slice(0, 3);
  
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Histórico de Relatórios IA ({historico.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={modoComparacao ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setModoComparacao(!modoComparacao);
                  setRelatoriosSelecionados([]);
                }}
                className="gap-2"
              >
                <GitCompare className="h-4 w-4" />
                {modoComparacao ? "Sair Comparação" : "Comparar"}
              </Button>
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Filtros
              </Button>
            </div>
          </div>
          
          {/* Painel de Filtros */}
          {showFilters && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/30 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Categoria/Palavra-chave
                  </Label>
                  <Input
                    placeholder="Pesquisar no conteúdo..."
                    value={filtroCategoria}
                    onChange={(e) => setFiltroCategoria(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data Início
                  </Label>
                  <Input
                    type="date"
                    value={filtroDataInicio}
                    onChange={(e) => setFiltroDataInicio(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data Fim
                  </Label>
                  <Input
                    type="date"
                    value={filtroDataFim}
                    onChange={(e) => setFiltroDataFim(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Categorias rápidas */}
              {categoriasDisponiveis.length > 0 && (
                <div className="space-y-2">
                  <Label>Categorias Frequentes</Label>
                  <div className="flex flex-wrap gap-2">
                    {categoriasDisponiveis.slice(0, 10).map((cat, idx) => (
                      <Badge
                        key={idx}
                        variant={filtroCategoria === cat ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setFiltroCategoria(filtroCategoria === cat ? "" : cat)}
                      >
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={limparFiltros}>
                  Limpar Filtros
                </Button>
                <Button size="sm" onClick={() => refetch()}>
                  Aplicar
                </Button>
              </div>
            </div>
          )}
          
          {/* Barra de comparação */}
          {modoComparacao && (
            <div className="mt-4 p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <GitCompare className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-800 dark:text-blue-200">
                    {relatoriosSelecionados.length === 0 
                      ? "Selecione 2 relatórios para comparar"
                      : `${relatoriosSelecionados.length}/2 selecionados`}
                  </span>
                </div>
                {relatoriosSelecionados.length === 2 && (
                  <Button 
                    size="sm" 
                    onClick={() => setShowComparacao(true)}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Ver Comparação
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {relatoriosVisiveis.map((rel) => (
            <div
              key={rel.id}
              className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                modoComparacao && relatoriosSelecionados.includes(rel.id)
                  ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700'
                  : 'hover:bg-accent/50'
              }`}
            >
              {modoComparacao && (
                <div className="mr-3">
                  <Checkbox
                    checked={relatoriosSelecionados.includes(rel.id)}
                    onCheckedChange={() => toggleSelecaoComparacao(rel.id)}
                  />
                </div>
              )}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {new Date(rel.createdAt).toLocaleDateString("pt-PT", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    {rel.geradoPorNome}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    v{rel.versao}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEmailDialog(rel)}
                  className="gap-2"
                  title="Enviar por Email"
                >
                  <Mail className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRelatorio(rel)}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Visualizar
                </Button>
              </div>
            </div>
          ))}
          
          {historico.length > 3 && (
            <Button
              variant="ghost"
              className="w-full gap-2"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Mostrar menos
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Mostrar mais ({historico.length - 3} relatórios)
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
      
      {/* Modal completo para visualizar relatório */}
      <Dialog open={!!selectedRelatorio} onOpenChange={() => setSelectedRelatorio(null)}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">
                  Relatório IA - {selectedRelatorio && new Date(selectedRelatorio.createdAt).toLocaleDateString("pt-PT", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {selectedRelatorio && (
                    <span className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(selectedRelatorio.createdAt).toLocaleTimeString("pt-PT", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {selectedRelatorio.geradoPorNome}
                      </span>
                    </span>
                  )}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedRelatorio && handleOpenEmailDialog(selectedRelatorio)}
                  className="gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Enviar Email
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleExportPDF}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Descarregar PDF
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          {/* Conteúdo do relatório com scroll */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {selectedRelatorio && (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <Streamdown>{selectedRelatorio.conteudo}</Streamdown>
              </div>
            )}
          </div>
          
          {/* Rodapé do modal */}
          <div className="px-6 py-3 border-t flex-shrink-0 flex justify-end gap-2 bg-muted/30">
            <Button
              variant="outline"
              onClick={() => setSelectedRelatorio(null)}
            >
              Fechar
            </Button>
            <Button
              variant="default"
              onClick={handleExportPDF}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Descarregar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Comparação */}
      <Dialog open={showComparacao} onOpenChange={setShowComparacao}>
        <DialogContent className="max-w-7xl w-[98vw] h-[95vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              Comparação de Relatórios
            </DialogTitle>
            <DialogDescription>
              Comparando relatórios de períodos diferentes para identificar tendências e mudanças
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden grid grid-cols-2 divide-x">
            {relatoriosParaComparar.map((rel, idx) => (
              <div key={rel.id} className="flex flex-col h-full">
                <div className="p-3 bg-muted/50 border-b">
                  <div className="flex items-center justify-between">
                    <Badge variant={idx === 0 ? "default" : "secondary"}>
                      {idx === 0 ? "Período Anterior" : "Período Recente"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(rel.createdAt).toLocaleDateString("pt-PT", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <Streamdown>{rel.conteudo}</Streamdown>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="px-6 py-3 border-t flex-shrink-0 flex justify-end gap-2 bg-muted/30">
            <Button
              variant="outline"
              onClick={() => {
                setShowComparacao(false);
                setRelatoriosSelecionados([]);
                setModoComparacao(false);
              }}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Envio de Email */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Enviar Relatório por Email
            </DialogTitle>
            <DialogDescription>
              O relatório será enviado em formato PDF anexado ao email
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email de Destino *</Label>
              <Input
                id="email"
                type="email"
                placeholder="exemplo@email.com"
                value={emailDestino}
                onChange={(e) => setEmailDestino(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assunto">Assunto (opcional)</Label>
              <Input
                id="assunto"
                placeholder="Relatório IA - Análise Executiva"
                value={assuntoEmail}
                onChange={(e) => setAssuntoEmail(e.target.value)}
              />
            </div>
            
            {relatorioParaEmail && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="font-medium">Relatório selecionado:</p>
                <p className="text-muted-foreground">
                  {new Date(relatorioParaEmail.createdAt).toLocaleDateString("pt-PT", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })} - Gerado por {relatorioParaEmail.geradoPorNome}
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleEnviarEmail}
              disabled={!emailDestino || enviarEmailMutation.isPending}
              className="gap-2"
            >
              {enviarEmailMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A enviar...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Enviar Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
