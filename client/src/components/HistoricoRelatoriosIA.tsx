import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Clock, User, Eye, ChevronDown, ChevronUp, FileText, Download, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import jsPDF from "jspdf";

export function HistoricoRelatoriosIA() {
  const [expanded, setExpanded] = useState(false);
  const [selectedRelatorio, setSelectedRelatorio] = useState<any>(null);
  
  const { data: historico, isLoading } = trpc.categorizacao.getHistoricoRelatoriosIA.useQuery();
  
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
          <p className="text-sm text-muted-foreground">A carregar...</p>
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
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Relatórios IA ({historico.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {relatoriosVisiveis.map((rel) => (
            <div
              key={rel.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
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
                </div>
              </div>
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
    </>
  );
}
