import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, Calendar, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Streamdown } from 'streamdown';
import jsPDF from 'jspdf';

type Periodo = 'mensal' | 'trimestral' | 'semestral' | 'anual';

export default function ResumosGlobais() {
  const [periodo, setPeriodo] = useState<Periodo>('mensal');
  const [resumoGerado, setResumoGerado] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const gerarResumoMutation = trpc.resumosGlobais.gerar.useMutation({
    onSuccess: (data) => {
      setResumoGerado(data.conteudo);
      toast.success('Resumo global gerado com sucesso!');
      setIsGenerating(false);
    },
    onError: (error) => {
      toast.error(`Erro ao gerar resumo: ${error.message}`);
      setIsGenerating(false);
    },
  });

  const handleGerar = () => {
    setIsGenerating(true);
    setResumoGerado(null);

    const agora = new Date();
    let dataInicio: Date;
    let dataFim: Date = agora;

    switch (periodo) {
      case 'mensal':
        dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
        break;
      case 'trimestral':
        const mesAtual = agora.getMonth();
        const inicioTrimestre = Math.floor(mesAtual / 3) * 3;
        dataInicio = new Date(agora.getFullYear(), inicioTrimestre, 1);
        break;
      case 'semestral':
        const inicioSemestre = agora.getMonth() < 6 ? 0 : 6;
        dataInicio = new Date(agora.getFullYear(), inicioSemestre, 1);
        break;
      case 'anual':
        dataInicio = new Date(agora.getFullYear(), 0, 1);
        break;
    }

    gerarResumoMutation.mutate({
      periodo,
      dataInicio,
      dataFim,
    });
  };

  const handleDownloadPDF = () => {
    if (!resumoGerado) return;

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
    doc.text(`Período: ${periodo.charAt(0).toUpperCase() + periodo.slice(1)}`, margin, yPosition);
    yPosition += 7;
    doc.text(`Data de geração: ${new Date().toLocaleDateString('pt-PT')}`, margin, yPosition);
    yPosition += 15;

    // Conteúdo (remover markdown básico)
    doc.setFontSize(10);
    const linhas = resumoGerado
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .split('\n');

    linhas.forEach((linha) => {
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

    doc.save(`resumo-global-${periodo}-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF descarregado com sucesso!');
  };

  const getPeriodoLabel = (p: Periodo) => {
    const labels = {
      mensal: 'Mensal',
      trimestral: 'Trimestral',
      semestral: 'Semestral',
      anual: 'Anual',
    };
    return labels[p];
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Resumos Globais</h1>
        <p className="text-muted-foreground mt-2">
          Gere análises consolidadas da rede de lojas por período
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Gerar Novo Resumo
          </CardTitle>
          <CardDescription>
            Selecione o período e gere uma análise completa com IA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Período</label>
              <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal (mês atual)</SelectItem>
                  <SelectItem value="trimestral">Trimestral (trimestre atual)</SelectItem>
                  <SelectItem value="semestral">Semestral (semestre atual)</SelectItem>
                  <SelectItem value="anual">Anual (ano atual)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGerar} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Gerar Resumo
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {resumoGerado && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Resumo {getPeriodoLabel(periodo)}</CardTitle>
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                <Download className="mr-2 h-4 w-4" />
                Descarregar PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none" style={{ maxWidth: '100%' }}>
              <Streamdown>{resumoGerado}</Streamdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
