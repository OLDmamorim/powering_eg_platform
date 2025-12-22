import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, Download, Calendar, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Streamdown } from 'streamdown';
import jsPDF from 'jspdf';

export default function HistoricoResumosGlobais() {
  const [resumoSelecionado, setResumoSelecionado] = useState<any>(null);
  const [dialogAberto, setDialogAberto] = useState(false);

  const { data: historico, isLoading } = trpc.resumosGlobais.getHistorico.useQuery();

  const handleVisualizar = (resumo: any) => {
    setResumoSelecionado(resumo);
    setDialogAberto(true);
  };

  const handleDownloadPDF = (resumo: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Cabeçalho
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Global - PoweringEG Platform 2.0', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${resumo.periodo.charAt(0).toUpperCase() + resumo.periodo.slice(1)}`, margin, yPosition);
    yPosition += 7;
    doc.text(`Data de geração: ${new Date(resumo.createdAt).toLocaleDateString('pt-PT')}`, margin, yPosition);
    yPosition += 15;

    // Conteúdo
    doc.setFontSize(10);
    const linhas = resumo.conteudo
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .split('\n');

    linhas.forEach((linha: string) => {
      if (linha.trim() === '') {
        yPosition += 5;
        return;
      }

      const linhasQuebradas = doc.splitTextToSize(linha, maxWidth);
      linhasQuebradas.forEach((linhaQuebrada: string) => {
        if (yPosition > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(linhaQuebrada, margin, yPosition);
        yPosition += 5;
      });
    });

    // Rodapé
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `PoweringEG Platform 2.0 - Página ${i} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    doc.save(`resumo-global-${resumo.periodo}-${new Date(resumo.createdAt).toISOString().split('T')[0]}.pdf`);
    toast.success('PDF descarregado com sucesso!');
  };

  const getPeriodoBadgeVariant = (periodo: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      mensal: 'default',
      trimestral: 'secondary',
      semestral: 'outline',
      anual: 'destructive',
    };
    return variants[periodo] || 'default';
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Histórico de Resumos Globais</h1>
        <p className="text-muted-foreground mt-2">
          Consulte resumos globais gerados anteriormente
        </p>
      </div>

      {!historico || historico.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Nenhum resumo global foi gerado ainda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {historico.map((resumo) => (
            <Card key={resumo.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        Resumo {resumo.periodo.charAt(0).toUpperCase() + resumo.periodo.slice(1)}
                      </CardTitle>
                      <Badge variant={getPeriodoBadgeVariant(resumo.periodo)}>
                        {resumo.periodo}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(resumo.createdAt).toLocaleDateString('pt-PT', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVisualizar(resumo)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Visualizar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF(resumo)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Resumo {resumoSelecionado?.periodo.charAt(0).toUpperCase() + resumoSelecionado?.periodo.slice(1)}
              <Badge variant={getPeriodoBadgeVariant(resumoSelecionado?.periodo || '')}>
                {resumoSelecionado?.periodo}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {resumoSelecionado && (
            <div className="prose dark:prose-invert max-w-none" style={{ maxWidth: '100%' }}>
              <Streamdown>{resumoSelecionado.conteudo}</Streamdown>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
